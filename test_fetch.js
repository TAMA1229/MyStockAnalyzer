const urls = [
  'https://m.stock.naver.com/api/index/KOSPI/basic',
  'https://api.stock.naver.com/index/.IXIC/basic',
  'https://api.stock.naver.com/stock/NVDA.O/basic',
  'https://api.stock.naver.com/stock/AAPL.O/basic',
  'https://api.stock.naver.com/stock/TSLA.O/basic',
  'https://api.stock.naver.com/stock/MSFT.O/basic'
];

async function test() {
  for (const url of urls) {
    const start = Date.now();
    try {
      console.log(`Fetching ${url}...`);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const end = Date.now();
      console.log(`[${res.status}] Completed in ${((end - start) / 1000).toFixed(2)}s. Length: ${(await res.text()).length}`);
    } catch (err) {
      const end = Date.now();
      console.log(`[ERROR] Failed in ${((end - start) / 1000).toFixed(2)}s: ${err.message}`);
    }
  }
}

test();
