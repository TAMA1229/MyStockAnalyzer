const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load Korean Stocks Database on startup
let koreanStocks = [];
try {
  const stocksFilePath = path.join(__dirname, 'korean_stocks.json');
  if (fs.existsSync(stocksFilePath)) {
    const rawData = fs.readFileSync(stocksFilePath, 'utf8');
    koreanStocks = JSON.parse(rawData);
    console.log(`Successfully loaded ${koreanStocks.length} stocks from database.`);
  } else {
    console.warn("korean_stocks.json file not found. Search autocomplete will not work.");
  }
} catch (err) {
  console.error("Error loading korean_stocks.json:", err);
}

// Popular US Stocks / ETFs Master List for robust Korean & English autocomplete matching
const popularUSStocks = [
  { name: '테슬라', engName: 'Tesla tsla', code: 'TSLA.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '엔비디아', engName: 'NVIDIA nvda', code: 'NVDA.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '애플', engName: 'Apple Inc aapl', code: 'AAPL.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '마이크로소프트', engName: 'Microsoft msft', code: 'MSFT.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '아마존', engName: 'Amazon amzn', code: 'AMZN.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '알파벳 구글', engName: 'Alphabet Google GOOGL GOOG', code: 'GOOGL.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '메타 페이스북', engName: 'Meta Facebook META FB', code: 'META.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '넷플릭스', engName: 'Netflix nflx', code: 'NFLX.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '브로드컴', engName: 'Broadcom avgo', code: 'AVGO.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '어드밴스드 마이크로 디바이스', engName: 'AMD Advanced Micro Devices amd', code: 'AMD.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '팔란티어', engName: 'Palantir pltr', code: 'PLTR.N', market: 'NYSE', industry: '해외주식' },
  { name: '퀄컴', engName: 'Qualcomm qcom', code: 'QCOM.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '코인베이스', engName: 'Coinbase coin', code: 'COIN.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '슈퍼마이크로컴퓨터', engName: 'Super Micro Computer SMCI smci', code: 'SMCI.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '암', engName: 'Arm Holdings arm', code: 'ARM.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '코카콜라', engName: 'Coca-Cola ko', code: 'KO', market: 'NYSE', industry: '해외주식' },
  { name: '펩시코', engName: 'PepsiCo pep', code: 'PEP', market: 'NASDAQ', industry: '해외주식' },
  { name: '맥도날드', engName: 'McDonald\'s mcd', code: 'MCD', market: 'NYSE', industry: '해외주식' },
  { name: '스타벅스', engName: 'Starbucks sbux', code: 'SBUX.O', market: 'NASDAQ', industry: '해외주식' },
  { name: '나이키', engName: 'Nike nke', code: 'NKE', market: 'NYSE', industry: '해외주식' },
  { name: '월트 디즈니', engName: 'Walt Disney dis', code: 'DIS', market: 'NYSE', industry: '해외주식' },
  { name: '리얼티인컴', engName: 'Realty Income o', code: 'O', market: 'NYSE', industry: '해외주식' },
  { name: '버크셔 해서웨이', engName: 'Berkshire Hathaway BRKb brkb', code: 'BRKb', market: 'NYSE', industry: '해외주식' },
  { name: '제이피모간체이스', engName: 'JPMorgan Chase jpm', code: 'JPM', market: 'NYSE', industry: '해외주식' },
  { name: 'TSMC', engName: 'TSMC Taiwan Semiconductor TSM tsm', code: 'TSM.N', market: 'NYSE', industry: '해외주식' },
  
  // Popular US ETFs
  { name: 'SPDR S&P 500 ETF', engName: 'SPY S&P500 에스앤피', code: 'SPY', market: 'AMEX', industry: '상장지수펀드(ETF)' },
  { name: 'Vanguard S&P 500 ETF', engName: 'VOO S&P500 에스앤피', code: 'VOO', market: 'AMEX', industry: '상장지수펀드(ETF)' },
  { name: 'Invesco QQQ Trust', engName: 'QQQ Nasdaq 나스닥 큐큐큐', code: 'QQQ', market: 'NASDAQ', industry: '상장지수펀드(ETF)' },
  { name: 'Schwab US Dividend Equity ETF', engName: 'SCHD 슈드 배당 다우존스', code: 'SCHD', market: 'NYSE', industry: '상장지수펀드(ETF)' },
  { name: 'JPMorgan Equity Premium Income ETF', engName: 'JEPI 제피 고배당', code: 'JEPI', market: 'NYSE', industry: '상장지수펀드(ETF)' },
  { name: 'Direxion Daily Semiconductor Bull 3X Shares', engName: 'SOXL 속슬 반도체 세배 레버리지', code: 'SOXL.N', market: 'NYSE', industry: '상장지수펀드(ETF)' },
  { name: 'ProShares UltraPro QQQ', engName: 'TQQQ 티큐큐큐 나스닥 세배 레버리지', code: 'TQQQ.O', market: 'NASDAQ', industry: '상장지수펀드(ETF)' },
  { name: 'iShares 20+ Year Treasury Bond ETF', engName: 'TLT 미국채 20년 tlt', code: 'TLT.O', market: 'NASDAQ', industry: '상장지수펀드(ETF)' }
];

// Ensure 'data' directory exists for persistent server-side storage (Docker volume mount target)
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`Created persistent data directory at: ${DATA_DIR}`);
}

// Seed and load Family Users list
const USERS_FILE = path.join(DATA_DIR, 'users.json');
let users = [];
try {
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } else {
    users = [
      { id: 'tama', name: '아빠 (TAMA)', role: 'admin' },
      { id: 'mom', name: '엄마', role: 'member' },
      { id: 'daughter', name: '딸', role: 'member' }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    console.log("Seeded default users list successfully.");
  }
} catch (err) {
  console.error("Error loading/seeding users list:", err);
}

// Helper to move files across different devices/mounts (EXDEV Docker safety)
function safeMoveFile(src, dest) {
  try {
    fs.renameSync(src, dest);
  } catch (err) {
    if (err.code === 'EXDEV') {
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
    } else {
      throw err;
    }
  }
}

// Migration check: if old profile files exist at root or data/ directory, migrate them to data/portfolio_tama_{profile}.json
try {
  ['default', 'retirement', 'family'].forEach(profile => {
    const oldPathData = path.join(DATA_DIR, `portfolio_${profile}.json`);
    const oldPathRoot = path.join(__dirname, `portfolio_${profile}.json`);
    const newPath = path.join(DATA_DIR, `portfolio_tama_${profile}.json`);
    
    if (fs.existsSync(oldPathData) && !fs.existsSync(newPath)) {
      safeMoveFile(oldPathData, newPath);
      console.log(`Migrated ${oldPathData} to ${newPath}`);
    } else if (fs.existsSync(oldPathRoot) && !fs.existsSync(newPath)) {
      safeMoveFile(oldPathRoot, newPath);
      console.log(`Migrated ${oldPathRoot} to ${newPath}`);
    }
  });
} catch (migErr) {
  console.error("Migration error:", migErr);
}

// Helper to get portfolio file path per user and profile inside the data directory
function getPortfolioFilePath(username, profileName) {
  const cleanUser = (username || 'tama').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanProfileName = (profileName || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(DATA_DIR, `portfolio_${cleanUser}_${cleanProfileName}.json`);
}

// Exchange Rate Caching State
let cachedExchangeRate = 1380;
let exchangeRateLastFetched = 0;

async function getUSDToKRWExchangeRate() {
  const now = Date.now();
  if (now - exchangeRateLastFetched < 10 * 60 * 1000) { // 10-minute cache
    return cachedExchangeRate;
  }

  try {
    const res = await fetch('https://api.stock.naver.com/marketindex/majors/part1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (res.ok) {
      const data = await res.json();
      const usdExchange = data.exchange?.find(ex => ex.symbolCode === 'USD');
      if (usdExchange && usdExchange.calcPrice) {
        const rate = parseFloat(usdExchange.calcPrice.replace(/,/g, ''));
        if (rate > 500 && rate < 3000) {
          cachedExchangeRate = rate;
          exchangeRateLastFetched = now;
          console.log(`Updated cached USD/KRW exchange rate: ${cachedExchangeRate} KRW`);
          return cachedExchangeRate;
        }
      }
    }
  } catch (err) {
    console.warn("Failed to fetch USD/KRW exchange rate:", err.message);
  }
  return cachedExchangeRate;
}

// Helper to fetch basic US stock info dynamically with support for NASDAQ, NYSE, and AMEX
async function tryFetchForeignStock(ticker) {
  const cleanTicker = ticker.trim().toUpperCase();
  
  // Try 1: Exact ticker as-is
  let stockData = await fetchBasicStockInfo(cleanTicker);
  if (stockData) return stockData;

  // Try 2: If no dot suffix, try NASDAQ suffix ('.O')
  if (!cleanTicker.includes('.')) {
    stockData = await fetchBasicStockInfo(cleanTicker + '.O');
    if (stockData) return stockData;
    
    // Try 3: Try NYSE suffix ('.N')
    stockData = await fetchBasicStockInfo(cleanTicker + '.N');
    if (stockData) return stockData;
  }
  return null;
}

async function fetchBasicStockInfo(code) {
  try {
    const url = `https://api.stock.naver.com/stock/${code}/basic`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://m.stock.naver.com/'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.stockName) {
        return data;
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

// Cache to store resolved Korean name -> US Ticker mapping to minimize Naver Search calls
const koreanToTickerCache = new Map();

async function resolveUSTickerByQuery(query) {
  const cleanQuery = query.trim().toLowerCase();
  if (koreanToTickerCache.has(cleanQuery)) {
    return koreanToTickerCache.get(cleanQuery);
  }

  try {
    const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(query + ' 주가')}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (res.ok) {
      const html = await res.text();
      
      // Try 1: [TICKER] 실시간 티커 (e.g. MU 실시간 티커, DIS 실시간 티커)
      const tickerMatch = html.match(/\b([A-Z]{1,5})\s+실시간\s+티커/);
      if (tickerMatch && tickerMatch[1]) {
        const ticker = tickerMatch[1].toUpperCase();
        koreanToTickerCache.set(cleanQuery, ticker);
        return ticker;
      }

      // Try 2: Find ticker in m.stock.naver.com worldstock links
      const match = html.match(/worldstock\/stock\/([a-zA-Z0-9.]+)\/(?:main|total)/i);
      if (match && match[1]) {
        const ticker = match[1].toUpperCase();
        koreanToTickerCache.set(cleanQuery, ticker);
        return ticker;
      }
      
      // Try 3: (NASDAQ|NYSE|AMEX):TICKER (TradingView charts)
      const tradingViewMatch = html.match(/(?:NASDAQ|NYSE|AMEX):([A-Z]{1,5})\b/i);
      if (tradingViewMatch && tradingViewMatch[1]) {
        const ticker = tradingViewMatch[1].toUpperCase();
        koreanToTickerCache.set(cleanQuery, ticker);
        return ticker;
      }

      // Try 4: Find ticker in alphasquare code parameter
      const alphaMatch = html.match(/alphasquare\.co\.kr\/home\/stock-summary\?code=([a-zA-Z0-9.]+)/i);
      if (alphaMatch && alphaMatch[1]) {
        const ticker = alphaMatch[1].toUpperCase();
        koreanToTickerCache.set(cleanQuery, ticker);
        return ticker;
      }
    }
  } catch (err) {
    console.warn(`Failed to resolve search query '${query}' to US ticker:`, err.message);
  }

  return null;
}

// Exchange Rate API
app.get('/api/exchange-rate', async (req, res) => {
  const rate = await getUSDToKRWExchangeRate();
  res.json({ rate });
});

// User List API
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Add New User API
app.post('/api/users', (req, res) => {
  const { name, role } = req.body;
  if (!name) {
    return res.status(400).json({ error: "User name is required." });
  }

  // Create simple unique ID
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!id) {
    return res.status(400).json({ error: "Invalid user name format." });
  }

  if (users.some(u => u.id === id)) {
    return res.status(400).json({ error: "User already exists." });
  }

  const newUser = {
    id: id,
    name: name.trim(),
    role: role || 'member'
  };

  users.push(newUser);
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    res.json({ success: true, user: newUser });
  } catch (err) {
    console.error("Error saving users list:", err);
    res.status(500).json({ error: "Failed to save new user." });
  }
});

// Delete User API
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "User not found." });
  }

  // Prevent deleting the main admin
  if (id === 'tama') {
    return res.status(400).json({ error: "Cannot delete the main admin account." });
  }

  const deletedUser = users.splice(index, 1)[0];
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    res.json({ success: true, message: `User '${deletedUser.name}' removed successfully.` });
  } catch (err) {
    console.error("Error saving users list:", err);
    res.status(500).json({ error: "Failed to remove user." });
  }
});

// 1. GET Portfolio API (Server-side storage)
app.get('/api/portfolio', (req, res) => {
  const user = req.query.user || 'tama';
  const profile = req.query.profile || 'default';
  const filePath = getPortfolioFilePath(user, profile);
  
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      // Ensure default cash is returned
      if (data.cash === undefined) data.cash = 0;
      return res.json(data);
    }
  } catch (err) {
    console.error(`Error reading portfolio for user ${user}, profile ${profile}:`, err);
  }

  // Default initial portfolio if file doesn't exist
  res.json({
    debt: 0,
    cash: 0,
    telegramToken: "",
    telegramChatId: "",
    stocks: {}
  });
});

// 2. POST Portfolio API (Server-side storage)
app.post('/api/portfolio', (req, res) => {
  const user = req.query.user || 'tama';
  const profile = req.query.profile || 'default';
  const filePath = getPortfolioFilePath(user, profile);
  const { debt, cash, stocks, telegramToken, telegramChatId } = req.body;

  try {
    const portfolioData = {
      debt: parseFloat(debt) || 0,
      cash: parseFloat(cash) || 0,
      telegramToken: telegramToken || "",
      telegramChatId: telegramChatId || "",
      stocks: stocks || {}
    };

    fs.writeFileSync(filePath, JSON.stringify(portfolioData, null, 2), 'utf8');
    res.json({ success: true, message: `Portfolio saved successfully for user '${user}', profile '${profile}'.` });
  } catch (err) {
    console.error(`Error saving portfolio for user ${user}, profile ${profile}:`, err);
    res.status(500).json({ error: "Failed to save portfolio on server." });
  }
});

// 2.2 Telegram Config Test API
app.post('/api/telegram/test', async (req, res) => {
  const { token, chatId } = req.body;
  if (!token || !chatId) {
    return res.status(400).json({ error: "텔레그램 봇 토큰과 채팅 ID가 필요합니다." });
  }

  try {
    const message = `🔔 <b>[K-Stock Insight] 테스트 알림입니다.</b>\n실시간 주가 알림 서비스가 성공적으로 연동되었습니다!`;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const resData = await response.json();
    if (response.ok && resData.ok) {
      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: resData.description || "텔레그램 메시지 전송 실패" });
    }
  } catch (err) {
    console.error("Telegram test alert error:", err);
    return res.status(500).json({ error: "서버 오류로 텔레그램 메시지를 전송하지 못했습니다." });
  }
});

// 2.3 Save target alert prices API
app.post('/api/telegram/alert-price', (req, res) => {
  const user = req.query.user || 'tama';
  const profile = req.query.profile || 'default';
  const filePath = getPortfolioFilePath(user, profile);
  const { code, alertCeiling, alertFloor, alertRelativeDrop } = req.body;

  if (!code) {
    return res.status(400).json({ error: "주식 코드가 필요합니다." });
  }

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "포트폴리오가 존재하지 않습니다." });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.stocks || !data.stocks[code]) {
      return res.status(404).json({ error: "해당 종목이 포트폴리오에 존재하지 않습니다." });
    }

    // Save alerts
    data.stocks[code].alertCeiling = alertCeiling !== undefined ? (alertCeiling === null ? null : parseFloat(alertCeiling)) : null;
    data.stocks[code].alertFloor = alertFloor !== undefined ? (alertFloor === null ? null : parseFloat(alertFloor)) : null;
    data.stocks[code].alertRelativeDrop = alertRelativeDrop !== undefined ? (alertRelativeDrop === null ? null : parseFloat(alertRelativeDrop)) : null;
    
    // Reset alert tracking to trigger again if price bounds change
    delete data.stocks[code].lastAlertDate;
    delete data.stocks[code].lastAlertType;
    delete data.stocks[code].lastRelativeDropAlertDate;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true, message: "실시간 알림 설정이 성공적으로 저장되었습니다." });
  } catch (err) {
    console.error("Error saving alert prices:", err);
    res.status(500).json({ error: "서버 오류로 알림 가격을 저장하지 못했습니다." });
  }
});

// 2.4 Daily Market Report API
app.get('/api/market/report', async (req, res) => {
  try {
    // 1) Fetch KOSPI and NASDAQ index data in parallel
    let kospiData = null;
    let nasdaqData = null;

    try {
      const kospiRes = await fetch('https://m.stock.naver.com/api/index/KOSPI/basic', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (kospiRes.ok) kospiData = await kospiRes.json();
    } catch (err) {
      console.warn("Report API: Failed to fetch KOSPI:", err.message);
    }

    try {
      const nasdaqRes = await fetch('https://api.stock.naver.com/index/.IXIC/basic', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (nasdaqRes.ok) nasdaqData = await nasdaqRes.json();
    } catch (err) {
      console.warn("Report API: Failed to fetch NASDAQ:", err.message);
    }

    // 2) Fetch major US tech stocks to construct sector briefing (NVDA.O, AAPL.O, TSLA.O, MSFT.O)
    const techStocks = ['NVDA.O', 'AAPL.O', 'TSLA.O', 'MSFT.O'];
    const techQuotes = [];

    await Promise.all(techStocks.map(async (code) => {
      try {
        const response = await fetch(`https://api.stock.naver.com/stock/${code}/basic`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (response.ok) {
          const resData = await response.json();
          techQuotes.push({
            code,
            name: resData.stockName,
            price: parseFloat(resData.closePrice.replace(/,/g, '')) || 0,
            fluctuationsRatio: parseFloat(resData.fluctuationsRatio) || 0,
            direction: resData.compareToPreviousPrice?.name || 'EVEN'
          });
        }
      } catch (err) {
        console.warn(`Report API: Failed to fetch tech stock ${code}:`, err.message);
      }
    }));

    // 3) Construct dynamic briefing summary
    let summaryText = "시장 브리핑 요약 데이터를 불러올 수 없습니다.";

    if (nasdaqData) {
      const nasdaqRatio = parseFloat(nasdaqData.fluctuationsRatio) || 0;
      const nasdaqClose = nasdaqData.closePrice;
      const isNasdaqDown = nasdaqData.compareToPreviousPrice?.name === 'FALLING';
      
      const changeText = isNasdaqDown ? `하락` : `상승`;
      const signedRatio = isNasdaqDown ? -Math.abs(nasdaqRatio) : Math.abs(nasdaqRatio);
      
      let techSummary = "";
      if (techQuotes.length > 0) {
        techQuotes.sort((a, b) => b.fluctuationsRatio - a.fluctuationsRatio);
        const best = techQuotes[0];
        const worst = techQuotes[techQuotes.length - 1];

        const bestSign = best.fluctuationsRatio >= 0 ? '+' : '';
        const worstSign = worst.fluctuationsRatio >= 0 ? '+' : '';

        techSummary = `주요 기술주 중에서는 <b>${best.name}</b>(${bestSign}${best.fluctuationsRatio.toFixed(2)}%)가 양호한 흐름을 보인 반면, <b>${worst.name}</b>(${worstSign}${worst.fluctuationsRatio.toFixed(2)}%)는 약세를 보였습니다.`;
      }

      let kospiExpectation = "";
      if (signedRatio <= -1.0) {
        kospiExpectation = "전날 나스닥의 큰 하락 조정 여파로 오늘 한국 KOSPI 시장은 IT·기술주 및 반도체 섹터 중심으로 외국인 매도세가 집중되며 하락 출발할 가능성이 큽니다. 장 초반에는 성급한 추격 매수를 지양하고 신중한 관망이 요구됩니다.";
      } else if (signedRatio >= 1.0) {
        kospiExpectation = "나스닥 지수의 강한 상승 랠리에 힘입어 금일 KOSPI 시장 또한 반도체 및 대형 IT 기술주 중심의 강력한 매수세 유입과 함께 상승 출발을 시도할 것으로 기대됩니다.";
      } else {
        kospiExpectation = "미국 증시가 뚜렷한 방향성 없이 강보합/약보합권에서 마감함에 따라, 금일 국내 증시 또한 뚜렷한 주도 섹터 없이 종목별 호재에 따른 차별화 장세를 보이며 혼조세로 출발할 것으로 예상됩니다.";
      }

      const today = new Date();
      const formattedDate = `${today.getMonth() + 1}월 ${today.getDate()}일`;

      summaryText = `<b>[${formattedDate} 시장 브리핑]</b> 전날 미국 <b>NASDAQ 지수</b>는 <b>${signedRatio >= 0 ? '+' : ''}${signedRatio.toFixed(2)}%</b> ${changeText}한 <b>${nasdaqClose}포인트</b>로 마감했습니다. ${techSummary} ${kospiExpectation}`;
    }

    res.json({
      kospi: kospiData ? {
        price: kospiData.closePrice,
        fluctuationsRatio: parseFloat(kospiData.fluctuationsRatio) || 0,
        direction: kospiData.compareToPreviousPrice?.name || 'EVEN',
        changeVal: kospiData.compareToPreviousClosePrice
      } : null,
      nasdaq: nasdaqData ? {
        price: nasdaqData.closePrice,
        fluctuationsRatio: parseFloat(nasdaqData.fluctuationsRatio) || 0,
        direction: nasdaqData.compareToPreviousPrice?.name || 'EVEN',
        changeVal: nasdaqData.compareToPreviousClosePrice
      } : null,
      report: summaryText
    });
  } catch (err) {
    console.error("Error generating market report:", err);
    res.status(500).json({ error: "시장 리포트를 생성하지 못했습니다." });
  }
});

// 2.5 Family Asset Aggregate Summary API
app.get('/api/family/summary', async (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR);
    const summaries = [];
    const allHeldStockCodes = new Set();
    const stockPrices = {};

    // Fetch the live exchange rate
    const exchangeRate = await getUSDToKRWExchangeRate();

    // 1) Load all members' portfolios
    for (const user of users) {
      // Find all profile files for this user
      const prefix = `portfolio_${user.id}_`;
      const userFiles = files.filter(f => f.startsWith(prefix) && f.endsWith('.json'));

      let memberDebt = 0;
      let memberCash = 0;
      const memberStocks = {};

      for (const file of userFiles) {
        try {
          const filePath = path.join(DATA_DIR, file);
          const raw = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(raw);
          
          memberDebt += parseFloat(data.debt) || 0;
          memberCash += parseFloat(data.cash) || 0;
          
          const stocks = data.stocks || {};
          Object.keys(stocks).forEach(code => {
            const stock = stocks[code];
            if (stock.totalQty > 0 || (stock.transactions && stock.transactions.length > 0)) {
              // Note: Also load stocks that have transaction history but currently 0 qty (to track realized profit)
              allHeldStockCodes.add(code);
              
              if (!memberStocks[code]) {
                memberStocks[code] = {
                  code: stock.code,
                  name: stock.name,
                  market: stock.market,
                  avgPrice: parseFloat(stock.avgPrice) || 0,
                  totalQty: parseFloat(stock.totalQty) || 0,
                  realizedProfit: parseFloat(stock.realizedProfit) || 0
                };
              } else {
                // Aggregate across user profiles (if they hold same stock in both default and retirement)
                const current = memberStocks[code];
                const totalCost = (current.avgPrice * current.totalQty) + ((parseFloat(stock.avgPrice) || 0) * (parseFloat(stock.totalQty) || 0));
                const totalQty = current.totalQty + (parseFloat(stock.totalQty) || 0);
                
                current.totalQty = totalQty;
                current.avgPrice = totalQty > 0 ? (totalCost / totalQty) : 0;
                current.realizedProfit = (current.realizedProfit || 0) + (parseFloat(stock.realizedProfit) || 0);
              }
            }
          });
        } catch (err) {
          console.error(`Error parsing file ${file} for family summary:`, err.message);
        }
      }

      summaries.push({
        id: user.id,
        name: user.name,
        role: user.role,
        debt: memberDebt,
        cash: memberCash,
        principal: 0, // calculated in loop 3
        stocks: memberStocks,
        valuation: 0,
        profit: 0,
        profitRatio: 0,
        roe: 0,
        netAssets: 0
      });
    }

    // 2) Fetch live prices for all unique stock codes in parallel
    const uniqueCodes = [...allHeldStockCodes];
    await Promise.all(uniqueCodes.map(async (code) => {
      try {
        const isUS = /[a-zA-Z]/.test(code);
        const url = isUS 
          ? `https://api.stock.naver.com/stock/${code}/basic`
          : `https://m.stock.naver.com/api/stock/${code}/basic`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': isUS ? 'https://m.stock.naver.com/' : `https://m.stock.naver.com/domestic/stock/${code}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const price = parseFloat(data.closePrice.replace(/,/g, '')) || 0;
          stockPrices[code] = {
            price: price,
            name: data.stockName,
            fluctuationsRatio: parseFloat(data.fluctuationsRatio) || 0,
            compareToPreviousClosePrice: data.compareToPreviousClosePrice,
            compareToPreviousPrice: data.compareToPreviousPrice
          };
        }
      } catch (err) {
        console.warn(`Failed to fetch current price for code ${code} during family summary:`, err.message);
      }
    }));

    // 3) Complete calculations for each member
    let familyValuation = 0;
    let familyDebt = 0;
    let familyPrincipal = 0;
    let familyRealizedProfit = 0;
    const combinedStocks = {};

    summaries.forEach(member => {
      let memberStockValuation = 0;
      let memberPrincipal = 0;
      let memberRealizedProfit = 0;
      let topValuation = 0;
      let topHoldingName = '-';

      Object.keys(member.stocks).forEach(code => {
        const stock = member.stocks[code];
        const quote = stockPrices[code];
        const currentPrice = quote ? quote.price : stock.avgPrice;
        const isUS = /[a-zA-Z]/.test(code);

        let stockVal = currentPrice * stock.totalQty;
        let stockCost = stock.avgPrice * stock.totalQty;
        let realized = parseFloat(stock.realizedProfit) || 0;

        if (isUS) {
          stockVal = stockVal * exchangeRate;
          stockCost = stockCost * exchangeRate;
          realized = realized * exchangeRate;
        }

        memberStockValuation += stockVal;
        memberPrincipal += stockCost;
        memberRealizedProfit += realized;
        
        // Track top holding
        if (stockVal > topValuation) {
          topValuation = stockVal;
          topHoldingName = stock.name;
        }

        // Aggregate for family-wide portfolio (only if they actually hold it currently)
        if (stock.totalQty > 0) {
          if (!combinedStocks[code]) {
            combinedStocks[code] = {
              code: stock.code,
              name: stock.name,
              market: stock.market,
              totalQty: stock.totalQty,
              totalValuation: stockVal,
              owners: [{ name: member.name, qty: stock.totalQty }]
            };
          } else {
            combinedStocks[code].totalQty += stock.totalQty;
            combinedStocks[code].totalValuation += stockVal;
            combinedStocks[code].owners.push({ name: member.name, qty: stock.totalQty });
          }
        }
      });

      member.valuation = memberStockValuation + member.cash; // Valuation is Total Assets (Stock + Cash)
      member.principal = memberPrincipal;
      member.netAssets = member.valuation - member.debt;
      
      const evalProfit = memberStockValuation - memberPrincipal;
      member.profit = evalProfit + memberRealizedProfit; // Profit is Unrealized + Realized
      
      member.profitRatio = memberPrincipal > 0 ? (member.profit / memberPrincipal) * 100 : 0;
      member.roe = member.netAssets > 0 ? (member.profit / member.netAssets) * 100 : member.profitRatio;
      member.topHolding = topHoldingName;

      familyValuation += member.valuation; // Total family assets
      familyDebt += member.debt;
      familyPrincipal += memberPrincipal;
      familyRealizedProfit += memberRealizedProfit;
    });

    // 4) Compute family-wide consolidated aggregates
    const familyCash = summaries.reduce((acc, m) => acc + m.cash, 0);
    const familyStockValuation = familyValuation - familyCash;
    const familyEvalProfit = familyStockValuation - familyPrincipal;
    const familyProfit = familyEvalProfit + familyRealizedProfit;
    const familyNetAssets = familyValuation - familyDebt;
    const familyCombinedRoe = familyNetAssets > 0 ? (familyProfit / familyNetAssets) * 100 : (familyPrincipal > 0 ? (familyProfit / familyPrincipal) * 100 : 0);

    // 5) Find top 5 holdings
    const topHoldings = Object.values(combinedStocks)
      .sort((a, b) => b.totalValuation - a.totalValuation)
      .slice(0, 5);

    res.json({
      family: {
        totalValuation: familyValuation,
        totalDebt: familyDebt,
        netAssets: familyNetAssets,
        principal: familyPrincipal,
        profit: familyProfit,
        roe: familyCombinedRoe,
        cash: familyCash
      },
      members: summaries,
      topHoldings: topHoldings
    });

  } catch (err) {
    console.error("Error generating family aggregate summary:", err);
    res.status(500).json({ error: "Internal server error during family summary." });
  }
});

// 3. Search Stocks API
app.get('/api/stocks', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.json([]);
  }

  const lowerQuery = query.toLowerCase();

  // Filter stocks by name or 6-digit code
  const results = koreanStocks.filter(stock => 
    stock.name.toLowerCase().includes(lowerQuery) || 
    stock.code.includes(lowerQuery)
  );

  // Match popular US stocks (by Korean name, English name, or ticker code)
  const usMatches = popularUSStocks.filter(stock => 
    stock.name.toLowerCase().includes(lowerQuery) || 
    stock.engName.toLowerCase().includes(lowerQuery) ||
    stock.code.toLowerCase().includes(lowerQuery)
  );
  
  results.push(...usMatches);

  // If query is a 6-digit code and has no exact match in results, fetch it dynamically from Naver Finance
  if (/^\d{6}$/.test(query) && !results.some(stock => stock.code === query)) {
    try {
      const basicRes = await fetch(`https://m.stock.naver.com/api/stock/${query}/basic`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `https://m.stock.naver.com/domestic/stock/${query}`
        }
      });
      if (basicRes.ok) {
        const data = await basicRes.json();
        if (data && data.stockName && data.itemCode) {
          results.unshift({
            name: data.stockName,
            code: data.itemCode,
            market: data.stockExchangeName || 'KOSPI',
            industry: data.stockEndType === 'etf' ? '상장지수펀드(ETF)' : '금융상품/기타'
          });
        }
      }
    } catch (err) {
      console.warn(`Dynamic search fallback failed for code ${query}:`, err.message);
    }
  }

  // If the query contains English characters (possible US stock), fetch from Naver
  if (/^[a-zA-Z.]{1,10}$/.test(query) && results.length < 5) {
    try {
      const foreignStock = await tryFetchForeignStock(query);
      if (foreignStock) {
        // Avoid duplicates
        if (!results.some(s => s.code === foreignStock.reutersCode)) {
          results.unshift({
            name: foreignStock.stockName,
            code: foreignStock.reutersCode,
            market: foreignStock.stockExchangeName || (foreignStock.stockExchangeType?.nameKor) || 'US',
            industry: foreignStock.stockEndType === 'etf' ? '상장지수펀드(ETF)' : '해외주식'
          });
        }
      }
    } catch (err) {
      console.warn(`Dynamic foreign search fallback failed for ticker ${query}:`, err.message);
    }
  }

  // If the query is a text query and results are scarce, try resolving to a US stock ticker via Naver Search HTML
  if (results.length < 5 && !/^\d+$/.test(query)) {
    try {
      const resolvedTicker = await resolveUSTickerByQuery(query);
      if (resolvedTicker) {
        const foreignStock = await tryFetchForeignStock(resolvedTicker);
        if (foreignStock) {
          // Avoid duplicates
          if (!results.some(s => s.code === foreignStock.reutersCode)) {
            results.unshift({
              name: foreignStock.stockName,
              code: foreignStock.reutersCode,
              market: foreignStock.stockExchangeName || (foreignStock.stockExchangeType?.nameKor) || 'US',
              industry: foreignStock.stockEndType === 'etf' ? '상장지수펀드(ETF)' : '해외주식'
            });
          }
        }
      }
    } catch (err) {
      console.warn(`Dynamic US stock fallback failed for query ${query}:`, err.message);
    }
  }

  // Return top 15 results
  res.json(results.slice(0, 15));
});

// 4. Fetch Detailed Stock Info from Naver Finance API
app.get('/api/stock/:code', async (req, res) => {
  const { code } = req.params;
  const isUS = /[a-zA-Z]/.test(code);
  const isValidCode = isUS ? /^[a-zA-Z.]{1,10}$/.test(code) : /^\d{6}[A-Z\d]?$/.test(code);
  
  if (!isValidCode) {
    return res.status(400).json({ error: "Invalid stock code format." });
  }

  try {
    if (isUS) {
      // 1) Fetch Basic Foreign Stock Info
      const basicRes = await fetch(`https://api.stock.naver.com/stock/${code}/basic`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `https://m.stock.naver.com/`
        }
      });

      if (!basicRes.ok) {
        return res.status(basicRes.status).json({ error: `Failed to fetch foreign stock info for code ${code}` });
      }

      const basicData = await basicRes.json();

      // 2) Parse metrics from stockItemTotalInfos (since US stocks do not have a separate integration endpoint)
      const valuation = {};
      const totalInfos = basicData.stockItemTotalInfos || [];
      totalInfos.forEach(item => {
        valuation[item.code] = {
          label: item.key,
          value: item.value,
          desc: item.valueDesc || ''
        };
      });

      const responseData = {
        code: basicData.reutersCode || basicData.symbolCode || code,
        name: basicData.stockName,
        closePrice: basicData.closePrice,
        compareToPreviousClosePrice: basicData.compareToPreviousClosePrice,
        compareToPreviousPrice: basicData.compareToPreviousPrice,
        fluctuationsRatio: basicData.fluctuationsRatio,
        marketStatus: basicData.marketStatus,
        stockExchangeName: basicData.stockExchangeName || (basicData.stockExchangeType?.nameKor) || 'US',
        logoUrl: basicData.itemLogoUrl || basicData.itemLogoPngUrl || '',
        chartImages: basicData.imageCharts || {},
        valuation: valuation,
        chartHistory: []
      };

      return res.json(responseData);
    }

    // 1) Fetch Basic Domestic Stock Info
    const basicRes = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `https://m.stock.naver.com/domestic/stock/${code}`
      }
    });

    if (!basicRes.ok) {
      return res.status(basicRes.status).json({ error: `Failed to fetch basic info for code ${code}` });
    }

    const basicData = await basicRes.json();

    // 2) Fetch Integration Stock Info (Valuation, Deal Trends)
    let integrationData = null;
    try {
      const integrationRes = await fetch(`https://m.stock.naver.com/api/stock/${code}/integration`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `https://m.stock.naver.com/domestic/stock/${code}`
        }
      });
      if (integrationRes.ok) {
        integrationData = await integrationRes.json();
      }
    } catch (integrationErr) {
      console.warn(`Could not load integration data for stock ${code}:`, integrationErr.message);
    }

    // 3) Process and merge metrics
    const valuation = {};
    if (integrationData && integrationData.totalInfos) {
      integrationData.totalInfos.forEach(item => {
        valuation[item.code] = {
          label: item.key,
          value: item.value,
          desc: item.valueDesc || ''
        };
      });
    }

    // Extract historical close prices from deal trends
    const chartHistory = [];
    if (integrationData && integrationData.dealTrendInfos) {
      integrationData.dealTrendInfos.forEach(item => {
        chartHistory.push({
          date: item.bizdate, // YYYYMMDD
          close: parseFloat(item.closePrice.replace(/,/g, '')),
          change: parseFloat(item.compareToPreviousClosePrice.replace(/,/g, '')),
          changeType: item.compareToPreviousPrice.name, // RISING, FALLING, EVEN
          foreignerHoldRatio: parseFloat(item.foreignerHoldRatio.replace(/%/g, '')),
          volume: parseInt(item.accumulatedTradingVolume.replace(/,/g, ''))
        });
      });
    }

    const responseData = {
      code: basicData.itemCode,
      name: basicData.stockName,
      closePrice: basicData.closePrice,
      compareToPreviousClosePrice: basicData.compareToPreviousClosePrice,
      compareToPreviousPrice: basicData.compareToPreviousPrice,
      fluctuationsRatio: basicData.fluctuationsRatio,
      marketStatus: basicData.marketStatus,
      stockExchangeName: basicData.stockExchangeName,
      logoUrl: basicData.itemLogoUrl || basicData.itemLogoPngUrl || '',
      chartImages: basicData.imageCharts || {},
      valuation: valuation,
      chartHistory: chartHistory.reverse() // Chronological order
    };

    res.json(responseData);

  } catch (err) {
    console.error(`Error fetching stock info for ${code}:`, err);
    res.status(500).json({ error: "Internal server error fetching stock data." });
  }
});

// 5. Fetch Related News from Google News RSS API
app.get('/api/news/:query', async (req, res) => {
  const { query } = req.params;
  if (!query) {
    return res.status(400).json({ error: "Search query is required." });
  }

  try {
    const newsRes = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!newsRes.ok) {
      return res.status(newsRes.status).json({ error: "Failed to fetch news feed." });
    }

    const xmlText = await newsRes.text();
    const newsItems = parseGoogleNewsRss(xmlText);

    res.json(newsItems);
  } catch (err) {
    console.error(`Error fetching news for query ${query}:`, err);
    res.status(500).json({ error: "Internal server error fetching news." });
  }
});

// 6. Combined Stock Sentiment & Valuation Strategy Analysis API
app.post('/api/analyze', (req, res) => {
  const { stock, news } = req.body;
  if (!stock) {
    return res.status(400).json({ error: "Stock data is required." });
  }

  try {
    // A. Valuation Score (0 - 100)
    let valScore = 50; // default neutral
    let valDetails = [];
    
    // Extract PER, PBR, Dividend from stock valuation
    const perVal = stock.valuation?.per?.value || '';
    const pbrVal = stock.valuation?.pbr?.value || '';
    const divVal = stock.valuation?.dividendYieldRatio?.value || '';

    let per = null;
    let pbr = null;
    let dividend = null;

    if (perVal) {
      per = parseFloat(perVal.replace(/배/g, '').replace(/,/g, ''));
      if (!isNaN(per)) {
        if (per < 10) {
          valScore += 15;
          valDetails.push(`PER ${per}배: 주가가 수익 대비 저평가 국면에 있어 매력적입니다.`);
        } else if (per > 25) {
          valScore -= 15;
          valDetails.push(`PER ${per}배: 수익 대비 고평가 혹은 프리미엄이 낀 상태입니다.`);
        } else {
          valDetails.push(`PER ${per}배: 업계 평균 수준의 밸류에이션을 기록 중입니다.`);
        }
      }
    }

    if (pbrVal) {
      pbr = parseFloat(pbrVal.replace(/배/g, '').replace(/,/g, ''));
      if (!isNaN(pbr)) {
        if (pbr < 0.8) {
          valScore += 15;
          valDetails.push(`PBR ${pbr}배: 기업의 장부가치 대비 저평가 상태입니다.`);
        } else if (pbr > 3.0) {
          valScore -= 15;
          valDetails.push(`PBR ${pbr}배: 자산 가치 대비 높은 멀티플을 받고 있습니다.`);
        } else {
          valDetails.push(`PBR ${pbr}배: 장부가치 대비 적정 수준입니다.`);
        }
      }
    }

    if (divVal) {
      dividend = parseFloat(divVal.replace(/%/g, '').replace(/,/g, ''));
      if (!isNaN(dividend) && dividend > 3.0) {
        valScore += 10;
        valDetails.push(`배당수익률 ${dividend}%: 높은 시가배당률로 하방 경직성을 제공합니다.`);
      }
    }

    valScore = Math.max(10, Math.min(90, valScore)); // bound valuation score

    // B. Sentiment Analysis on News (0 - 100)
    let sentimentScore = 50; // default neutral
    let posCount = 0;
    let negCount = 0;
    const analyzedNews = [];

    const posKeywords = ['호실적', '실적개선', '상승', '급등', '최고', '대박', '성장', '수출증가', '신제품', '돌파', '흑자전환', '흑자', 'M&A', '협약', '수혜', '강세', '체결', '신고가', '매수추천', '개발성공'];
    const negKeywords = ['실적악화', '적자전환', '적자', '하락', '급락', '최저', '감소', '부진', '소송', '리콜', '과징금', '우려', '악재', '논란', '규제', '악화', '취소', '신저가', '파업', '과열', '경고'];

    if (Array.isArray(news)) {
      news.forEach(item => {
        let score = 0;
        const title = item.title;
        
        posKeywords.forEach(word => {
          if (title.includes(word)) score += 1;
        });
        
        negKeywords.forEach(word => {
          if (title.includes(word)) score -= 1;
        });

        let sentiment = 'neutral';
        if (score > 0) {
          sentiment = 'positive';
          posCount++;
        } else if (score < 0) {
          sentiment = 'negative';
          negCount++;
        }

        analyzedNews.push({
          ...item,
          sentiment: sentiment
        });
      });

      const totalScored = posCount + negCount;
      if (totalScored > 0) {
        // Compute sentiment score based on positive ratio
        const ratio = posCount / totalScored;
        sentimentScore = Math.round(20 + ratio * 60); // range 20 - 80
      }
    }

    // C. Momentum Score (0 - 100)
    let momentumScore = 50;
    const changeRatio = parseFloat(stock.fluctuationsRatio);
    if (!isNaN(changeRatio)) {
      momentumScore += changeRatio * 3; // daily changes amplify momentum
      momentumScore = Math.max(15, Math.min(85, momentumScore));
    }

    // D. Comprehensive Investment Score (0 - 100)
    // Weight: Valuation (40%), News Sentiment (40%), Price Momentum (20%)
    const finalScore = Math.round((valScore * 0.4) + (sentimentScore * 0.4) + (momentumScore * 0.2));

    // E. Recommendation Card & Strategy Outline
    let recommendation = '';
    let recommendationBadge = '';
    let strategyOverview = '';
    const pros = [];
    const cons = [];

    if (finalScore >= 75) {
      recommendation = "적극 매수 (Strong Buy)";
      recommendationBadge = "strong-buy";
      strategyOverview = "기업의 밸류에이션이 매우 매력적이거나 최근 시장을 선도하는 강력한 호재성 뉴스가 집약되고 있습니다. 장기적인 관점에서 적극적으로 포지션을 구축하거나 비중을 확대하기에 이상적인 국면입니다.";
    } else if (finalScore >= 55) {
      recommendation = "분할 매수 (Accumulate)";
      recommendationBadge = "buy";
      strategyOverview = "뉴스 감성과 밸류에이션 모두 긍정적인 신호를 보이고 있습니다. 단기 변동성에 흔들리지 않고 적립식 분할 매수 형태로 비중을 차근차근 늘리는 전략이 유효합니다.";
    } else if (finalScore >= 45) {
      recommendation = "관망 (Hold)";
      recommendationBadge = "hold";
      strategyOverview = "화두나 변곡점에 서 있으며 지표들이 팽팽히 맞서거나 현재 주가가 밸류에이션상 정체 국면입니다. 신규 매수보다는 현재 비중을 유지하고, 다음 분기 실적 발표나 주요 뉴스 방향성을 지켜보는 것이 안전합니다.";
    } else if (finalScore >= 30) {
      recommendation = "분할 매도 (Partial Sell)";
      recommendationBadge = "sell";
      strategyOverview = "뉴스 감성이 악화되고 있거나 밸류에이션 멀티플이 과도하게 부풀려진 고평가 상태입니다. 리스크 관리를 위해 보유 비중을 일부 낮추어 현금을 확보하는 방안을 고려하십시오.";
    } else {
      recommendation = "적극 매도 (Strong Sell)";
      recommendationBadge = "strong-sell";
      strategyOverview = "재무 지표상 심각한 고평가이거나 실적 악화, 소송, 규제 등 펀더멘탈을 위협하는 대형 악재 뉴스가 다수 발생하고 있습니다. 투자 자산의 하방 위험이 크므로 포트폴리오 보호를 최우선으로 해야 합니다.";
    }

    // Generate Pros & Cons
    if (posCount > 0) pros.push(`최근 뉴스에서 긍정적 키워드 ${posCount}개 포착 (시장 긍정론 확산)`);
    if (per && per < 15) pros.push(`낮은 PER 지표 (${per}배)로 가격 하방 경직성 보유`);
    if (pbr && pbr < 1.0) pros.push(`PBR ${pbr}배로 자산가치 대비 절대적 저평가 상태`);
    if (dividend && dividend > 2.5) pros.push(`안정적인 고배당 메리트 (연 ${dividend}%)`);
    if (changeRatio > 3.0) pros.push(`강력한 단기 상승 모멘텀 표출 (전일비 +${changeRatio}%)`);

    if (negCount > 0) cons.push(`최근 뉴스에서 부정적 키워드 ${negCount}개 포착 (리스크 관리 필요)`);
    if (per && per > 22) cons.push(`비교적 높은 PER 지표 (${per}배)로 고평가 부담 작용`);
    if (pbr && pbr > 2.5) cons.push(`자산가치 대비 PBR ${pbr}배로 다소 높은 밸류에이션 멀티플`);
    if (changeRatio < -3.0) cons.push(`단기 주가 낙폭 과대로 모멘텀 훼손 우려 (전일비 ${changeRatio}%)`);

    // Standard items if arrays are empty
    if (pros.length === 0) pros.push("뚜렷한 과열이나 호재가 없는 중립적이고 차분한 가격대 형성");
    if (cons.length === 0) cons.push("특별히 감지된 대형 악재나 높은 고평가 리스크 없음");

    res.json({
      score: finalScore,
      recommendation,
      recommendationBadge,
      strategyOverview,
      scores: {
        valuation: valScore,
        sentiment: sentimentScore,
        momentum: momentumScore
      },
      metrics: {
        posCount,
        negCount,
        per,
        pbr,
        dividend
      },
      pros,
      cons,
      analyzedNews
    });

  } catch (err) {
    console.error("Error analyzing stock:", err);
    res.status(500).json({ error: "Internal server error during analysis." });
  }
});

// Helper function to parse Google News RSS XML using Regular Expressions
function parseGoogleNewsRss(xmlText) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];
    
    // Extract title, link, pubDate, source using non-greedy regex
    const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/);

    const title = titleMatch ? titleMatch[1] : '';
    const link = linkMatch ? linkMatch[1] : '';
    const pubDate = pubDateMatch ? pubDateMatch[1] : '';
    const source = sourceMatch ? sourceMatch[1] : '';

    // Clean CDATA wrappers and common HTML entities
    const cleanTitle = title.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
                           .replace(/&amp;/g, '&')
                           .replace(/&quot;/g, '"')
                           .replace(/&lt;/g, '<')
                           .replace(/&gt;/g, '>')
                           .replace(/&#39;/g, "'");

    const cleanSource = source.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

    // Extract cleaner display title and publisher (Google RSS titles usually end in "- Publisher")
    let displayTitle = cleanTitle;
    let publisher = cleanSource || '뉴스';
    const lastDashIndex = cleanTitle.lastIndexOf(' - ');
    if (lastDashIndex !== -1 && lastDashIndex > cleanTitle.length - 35) {
      displayTitle = cleanTitle.substring(0, lastDashIndex);
      publisher = cleanTitle.substring(lastDashIndex + 3);
    }

    // Standardize publication date to Korean local time
    let formattedDate = pubDate;
    try {
      if (pubDate) {
        formattedDate = new Date(pubDate).toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (dateErr) {
      // fallback to raw pubDate
    }

    items.push({
      title: displayTitle.trim(),
      link: link.trim(),
      pubDate: formattedDate,
      source: publisher.trim()
    });
  }

  return items;
}

// Background target price & daily spike/drop monitoring task running every 60 seconds
async function runBackgroundAlertMonitor() {
  try {
    const files = fs.readdirSync(DATA_DIR);
    const portfolioFiles = files.filter(f => f.startsWith('portfolio_') && f.endsWith('.json'));
    const alertTargets = [];

    // 1) Read all portfolios to collect stock configs and Telegram credentials
    for (const file of portfolioFiles) {
      try {
        const filePath = path.join(DATA_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const token = data.telegramToken;
        const chatId = data.telegramChatId;
        if (!token || !chatId) continue;

        const stocks = data.stocks || {};
        Object.keys(stocks).forEach(code => {
          const stock = stocks[code];
          // Monitor any registered stock in the portfolio
          alertTargets.push({
            filePath,
            code,
            stock,
            token,
            chatId,
            data
          });
        });
      } catch (err) {
        // ignore individual file read errors
      }
    }

    if (alertTargets.length === 0) return;

    // 2) Fetch live prices for all unique stock codes in parallel
    const uniqueCodes = [...new Set(alertTargets.map(t => t.code))];
    const prices = {};

    await Promise.all(uniqueCodes.map(async (code) => {
      try {
        const isUS = /[a-zA-Z]/.test(code);
        const url = isUS 
          ? `https://api.stock.naver.com/stock/${code}/basic`
          : `https://m.stock.naver.com/api/stock/${code}/basic`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': isUS ? 'https://m.stock.naver.com/' : `https://m.stock.naver.com/domestic/stock/${code}`
          }
        });

        if (response.ok) {
          const resData = await response.json();
          const price = parseFloat(resData.closePrice.replace(/,/g, '')) || 0;
          prices[code] = {
            price,
            name: resData.stockName,
            fluctuationsRatio: parseFloat(resData.fluctuationsRatio) || 0,
            compareToPreviousClosePrice: resData.compareToPreviousClosePrice,
            compareToPreviousPrice: resData.compareToPreviousPrice?.name || 'EVEN',
            marketStatus: resData.marketStatus || 'CLOSE'
          };
        }
      } catch (err) {
        console.warn(`Background price alert checker failed to fetch price for ${code}:`, err.message);
      }
    }));

    // Fetch index fluctuation ratios (KOSPI & NASDAQ) for relative drop checks
    let kospiRatio = null;
    let nasdaqRatio = null;

    try {
      const kospiRes = await fetch('https://m.stock.naver.com/api/index/KOSPI/basic', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (kospiRes.ok) {
        const kospiData = await kospiRes.json();
        const rawRatio = parseFloat(kospiData.fluctuationsRatio) || 0;
        const isDown = kospiData.compareToPreviousPrice?.name === 'FALLING';
        kospiRatio = isDown ? -Math.abs(rawRatio) : Math.abs(rawRatio);
      }
    } catch (err) {
      console.warn("Failed to fetch KOSPI index for relative alert:", err.message);
    }

    try {
      const nasdaqRes = await fetch('https://api.stock.naver.com/index/.IXIC/basic', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (nasdaqRes.ok) {
        const nasdaqData = await nasdaqRes.json();
        const rawRatio = parseFloat(nasdaqData.fluctuationsRatio) || 0;
        const isDown = nasdaqData.compareToPreviousPrice?.name === 'FALLING';
        nasdaqRatio = isDown ? -Math.abs(rawRatio) : Math.abs(rawRatio);
      }
    } catch (err) {
      console.warn("Failed to fetch NASDAQ index for relative alert:", err.message);
    }

    // 3) Group targets by file path to prevent write collisions
    const groupedTargets = {};
    alertTargets.forEach(target => {
      if (!groupedTargets[target.filePath]) {
        groupedTargets[target.filePath] = {
          data: target.data,
          targets: []
        };
      }
      groupedTargets[target.filePath].targets.push(target);
    });

    const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 4) Evaluate ceiling/floor triggers + daily spikes/drops and save state
    for (const filePath of Object.keys(groupedTargets)) {
      const { data, targets } = groupedTargets[filePath];
      let fileModified = false;

      for (const target of targets) {
        const { code, token, chatId } = target;
        const stock = data.stocks[code];
        const quote = prices[code];
        if (!quote) continue;

        // Skip evaluation if the market is closed (e.g. midnight transitions, weekends, holidays)
        const isClosed = quote.marketStatus === 'CLOSE' || quote.marketStatus === 'HOLIDAY' || quote.marketStatus === 'STOP';
        if (isClosed) {
          continue;
        }

        const currentPrice = quote.price;
        const ceiling = parseFloat(stock.alertCeiling);
        const floor = parseFloat(stock.alertFloor);
        const ratio = quote.fluctuationsRatio;

        // A. Custom Target Price Alerts
        if (ceiling && currentPrice >= ceiling) {
          if (stock.lastAlertDate !== todayStr || stock.lastAlertType !== 'CEILING') {
            console.log(`[TARGET CEILING TRIGGERED] ${stock.name} (${code}): Price ${currentPrice} >= ${ceiling}`);
            const success = await sendTelegramPush(token, chatId, stock, currentPrice, 'CEILING', ceiling, quote);
            if (success) {
              stock.lastAlertDate = todayStr;
              stock.lastAlertType = 'CEILING';
              fileModified = true;
            }
          }
        } else if (floor && currentPrice <= floor) {
          if (stock.lastAlertDate !== todayStr || stock.lastAlertType !== 'FLOOR') {
            console.log(`[TARGET FLOOR TRIGGERED] ${stock.name} (${code}): Price ${currentPrice} <= ${floor}`);
            const success = await sendTelegramPush(token, chatId, stock, currentPrice, 'FLOOR', floor, quote);
            if (success) {
              stock.lastAlertDate = todayStr;
              stock.lastAlertType = 'FLOOR';
              fileModified = true;
            }
          }
        } else {
          // Inside normal range, reset alert state if previously triggered
          if (stock.lastAlertType) {
            console.log(`[ALERT STATE RESET] ${stock.name} (${code}) returned to normal range: ${currentPrice}. Resetting triggers.`);
            delete stock.lastAlertDate;
            delete stock.lastAlertType;
            fileModified = true;
          }
        }

        // B. Sharp Spike / Drop Alerts (Fluctuations >= 5.0% or <= -5.0%)
        if (ratio >= 5.0) {
          if (stock.lastSpikeAlertDate !== todayStr || stock.lastSpikeAlertType !== 'SPIKE') {
            console.log(`[SPIKE DETECTED] ${stock.name} (${code}): Fluctuation ${ratio}% >= +5.0%`);
            const success = await sendTelegramSpikePush(token, chatId, stock, currentPrice, 'SPIKE', ratio, quote);
            if (success) {
              stock.lastSpikeAlertDate = todayStr;
              stock.lastSpikeAlertType = 'SPIKE';
              fileModified = true;
            }
          }
        } else if (ratio <= -5.0) {
          if (stock.lastSpikeAlertDate !== todayStr || stock.lastSpikeAlertType !== 'DROP') {
            console.log(`[DROP DETECTED] ${stock.name} (${code}): Fluctuation ${ratio}% <= -5.0%`);
            const success = await sendTelegramSpikePush(token, chatId, stock, currentPrice, 'DROP', ratio, quote);
            if (success) {
              stock.lastSpikeAlertDate = todayStr;
              stock.lastSpikeAlertType = 'DROP';
              fileModified = true;
            }
          }
        } else {
          // Inside normal fluctuations, reset spike alert state if previously triggered
          if (stock.lastSpikeAlertType) {
            console.log(`[SPIKE STATE RESET] ${stock.name} (${code}) returned to normal fluctuation range: ${ratio}%. Resetting triggers.`);
            delete stock.lastSpikeAlertDate;
            delete stock.lastSpikeAlertType;
            fileModified = true;
          }
        }

        // C. Index-Relative Drop Alerts
        const relativeThreshold = parseFloat(stock.alertRelativeDrop);
        if (relativeThreshold && relativeThreshold > 0) {
          const isStockUS = /[a-zA-Z]/.test(code);
          const indexRatio = isStockUS ? nasdaqRatio : kospiRatio;
          if (indexRatio !== null) {
            const isStockDown = quote.compareToPreviousPrice === 'FALLING';
            const stockRatioSigned = isStockDown ? -Math.abs(quote.fluctuationsRatio) : Math.abs(quote.fluctuationsRatio);

            if (stockRatioSigned < 0) {
              const stockDropVal = Math.abs(stockRatioSigned);
              const indexDropVal = indexRatio < 0 ? Math.abs(indexRatio) : -indexRatio;
              const diff = stockDropVal - indexDropVal;

              if (diff >= relativeThreshold) {
                if (stock.lastRelativeDropAlertDate !== todayStr) {
                  console.log(`[RELATIVE DROP TRIGGERED] ${stock.name} (${code}): Stock fell ${stockDropVal.toFixed(2)}% vs Index ${indexDropVal >= 0 ? '-' : '+'}${Math.abs(indexDropVal).toFixed(2)}% (Diff: ${diff.toFixed(2)}% >= Threshold: ${relativeThreshold}%)`);
                  const success = await sendTelegramRelativeDropPush(token, chatId, stock, currentPrice, stockRatioSigned, indexRatio, diff, relativeThreshold, isStockUS);
                  if (success) {
                    stock.lastRelativeDropAlertDate = todayStr;
                    fileModified = true;
                  }
                }
              }
            } else {
              // Stock is not dropping, reset alert state so it can trigger if it drops later
              if (stock.lastRelativeDropAlertDate) {
                delete stock.lastRelativeDropAlertDate;
                fileModified = true;
              }
            }
          }
        }
      }

      if (fileModified) {
        try {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (saveErr) {
          console.error(`Error saving alert state to ${filePath}:`, saveErr);
        }
      }
    }
  } catch (err) {
    console.error("Error in background alert monitor job:", err);
  }
}

// Send Telegram Message push helper
async function sendTelegramPush(token, chatId, stock, currentPrice, direction, targetPrice, quote) {
  try {
    const isUS = /[a-zA-Z]/.test(stock.code);
    const priceFormatted = isUS ? `$${currentPrice.toFixed(2)}` : `${currentPrice.toLocaleString('ko-KR')}원`;
    const targetFormatted = isUS ? `$${targetPrice.toFixed(2)}` : `${targetPrice.toLocaleString('ko-KR')}원`;
    
    const emoji = direction === 'CEILING' ? '🔥 <b>[K-Stock] 지정 상한가 도달 알림</b> 🔥' : '📉 <b>[K-Stock] 지정 하한가 도달 알림</b> 📉';
    const trendEmoji = direction === 'CEILING' ? '📈' : '📉';
    const profitSign = quote.fluctuationsRatio >= 0 ? '+' : '';
    
    const message = `${emoji}\n\n` +
                    `<b>종목명:</b> ${stock.name} (${stock.code})\n` +
                    `<b>현재가:</b> ${priceFormatted} (${profitSign}${quote.fluctuationsRatio.toFixed(2)}%)\n` +
                    `<b>지정 목표가:</b> ${targetFormatted} (${direction === 'CEILING' ? '이상' : '이하'})\n\n` +
                    `${trendEmoji} <b>K-Stock Insight</b> 실시간 지정 알림 서비스`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const resData = await response.json();
    return response.ok && resData.ok;
  } catch (err) {
    console.error(`Error in sendTelegramPush for ${stock.name}:`, err);
    return false;
  }
}

// Send Telegram Spike/Drop Push Helper
async function sendTelegramSpikePush(token, chatId, stock, currentPrice, type, ratio, quote) {
  try {
    const isUS = /[a-zA-Z]/.test(stock.code);
    const priceFormatted = isUS ? `$${currentPrice.toFixed(2)}` : `${currentPrice.toLocaleString('ko-KR')}원`;
    
    const emoji = type === 'SPIKE' ? '🔥 <b>[K-Stock] 당일 급등 감지 알림</b> 🔥' : '📉 <b>[K-Stock] 당일 급락 감지 알림</b> 📉';
    const trendEmoji = type === 'SPIKE' ? '📈' : '📉';
    const indicator = type === 'SPIKE' ? '급등' : '급락';
    const profitSign = ratio >= 0 ? '+' : '';
    
    const message = `${emoji}\n\n` +
                    `<b>종목명:</b> ${stock.name} (${stock.code})\n` +
                    `<b>현재가:</b> ${priceFormatted}\n` +
                    `<b>오늘의 변동률:</b> ${profitSign}${ratio.toFixed(2)}% (${indicator} 감지!)\n\n` +
                    `${trendEmoji} <b>K-Stock Insight</b> 실시간 시세 급등락 알림 서비스`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const resData = await response.json();
    return response.ok && resData.ok;
  } catch (err) {
    console.error(`Error in sendTelegramSpikePush for ${stock.name}:`, err);
    return false;
  }
}

// Send Telegram Relative Drop Push Helper
async function sendTelegramRelativeDropPush(token, chatId, stock, currentPrice, stockRatio, indexRatio, diff, threshold, isUS) {
  try {
    const isStockUS = /[a-zA-Z]/.test(stock.code);
    const priceFormatted = isStockUS ? `$${currentPrice.toFixed(2)}` : `${currentPrice.toLocaleString('ko-KR')}원`;
    
    const indexName = isUS ? 'NASDAQ' : 'KOSPI';
    
    const stockSign = stockRatio >= 0 ? '+' : '';
    const indexSign = indexRatio >= 0 ? '+' : '';
    
    const message = `⚠️ <b>[K-Stock] 지수 대비 초과 하락 감지</b> ⚠️\n\n` +
                    `<b>종목명:</b> ${stock.name} (${stock.code})\n` +
                    `<b>현재가:</b> ${priceFormatted}\n` +
                    `<b>종목 변동률:</b> ${stockSign}${stockRatio.toFixed(2)}%\n` +
                    `<b>${indexName} 지수 변동률:</b> ${indexSign}${indexRatio.toFixed(2)}%\n` +
                    `<b>상대적 추가 하락:</b> ${diff.toFixed(2)}% (설정기준: ${threshold.toFixed(1)}% 이상)\n\n` +
                    `📉 <b>K-Stock Insight</b> 지수 비교 감시 서비스`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const resData = await response.json();
    return response.ok && resData.ok;
  } catch (err) {
    console.error(`Error in sendTelegramRelativeDropPush for ${stock.name}:`, err);
    return false;
  }
}

// Start Background Price Target Alert Monitoring (checks every 60 seconds)
setInterval(runBackgroundAlertMonitor, 60000);
// Trigger once immediately on startup with a brief delay
setTimeout(runBackgroundAlertMonitor, 5000);

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` K-Stock Analyzer server is running on port ${PORT}`);
  console.log(` Press Ctrl+C to terminate the local server.`);
  console.log(`====================================================`);
});
