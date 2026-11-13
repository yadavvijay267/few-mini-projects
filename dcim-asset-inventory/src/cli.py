"""CLI for the DCIM inventory. Usage: python3 src/cli.py list|alerts|capacity|export [--out FILE]"""
import argparse, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import store

def main():
    ap = argparse.ArgumentParser(description="DCIM asset inventory CLI.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list", help="List all assets")
    sub.add_parser("alerts", help="Warranty and end-of-life alerts")
    sub.add_parser("capacity", help="Per-rack capacity rollups")
    ex = sub.add_parser("export", help="Export inventory as CSV")
    ex.add_argument("--out", default="-")
    a = ap.parse_args()
    assets = store.load()
    if a.cmd == "list":
        print(json.dumps(assets, indent=2))
    elif a.cmd == "alerts":
        print(json.dumps(store.alerts(assets), indent=2))
    elif a.cmd == "capacity":
        print(json.dumps(store.capacity(assets), indent=2))
    elif a.cmd == "export":
        text = store.to_csv(assets)
        if a.out == "-":
            print(text, end="")
        else:
            open(a.out, "w").write(text)
            print(f"wrote {a.out}")

if __name__ == "__main__":
    main()
