#!/usr/bin/env python3
"""Validation checks for this project. Run: python3 tests/validate.py"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
failures = []

def check(name, ok, detail=''):
    print(('PASS' if ok else 'FAIL') + ' - ' + name + ((' (' + detail + ')') if detail and not ok else ''))
    if not ok:
        failures.append(name)

def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()

check('index.html exists', os.path.isfile(os.path.join(ROOT, 'src/index.html')))
check('styles.css exists', os.path.isfile(os.path.join(ROOT, 'src/styles.css')))
check('app.js exists', os.path.isfile(os.path.join(ROOT, 'src/app.js')))
check('README exists', os.path.isfile(os.path.join(ROOT, 'README.md')))
check('LICENSE exists', os.path.isfile(os.path.join(ROOT, 'LICENSE')))
check('.gitignore exists', os.path.isfile(os.path.join(ROOT, '.gitignore')))
check('requirements.txt exists', os.path.isfile(os.path.join(ROOT, 'requirements.txt')))
check('architecture doc exists', os.path.isfile(os.path.join(ROOT, 'docs/ARCHITECTURE.md')))
check('screenshots note exists', os.path.isfile(os.path.join(ROOT, 'screenshots/SCREENSHOTS.md')))
html = read('src/index.html')
css = read('src/styles.css')
js = read('src/app.js')
check('index links styles.css', 'styles.css' in html)
check('index links app.js', 'app.js' in html)
check('no placeholder TODO left', 'TODO' not in html and 'TODO' not in js)
check('no personal email/phone leaked', not re.search(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', html + js) and not re.search(r'\+91[ -]?[0-9]{10}', html + js))
check('download PDF via print', 'window.print' in html or 'window.print' in js or 'window.print' in css)
check('print stylesheet present', '@media print' in html or '@media print' in js or '@media print' in css)
check('skill bars animate on scroll', 'IntersectionObserver' in html or 'IntersectionObserver' in js or 'IntersectionObserver' in css)
check('clickable timeline present', 'role-body' in html or 'role-body' in js or 'role-body' in css)
check('project filter present', 'data-f' in html or 'data-f' in js or 'data-f' in css)

print()
print(f'{len(failures)} failure(s)')
sys.exit(1 if failures else 0)
