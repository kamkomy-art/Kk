import { useState } from "react";
import Watchlist from "./components/Watchlist.jsx";
import SearchBar from "./components/SearchBar.jsx";
import AnalysisPanel from "./components/AnalysisPanel.jsx";
import Chat from "./components/Chat.jsx";

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>تحليل</h1>
        <p style={styles.subtitle}>تحليل فني للعملات الرقمية بالذكاء الاصطناعي — القرار النهائي دائمًا لك</p>
      </header>

      <main style={styles.layout}>
        <section style={styles.sidebar}>
          <SearchBar onSelect={setSelectedSymbol} />
          <Watchlist selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} />
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
  content: {
    flex: "2 1 480px",
    minWidth: 320,
    backgroundColor: "#0d1017",
    border: "1px solid #1e2330",
    borderRadius: 14,
    padding: 20,
  },
};
