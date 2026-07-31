import { useEffect, useState } from "react";
import { analyzeSymbol } from "../api/client.js";
import CandleChart from "./CandleChart.jsx";

const TIMEFRAMES = [
  { value: "1h", label: "1 ساعة" },
  { value: "4h", label: "4 ساعات" },
  { value: "1d", label: "يومي" },
];

export default function AnalysisPanel({ symbol }) {
  const [interval, setInterval_] = useState("4h");
  const [state, setState] = useState({ loading: false, data: null, error: null });

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });

    analyzeSymbol(symbol, interval)
      .then((data) => {
        if (!cancelled) setState({ loading: false, data, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, data: err.partial ?? null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, interval]);

  if (!symbol) {
    return <p style={styles.hint}>اختر عملة من قائمة المتابعة أو ابحث عنها لعرض التحليل الفني.</p>;
  }

  const { data, error } = state;
  const indicators = data?.indicators;
  const chart = data?.chartData;

  return (
    <div>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>{symbol}</h2>
        <div style={styles.timeframes}>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setInterval_(tf.value)}
              style={{
                ...styles.tfButton,
                ...(interval === tf.value ? styles.tfButtonActive : {}),
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {state.loading && <p style={styles.hint}>جارٍ تحليل {symbol}…</p>}
      {error && <p style={styles.error}>⚠️ {error}</p>}

      {data && (
        <div style={styles.priceRow}>
          <span style={styles.price}>{data.price}</span>
          <span style={{ color: data.changePercent >= 0 ? "#3fb950" : "#f85149", fontWeight: 600 }}>
            {data.changePercent >= 0 ? "▲" : "▼"} {Math.abs(data.changePercent).toFixed(2)}٪ (24 س)
          </span>
        </div>
      )}

      {chart?.candles?.length > 0 && (
        <>
          <CandleChart
            candles={chart.candles}
            ema20={chart.ema20}
            ema50={chart.ema50}
            bollinger={chart.bollinger}
            supportResistance={chart.supportResistance}
          />
          <div style={styles.legend}>
            <LegendDot color="#3fb950" label="شمعة صاعدة" />
            <LegendDot color="#f85149" label="شمعة هابطة" />
            <LegendDot color="#58a6ff" label="EMA20" />
            <LegendDot color="#e3b341" label="EMA50" />
            <LegendDot color="#6e40c9" label="بولينجر باند" />
          </div>
        </>
      )}

      {chart?.supportResistance?.length > 0 && (
        <div style={styles.srRow}>
          {chart.supportResistance.map((lvl) => (
            <span
              key={`${lvl.type}-${lvl.price}`}
              style={{ ...styles.srBadge, color: lvl.type === "resistance" ? "#f85149" : "#3fb950" }}
            >
              {lvl.type === "resistance" ? "مقاومة" : "دعم"}: {lvl.price}
            </span>
          ))}
        </div>
      )}

      {indicators && (
        <div style={styles.grid}>
          <IndicatorCard label="RSI (14)" value={indicators.rsi} status={indicators.rsiStatus} />
          <IndicatorCard label="الاتجاه" status={indicators.trend} />
          <IndicatorCard label="MACD" value={indicators.macd} status={indicators.macdStatus} />
          <IndicatorCard
            label="بولينجر باند"
            status={`${indicators.bollinger.position} (${indicators.bollinger.lower} – ${indicators.bollinger.upper})`}
          />
          <IndicatorCard label="EMA20 / EMA50" value={`${indicators.ema20} / ${indicators.ema50}`} />
          <IndicatorCard label="SMA200" value={indicators.sma200} />
        </div>
      )}

      {data?.analysis && (
        <div style={styles.analysisBox}>
          <h3 style={styles.analysisTitle}>تحليل Claude</h3>
          <p style={styles.analysisText}>{data.analysis}</p>
        </div>
      )}

      {indicators && (
        <p style={styles.disclaimer}>
          ⚠️ هذا تحليل معلوماتي آلي وليس نصيحة استثمارية. القرار النهائي بالشراء أو البيع يعود إليك وحدك.
        </p>
      )}
    </div>
  );
}

function IndicatorCard({ label, value, status }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      {value != null && <div style={styles.cardValue}>{value}</div>}
      {status && <div style={styles.cardStatus}>{status}</div>}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={styles.legendItem}>
      <span style={{ ...styles.legendSwatch, backgroundColor: color }} />
      {label}
    </span>
  );
}

const styles = {
  hint: { color: "#7a8194" },
  error: { color: "#f85149", marginBottom: 8 },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  title: { margin: 0, fontSize: 20, color: "#f5f5f5" },
  timeframes: { display: "flex", gap: 6 },
  tfButton: {
    padding: "5px 12px",
    borderRadius: 6,
    border: "1px solid #262c3b",
    backgroundColor: "#0f131c",
    color: "#9aa4b8",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  tfButtonActive: {
    border: "1px solid #1f6feb",
    backgroundColor: "#132038",
    color: "#e6e6e6",
  },
  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 16,
  },
  price: { fontSize: 26, fontWeight: 700 },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 14,
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    color: "#9aa4b8",
  },
  legendSwatch: {
    display: "inline-block",
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  srRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  srBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 999,
    backgroundColor: "#0f131c",
    border: "1px solid #262c3b",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 10,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#0f131c",
    border: "1px solid #262c3b",
    borderRadius: 10,
    padding: 12,
  },
  cardLabel: { fontSize: 12, color: "#9aa4b8", marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: 600 },
  cardStatus: { fontSize: 12, color: "#c9d1e0", marginTop: 4 },
  analysisBox: {
    backgroundColor: "#161b22",
    border: "1px solid #262c3b",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  analysisTitle: { margin: "0 0 8px", fontSize: 15, color: "#f5f5f5" },
  analysisText: { margin: 0, lineHeight: 1.8, whiteSpace: "pre-wrap" },
  disclaimer: { color: "#e3b341", fontSize: 13, lineHeight: 1.6 },
};
