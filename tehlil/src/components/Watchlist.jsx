import { useEffect, useRef, useState } from "react";
import { getWatchlist } from "../api/client.js";
import { ALERTABLE_STATUSES, getWatchedSymbols, toggleWatched } from "../lib/alertStore.js";

const REFRESH_MS = 30_000;

export default function Watchlist({ selectedSymbol, onSelect, onAlert }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watched, setWatched] = useState(() => getWatchedSymbols());
  const prevStatusRef = useRef({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getWatchlist();
        if (cancelled) return;

        checkAlerts(data.items);
        setItems(data.items);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function checkAlerts(nextItems) {
      const currentlyWatched = getWatchedSymbols();
      for (const item of nextItems) {
        if (!currentlyWatched.includes(item.symbol)) continue;

        for (const [field, label] of [
          ["rsiStatus", "RSI"],
          ["macdStatus", "MACD"],
        ]) {
          const status = item[field];
          const prevKey = `${item.symbol}:${field}`;
          const prevStatus = prevStatusRef.current[prevKey];
          prevStatusRef.current[prevKey] = status;

          if (status !== prevStatus && ALERTABLE_STATUSES.has(status)) {
            onAlert?.(`${item.symbol.replace("USDT", "")} — ${label}: ${status}`);
          }
        }
      }
    }

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [onAlert]);

  function handleToggleWatch(e, symbol) {
    e.stopPropagation();
    setWatched(toggleWatched(symbol));
  }

  if (loading) return <p style={styles.hint}>جارٍ تحميل قائمة المتابعة…</p>;
  if (error) return <p style={styles.error}>⚠️ {error}</p>;

  return (
    <div style={styles.grid}>
      {items.map((item) => {
        const isUp = item.changePercent >= 0;
        const isWatchedNow = watched.includes(item.symbol);
        return (
          <button
            key={item.symbol}
            onClick={() => onSelect(item.symbol)}
            style={{
              ...styles.card,
              ...(item.symbol === selectedSymbol ? styles.cardActive : {}),
            }}
          >
            <div style={styles.cardHeader}>
              <span style={styles.symbol}>{item.symbol.replace("USDT", "")}</span>
              <span
                onClick={(e) => handleToggleWatch(e, item.symbol)}
                style={{ ...styles.bell, opacity: isWatchedNow ? 1 : 0.35 }}
                title={isWatchedNow ? "إيقاف تنبيهات هذه العملة" : "تفعيل تنبيهات هذه العملة"}
              >
                {isWatchedNow ? "🔔" : "🔕"}
              </span>
            </div>
            <div style={styles.priceRow}>
              <span style={styles.price}>{item.price}</span>
              <span style={{ ...styles.change, color: isUp ? "#3fb950" : "#f85149" }}>
                {isUp ? "▲" : "▼"} {Math.abs(item.changePercent).toFixed(2)}%
              </span>
            </div>
            <div style={styles.badge}>
              RSI {item.rsi ?? "—"} · {item.rsiStatus}
            </div>
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 10,
  },
  card: {
    textAlign: "right",
    cursor: "pointer",
    backgroundColor: "#0f131c",
    border: "1px solid #262c3b",
    borderRadius: 10,
    padding: 12,
    color: "#e6e6e6",
    fontFamily: "inherit",
  },
  cardActive: {
    border: "1px solid #1f6feb",
    backgroundColor: "#132038",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  symbol: { fontWeight: 700, fontSize: 15 },
  bell: { fontSize: 13, cursor: "pointer" },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  price: { fontSize: 16 },
  change: { fontSize: 12, fontWeight: 600 },
  badge: {
    fontSize: 11,
    color: "#9aa4b8",
  },
  hint: { color: "#7a8194" },
  error: { color: "#f85149" },
};
