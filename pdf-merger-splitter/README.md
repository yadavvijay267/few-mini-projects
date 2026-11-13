# PDF Merger & Splitter Tool

A command-line tool to merge, split, rotate, watermark and extract text from
PDF files — the everyday document handling that admin, legal and engineering
teams do constantly.

## Features

- **Merge** multiple PDFs in the order given
- **Split** by page range (`1-3,5`)
- **Rotate** pages by any multiple of 90 degrees
- **Watermark** every page with diagonal text
- **Extract** text to stdout or a `.txt` file
- **Batch mode** — merge every PDF in a whole folder
- **Page map preview** — see every page's size and a text snippet *before*
  you split, so you never cut the wrong page

## Tech stack

Python 3, [pypdf](https://pypdf.readthedocs.io/) for PDF manipulation,
reportlab for generating sample/watermark pages. No GUI dependency — the CLI
is the interface, so it works identically on Windows, macOS and Linux.

## How to run

```bash
pip install -r requirements.txt

# Merge
python3 src/pdf_tool.py merge a.pdf b.pdf -o merged.pdf

# Split pages 1-3 and 5 into separate files
python3 src/pdf_tool.py split merged.pdf --pages 1-3,5 -o out/

# Preview pages before splitting (the stand-out feature)
python3 src/pdf_tool.py pagemap merged.pdf

# Rotate / watermark / extract
python3 src/pdf_tool.py rotate in.pdf --angle 90 -o rotated.pdf
python3 src/pdf_tool.py watermark in.pdf --text "CONFIDENTIAL" -o wm.pdf
python3 src/pdf_tool.py extract in.pdf -o text.txt

# Merge a whole folder
python3 src/pdf_tool.py batch ./pdfs -o ./merged/

# Try it with generated sample PDFs
python3 src/pdf_tool.py --demo
```

## Screenshots

See `screenshots/SCREENSHOTS.md` for what to capture (demo run, page map).

## Tests

```bash
python3 -m pytest tests/ -v
```

## License

MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
