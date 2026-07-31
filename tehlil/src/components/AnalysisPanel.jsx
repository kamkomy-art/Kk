import { useEffect, useState } from "react";
import { analyzeSymbol } from "../api/client.js";

export default function AnalysisPanel({ symbol }) {
  const [state, setState] = useState({ loading: false, data: null, error: null });

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });

    analyzeSymbol(symbol)
      .then((data) => {
        if (!cancelled) setState({ loading: false, data, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, data: err.partial ?? null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (!symbol) {
    return <p style={styles.hint}>اختر عملة من قائمة المتابعة أو ابحث عنها لعرض التحليل الفني.</p>;
  }

  if (state.loading) {
    return <p style={styles.hint}>جارٍ تحليل {symbol}…</p>;
  }

  const { data, error } = state;
  const indicators = data?.indicators;

  return (
    <div>
      <h2 style={styles.title}>{symbol}</h2>

      {error && <p style={styles.error}>⚠️ {error}</p>}

      {data && (
        <div style={styles.priceRow}>
          <span style={styles.price}>{data.price}</span>
          <span style={{ color: data.changePercent >= 0 ? "#3fb950" : "#f85149", fontWeight: 600 }}>
            {data.changePercent >= 0 ? "▲" : "▼"} {Math.abs(data.changePercent).toFixed(2)}٪ (24 س)
          </span>
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

const styles = {
  hint: { color: "#7a8194" },
  error: { color: "#f85149", marginBottom: 8 },
  title: { margin: "0 0 8px", fontSize: 20, color: "#f5f5f5" },
  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 16,
  },
  price: { fontSize: 26, fontWeight: 700 },
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
