#!/usr/bin/env python3
"""
Inject downloaded brand SVG logos into index.html.
Replaces inline SVGs in tech-strip-items with brand logos from images/logos/.
"""

import json
import os
import re
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MANIFEST_PATH = os.path.join(BASE_DIR, "images", "logos", "manifest.json")
HTML_PATH = os.path.join(BASE_DIR, "index.html")
BACKUP_PATH = os.path.join(BASE_DIR, "index.html.bak")

# Map span labels in HTML to manifest keys
# Only entries where span label differs from manifest key
LABEL_TO_MANIFEST = {
    "Claude": "Anthropic",
    "Gemini": "Google Gemini",
    "Google Biz": "Google My Business",
    "X / Twitter": "X/Twitter",
}


def load_manifest():
    """Load the manifest.json mapping."""
    with open(MANIFEST_PATH, 'r') as f:
        return json.load(f)


def load_svg(file_path):
    """Load SVG content from file."""
    full_path = os.path.join(BASE_DIR, file_path)
    with open(full_path, 'r') as f:
        return f.read().strip()


def inject_logos(html, manifest):
    """Replace inline SVGs in tech-strip-items with brand logos."""
    replaced = 0
    skipped = 0

    # Build a lookup from slug to SVG content (load each file once)
    svg_cache = {}
    for tech_name, info in manifest.items():
        slug = info["slug"]
        if slug not in svg_cache:
            try:
                svg_cache[slug] = load_svg(info["file"])
            except FileNotFoundError:
                print(f"  [WARN] File not found: {info['file']}")

    # Find all tech-strip-item blocks and replace their SVGs
    # Pattern: <div class="tech-strip-item">\n  <svg...>...</svg>\n  <span>LABEL</span>
    pattern = re.compile(
        r'(<div class="tech-strip-item">\s*)'      # Opening div
        r'<svg[^>]*>.*?</svg>'                       # Inline SVG to replace
        r'(\s*<span>)(.*?)(</span>)',                # Span with label
        re.DOTALL
    )

    def replacer(match):
        nonlocal replaced, skipped
        prefix = match.group(1)
        span_open = match.group(2)
        label = match.group(3).strip()
        span_close = match.group(4)

        # Map label to manifest key
        manifest_key = LABEL_TO_MANIFEST.get(label, label)

        if manifest_key in manifest:
            slug = manifest[manifest_key]["slug"]
            if slug in svg_cache:
                replaced += 1
                print(f"  [OK]   {label} -> {slug}.svg")
                return f'{prefix}{svg_cache[slug]}{span_open}{label}{span_close}'

        skipped += 1
        print(f"  [SKIP] {label} (no logo available)")
        return match.group(0)  # Return unchanged

    result = pattern.sub(replacer, html)
    return result, replaced, skipped


def main():
    # Load manifest
    print(f"Loading manifest from {MANIFEST_PATH}")
    manifest = load_manifest()
    print(f"Found {len(manifest)} entries in manifest\n")

    # Read HTML
    with open(HTML_PATH, 'r') as f:
        html = f.read()

    # Backup
    shutil.copy2(HTML_PATH, BACKUP_PATH)
    print(f"Backup saved to {BACKUP_PATH}\n")

    # Inject logos
    print("Injecting logos...")
    result, replaced, skipped = inject_logos(html, manifest)

    # Write result
    with open(HTML_PATH, 'w') as f:
        f.write(result)

    print(f"\n{'='*50}")
    print(f"Results: {replaced} replaced, {skipped} skipped")
    print(f"Updated: {HTML_PATH}")


if __name__ == "__main__":
    main()
