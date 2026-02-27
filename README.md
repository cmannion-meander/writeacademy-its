# WriteAcademy — Craft Coach ITS

**Hackathon submission · Google Gemini Creative Storyteller track**

An experiential creative writing LMS that teaches craft techniques through
*generated examples* rather than static text. The core new feature is a
**Craft Coach** — an Intelligent Tutoring System (ITS) embedded directly into
each lesson. A student reads a lesson, then watches Gemini demonstrate the
lesson's craft technique live: narration, an annotated model passage, and a
personalised writing prompt, all streamed as one interleaved response.

---

## Goal

Replace passive reading in online creative writing courses with *active,
contextualised demonstration*. Every lesson in the Write Storybooks for Children
course now surfaces a Craft Coach panel pre-loaded with the lesson's specific
technique. The student can customise the context (genre, age group, setting) and
get a unique, annotated example generated on demand — then immediately attempt
their own version with the prompt Gemini provides.

---

## The Problem

Creative writing instruction is almost always declarative. "Show, don't tell"
gets *defined*, never *demonstrated* in a way the student can interact with or
vary. Craft books are static. One-on-one coaching is expensive and inaccessible.
There is no existing tool that lets a student say "show me simplicity and
repetition for a board book about farm animals" and get back a live, annotated
example with a personalised follow-up prompt — in seconds, mid-lesson.

## The Solution

WriteAcademy's Craft Coach uses Gemini's streaming API to return a single
coherent response that interleaves four block types:

| Block | Role |
|---|---|
| `text` | Narration — contextualises the technique and what to look for |
| `passage` | A short generated prose passage that demonstrates the technique |
| `annotation` | Inline analysis — explains *why* specific choices work |
| `prompt` | A personalised writing challenge for the student to attempt |

The blocks stream as newline-delimited JSON. The frontend renders each one as
it arrives, so the experience feels conversational rather than page-loaded.

---

## Architecture

```
Browser (Next.js 16)
  │
  ├── /learn/[courseSlug]/[lessonId]
  │     ├── TopNav + SidebarNav (LMS chrome)
  │     ├── ModuleSidebar (lesson progress, section accordion)
  │     ├── Lesson content (article text or quiz)
  │     └── CraftCoach panel (ITS — pre-filled per lesson)
  │              │
  │              └── POST /craft-demo ──► FastAPI (Cloud Run)
  │                                           │
  │                                           └─► Gemini API (streaming)
  │                                                   │
  │◄────── ndjson stream (text/passage/annotation/prompt) ┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11) |
| AI | Google Gemini — interleaved streaming |
| Frontend | Next.js 16 + Tailwind CSS v4 |
| Deployment | Google Cloud Run (backend, `--source .`) |
| Fonts / Icons | Inter (Google Fonts), Lucide React |
| Auth | Shared API key — replace with JWT before production |

---

## Roadmap

### Phase 1 — Scaffold ✅ (current)
- [x] FastAPI backend with mock streaming endpoint (`/craft-demo`)
- [x] Next.js frontend with Write Academy LMS design
- [x] Craft Coach ITS panel integrated into lesson pages
- [x] Write Storybooks for Children course (9 lessons, 3 modules) with per-lesson `craftTechnique` + `craftContext`
- [x] Lesson navigation (prev/next), module accordion sidebar, progress bar

### Phase 2 — Live Gemini (next)
- [ ] Replace mock `stream_blocks()` in `backend/main.py` with real `google.generativeai` streaming call
- [ ] Prompt engineering: system prompt that enforces the 4-block interleaved structure
- [ ] Error handling for Gemini rate limits and timeouts
- [ ] Deploy backend to Cloud Run with real `GEMINI_API_KEY`

### Phase 3 — LMS Integration
- [ ] Authenticate frontend against existing Django LMS (`/api/writeacademy/`) via JWT
- [ ] Replace mock course data with real lessons from `/api/writeacademy/lessons/`
- [ ] Log each Craft Coach session to `/api/writeacademy/craft-demo-requests/`
- [ ] Save student writing responses to `/api/writeacademy/writing-responses/`
- [ ] Read enrollment status from `/api/writeacademy/enrollments/` to gate access

### Phase 4 — Deeper ITS
- [ ] Multi-turn coaching: student submits their attempt, Gemini gives targeted feedback
- [ ] Spaced repetition: surface past techniques the student struggled with
- [ ] Technique library: browse all demonstrated techniques across courses
- [ ] Teacher dashboard: review student Craft Coach sessions and writing attempts

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Gemini API key (free tier works for demos)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # add GEMINI_API_KEY and WRITEACADEMY_API_KEY

# Note: if port 8000 is in use, run on a different port
uvicorn main:app --reload --port 8123
# → http://localhost:8123
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local  # set NEXT_PUBLIC_BACKEND_URL=http://localhost:8123
npm install
npm run dev
# → http://localhost:3000  (redirects to /learn/write-storybooks-for-children/l1)
```

---

## GCP Deployment

```bash
# Deploy backend to Cloud Run (no Docker required)
cd backend
gcloud run deploy writeacademy-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your-key,WRITEACADEMY_API_KEY=your-secret

# Point frontend at the deployed backend
# In frontend/.env.local (or Vercel env vars):
NEXT_PUBLIC_BACKEND_URL=https://writeacademy-backend-xxxx-uc.a.run.app
```

---

## Security Notes

- `.env` and `.env.local` are gitignored — never committed
- `api_key: "devkey123"` is hardcoded in frontend source for local dev only; marked with TODO comments
- Before production: replace shared API key auth with JWT from the Django LMS session

---

## Team

| Name | Role |
|---|---|
| Christopher Mannion | Full-stack + AI integration |
