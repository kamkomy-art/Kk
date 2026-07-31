import { useRef, useState } from "react";

const MODEL = "claude-opus-5";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const history = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    const assistantIndex = history.length;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          stream: true,
          messages: history,
        }),
      });

      if (!response.ok || !response.body) {
        const errBody = await response.text();
        throw new Error(errBody || "فشل الاتصال بالخادم");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;

          let event;
          try {
            event = JSON.parse(payload);
          } catch {
            continue;
          }

          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            appendToAssistant(assistantIndex, event.delta.text);
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          next[assistantIndex] = {
            role: "assistant",
            content: `⚠️ حدث خطأ: ${err.message}`,
          };
          return next;
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function appendToAssistant(index, chunk) {
    setMessages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], content: next[index].content + chunk };
      return next;
    });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>تحليل</h1>
      </header>

      <main style={styles.chat}>
        {messages.length === 0 && <p style={styles.placeholder}>ابدأ محادثة جديدة…</p>}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              ...styles.bubble,
              ...(m.role === "user" ? styles.userBubble : styles.assistantBubble),
            }}
          >
            {m.content || (loading && i === messages.length - 1 ? "…" : "")}
          </div>
        ))}
      </main>

      <footer style={styles.footer}>
        <textarea
          style={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالتك هنا..."
          rows={2}
          disabled={loading}
        />
        <button style={styles.button} onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? "جارٍ الإرسال..." : "إرسال"}
        </button>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxWidth: 820,
    margin: "0 auto",
    padding: 16,
    boxSizing: "border-box",
  },
  header: {
    borderBottom: "1px solid #1e2330",
    paddingBottom: 12,
    marginBottom: 12,
  },
  title: {
    margin: 0,
    fontSize: 22,
    color: "#f5f5f5",
  },
  chat: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "8px 0",
  },
  placeholder: {
    color: "#7a8194",
    textAlign: "center",
    marginTop: 40,
  },
  bubble: {
    maxWidth: "80%",
    padding: "10px 14px",
    borderRadius: 12,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#1f6feb",
    color: "#fff",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#161b22",
    color: "#e6e6e6",
    border: "1px solid #262c3b",
  },
  footer: {
    display: "flex",
    gap: 8,
    paddingTop: 12,
    borderTop: "1px solid #1e2330",
  },
  textarea: {
    flex: 1,
    resize: "none",
    borderRadius: 8,
    border: "1px solid #262c3b",
    backgroundColor: "#0f131c",
    color: "#e6e6e6",
    padding: "10px 12px",
    fontFamily: "inherit",
    fontSize: 15,
  },
  button: {
    padding: "0 20px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#1f6feb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
};
