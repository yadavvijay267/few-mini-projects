"""Tests for pdf_tool.py — real PDFs are generated with reportlab, then
merged, split, rotated, watermarked and text-extracted."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import pdf_tool as pt
from pypdf import PdfReader


def make_pdf(path, title):
    pt.make_sample_pdf(path, title, [f"Body text of {title}."])


def test_merge_two_pdfs(tmp_path):
    a, c = tmp_path / "a.pdf", tmp_path / "b.pdf"
    make_pdf(a, "Doc A")
    make_pdf(c, "Doc B")
    out = tmp_path / "merged.pdf"
    assert pt.merge_pdfs([a, c], out) == 2
    assert len(PdfReader(str(out)).pages) == 2


def test_split_by_page_range(tmp_path):
    src = tmp_path / "src.pdf"
    make_pdf(src, "One")
    out = tmp_path / "merged.pdf"
    pt.merge_pdfs([src, src, src], out)
    made = pt.split_pdf(out, pt.parse_pages("2-3", 3), tmp_path / "parts")
    assert len(made) == 2
    assert all(p.exists() for p in made)
    assert len(PdfReader(str(made[0])).pages) == 1


def test_parse_pages():
    assert pt.parse_pages("1-3,5", 6) == [0, 1, 2, 4]
    assert pt.parse_pages("2", 3) == [1]


def test_rotate_and_extract(tmp_path):
    src = tmp_path / "src.pdf"
    make_pdf(src, "Rotate Me")
    out = tmp_path / "rot.pdf"
    assert pt.rotate_pdf(src, out, 90) == 1
    assert PdfReader(str(out)).pages[0].get("/Rotate") == 90
    text = pt.extract_text(src)
    assert "Rotate Me" in text


def test_watermark_and_pagemap(tmp_path):
    src = tmp_path / "src.pdf"
    make_pdf(src, "Secret Doc")
    out = tmp_path / "wm.pdf"
    assert pt.watermark_pdf(src, out, "DRAFT") == 1
    assert Path(out).exists()
    rows = pt.page_map(src)
    assert len(rows) == 1 and rows[0]["page"] == 1
    assert "Secret Doc" in rows[0]["preview"]
