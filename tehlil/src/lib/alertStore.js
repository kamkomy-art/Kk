const STORAGE_KEY = "tehlil.watchedAlerts";

export function getWatchedSymbols() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isWatched(symbol) {
  return getWatchedSymbols().includes(symbol);
}

export function toggleWatched(symbol) {
  const current = getWatchedSymbols();
  const next = current.includes(symbol)
    ? current.filter((s) => s !== symbol)
    : [...current, symbol];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage قد يكون غير متاح (وضع خاص مثلًا) — نتجاهل بصمت
  }
  return next;
}

// حالات المؤشرات التي تستحق تنبيهًا فعليًا (وليست "محايد" أو "زخم" مستمر)
export const ALERTABLE_STATUSES = new Set([
  "تشبع شرائي",
  "تشبع بيعي",
  "تقاطع صعودي حديث",
  "تقاطع هبوطي حديث",
]);
