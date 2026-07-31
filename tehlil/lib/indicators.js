function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function calculateSMA(values, period) {
  const result = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) result[i] = sum / period;
  }
  return result;
}

export function calculateEMA(values, period) {
  const result = new Array(values.length).fill(null);
  if (values.length < period) return result;

  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  result[period - 1] = seed / period;

  for (let i = period; i < values.length; i++) {
    result[i] = values[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

export function calculateRSI(closes, period = 14) {
  const result = new Array(closes.length).fill(null);
  if (closes.length <= period) return result;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum -= diff;
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

export function calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine = closes.map((_, i) =>
    fastEMA[i] != null && slowEMA[i] != null ? fastEMA[i] - slowEMA[i] : null,
  );

  const macdOnlyValues = macdLine.filter((v) => v != null);
  const offset = closes.length - macdOnlyValues.length;
  const rawSignal = calculateEMA(macdOnlyValues, signalPeriod);

  const signalLine = new Array(closes.length).fill(null);
  for (let i = 0; i < rawSignal.length; i++) {
    if (rawSignal[i] != null) signalLine[offset + i] = rawSignal[i];
  }

  const histogram = macdLine.map((v, i) =>
    v != null && signalLine[i] != null ? v - signalLine[i] : null,
  );

  return { macdLine, signalLine, histogram };
}

export function calculateBollingerBands(closes, period = 20, multiplier = 2) {
  const middle = calculateSMA(closes, period);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    upper[i] = mean + multiplier * stdDev;
    lower[i] = mean - multiplier * stdDev;
  }

  return { upper, middle, lower };
}

/**
 * Reduces a candle series to the latest indicator readings plus
 * human-readable (Arabic) status labels — the shape sent to the UI and to Claude.
 */
export function analyzeCandles(candles) {
  const closes = candles.map((c) => c.close);
  const last = closes.length - 1;

  const rsiSeries = calculateRSI(closes, 14);
  const ema20Series = calculateEMA(closes, 20);
  const ema50Series = calculateEMA(closes, 50);
  const sma200Series = calculateSMA(closes, 200);
  const macd = calculateMACD(closes);
  const bb = calculateBollingerBands(closes, 20, 2);

  const price = closes[last];
  const rsi = rsiSeries[last];
  const ema20 = ema20Series[last];
  const ema50 = ema50Series[last];
  const sma200 = sma200Series[last];
  const macdValue = macd.macdLine[last];
  const macdSignal = macd.signalLine[last];
  const macdHistogram = macd.histogram[last];
  const prevHistogram = macd.histogram[last - 1];
  const bbUpper = bb.upper[last];
  const bbMiddle = bb.middle[last];
  const bbLower = bb.lower[last];

  const rsiStatus =
    rsi == null ? "غير متاح" : rsi >= 70 ? "تشبع شرائي" : rsi <= 30 ? "تشبع بيعي" : "محايد";

  const macdStatus =
    macdHistogram == null || prevHistogram == null
      ? "غير متاح"
      : prevHistogram <= 0 && macdHistogram > 0
        ? "تقاطع صعودي حديث"
        : prevHistogram >= 0 && macdHistogram < 0
          ? "تقاطع هبوطي حديث"
          : macdHistogram > 0
            ? "زخم صعودي"
            : "زخم هبوطي";

  const trend =
    ema20 == null || ema50 == null
      ? "غير متاح"
      : ema20 > ema50
        ? "اتجاه صاعد (EMA20 > EMA50)"
        : "اتجاه هابط (EMA20 < EMA50)";

  const bbPosition =
    bbUpper == null
      ? "غير متاح"
      : price >= bbUpper
        ? "عند/فوق النطاق العلوي"
        : price <= bbLower
          ? "عند/تحت النطاق السفلي"
          : "داخل النطاق";

  return {
    price: round(price, 6),
    rsi: rsi != null ? round(rsi, 2) : null,
    rsiStatus,
    ema20: ema20 != null ? round(ema20, 6) : null,
    ema50: ema50 != null ? round(ema50, 6) : null,
    sma200: sma200 != null ? round(sma200, 6) : null,
    trend,
    macd: macdValue != null ? round(macdValue, 6) : null,
    macdSignal: macdSignal != null ? round(macdSignal, 6) : null,
    macdHistogram: macdHistogram != null ? round(macdHistogram, 6) : null,
    macdStatus,
    bollinger: {
      upper: bbUpper != null ? round(bbUpper, 6) : null,
      middle: bbMiddle != null ? round(bbMiddle, 6) : null,
      lower: bbLower != null ? round(bbLower, 6) : null,
      position: bbPosition,
    },
  };
}
