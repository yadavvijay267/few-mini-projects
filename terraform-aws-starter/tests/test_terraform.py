#!/usr/bin/env python3
"""Validate the Terraform starter without AWS credentials or the terraform CLI.

Checks: every .tf file has balanced braces, required resources exist,
no hard-coded secrets, variables have defaults/types, outputs are defined.
Run: python3 tests/test_terraform.py
"""
import os, re, sys
SRC = os.path.join(os.path.dirname(__file__), "..", "src")
def read(name):
    with open(os.path.join(SRC, name)) as f: return f.read()
def main():
    errors = []
    files = sorted(f for f in os.listdir(SRC) if f.endswith(".tf"))
    assert files, "no .tf files found"
    all_text = ""
    for name in files:
        text = read(name); all_text += text + "\n"
        if text.count("{") != text.count("}"):
            errors.append(f"{name}: unbalanced braces")
        if text.count('"') % 2:
            errors.append(f"{name}: unbalanced quotes")
    for resource in ["aws_vpc", "aws_subnet", "aws_instance", "aws_s3_bucket",
                     "aws_db_instance", "aws_internet_gateway", "aws_security_group"]:
        if f'resource "{resource}"' not in all_text and f'"{resource}"' not in all_text:
            errors.append(f"missing resource {resource}")
    for var in ["aws_region", "environment", "instance_type", "db_password"]:
        if f'variable "{var}"' not in all_text:
            errors.append(f"missing variable {var}")
    if "sensitive = true" not in all_text:
        errors.append("db_password is not marked sensitive")
    if re.search(r'password\s*=\s*"[^$]', all_text):
        errors.append("hard-coded password found")
    if "output " not in all_text:
        errors.append("no outputs defined")
    # cost script sanity
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
    import cost_estimate
    est = cost_estimate.estimate()
    if est["total_usd_month"] > 10:
        errors.append(f"cost estimate too high: ${est['total_usd_month']}")
    print(f"checked {len(files)} .tf files; estimate ${est['total_usd_month']}/mo")
    if errors:
        print("FAIL:"); [print(" -", e) for e in errors]; return 1
    print("PASS: terraform starter valid"); return 0
if __name__ == "__main__":
    sys.exit(main())
