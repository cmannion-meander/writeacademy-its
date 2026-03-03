# Story Data Model and Firestore Patterns

## When to Use
Any task involving story persistence, learner profiles, session state, or page CRUD. Also for localStorage fallback.

## Firestore Collection Structure

```
users/{uid}/
  profile          # LearnerProfile document
  stories/{storyId}/
    metadata       # StoryProject document
    pages/{pageNum} # StoryPage documents
    sessions/{num}  # SessionRecord documents
```

## Core Models (Pydantic)

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class SkillLevel(str, Enum):
    NOT_ASSESSED = "not_assessed"
    DEVELOPING = "developing"
    COMPETENT = "competent"
    STRONG = "strong"

class LearnerProfile(BaseModel):
    uid: str
    display_name: str
    skill_levels: dict[str, SkillLevel] = {
        "sensory_detail": SkillLevel.NOT_ASSESSED,
        "character_voice": SkillLevel.NOT_ASSESSED,
        "show_dont_tell": SkillLevel.NOT_ASSESSED,
        "story_structure": SkillLevel.NOT_ASSESSED,
        "visual_thinking": SkillLevel.NOT_ASSESSED,
    }
    completed_techniques: list[str] = []
    writing_samples: list[dict] = []
    style_preferences: dict = {"tone": "warm", "genre": "picture_book", "learning_style": "visual"}
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StoryProject(BaseModel):
    story_id: str
    title: str
    premise: str
    character_name: str
    character_description: str
    world_description: str
    target_age: str = "4-8"
    genre: str = "picture_book"
    style_anchor: Optional[str] = None  # art style desc from first illustration
    current_session: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StoryPage(BaseModel):
    page_number: int
    text_draft: str
    technique_applied: Optional[str] = None
    illustration_url: Optional[str] = None
    illustration_prompt: Optional[str] = None
    revision_history: list[dict] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SessionRecord(BaseModel):
    session_number: int
    pages_written: list[int]
    techniques_practiced: list[str]
    techniques_skipped: list[str]
    coach_feedback_summary: Optional[str] = None
    duration_minutes: Optional[float] = None
    completed_at: datetime = Field(default_factory=datetime.utcnow)
```

## Firestore CRUD Helpers

```python
from google.cloud import firestore
db = firestore.AsyncClient()

async def get_or_create_profile(uid, display_name="Learner"):
    ref = db.collection("users").document(uid).collection("profile").document("main")
    doc = await ref.get()
    if doc.exists:
        return LearnerProfile(**doc.to_dict())
    profile = LearnerProfile(uid=uid, display_name=display_name)
    await ref.set(profile.model_dump())
    return profile

async def save_story_page(uid, story_id, page):
    ref = (db.collection("users").document(uid)
           .collection("stories").document(story_id)
           .collection("pages").document(str(page.page_number)))
    await ref.set(page.model_dump(), merge=True)

async def get_all_pages(uid, story_id):
    ref = (db.collection("users").document(uid)
           .collection("stories").document(story_id)
           .collection("pages"))
    docs = await ref.order_by("page_number").get()
    return [StoryPage(**d.to_dict()) for d in docs]
```

## Cloud Storage for Illustrations

```python
from google.cloud import storage
storage_client = storage.Client()
bucket = storage_client.bucket(os.environ["GCS_BUCKET"])

async def upload_illustration(image_bytes, uid, story_id, page_num):
    blob_name = f"illustrations/{uid}/{story_id}/page_{page_num}.png"
    blob = bucket.blob(blob_name)
    blob.upload_from_string(image_bytes, content_type="image/png")
    blob.make_public()
    return blob.public_url
```

## localStorage Fallback (Frontend)

```typescript
const STORAGE_KEY = "writeacademy_story";

export function saveStoryState(state: StoryState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("story-updated", { detail: state }));
}

export function loadStoryState(): StoryState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

// Dual-write: always localStorage, try Firestore
export async function savePageDualWrite(page: StoryPage, firebaseOk: boolean) {
  const state = loadStoryState();
  if (state) {
    const idx = state.pages.findIndex(p => p.page_number === page.page_number);
    if (idx >= 0) state.pages[idx] = page; else state.pages.push(page);
    saveStoryState(state);
  }
  if (firebaseOk) {
    try { await fetch("/api/story/page", { method: "POST", body: JSON.stringify(page) }); }
    catch (e) { console.warn("Firestore failed, localStorage is truth", e); }
  }
}
```

## Key Rules

1. Firestore is source of truth when available. localStorage is fallback.
2. Never store image bytes in Firestore. Use Cloud Storage URLs.
3. revision_history is append-only. Push previous draft before overwriting.
4. style_anchor is set once on first illustration, never changes per StoryProject.
5. Page numbering starts at 1 (matches storybook metaphor).
6. Session records are write-once. Create after completion, never update.
