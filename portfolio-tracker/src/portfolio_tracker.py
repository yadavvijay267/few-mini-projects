#!/usr/bin/env python3
"""Financial Portfolio Tracker — CLI.

Prints holdings, total P/L, allocation, dividends, XIRR and price alerts —
the same numbers as the Streamlit app (src/app.py). Run the dashboard with:

    streamlit run src/app.py

Usage:
    python3 src/portfolio_tracker.py --demo
    python3 src/portfolio_tracker.py --live        # try yfinance live prices
    python3 src/portfolio_tracker.py --alerts 10  # alert threshold in %
"""
import argparse
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import portfolio


def _money(value):
    return f"₹{value:,.2f}"


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="portfolio_tracker.py",
        description="Track investments: holdings, live P/L, allocation, "
                    "dividends, XIRR and price alerts.")
    parser.add_argument("--demo", action="store_true",
                        help="Report on the bundled sample portfolio.")
    parser.add_argument("--live", action="store_true",
                        help="Try live prices via yfinance (falls back to sample prices).")
    parser.add_argument("--alerts", type=float, default=5.0,
                        help="Alert threshold in percent from buy price.")
    parser.add_argument("--holdings", type=Path, default=None)
    parser.add_argument("--dividends", type=Path, default=None)
    parser.add_argument("--prices", type=Path, default=None)
    args = parser.parse_args(argv)
    base = Path(__file__).resolve().parent.parent
    holdings = portfolio.load_holdings(args.holdings or base / "assets" / "holdings.csv")
    dividends = portfolio.load_dividends(args.dividends or base / "assets" / "dividends.csv")
    prices = portfolio.get_prices(holdings,
                                  args.prices or base / "assets" / "sample_prices.csv",
                                  live=args.live)
    summary = portfolio.portfolio_summary(holdings, prices)
    print("== Portfolio ==")
    print(f"  Invested:      {_money(summary['invested'])}")
    print(f"  Current value: {_money(summary['current_value'])}")
    sign = "+" if summary["pnl"] >= 0 else ""
    print(f"  Total P/L:     {sign}{_money(summary['pnl'])} ({sign}{summary['pnl_pct']}%)")
    print("\nHoldings:")
    for row in summary["holdings"]:
        sign = "+" if row["pnl"] >= 0 else ""
        print(f"  {row['symbol']:<10} {row['quantity']:>5.0f} x {_money(row['current_price']):>12}  "
              f"value {_money(row['current_value']):>12}  "
              f"P/L {sign}{_money(row['pnl'])} ({sign}{row['pnl_pct']}%)")
    alloc = portfolio.allocation(holdings, prices)
    print("\nAllocation by asset type:")
    for kind, pct in alloc["by_type"].items():
        print(f"  {kind:<10} {pct}%")
    print("Allocation by holding:")
    for item in alloc["by_holding"]:
        print(f"  {item['symbol']:<10} {item['pct']}%")
    divs = portfolio.dividend_summary(holdings, dividends)
    print(f"\nDividends received: {_money(divs['total'])}")
    for symbol, total in divs["per_symbol"].items():
        print(f"  {symbol:<10} {_money(total)}")
    print("Dividend calendar (by month):")
    for month, total in divs["by_month"].items():
        print(f"  {month}  {_money(total)}")
    rate = portfolio.portfolio_xirr(holdings, prices, as_of=date(2026, 11, 12))
    print(f"\nXIRR (annualised return): {rate * 100:.2f}%"
          if rate is not None else "\nXIRR: could not be computed")
    alerts = portfolio.price_alerts(holdings, prices, args.alerts)
    print(f"\nPrice alerts (moved >= {args.alerts}% from buy price):")
    if not alerts:
        print("  None.")
    for a in alerts:
        print(f"  {a['direction'].upper()} {a['symbol']}: {a['change_pct']:+.2f}%")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
