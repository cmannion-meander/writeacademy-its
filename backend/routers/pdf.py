"""
POST /story/export — Export a storybook as a PDF.

Accepts the story title, author name, and pages with illustrations inline
from the frontend (no dependency on backend filesystem).

Uses fpdf2 to generate a portrait A4 PDF with:
  - Cover page: title + author name
  - One spread per completed page: illustration (full-width) + page text below
  - Back cover: "The End" + WriteAcademy watermark
"""

from __future__ import annotations

import base64
import io
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from auth import get_api_key
from services import story_service

router = APIRouter(tags=["export"])

# fpdf2 is a soft dependency — gracefully handle if not installed
try:
    from fpdf import FPDF
    _FPDF_AVAILABLE = True
except ImportError:
    _FPDF_AVAILABLE = False


# ─── Request model ────────────────────────────────────────────────────────────

class ExportPageData(BaseModel):
    page_number: int
    text_draft: str
    illustration_b64: Optional[str] = None


class ExportRequest(BaseModel):
    title: str
    author_name: str = "A Young Author"
    # Option A: pages with inline illustrations (legacy, can hit size limits)
    pages: list[ExportPageData] = Field(default_factory=list)
    # Option B: uid + story_id — backend loads illustrations from disk (preferred)
    uid: Optional[str] = None
    story_id: Optional[str] = None


# ─── Text sanitiser (Helvetica is latin-1 only) ─────────────────────────────

_UNICODE_MAP = str.maketrans({
    "\u2014": "--",   # em dash
    "\u2013": "-",    # en dash
    "\u2018": "'",    # left single quote
    "\u2019": "'",    # right single quote / apostrophe
    "\u201C": '"',    # left double quote
    "\u201D": '"',    # right double quote
    "\u2026": "...",  # ellipsis
    "\u00A0": " ",    # non-breaking space
    "\u2022": "-",    # bullet
    "\u00B7": "-",    # middle dot
})


def _sanitize(text: str) -> str:
    """Replace common Unicode chars with latin-1 safe equivalents."""
    text = text.translate(_UNICODE_MAP)
    return text.encode("latin-1", errors="replace").decode("latin-1")


# ─── PDF builder ──────────────────────────────────────────────────────────────

class StorybookPDF(FPDF):
    """Custom FPDF subclass for storybook layout."""

    def __init__(self, title: str, author: str):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.title = _sanitize(title)
        self.author = _sanitize(author)
        self.set_auto_page_break(auto=False)
        self.add_page()
        self._draw_cover()

    def _draw_cover(self) -> None:
        w, h = self.w, self.h

        self.set_fill_color(254, 243, 226)  # #fef3e2
        self.rect(0, 0, w, h, "F")

        self.set_font("Helvetica", "B", 28)
        self.set_text_color(17, 24, 39)
        self.set_y(h * 0.30)
        self.multi_cell(w, 12, self.title, align="C")

        self.set_font("Helvetica", "", 13)
        self.set_text_color(107, 114, 128)
        self.set_y(self.get_y() + 8)
        self.multi_cell(w, 8, f"Written and illustrated by {self.author}", align="C")

        self.set_draw_color(245, 158, 66)
        self.set_line_width(0.8)
        self.line(w * 0.25, self.get_y() + 6, w * 0.75, self.get_y() + 6)

        self.set_font("Helvetica", "", 9)
        self.set_text_color(156, 163, 175)
        self.set_y(h - 20)
        self.multi_cell(w, 5, "Created with WriteAcademy · Powered by Gemini", align="C")

    def add_story_page(
        self,
        page_number: int,
        text: str,
        illustration_b64: str | None,
    ) -> None:
        self.add_page()
        w, h = self.w, self.h
        margin = 14.0

        self.set_fill_color(255, 255, 255)
        self.rect(0, 0, w, h, "F")

        # Page number
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(156, 163, 175)
        self.set_xy(margin, 8)
        self.cell(20, 5, f"p. {page_number}", align="L")

        # Illustration — top 56%
        img_area_h = h * 0.56
        img_area_y = 14.0

        if illustration_b64:
            try:
                raw = illustration_b64
                if raw.startswith("data:"):
                    raw = raw.split(",", 1)[1]
                img_bytes = base64.b64decode(raw)
                img_buf = io.BytesIO(img_bytes)
                self.image(
                    img_buf,
                    x=margin,
                    y=img_area_y,
                    w=w - margin * 2,
                    h=img_area_h,
                    keep_aspect_ratio=True,
                )
            except Exception:
                self.set_fill_color(254, 243, 226)
                self.rect(margin, img_area_y, w - margin * 2, img_area_h, "F")
        else:
            self.set_fill_color(254, 243, 226)
            self.rect(margin, img_area_y, w - margin * 2, img_area_h, "F")

        # Text below illustration — preserve paragraph breaks
        text_y = img_area_y + img_area_h + 6
        self.set_xy(margin, text_y)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(31, 41, 55)
        self.multi_cell(w - margin * 2, 6, _sanitize(text), align="L")

    def add_back_cover(self) -> None:
        self.add_page()
        w, h = self.w, self.h

        self.set_fill_color(254, 243, 226)
        self.rect(0, 0, w, h, "F")

        self.set_font("Helvetica", "BI", 36)
        self.set_text_color(245, 158, 66)
        self.set_y(h * 0.40)
        self.multi_cell(w, 16, "The End.", align="C")

        self.set_font("Helvetica", "", 10)
        self.set_text_color(156, 163, 175)
        self.set_y(h - 22)
        self.multi_cell(w, 5, "WriteAcademy · writeacademy.com", align="C")


# ─── Route ────────────────────────────────────────────────────────────────────

@router.post("/story/export")
async def export_story(
    request: ExportRequest,
    _: None = Depends(get_api_key),
) -> StreamingResponse:
    """
    Export completed pages as a PDF storybook.

    Two modes:
    - **Server-side** (preferred): pass `uid` + `story_id` — the backend loads
      pages and illustrations from disk.  Avoids huge request bodies.
    - **Inline** (legacy): pass `pages` with `illustration_b64` embedded.

    Returns application/pdf — the frontend triggers a file download.
    """
    if not _FPDF_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="fpdf2 is not installed. Run: pip install fpdf2",
        )

    # Resolve pages — prefer server-side loading when uid + story_id are given
    export_pages: list[ExportPageData] = []

    if request.uid and request.story_id:
        # Load from disk (includes illustrations — no size limit in request)
        disk_pages = story_service.get_all_pages(
            request.uid, request.story_id, exclude_illustrations=False,
        )
        if not disk_pages:
            raise HTTPException(status_code=404, detail="No pages found for this story")
        for p in disk_pages:
            export_pages.append(ExportPageData(
                page_number=p.page_number,
                text_draft=p.text_draft,
                illustration_b64=p.illustration_b64,
            ))
    elif request.pages:
        export_pages = request.pages
    else:
        raise HTTPException(status_code=400, detail="Provide uid + story_id, or pages inline")

    try:
        pdf = StorybookPDF(title=request.title, author=request.author_name)

        for page in sorted(export_pages, key=lambda p: p.page_number):
            pdf.add_story_page(
                page_number=page.page_number,
                text=page.text_draft,
                illustration_b64=page.illustration_b64,
            )

        pdf.add_back_cover()
        pdf_bytes = pdf.output()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    filename = request.title.replace(" ", "-").lower()[:50] + ".pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )
