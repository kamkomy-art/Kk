import { useEffect, useRef, useState } from "react";
import { searchCoins } from "../api/client.js";

const DEBOUNCE_MS = 300;

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);

    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchCoins(query);
        setResults(data.items);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  function handlePick(symbol) {
    onSelect(symbol);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div style={styles.wrap}>
      <input
        style={styles.input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="ابحث عن أي عملة… (مثال: DOGE)"
      />
      {open && results.length > 0 && (
        <ul style={styles.dropdown}>
          {results.map((r) => (
            <li key={r.symbol}>
              <button style={styles.option} onMouseDown={() => handlePick(r.symbol)}>
                {r.baseAsset} <span style={styles.dim}>({r.symbol})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles = {
  wrap: { position: "relative", marginBottom: 12 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 8,
    border: "1px solid #262c3b",
    backgroundColor: "#0f131c",
    color: "#e6e6e6",
    padding: "10px 12px",
    fontFamily: "inherit",
    fontSize: 14,
  },
  dropdown: {
    listStyle: "none",
    margin: "4px 0 0",
    padding: 4,
    position: "absolute",
    zIndex: 10,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    backgroundColor: "#161b22",
    border: "1px solid #262c3b",
    borderRadius: 8,
    maxHeight: 220,
    overflowY: "auto",
  },
  option: {
    width: "100%",
    textAlign: "right",
    background: "none",
    border: "none",
    color: "#e6e6e6",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
  },
  dim: { color: "#7a8194" },
};
