# WriteAcademy ITS Project Conventions

## When to Use
Reference for any task in this codebase. Project structure, naming, API patterns, deployment.

## Project Structure

```
writeacademy-its/
  frontend/                # Next.js 16 app
    app/
      page.tsx             # Main session view
      onboarding/
      portfolio/
    components/
      session/             # Wonder, Build, Reflect phases
      storybook/           # StoryPage, BookPreview, IllustratedPage
      coach/               # CraftCoach panel
      common/              # Timer, ProgressBar, LoadingAnimations
    lib/
      storage.ts           # localStorage + Firestore dual-write
      api.ts               # Backend API client
      types.ts             # Shared TypeScript types
  backend/                 # FastAPI app
    main.py
    routers/
      onboard.py           # POST /onboard
      session.py           # POST /session/plan
      story.py             # story/page, story/page/illustrate, story/export
      coach.py             # POST /coach/feedback (streaming SSE)
      portfolio.py         # GET /portfolio/growth
      lesson.py            # POST /structure-lesson (existing fallback)
    services/
      gemini_service.py    # All Gemini calls (see gemini-patterns skill)
      story_service.py     # Story assembly, page management
      skill_service.py     # Skill detection, adaptive planning
      illustration_service.py
      pdf_service.py       # Storybook PDF assembly
    models/
      schemas.py           # Pydantic models (see story-data-model skill)
    cache/lesson_cache/
    Dockerfile
    requirements.txt
  README.md
  architecture-diagram.png
```

## Naming Conventions

- Files: kebab-case (story-service.py, craft-coach.tsx)
- Components: PascalCase (CraftCoach, IllustratedPage)
- Functions: camelCase (TS) or snake_case (Python)
- API routes: kebab-case (/story/page, /coach/feedback)
- Pydantic models: PascalCase (StoryPage, LearnerProfile)
- Env vars: UPPER_SNAKE (GEMINI_API_KEY, GCS_BUCKET)

## API Patterns

All endpoints return JSON. Errors: standard HTTP codes with detail/code body.

Streaming endpoints use Server-Sent Events:
```python
@router.post("/coach/feedback")
async def coach_feedback(request: CoachRequest):
    async def generate():
        async for chunk in stream_coach_feedback(request.draft, ...):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream")
```

## Environment Variables

Backend: GEMINI_API_KEY, GCS_BUCKET, GOOGLE_CLOUD_PROJECT, CORS_ORIGINS, LMS_API_URL, CACHE_DIR
Frontend: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_NAME

## Cloud Run Deployment

```bash
gcloud run deploy writeacademy-api \
  --source ./backend --region us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest
```

## Git

- .gitignore: lesson_cache/, .env, node_modules/, __pycache__/
- Tag submission: git tag -a v2.0-submission -m "Hackathon submission"
- Conventional commits (feat:, fix:, docs:)

## Testing Priority (Hackathon)

1. Manual: full Session 1 flow end-to-end
2. Illustration generation 3+ pages for style consistency
3. PDF export with 6-page book
4. Onboarding skill detection with 3 writing levels
5. Pre-warmed cache serves instantly
