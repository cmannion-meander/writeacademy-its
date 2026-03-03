# Gemini API Patterns — WriteAcademy ITS

## When to Use
Any task that calls Gemini 2.5 Flash for text generation, structured JSON output, or image generation. Covers: session planning, skill detection, craft coaching, lesson generation, illustration.

## SDK Setup (Python — FastAPI backend)

```python
from google import genai
from google.genai import types
import os

client = genai.Client(
    api_key=os.environ["GEMINI_API_KEY"],  # Cloud Run: use Secret Manager
)
MODEL = "gemini-2.5-flash-preview-05-20"
IMAGE_MODEL = "gemini-2.5-flash-preview-image-generation"
```

## Pattern 1: Structured JSON Output (Session Plans, Skill Detection)

Use response_mime_type with response_schema for typed data endpoints.

```python
from pydantic import BaseModel
from typing import List

class SkillAssessment(BaseModel):
    dimension: str          # e.g. "sensory_detail", "character_voice"
    level: str              # "strong", "developing", "not_observed"
    evidence: str           # quote from writing sample
    recommendation: str     # "skip", "compress", "full_lesson"

class OnboardingResult(BaseModel):
    skills: List[SkillAssessment]
    suggested_session_plan: str
    overall_level: str

async def assess_skills(writing_sample: str, student_profile: dict) -> OnboardingResult:
    response = client.models.generate_content(
        model=MODEL,
        contents=f"""Analyze this writing sample from a student learning children's picture books.
Student profile: {student_profile}
Writing sample: \"\"\"{writing_sample}\"\"\"
Assess: sensory_detail, character_voice, show_dont_tell, story_structure, visual_thinking.""",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=OnboardingResult,
            temperature=0.3,
        ),
    )
    return OnboardingResult.model_validate_json(response.text)
```

## Pattern 2: Streaming Text (Craft Coach, Lesson Content)

```python
async def stream_coach_feedback(draft_text, technique, story_context, prior_pages):
    prior_summary = "\n".join(f"Page {p['number']}: {p['text'][:200]}..." for p in prior_pages)
    response = client.models.generate_content_stream(
        model=MODEL,
        contents=f"""You are a warm children's book writing coach.
Student is on page {story_context['current_page']} of "{story_context['title']}".
Technique: {technique}
Story so far: {prior_summary}
Draft: \"\"\"{draft_text}\"\"\"
Give brief encouraging feedback (2-3 sentences). Suggest where to apply {technique}. Reference earlier pages to show growth.""",
        config=types.GenerateContentConfig(temperature=0.7),
    )
    for chunk in response:
        if chunk.text:
            yield chunk.text
```

## Pattern 3: Image Generation (Illustrations)

Maintain style consistency using a style anchor from page 1.

```python
async def generate_illustration(page_text, story_project, style_anchor, character_descriptions):
    char_desc = "\n".join(character_descriptions) or "No characters established yet."
    prompt = f"""Create a children's picture book illustration in this style: {style_anchor}
Characters (consistent appearance): {char_desc}
Scene: \"\"\"{page_text}\"\"\"
Requirements: warm children's book style, consistent characters, space for text overlay, no text in image, soft lighting."""

    response = client.models.generate_content(
        model=IMAGE_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
            temperature=0.8,
        ),
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.mime_type.startswith("image/"):
            return part.inline_data.data
    raise ValueError("No image generated")
```

## Pattern 4: Session Plan Generation

```python
class SessionPlan(BaseModel):
    session_number: int
    title: str
    story_beat: str
    target_pages: list[int]
    techniques: list[dict]    # [{name, mode: "full"|"compress"|"skip", reason}]
    wonder_prompt: str        # Act 1 opening
    build_instructions: str   # Act 2 writing prompt
    reflect_preview: str      # Act 3 next-session hook

async def generate_session_plan(learner_profile, story_arc, session_number):
    response = client.models.generate_content(
        model=MODEL,
        contents=f"""Plan session {session_number}/4 for children's storybook writing.
Learner: {learner_profile}
Story so far: {story_arc}
Structure: Wonder (5min) -> Build (15min) -> Reflect (5min).
Target: ~3 story pages. Adapt techniques to learner's demonstrated skills.
Make wonder_prompt emotionally engaging. Make reflect_preview a cliffhanger.""",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=SessionPlan,
            temperature=0.5,
        ),
    )
    return SessionPlan.model_validate_json(response.text)
```

## Key Rules

1. **Always use structured output** for data the frontend parses. Never regex JSON from free text.
2. **Temperature:** 0.2-0.3 assessment, 0.5 planning, 0.7 coaching, 0.8 illustrations.
3. **Style anchor:** First illustration also generates a style description. Store in StoryProject.style_anchor. Include in all subsequent illustration prompts.
4. **Character accumulation:** After each illustration, update character visual descriptions. Pass all to subsequent calls.
5. **Error handling:** try/except all Gemini calls. Image failures: retry with simplified prompt. Text failures: graceful fallback.
6. **Caching:** Cache lessons/plans by (id, skill_hash). Never cache coaching (must be contextual). Cache illustrations by (page_id, draft_hash).
7. **Concurrency:** asyncio.gather() for illustration + coach feedback simultaneously.
