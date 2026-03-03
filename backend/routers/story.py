"""
Story endpoints — draft saving, illustration generation, page retrieval.

POST /story/page           — save a draft (instant)
POST /story/page/illustrate — generate illustration for a saved draft (~8–15s)
GET  /story/{uid}/{story_id}/pages  — all pages, no illustration data
GET  /story/{uid}/{story_id}/page/{n} — single page including illustration_b64
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth import get_api_key
from models.schemas import IllustrateResponse, StoryPage
from services import gemini_service, story_service

router = APIRouter(tags=["story"])


# ─── Inline request models (minimal — backend loads story context from disk) ──

class PageSaveRequest(BaseModel):
    uid: str
    story_id: str
    page_number: int
    text_draft: str
    technique_applied: Optional[str] = None


class IllustratePageRequest(BaseModel):
    uid: str
    story_id: str
    page_number: int
    adjustment_notes: Optional[str] = None  # learner-requested changes, e.g. "change hair to red"


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/story/page", response_model=StoryPage)
async def save_page(
    request: PageSaveRequest,
    _: None = Depends(get_api_key),
) -> StoryPage:
    """
    Save a story page draft. Returns immediately.
    Does NOT generate an illustration — call /story/page/illustrate for that.
    """
    existing = story_service.load_page(request.uid, request.story_id, request.page_number)
    page = StoryPage(
        page_number=request.page_number,
        text_draft=request.text_draft,
        technique_applied=request.technique_applied,
        illustration_b64=existing.illustration_b64 if existing else None,
        illustration_url=existing.illustration_url if existing else None,
        created_at=existing.created_at if existing else datetime.utcnow(),
    )
    saved = story_service.save_page(request.uid, request.story_id, page)
    # Strip illustration from response to keep payload small
    return saved.model_copy(update={"illustration_b64": None})


@router.post("/story/page/illustrate", response_model=IllustrateResponse)
async def illustrate_page(
    request: IllustratePageRequest,
    _: None = Depends(get_api_key),
) -> IllustrateResponse:
    """
    Generate (or regenerate) an illustration for an already-saved page.
    Reads draft from disk, calls Gemini Image, updates the page, and returns
    the base64 data URL.  Expect ~8–15 s latency.

    Also updates StoryProject.style_anchor (first page only) and
    character_visual_notes for cross-page style consistency.
    """
    story = story_service.load_story(request.uid, request.story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    page = story_service.load_page(request.uid, request.story_id, request.page_number)
    if not page:
        raise HTTPException(
            status_code=404,
            detail=f"Page {request.page_number} not saved yet — POST /story/page first",
        )

    # If the page already has an illustration and no adjustment was requested,
    # return the cached version instantly (skips Gemini — great for demo mode).
    if page.illustration_b64 and not request.adjustment_notes:
        return IllustrateResponse(
            page_number=request.page_number,
            illustration_b64=page.illustration_b64,
            style_anchor=story.style_anchor,
            character_visual_notes=list(story.character_visual_notes),
            environment_visual_notes=list(story.environment_visual_notes),
        )

    # Load reference images for pages 2+: page 1 (style anchor) + most recent page (continuity).
    reference_images: list[str] = []
    if request.page_number > 1:
        page1 = story_service.load_page(request.uid, request.story_id, 1)
        if page1 and page1.illustration_b64:
            reference_images.append(page1.illustration_b64)
        # Also load the most recently illustrated page for visual continuity
        if request.page_number > 2:
            prev_page = story_service.load_page(request.uid, request.story_id, request.page_number - 1)
            if prev_page and prev_page.illustration_b64:
                reference_images.append(prev_page.illustration_b64)

    try:
        b64_url, new_anchor, char_notes, env_notes = await gemini_service.generate_illustration(
            page_text=page.text_draft,
            title=story.title,
            character_name=story.character_name,
            character_description=story.character_description,
            world_description=story.world_description,
            style_anchor=story.style_anchor,
            character_visual_notes=list(story.character_visual_notes),
            environment_visual_notes=list(story.environment_visual_notes),
            reference_images_b64=reference_images or None,
            adjustment_notes=request.adjustment_notes,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Illustration generation failed: {e}")

    # Save illustration into the page
    updated_page = page.model_copy(update={"illustration_b64": b64_url, "updated_at": datetime.utcnow()})
    story_service.save_page(request.uid, request.story_id, updated_page)

    # Update story metadata: style_anchor (first page only) + visual notes (always)
    story_updates: dict = {
        "character_visual_notes": char_notes,
        "environment_visual_notes": env_notes,
    }
    if not story.style_anchor and new_anchor:
        story_updates["style_anchor"] = new_anchor
    story_service.update_story(request.uid, request.story_id, **story_updates)

    return IllustrateResponse(
        page_number=request.page_number,
        illustration_b64=b64_url,
        style_anchor=story_updates.get("style_anchor") or story.style_anchor,
        character_visual_notes=char_notes,
        environment_visual_notes=env_notes,
    )


@router.get("/story/{uid}/{story_id}/pages")
async def list_pages(
    uid: str,
    story_id: str,
    _: None = Depends(get_api_key),
) -> list[dict]:
    """List all pages for a story. Strips illustration_b64 to keep response fast."""
    pages = story_service.get_all_pages(uid, story_id, exclude_illustrations=True)
    return [p.model_dump(exclude={"illustration_b64", "revision_history"}) for p in pages]


@router.get("/story/{uid}/{story_id}/page/{page_number}")
async def get_page(
    uid: str,
    story_id: str,
    page_number: int,
    _: None = Depends(get_api_key),
) -> dict:
    """Get a single page including its illustration_b64."""
    page = story_service.load_page(uid, story_id, page_number)
    if not page:
        raise HTTPException(status_code=404, detail=f"Page {page_number} not found")
    return page.model_dump(exclude={"revision_history"})


@router.get("/story/{uid}/{story_id}/metadata")
async def get_story_metadata(
    uid: str,
    story_id: str,
    _: None = Depends(get_api_key),
) -> dict:
    """Return story project metadata (no pages)."""
    story = story_service.load_story(uid, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story.model_dump()
