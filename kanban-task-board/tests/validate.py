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
check('WIP limit feature present', 'WIP' in html or 'WIP' in js or 'WIP' in css)
check('persistence via localStorage', 'localStorage' in html or 'localStorage' in js or 'localStorage' in css)
check('drag and drop wired', 'draggable' in html or 'draggable' in js or 'draggable' in css)
check('overdue highlighting present', 'overdue' in html or 'overdue' in js or 'overdue' in css)
check('checklist support present', 'checklist' in html or 'checklist' in js or 'checklist' in css)

print()
print(f'{len(failures)} failure(s)')
sys.exit(1 if failures else 0)
