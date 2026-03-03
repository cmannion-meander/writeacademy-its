"""
POST /onboard — Writing sample analysis + story project creation + Session 1 plan.

Flow:
  1. Receive story setup + writing sample
  2. Gemini assesses 5 craft dimensions → skill levels
  3. Create LearnerProfile + StoryProject
  4. Generate Session 1 adaptive plan (concurrent with profile/story save)
  5. Save everything to story_data/{uid}/
  6. Return OnboardingResult (skills, story, profile, session_plan)
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException

from auth import get_api_key
from models.schemas import (
    LearnerProfile,
    OnboardRequest,
    OnboardingResult,
    SkillLevel,
    StoryProject,
)
from services import gemini_service, story_service

router = APIRouter(tags=["onboarding"])


@router.post("/onboard", response_model=OnboardingResult)
async def onboard(
    request: OnboardRequest,
    _: None = Depends(get_api_key),
) -> OnboardingResult:
    """
    Full onboarding: assess writing, create story + learner profile, plan Session 1.
    Expected latency: ~15–20s (two sequential Gemini text calls).
    Results cached — if the uid/story already exists, the plan is served instantly.
    """
    # ── 1. Skill assessment ────────────────────────────────────────────────────
    try:
        skills, overall_level, suggested_focus = await gemini_service.assess_writing_sample(
            writing_sample=request.writing_sample,
            story_title=request.story_title,
            character_name=request.character_name,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skill assessment failed: {e}")

    # ── 2. Build learner profile ───────────────────────────────────────────────
    skill_levels: dict[str, SkillLevel] = {
        s.dimension: s.level for s in skills
    }
    # Fill in any dimensions Gemini may have omitted
    defaults = {
        "sensory_detail": SkillLevel.NOT_ASSESSED,
        "character_voice": SkillLevel.NOT_ASSESSED,
        "show_dont_tell": SkillLevel.NOT_ASSESSED,
        "story_structure": SkillLevel.NOT_ASSESSED,
        "visual_thinking": SkillLevel.NOT_ASSESSED,
    }
    defaults.update(skill_levels)

    profile = LearnerProfile(
        uid=request.uid,
        display_name=request.display_name,
        skill_levels=defaults,
        writing_samples=[
            {
                "text": request.writing_sample[:500],
                "overall_level": overall_level,
                "suggested_focus": suggested_focus,
            }
        ],
        style_preferences={
            "tone": "warm",
            "genre": "picture_book",
            "learning_style": "visual",
        },
    )

    # ── 3. Build story project ─────────────────────────────────────────────────
    story = StoryProject(
        title=request.story_title,
        premise=request.premise,
        character_name=request.character_name,
        character_description=request.character_description,
        world_description=request.world_description,
        target_age=request.target_age,
    )

    # ── 4. Save profile + story, then generate Session 1 plan ────────────────
    # Save synchronously first so generate_session_plan can load them if needed.
    story_service.save_profile(request.uid, profile)
    story_service.save_story(request.uid, story)

    try:
        session_plan = await gemini_service.generate_session_plan(
            profile=profile,
            story=story,
            session_number=1,
        )
    except Exception as e:
        # Non-fatal: onboarding succeeds even if plan gen fails.
        # The session endpoint will retry on demand.
        print(f"[onboard] Session 1 plan generation failed: {e}")
        session_plan = None

    if session_plan:
        story_service.save_session_plan(request.uid, story.story_id, 1, session_plan)

    # ── 5. Return ──────────────────────────────────────────────────────────────
    return OnboardingResult(
        uid=request.uid,
        skills=skills,
        overall_level=overall_level,
        suggested_focus=suggested_focus,
        story=story,
        profile=profile,
        session_plan=session_plan,
    )


@router.get("/onboard/{uid}")
async def get_onboard_state(
    uid: str,
    _: None = Depends(get_api_key),
) -> dict:
    """
    Check if a uid has been onboarded. Returns profile + most recent story if found.
    Used by the frontend to resume a session on reload.
    """
    profile = story_service.load_profile(uid)
    if not profile:
        return {"onboarded": False}

    stories = story_service.list_stories(uid)
    latest_story = stories[0] if stories else None

    return {
        "onboarded": True,
        "profile": profile.model_dump(),
        "story": latest_story.model_dump() if latest_story else None,
    }
