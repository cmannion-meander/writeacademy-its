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
    pages: list[ExportPageData] = Field(min_length=1)


# ─── PDF builder ──────────────────────────────────────────────────────────────

class StorybookPDF(FPDF):
    """Custom FPDF subclass for storybook layout."""

    def __init__(self, title: str, author: str):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.title = title
        self.author = author
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
        self.multi_cell(w - margin * 2, 6, text, align="L")

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
    Accepts story data + pages inline from the frontend.
    Returns application/pdf — the frontend triggers a file download.
    """
    if not _FPDF_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="fpdf2 is not installed. Run: pip install fpdf2",
        )

    pdf = StorybookPDF(title=request.title, author=request.author_name)

    for page in sorted(request.pages, key=lambda p: p.page_number):
        pdf.add_story_page(
            page_number=page.page_number,
            text=page.text_draft,
            illustration_b64=page.illustration_b64,
        )

    pdf.add_back_cover()

    pdf_bytes = pdf.output()
    filename = request.title.replace(" ", "-").lower()[:50] + ".pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )
