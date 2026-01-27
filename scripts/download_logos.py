#!/usr/bin/env python3
"""
Download official brand SVG logos from Simple Icons CDN.
Transforms SVGs to use fill="currentColor" with width=28, height=28.
Saves to images/logos/ and generates manifest.json.
"""

import json
import os
import re
import subprocess
import time

# Base URL for Simple Icons via jsDelivr CDN
CDN_BASE = "https://cdn.jsdelivr.net/npm/simple-icons/icons"

# Technology name -> Simple Icons slug mapping
TECH_LOGOS = {
    "OpenAI": "openai",
    "ElevenLabs": "elevenlabs",
    "Anthropic": "anthropic",
    "Google Gemini": "googlegemini",
    "Vertex AI": "googlecloud",
    "React": "react",
    "Next.js": "nextdotjs",
    "Node.js": "nodedotjs",
    "Python": "python",
    "TypeScript": "typescript",
    "Tailwind": "tailwindcss",
    "Cursor": "cursor",
    "Claude Code": "anthropic",
    "Puppeteer": "puppeteer",
    "Apify": "apify",
    "AWS": "amazonaws",
    "Vercel": "vercel",
    "Render": "render",
    "Docker": "docker",
    "Firebase": "firebase",
    "GitHub": "github",
    "Supabase": "supabase",
    "PostgreSQL": "postgresql",
    "MongoDB": "mongodb",
    "Google Maps": "googlemaps",
    "Google My Business": "google",
    "Meta": "meta",
    "Instagram": "instagram",
    "LinkedIn": "linkedin",
    "X/Twitter": "x",
    "n8n": "n8n",
    "Stripe": "stripe",
    "Twilio": "twilio",
    "QuickBooks": "quickbooks",
    # SEO Tools - no brand icon, skip
}

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "images", "logos")


def transform_svg(svg_content: str) -> str:
    """Transform SVG to use fill=currentColor with width=28 height=28."""
    # Remove any existing width/height attributes
    svg_content = re.sub(r'\s+width="[^"]*"', '', svg_content)
    svg_content = re.sub(r'\s+height="[^"]*"', '', svg_content)

    # Remove any existing fill attributes (we'll add currentColor)
    svg_content = re.sub(r'\s+fill="[^"]*"', '', svg_content)

    # Add our attributes to the <svg> tag
    svg_content = svg_content.replace(
        '<svg',
        '<svg width="28" height="28" fill="currentColor"',
        1  # Only replace first occurrence
    )

    return svg_content.strip()


def download_logo(tech_name: str, slug: str) -> dict | None:
    """Download a single logo SVG from Simple Icons CDN."""
    url = f"{CDN_BASE}/{slug}.svg"
    output_path = os.path.join(OUTPUT_DIR, f"{slug}.svg")

    # Skip if already downloaded (for re-runs)
    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        print(f"  [SKIP] {tech_name} ({slug}.svg) - already exists")
        # Still read and return the content for manifest
        with open(output_path, 'r') as f:
            content = f.read()
        return {
            "name": tech_name,
            "slug": slug,
            "file": f"images/logos/{slug}.svg",
            "status": "cached"
        }

    try:
        result = subprocess.run(
            ["curl", "-sS", "-f", "-L", "--max-time", "10", url],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"  [FAIL] {tech_name} ({slug}.svg) - curl error: {result.stderr.strip()}")
            return None

        svg_content = result.stdout

        # Transform the SVG
        transformed = transform_svg(svg_content)

        # Save to file
        with open(output_path, 'w') as f:
            f.write(transformed)

        print(f"  [OK]   {tech_name} -> {slug}.svg ({len(transformed)} bytes)")
        return {
            "name": tech_name,
            "slug": slug,
            "file": f"images/logos/{slug}.svg",
            "status": "downloaded"
        }

    except Exception as e:
        print(f"  [FAIL] {tech_name} ({slug}.svg) - {e}")
        return None


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"Downloading {len(TECH_LOGOS)} logos from Simple Icons CDN...")
    print(f"Output directory: {OUTPUT_DIR}\n")

    manifest = {}
    success_count = 0
    fail_count = 0
    # Track unique slugs to avoid duplicate downloads
    downloaded_slugs = {}

    for tech_name, slug in TECH_LOGOS.items():
        # If we already downloaded this slug for another tech, reuse it
        if slug in downloaded_slugs:
            print(f"  [REUSE] {tech_name} -> {slug}.svg (same as {downloaded_slugs[slug]})")
            manifest[tech_name] = {
                "name": tech_name,
                "slug": slug,
                "file": f"images/logos/{slug}.svg",
                "status": "reused"
            }
            success_count += 1
            continue

        result = download_logo(tech_name, slug)
        if result:
            manifest[tech_name] = result
            downloaded_slugs[slug] = tech_name
            success_count += 1
        else:
            fail_count += 1

        # Rate limiting
        time.sleep(0.2)

    # Save manifest
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"\n{'='*50}")
    print(f"Results: {success_count} success, {fail_count} failed")
    print(f"Manifest saved to: {manifest_path}")
    print(f"Unique SVG files: {len(downloaded_slugs)}")


if __name__ == "__main__":
    main()
