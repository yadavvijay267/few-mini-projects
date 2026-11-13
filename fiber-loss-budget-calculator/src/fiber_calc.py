"""Fiber optic loss budget calculator. Original code.

Total loss = length x attenuation + splices x splice_loss
             + connectors x connector_loss + safety_margin
Power budget = Tx power (dBm) - Rx sensitivity (dBm)
"""
import argparse, json

ATTENUATION = {  # dB/km
    ("SM", 1310): 0.35, ("SM", 1550): 0.22,
    ("MM", 850): 3.0, ("MM", 1300): 1.0,
}
SPLICE_LOSS = {"SM": 0.05, "MM": 0.10}
CONNECTOR_LOSS = {"SM": 0.30, "MM": 0.50}

def loss_budget(length_km, fiber="SM", wavelength=1550, splices=0, connectors=0,
                margin_db=3.0, splice_loss=None, connector_loss=None):
    """Return a dict with every loss component (dB) and the total."""
    att = ATTENUATION[(fiber, wavelength)]
    sl = SPLICE_LOSS[fiber] if splice_loss is None else splice_loss
    cl = CONNECTOR_LOSS[fiber] if connector_loss is None else connector_loss
    fiber_loss = length_km * att
    splice_total = splices * sl
    connector_total = connectors * cl
    total = fiber_loss + splice_total + connector_total + margin_db
    parts = {"fiber": fiber_loss, "splices": splice_total,
             "connectors": connector_total, "margin": margin_db}
    dominant = max(parts, key=parts.get)
    return {"fiber_loss_db": round(fiber_loss, 3), "splice_loss_db": round(splice_total, 3),
            "connector_loss_db": round(connector_total, 3), "margin_db": margin_db,
            "total_loss_db": round(total, 3), "dominant": dominant}

def evaluate(total_loss_db, tx_dbm, rx_sensitivity_dbm):
    """Pass/fail against the power budget."""
    budget = tx_dbm - rx_sensitivity_dbm
    margin = budget - total_loss_db
    return {"power_budget_db": round(budget, 2), "budget_margin_db": round(margin, 2),
            "passes": total_loss_db <= budget}

def main():
    p = argparse.ArgumentParser(description="Fiber optic loss budget calculator")
    p.add_argument("--length", type=float, default=10.0, help="link length in km")
    p.add_argument("--fiber", choices=["SM", "MM"], default="SM")
    p.add_argument("--wavelength", type=int, choices=[850, 1300, 1310, 1550], default=1550)
    p.add_argument("--splices", type=int, default=4)
    p.add_argument("--connectors", type=int, default=2)
    p.add_argument("--margin", type=float, default=3.0, help="safety margin dB")
    p.add_argument("--tx", type=float, default=0.0, help="Tx launch power dBm")
    p.add_argument("--rx", type=float, default=-28.0, help="Rx sensitivity dBm")
    a = p.parse_args()
    r = loss_budget(a.length, a.fiber, a.wavelength, a.splices, a.connectors, a.margin)
    e = evaluate(r["total_loss_db"], a.tx, a.rx)
    print(json.dumps({**r, **e}, indent=2))

if __name__ == "__main__":
    main()
