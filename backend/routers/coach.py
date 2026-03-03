"""
POST /coach/feedback          — streaming Craft Coach feedback (NDJSON).
POST /coach/session-feedback  — holistic Gibbs-cycle feedback for a completed session.
References the learner's prior pages to surface genuine growth.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from auth import get_api_key
from models.schemas import (
    CoachFeedbackRequest,
    SessionFeedback,
    SessionFeedbackRequest,
)
from services import gemini_service, story_service

router = APIRouter(tags=["coach"])


@router.post("/coach/feedback")
async def coach_feedback(
    request: CoachFeedbackRequest,
    _: None = Depends(get_api_key),
) -> StreamingResponse:
    """
    Stream Craft Coach feedback on the current draft.
    Returns NDJSON: one {"type": "text", "content": "..."} object per chunk.
    The coach reads the learner's prior pages to detect growth and give
    page-specific encouragement.
    """
    # Optionally enrich prior_pages from disk if frontend sent an empty list
    prior_pages = request.prior_pages
    if not prior_pages and request.uid:
        story = story_service.load_story(request.uid, request.story_id if hasattr(request, "story_id") else "")
        if story:
            pages = story_service.get_all_pages(request.uid, story.story_id, exclude_illustrations=True)
            prior_pages = [
                {"page_number": p.page_number, "text_draft": p.text_draft}
                for p in pages
                if p.page_number < request.page_number
            ]

    return StreamingResponse(
        gemini_service.stream_coach_feedback(
            draft_text=request.draft_text,
            technique=request.technique,
            page_number=request.page_number,
            story_title=request.story_title,
            prior_pages=prior_pages,
        ),
        media_type="application/x-ndjson",
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.post("/coach/session-feedback", response_model=SessionFeedback)
async def session_feedback(
    request: SessionFeedbackRequest,
    _: None = Depends(get_api_key),
) -> SessionFeedback:
    """
    Generate holistic Gibbs-cycle feedback for a completed session.
    Reads all pages written in the session, analyses craft application,
    and returns structured feedback across 6 Gibbs phases.
    """
    profile = story_service.load_profile(request.uid)
    story = story_service.load_story(request.uid, request.story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    # Determine which pages belong to this session (3 pages per session)
    session_pages_map = {1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12]}
    target_page_nums = session_pages_map.get(request.session_number, [1, 2, 3])

    all_pages = story_service.get_all_pages(request.uid, request.story_id, exclude_illustrations=True)
    session_pages = [
        {"page_number": p.page_number, "text_draft": p.text_draft}
        for p in all_pages
        if p.page_number in target_page_nums
    ]

    if not session_pages:
        raise HTTPException(status_code=404, detail="No pages found for this session")

    # Load session plan to get techniques
    plan = story_service.load_session_plan(request.uid, request.story_id, request.session_number)
    techniques = [t.name for t in plan.techniques] if plan else []

    learner_name = profile.display_name if profile else "Writer"

    try:
        result = await gemini_service.generate_session_feedback(
            pages=session_pages,
            techniques=techniques,
            story_title=story.title,
            session_number=request.session_number,
            learner_name=learner_name,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback generation failed: {e}")

    return SessionFeedback(
        session_number=request.session_number,
        phases=[
            {"phase": p.phase, "title": p.title, "content": p.content}
            for p in result.phases
        ],
        overall_summary=result.overall_summary,
    )
