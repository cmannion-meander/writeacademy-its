import os
import json
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="WriteAcademy Craft Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WRITEACADEMY_API_KEY = os.getenv("WRITEACADEMY_API_KEY", "")


class CraftDemoRequest(BaseModel):
    craft_technique: str
    context: str = ""
    api_key: str


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
async def craft_demo(request: CraftDemoRequest):
    if not WRITEACADEMY_API_KEY or request.api_key != WRITEACADEMY_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    blocks = mock_interleaved_blocks(request.craft_technique, request.context)

    return StreamingResponse(
        stream_blocks(blocks),
        media_type="application/x-ndjson",
        headers={"X-Content-Type-Options": "nosniff"},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
