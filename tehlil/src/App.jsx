import { useCallback, useState } from "react";
import Watchlist from "./components/Watchlist.jsx";
import SearchBar from "./components/SearchBar.jsx";
import AnalysisPanel from "./components/AnalysisPanel.jsx";
import Chat from "./components/Chat.jsx";
import ToastStack from "./components/ToastStack.jsx";

const TOAST_TTL_MS = 8000;

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div style={styles.page}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <header style={styles.header}>
        <h1 style={styles.title}>تحليل</h1>
        <p style={styles.subtitle}>تحليل فني للعملات الرقمية بالذكاء الاصطناعي — القرار النهائي دائمًا لك</p>
      </header>

      <main style={styles.layout}>
        <section style={styles.sidebar}>
          <SearchBar onSelect={setSelectedSymbol} />
          <p style={styles.alertHint}>اضغط 🔔 على أي عملة لتفعيل تنبيه عند تشبع شرائي/بيعي أو تقاطع MACD.</p>
          <Watchlist selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} onAlert={addToast} />
        </section>

        <section style={styles.content}>
          <AnalysisPanel symbol={selectedSymbol} />
          <Chat />
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    maxWidth: 1100,
    margin: "0 auto",
    padding: 20,
    boxSizing: "border-box",
  },
  header: {
    borderBottom: "1px solid #1e2330",
    paddingBottom: 14,
    marginBottom: 20,
  },
  title: { margin: 0, fontSize: 24, color: "#f5f5f5" },
  subtitle: { margin: "4px 0 0", fontSize: 13, color: "#7a8194" },
  layout: {
    display: "flex",
    gap: 24,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  sidebar: {
    flex: "1 1 260px",
    minWidth: 260,
  },
  alertHint: {
    fontSize: 11,
    color: "#7a8194",
    margin: "0 0 10px",
    lineHeight: 1.5,
  },
  content: {
    flex: "2 1 480px",
    minWidth: 320,
    backgroundColor: "#0d1017",
    border: "1px solid #1e2330",
    borderRadius: 14,
    padding: 20,
  },
};
