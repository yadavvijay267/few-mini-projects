"""CLI for the AI UI generator: prompt -> spec / HTML file.

Usage:
    python3 src/generate.py --prompt "a pricing page for a gym" --output out.html
    python3 src/generate.py --prompt "a contact page for a clinic" --spec
    python3 src/generate.py --prompt "a pricing page for a gym" --refine "make the header darker"
"""
import argparse, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generator as G


def main(argv=None):
    p = argparse.ArgumentParser(description="AI UI generator CLI")
    p.add_argument("--prompt", required=True, help="describe the UI in words")
    p.add_argument("--output", help="write the generated HTML to this file")
    p.add_argument("--spec", action="store_true", help="print the parsed spec as JSON")
    p.add_argument("--refine", help="follow-up instruction, e.g. 'make the header darker'")
    args = p.parse_args(argv)
    spec = G.parse_prompt(args.prompt)
    if args.refine:
        spec = G.apply_refinement(spec, args.refine)
    if args.spec:
        print(json.dumps(spec, indent=2))
        return 0
    html = G.generate_html(spec)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"wrote {args.output} ({len(html)} bytes)")
    else:
        print(html)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
