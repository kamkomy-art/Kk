# tehlil — CLAUDE.md

مشروع React + Express صغير:

- `server.js`: خادم Express (منفذ 8787) يمرر `POST /api/messages` إلى Anthropic Messages API
  (`https://api.anthropic.com/v1/messages`)، مضيفًا ترويستي `x-api-key` (من `ANTHROPIC_API_KEY`
  في البيئة) و `anthropic-version: 2023-06-01`. عند `stream: true` في جسم الطلب، يُعاد بث
  الاستجابة كـ `text/event-stream` مباشرة من Anthropic إلى العميل عبر `Readable.fromWeb`.
- `vite.config.js`: خادم تطوير React على المنفذ 5173، مع `server.proxy['/api']` إلى
  `http://localhost:8787` حتى تعمل طلبات `/api/*` من الواجهة الأمامية بدون مشاكل CORS.
- `src/App.jsx`: واجهة محادثة تستدعي `/api/messages` مباشرة (النموذج الافتراضي:
  `claude-opus-5`) وتحلل أحداث `content_block_delta` من الاستجابة المتدفقة لعرض النص أولًا بأول.
- المفتاح `ANTHROPIC_API_KEY` يُقرأ فقط من طرف الخادم (`server.js` عبر `dotenv`)؛ لا يصل أبدًا
  إلى كود العميل (`src/`), وهذا مقصود لتجنّب تسريبه في المتصفح.

## أوامر مفيدة

- `npm run dev` — يشغّل `server.js` و`vite` معًا (عبر `concurrently`).
- `npm run build` — يبني حزمة الإنتاج لواجهة React فقط (`vite build`).

## ملاحظات

- `.env` مستثنى من git (`.gitignore`) — لا تضع مفاتيح حقيقية في الكود.
- عند تعديل شكل الطلب/الاستجابة مع Anthropic، حافظ على تمرير `req.body` كما هو من العميل إلى
  `server.js` دون تعديل، حتى تبقى معاملات مثل `model` و`max_tokens` و`messages` قابلة للتحكم من
  الواجهة الأمامية.
