# WriteAcademy Backend

FastAPI backend for the WriteAcademy Craft Coach — streams interleaved multimodal
teaching content (narration, passages, annotations, prompts) powered by Google Gemini.

## Local Development

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your keys
uvicorn main:app --reload
```

Server runs at http://localhost:8000

- **API docs:** http://localhost:8000/docs
- **Health check:** http://localhost:8000/health

## Cloud Run Deployment

```bash
gcloud run deploy writeacademy-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

Set secrets via Cloud Run environment variables or Secret Manager.

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | Yes (for live Gemini calls) |
| `WRITEACADEMY_API_KEY` | Shared secret for frontend→backend auth | Yes |

## API Endpoints

### POST /craft-demo

Streams interleaved teaching blocks for a given craft technique.

**Request body:**
```json
{
  "craft_technique": "suspense",
  "context": "optional extra context for Gemini",
  "api_key": "your-writeacademy-api-key"
}
```

**Response:** `application/x-ndjson` stream of JSON objects:
```json
{"type": "text", "content": "..."}
{"type": "passage", "content": "..."}
{"type": "annotation", "content": "..."}
{"type": "prompt", "content": "..."}
```

### GET /health

Returns `{"status": "ok"}`.
