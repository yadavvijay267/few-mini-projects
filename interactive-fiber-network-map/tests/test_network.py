import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from network import load_network, links, loss_budget, link_passes, downstream_customers, backup_path


def _net():
    return load_network()


def test_loss_budget_maths():
    link = [l for l in links(_net()) if l["properties"]["id"] == "L1"][0]
    # 2.4*0.35 + 4*0.1 + 2*0.5 = 0.84 + 0.4 + 1.0
    assert loss_budget(link) == 2.24


def test_link_passes_against_measured_loss():
    link = [l for l in links(_net()) if l["properties"]["id"] == "L1"][0]
    assert link_passes(link, 2.0) is True
    assert link_passes(link, 2.5) is False


def test_breaking_L5_affects_only_customer_A():
    assert downstream_customers(_net(), "L5") == ["Customer A \u2014 Sector 62"]


def test_breaking_L1_is_saved_by_ring():
    assert downstream_customers(_net(), "L1") == []


def test_backup_path_avoids_broken_link():
    assert backup_path(_net(), "L1", "CUST-A") == ["POP-1", "POP-2", "SC-2", "SC-1", "CUST-A"]
    assert backup_path(_net(), "L2", "CUST-A") == ["POP-1", "SC-1", "CUST-A"]
    assert backup_path(_net(), "L1", "CUST-B") == ["POP-1", "POP-2", "SC-2", "CUST-B"]
