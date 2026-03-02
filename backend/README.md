# WriteAcademy Backend

FastAPI backend for the WriteAcademy Craft Coach — streams interleaved multimodal
teaching content (narration, passages, annotations, prompts) powered by Google Gemini.

## Local Development

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your keys
uvicorn main:app --port 8123 --reload
```

Server runs at http://localhost:8123

- **API docs:** http://localhost:8123/docs
- **Health check:** http://localhost:8123/health

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
| `GOOGLE_CLOUD_PROJECT` | Your Google Cloud Project ID. | Yes |
| `WRITEACADEMY_API_KEY` | Shared secret for frontend→backend auth | Yes |

## API Endpoints

All endpoints require an `X-API-Key` header for authentication.

### POST /craft-demo (Mock)

Streams interleaved teaching blocks for a given craft technique.

**Request body:**
```json
{
  "craft_technique": "suspense",
  "context": "optional extra context for Gemini",
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
