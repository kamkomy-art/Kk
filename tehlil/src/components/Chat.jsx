import { useState } from "react";

const MODEL = "claude-opus-5";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const history = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    const assistantIndex = history.length;

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
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
      setMessages((prev) => {
        const next = [...prev];
        next[assistantIndex] = { role: "assistant", content: `⚠️ حدث خطأ: ${err.message}` };
        return next;
      });
    } finally {
      setLoading(false);
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
    <div style={styles.wrap}>
      <h3 style={styles.title}>اسأل Claude</h3>

      <div style={styles.messages}>
        {messages.length === 0 && <p style={styles.placeholder}>اسأل عن أي عملة أو موضوع تداول…</p>}
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
      </div>

      <div style={styles.inputRow}>
        <textarea
          style={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب سؤالك هنا..."
          rows={2}
          disabled={loading}
        />
        <button style={styles.button} onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? "..." : "إرسال"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    borderTop: "1px solid #1e2330",
    paddingTop: 16,
    marginTop: 16,
  },
  title: { margin: "0 0 10px", fontSize: 15, color: "#f5f5f5" },
  messages: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 260,
    overflowY: "auto",
    marginBottom: 10,
  },
  placeholder: { color: "#7a8194", fontSize: 13 },
  bubble: {
    maxWidth: "85%",
    padding: "8px 12px",
    borderRadius: 10,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: 14,
  },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#1f6feb", color: "#fff" },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#161b22",
    color: "#e6e6e6",
    border: "1px solid #262c3b",
  },
  inputRow: { display: "flex", gap: 8 },
  textarea: {
    flex: 1,
    resize: "none",
    borderRadius: 8,
    border: "1px solid #262c3b",
    backgroundColor: "#0f131c",
    color: "#e6e6e6",
    padding: "10px 12px",
    fontFamily: "inherit",
    fontSize: 14,
  },
  button: {
    padding: "0 18px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#1f6feb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
};
