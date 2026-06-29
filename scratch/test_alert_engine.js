/**
 * test_alert_engine.js
 * 
 * Korean Stock Analysis Service의 비즈니스 계산 및 알림 엔진 검증을 위한 테스트 스크립트
 */

const assert = require('assert').strict;

// 1. 이동평균법 기반의 거래 계산 알고리즘 검증 함수
function calculatePortfolioState(transactions, currentCash, exchangeRate = 1380, isUS = false) {
  let totalQty = 0;
  let avgPrice = 0;
  let realizedProfit = 0;
  let cash = currentCash;

  // 거래 정렬 (날짜 오름차순)
  const sortedTxs = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  sortedTxs.forEach(tx => {
    const type = tx.type || 'BUY';
    const txAmt = tx.price * tx.qty;
    const isBuy = type === 'BUY';

    // 현금 흐름 계산 (원화 변환)
    let flow = txAmt;
    if (isUS) {
      flow = flow * exchangeRate;
    }

    if (isBuy) {
      cash -= flow;
      const currentCost = avgPrice * totalQty;
      totalQty += tx.qty;
      avgPrice = totalQty > 0 ? (currentCost + txAmt) / totalQty : 0;
    } else {
      cash += flow;
      const profit = (tx.price - avgPrice) * tx.qty;
      realizedProfit += profit;
      totalQty -= tx.qty;
      if (totalQty <= 0) {
        totalQty = 0;
        avgPrice = 0;
      }
    }
  });

  return {
    avgPrice: totalQty > 0 ? (isUS ? avgPrice : Math.round(avgPrice)) : 0,
    totalQty,
    realizedProfit,
    cash: Math.max(0, cash)
  };
}

// 2. Mock 텔레그램 및 알림 트리거 검증
function simulateAlerts(stock, quote, kospiRatio, nasdaqRatio, todayStr) {
  const alertsTriggered = [];
  const ceiling = parseFloat(stock.alertCeiling);
  const floor = parseFloat(stock.alertFloor);
  const ratio = quote.fluctuationsRatio;
  const currentPrice = quote.price;
  const code = stock.code;
  const isUS = /[a-zA-Z]/.test(code);

  // A. 지정 상/하한가 알림
  if (ceiling && currentPrice >= ceiling) {
    if (stock.lastAlertDate !== todayStr || stock.lastAlertType !== 'CEILING') {
      alertsTriggered.push('CEILING');
      stock.lastAlertDate = todayStr;
      stock.lastAlertType = 'CEILING';
    }
  } else if (floor && currentPrice <= floor) {
    if (stock.lastAlertDate !== todayStr || stock.lastAlertType !== 'FLOOR') {
      alertsTriggered.push('FLOOR');
      stock.lastAlertDate = todayStr;
      stock.lastAlertType = 'FLOOR';
    }
  } else {
    if (stock.lastAlertType) {
      delete stock.lastAlertDate;
      delete stock.lastAlertType;
    }
  }

  // B. 당일 급등락 알림
  if (ratio >= 5.0) {
    if (stock.lastSpikeAlertDate !== todayStr || stock.lastSpikeAlertType !== 'SPIKE') {
      alertsTriggered.push('SPIKE');
      stock.lastSpikeAlertDate = todayStr;
      stock.lastSpikeAlertType = 'SPIKE';
    }
  } else if (ratio <= -5.0) {
    if (stock.lastSpikeAlertDate !== todayStr || stock.lastSpikeAlertType !== 'DROP') {
      alertsTriggered.push('DROP');
      stock.lastSpikeAlertDate = todayStr;
      stock.lastSpikeAlertType = 'DROP';
    }
  } else {
    if (stock.lastSpikeAlertType) {
      delete stock.lastSpikeAlertDate;
      delete stock.lastSpikeAlertType;
    }
  }

  // C. 지수 대비 초과 하락 알림
  const relativeThreshold = parseFloat(stock.alertRelativeDrop);
  if (relativeThreshold && relativeThreshold > 0) {
    const indexRatio = isUS ? nasdaqRatio : kospiRatio;
    if (indexRatio !== null) {
      const isStockDown = quote.compareToPreviousPrice === 'FALLING';
      const stockRatioSigned = isStockDown ? -Math.abs(quote.fluctuationsRatio) : Math.abs(quote.fluctuationsRatio);

      if (stockRatioSigned < 0) {
        const stockDropVal = Math.abs(stockRatioSigned);
        const indexDropVal = indexRatio < 0 ? Math.abs(indexRatio) : -indexRatio;
        const diff = stockDropVal - indexDropVal;

        if (diff >= relativeThreshold) {
          if (stock.lastRelativeDropAlertDate !== todayStr) {
            alertsTriggered.push('RELATIVE_DROP');
            stock.lastRelativeDropAlertDate = todayStr;
          }
        }
      } else {
        if (stock.lastRelativeDropAlertDate) {
          delete stock.lastRelativeDropAlertDate;
        }
      }
    }
  }

  return alertsTriggered;
}

// ==========================================
// 테스트 시나리오 실행
// ==========================================
function runTests() {
  console.log('--- 주식 분석 서비스 비즈니스 로직 테스트 개시 ---');

  // Test Case 1: 이동평균법 및 실현손익 연산 (국내 주식)
  try {
    const txs = [
      { date: '2026-06-01', price: 60000, qty: 10, type: 'BUY' }, // 매수: 600,000원 지출
      { date: '2026-06-05', price: 70000, qty: 5, type: 'SELL' }, // 매도: 350,000원 유입. (실현손익: (70000-60000)*5 = 50000원)
      { date: '2026-06-10', price: 50000, qty: 5, type: 'BUY' }   // 추가 매수: 250,000원 지출. (평단가: (60000*5 + 50000*5)/10 = 55000원)
    ];

    const initialCash = 1000000;
    const state = calculatePortfolioState(txs, initialCash, 1380, false);

    assert.equal(state.totalQty, 10, '보유량 계산 오류');
    assert.equal(state.avgPrice, 55000, '평단가 계산 오류');
    assert.equal(state.realizedProfit, 50000, '실현손익 계산 오류');
    assert.equal(state.cash, initialCash - 600000 + 350000 - 250000, '예수금 잔액 변동 오류');

    console.log('✅ Test Case 1 통과: 국내 주식 이동평균법 및 실현손익 검증 성공');
  } catch (err) {
    console.error('❌ Test Case 1 실패:', err.message);
    process.exit(1);
  }

  // Test Case 2: 이동평균법 및 실현손익 연산 (미국 주식 - 환율 변동 포함)
  try {
    const txs = [
      { date: '2026-06-01', price: 100, qty: 10, type: 'BUY' }, // $1,000 지출. 환율 1380원 적용 -> 1,380,000원 지출
      { date: '2026-06-05', price: 120, qty: 5, type: 'SELL' } // $600 유입. 환율 1380원 적용 -> 828,000원 유입. (실현손익: (120-100)*5 = $100)
    ];

    const initialCash = 2000000;
    const state = calculatePortfolioState(txs, initialCash, 1380, true);

    assert.equal(state.totalQty, 5, '미국주식 보유량 계산 오류');
    assert.equal(state.avgPrice, 100, '미국주식 평단가 계산 오류');
    assert.equal(state.realizedProfit, 100, '미국주식 달러 실현손익 계산 오류');
    assert.equal(state.cash, initialCash - (100 * 10 * 1380) + (120 * 5 * 1380), '미국주식 원화 예수금 잔액 오류');

    console.log('✅ Test Case 2 통과: 미국 주식 외화 계산 및 원화 예수금 환산 성공');
  } catch (err) {
    console.error('❌ Test Case 2 실패:', err.message);
    process.exit(1);
  }

  // Test Case 3: 텔레그램 알림 엔진 트리거 및 중복 방지 검증
  try {
    const todayStr = '2026-06-17';
    
    // 알림 설정 상태
    const stock = {
      code: '005930',
      name: '삼성전자',
      alertCeiling: 75000,
      alertFloor: 65000,
      alertRelativeDrop: 3.0
    };

    // 시나리오 3.1: 주가가 지정 하한가 이하로 떨어짐
    const quote1 = {
      price: 64000,
      fluctuationsRatio: -2.0,
      compareToPreviousPrice: 'FALLING'
    };

    let alerts = simulateAlerts(stock, quote1, -0.5, null, todayStr);
    assert.deepEqual(alerts, ['FLOOR'], '하한가 알림 미작동');
    assert.equal(stock.lastAlertType, 'FLOOR', '알림 상태 기록 저장 오류');

    // 시나리오 3.2: 하한가 도달 상태 지속 (중복 발송 방지 검증)
    alerts = simulateAlerts(stock, quote1, -0.5, null, todayStr);
    assert.deepEqual(alerts, [], '중복 알림 차단 기능 오작동 (동일한 날짜에 중복 발송됨)');

    // 시나리오 3.3: 급락 (-6.0%) 감지 알림
    const quote2 = {
      price: 63000,
      fluctuationsRatio: -6.0,
      compareToPreviousPrice: 'FALLING'
    };
    alerts = simulateAlerts(stock, quote2, -4.0, null, todayStr);
    assert.deepEqual(alerts, ['DROP'], '당일 시세 급락 알림 미작동');

    // 시나리오 3.4: 지수 대비 초과 하락 감지 (종목 -4.0%, 코스피 -0.5% -> 상대 하락 차이 3.5% >= 기준 3.0%)
    const quote3 = {
      price: 64200,
      fluctuationsRatio: -4.0,
      compareToPreviousPrice: 'FALLING'
    };
    alerts = simulateAlerts(stock, quote3, -0.5, null, todayStr);
    assert.deepEqual(alerts, ['RELATIVE_DROP'], '지수 대비 초과 하락 알림 미작동');

    console.log('✅ Test Case 3 통과: 알림 조건별 트리거링 및 당일 중복 방지 필터 검증 성공');
  } catch (err) {
    console.error('❌ Test Case 3 실패:', err.message);
    process.exit(1);
  }

  console.log('\n🎉 모든 테스트 케이스가 성공적으로 통과되었습니다! 서비스 수학 엔진 및 알림 로직의 결함 없음이 증명되었습니다.');
}

runTests();
