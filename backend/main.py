import os
import json
import asyncio
import io
import base64
import pathlib
from fastapi import FastAPI, HTTPException, Depends, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from dotenv import load_dotenv
import google.genai as genai

load_dotenv()

CACHE_DIR = pathlib.Path("lesson_cache")
CACHE_DIR.mkdir(exist_ok=True)

app = FastAPI(title="WriteAcademy Craft Coach API")

# --- Gemini Client Initialization ---
# Prefer API key for local dev; fall back to Vertex AI ADC on Cloud Run.
vertex_client = None
gemini_api_key = os.getenv("GEMINI_API_KEY")
project_id = os.getenv("GOOGLE_CLOUD_PROJECT")

if gemini_api_key:
    vertex_client = genai.Client(api_key=gemini_api_key)
    print("Gemini client initialized with API key.")
elif project_id:
    try:
        vertex_client = genai.Client(vertexai=True, project=project_id, location="us-central1")
        print("Gemini client initialized via Vertex AI.")
    except Exception as e:
        print(f"Warning: Failed to initialize Vertex AI client: {e}")
else:
    print("Warning: Neither GEMINI_API_KEY nor GOOGLE_CLOUD_PROJECT is set. Gemini endpoints will not work.")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WRITEACADEMY_API_KEY = os.getenv("WRITEACADEMY_API_KEY", "")

api_key_header = APIKeyHeader(name="X-API-Key")

async def get_api_key(api_key: str = Security(api_key_header)):
    """Dependency to check for a valid API key in the request header."""
    if not WRITEACADEMY_API_KEY or api_key != WRITEACADEMY_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API Key"
        )

class CraftDemoRequest(BaseModel):
    craft_technique: str
    context: str = ""


def mock_interleaved_blocks(craft_technique: str, context: str):
    technique = craft_technique.strip() or "suspense"
    blocks = [
        {
            "type": "text",
            "content": f"Let's explore how {technique} works in creative writing. This technique is one of the most powerful tools a writer has — when used well, it keeps readers turning pages and emotionally invested in the story.",
        },
        {
            "type": "passage",
            "content": f'The door at the end of the corridor stood slightly ajar. Sarah had counted seventeen steps to reach it, each one louder than the last on the warped floorboards. She pressed her palm flat against the wood. Inside, something shifted — a scrape of chair leg, or perhaps just the old house settling. She told herself it was the house.',
        },
        {
            "type": "annotation",
            "content": f"Notice how the writer withholds information rather than stating it directly. We never learn what's behind the door — the technique of {technique} lives in that gap between what the character knows and what the reader fears. The sensory details (the count of steps, the warped boards) slow the pacing deliberately, making each moment stretch.",
        },
        {
            "type": "text",
            "content": "The key levers at work here are: **information asymmetry** (the reader suspects more than the character admits), **pacing control** (short declarative sentences that slow time), and **the unreliable self-reassurance** ('she told herself') that signals the character's denial.",
        },
        {
            "type": "prompt",
            "content": f"Now try writing your own {technique}-charged opening. Place your character on the threshold of something — a room, a conversation, a decision. Give us three concrete sensory details. Then end with a sentence where the character actively avoids the obvious conclusion. Aim for 100–150 words.",
        },
    ]
    return blocks


async def stream_blocks(blocks: list):
    for block in blocks:
        yield json.dumps(block) + "\n"
        await asyncio.sleep(0.3)


@app.post("/craft-demo")
async def craft_demo(request: CraftDemoRequest, _: None = Depends(get_api_key)):
    blocks = mock_interleaved_blocks(request.craft_technique, request.context)

    return StreamingResponse(
        stream_blocks(blocks),
        media_type="application/x-ndjson",
        headers={"X-Content-Type-Options": "nosniff"},
    )


class BrainstormRequest(BaseModel):
    ideas: str

@app.post("/brainstorm")
async def brainstorm(request: BrainstormRequest, _: None = Depends(get_api_key)):
    """Expands on a user's brainstorming ideas using a Gemini text model."""
    if not vertex_client:
        raise HTTPException(status_code=500, detail="Gemini API not configured. Set GEMINI_API_KEY or GOOGLE_CLOUD_PROJECT.")

    model_name = "gemini-2.5-flash"
    prompt = f"""You are an encouraging and creative writing coach for children's storybooks. A student has provided their initial brainstorming notes. Your task is to help them expand on these ideas.

For each core idea, suggest a few potential characters, a simple conflict, and a unique setting. Keep your tone positive, whimsical, and inspiring. Frame your response to help the student see the possibilities.

Student's ideas:
---
{request.ideas}
---

Your creative expansion:"""

    async def stream_brainstorm():
        try:
            async for chunk in await vertex_client.aio.models.generate_content_stream(
                model=model_name,
                contents=prompt,
            ):
                if chunk.text:
                    yield json.dumps({"type": "text", "content": chunk.text}) + "\n"
                    await asyncio.sleep(0.02)
        except Exception as e:
            error_message = f"Error streaming from Gemini: {e}"
            print(error_message)
            yield json.dumps({"type": "error", "content": error_message}) + "\n"

    return StreamingResponse(
        stream_brainstorm(),
        media_type="application/x-ndjson",
        headers={"X-Content-Type-Options": "nosniff"},
    )


class VisualizeRequest(BaseModel):
    prompt: str

@app.post("/visualize")
async def visualize(request: VisualizeRequest, _: None = Depends(get_api_key)):
    """Generates an image from a prompt using the Gemini image generation model."""
    if not vertex_client:
        raise HTTPException(status_code=500, detail="Vertex AI client not configured for image generation.")

    model_name = "gemini-2.5-flash-image"  # "Nano Banana"
    image_prompt = f"""A vibrant and whimsical digital illustration for a children's storybook. The scene should be full of wonder and magic.

Scene description: "{request.prompt}"

Art style: Modern animated movie style (similar to Pixar or Dreamworks), with clean lines, rich textures, and saturated colors. The lighting should be soft and inviting. Do not include any text, letters, or watermarks.
"""

    try:
        response = vertex_client.models.generate_content(
            model=model_name,
            contents=image_prompt,
            config=genai.types.GenerateContentConfig(
                response_modalities=["IMAGE"],
            ),
        )

        image_part = next((part for part in response.candidates[0].content.parts if part.inline_data), None)

        if image_part is None:
            # Check for safety blocks or other reasons for no image
            if response.candidates[0].finish_reason.name == "SAFETY":
                raise HTTPException(status_code=400, detail="Image generation failed due to safety policies.")
            raise HTTPException(status_code=500, detail="Image generation failed, no image data in response.")

        image_bytes = image_part.inline_data.data
        return StreamingResponse(io.BytesIO(image_bytes), media_type="image/png")

    except Exception as e:
        print(f"Error during image generation: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred during image generation: {str(e)}")


# ─── ITS: Gibbs Reflective Cycle structured lesson ────────────────────────────

class StudentProfile(BaseModel):
    name: str = "Student"
    level: str = "beginner"
    genre_preference: str = "children's picture books"
    learning_style: str = "visual"
    tone_preference: str = "warm and encouraging"


class StructureLessonRequest(BaseModel):
    lesson_id: str
    lesson_title: str
    lesson_content: str
    craft_technique: str
    craft_context: str = ""
    student: StudentProfile = StudentProfile()


def get_cache_path(lesson_id: str) -> pathlib.Path:
    safe_id = "".join(c for c in lesson_id if c.isalnum() or c == "-")
    return CACHE_DIR / f"{safe_id}.json"


def load_from_cache(lesson_id: str) -> dict | None:
    path = get_cache_path(lesson_id)
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def save_to_cache(lesson_id: str, data: dict) -> None:
    get_cache_path(lesson_id).write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def generate_image_base64(prompt: str) -> str | None:
    """Generate an image via Gemini and return as a base64 data URL, or None on failure."""
    if not vertex_client or not prompt:
        return None
    try:
        response = vertex_client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=prompt,
            config=genai.types.GenerateContentConfig(response_modalities=["IMAGE"]),
        )
        image_part = next(
            (p for p in response.candidates[0].content.parts if p.inline_data), None
        )
        if not image_part:
            return None
        encoded = base64.b64encode(image_part.inline_data.data).decode("utf-8")
        return f"data:image/png;base64,{encoded}"
    except Exception as e:
        print(f"Image generation failed: {e}")
        return None


GIBBS_PROMPT = """You are an expert creative writing tutor for a children's storybook course.
Structure the lesson content below using the Gibbs Reflective Cycle, personalised for: {name} ({level} level, prefers {genre}, {style} learner, {tone} tone).

LESSON TITLE: {title}
CRAFT TECHNIQUE: {technique}
CRAFT CONTEXT: {context}
RAW LESSON CONTENT:
---
{content}
---

Return ONLY valid JSON (absolutely no markdown fences, no preamble) with this exact structure:
{{
  "modules": [
    {{"phase":"description","title":"What Is This Technique?","content":"2-3 paragraphs explaining the technique clearly. Use **bold** for key terms, and bullet points where helpful."}},
    {{"phase":"feelings","title":"Why Does This Matter?","content":"2 paragraphs on the emotional resonance — why readers and writers connect with this technique."}},
    {{"phase":"evaluation","title":"What Works — And What Doesn\u2019t?","content":"Strengths when done well, then the most common pitfalls for beginners. Use bullet points. Be specific."}},
    {{"phase":"analysis","title":"How Does It Work Mechanically?","content":"Use a numbered list to break down the mechanics step by step. Be precise and concrete. Each step on its own line starting with '1.', '2.', etc.","infographic_prompt":"Flat-design educational infographic on white background: the mechanics of '{technique}' in children\u2019s storybook writing. Clean icons, numbered steps, sans-serif labels, colourful, no photographs."}},
    {{"phase":"conclusion","title":"Key Takeaways","content":"A bullet-point list of 4-5 key things to remember, each starting with '- '. End with one inspiring closing sentence (not a bullet)."}},
    {{"phase":"action_plan","title":"Your Writing Exercise","content":"3 clear numbered steps for {name} to practise {technique}. Each step on its own line starting with '1.', '2.', '3.'. End with a blank line then a specific 100-150 word writing prompt (no bullet, just a paragraph).","illustration_prompt":"Whimsical children\u2019s storybook illustration, Pixar/Dreamworks style, cosy writing scene related to '{technique}'. Warm lighting, saturated colours, no text or watermarks in the image."}}
  ],
  "craft_blocks": [
    {{"type":"text","content":"1-2 sentences introducing what {technique} is in the context of children\u2019s storytelling."}},
    {{"type":"passage","content":"An original 3-5 sentence example passage demonstrating {technique} in a children\u2019s picture book story. Make it vivid and age-appropriate."}},
    {{"type":"annotation","content":"2-3 sentences explaining exactly what the passage above demonstrates about {technique}. Point to specific words or phrases. Use **bold** for key terms."}},
    {{"type":"text","content":"The key levers at work: **lever 1** — explanation. **lever 2** — explanation. **lever 3** — explanation."}},
    {{"type":"prompt","content":"A specific 100-150 word writing prompt for {name} to try {technique} right now. Give a concrete scenario and clear constraints."}}
  ],
  "reading_list": []
}}

READING LIST RULE: Always populate `reading_list` with 3-5 books. If the lesson content mentions specific books, include those first. Then add highly relevant children's picture books OR craft/writing books that best demonstrate or teach {technique}. Choose books that are well-known and genuinely excellent. Schema: {{"title":"...","author":"...","year":"YYYY","why":"One sentence on why this book is essential for a {level} learner studying {technique}."}}. The year field is the publication year as a 4-digit string."""


@app.post("/structure-lesson")
async def structure_lesson(
    request: StructureLessonRequest,
    _: None = Depends(get_api_key),
):
    """
    Returns a Gibbs Reflective Cycle structured lesson with AI-generated images.
    Results are cached to lesson_cache/{lesson_id}.json — only calls Gemini once per lesson.
    """
    cached = load_from_cache(request.lesson_id)
    if cached:
        return cached

    if not vertex_client:
        raise HTTPException(status_code=500, detail="Gemini API not configured. Set GEMINI_API_KEY.")

    s = request.student
    prompt = GIBBS_PROMPT.format(
        name=s.name,
        level=s.level,
        genre=s.genre_preference,
        style=s.learning_style,
        tone=s.tone_preference,
        title=request.lesson_title,
        technique=request.craft_technique,
        context=request.craft_context,
        content=request.lesson_content[:6000],
    )

    try:
        text_response = vertex_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
                max_output_tokens=8192,
            ),
        )
        gemini_data = json.loads(text_response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini text generation failed: {e}")

    modules = gemini_data.get("modules", [])

    # Extract image prompts from the two visual phases, generate images, embed as base64
    analysis_mod = next((m for m in modules if m.get("phase") == "analysis"), None)
    action_mod = next((m for m in modules if m.get("phase") == "action_plan"), None)
    infographic_prompt = (analysis_mod or {}).pop("infographic_prompt", "") or ""
    illustration_prompt = (action_mod or {}).pop("illustration_prompt", "") or ""

    infographic_b64 = generate_image_base64(infographic_prompt)
    illustration_b64 = generate_image_base64(illustration_prompt)

    for mod in modules:
        mod.pop("infographic_prompt", None)
        mod.pop("illustration_prompt", None)
        if mod.get("phase") == "analysis":
            mod["image_base64"] = infographic_b64
        elif mod.get("phase") == "action_plan":
            mod["image_base64"] = illustration_b64
        else:
            mod["image_base64"] = None

    result = {
        "lesson_id": request.lesson_id,
        "modules": modules,
        "craft_blocks": gemini_data.get("craft_blocks", []),
        "reading_list": gemini_data.get("reading_list", []),
    }
    save_to_cache(request.lesson_id, result)
    return result


# ─── ITS: Writing feedback ────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    draft_text: str
    writing_prompt: str
    craft_technique: str


@app.post("/feedback")
async def feedback(request: FeedbackRequest, _: None = Depends(get_api_key)):
    """
    Streams personalised writing feedback on a student's draft.
    Returns NDJSON text blocks (same format as /brainstorm).
    """
    if not vertex_client:
        raise HTTPException(status_code=500, detail="Gemini API not configured.")

    prompt = f"""You are a warm, encouraging creative writing coach reviewing a student's draft.

CRAFT TECHNIQUE BEING PRACTISED: {request.craft_technique}
ORIGINAL WRITING PROMPT: {request.writing_prompt}
STUDENT DRAFT:
---
{request.draft_text[:3000]}
---

Provide helpful feedback in this order:
1. Open with genuine, specific praise — identify 2-3 things they did well. Quote their actual words.
2. Offer 2 clear, actionable suggestions for improvement related to {request.craft_technique}.
3. Close with one encouraging sentence that motivates them to keep writing.

Keep your tone warm, specific, and constructive. Total response: 200-300 words."""

    async def stream_feedback():
        try:
            async for chunk in await vertex_client.aio.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=prompt,
            ):
                if chunk.text:
                    yield json.dumps({"type": "text", "content": chunk.text}) + "\n"
                    await asyncio.sleep(0.02)
        except Exception as e:
            yield json.dumps({"type": "error", "content": str(e)}) + "\n"

    return StreamingResponse(
        stream_feedback(),
        media_type="application/x-ndjson",
        headers={"X-Content-Type-Options": "nosniff"},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
