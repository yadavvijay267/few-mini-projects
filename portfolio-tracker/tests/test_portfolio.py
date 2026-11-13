"""Tests for the portfolio module — computed from the sample data."""
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import portfolio

BASE = Path(__file__).resolve().parent.parent
HOLDINGS = BASE / "assets" / "holdings.csv"
DIVIDENDS = BASE / "assets" / "dividends.csv"
PRICES = BASE / "assets" / "sample_prices.csv"


def test_summary_totals_match_holdings():
    holdings = portfolio.load_holdings(HOLDINGS)
    prices = portfolio.load_prices(PRICES)
    summary = portfolio.portfolio_summary(holdings, prices)
    assert summary["invested"] == round(sum(h["quantity"] * h["buy_price"] for h in holdings), 2)
    assert summary["current_value"] == round(
        sum(h["quantity"] * prices[h["symbol"]] for h in holdings), 2)
    assert summary["pnl"] == round(summary["current_value"] - summary["invested"], 2)
    assert summary["pnl"] > 0  # sample prices are above buy prices


def test_allocation_sums_to_100():
    holdings = portfolio.load_holdings(HOLDINGS)
    prices = portfolio.load_prices(PRICES)
    alloc = portfolio.allocation(holdings, prices)
    assert abs(sum(alloc["by_type"].values()) - 100) < 0.5
    assert abs(sum(h["pct"] for h in alloc["by_holding"]) - 100) < 0.5


def test_dividends_total():
    holdings = portfolio.load_holdings(HOLDINGS)
    dividends = portfolio.load_dividends(DIVIDENDS)
    divs = portfolio.dividend_summary(holdings, dividends)
    expected = (10 * 5.50) + (5 * 12.00) + (20 * 9.00) + (15 * 7.50) + (25 * 3.20)
    assert abs(divs["total"] - expected) < 0.01
    assert divs["by_month"]["2026-03"] == 55.00


def test_xirr_simple_case():
    # Invest 100, get back 110 after exactly one year -> 10%.
    rate = portfolio.xirr([(date(2025, 1, 1), -100.0), (date(2026, 1, 1), 110.0)])
    assert rate is not None and abs(rate - 0.10) < 0.001


def test_xirr_of_sample_portfolio_is_positive():
    holdings = portfolio.load_holdings(HOLDINGS)
    prices = portfolio.load_prices(PRICES)
    rate = portfolio.portfolio_xirr(holdings, prices, as_of=date(2026, 11, 12))
    assert rate is not None and rate > 0


def test_price_alerts_flag_big_movers():
    holdings = portfolio.load_holdings(HOLDINGS)
    prices = portfolio.load_prices(PRICES)
    alerts = portfolio.price_alerts(holdings, prices, threshold_pct=5.0)
    symbols = [a["symbol"] for a in alerts]
    assert "RELIANCE" in symbols  # 2450 -> 2950 is +20%
    assert all(abs(a["change_pct"]) >= 5.0 for a in alerts)
