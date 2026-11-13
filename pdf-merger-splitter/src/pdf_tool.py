#!/usr/bin/env python3
"""PDF Merger & Splitter Tool — merge, split, rotate, watermark and extract text.

Usage:
    python3 src/pdf_tool.py merge a.pdf b.pdf -o merged.pdf
    python3 src/pdf_tool.py split input.pdf --pages 1-3,5 -o out_dir/
    python3 src/pdf_tool.py rotate input.pdf --angle 90 -o rotated.pdf
    python3 src/pdf_tool.py watermark input.pdf --text "CONFIDENTIAL" -o wm.pdf
    python3 src/pdf_tool.py extract input.pdf -o text.txt
    python3 src/pdf_tool.py pagemap input.pdf
    python3 src/pdf_tool.py batch ./pdfs -o ./merged/
    python3 src/pdf_tool.py --demo
"""
import argparse
import io
import sys
from pathlib import Path

try:
    from pypdf import PdfReader, PdfWriter
except ImportError:  # pragma: no cover
    print("pypdf is required: pip install -r requirements.txt", file=sys.stderr)
    raise


def parse_pages(spec, total):
    """Parse '1-3,5,7-9' (1-based) into a sorted list of 0-based page indexes."""
    pages = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start, end = part.split("-", 1)
            start, end = int(start), int(end)
            if start < 1 or end > total or start > end:
                raise ValueError(f"Page range {part!r} out of bounds (1-{total})")
            pages.update(range(start - 1, end))
        else:
            n = int(part)
            if n < 1 or n > total:
                raise ValueError(f"Page {n} out of bounds (1-{total})")
            pages.add(n - 1)
    return sorted(pages)


def merge_pdfs(inputs, output):
    writer = PdfWriter()
    total = 0
    for path in inputs:
        reader = PdfReader(str(path))
        for page in reader.pages:
            writer.add_page(page)
        total += len(reader.pages)
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    with open(output, "wb") as fh:
        writer.write(fh)
    return total


def split_pdf(input_path, pages, out_dir):
    reader = PdfReader(str(input_path))
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    made = []
    for i in pages:
        writer = PdfWriter()
        writer.add_page(reader.pages[i])
        dest = out_dir / f"{Path(input_path).stem}_page_{i + 1}.pdf"
        with open(dest, "wb") as fh:
            writer.write(fh)
        made.append(dest)
    return made


def rotate_pdf(input_path, output, angle):
    if angle % 90 != 0:
        raise ValueError("Rotation angle must be a multiple of 90")
    reader = PdfReader(str(input_path))
    writer = PdfWriter()
    for page in reader.pages:
        page.rotate(angle)
        writer.add_page(page)
    with open(output, "wb") as fh:
        writer.write(fh)
    return len(reader.pages)


def make_watermark_page(text, width, height):
    """Build a one-page PDF with diagonal semi-transparent text (reportlab)."""
    from reportlab.lib.colors import Color
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(width, height))
    c.saveState()
    c.translate(width / 2, height / 2)
    c.rotate(45)
    c.setFillColor(Color(0.6, 0.6, 0.6, alpha=0.35))
    c.setFont("Helvetica-Bold", 48)
    c.drawCentredString(0, 0, text)
    c.restoreState()
    c.showPage()
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def watermark_pdf(input_path, output, text):
    reader = PdfReader(str(input_path))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    # Merge the stamp onto the writer's own pages (pypdf 7 requires pages
    # to be attached to a writer before merge_page is called).
    for page in writer.pages:
        box = page.mediabox
        stamp = make_watermark_page(text, float(box.width), float(box.height))
        page.merge_page(stamp)
    with open(output, "wb") as fh:
        writer.write(fh)
    return len(reader.pages)


def extract_text(input_path, output=None):
    reader = PdfReader(str(input_path))
    chunks = []
    for i, page in enumerate(reader.pages, 1):
        chunks.append(f"--- page {i} ---\n{(page.extract_text() or '').strip()}")
    text = "\n".join(chunks)
    if output:
        Path(output).write_text(text, encoding="utf-8")
    return text


def page_map(input_path):
    """Stand-out feature: a 'page map' preview of every page before splitting."""
    reader = PdfReader(str(input_path))
    rows = []
    for i, page in enumerate(reader.pages, 1):
        box = page.mediabox
        snippet = (page.extract_text() or "").strip().replace("\n", " ")[:60]
        rows.append({
            "page": i,
            "width": round(float(box.width), 1),
            "height": round(float(box.height), 1),
            "rotation": page.get("/Rotate", 0),
            "preview": snippet or "(no extractable text)",
        })
    return rows


def batch_merge(folder, out_dir):
    pdfs = sorted(Path(folder).glob("*.pdf"))
    if not pdfs:
        raise FileNotFoundError(f"No PDFs found in {folder}")
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / "batch_merged.pdf"
    total = merge_pdfs(pdfs, dest)
    return dest, len(pdfs), total


def make_sample_pdf(path, title, lines):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    c = canvas.Canvas(str(path), pagesize=A4)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(72, 750, title)
    c.setFont("Helvetica", 12)
    y = 720
    for line in lines:
        c.drawString(72, y, line)
        y -= 20
    c.showPage()
    c.save()


def run_demo():
    demo_dir = Path(__file__).resolve().parent.parent / "demo_output"
    demo_dir.mkdir(exist_ok=True)
    a = demo_dir / "sample_a.pdf"
    b = demo_dir / "sample_b.pdf"
    make_sample_pdf(a, "Sample A", ["Hello from sample A, page 1.", "Second line of A."])
    make_sample_pdf(b, "Sample B", ["Hello from sample B, page 1.", "Second line of B."])
    merged = demo_dir / "merged.pdf"
    n = merge_pdfs([a, b], merged)
    print(f"Created 2 sample PDFs and merged them -> {merged} ({n} pages)")
    parts = split_pdf(merged, [0], demo_dir / "split")
    print(f"Split page 1 -> {parts[0]}")
    wm = demo_dir / "watermarked.pdf"
    watermark_pdf(merged, wm, "DEMO")
    print(f"Watermarked copy -> {wm}")
    print("\nPage map of merged.pdf:")
    for row in page_map(merged):
        print(f"  p{row['page']}: {row['width']}x{row['height']}pt  {row['preview']}")
    print(f"\nDemo files are in {demo_dir}")
    return 0


def build_parser():
    p = argparse.ArgumentParser(prog="pdf_tool.py",
        description="Merge, split, rotate, watermark and extract text from PDFs.")
    p.add_argument("--demo", action="store_true", help="Generate sample PDFs and demo merge/split/watermark.")
    sub = p.add_subparsers(dest="command")
    m = sub.add_parser("merge", help="Merge PDFs in the given order.")
    m.add_argument("inputs", nargs="+", type=Path)
    m.add_argument("-o", "--output", required=True, type=Path)
    s = sub.add_parser("split", help="Split a PDF by page range, e.g. 1-3,5.")
    s.add_argument("input", type=Path)
    s.add_argument("--pages", required=True, help="Page spec like 1-3,5 (1-based).")
    s.add_argument("-o", "--output", required=True, type=Path, help="Output directory.")
    r = sub.add_parser("rotate", help="Rotate every page by a multiple of 90 degrees.")
    r.add_argument("input", type=Path)
    r.add_argument("--angle", type=int, default=90)
    r.add_argument("-o", "--output", required=True, type=Path)
    w = sub.add_parser("watermark", help="Stamp diagonal text on every page.")
    w.add_argument("input", type=Path)
    w.add_argument("--text", required=True)
    w.add_argument("-o", "--output", required=True, type=Path)
    e = sub.add_parser("extract", help="Extract text to stdout or a .txt file.")
    e.add_argument("input", type=Path)
    e.add_argument("-o", "--output", type=Path)
    pm = sub.add_parser("pagemap", help="Preview every page (size + text snippet) before splitting.")
    pm.add_argument("input", type=Path)
    bt = sub.add_parser("batch", help="Merge every PDF in a folder, alphabetically.")
    bt.add_argument("folder", type=Path)
    bt.add_argument("-o", "--output", required=True, type=Path, help="Output directory.")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    if args.demo:
        return run_demo()
    if not args.command:
        print("Nothing to do. Use --demo or a subcommand (try --help).", file=sys.stderr)
        return 2
    if args.command == "merge":
        n = merge_pdfs(args.inputs, args.output)
        print(f"Merged {len(args.inputs)} file(s), {n} pages -> {args.output}")
    elif args.command == "split":
        total = len(PdfReader(str(args.input)).pages)
        pages = parse_pages(args.pages, total)
        made = split_pdf(args.input, pages, args.output)
        print(f"Split {len(made)} page(s) into {args.output}")
    elif args.command == "rotate":
        n = rotate_pdf(args.input, args.output, args.angle)
        print(f"Rotated {n} page(s) by {args.angle} degrees -> {args.output}")
    elif args.command == "watermark":
        n = watermark_pdf(args.input, args.output, args.text)
        print(f"Watermarked {n} page(s) with {args.text!r} -> {args.output}")
    elif args.command == "extract":
        text = extract_text(args.input, args.output)
        if args.output:
            print(f"Extracted text -> {args.output}")
        else:
            print(text)
    elif args.command == "pagemap":
        for row in page_map(args.input):
            print(f"p{row['page']}: {row['width']}x{row['height']}pt rot={row['rotation']} | {row['preview']}")
    elif args.command == "batch":
        dest, files, pages = batch_merge(args.folder, args.output)
        print(f"Batch merged {files} file(s), {pages} pages -> {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
