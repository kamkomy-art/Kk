const BASE_URL = "https://api.binance.com";
const SYMBOLS_CACHE_TTL_MS = 60 * 60 * 1000; // 1h — exchangeInfo rarely changes

let symbolsCache = { data: null, fetchedAt: 0 };

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Binance ${res.status}: ${body || res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function fetchKlines(symbol, interval = "4h", limit = 210) {
  const url = `${BASE_URL}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`;
  const raw = await getJson(url);
  return raw.map((k) => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

export async function fetch24hrTicker(symbol) {
  const url = `${BASE_URL}/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;
  return getJson(url);
}

async function getUsdtSymbols() {
  const now = Date.now();
  if (symbolsCache.data && now - symbolsCache.fetchedAt < SYMBOLS_CACHE_TTL_MS) {
    return symbolsCache.data;
  }
  const data = await getJson(`${BASE_URL}/api/v3/exchangeInfo`);
  const symbols = data.symbols
    .filter((s) => s.quoteAsset === "USDT" && s.status === "TRADING")
    .map((s) => ({ symbol: s.symbol, baseAsset: s.baseAsset }));
  symbolsCache = { data: symbols, fetchedAt: now };
  return symbols;
}

export async function searchSymbols(query, limit = 20) {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const symbols = await getUsdtSymbols();
  return symbols
    .filter((s) => s.symbol.includes(q) || s.baseAsset.includes(q))
    .slice(0, limit);
}
