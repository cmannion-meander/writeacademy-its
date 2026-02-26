# WriteAcademy — Craft Coach

**Hackathon submission for the Google Gemini Creative Storyteller track**

An experiential creative writing LMS that teaches craft techniques through
*generated examples* rather than static text. Students learn by watching Gemini
demonstrate techniques live — seeing narration, a model passage, inline annotations,
and a personalised writing prompt stream back as one flowing, interleaved response.

---

## The Problem

Creative writing instruction is mostly declarative: "show, don't tell" gets *defined*
but rarely *demonstrated* in a way students can interact with. Craft books are static.
One-on-one coaching is expensive and inaccessible. There's no tool that lets a student
say "show me suspense in action, in a Gothic setting" and get back a live, annotated
example paired with a personalised prompt — immediately.

## The Solution

WriteAcademy's **Craft Coach** uses Gemini's interleaved multimodal streaming to
return a single coherent response that alternates between:

- **Narration** — contextualising the technique
- **Generated passage** — a short piece of prose demonstrating it
- **Annotations** — inline explanations of what's happening and why
- **Writing prompt** — a tailored challenge for the student to try

All streamed as newline-delimited JSON so the UI can render each block as it arrives.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| AI | Google Gemini (interleaved streaming) |
| Frontend | Next.js 14 + Tailwind CSS |
| Deployment | Google Cloud Run (backend) |
| Auth | Shared API key (hackathon scope) |

---

## Architecture

```
Browser (Next.js)
  │
  ├─ POST /craft-demo ──► FastAPI (Cloud Run)
  │                           │
  │                           └─► Gemini API (streaming)
  │                                   │
  │◄── ndjson stream ─────────────────┘
  │
  └─ Renders blocks as they arrive:
       [text] → paragraph
       [passage] → styled blockquote
       [annotation] → italic accent
       [prompt] → "Your turn" CTA box
```

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
cp .env.example .env           # add your GEMINI_API_KEY + WRITEACADEMY_API_KEY
uvicorn main:app --reload
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000/craft-demo
```

---

## GCP Deployment

```bash
# Deploy backend to Cloud Run
cd backend
gcloud run deploy writeacademy-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=...,WRITEACADEMY_API_KEY=...

# Update frontend env with deployed URL, then deploy to Vercel / Firebase / etc.
NEXT_PUBLIC_BACKEND_URL=https://writeacademy-backend-xxxx-uc.a.run.app
```

---

## Team

| Name | Role |
|---|---|
| Christopher Mannion | Full-stack + AI integration |
