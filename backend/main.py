import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="WriteAcademy Craft Coach API")

# ─── v2.0 routers ─────────────────────────────────────────────────────────────
from routers import onboard, session as session_router, story, coach, pdf, demo  # noqa: E402
app.include_router(onboard.router)
app.include_router(session_router.router)
app.include_router(story.router)
app.include_router(coach.router)
app.include_router(pdf.router)
app.include_router(demo.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
