import "dotenv/config";
import express from "express";
import { Readable } from "node:stream";

const PORT = 8787;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const app = express();
app.use(express.json({ limit: "25mb" }));

app.post("/api/messages", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY غير معرف في متغيرات البيئة (.env)" });
    return;
  }

  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(req.body),
    });
  } catch (err) {
    console.error("فشل الاتصال بـ Anthropic API:", err);
    res.status(502).json({ error: "تعذّر الاتصال بواجهة Anthropic API" });
    return;
  }

  if (req.body?.stream) {
    res.status(upstream.status);
    res.setHeader("content-type", "text/event-stream");
    res.setHeader("cache-control", "no-cache");
    res.setHeader("connection", "keep-alive");

    if (!upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body).pipe(res);
    return;
  }

  const data = await upstream.json();
  res.status(upstream.status).json(data);
});

app.listen(PORT, () => {
  console.log(`✅ خادم API يعمل على http://localhost:${PORT}`);
});
