async function parseErrorBody(response) {
  try {
    const data = await response.json();
    return data?.error || "حدث خطأ غير متوقع";
  } catch {
    return "حدث خطأ غير متوقع";
  }
}

export async function getWatchlist() {
  const response = await fetch("/api/watchlist");
  if (!response.ok) throw new Error(await parseErrorBody(response));
  return response.json();
}

export async function searchCoins(query) {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(await parseErrorBody(response));
  return response.json();
}

export async function analyzeSymbol(symbol) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error || "فشل التحليل");
    error.partial = data; // قد يحتوي على المؤشرات حتى عند فشل استدعاء Claude
    throw error;
  }
  return data;
}
