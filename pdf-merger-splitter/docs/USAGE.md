# Usage

## Commands

| Command | What it does |
| --- | --- |
| `merge a.pdf b.pdf -o out.pdf` | Concatenate in argument order |
| `split in.pdf --pages 1-3,5 -o dir/` | One PDF per listed page |
| `rotate in.pdf --angle 90 -o out.pdf` | Rotate all pages (multiple of 90) |
| `watermark in.pdf --text X -o out.pdf` | Diagonal translucent stamp |
| `extract in.pdf [-o text.txt]` | Text to stdout or file |
| `pagemap in.pdf` | Page size + text preview per page |
| `batch folder/ -o out/` | Merge every `*.pdf` in a folder |

## How it works

`src/pdf_tool.py` is a single self-contained CLI built on `argparse` and
pypdf's `PdfReader`/`PdfWriter`. Page ranges are 1-based and parsed by
`parse_pages()` into 0-based indexes. The watermark is a one-page PDF drawn
with reportlab (45-degree, semi-transparent) and merged onto each page with
`merge_page()`, so the original content is never re-rendered.

## Page map

Before splitting a long document it is easy to cut the wrong page. `pagemap`
prints one line per page — dimensions, rotation and the first 60 characters
of extracted text — so the `--pages` argument can be chosen with confidence.
