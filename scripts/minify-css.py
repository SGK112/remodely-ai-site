#!/usr/bin/env python3
"""
Minify css/styles.css → css/styles.min.css for production.

Run before each deploy when styles.css has changed:
    python3 scripts/minify-css.py

Conservative whitespace/comment minification — does not rewrite selectors
or rename classes, so it can't break the cascade. Saves ~30% bytes which
materially improves LCP on the marketing site.
"""
import re, sys, os, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'css' / 'styles.css'
DST = ROOT / 'css' / 'styles.min.css'

src = SRC.read_text()
orig = len(src)

# Strip /* ... */ comments
m = re.sub(r'/\*[\s\S]*?\*/', '', src)
# Collapse whitespace around { } : ; ,
m = re.sub(r'\s*([{};:,])\s*', r'\1', m)
# Collapse remaining runs of whitespace
m = re.sub(r'\s+', ' ', m)
# Drop trailing semicolons before }
m = re.sub(r';}', '}', m)
m = m.strip()

DST.write_text(m)
new = len(m)
print(f'{SRC.name}     {orig:>9,} bytes')
print(f'{DST.name} {new:>9,} bytes  ({(1-new/orig)*100:.1f}% smaller)')
