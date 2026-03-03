"""
WriteAcademy ITS v2.0 — Gemini Service
Single source of truth for all Gemini calls: skill detection, session planning,
illustration generation, and craft coach streaming feedback.

Follows patterns from skills/gemini-patterns.md.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
from typing import AsyncGenerator, Optional

import google.genai as genai
from google.genai import types
from pydantic import BaseModel

from models.schemas import (
    SkillAssessment,
    SkillLevel,
    TechniqueMode,
    SessionPlan,
    LearnerProfile,
    StoryProject,
)

# ─── Model names ──────────────────────────────────────────────────────────────
# Using tested model names from the existing integration.
TEXT_MODEL = "gemini-2.5-flash"
IMAGE_MODEL = "gemini-2.5-flash-image"

# ─── Client (lazy singleton) ──────────────────────────────────────────────────

_client: Optional[genai.Client] = None


def get_client() -> genai.Client:
    global _client
    if _client is not None:
        return _client
    api_key = os.getenv("GEMINI_API_KEY")
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    if api_key:
        _client = genai.Client(api_key=api_key)
        print("Gemini service: initialized with API key.")
    elif project_id:
        _client = genai.Client(
            vertexai=True, project=project_id, location="us-central1"
        )
        print("Gemini service: initialized via Vertex AI.")
    else:
        raise RuntimeError(
            "GEMINI_API_KEY or GOOGLE_CLOUD_PROJECT must be set."
        )
    return _client


# ─── Skill Assessment ─────────────────────────────────────────────────────────

# Intermediate schema for Gemini response (no datetime/enum fields that confuse schema gen)
class _SkillResult(BaseModel):
    dimension: str
    level: str       # "not_assessed" | "developing" | "competent" | "strong"
    evidence: str
    recommendation: str  # "full_lesson" | "compress" | "skip"


class _SkillsResponse(BaseModel):
    skills: list[_SkillResult]
    overall_level: str    # "beginner" | "intermediate" | "advanced"
    suggested_focus: str


_LEVEL_MAP = {
    "not_assessed": SkillLevel.NOT_ASSESSED,
    "developing": SkillLevel.DEVELOPING,
    "competent": SkillLevel.COMPETENT,
    "strong": SkillLevel.STRONG,
}
_REC_MAP = {
    "full_lesson": TechniqueMode.FULL,
    "compress": TechniqueMode.COMPRESS,
    "skip": TechniqueMode.SKIP,
}


async def assess_writing_sample(
    writing_sample: str,
    story_title: str,
    character_name: str,
) -> tuple[list[SkillAssessment], str, str]:
    """
    Analyze a writing sample across 5 craft dimensions.
    Returns (skills, overall_level, suggested_focus).
    Follows gemini-patterns.md Pattern 1.
    """
    client = get_client()
    prompt = f"""You are an expert children's book writing tutor.

Analyze this writing sample across exactly these 5 craft dimensions:
1. sensory_detail — use of sight, sound, touch, taste, smell in descriptions
2. character_voice — distinct personality and speech patterns
3. show_dont_tell — emotion conveyed through action/image rather than stated
4. story_structure — clear narrative movement, tension, forward momentum
5. visual_thinking — descriptions that naturally suggest illustrations

For each dimension return:
- dimension: the exact key from the list above
- level: "not_assessed" (too little evidence), "developing", "competent", or "strong"
- evidence: a verbatim short quote from the sample, or "No evidence found"
- recommendation: "full_lesson" if level is developing/not_assessed, "compress" if competent, "skip" if strong

Also return:
- overall_level: "beginner" (mostly developing), "intermediate" (mixed), or "advanced" (mostly competent/strong)
- suggested_focus: one sentence — the single most impactful coaching direction for THIS learner

Story context: opening of "{story_title}", featuring {character_name}.

Writing sample:
\"\"\"{writing_sample[:2000]}\"\"\"
"""
    response = await client.aio.models.generate_content(
        model=TEXT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=_SkillsResponse,
            temperature=0.3,
        ),
    )
    parsed = _SkillsResponse.model_validate_json(response.text)
    skills = [
        SkillAssessment(
            dimension=s.dimension,
            level=_LEVEL_MAP.get(s.level, SkillLevel.DEVELOPING),
            evidence=s.evidence,
            recommendation=_REC_MAP.get(s.recommendation, TechniqueMode.FULL),
        )
        for s in parsed.skills
    ]
    return skills, parsed.overall_level, parsed.suggested_focus


# ─── Session Plan Generation ──────────────────────────────────────────────────

_SESSION_BEATS: dict[int, tuple[str, str, list[int]]] = {
    1: (
        "The Opening",
        "Introduce your character and the world they live in. Establish voice, setting, and the first hint of what drives the story.",
        [1, 2, 3],
    ),
    2: (
        "The Problem",
        "Your character discovers a challenge, desire, or mystery that demands action. The story engine starts.",
        [4, 5, 6],
    ),
    3: (
        "The Journey",
        "Your character tries, stumbles, and grows. The emotional heart of the book.",
        [7, 8, 9],
    ),
    4: (
        "The Resolution",
        "Your character finds their answer. The final image — the one that lingers.",
        [10, 11, 12],
    ),
}

# Intermediate schema for session plan (avoids enum serialization issues)
class _TechniqueResult(BaseModel):
    name: str
    mode: str   # "full" | "compress" | "skip"
    reason: str


class _SessionPlanResult(BaseModel):
    title: str
    story_beat: str
    wonder_prompt: str
    wonder_example: str
    build_instructions: str
    page_prompts: list[str] = []   # one per target page
    reflect_preview: str
    techniques: list[_TechniqueResult]


async def generate_session_plan(
    profile: LearnerProfile,
    story: StoryProject,
    session_number: int,
) -> SessionPlan:
    """
    Generate an adaptive session plan based on the learner's skill profile.
    Follows gemini-patterns.md Pattern 4.
    """
    client = get_client()
    beat_title, beat_desc, target_pages = _SESSION_BEATS.get(
        session_number, _SESSION_BEATS[1]
    )

    skills_summary = "\n".join(
        f"  - {k.replace('_', ' ')}: {v.value}"
        for k, v in profile.skill_levels.items()
    )
    completed = (
        ", ".join(profile.completed_techniques) if profile.completed_techniques else "none yet"
    )

    prompt = f"""You are planning session {session_number} of 4 for a children's storybook writing course.

LEARNER: {profile.display_name}
LEVEL: {profile.style_preferences.get('tone', 'warm')} learner
SKILL LEVELS:
{skills_summary}
COMPLETED TECHNIQUES: {completed}

STORY: "{story.title}"
PREMISE: {story.premise}
CHARACTER: {story.character_name} — {story.character_description}
WORLD: {story.world_description}
TARGET AGE: {story.target_age}

SESSION {session_number} — "{beat_title}": {beat_desc}
TARGET PAGES TO WRITE THIS SESSION: pages {target_pages}

ADAPTIVE RULES (follow exactly):
- mode "skip" if skill is "strong" — learner already demonstrates it; apply directly
- mode "compress" if skill is "competent" — brief reminder, then apply
- mode "full" if skill is "developing" or "not_assessed" — full lesson

Generate a session plan with these exact fields:

title: Use "{beat_title}"

story_beat: One vivid sentence describing what must happen in {story.title} this session.

techniques: 2-3 most relevant techniques for this session beat, with adaptive mode and reason.
Use only these technique names: sensory_detail, character_voice, show_dont_tell, story_structure, visual_thinking.

wonder_prompt: An emotionally engaging opening question that surfaces the FEELING of the technique before naming it.
NEVER start with "Today we learn..." — start with an example or question.
Example of good wonder_prompt: "Read this passage. What did it just do to you? Why did one simple image stop you cold?"

wonder_example: A real 2-4 sentence passage from a published children's picture book that beautifully demonstrates the session's key technique. Always include (Author, Title).

build_instructions: ONE sentence of general writing guidance for the session. Mention {story.character_name} and the story beat. This is the fallback shown if page_prompts aren't available.

page_prompts: An array of exactly {len(target_pages)} writing prompts, one per page in order {target_pages}.
Each prompt must:
- Be 1-3 sentences, concrete and story-specific
- Reference {story.character_name} by name and a specific detail from this story
- Tell the learner exactly what MOMENT or BEAT to write on this particular page
- Follow the within-session arc: first page sets up, middle develops, last page turns
Example format: ["Write the moment {story.character_name} first sees X — what does she notice first?", "Now {story.character_name} tries to Y but something goes wrong. Write that exact moment.", "Everything changes when {story.character_name} discovers Z. Write the turn."]

reflect_preview: A story-specific cliffhanger that makes the learner desperate to return for Session {session_number + 1}. Reference their actual story and character — never generic. ~30 words.
"""
    response = await client.aio.models.generate_content(
        model=TEXT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=_SessionPlanResult,
            temperature=0.5,
        ),
    )
    raw = _SessionPlanResult.model_validate_json(response.text)

    _mode_map = {"full": TechniqueMode.FULL, "compress": TechniqueMode.COMPRESS, "skip": TechniqueMode.SKIP}
    from models.schemas import TechniqueAdaptation
    techniques = [
        TechniqueAdaptation(
            name=t.name,
            mode=_mode_map.get(t.mode, TechniqueMode.FULL),
            reason=t.reason,
        )
        for t in raw.techniques
    ]

    # Trim/pad page_prompts to exactly the right count
    page_prompts = list(raw.page_prompts or [])[:len(target_pages)]

    return SessionPlan(
        session_number=session_number,
        title=raw.title,
        story_beat=raw.story_beat,
        target_pages=target_pages,
        techniques=techniques,
        wonder_prompt=raw.wonder_prompt,
        wonder_example=raw.wonder_example,
        build_instructions=raw.build_instructions,
        page_prompts=page_prompts,
        reflect_preview=raw.reflect_preview,
    )


# ─── Illustration Generation ──────────────────────────────────────────────────

async def _extract_visual_bible(
    page_text: str,
    character_name: str,
    character_description: str,
    world_description: str,
    title: str,
) -> tuple[list[str], list[str]]:
    """
    After the first page is illustrated, extract a full visual bible covering
    ALL characters (main + secondary) and the environment. This becomes the locked
    reference injected into every subsequent illustration prompt.
    Returns (character_notes, environment_notes).
    """
    client = get_client()
    prompt = f"""A children's picture book called "{title}" has just had its first page illustrated.

Main character: {character_name}: {character_description}
World/setting: {world_description}

Page 1 scene text: "{page_text[:500]}"

Produce TWO sections with clear headers.

SECTION 1 — CHARACTER VISUAL BIBLE
For EVERY character mentioned or implied (main character, pets, friends, family, animals):
Group bullets under each character's name. Per character:
- Physical features: age-range, height/build, skin tone, hair colour + style
- Eyes: colour, shape, default expression
- Clothing always worn: each item with specific colour (e.g. "red striped pyjamas with white buttons")
- One signature accessory or prop (invent if needed)
- One visual signature for instant recognition
4-5 bullets per character. ≤ 20 words each. Be SPECIFIC about colours ("dusty rose" not "pink").

SECTION 2 — ENVIRONMENT VISUAL BIBLE
Lock these for the ENTIRE book:
- Season and weather (e.g. "late autumn, overcast with golden light breaking through")
- Time period and lighting (e.g. "warm afternoon sunlight, long shadows")
- Dominant colour palette (e.g. "warm ambers, forest greens, dusty blues")
- Architectural/natural style (e.g. "hand-drawn cottage with thatched roof, gnarled oak trees")
- One signature environmental detail that recurs in every scene
Exactly 5 bullets, ≤ 20 words each."""

    try:
        response = await client.aio.models.generate_content(
            model=TEXT_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2),
        )
        text = response.text

        char_notes: list[str] = []
        env_notes: list[str] = []
        current_section = "char"

        for line in text.splitlines():
            stripped = line.strip().lstrip("•-*·1234567890.#").strip()
            if not stripped or len(stripped) < 10:
                continue
            lower = stripped.lower()
            if "environment" in lower and ("bible" in lower or "visual" in lower or "section" in lower):
                current_section = "env"
                continue
            if "character" in lower and ("bible" in lower or "visual" in lower or "section" in lower):
                current_section = "char"
                continue
            if current_section == "char":
                char_notes.append(stripped)
            else:
                env_notes.append(stripped)

        char_notes = char_notes[:12] if char_notes else [f"{character_name}: {character_description}"]
        env_notes = env_notes[:6] if env_notes else [f"Setting: {world_description}"]
        return char_notes, env_notes

    except Exception as e:
        print(f"[gemini_service] Visual bible extraction failed: {e}")
        return [f"{character_name}: {character_description}"], [f"Setting: {world_description}"]


async def generate_illustration(
    page_text: str,
    title: str,
    character_name: str,
    character_description: str,
    world_description: str,
    style_anchor: Optional[str] = None,
    character_visual_notes: Optional[list[str]] = None,
    environment_visual_notes: Optional[list[str]] = None,
    reference_images_b64: Optional[list[str]] = None,
    adjustment_notes: Optional[str] = None,
) -> tuple[str, str, list[str], list[str]]:
    """
    Generate a storybook page illustration.
    Returns (base64_data_url, style_anchor, character_notes, environment_notes).

    Consistency strategy (three layers):
    1. Character bible: all characters (main + secondary) extracted after page 1.
    2. Environment bible: season, weather, lighting, palette locked after page 1.
    3. Reference images: page 1 (style anchor) + most recent page (visual continuity).
    """
    char_notes = list(character_visual_notes or [])
    env_notes = list(environment_visual_notes or [])

    # Character context: use the locked visual sheet if available
    if char_notes:
        char_context = (
            f"CHARACTER BIBLE — follow exactly for ALL characters:\n"
            + "\n".join(f"  • {n}" for n in char_notes)
        )
    else:
        char_context = f"{character_name}: {character_description}"

    # Environment context
    if env_notes:
        env_context = (
            "ENVIRONMENT BIBLE — follow exactly for EVERY scene:\n"
            + "\n".join(f"  • {n}" for n in env_notes)
        )
    else:
        env_context = f"WORLD / SETTING: {world_description}"

    if style_anchor:
        style_directive = (
            f"ILLUSTRATION STYLE (locked — must match all pages):\n{style_anchor}"
        )
    else:
        style_directive = (
            "ILLUSTRATION STYLE: Warm, modern children's picture book. "
            "Soft lighting, rich saturated colours, clean 2D illustrative lines. "
            "Pixar/Dreamworks energy rendered as a flat picture book. "
            "This exact style MUST carry across every page of the book."
        )

    ref_images = [img for img in (reference_images_b64 or []) if img]
    if len(ref_images) >= 2:
        reference_note = (
            "STYLE REFERENCES: Two reference images are attached.\n"
            "Image 1 is page 1 — ABSOLUTE GROUND TRUTH. Character design, art style, line weight, "
            "colour saturation, and rendering technique MUST match this image exactly. It wins ALL ties.\n"
            "Image 2 is the most recent page — match its visual continuity for scene flow (secondary reference).\n\n"
        )
    elif len(ref_images) == 1:
        reference_note = (
            "STYLE REFERENCE: The attached image is page 1 of this book — ABSOLUTE GROUND TRUTH. "
            "Match the character appearance, colour palette, rendering technique, and illustration style exactly.\n\n"
        )
    else:
        reference_note = ""

    adjustment_note = (
        f"\nSPECIFIC CHANGE REQUESTED BY THE LEARNER: {adjustment_notes}\n"
        "Apply this change precisely while keeping ALL other character, style, and composition elements identical to the established look.\n"
        if adjustment_notes
        else ""
    )

    prompt = f"""{reference_note}Illustrate one page from the children's picture book "{title}".

{style_directive}

── WHAT MUST STAY THE SAME (locked for entire book) ──

{char_context}

{env_context}

── WHAT CHANGES THIS PAGE (unique to this scene) ──

SCENE TO ILLUSTRATE:
\"\"\"{page_text[:600]}\"\"\"{adjustment_note}

COMPOSITION DIRECTION:
- Show a DIFFERENT framing than the previous page: vary between close-up, mid-shot, wide establishing shot, over-the-shoulder, bird's-eye, or ground-level angle
- The SETTING within the scene should evolve (different room, outdoor vs indoor, new location) while the ENVIRONMENT style (lighting, palette, season) stays locked
- Characters must be recognisable instantly by face, hair, outfit — but their POSE, EXPRESSION, and ACTION must be unique to this moment

REQUIREMENTS (non-negotiable):
- ALL characters must match the CHARACTER BIBLE precisely — same face, hair, clothes, accessory every page
- Season, weather, time of day, and colour palette MUST match the ENVIRONMENT BIBLE exactly
- If reference images are attached, treat page 1 as ABSOLUTE ground truth for character appearance
- Warm, age-appropriate imagery with compositional breathing room (especially bottom third)
- No embedded text, letters, numbers, watermarks, or speech bubbles
- Full-bleed illustration suitable for a picture book spread"""

    result = await asyncio.to_thread(
        _sync_generate_illustration, prompt, ref_images or None
    )
    if result is None:
        raise ValueError("Illustration generation failed — no image data in response")

    data_url = f"data:image/png;base64,{result}"

    # Build style anchor on first call; carry it forward unchanged on subsequent calls
    new_anchor = style_anchor or (
        f"Warm 2D picture book style for '{title}'. "
        f"Soft lighting, rich saturated colours, clean 2D illustrative lines. "
        f"Character: {character_name} — {character_description}. "
        f"World: {world_description}. "
        f"Consistent look across all 12 pages."
    )

    # Extract full visual bible after the first illustration (when notes are empty)
    if not char_notes:
        char_notes, env_notes = await _extract_visual_bible(
            page_text=page_text,
            character_name=character_name,
            character_description=character_description,
            world_description=world_description,
            title=title,
        )

    return data_url, new_anchor, char_notes, env_notes


def _sync_generate_illustration(
    prompt: str,
    reference_images_b64: Optional[list[str]] = None,
) -> Optional[str]:
    """
    Synchronous image generation — run via asyncio.to_thread to avoid blocking.
    When reference_images_b64 is supplied, attempts a multimodal request with
    one or more reference images so Gemini can see the established character design.
    Falls back to text-only generation if multimodal fails.
    """
    try:
        client = get_client()

        contents: object = prompt  # default: plain string

        if reference_images_b64:
            try:
                image_parts: list = []
                for img_b64 in reference_images_b64:
                    raw_b64 = img_b64
                    if raw_b64.startswith("data:"):
                        raw_b64 = raw_b64.split(",", 1)[1]
                    image_bytes = base64.b64decode(raw_b64)
                    try:
                        part = types.Part.from_bytes(data=image_bytes, mime_type="image/png")
                    except AttributeError:
                        part = types.Part(
                            inline_data=types.Blob(data=image_bytes, mime_type="image/png")
                        )
                    image_parts.append(part)

                contents = image_parts + [types.Part(text=prompt)]
            except Exception as prep_err:
                print(f"[gemini_service] Reference image prep failed: {prep_err} — using text-only")
                contents = prompt

        response = client.models.generate_content(
            model=IMAGE_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
            ),
        )
        image_part_resp = next(
            (p for p in response.candidates[0].content.parts if p.inline_data),
            None,
        )
        if not image_part_resp:
            return None
        return base64.b64encode(image_part_resp.inline_data.data).decode("utf-8")

    except Exception as e:
        print(f"[gemini_service] Illustration failed: {e}")
        if reference_images_b64:
            print("[gemini_service] Retrying without reference images (text-only)…")
            return _sync_generate_illustration(prompt, None)
        return None


# ─── Craft Coach Streaming Feedback ──────────────────────────────────────────

async def stream_coach_feedback(
    draft_text: str,
    technique: str,
    page_number: int,
    story_title: str,
    prior_pages: list[dict],
) -> AsyncGenerator[str, None]:
    """
    Stream Craft Coach feedback in NDJSON format: {"type": "text", "content": "..."}.
    References the learner's prior pages to surface genuine growth.
    Follows gemini-patterns.md Pattern 2.
    """
    client = get_client()
    prior_summary = (
        "\n".join(
            f"Page {p.get('page_number', '?')}: "
            f"{str(p.get('text_draft', ''))[:200]}…"
            for p in (prior_pages or [])[-3:]
        )
        or "This is page 1 — no prior pages yet."
    )
    technique_label = technique.replace("_", " ")

    prompt = f"""You are a warm, encouraging children's book writing coach.

The student is writing "{story_title}", currently working on page {page_number}.
Session technique: {technique_label}

Story so far (last 3 pages):
{prior_summary}

Current page {page_number} draft:
\"\"\"{draft_text[:2000]}\"\"\"

Give feedback in this exact order:
1. ONE sentence of specific praise — quote their actual words. Be genuine, not generic.
2. ONE concrete suggestion to strengthen {technique_label} in this specific page. Be actionable.
3. If prior pages exist, notice ONE specific way this page shows growth. Make it real.
4. ONE short encouraging sentence to keep them writing.

Tone: warm, specific, like a trusted mentor who has read every page. Total: 100–150 words."""

    try:
        async for chunk in await client.aio.models.generate_content_stream(
            model=TEXT_MODEL,
            contents=prompt,
        ):
            if chunk.text:
                yield json.dumps({"type": "text", "content": chunk.text}) + "\n"
                await asyncio.sleep(0.01)
    except Exception as e:
        yield json.dumps({"type": "error", "content": str(e)}) + "\n"


# ─── Session Feedback (Gibbs Reflective Cycle) ──────────────────────────────

class _GibbsPhaseResult(BaseModel):
    phase: str
    title: str
    content: str


class _SessionFeedbackResult(BaseModel):
    phases: list[_GibbsPhaseResult]
    overall_summary: str


async def generate_session_feedback(
    pages: list[dict],
    techniques: list[str],
    story_title: str,
    session_number: int,
    learner_name: str,
) -> _SessionFeedbackResult:
    """
    Generate holistic Gibbs-cycle feedback on all pages written in a session.
    Returns structured feedback across 6 Gibbs phases.
    """
    client = get_client()
    pages_text = "\n\n".join(
        f"Page {p.get('page_number', '?')}:\n{str(p.get('text_draft', ''))[:400]}"
        for p in pages
    )
    techniques_str = ", ".join(t.replace("_", " ") for t in techniques) or "general craft"

    prompt = f"""You are a warm, perceptive children's book writing coach giving end-of-session feedback to {learner_name}.

They just completed Session {session_number} of their storybook "{story_title}".
Techniques practised this session: {techniques_str}

Pages written this session:
{pages_text}

Provide feedback structured as the 6 phases of the Gibbs Reflective Cycle.
For each phase, write 2-3 sentences. Quote their actual words where possible.

1. phase: "description", title: "Your Story This Session"
   Summarise the narrative arc they built — what happened in the story across these pages.

2. phase: "feelings", title: "The Emotional Journey"
   Describe the emotional experience a reader would have reading these pages. What feelings did the writing evoke?

3. phase: "evaluation", title: "What Worked Brilliantly"
   Identify 2-3 specific strengths. Quote their actual words. Be genuine, not generic.

4. phase: "analysis", title: "Craft Techniques in Action"
   Show how they applied {techniques_str}. Point to specific moments. Explain the mechanics.

5. phase: "conclusion", title: "Key Growth Moments"
   What did they learn or demonstrate in this session? What's developing?

6. phase: "action_plan", title: "Next Steps"
   Give 2 concrete, actionable suggestions for their next session. Be specific to their story.

Also provide an overall_summary: one encouraging sentence (≤ 25 words) that captures their progress."""

    response = await client.aio.models.generate_content(
        model=TEXT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=_SessionFeedbackResult,
            temperature=0.5,
        ),
    )
    return _SessionFeedbackResult.model_validate_json(response.text)
