"""
WriteAcademy ITS v2.0 — Story Service (File-Based Persistence)
Mirrors the Firestore collection structure from skills/story-data-model.md.
Uses story_data/{uid}/ on disk for the hackathon MVP.
Swap the _read/_write helpers for Firestore calls when upgrading to production.

File layout:
  story_data/{uid}/
    profile.json
    {story_id}/
      metadata.json
      pages/
        {n}.json          (StoryPage — includes illustration_b64)
      sessions/
        plan_{n}.json     (SessionPlan)
        record_{n}.json   (SessionRecord)
"""

from __future__ import annotations

import json
import pathlib
from datetime import datetime
from typing import Optional

from models.schemas import (
    LearnerProfile,
    StoryProject,
    StoryPage,
    SessionPlan,
    SessionRecord,
)

STORY_DATA = pathlib.Path("story_data")
STORY_DATA.mkdir(exist_ok=True)


# ─── Path helpers ─────────────────────────────────────────────────────────────

def _ensure(path: pathlib.Path) -> pathlib.Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def _profile_path(uid: str) -> pathlib.Path:
    return _ensure(STORY_DATA / uid) / "profile.json"


def _story_dir(uid: str, story_id: str) -> pathlib.Path:
    return _ensure(STORY_DATA / uid / story_id)


def _metadata_path(uid: str, story_id: str) -> pathlib.Path:
    return _story_dir(uid, story_id) / "metadata.json"


def _pages_dir(uid: str, story_id: str) -> pathlib.Path:
    return _ensure(_story_dir(uid, story_id) / "pages")


def _page_path(uid: str, story_id: str, page_number: int) -> pathlib.Path:
    return _pages_dir(uid, story_id) / f"{page_number}.json"


def _sessions_dir(uid: str, story_id: str) -> pathlib.Path:
    return _ensure(_story_dir(uid, story_id) / "sessions")


def _plan_path(uid: str, story_id: str, session: int) -> pathlib.Path:
    return _sessions_dir(uid, story_id) / f"plan_{session}.json"


def _record_path(uid: str, story_id: str, session: int) -> pathlib.Path:
    return _sessions_dir(uid, story_id) / f"record_{session}.json"


# ─── Low-level I/O ────────────────────────────────────────────────────────────

def _write(path: pathlib.Path, data: dict) -> None:
    path.write_text(
        json.dumps(data, default=str, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _read(path: pathlib.Path) -> Optional[dict]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None


# ─── Learner Profile ──────────────────────────────────────────────────────────

def save_profile(uid: str, profile: LearnerProfile) -> None:
    _write(_profile_path(uid), profile.model_dump())


def load_profile(uid: str) -> Optional[LearnerProfile]:
    data = _read(_profile_path(uid))
    return LearnerProfile(**data) if data else None


# ─── Story Project ────────────────────────────────────────────────────────────

def save_story(uid: str, story: StoryProject) -> None:
    _write(_metadata_path(uid, story.story_id), story.model_dump())


def load_story(uid: str, story_id: str) -> Optional[StoryProject]:
    data = _read(_metadata_path(uid, story_id))
    return StoryProject(**data) if data else None


def list_stories(uid: str) -> list[StoryProject]:
    uid_dir = STORY_DATA / uid
    if not uid_dir.exists():
        return []
    stories: list[StoryProject] = []
    for child in uid_dir.iterdir():
        if child.is_dir():
            data = _read(child / "metadata.json")
            if data:
                try:
                    stories.append(StoryProject(**data))
                except Exception:
                    pass
    return sorted(stories, key=lambda s: s.created_at, reverse=True)


def update_story(uid: str, story_id: str, **kwargs) -> Optional[StoryProject]:
    """Partial update: load, apply kwargs, save, return updated story."""
    story = load_story(uid, story_id)
    if not story:
        return None
    updated = story.model_copy(update=kwargs)
    save_story(uid, updated)
    return updated


# ─── Story Pages ─────────────────────────────────────────────────────────────

def save_page(uid: str, story_id: str, page: StoryPage) -> StoryPage:
    """
    Save a page. If a previous version exists with a different draft,
    push the old draft into revision_history (append-only per story-data-model.md Rule 3).
    """
    existing = load_page(uid, story_id, page.page_number)
    if existing and existing.text_draft != page.text_draft:
        page = page.model_copy(
            update={
                "revision_history": list(existing.revision_history)
                + [
                    {
                        "draft": existing.text_draft,
                        "saved_at": existing.updated_at.isoformat(),
                    }
                ],
                "updated_at": datetime.utcnow(),
            }
        )
    _write(_page_path(uid, story_id, page.page_number), page.model_dump())
    return page


def load_page(uid: str, story_id: str, page_number: int) -> Optional[StoryPage]:
    data = _read(_page_path(uid, story_id, page_number))
    return StoryPage(**data) if data else None


def get_all_pages(uid: str, story_id: str, exclude_illustrations: bool = False) -> list[StoryPage]:
    """
    Return all pages sorted by page_number.
    Pass exclude_illustrations=True to strip base64 data from list responses
    (keeps payloads small for the storybook preview endpoint).
    """
    pages_dir = _pages_dir(uid, story_id)
    pages: list[StoryPage] = []
    for f in pages_dir.glob("*.json"):
        data = _read(f)
        if data:
            try:
                p = StoryPage(**data)
                if exclude_illustrations:
                    p = p.model_copy(update={"illustration_b64": None})
                pages.append(p)
            except Exception:
                pass
    return sorted(pages, key=lambda p: p.page_number)


# ─── Session Plans ─────────────────────────────────────────────────────────────

def save_session_plan(uid: str, story_id: str, session_number: int, plan: SessionPlan) -> None:
    _write(_plan_path(uid, story_id, session_number), plan.model_dump())


def load_session_plan(uid: str, story_id: str, session_number: int) -> Optional[SessionPlan]:
    data = _read(_plan_path(uid, story_id, session_number))
    return SessionPlan(**data) if data else None


# ─── Session Records ──────────────────────────────────────────────────────────

def save_session_record(uid: str, story_id: str, record: SessionRecord) -> None:
    """Session records are write-once. Overwrites silently (hackathon tolerance)."""
    _write(_record_path(uid, story_id, record.session_number), record.model_dump())


def load_session_record(uid: str, story_id: str, session_number: int) -> Optional[SessionRecord]:
    data = _read(_record_path(uid, story_id, session_number))
    return SessionRecord(**data) if data else None
