import "dotenv/config";
import express from "express";
import { Readable } from "node:stream";
import { fetchKlines, fetch24hrTicker, searchSymbols } from "./lib/binance.js";
import { analyzeCandles, buildChartData } from "./lib/indicators.js";

const PORT = 8787;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const ANALYSIS_MODEL = "claude-opus-5";

// عملات المتابعة الافتراضية — أزواج USDT الأكثر تداولًا
const WATCHLIST = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];
const WATCHLIST_CACHE_TTL_MS = 20_000;
let watchlistCache = { data: null, fetchedAt: 0 };

const ALLOWED_INTERVALS = new Set(["1h", "4h", "1d"]);
const DEFAULT_INTERVAL = "4h";

const app = express();
app.use(express.json({ limit: "25mb" }));

function getApiKey(res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY غير معرف في متغيرات البيئة (.env)" });
    return null;
  }
  return apiKey;
}

// ---------------------------------------------------------------------------
// دردشة حرة مع Claude (تُستخدم لأسئلة المتابعة العامة) — proxy مباشر مع دعم البث
// ---------------------------------------------------------------------------
app.post("/api/messages", async (req, res) => {
  const apiKey = getApiKey(res);
  if (!apiKey) return;

  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(req.body),
    });
  } catch (err) {
    console.error("فشل الاتصال بـ Anthropic API:", err);
    res.status(502).json({ error: "تعذّر الاتصال بواجهة Anthropic API" });
    return;
  }

  if (req.body?.stream) {
    res.status(upstream.status);
    res.setHeader("content-type", "text/event-stream");
    res.setHeader("cache-control", "no-cache");
    res.setHeader("connection", "keep-alive");

    if (!upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body).pipe(res);
    return;
  }

  const data = await upstream.json();
  res.status(upstream.status).json(data);
});

// ---------------------------------------------------------------------------
// لوحة المتابعة: سعر + مؤشر سريع لكل عملة في القائمة الثابتة
// ---------------------------------------------------------------------------
app.get("/api/watchlist", async (_req, res) => {
  const now = Date.now();
  if (watchlistCache.data && now - watchlistCache.fetchedAt < WATCHLIST_CACHE_TTL_MS) {
    res.json({ items: watchlistCache.data });
    return;
  }

  try {
    const items = await Promise.all(
      WATCHLIST.map(async (symbol) => {
        const [klines, ticker] = await Promise.all([
          fetchKlines(symbol, "4h", 210),
          fetch24hrTicker(symbol),
        ]);
        const indicators = analyzeCandles(klines);
        return {
          symbol,
          price: indicators.price,
          changePercent: parseFloat(ticker.priceChangePercent),
          rsi: indicators.rsi,
          rsiStatus: indicators.rsiStatus,
          trend: indicators.trend,
          macdStatus: indicators.macdStatus,
        };
      }),
    );
    watchlistCache = { data: items, fetchedAt: now };
    res.json({ items });
  } catch (err) {
    console.error("فشل جلب لوحة المتابعة:", err);
    res.status(502).json({ error: "تعذر جلب بيانات السوق من Binance" });
  }
});

// ---------------------------------------------------------------------------
// بحث حر عن أي عملة USDT على Binance
// ---------------------------------------------------------------------------
app.get("/api/search", async (req, res) => {
  const q = String(req.query.q ?? "");
  try {
    const items = await searchSymbols(q);
    res.json({ items });
  } catch (err) {
    console.error("فشل البحث عن العملات:", err);
    res.status(502).json({ error: "تعذر البحث عن العملات" });
  }
});

// ---------------------------------------------------------------------------
// تحليل عملة محددة: بيانات Binance + مؤشرات محسوبة + تفسير Claude النصي
// ---------------------------------------------------------------------------
app.post("/api/analyze", async (req, res) => {
  const symbol = String(req.body?.symbol ?? "").trim().toUpperCase();
  const interval = ALLOWED_INTERVALS.has(req.body?.interval) ? req.body.interval : DEFAULT_INTERVAL;

  if (!symbol) {
    res.status(400).json({ error: "الرجاء تحديد رمز عملة صالح (مثال: BTCUSDT)" });
    return;
  }

  let klines;
  let ticker;
  try {
    [klines, ticker] = await Promise.all([
      fetchKlines(symbol, interval, 210),
      fetch24hrTicker(symbol),
    ]);
  } catch (err) {
    console.error(`فشل جلب بيانات ${symbol}:`, err);
    res.status(502).json({ error: `تعذر جلب بيانات "${symbol}" من Binance — تأكد من صحة الرمز` });
    return;
  }

  const indicators = analyzeCandles(klines);
  const chartData = buildChartData(klines, { limit: 90 });
  const changePercent = parseFloat(ticker.priceChangePercent);

  const apiKey = getApiKey(res);
  if (!apiKey) return;

  const systemPrompt = [
    "أنت محلل فني للعملات الرقمية. تحصل على مؤشرات فنية محسوبة مسبقًا (أرقام دقيقة، لست أنت من يحسبها) لعملة معيّنة،",
    "ومهمتك تفسيرها بالعربية بشكل واضح ومختصر:",
    "- اشرح ماذا تعني كل إشارة (RSI، MACD، المتوسطات المتحركة، بولينجر باند) بالنسبة لحالة السوق الحالية.",
    "- وضّح إن كانت الإشارات متوافقة (تدعم بعضها) أو متضاربة.",
    "- لا تُصدر توصية مباشرة بالشراء أو البيع — قدّم قراءة محايدة للمعطيات فقط.",
    "- لا تكتب إخلاء مسؤولية أو تحذيرًا في نهاية ردك — الواجهة تعرض ذلك تلقائيًا؛ ركّز فقط على تفسير المؤشرات.",
    "اجعل الرد موجزًا (فقرة إلى فقرتين).",
  ].join("\n");

  const userContent = [
    `حلّل بيانات ${symbol}:`,
    `السعر الحالي: ${indicators.price}`,
    `التغيّر خلال 24 ساعة: ${changePercent}%`,
    `RSI (14): ${indicators.rsi} — ${indicators.rsiStatus}`,
    `EMA20: ${indicators.ema20} | EMA50: ${indicators.ema50} | SMA200: ${indicators.sma200}`,
    `الاتجاه: ${indicators.trend}`,
    `MACD: ${indicators.macd} | خط الإشارة: ${indicators.macdSignal} | الهستوجرام: ${indicators.macdHistogram} — ${indicators.macdStatus}`,
    `بولينجر باند — العلوي: ${indicators.bollinger.upper} / الوسط: ${indicators.bollinger.middle} / السفلي: ${indicators.bollinger.lower} — الموضع: ${indicators.bollinger.position}`,
  ].join("\n");

  try {
    const upstream = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: data?.error?.message || "خطأ من واجهة Anthropic",
        symbol,
        interval,
        price: indicators.price,
        changePercent,
        indicators,
        chartData,
      });
      return;
    }

    const analysis = data.content?.find((b) => b.type === "text")?.text ?? "";

    res.json({
      symbol,
      interval,
      price: indicators.price,
      changePercent,
      indicators,
      chartData,
      analysis,
    });
  } catch (err) {
    console.error("فشل استدعاء Anthropic API:", err);
    res.status(502).json({
      error: "تعذر الاتصال بواجهة Anthropic API",
      symbol,
      interval,
      price: indicators.price,
      changePercent,
      indicators,
      chartData,
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ خادم API يعمل على http://localhost:${PORT}`);
});
