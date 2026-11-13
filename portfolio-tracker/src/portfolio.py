"""Portfolio analysis — pure functions over holdings, dividends and prices.

Live prices come from yfinance when it is installed and the network works;
otherwise the bundled sample prices (assets/sample_prices.csv) are used, so
the tracker and its tests always work offline.
"""
import csv
from collections import defaultdict
from datetime import date


def load_holdings(path):
    with open(path, newline="", encoding="utf-8") as fh:
        rows = []
        for row in csv.DictReader(fh):
            row["quantity"] = float(row["quantity"])
            row["buy_price"] = float(row["buy_price"])
            rows.append(row)
        return rows


def load_dividends(path):
    with open(path, newline="", encoding="utf-8") as fh:
        rows = []
        for row in csv.DictReader(fh):
            row["amount_per_share"] = float(row["amount_per_share"])
            rows.append(row)
        return rows


def load_prices(path):
    prices = {}
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            prices[row["symbol"]] = float(row["price"])
    return prices


def fetch_live_prices(symbols):
    """Try yfinance (NSE suffix .NS); return {} on any failure so the
    caller can fall back to sample prices."""
    try:
        import yfinance as yf
    except ImportError:
        return {}
    prices = {}
    try:
        for symbol in symbols:
            ticker = yf.Ticker(symbol + ".NS")
            hist = ticker.history(period="1d")
            if not hist.empty:
                prices[symbol] = round(float(hist["Close"].iloc[-1]), 2)
    except Exception:
        return {}
    return prices


def get_prices(holdings, sample_prices_path, live=False):
    prices = load_prices(sample_prices_path)
    if live:
        live_prices = fetch_live_prices([h["symbol"] for h in holdings])
        prices.update(live_prices)
    return prices


def holding_performance(holding, price):
    invested = holding["quantity"] * holding["buy_price"]
    current = holding["quantity"] * price
    pnl = current - invested
    return {
        "symbol": holding["symbol"], "name": holding["name"],
        "asset_type": holding["asset_type"],
        "quantity": holding["quantity"],
        "buy_price": holding["buy_price"],
        "current_price": price,
        "invested": round(invested, 2), "current_value": round(current, 2),
        "pnl": round(pnl, 2),
        "pnl_pct": round(pnl / invested * 100, 2) if invested else 0.0,
    }


def portfolio_summary(holdings, prices):
    rows = [holding_performance(h, prices.get(h["symbol"], h["buy_price"]))
            for h in holdings]
    invested = sum(r["invested"] for r in rows)
    current = sum(r["current_value"] for r in rows)
    return {
        "holdings": rows,
        "invested": round(invested, 2),
        "current_value": round(current, 2),
        "pnl": round(current - invested, 2),
        "pnl_pct": round((current - invested) / invested * 100, 2) if invested else 0.0,
    }


def allocation(holdings, prices):
    summary = portfolio_summary(holdings, prices)
    total = summary["current_value"] or 1
    by_type = defaultdict(float)
    by_holding = []
    for row in summary["holdings"]:
        by_type[row["asset_type"]] += row["current_value"]
        by_holding.append({"symbol": row["symbol"],
                           "pct": round(row["current_value"] / total * 100, 2)})
    return {
        "by_type": {k: round(v / total * 100, 2) for k, v in sorted(by_type.items())},
        "by_holding": sorted(by_holding, key=lambda x: x["pct"], reverse=True),
    }


def dividend_summary(holdings, dividends):
    """Total dividends received per symbol and overall, plus a simple
    calendar of upcoming-style payouts grouped by month."""
    qty = {h["symbol"]: h["quantity"] for h in holdings}
    per_symbol = defaultdict(float)
    by_month = defaultdict(float)
    for d in dividends:
        total = d["amount_per_share"] * qty.get(d["symbol"], 0)
        per_symbol[d["symbol"]] += total
        by_month[d["date"][:7]] += total
    return {
        "per_symbol": {k: round(v, 2) for k, v in sorted(per_symbol.items())},
        "by_month": {k: round(v, 2) for k, v in sorted(by_month.items())},
        "total": round(sum(per_symbol.values()), 2),
    }


def xirr(cashflows, guess=0.1):
    """Extended internal rate of return (annualised) via Newton-Raphson.

    cashflows: list of (date, amount) with outflows negative, inflows
    positive. Returns a fraction (0.12 = 12% p.a.) or None if it cannot
    converge. This is the stand-out feature: a real return rate, not just
    a simple gain percentage.
    """
    if not cashflows:
        return None
    cashflows = sorted(cashflows)
    d0 = cashflows[0][0]

    def npv(rate):
        total = 0.0
        for d, amount in cashflows:
            years = (d - d0).days / 365.0
            total += amount / (1 + rate) ** years
        return total

    def d_npv(rate):
        total = 0.0
        for d, amount in cashflows:
            years = (d - d0).days / 365.0
            if years:
                total += -years * amount / (1 + rate) ** (years + 1)
        return total

    rate = guess
    for _ in range(100):
        value = npv(rate)
        slope = d_npv(rate)
        if slope == 0:
            return None
        step = value / slope
        rate -= step
        if abs(step) < 1e-7:
            return round(rate, 4)
    return None


def portfolio_xirr(holdings, prices, as_of=None):
    """Treat every buy as an outflow and the current value as an inflow
    on the as-of date, then compute XIRR."""
    as_of = as_of or date.today()
    flows = []
    for h in holdings:
        y, m, d = (int(x) for x in h["buy_date"].split("-"))
        flows.append((date(y, m, d), -h["quantity"] * h["buy_price"]))
    total_current = sum(h["quantity"] * prices.get(h["symbol"], h["buy_price"])
                        for h in holdings)
    flows.append((as_of, total_current))
    return xirr(flows)


def price_alerts(holdings, prices, threshold_pct=5.0):
    """Flag holdings that moved more than X% from their buy price."""
    alerts = []
    for h in holdings:
        price = prices.get(h["symbol"])
        if price is None:
            continue
        change = (price - h["buy_price"]) / h["buy_price"] * 100
        if abs(change) >= threshold_pct:
            alerts.append({"symbol": h["symbol"],
                           "change_pct": round(change, 2),
                           "direction": "up" if change > 0 else "down"})
    return sorted(alerts, key=lambda a: abs(a["change_pct"]), reverse=True)
