"""
POST /session/plan   — Generate or retrieve an adaptive session plan.
GET  /session/{uid}/{story_id}/{n} — Retrieve a cached plan.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from auth import get_api_key
from models.schemas import SessionPlan, SessionPlanRequest
from services import gemini_service, story_service

router = APIRouter(tags=["session"])


@router.post("/session/plan", response_model=SessionPlan)
async def get_or_create_session_plan(
    request: SessionPlanRequest,
    _: None = Depends(get_api_key),
) -> SessionPlan:
    """
    Return the adaptive session plan for session_number.
    If already generated and cached, returns instantly.
    Otherwise calls Gemini (~8–12s) and caches the result.
    """
    # ── Cache check ────────────────────────────────────────────────────────────
    cached = story_service.load_session_plan(
        request.uid, request.story_id, request.session_number
    )
    if cached:
        return cached

    # ── Load profile + story ───────────────────────────────────────────────────
    profile = story_service.load_profile(request.uid)
    story = story_service.load_story(request.uid, request.story_id)

    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile not found for uid={request.uid}")
    if not story:
        raise HTTPException(
            status_code=404,
            detail=f"Story not found: uid={request.uid}, story_id={request.story_id}",
        )

    # ── Generate ───────────────────────────────────────────────────────────────
    try:
        plan = await gemini_service.generate_session_plan(
            profile=profile,
            story=story,
            session_number=request.session_number,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session plan generation failed: {e}")

    story_service.save_session_plan(
        request.uid, request.story_id, request.session_number, plan
    )
    return plan


@router.get("/session/{uid}/{story_id}/{session_number}", response_model=SessionPlan)
async def get_session_plan(
    uid: str,
    story_id: str,
    session_number: int,
    _: None = Depends(get_api_key),
) -> SessionPlan:
    """Retrieve a cached session plan. 404 if not yet generated."""
    plan = story_service.load_session_plan(uid, story_id, session_number)
    if not plan:
        raise HTTPException(
            status_code=404,
            detail=f"No plan cached for session {session_number}. POST /session/plan to generate.",
        )
    return plan
