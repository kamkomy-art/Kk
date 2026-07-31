export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div style={styles.stack}>
      {toasts.map((t) => (
        <div key={t.id} style={styles.toast}>
          <span style={styles.message}>🔔 {t.message}</span>
          <button style={styles.close} onClick={() => onDismiss(t.id)} aria-label="إغلاق">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  stack: {
    position: "fixed",
    top: 16,
    insetInlineStart: 16,
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxWidth: 320,
  },
  toast: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#161b22",
    border: "1px solid #e3b341",
    borderRadius: 10,
    padding: "10px 12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
    fontSize: 13,
    lineHeight: 1.5,
  },
  message: { color: "#e6e6e6" },
  close: {
    background: "none",
    border: "none",
    color: "#7a8194",
    cursor: "pointer",
    fontSize: 12,
    flexShrink: 0,
  },
};
