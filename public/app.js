// Global State
let portfolio = {};
let debt = 0;
let cash = 0; // Added for cash balance tracking
let selectedStockCode = null;
let useKoreanColors = true; // Default: 상승=빨강, 하락=파랑
let activeStockData = null;
let activeNewsData = null;
let pollingIntervalId = null;
let activeUser = 'tama';
let activeProfile = 'default';
let usersList = [];
let activeExchangeRate = 1380;
let telegramToken = '';
let telegramChatId = '';

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  await setupUserSelector();
  setupProfileSelector();
  loadColorThemeSettings();
  setupEventListeners();
  setupFamilyModalListeners();
  setupTelegramListeners();
  
  // Load real-time exchange rate
  await loadExchangeRate();
  
  // Load Daily Market Report and Indices
  await loadMarketReport();
  
  // Initialize Lucide Icons
  lucide.createIcons();

  // Load Portfolio from server based on active profile
  await loadPortfolioFromServer();

  // Start Background Price Polling (every 45 seconds)
  startPricePolling();
});

// Load real-time USD/KRW exchange rate from server
async function loadExchangeRate() {
  try {
    const res = await fetch('/api/exchange-rate');
    if (res.ok) {
      const data = await res.json();
      activeExchangeRate = data.rate;
      const rateEl = document.getElementById('sidebar-exchange-rate');
      if (rateEl) {
        rateEl.innerText = `${activeExchangeRate.toLocaleString('ko-KR')}원`;
      }
      console.log(`Loaded live exchange rate: ${activeExchangeRate} KRW`);
    }
  } catch (err) {
    console.error("Failed to load exchange rate on client:", err);
  }
}

// Fetch and render Daily Market Report and Indices
async function loadMarketReport() {
  try {
    const res = await fetch('/api/market/report');
    if (res.ok) {
      const data = await res.json();
      
      // Update Briefing Text
      const textEl = document.getElementById('market-briefing-text');
      if (textEl) {
        textEl.innerHTML = data.report;
      }
      
      // Update Indices
      const kospiPriceEl = document.getElementById('market-kospi-price');
      const kospiChangeEl = document.getElementById('market-kospi-change');
      const nasdaqPriceEl = document.getElementById('market-nasdaq-price');
      const nasdaqChangeEl = document.getElementById('market-nasdaq-change');
      
      if (data.kospi && kospiPriceEl && kospiChangeEl) {
        kospiPriceEl.innerText = data.kospi.price;
        const ratio = data.kospi.fluctuationsRatio;
        const isUp = data.kospi.direction === 'RISING';
        const isDown = data.kospi.direction === 'FALLING';
        
        let colorClass = 'neutral-text';
        let sign = '';
        if (isUp) {
          colorClass = 'up-text';
          sign = '+';
        } else if (isDown) {
          colorClass = 'down-text';
          sign = '-';
        }
        
        kospiChangeEl.className = colorClass;
        kospiChangeEl.innerText = `${sign}${Math.abs(ratio).toFixed(2)}%`;
      }
      
      if (data.nasdaq && nasdaqPriceEl && nasdaqChangeEl) {
        nasdaqPriceEl.innerText = data.nasdaq.price;
        const ratio = data.nasdaq.fluctuationsRatio;
        const isUp = data.nasdaq.direction === 'RISING';
        const isDown = data.nasdaq.direction === 'FALLING';
        
        let colorClass = 'neutral-text';
        let sign = '';
        if (isUp) {
          colorClass = 'up-text';
          sign = '+';
        } else if (isDown) {
          colorClass = 'down-text';
          sign = '-';
        }
        
        nasdaqChangeEl.className = colorClass;
        nasdaqChangeEl.innerText = `${sign}${Math.abs(ratio).toFixed(2)}%`;
      }
    }
  } catch (err) {
    console.error("Failed to load market report:", err);
  }
}

// Setup User Selector dropdown
async function setupUserSelector() {
  const userSelect = document.getElementById('user-select');
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      usersList = await res.json();
      userSelect.innerHTML = '';
      usersList.forEach(user => {
        const opt = document.createElement('option');
        opt.value = user.id;
        opt.innerText = `${user.name} (${user.role === 'admin' ? '관리자' : '구성원'})`;
        userSelect.appendChild(opt);
      });
      
      // Restore saved active user
      const savedUser = localStorage.getItem('k_active_user');
      if (savedUser && usersList.some(u => u.id === savedUser)) {
        activeUser = savedUser;
        userSelect.value = activeUser;
      } else {
        activeUser = usersList[0]?.id || 'tama';
        userSelect.value = activeUser;
      }
    }
  } catch (err) {
    console.error("Failed to load users list on frontend:", err);
  }
  
  userSelect.addEventListener('change', async (e) => {
    activeUser = e.target.value;
    localStorage.setItem('k_active_user', activeUser);
    
    // Handle UI visibility of "가족 통합 조회" option in Profile select
    updateProfileOptionsVisibility();
    
    selectedStockCode = null;
    // If currently on family-aggregate but selected user is not admin, switch to default profile
    const currentUser = usersList.find(u => u.id === activeUser);
    if (activeProfile === 'family-aggregate' && currentUser?.role !== 'admin') {
      activeProfile = 'default';
      document.getElementById('profile-select').value = 'default';
      localStorage.setItem('k_active_profile', 'default');
    }
    
    showNotification(`사용자가 '${currentUser?.name || activeUser}'로 변경되었습니다.`, 'info');
    await loadPortfolioFromServer();
  });
}

// Update profile selector options visibility based on user role
function updateProfileOptionsVisibility() {
  const profileSelect = document.getElementById('profile-select');
  const currentUser = usersList.find(u => u.id === activeUser);
  
  // Check if option already exists
  let aggregateOpt = profileSelect.querySelector('option[value="family-aggregate"]');
  
  if (currentUser?.role === 'admin') {
    if (!aggregateOpt) {
      aggregateOpt = document.createElement('option');
      aggregateOpt.value = 'family-aggregate';
      aggregateOpt.innerText = '👪 가족 통합 자산 조회 (Admin)';
      profileSelect.appendChild(aggregateOpt);
    }
  } else {
    if (aggregateOpt) {
      profileSelect.removeChild(aggregateOpt);
    }
  }
}

// Setup Profile Selector dropdown
function setupProfileSelector() {
  const profileSelect = document.getElementById('profile-select');
  
  // Make sure admin option is visible initially if relevant
  updateProfileOptionsVisibility();

  // Restore last used profile on this browser if any
  const savedProfile = localStorage.getItem('k_active_profile');
  if (savedProfile) {
    // Safety check in case non-admin had aggregate saved
    const currentUser = usersList.find(u => u.id === activeUser);
    if (savedProfile === 'family-aggregate' && currentUser?.role !== 'admin') {
      activeProfile = 'default';
    } else {
      activeProfile = savedProfile;
    }
    profileSelect.value = activeProfile;
  }

  profileSelect.addEventListener('change', async (e) => {
    activeProfile = e.target.value;
    localStorage.setItem('k_active_profile', activeProfile);
    
    selectedStockCode = null;
    showNotification(`프로필이 '${getProfileDisplayName(activeProfile)}'로 변경되었습니다.`, 'info');
    
    // Load new profile from server
    await loadPortfolioFromServer();
  });
}

function getProfileDisplayName(profile) {
  if (profile === 'retirement') return '연금 자산 계좌';
  if (profile === 'family') return '가족 공동 자산';
  if (profile === 'family-aggregate') return '가족 통합 자산 조회';
  return '개인 포트폴리오';
}

// Load Color Settings
function loadColorThemeSettings() {
  const savedColors = localStorage.getItem('k_colors');
  if (savedColors !== null) {
    useKoreanColors = savedColors === 'true';
  }
  applyColorConvention();
}

// Load Portfolio & Debt from Server API (Cross-Device Sync)
async function loadPortfolioFromServer() {
  if (activeProfile === 'family-aggregate') {
    await loadFamilyAggregateSummary();
    return;
  }

  // Hide family aggregate and restore standard dashboard grids
  document.getElementById('family-aggregate-dashboard').classList.add('hidden');

  try {
    const res = await fetch(`/api/portfolio?user=${activeUser}&profile=${activeProfile}`);
    if (res.ok) {
      const data = await res.json();
      portfolio = data.stocks || {};
      debt = data.debt || 0;
      cash = data.cash || 0;
      telegramToken = data.telegramToken || '';
      telegramChatId = data.telegramChatId || '';
      
      // Update inputs
      document.getElementById('debt-amount-input').value = debt.toLocaleString('ko-KR');
      document.getElementById('cash-amount-input').value = cash.toLocaleString('ko-KR');
      
      // Recalculate and render list
      await renderPortfolioSummary();
      renderSidebarStockList();

      // Automatically select first stock if exists
      const codes = Object.keys(portfolio);
      if (codes.length > 0) {
        selectStock(codes[0]);
      } else {
        selectedStockCode = null;
        document.getElementById('welcome-panel').classList.remove('hidden');
        document.getElementById('active-stock-dashboard').classList.add('hidden');
      }
    }
  } catch (err) {
    console.error("Error loading portfolio from server:", err);
    showNotification("서버에서 포트폴리오를 불러오는데 실패했습니다.", "danger");
  }
}

// Save Portfolio & Debt to Server API (Cross-Device Sync)
async function savePortfolioToServer() {
  if (activeProfile === 'family-aggregate') return;
  try {
    const res = await fetch(`/api/portfolio?user=${activeUser}&profile=${activeProfile}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debt, cash, stocks: portfolio, telegramToken, telegramChatId })
    });
    
    if (res.ok) {
      await renderPortfolioSummary();
    } else {
      throw new Error("Failed to save on server.");
    }
  } catch (err) {
    console.error("Error saving portfolio to server:", err);
    showNotification("서버에 데이터를 저장하는데 실패했습니다.", "danger");
  }
}

// Save Debt to Server API
async function saveDebt() {
  if (activeProfile === 'family-aggregate') return;
  const rawVal = document.getElementById('debt-amount-input').value.replace(/,/g, '');
  const parsedDebt = parseFloat(rawVal) || 0;
  debt = parsedDebt;
  
  // Format input
  document.getElementById('debt-amount-input').value = debt.toLocaleString('ko-KR');

  try {
    const res = await fetch(`/api/portfolio?user=${activeUser}&profile=${activeProfile}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debt, cash, stocks: portfolio, telegramToken, telegramChatId })
    });
    
    if (res.ok) {
      await renderPortfolioSummary();
      showNotification(`부채(대출금)가 '${getProfileDisplayName(activeProfile)}'에 성공적으로 저장되었습니다.`, 'success');
    } else {
      throw new Error("Failed to save on server.");
    }
  } catch (err) {
    console.error("Error saving debt to server:", err);
    showNotification("부채 정보를 저장하는데 실패했습니다.", "danger");
  }
}

// Save Cash to Server API
async function saveCash() {
  if (activeProfile === 'family-aggregate') return;
  const rawVal = document.getElementById('cash-amount-input').value.replace(/,/g, '');
  const parsedCash = parseFloat(rawVal) || 0;
  cash = parsedCash;
  
  // Format input
  document.getElementById('cash-amount-input').value = cash.toLocaleString('ko-KR');

  try {
    const res = await fetch(`/api/portfolio?user=${activeUser}&profile=${activeProfile}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debt, cash, stocks: portfolio, telegramToken, telegramChatId })
    });
    
    if (res.ok) {
      await renderPortfolioSummary();
      showNotification(`예수금(현금 잔고)이 '${getProfileDisplayName(activeProfile)}'에 성공적으로 저장되었습니다.`, 'success');
    } else {
      throw new Error("Failed to save on server.");
    }
  } catch (err) {
    console.error("Error saving cash to server:", err);
    showNotification("예수금 정보를 저장하는데 실패했습니다.", "danger");
  }
}

// Load and Render Family Assets Consolidated View (Admin View)
async function loadFamilyAggregateSummary() {
  // Hide standard user screens
  document.getElementById('welcome-panel').classList.add('hidden');
  document.getElementById('active-stock-dashboard').classList.add('hidden');
  document.getElementById('family-aggregate-dashboard').classList.remove('hidden');

  try {
    const res = await fetch('/api/family/summary');
    if (!res.ok) throw new Error("Failed to fetch family summary.");
    const data = await res.json();

    // 1) Fill Consolidated Cards
    document.getElementById('family-total-valuation').innerText = `${data.family.totalValuation.toLocaleString('ko-KR')}원`;
    document.getElementById('family-total-debt').innerText = `${data.family.totalDebt.toLocaleString('ko-KR')}원`;
    
    const netAssetsEl = document.getElementById('family-net-assets');
    netAssetsEl.innerText = `${data.family.netAssets.toLocaleString('ko-KR')}원`;
    if (data.family.netAssets < 0) {
      netAssetsEl.style.color = '#ef4444';
    } else {
      netAssetsEl.style.color = '#60a5fa';
    }

    const roeEl = document.getElementById('family-combined-roe');
    roeEl.innerText = `${data.family.profit >= 0 ? '+' : ''}${data.family.roe.toFixed(2)}%`;
    if (data.family.profit > 0) {
      roeEl.className = "summary-value up-text";
    } else if (data.family.profit < 0) {
      roeEl.className = "summary-value down-text";
    } else {
      roeEl.className = "summary-value neutral-text";
    }

    // 2) Render Member Asset Share Horizontal Chart
    const shareContainer = document.getElementById('member-share-chart-container');
    shareContainer.innerHTML = '';

    // Member Colors Map
    const memberColors = {
      tama: { dot: '#8b5cf6', bg: 'linear-gradient(90deg, #8b5cf6, #3b82f6)' },
      mom: { dot: '#ec4899', bg: 'linear-gradient(90deg, #ec4899, #f43f5e)' },
      son: { dot: '#10b981', bg: 'linear-gradient(90deg, #10b981, #14b8a6)' },
      daughter: { dot: '#f59e0b', bg: 'linear-gradient(90deg, #f59e0b, #f97316)' }
    };
    const defaultColor = { dot: '#64748b', bg: 'linear-gradient(90deg, #64748b, #475569)' };

    data.members.forEach(member => {
      const percentage = data.family.totalValuation > 0 ? (member.valuation / data.family.totalValuation) * 100 : 0;
      const colors = memberColors[member.id] || defaultColor;

      const item = document.createElement('div');
      item.className = 'member-share-item';
      item.innerHTML = `
        <div class="member-share-info-row">
          <span class="member-share-name">
            <span class="member-color-dot" style="background-color: ${colors.dot};"></span>
            ${member.name}
          </span>
          <span class="member-share-pct" style="color: ${colors.dot};">${percentage.toFixed(1)}% (${member.valuation.toLocaleString('ko-KR')}원)</span>
        </div>
        <div class="member-share-bar-outer">
          <div class="member-share-bar-inner" style="width: ${percentage}%; background: ${colors.bg};"></div>
        </div>
      `;
      shareContainer.appendChild(item);
    });

    // 3) Render Top 5 Holdings Table/List
    const holdingsContainer = document.getElementById('family-top-holdings-container');
    holdingsContainer.innerHTML = '';

    if (data.topHoldings.length === 0) {
      holdingsContainer.innerHTML = `
        <div class="empty-list-msg" style="padding: 20px;">
          <p>등록된 가족 보유 자산이 없습니다.</p>
        </div>
      `;
    } else {
      data.topHoldings.forEach(holding => {
        const ownersText = holding.owners.map(o => `${o.name} (${o.qty}주)`).join(', ');
        
        const box = document.createElement('div');
        box.className = 'holding-item-box';
        box.innerHTML = `
          <div class="holding-info-col">
            <span class="holding-name-text">${holding.name}</span>
            <span class="holding-code-sub">${holding.market} | ${holding.code} | 소유: ${ownersText}</span>
          </div>
          <div class="holding-val-col">
            <span class="holding-val-text">${holding.totalValuation.toLocaleString('ko-KR')}원</span>
            <span class="holding-qty-text">합산 ${holding.totalQty.toLocaleString('ko-KR')}주</span>
          </div>
        `;
        holdingsContainer.appendChild(box);
      });
    }

    // 4) Render Members breakdown card grid
    const membersGrid = document.getElementById('family-members-cards-container');
    membersGrid.innerHTML = '';

    data.members.forEach(member => {
      const colors = memberColors[member.id] || defaultColor;
      const profitSign = member.profit >= 0 ? '+' : '';
      const profitColorClass = member.profit > 0 ? 'up-text' : (member.profit < 0 ? 'down-text' : 'neutral-text');

      const card = document.createElement('div');
      card.className = 'member-summary-card card';
      card.style.borderTop = `4px solid ${colors.dot}`;
      card.innerHTML = `
        <div class="member-card-header">
          <div class="member-card-title">
            <span class="member-color-dot" style="background-color: ${colors.dot};"></span>
            <span class="member-card-name">${member.name}</span>
          </div>
          <span class="member-card-role-badge" style="background: ${member.role === 'admin' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; color: ${member.role === 'admin' ? '#c084fc' : 'var(--text-secondary)'};">${member.role === 'admin' ? '관리자' : '가족'}</span>
        </div>
        <div class="member-card-metrics">
          <div class="member-metric-row">
            <span class="member-metric-label">총 자산</span>
            <span class="member-metric-val">${member.valuation.toLocaleString('ko-KR')}원</span>
          </div>
          <div class="member-metric-row">
            <span class="member-metric-label">예수금</span>
            <span class="member-metric-val" style="color: #60a5fa;">${(member.cash || 0).toLocaleString('ko-KR')}원</span>
          </div>
          <div class="member-metric-row">
            <span class="member-metric-label">총 부채</span>
            <span class="member-metric-val" style="color: #f87171;">${member.debt.toLocaleString('ko-KR')}원</span>
          </div>
          <div class="member-metric-row">
            <span class="member-metric-label">순자산</span>
            <span class="member-metric-val" style="color: #38bdf8;">${member.netAssets.toLocaleString('ko-KR')}원</span>
          </div>
          <div class="member-metric-row">
            <span class="member-metric-label">종합 손익 (ROE)</span>
            <span class="member-metric-val ${profitColorClass}">${profitSign}${member.profit.toLocaleString('ko-KR')}원 (${profitSign}${member.roe.toFixed(2)}%)</span>
          </div>
          <div class="member-metric-row">
            <span class="member-metric-label">주요 보유</span>
            <span class="member-metric-val" style="max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${member.topHolding}">${member.topHolding}</span>
          </div>
        </div>
        <div class="member-card-footer">
          <button class="member-detail-btn" onclick="switchToMemberPortfolio('${member.id}')">
            <i data-lucide="folder-search" style="width: 14px; height: 14px;"></i> 상세 포트폴리오 관리
          </button>
        </div>
      `;
      membersGrid.appendChild(card);
    });

    lucide.createIcons();

  } catch (err) {
    console.error("Failed to load family summary:", err);
    showNotification("가족 자산 요약을 불러오는데 실패했습니다.", "danger");
  }
}

// Switches selector dynamically to inspect another member
window.switchToMemberPortfolio = function(memberId) {
  const userSelect = document.getElementById('user-select');
  if (userSelect && usersList.some(u => u.id === memberId)) {
    userSelect.value = memberId;
    activeUser = memberId;
    localStorage.setItem('k_active_user', memberId);
    
    // Switch profile to default for user view
    const profileSelect = document.getElementById('profile-select');
    activeProfile = 'default';
    profileSelect.value = 'default';
    localStorage.setItem('k_active_profile', 'default');
    
    // Update profile visibility options
    updateProfileOptionsVisibility();
    
    selectedStockCode = null;
    loadPortfolioFromServer();
    showNotification(`가족 구성원 '${usersList.find(u => u.id === memberId)?.name}'의 개인 포트폴리오 관리 모드로 전환했습니다.`, 'success');
  }
};

// Apply Selected Color Convention (Korean vs Global)
function applyColorConvention() {
  const root = document.documentElement;
  if (useKoreanColors) {
    root.classList.remove('global-colors');
    document.getElementById('theme-toggle-text').innerText = "한국식 색상 (상승 빨강 / 하락 파랑)";
  } else {
    root.classList.add('global-colors');
    document.getElementById('theme-toggle-text').innerText = "글로벌 색상 (상승 초록 / 하락 빨강)";
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Search Focus Trigger in welcome panel
  document.querySelectorAll('.search-focus-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('stock-search-input').focus();
    });
  });

  // Search input typing (autocomplete)
  const searchInput = document.getElementById('stock-search-input');
  const autocompleteList = document.getElementById('search-autocomplete-list');

  searchInput.addEventListener('input', debounce(async (e) => {
    const q = e.target.value.trim();
    if (q.length < 1) {
      autocompleteList.classList.add('hidden');
      return;
    }

    try {
      const res = await fetch(`/api/stocks?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const stocks = await res.json();
        renderAutocompleteList(stocks);
      }
    } catch (err) {
      console.error("Search autocomplete error:", err);
    }
  }, 250));

  // Hide autocomplete dropdown on clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
      autocompleteList.classList.add('hidden');
    }
  });

  // Save Debt
  document.getElementById('save-debt-btn').addEventListener('click', saveDebt);
  document.getElementById('debt-amount-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveDebt();
  });
  
  // Format Debt Input with thousands separator on focus out
  document.getElementById('debt-amount-input').addEventListener('blur', (e) => {
    const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
    e.target.value = val.toLocaleString('ko-KR');
  });

  // Save Cash
  document.getElementById('save-cash-btn').addEventListener('click', saveCash);
  document.getElementById('cash-amount-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveCash();
  });
  document.getElementById('cash-amount-input').addEventListener('blur', (e) => {
    const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
    e.target.value = val.toLocaleString('ko-KR');
  });

  // Theme Toggle Button
  document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    useKoreanColors = !useKoreanColors;
    localStorage.setItem('k_colors', useKoreanColors.toString());
    applyColorConvention();
  });

  // Active Dashboard Action Buttons
  document.getElementById('delete-stock-btn').addEventListener('click', deleteActiveStock);
  document.getElementById('open-split-buy-btn').addEventListener('click', openSplitBuyModal);

  // Modal Buttons
  document.getElementById('close-modal-btn').addEventListener('click', closeSplitBuyModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeSplitBuyModal);
  document.getElementById('modal-save-btn').addEventListener('click', saveSplitBuyModalData);

  // Add transaction form submit
  document.getElementById('add-transaction-form').addEventListener('submit', handleAddTransaction);

  // Chart Tab buttons
  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      const chartType = e.target.getAttribute('data-chart');
      changeChartImage(chartType);
    });
  });

  // Manual Refresh triggers
  document.getElementById('refresh-exchange-btn').addEventListener('click', async (e) => {
    const btnIcon = e.currentTarget.querySelector('i');
    btnIcon.classList.add('animate-spin');
    await loadExchangeRate();
    await renderPortfolioSummary();
    if (selectedStockCode) {
      await refreshActiveStockDashboard(selectedStockCode);
    }
    setTimeout(() => btnIcon.classList.remove('animate-spin'), 1000);
    showNotification("실시간 환율 데이터를 성공적으로 갱신하였습니다.", "success");
  });

  document.getElementById('refresh-briefing-btn').addEventListener('click', async (e) => {
    const btnIcon = e.currentTarget.querySelector('i');
    btnIcon.classList.add('animate-spin');
    await loadMarketReport();
    setTimeout(() => btnIcon.classList.remove('animate-spin'), 1000);
    showNotification("오늘의 시장 브리핑 리포트를 성공적으로 갱신하였습니다.", "success");
  });
}

// ----------------- AUTOCOMPLETE & SEARCH -----------------
function renderAutocompleteList(stocks) {
  const autocompleteList = document.getElementById('search-autocomplete-list');
  autocompleteList.innerHTML = '';

  if (stocks.length === 0) {
    const item = document.createElement('div');
    item.className = 'search-item';
    item.innerHTML = `<span class="search-item-name" style="color: var(--text-muted);">검색 결과가 없습니다.</span>`;
    autocompleteList.appendChild(item);
    autocompleteList.classList.remove('hidden');
    return;
  }

  stocks.forEach(stock => {
    const item = document.createElement('div');
    item.className = 'search-item';
    item.innerHTML = `
      <div class="search-item-info">
        <span class="search-item-name">${stock.name}</span>
        <span class="search-item-code">${stock.code}</span>
      </div>
      <span class="search-item-market">${stock.market}</span>
    `;

    item.addEventListener('click', () => {
      addStockToPortfolio(stock);
      autocompleteList.classList.add('hidden');
      document.getElementById('stock-search-input').value = '';
    });

    autocompleteList.appendChild(item);
  });

  autocompleteList.classList.remove('hidden');
}

// Add New Stock to Portfolio
async function addStockToPortfolio(stock) {
  if (portfolio[stock.code]) {
    showNotification(`${stock.name} 종목은 이미 포트폴리오에 존재합니다.`, 'warning');
    selectStock(stock.code);
    return;
  }

  // Create empty stock entry
  portfolio[stock.code] = {
    code: stock.code,
    name: stock.name,
    market: stock.market,
    transactions: [],
    avgPrice: 0,
    totalQty: 0
  };

  await savePortfolioToServer();
  renderSidebarStockList();
  selectStock(stock.code);
  showNotification(`${stock.name} 종목이 등록되었습니다. 매수 내역을 추가해 보세요!`, 'success');
}

// Delete Active Stock
async function deleteActiveStock() {
  if (!selectedStockCode || !portfolio[selectedStockCode]) return;
  
  const stockName = portfolio[selectedStockCode].name;
  if (confirm(`정말로 ${stockName} 종목을 포트폴리오에서 삭제하시겠습니까?`)) {
    delete portfolio[selectedStockCode];
    await savePortfolioToServer();
    renderSidebarStockList();
    
    const codes = Object.keys(portfolio);
    if (codes.length > 0) {
      selectStock(codes[0]);
    } else {
      selectedStockCode = null;
      document.getElementById('welcome-panel').classList.remove('hidden');
      document.getElementById('active-stock-dashboard').classList.add('hidden');
    }
    showNotification(`${stockName} 종목이 삭제되었습니다.`, 'info');
  }
}

// ----------------- SIDEBAR STOCK LIST & SUMMARY -----------------
function renderSidebarStockList() {
  const listContainer = document.getElementById('portfolio-stock-list');
  listContainer.innerHTML = '';

  const codes = Object.keys(portfolio);
  if (codes.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-list-msg">
        <i data-lucide="info" class="info-icon"></i>
        <p>보유 또는 관심 있는 한국 주식을 검색하여 포트폴리오에 등록해 보세요.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  codes.forEach(async (code) => {
    const stock = portfolio[code];
    const card = document.createElement('div');
    card.className = `stock-card ${selectedStockCode === code ? 'active' : ''}`;
    card.setAttribute('data-code', code);
    
    // Default preview structure, will update prices asynchronously
    card.innerHTML = `
      <div class="card-brand">
        <div class="card-meta">
          <div class="card-title-row">
            <span class="card-name">${stock.name}</span>
            <span class="trend-badge" id="trend-badge-${code}"></span>
          </div>
          <span class="card-code">${stock.code}</span>
        </div>
      </div>
      <div class="card-pricing">
        <span class="card-price" id="card-price-${code}">시세 로딩...</span>
        <span class="card-change" id="card-change-${code}">-</span>
      </div>
    `;

    card.addEventListener('click', () => {
      selectStock(code);
    });

    listContainer.appendChild(card);

    // Fetch and load current quotes for this card
    try {
      const res = await fetch(`/api/stock/${code}`);
      if (res.ok) {
        const data = await res.json();
        
        // Update Card Price and Logo
        const priceEl = document.getElementById(`card-price-${code}`);
        const changeEl = document.getElementById(`card-change-${code}`);
        
        const isUS = /[a-zA-Z]/.test(code);
        if (priceEl && changeEl) {
          if (isUS) {
            priceEl.innerText = `$${parseFloat(data.closePrice.replace(/,/g, '')).toFixed(2)}`;
          } else {
            priceEl.innerText = `${data.closePrice}원`;
          }
          
          const changeRatioRaw = parseFloat(data.fluctuationsRatio) || 0;
          const changeRatio = Math.abs(changeRatioRaw);

          const changeValRaw = parseFloat(data.compareToPreviousClosePrice.replace(/,/g, '')) || 0;
          const changeValAbs = Math.abs(changeValRaw);
          const changeValFormatted = isUS 
            ? changeValAbs.toFixed(2)
            : changeValAbs.toLocaleString('ko-KR');

          const isUp = data.compareToPreviousPrice.name === 'RISING';
          const isDown = data.compareToPreviousPrice.name === 'FALLING';
          
          let colorClass = 'neutral-text';
          let sign = '';
          if (isUp) {
            colorClass = 'up-text';
            sign = '+';
          } else if (isDown) {
            colorClass = 'down-text';
            sign = '-';
          }
          
          changeEl.className = `card-change ${colorClass}`;
          changeEl.innerText = `${sign}${changeValFormatted} (${sign}${changeRatio.toFixed(2)}%)`;

          // Handle Sharp Spike/Drop Indicators (>= +5% or <= -5%)
          const badgeEl = document.getElementById(`trend-badge-${code}`);
          if (badgeEl) {
            if (changeRatioRaw >= 5.0) {
              badgeEl.className = "trend-badge spike";
              badgeEl.innerHTML = "🔥 급등";
              card.classList.add('spike-glow');
              card.classList.remove('drop-glow');
            } else if (changeRatioRaw <= -5.0) {
              badgeEl.className = "trend-badge drop";
              badgeEl.innerHTML = "📉 급락";
              card.classList.add('drop-glow');
              card.classList.remove('spike-glow');
            } else {
              badgeEl.className = "trend-badge";
              badgeEl.innerHTML = "";
              card.classList.remove('spike-glow', 'drop-glow');
            }
          }
        }

        // Inject logo if exists
        if (data.logoUrl) {
          const logoImg = document.createElement('img');
          logoImg.src = data.logoUrl;
          logoImg.className = 'card-logo';
          logoImg.alt = `${stock.name} 로고`;
          
          const brandDiv = card.querySelector('.card-brand');
          brandDiv.insertBefore(logoImg, brandDiv.firstChild);
        }
      }
    } catch (err) {
      console.warn(`Failed loading quote for card ${code}:`, err);
    }
  });
}

// Render Overall Portfolio Statistics
async function renderPortfolioSummary() {
  let totalStockValuation = 0;
  let totalPrincipal = 0;
  let totalRealizedProfit = 0;

  const codes = Object.keys(portfolio);
  
  // 1) Calculate portfolio total principal and realized profit from local data
  codes.forEach(code => {
    const stock = portfolio[code];
    const isUS = /[a-zA-Z]/.test(code);
    let cost = (stock.avgPrice || 0) * (stock.totalQty || 0);
    let realized = parseFloat(stock.realizedProfit) || 0;

    if (isUS) {
      cost = cost * activeExchangeRate;
      realized = realized * activeExchangeRate;
    }
    totalPrincipal += cost;
    totalRealizedProfit += realized;
  });

  let totalDailyChange = 0;

  // 2) Calculate live valuations asynchronously
  const promises = codes.map(async (code) => {
    const stock = portfolio[code];
    const isUS = /[a-zA-Z]/.test(code);
    if (stock.totalQty > 0) {
      try {
        const res = await fetch(`/api/stock/${code}`);
        if (res.ok) {
          const data = await res.json();
          const currentPrice = parseFloat(data.closePrice.replace(/,/g, '')) || 0;
          let stockVal = currentPrice * stock.totalQty;
          if (isUS) {
            stockVal = stockVal * activeExchangeRate;
          }
          totalStockValuation += stockVal;

          // Aggregation of 1-day profit/loss
          const changeValStr = data.compareToPreviousClosePrice || '0';
          const changePrice = Math.abs(parseFloat(changeValStr.replace(/,/g, ''))) || 0;
          const isUp = data.compareToPreviousPrice?.name === 'RISING';
          const isDown = data.compareToPreviousPrice?.name === 'FALLING';
          
          let signMultiplier = 0;
          if (isUp) signMultiplier = 1;
          else if (isDown) signMultiplier = -1;

          let stockDailyChange = signMultiplier * changePrice * stock.totalQty;
          if (isUS) {
            stockDailyChange = stockDailyChange * activeExchangeRate;
          }
          totalDailyChange += stockDailyChange;
        } else {
          let stockVal = (stock.avgPrice || 0) * stock.totalQty;
          if (isUS) {
            stockVal = stockVal * activeExchangeRate;
          }
          totalStockValuation += stockVal;
        }
      } catch (err) {
        let stockVal = (stock.avgPrice || 0) * stock.totalQty;
        if (isUS) {
          stockVal = stockVal * activeExchangeRate;
        }
        totalStockValuation += stockVal;
      }
    }
  });

  // Wait for all live prices to aggregate
  await Promise.all(promises);

  // 3) Calculate Aggregates
  const totalAssets = totalStockValuation + cash; // Total assets = Stock + Cash
  const netAssets = totalAssets - debt;          // Net Assets = Total assets - debt
  const totalUnrealizedProfit = totalStockValuation - totalPrincipal; // Unrealized profit
  const totalProfit = totalUnrealizedProfit + totalRealizedProfit;    // Total overall profit

  let roeRatio = 0;
  if (netAssets > 0) {
    roeRatio = (totalProfit / netAssets) * 100;
  } else if (totalPrincipal > 0) {
    roeRatio = (totalProfit / totalPrincipal) * 100;
  }

  // 4) Update DOM elements
  document.getElementById('total-stock-value').innerText = `${totalStockValuation.toLocaleString('ko-KR')}원`;
  document.getElementById('net-asset-value').innerText = `${netAssets.toLocaleString('ko-KR')}원`;
  
  const dailyChangeEl = document.getElementById('portfolio-daily-change');
  if (dailyChangeEl) {
    const sign = totalDailyChange >= 0 ? '+' : '';
    dailyChangeEl.innerText = `(1일 손익: ${sign}${Math.round(totalDailyChange).toLocaleString('ko-KR')}원)`;
    if (totalDailyChange > 0) {
      dailyChangeEl.className = 'up-text';
    } else if (totalDailyChange < 0) {
      dailyChangeEl.className = 'down-text';
    } else {
      dailyChangeEl.className = 'neutral-text';
    }
  }

  // Update Profit and ROE
  const profitEl = document.getElementById('total-valuation-profit');
  const roiEl = document.getElementById('total-roi-ratio');
  profitEl.innerText = `${totalProfit >= 0 ? '+' : ''}${Math.round(totalProfit).toLocaleString('ko-KR')}원`;
  roiEl.innerText = `${totalProfit >= 0 ? '+' : ''}${roeRatio.toFixed(2)}%`;

  if (totalProfit > 0) {
    profitEl.className = "summary-value stat-change up-text";
    roiEl.className = "summary-value stat-change up-text";
  } else if (totalProfit < 0) {
    profitEl.className = "summary-value stat-change down-text";
    roiEl.className = "summary-value stat-change down-text";
  } else {
    profitEl.className = "summary-value stat-change neutral-text";
    roiEl.className = "summary-value stat-change neutral-text";
  }

  // Update Detail Unrealized & Realized Profit
  const unrealizedEl = document.getElementById('total-unrealized-profit');
  const realizedEl = document.getElementById('total-realized-profit');
  
  if (unrealizedEl) {
    unrealizedEl.innerText = `${totalUnrealizedProfit >= 0 ? '+' : ''}${Math.round(totalUnrealizedProfit).toLocaleString('ko-KR')}원`;
    unrealizedEl.className = unrealizedProfitClassName(totalUnrealizedProfit);
  }
  if (realizedEl) {
    realizedEl.innerText = `${totalRealizedProfit >= 0 ? '+' : ''}${Math.round(totalRealizedProfit).toLocaleString('ko-KR')}원`;
    realizedEl.className = unrealizedProfitClassName(totalRealizedProfit);
  }
}

function unrealizedProfitClassName(val) {
  if (val > 0) return 'stat-change up-text';
  if (val < 0) return 'stat-change down-text';
  return 'stat-change neutral-text';
}

// ----------------- ACTIVE STOCK SELECTION -----------------
async function selectStock(code) {
  if (!portfolio[code]) return;
  selectedStockCode = code;

  // Active state visual update
  document.querySelectorAll('.stock-card').forEach(card => {
    if (card.getAttribute('data-code') === code) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  document.getElementById('welcome-panel').classList.add('hidden');
  const dashboard = document.getElementById('active-stock-dashboard');
  dashboard.classList.remove('hidden');

  // Show skeleton/loading text
  document.getElementById('active-stock-name').innerText = portfolio[code].name;
  document.getElementById('active-stock-code').innerText = code;
  document.getElementById('active-current-price').innerText = "가져오는 중...";
  document.getElementById('strategy-badge-el').className = "strategy-badge hold";
  document.getElementById('strategy-badge-el').innerText = "분석 중...";
  document.getElementById('strategy-overview-text').innerText = "주가 지표 및 감성 데이터 통합 스코어링 분석 엔진 작동 중...";
  
  // Set first tab as active for charts
  document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.chart-tab[data-chart="day"]').classList.add('active');

  // Trigger content loading
  await refreshActiveStockDashboard(code);
}

// Fetch and Render full detail on active stock
async function refreshActiveStockDashboard(code) {
  if (selectedStockCode !== code) return; // Prevent race conditions

  document.getElementById('chart-loader').classList.remove('hidden');

  try {
    // 1) Fetch core stock information
    const stockRes = await fetch(`/api/stock/${code}`);
    if (!stockRes.ok) throw new Error("Failed fetching stock details.");
    const stockData = await stockRes.json();
    activeStockData = stockData;

    // 2) Update Brand Elements
    document.getElementById('active-stock-name').innerText = stockData.name;
    document.getElementById('active-stock-exchange').innerText = stockData.stockExchangeName;
    document.getElementById('active-stock-code').innerText = stockData.code;
    document.getElementById('active-market-status').innerText = `${stockData.marketStatus === 'OPEN' ? '장중' : '장마감'} | ${stockData.stockExchangeName} 거래소`;
    
    const logoEl = document.getElementById('active-company-logo');
    if (stockData.logoUrl) {
      logoEl.src = stockData.logoUrl;
      logoEl.style.display = 'block';
    } else {
      logoEl.style.display = 'none';
    }

    // 3) Update Price Elements
    const isUS = /[a-zA-Z]/.test(code);
    if (isUS) {
      const priceUSD = parseFloat(stockData.closePrice.replace(/,/g, '')) || 0;
      const priceKRW = Math.round(priceUSD * activeExchangeRate);
      document.getElementById('active-current-price').innerText = `$${priceUSD.toFixed(2)} (${priceKRW.toLocaleString('ko-KR')}원)`;
    } else {
      document.getElementById('active-current-price').innerText = `${stockData.closePrice}원`;
    }
    
    const changeBadge = document.getElementById('active-price-change-badge');
    const arrowEl = document.getElementById('active-price-change-arrow');
    const valEl = document.getElementById('active-price-change-val');
    const ratioEl = document.getElementById('active-price-change-ratio');

    const changeRatio = parseFloat(stockData.fluctuationsRatio) || 0;
    const changeVal = stockData.compareToPreviousClosePrice || '0';
    const isUp = stockData.compareToPreviousPrice.name === 'RISING';
    const isDown = stockData.compareToPreviousPrice.name === 'FALLING';

    if (isUS) {
      valEl.innerText = `$${parseFloat(changeVal.replace(/,/g, '')).toFixed(2)}`;
    } else {
      valEl.innerText = changeVal;
    }
    ratioEl.innerText = `(${changeRatio >= 0 ? '+' : ''}${changeRatio.toFixed(2)}%)`;

    if (isUp) {
      changeBadge.className = "change-badge up";
      arrowEl.innerText = "▲";
    } else if (isDown) {
      changeBadge.className = "change-badge down";
      arrowEl.innerText = "▼";
    } else {
      changeBadge.className = "change-badge neutral";
      arrowEl.innerText = "";
    }

    const now = new Date();
    document.getElementById('active-update-time').innerText = `마지막 업데이트: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

    // 4) Load Default (1D) Chart
    changeChartImage('day');

    // 5) Update Valuation Metric Cards Grid
    updateFinancialMetrics(stockData);

    // 6) Fetch related news dynamically
    await refreshNewsAndStrategy(stockData);

    // 7) Update target price alert settings inputs
    const stock = portfolio[code];
    if (stock) {
      const ceilingInput = document.getElementById('alert-ceiling-price');
      const floorInput = document.getElementById('alert-floor-price');
      const relativeDropInput = document.getElementById('alert-relative-drop');
      if (ceilingInput && floorInput) {
        ceilingInput.value = stock.alertCeiling !== undefined && stock.alertCeiling !== null ? stock.alertCeiling : '';
        floorInput.value = stock.alertFloor !== undefined && stock.alertFloor !== null ? stock.alertFloor : '';
      }
      if (relativeDropInput) {
        relativeDropInput.value = stock.alertRelativeDrop !== undefined && stock.alertRelativeDrop !== null ? stock.alertRelativeDrop : '';
      }

      const ceilingCurrencyLabel = document.getElementById('alert-currency-ceiling-label');
      const floorCurrencyLabel = document.getElementById('alert-currency-floor-label');
      if (ceilingCurrencyLabel && floorCurrencyLabel) {
        ceilingCurrencyLabel.innerText = isUS ? 'USD' : '원';
        floorCurrencyLabel.innerText = isUS ? 'USD' : '원';
      }

      if (ceilingInput && floorInput) {
        ceilingInput.placeholder = isUS ? '설정 안 함 (USD)' : '설정 안 함 (원)';
        floorInput.placeholder = isUS ? '설정 안 함 (USD)' : '설정 안 함 (원)';
      }
    }

  } catch (err) {
    console.error("Dashboard refresh error:", err);
    showNotification("주식 정보를 로드하는 데 실패했습니다.", "danger");
  } finally {
    document.getElementById('chart-loader').classList.add('hidden');
  }
}

// Swap Chart Images
function changeChartImage(type) {
  if (!activeStockData || !activeStockData.chartImages) return;
  
  const imgUrl = activeStockData.chartImages[type];
  const chartImg = document.getElementById('stock-chart-img');
  
  if (imgUrl) {
    chartImg.src = imgUrl;
    chartImg.style.display = 'block';
  } else {
    chartImg.style.display = 'none';
  }
}

// Populate Financial Metrics Card Grid
function updateFinancialMetrics(data) {
  const isUS = /[a-zA-Z]/.test(data.code);
  const getVal = (code) => data.valuation[code]?.value || '-';

  document.getElementById('val-market-cap').innerText = getVal('marketValue');
  document.getElementById('val-per').innerText = getVal('per');
  document.getElementById('val-pbr').innerText = getVal('pbr');
  document.getElementById('val-eps').innerText = getVal('eps');
  document.getElementById('val-bps').innerText = getVal('bps');
  document.getElementById('val-div-ratio').innerText = getVal('dividendYieldRatio');
  
  if (isUS) {
    document.getElementById('val-52w-high').innerText = getVal('highPriceOf52Weeks') !== '-' ? `$${getVal('highPriceOf52Weeks')}` : '-';
    document.getElementById('val-52w-low').innerText = getVal('lowPriceOf52Weeks') !== '-' ? `$${getVal('lowPriceOf52Weeks')}` : '-';
    document.getElementById('val-foreign-rate').innerText = 'N/A (해외)';
  } else {
    document.getElementById('val-52w-high').innerText = getVal('highPriceOf52Weeks') !== '-' ? `${getVal('highPriceOf52Weeks')}원` : '-';
    document.getElementById('val-52w-low').innerText = getVal('lowPriceOf52Weeks') !== '-' ? `${getVal('lowPriceOf52Weeks')}원` : '-';
    document.getElementById('val-foreign-rate').innerText = getVal('foreignRate');
  }
}

// Fetch Google News & Run Integrated Analysis
async function refreshNewsAndStrategy(stockData) {
  try {
    // 1) Fetch news headlines from Google News RSS
    const newsRes = await fetch(`/api/news/${encodeURIComponent(stockData.name)}`);
    if (!newsRes.ok) throw new Error("Failed fetching news feed.");
    const news = await newsRes.json();
    activeNewsData = news;

    // 2) Render news list in HTML
    renderNewsFeed(news);

    // 3) Request analysis engine response from backend
    const analyzeRes = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: stockData, news: news })
    });

    if (analyzeRes.ok) {
      const analysis = await analyzeRes.json();
      renderStrategyCard(analysis);
    }

  } catch (err) {
    console.error("News and analysis load error:", err);
    document.getElementById('active-news-list').innerHTML = `
      <div class="empty-list-msg" style="border-color: rgba(239, 68, 68, 0.2)">
        <i data-lucide="alert-circle" style="color: #ef4444;"></i>
        <p>실시간 뉴스 및 AI 투자 전략 분석 로딩에 실패했습니다.</p>
      </div>
    `;
    lucide.createIcons();
  }
}

// Populate News cards in feed list
function renderNewsFeed(news) {
  const newsList = document.getElementById('active-news-list');
  newsList.innerHTML = '';
  
  document.getElementById('news-count-badge').innerText = `${news.length}개 뉴스`;

  if (news.length === 0) {
    newsList.innerHTML = `
      <div class="empty-list-msg">
        <i data-lucide="newspaper" class="info-icon"></i>
        <p>최근 1주일간 해당 기업에 대한 주요 뉴스가 발견되지 않았습니다.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // Slice top 15 news for clean readability
  news.slice(0, 15).forEach(item => {
    const posKeywords = ['호실적', '실적개선', '상승', '급등', '최고', '성장', '수출증가', '신제품', '돌파', '흑자전환', '흑자', 'M&A', '협약', '수혜', '체결', '신고가'];
    const negKeywords = ['실적악화', '적자전환', '적자', '하락', '급락', '최저', '부진', '소송', '리콜', '과징금', '우려', '악재', '논란', '규제', '악화', '취소', '신저가'];
    
    let localSentiment = 'neutral';
    let localScore = 0;
    
    posKeywords.forEach(w => { if (item.title.includes(w)) localScore++; });
    negKeywords.forEach(w => { if (item.title.includes(w)) localScore--; });
    
    if (localScore > 0) localSentiment = 'positive';
    else if (localScore < 0) localSentiment = 'negative';

    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <div class="news-meta-row">
        <span class="news-source-badge">${item.source}</span>
        <div class="news-right-meta">
          <span class="news-date">${item.pubDate}</span>
          <span class="sentiment-indicator ${localSentiment}">
            ${localSentiment === 'positive' ? '긍정' : (localSentiment === 'negative' ? '부정' : '중립')}
          </span>
        </div>
      </div>
      <h4>
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="news-link">${item.title}</a>
      </h4>
    `;
    newsList.appendChild(card);
  });
}

// Render trading strategy score gauges and card metrics
function renderStrategyCard(analysis) {
  // Update Score Indicators
  document.getElementById('strategy-score').innerText = `${analysis.score}점`;
  
  const badge = document.getElementById('strategy-badge-el');
  badge.className = `strategy-badge ${analysis.recommendationBadge}`;
  badge.innerText = analysis.recommendation;

  document.getElementById('strategy-overview-text').innerText = analysis.strategyOverview;

  // Set Gauges Widths & Scores
  const valBar = document.getElementById('valuation-gauge');
  const sentBar = document.getElementById('sentiment-gauge');
  const momBar = document.getElementById('momentum-gauge');

  valBar.style.width = `${analysis.scores.valuation}%`;
  sentBar.style.width = `${analysis.scores.sentiment}%`;
  momBar.style.width = `${analysis.scores.momentum}%`;

  document.getElementById('valuation-score-txt').innerText = `${analysis.scores.valuation}/100`;
  document.getElementById('sentiment-score-txt').innerText = `${analysis.scores.sentiment}/100`;
  document.getElementById('momentum-score-txt').innerText = `${analysis.scores.momentum}/100`;

  // Render Pros and Cons lists
  const prosList = document.getElementById('strategy-pros-list');
  const consList = document.getElementById('strategy-cons-list');

  prosList.innerHTML = '';
  consList.innerHTML = '';

  analysis.pros.forEach(pro => {
    const li = document.createElement('li');
    li.innerText = pro;
    prosList.appendChild(li);
  });

  analysis.cons.forEach(con => {
    const li = document.createElement('li');
    li.innerText = con;
    consList.appendChild(li);
  });
}

// ----------------- TRANSACTION MODAL CONTROLLER -----------------
let modalTransactions = [];

function openSplitBuyModal() {
  if (!selectedStockCode || !portfolio[selectedStockCode]) return;
  
  const stock = portfolio[selectedStockCode];
  document.getElementById('modal-stock-name').innerText = stock.name;
  document.getElementById('modal-stock-code').innerText = stock.code;
  
  const isUS = /[a-zA-Z]/.test(stock.code);
  document.getElementById('split-buy-modal').setAttribute('data-is-us', isUS ? 'true' : 'false');

  // Adjust label dynamically
  const priceLabel = document.querySelector('.price-group label');
  if (priceLabel) {
    priceLabel.innerHTML = isUS ? '<i data-lucide="dollar-sign"></i> 거래단가 (USD)' : '<i data-lucide="coins"></i> 거래단가 (원)';
  }
  const priceInput = document.getElementById('tx-price');
  if (priceInput) {
    priceInput.placeholder = isUS ? '예: 180.5' : '예: 60000';
    priceInput.step = isUS ? '0.01' : '1';
    priceInput.min = isUS ? '0.01' : '1';
  }

  // Adjust table headers
  const headers = document.querySelectorAll('.tx-table th');
  if (headers.length >= 5) {
    headers[2].innerText = isUS ? '거래단가 (USD)' : '거래단가';
    headers[4].innerText = isUS ? '거래금액 (USD)' : '거래금액';
  }

  // Clone current transactions to avoid direct mutation
  modalTransactions = stock.transactions ? [...stock.transactions] : [];
  
  // Clear Add form input values
  document.getElementById('tx-type').value = 'BUY';
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('tx-price').value = '';
  document.getElementById('tx-qty').value = '';

  renderModalTransactionsTable();
  
  // Render Modal Show
  const modal = document.getElementById('split-buy-modal');
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeSplitBuyModal() {
  document.getElementById('split-buy-modal').classList.add('hidden');
}

// Render Transactions list table in modal
function renderModalTransactionsTable() {
  const tbody = document.getElementById('transactions-table-body');
  tbody.innerHTML = '';
  
  const isUS = document.getElementById('split-buy-modal').getAttribute('data-is-us') === 'true';

  if (modalTransactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="tx-table-empty tx-table-body-empty">
          등록된 거래 기록이 없습니다. 위 폼을 통해 매수/매도 이력을 추가해 보세요!
        </td>
      </tr>
    `;
    updateModalCalculatedBox(0, 0, 0, 0);
    return;
  }

  let totalPrincipal = 0;
  let totalQty = 0;
  let avgPrice = 0;
  let cumulativeRealizedProfit = 0;

  // Ensure chronological order for proper moving average calculation
  modalTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  modalTransactions.forEach((tx, idx) => {
    const row = document.createElement('tr');
    const txTotal = tx.price * tx.qty;
    const type = tx.type || 'BUY';
    const isBuy = type === 'BUY';

    if (isBuy) {
      const currentCost = avgPrice * totalQty;
      totalQty += tx.qty;
      avgPrice = totalQty > 0 ? (currentCost + txTotal) / totalQty : 0;
      totalPrincipal += txTotal;
    } else {
      const profit = (tx.price - avgPrice) * tx.qty;
      cumulativeRealizedProfit += profit;
      totalQty -= tx.qty;
      const costBasis = avgPrice * tx.qty;
      totalPrincipal -= costBasis;
      if (totalQty <= 0) {
        totalQty = 0;
        avgPrice = 0;
        totalPrincipal = 0;
      }
    }

    const typeBadge = isBuy 
      ? `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">매수</span>`
      : `<span style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">매도</span>`;

    row.innerHTML = `
      <td>${typeBadge}</td>
      <td>${tx.date}</td>
      <td class="tx-numeric">${isUS ? '$' + parseFloat(tx.price).toFixed(2) : parseFloat(tx.price).toLocaleString('ko-KR') + '원'}</td>
      <td class="tx-numeric">${tx.qty.toLocaleString('ko-KR')}주</td>
      <td class="tx-numeric">${isUS ? '$' + txTotal.toFixed(2) : txTotal.toLocaleString('ko-KR') + '원'}</td>
      <td>
        <button type="button" class="tx-delete-btn" data-index="${idx}" title="삭제">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;

    // Row Delete transaction event
    row.querySelector('.tx-delete-btn').addEventListener('click', (e) => {
      const deleteIndex = parseInt(e.currentTarget.getAttribute('data-index'));
      modalTransactions.splice(deleteIndex, 1);
      renderModalTransactionsTable();
    });

    tbody.appendChild(row);
  });

  updateModalCalculatedBox(avgPrice, totalQty, totalPrincipal, cumulativeRealizedProfit);
  lucide.createIcons();
}

// Update calculated box values in modal footer
function updateModalCalculatedBox(avgPrice, totalQty, totalPrincipal, cumulativeRealizedProfit) {
  const isUS = document.getElementById('split-buy-modal').getAttribute('data-is-us') === 'true';
  document.getElementById('calc-avg-price').innerText = isUS ? `$${avgPrice.toFixed(2)}` : `${Math.round(avgPrice).toLocaleString('ko-KR')}원`;
  document.getElementById('calc-total-qty').innerText = `${totalQty.toLocaleString('ko-KR')}주`;
  document.getElementById('calc-total-principal').innerText = isUS ? `$${totalPrincipal.toFixed(2)}` : `${Math.round(totalPrincipal).toLocaleString('ko-KR')}원`;
  
  const profitEl = document.getElementById('calc-realized-profit');
  if (profitEl) {
    const sign = cumulativeRealizedProfit >= 0 ? '+' : '';
    profitEl.innerText = isUS ? `${sign}$${cumulativeRealizedProfit.toFixed(2)}` : `${sign}${Math.round(cumulativeRealizedProfit).toLocaleString('ko-KR')}원`;
    
    if (cumulativeRealizedProfit > 0) {
      profitEl.style.color = 'var(--up-color)';
    } else if (cumulativeRealizedProfit < 0) {
      profitEl.style.color = 'var(--down-color)';
    } else {
      profitEl.style.color = 'var(--text-muted)';
    }
  }
}

// Handle Form Submission inside modal
function handleAddTransaction(e) {
  e.preventDefault();
  
  const isUS = document.getElementById('split-buy-modal').getAttribute('data-is-us') === 'true';
  const type = document.getElementById('tx-type').value;
  const date = document.getElementById('tx-date').value;
  const price = isUS ? parseFloat(document.getElementById('tx-price').value) || 0 : parseInt(document.getElementById('tx-price').value) || 0;
  const qty = parseInt(document.getElementById('tx-qty').value) || 0;

  if (price <= 0 || qty <= 0) {
    showNotification("올바른 단가와 수량을 입력하십시오.", "warning");
    return;
  }

  // Selling quantity validation
  let tempQty = 0;
  const tempTxs = [...modalTransactions, { date, price, qty, type }].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  for (const t of tempTxs) {
    const tType = t.type || 'BUY';
    if (tType === 'BUY') {
      tempQty += t.qty;
    } else {
      tempQty -= t.qty;
      if (tempQty < 0) {
        showNotification("보유 수량을 초과하여 매도할 수 없습니다. 거래일자와 보유 수량을 다시 확인해 주세요.", "danger");
        return;
      }
    }
  }

  modalTransactions.push({ date, price, qty, type });
  
  // Clear inputs except date
  document.getElementById('tx-price').value = '';
  document.getElementById('tx-qty').value = '';

  renderModalTransactionsTable();
  showNotification("거래 내역이 테이블에 임시 추가되었습니다.", "success");
}

// Save Modal Transactions back to active stock
async function saveSplitBuyModalData() {
  if (!selectedStockCode || !portfolio[selectedStockCode]) return;

  const stock = portfolio[selectedStockCode];
  const isUS = document.getElementById('split-buy-modal').getAttribute('data-is-us') === 'true';

  // 1) Calculate old net cash flow
  let oldNetFlow = 0;
  (stock.transactions || []).forEach(tx => {
    const type = tx.type || 'BUY';
    const txAmt = tx.price * tx.qty;
    if (type === 'BUY') {
      oldNetFlow -= txAmt;
    } else {
      oldNetFlow += txAmt;
    }
  });
  if (isUS) {
    oldNetFlow = oldNetFlow * activeExchangeRate;
  }

  // 2) Apply new transactions
  stock.transactions = [...modalTransactions];
  stock.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  let totalQty = 0;
  let avgPrice = 0;
  let realizedProfit = 0;
  let newNetFlow = 0;

  stock.transactions.forEach(tx => {
    const type = tx.type || 'BUY';
    const txAmt = tx.price * tx.qty;
    const isBuy = type === 'BUY';

    if (isBuy) {
      newNetFlow -= txAmt;
      const currentCost = avgPrice * totalQty;
      totalQty += tx.qty;
      avgPrice = totalQty > 0 ? (currentCost + txAmt) / totalQty : 0;
    } else {
      newNetFlow += txAmt;
      const profit = (tx.price - avgPrice) * tx.qty;
      realizedProfit += profit;
      totalQty -= tx.qty;
      if (totalQty <= 0) {
        totalQty = 0;
        avgPrice = 0;
      }
    }
  });
  if (isUS) {
    newNetFlow = newNetFlow * activeExchangeRate;
  }

  stock.avgPrice = totalQty > 0 ? (isUS ? avgPrice : Math.round(avgPrice)) : 0;
  stock.totalQty = totalQty;
  stock.realizedProfit = realizedProfit;

  // 3) Update Cash Balance dynamically
  const flowDiff = newNetFlow - oldNetFlow;
  cash = Math.max(0, cash + flowDiff);
  document.getElementById('cash-amount-input').value = Math.round(cash).toLocaleString('ko-KR');

  // Save changes on server
  await savePortfolioToServer();
  closeSplitBuyModal();
  
  // Reload summary, active dashboard, and sidebar items
  renderSidebarStockList();
  await renderPortfolioSummary();
  
  const priceText = isUS ? `$${stock.avgPrice.toFixed(2)}` : `${stock.avgPrice.toLocaleString('ko-KR')}원`;
  showNotification(`${stock.name} 주식 거래내역 평단가(${priceText})와 보유량(${stock.totalQty}주)이 적용되었습니다.`, "success");
}

// ----------------- BACKGROUND PRICE POLLING -----------------
function startPricePolling() {
  if (pollingIntervalId) clearInterval(pollingIntervalId);

  // Poll prices and recalculate portfolio summary every 30 seconds
  pollingIntervalId = setInterval(async () => {
    console.log("Background stock quote and market report polling initiated...");
    await loadMarketReport();
    
    const codes = Object.keys(portfolio);
    if (codes.length === 0) return;

    await renderPortfolioSummary();
    
    // If a stock is currently selected, refresh it as well
    if (selectedStockCode) {
      await refreshActiveStockDashboard(selectedStockCode);
    }
  }, 30000);
}

// ----------------- UTILITY FUNCTIONS -----------------

// Debounce for search efficiency
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Floating Notifications UI
function showNotification(message, type = 'info') {
  // Create container if not exists
  let container = document.getElementById('alert-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'alert-toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.right = '24px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.zIndex = '999';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-alert';
  
  // Set alert color styling
  let iconName = 'info';
  let borderCol = '#3b82f6';
  if (type === 'success') {
    borderCol = '#10b981';
    iconName = 'check-circle';
  } else if (type === 'warning') {
    borderCol = '#f59e0b';
    iconName = 'alert-triangle';
  } else if (type === 'danger') {
    borderCol = '#ef4444';
    iconName = 'alert-circle';
  }

  toast.style.background = '#111728';
  toast.style.backdropFilter = 'blur(10px)';
  toast.style.borderLeft = `4px solid ${borderCol}`;
  toast.style.borderTop = '1px solid rgba(255, 255, 255, 0.05)';
  toast.style.borderRight = '1px solid rgba(255, 255, 255, 0.05)';
  toast.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
  toast.style.padding = '12px 18px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
  toast.style.color = '#f3f4f6';
  toast.style.fontSize = '0.85rem';
  toast.style.fontWeight = '600';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '10px';
  toast.style.animation = 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

  toast.innerHTML = `
    <i data-lucide="${iconName}" style="color: ${borderCol}; width: 18px; height: 18px;"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // CSS injection for toast animations if not present
  if (!document.getElementById('toast-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-animation-styles';
    style.innerHTML = `
      @keyframes toastSlideIn {
        from { transform: translateX(50px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes toastSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(50px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Self remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// ----------------- FAMILY MANAGE MODAL CONTROLLER -----------------
function setupFamilyModalListeners() {
  const openBtn = document.getElementById('open-manage-family-btn');
  const closeBtn = document.getElementById('close-family-modal-btn');
  const modal = document.getElementById('family-manage-modal');
  const form = document.getElementById('add-member-form');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      renderFamilyMembersModalList();
      modal.classList.remove('hidden');
      lucide.createIcons();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // Handle form submission to add new user
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('new-member-name');
      const roleSelect = document.getElementById('new-member-role');

      const name = nameInput.value.trim();
      const role = roleSelect.value;

      if (!name) return;

      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, role })
        });

        if (res.ok) {
          showNotification(`새 가족 '${name}'이 등록되었습니다.`, 'success');
          nameInput.value = '';
          
          // Refresh lists
          await setupUserSelector();
          renderFamilyMembersModalList();
          
          // If on family aggregate view, refresh dashboard
          if (activeProfile === 'family-aggregate') {
            await loadFamilyAggregateSummary();
          }
        } else {
          const errData = await res.json();
          showNotification(errData.error || "가족 등록에 실패했습니다.", "danger");
        }
      } catch (err) {
        console.error("Error adding family member:", err);
        showNotification("네트워크 에러로 가족을 추가하지 못했습니다.", "danger");
      }
    });
  }
}

// Render the list of family members inside the manage modal
function renderFamilyMembersModalList() {
  const listContainer = document.getElementById('modal-family-members-list');
  listContainer.innerHTML = '';

  usersList.forEach(user => {
    const row = document.createElement('div');
    row.className = 'modal-member-row';
    
    // Member role badge info
    const isMainAdmin = user.id === 'tama';
    const deleteButtonHtml = isMainAdmin 
      ? `<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">삭제 불가</span>` 
      : `<button type="button" class="modal-delete-btn" data-id="${user.id}" title="삭제"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>`;

    row.innerHTML = `
      <div class="modal-member-info">
        <span class="modal-member-name">${user.name}</span>
        <span class="member-card-role-badge" style="background: ${user.role === 'admin' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; color: ${user.role === 'admin' ? '#c084fc' : 'var(--text-secondary)'}; font-size: 0.65rem;">${user.role === 'admin' ? '관리자' : '일반 구성원'}</span>
      </div>
      <div class="modal-member-actions">
        ${deleteButtonHtml}
      </div>
    `;

    // Event listener for delete action
    const delBtn = row.querySelector('.modal-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', async (e) => {
        const delId = e.currentTarget.getAttribute('data-id');
        const delName = user.name;

        if (confirm(`정말로 가족 구성원 '${delName}'을 목록에서 삭제하시겠습니까?\n삭제 시 해당 구성원의 자산 및 포트폴리오 데이터 파일도 모두 삭제됩니다.`)) {
          try {
            const res = await fetch(`/api/users/${delId}`, {
              method: 'DELETE'
            });

            if (res.ok) {
              showNotification(`가족 구성원 '${delName}'이 삭제되었습니다.`, 'info');
              
              // Refresh user lists
              await setupUserSelector();
              renderFamilyMembersModalList();
              
              // If we were viewing the deleted user, fallback to main admin
              if (activeUser === delId) {
                activeUser = 'tama';
                document.getElementById('user-select').value = 'tama';
                localStorage.setItem('k_active_user', 'tama');
                
                activeProfile = 'default';
                document.getElementById('profile-select').value = 'default';
                localStorage.setItem('k_active_profile', 'default');
              }
              
              // If on family aggregate view, refresh dashboard
              if (activeProfile === 'family-aggregate') {
                await loadFamilyAggregateSummary();
              } else {
                await loadPortfolioFromServer();
              }
            } else {
              const errData = await res.json();
              showNotification(errData.error || "가족 삭제에 실패했습니다.", "danger");
            }
          } catch (err) {
            console.error("Error deleting family member:", err);
            showNotification("네트워크 에러로 가족을 삭제하지 못했습니다.", "danger");
          }
        }
      });
    }

    listContainer.appendChild(row);
  });

  lucide.createIcons();
}

// Setup Telegram Alert Event Listeners
function setupTelegramListeners() {
  const openModalBtn = document.getElementById('open-telegram-modal-btn');
  const closeModalBtns = document.querySelectorAll('#close-telegram-modal-btn');
  const modal = document.getElementById('telegram-config-modal');
  const saveConfigBtn = document.getElementById('telegram-save-btn');
  const testConfigBtn = document.getElementById('telegram-test-btn');
  const saveAlertBtn = document.getElementById('save-alert-prices-btn');

  // Open Config Modal
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      document.getElementById('tele-bot-token').value = telegramToken;
      document.getElementById('tele-chat-id').value = telegramChatId;
      modal.classList.remove('hidden');
      lucide.createIcons();
    });
  }

  // Close Config Modal
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  });

  // Save Config
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', async () => {
      const tokenVal = document.getElementById('tele-bot-token').value.trim();
      const chatIdVal = document.getElementById('tele-chat-id').value.trim();
      
      telegramToken = tokenVal;
      telegramChatId = chatIdVal;
      
      await savePortfolioToServer();
      
      modal.classList.add('hidden');
      showNotification("텔레그램 알림 정보가 안전하게 저장되었습니다.", "success");
    });
  }

  // Test Config Push
  if (testConfigBtn) {
    testConfigBtn.addEventListener('click', async () => {
      const tokenVal = document.getElementById('tele-bot-token').value.trim();
      const chatIdVal = document.getElementById('tele-chat-id').value.trim();
      
      if (!tokenVal || !chatIdVal) {
        showNotification("테스트를 위해 봇 토큰과 채팅 ID를 모두 입력해주세요.", "warning");
        return;
      }
      
      showNotification("테스트 알림 전송 중...", "info");
      
      try {
        const res = await fetch('/api/telegram/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenVal, chatId: chatIdVal })
        });
        
        if (res.ok) {
          showNotification("텔레그램 테스트 알림 전송에 성공했습니다! 스마트폰을 확인해보세요.", "success");
        } else {
          const errData = await res.json();
          showNotification(errData.error || "테스트 알림 전송에 실패했습니다.", "danger");
        }
      } catch (err) {
        console.error("Telegram test error:", err);
        showNotification("서버 통신 오류로 테스트 알림 전송에 실패했습니다.", "danger");
      }
    });
  }

  // Save target alert prices for active stock
  if (saveAlertBtn) {
    saveAlertBtn.addEventListener('click', async () => {
      if (!selectedStockCode || !portfolio[selectedStockCode]) {
        showNotification("알림을 설정할 활성화된 종목이 없습니다.", "warning");
        return;
      }
      
      const ceilingInput = document.getElementById('alert-ceiling-price');
      const floorInput = document.getElementById('alert-floor-price');
      const relativeDropInput = document.getElementById('alert-relative-drop');
      
      const ceilingVal = ceilingInput.value.trim();
      const floorVal = floorInput.value.trim();
      const relativeDropVal = relativeDropInput ? relativeDropInput.value.trim() : '';
      
      const alertCeiling = ceilingVal === '' ? null : parseFloat(ceilingVal);
      const alertFloor = floorVal === '' ? null : parseFloat(floorVal);
      const alertRelativeDrop = relativeDropVal === '' ? null : parseFloat(relativeDropVal);
      
      if (alertCeiling !== null && alertFloor !== null && alertCeiling <= alertFloor) {
        showNotification("지정 상한가는 지정 하한가보다 높아야 합니다.", "warning");
        return;
      }
      
      try {
        const res = await fetch(`/api/telegram/alert-price?user=${activeUser}&profile=${activeProfile}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: selectedStockCode,
            alertCeiling,
            alertFloor,
            alertRelativeDrop
          })
        });
        
        if (res.ok) {
          // Update local state
          portfolio[selectedStockCode].alertCeiling = alertCeiling;
          portfolio[selectedStockCode].alertFloor = alertFloor;
          portfolio[selectedStockCode].alertRelativeDrop = alertRelativeDrop;
          
          // Clear active stock's triggered state locally just in case
          delete portfolio[selectedStockCode].lastAlertDate;
          delete portfolio[selectedStockCode].lastAlertType;
          delete portfolio[selectedStockCode].lastRelativeDropAlertDate;
          
          showNotification(`${portfolio[selectedStockCode].name} 종목의 알림 설정이 성공적으로 반영되었습니다.`, "success");
          
          // Refresh list to potentially show any visual status updates
          renderSidebarStockList();
        } else {
          const errData = await res.json();
          showNotification(errData.error || "지정가 알림 설정 저장에 실패했습니다.", "danger");
        }
      } catch (err) {
        console.error("Alert price save error:", err);
        showNotification("서버 통신 오류로 지정가 알림 설정 저장에 실패했습니다.", "danger");
      }
    });
  }
}
