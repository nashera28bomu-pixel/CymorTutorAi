# Cymor Tutor AI

Your AI Study Partner for Kenyan CBC/CBE learners.

Developer: **Legendary Smiley Cymor**

## What's built (v2 — chat-first rewrite)

- **Chat is home.** Opening the link lands directly in the chat — no landing page, no forced signup.
- **Quick-start instead of accounts.** New learners just give a name and grade (no email/password).
  It's still a real backend account (JWT-based) — just frictionless by default. A "💾 Save my progress"
  option in the sidebar lets anyone later attach an email + password to recover their history on another
  device, without losing anything from their anonymous session.
- **Real conversation history** in a slide-out sidebar — switch between past chats, start new ones,
  delete old ones. Backed by the same `Conversation`/`Message` models as before.
- **Streaming responses** — replies appear token-by-token like ChatGPT/Claude via Server-Sent Events,
  instead of a spinner followed by a wall of text.
- **Structured, visual answers** — the model's labelled sections (🧠 Think of it this way, 🌱 Example,
  🔑 Remember) render as distinct colour-coded callout boxes instead of plain paragraphs. The direct
  answer always comes first; Cymor only greets the learner on the *first* message of a conversation,
  never on every reply.
- **Curriculum tagging** — when a reply draws on real ingested KICD content, the exact subject + grade
  is shown as a tappable chip under the answer (tapping it asks a natural follow-up). If the learner has
  matching uploaded notes, a "📄 you have notes on this →" chip deep-links straight into that Study Room.
- **Practice + marking loop** — Cymor occasionally ends an answer with a "📝 Try this" practice question.
  If the learner's next message is their attempted working, it's automatically routed to a dedicated
  marking prompt that grades it step-by-step, explains mistakes, and advises what to focus on next —
  rather than being treated as a brand new question.
- **Copy button** on every AI response.
- **Splash screen** with a percentage-loader animation and page-opening transition on first open per
  browser tab session.
- Mathematics mode (step-by-step working, checks the learner's own working) — kept exactly as before.
- PDF/TXT upload → chunking → keyword-based retrieval → "Ask My Notes"
- Note summarization, quiz generation, flashcard generation — quizzes/flashcards from a topic are also
  grounded in real KICD content when available (same as before)
- CBC/CBE curriculum (levels → subjects → topics) served from the database, populated from real KICD
  curriculum design documents
- Per-user daily AI/quiz quotas, rate limiting (trust-proxy aware for Render), file validation
- Mobile-first PWA frontend, vanilla HTML/CSS/JS, no build step, no frontend framework/bundler

### What changed structurally
- `frontend/index.html` is now the chat app itself (previously it was a marketing landing page).
  `pages/login.html`, `register.html`, `onboarding.html`, and `dashboard.html` were removed — their
  functionality is folded into the quick-start flow and sidebar on the home screen.
- Bottom navigation is now **Chat · Notes · Quiz · Progress** (Flashcards remains reachable from Notes'
  Study Room and isn't a separate tab, to keep the nav to four items).
- `POST /api/auth/quick-start` is the new primary entry point. `POST /api/auth/register` /
  `/api/auth/login` still work (for anyone who wants a traditional email account from the start), and
  `POST /api/auth/claim` upgrades an existing anonymous account in place.
- `POST /api/tutor/chat/stream` is a new Server-Sent-Events endpoint alongside the original
  `POST /api/tutor/chat` (still there, non-streaming, e.g. for any future non-browser client).
- `DELETE /api/tutor/conversations/:id` was added for the sidebar's delete action.

## Real curriculum data (KICD), not demo data

`backend/scripts/knowledge-ingestion/ingestKicd.js` is a real scraper/importer that:

1. Fetches the official KICD curriculum design pages (e.g.
   `kicd.ac.ke/cbc-materials/curriculum-designs/grade-four-designs/`, `kicd.ac.ke/cbc-materials/lower-primary/`).
2. Parses each page for its subject headings and the Google Drive-hosted curriculum design PDFs KICD
   links under each one (these are official, free, no-login documents - see `kicd.ac.ke/cbc-materials/`).
3. Downloads each PDF, extracts and cleans its text, and chunks it (reusing the same chunker as
   uploaded student notes).
4. Stores every chunk in a `KnowledgeChunk` linked to a `KnowledgeSource` record carrying the real
   source page URL, the real file URL, and a license note - `isDemoData` is always `false` for this data.
5. Upserts real `CurriculumLevel` / `Subject` / `Topic` records so `/api/curriculum/*` serves genuine
   KICD-derived subjects instead of a hardcoded list.

**The AI actually uses this.** `backend/src/services/curriculum/knowledgeRetrieval.js` runs a MongoDB
text search over `KnowledgeChunk`, scoped to the learner's education level, for:
- every tutor chat message (`tutorController.js`)
- topic-based quiz generation (`quizController.js`)
- topic-based flashcard generation (`flashcardController.js`)

When relevant excerpts are found, they're injected into the prompt and Cymor is instructed to say so
naturally (e.g. "The CBC curriculum design for this level covers..."). When nothing relevant is found,
Cymor answers from general knowledge and is explicitly instructed not to claim CBC/CBE authority it
doesn't have - the same honesty rule the original spec required for "Ask My Notes."

**Run it after deploying the backend**, from the Render Shell tab (or any environment with real
outbound internet access - this script needs to actually reach kicd.ac.ke and Google Drive):

```
npm run ingest:kicd
```

It's safe to re-run - already-ingested files are skipped by their file URL. Failures (e.g. a scanned
PDF with no text layer, or a Google Drive download quirk) are logged per-file with a reason in
`KnowledgeSource` rather than stopping the whole run, so you can see exactly what did and didn't come
in. Grades 1-9 pages list clean per-subject headings; Grades 10-12 group several electives under
broader category headings (Applied Sciences, Pure Sciences, etc.) since that's how KICD publishes them.

A separate `npm run seed:dev-demo-curriculum` still exists purely as an offline fallback for local
frontend development before you've run the real ingestion - its output is always marked
`isDemoData: true` and it is **not** run by default or referenced anywhere else in the app.

Deliberately left out of v1 (per the original brief): payments, teacher dashboards, spaced repetition
scheduling (the data model supports it later), live web scraping, KCSE/university content.

## Project structure

```
cymor-tutor/
├── backend/          Node/Express + MongoDB API, Gemini integration
│   ├── src/
│   │   ├── config/        MongoDB connection
│   │   ├── middleware/     auth, rate limiting, upload validation, error handling
│   │   ├── models/         Mongoose schemas
│   │   ├── routes/         REST endpoints
│   │   ├── controllers/    request handlers
│   │   ├── services/
│   │   │   ├── ai/           Gemini client + AI router (task → model → prompt)
│   │   │   ├── documents/    PDF extraction, chunking, retrieval
│   │   │   ├── curriculum/   curriculum lookups
│   │   │   └── usage/        free-tier quota tracking
│   │   └── prompts/         one focused prompt template per task type
│   ├── scripts/knowledge-ingestion/seedCurriculum.js   demo curriculum seed
│   ├── server.js
│   └── .env.example
└── frontend/         flat vanilla HTML/CSS/JS, deployable as static files
    ├── index.html            the chat app itself - this is the home screen now
    ├── pages/                notes (PDF Study Room), quiz, flashcards, progress
    ├── css/styles.css        shared design system
    ├── js/
    │   ├── config.js         ← set your backend URL here
    │   ├── chat-app.js        splash, quick-start, sidebar, streaming chat, rendering
    │   ├── api/client.js     fetch wrapper + auth header
    │   ├── state/store.js    localStorage session helpers
    │   ├── services/auth.js  quick-start/login/claim-account/logout
    │   └── components/nav.js shared topbar (pages/) + bottom nav
    └── manifest.json
```

## How the AI stays free-tier friendly

- **No full-document prompts.** Uploaded notes are chunked and stored; only the 2–4 most relevant
  chunks (via MongoDB text search) are sent to Gemini per question, capped at ~3000 characters.
- **No full chat history.** Only the last 8 messages of a conversation are sent per turn.
- **AI Router** (`backend/src/services/ai/aiRouter.js`) picks a focused prompt template and model
  tier per task type, so nothing pays for capability it doesn't need.
- **Daily quotas** (`DAILY_AI_REQUEST_LIMIT`, `MAX_QUIZ_GENERATIONS_PER_DAY` in `.env`) stop any
  single user from exhausting the Gemini free tier.

## Deployment (matches your usual mobile / GitHub-web workflow)

### 1. Push the code
Upload this project to a GitHub repo using the GitHub web interface (drag-and-drop the two folders,
or use the "Add file → Upload files" flow). Keep `backend/` and `frontend/` as separate top-level
folders — that's what the steps below assume.

### 2. MongoDB Atlas
Create a free cluster, add a database user, and allow access from anywhere (0.0.0.0/0) for Render's
dynamic IPs. Copy the connection string for `MONGODB_URI`.

### 3. Backend on Render
- New → Web Service → connect your GitHub repo.
- **Root directory:** `backend`
- **Build command:** `npm install`
- **Start command:** `npm start`
- Add environment variables from `backend/.env.example` (fill in real values — especially
  `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, and `ALLOWED_ORIGINS` once you know your Vercel URL).
- Once deployed, note your Render URL, e.g. `https://cymor-tutor-backend.onrender.com`.
- Run the real curriculum ingestion once the service is live (Render → Shell tab):
  `npm run ingest:kicd` - this pulls real KICD curriculum designs into your database (see
  "Real curriculum data (KICD), not demo data" above). It can take a while since it's downloading and
  parsing real PDFs - that's expected.

### 4. Frontend on Vercel
- New Project → import the same repo.
- **Root directory:** `frontend`
- **Framework preset:** Other (no build step needed — it's flat HTML/CSS/JS).
- Before deploying (or after, then redeploy), edit `frontend/js/config.js` and set
  `window.CYMOR_API_BASE` to `https://<your-render-service>.onrender.com/api`.
- Once you have your Vercel URL, add it to `ALLOWED_ORIGINS` on Render and redeploy the backend.

### 5. Icons
Add real `icon-192.png` and `icon-512.png` files to `frontend/assets/icons/` (referenced by
`manifest.json`) before treating the PWA install prompt as final.

## Environment variables (backend/.env)

See `backend/.env.example` for the full list and defaults. At minimum you need:
`MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `ALLOWED_ORIGINS`.

## API summary

```
POST /api/auth/quick-start           (primary entry point: name + grade, no password)
POST /api/auth/register              POST /api/auth/login   (optional traditional accounts)
GET  /api/auth/me                    POST /api/auth/claim   (upgrade an anonymous account)
POST /api/auth/profile               (update name/level/subjects later)

POST /api/tutor/chat                 POST /api/tutor/chat/stream   (SSE streaming)
GET  /api/tutor/conversations        GET  /api/tutor/conversations/:id
DELETE /api/tutor/conversations/:id

POST /api/documents/upload           GET  /api/documents
GET  /api/documents/:id              DELETE /api/documents/:id
POST /api/documents/:id/ask          POST /api/documents/:id/summarize

POST /api/quizzes/generate           POST /api/quizzes/:id/submit
POST /api/flashcards/generate        GET  /api/flashcards

GET  /api/curriculum/levels
GET  /api/curriculum/subjects?level=<id>
GET  /api/curriculum/topics?subject=<id>

GET  /api/progress
```

All routes except `/api/auth/quick-start`, `/api/auth/register`, `/api/auth/login`, and
`/api/curriculum/*` require a `Authorization: Bearer <token>` header.

## What to build next (Phase 2 candidates, from the original spec)

- DOCX text extraction (stubbed with a clear error for now — swap in a real extractor)
- Spaced repetition scheduling for flashcards (the `interval` / `nextReviewAt` fields already exist)
- Real curriculum ingestion pipeline replacing the demo seed
- Swap keyword-based chunk retrieval for embeddings if/when a free vector-search option is worth adding
- Teacher/parent dashboards (explicitly deferred, not v1)

---
Built by Legendary Smiley Cymor.
