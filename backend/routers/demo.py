"""
Demo mode — serve pre-cached story data for instant walkthroughs.

GET /demo/seed  — returns everything needed to populate localStorage and
                  start a demo session without any Gemini calls.
GET /demo/runs  — lists available demo story runs.

The demo data lives in story_data/ (the same directory used by story_service).
Illustrations are served on-demand via the existing
GET /story/{uid}/{story_id}/page/{n} endpoint.
"""

from __future__ import annotations

import json
import pathlib
from typing import Optional

from fastapi import APIRouter, HTTPException

from models.schemas import (
    LearnerProfile,
    OnboardingResult,
    SessionPlan,
    SkillAssessment,
    SkillLevel,
    StoryProject,
    TechniqueMode,
)
from services import story_service

router = APIRouter(tags=["demo"])

STORY_DATA = pathlib.Path("story_data")

# ─── Default demo run ────────────────────────────────────────────────────────

DEFAULT_DEMO_UID = "luna-demo"
DEFAULT_DEMO_STORY_ID = "luna-garden"


def _list_demo_runs() -> list[dict]:
    """Scan story_data/ for complete story runs (12 pages + 4 plans)."""
    runs = []
    if not STORY_DATA.exists():
        return runs

    for uid_dir in STORY_DATA.iterdir():
        if not uid_dir.is_dir():
            continue
        for story_dir in uid_dir.iterdir():
            if not story_dir.is_dir():
                continue
            meta_path = story_dir / "metadata.json"
            if not meta_path.exists():
                continue
            pages_dir = story_dir / "pages"
            sessions_dir = story_dir / "sessions"
            page_count = len(list(pages_dir.glob("*.json"))) if pages_dir.exists() else 0
            plan_count = len(list(sessions_dir.glob("plan_*.json"))) if sessions_dir.exists() else 0
            if page_count >= 12 and plan_count >= 4:
                meta = json.loads(meta_path.read_text())
                runs.append({
                    "uid": uid_dir.name,
                    "story_id": story_dir.name,
                    "title": meta.get("title", "Untitled"),
                    "pages": page_count,
                    "plans": plan_count,
                })
    return runs


@router.get("/demo/runs")
async def list_runs() -> list[dict]:
    """List available demo story runs."""
    return _list_demo_runs()


@router.get("/demo/seed")
async def seed_demo(
    uid: Optional[str] = None,
    story_id: Optional[str] = None,
) -> dict:
    """
    Return all data needed to populate localStorage for a demo walkthrough.

    Returns: { onboarding, session_plans, pages }
    - onboarding: OnboardingResult (profile, story, skills, session plan 1)
    - session_plans: { "1": plan, "2": plan, "3": plan, "4": plan }
    - pages: [ { page_number, text_draft }, ... ]  (no illustrations — too large)

    Illustrations are fetched on-demand via GET /story/{uid}/{story_id}/page/{n}.
    """
    demo_uid = uid or DEFAULT_DEMO_UID
    demo_story_id = story_id or DEFAULT_DEMO_STORY_ID

    # Load profile
    profile = story_service.load_profile(demo_uid)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Demo profile not found: {demo_uid}")

    # Load story metadata
    story = story_service.load_story(demo_uid, demo_story_id)
    if not story:
        raise HTTPException(status_code=404, detail=f"Demo story not found: {demo_story_id}")

    # Load all 4 session plans
    plans: dict[str, dict] = {}
    for n in range(1, 5):
        plan = story_service.load_session_plan(demo_uid, demo_story_id, n)
        if plan:
            plans[str(n)] = plan.model_dump()

    if not plans.get("1"):
        raise HTTPException(status_code=404, detail="Demo session plan 1 not found")

    # Load all page drafts (text only — illustrations are served on-demand)
    all_pages = story_service.get_all_pages(demo_uid, demo_story_id, exclude_illustrations=True)
    page_drafts = [
        {"page_number": p.page_number, "text_draft": p.text_draft}
        for p in all_pages
    ]

    # Build a synthetic OnboardingResult from the profile data
    skill_assessments = [
        SkillAssessment(
            dimension=dim,
            level=level,
            evidence="Assessed from writing sample during onboarding.",
            recommendation=TechniqueMode.FULL if level == SkillLevel.DEVELOPING else TechniqueMode.COMPRESS,
        )
        for dim, level in profile.skill_levels.items()
    ]

    writing_sample = profile.writing_samples[0] if profile.writing_samples else {}
    session_plan_1 = story_service.load_session_plan(demo_uid, demo_story_id, 1)

    onboarding = OnboardingResult(
        uid=demo_uid,
        skills=skill_assessments,
        overall_level=writing_sample.get("overall_level", "intermediate"),
        suggested_focus=writing_sample.get("suggested_focus", "Focus on character voice."),
        story=story,
        profile=profile,
        session_plan=session_plan_1,
    )

    return {
        "onboarding": onboarding.model_dump(),
        "session_plans": plans,
        "pages": page_drafts,
    }
