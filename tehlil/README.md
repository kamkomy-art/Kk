# تحليل (tehlil)

تطبيق React بسيط يتواصل مع Claude عبر خادم Express وسيط (proxy) يخفي مفتاح API عن المتصفح.

## البنية

- `server.js` — خادم Express على المنفذ `8787`، يستقبل `POST /api/messages` ويمرره إلى
  `https://api.anthropic.com/v1/messages` مضيفًا ترويستي `x-api-key` و `anthropic-version`.
  يدعم الاستجابة المتدفقة (`stream: true`) عبر `text/event-stream`.
- `vite.config.js` — خادم التطوير على المنفذ `5173` مع تحويل `/api` إلى `http://localhost:8787`.
- `src/App.jsx` — واجهة محادثة عربية (RTL) تستدعي `/api/messages` وتعرض الرد أولًا بأول (streaming).

## التشغيل

1. أنشئ ملف `.env` وضع فيه مفتاحك الحقيقي:

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. ثبّت الاعتماديات:

   ```bash
   npm install
   ```

3. شغّل الخادم وواجهة React معًا:

   ```bash
   npm run dev
   ```

   ثم افتح المتصفح على `http://localhost:5173`.

## البناء للإنتاج

```bash
npm run build
```

يُنتج ملفات الواجهة في `dist/`. لتشغيلها في الإنتاج تحتاج لتشغيل `server.js` بجانب خادم يقدّم
الملفات الساكنة (أو دمجه مع `express.static`).
