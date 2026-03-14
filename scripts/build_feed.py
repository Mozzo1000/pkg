#!/usr/bin/env python3
"""
Generate an RSS 2.0 feed from application YAML files.

Behavior:
- Each item represents the app's current known upstream version.
- Item <link> is ONLY metadata.release_notes if provided.
- If metadata.release_notes is missing, the <link> is omitted.

Usage:
  python scripts/build_feed.py --apps-dir applications --out docs/feed.xml \
    --site-url "https://your-org.github.io/your-repo" \
    --feed-title "Application Updates" \
    --feed-description "Latest upstream versions detected across our catalog"

YAML fields used:
  name: string                      # fallback: filename stem
  current_version: string           # vendor version string (required)
  metadata:
    release_notes: string           # PREFERRED
"""

import argparse
import datetime as dt
import hashlib
import html
import sys
from pathlib import Path
from typing import List, Tuple, Optional

import yaml
import xml.etree.ElementTree as ET


def iso_to_rfc2822(ts: dt.datetime) -> str:
    """Convert a datetime to RFC 2822 in GMT."""
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=dt.timezone.utc)
    ts = ts.astimezone(dt.timezone.utc)
    return ts.strftime("%a, %d %b %Y %H:%M:%S GMT")


def load_app(filepath: Path) -> Optional[dict]:
    try:
        with filepath.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            return data if isinstance(data, dict) else None
    except Exception:
        return None


def get_release_notes_link(data: dict) -> str:
    if data["release"].get("notes_url"):
        return data["release"].get("notes_url")
    elif data["metadata"].get("release_notes"):
        return data["metadata"].get("release_notes")
    return ""


def build_item_tuple(filepath: Path) -> Optional[Tuple[str, str, str, str, str]]:
    """
    Returns a normalized tuple for an RSS item:
    (title, link, guid, pubDate, description)

    - title: "<App Name> <current_version>"
    - link: ONLY metadata.release_notes (no fallbacks)
    - guid: sha1(name + ":" + current_version)
    - pubDate: file mtime in RFC 2822 (UTC)
    - description: minimal HTML summary (wrapped in CDATA)
    """
    data = load_app(filepath)
    if not data:
        return None

    name = str(data.get("name") or filepath.stem).strip()
    current_version = str(data["release"].get("latest_version") or "").strip()
    if not current_version:
        return None

    link = get_release_notes_link(data)

    title = f"{name} {current_version}"
    guid_raw = f"{name}:{current_version}".encode("utf-8")
    guid = hashlib.sha1(guid_raw).hexdigest()

    mtime = dt.datetime.combine(data["release"].get("released_on"), dt.time.min, tzinfo=dt.timezone.utc)
    pub_date = iso_to_rfc2822(mtime)

    # Minimal description — no homepage or extra links
    desc = [
        f"Application: {html.escape(name)}",
        f"Version: {html.escape(current_version)}",
    ]
    description = "\n".join(desc)

    return (title, link, guid, pub_date, description)


def build_rss(items: List[Tuple[str, str, str, str, str]],
              feed_title: str,
              site_url: str,
              feed_description: str) -> ET.ElementTree:
    rss = ET.Element("rss", version="2.0")
    channel = ET.SubElement(rss, "channel")
    ET.SubElement(channel, "title").text = feed_title
    ET.SubElement(channel, "link").text = site_url
    ET.SubElement(channel, "description").text = feed_description
    ET.SubElement(channel, "lastBuildDate").text = iso_to_rfc2822(dt.datetime.now(dt.timezone.utc))
    ET.SubElement(channel, "language").text = "en"

    for title, link, guid, pub_date, description in items:
        it = ET.SubElement(channel, "item")
        ET.SubElement(it, "title").text = title
        if link:
            ET.SubElement(it, "link").text = link  # omitted if empty
        guid_el = ET.SubElement(it, "guid")
        guid_el.text = guid
        guid_el.set("isPermaLink", "false")
        ET.SubElement(it, "pubDate").text = pub_date

        desc_el = ET.SubElement(it, "description")
        desc_el.text = f"<![CDATA[{description}]]>"

    return ET.ElementTree(rss)


def main() -> int:
    arg = argparse.ArgumentParser(description="Generate an RSS feed from application YAMLs")
    arg.add_argument("--apps-dir", required=True, help="Directory where application YAML files live")
    arg.add_argument("--out", required=True, help="Output path for the RSS feed (e.g., docs/feed.xml)")
    arg.add_argument("--site-url", default="https://example.com",
                    help="Channel link (site/home). If you host on GitHub Pages, use your Pages URL")
    arg.add_argument("--feed-title", default="Application Updates", help="RSS channel title")
    arg.add_argument("--feed-description", default="Latest upstream versions detected.", help="RSS description")
    args = arg.parse_args()

    apps_dir = Path(args.apps_dir)
    out_path = Path(args.out)

    if not apps_dir.is_dir():
        print(f"ERROR: apps-dir does not exist or is not a directory: {apps_dir}", file=sys.stderr)
        return 2

    items: List[Tuple[str, str, str, str, str]] = []
    for fp in sorted(apps_dir.glob("*.y*ml")):
        tup = build_item_tuple(fp)
        if tup:
            items.append(tup)

    # Sort by pubDate (RFC2822, GMT) newest first
    items_sorted = sorted(items, key=lambda t: t[3], reverse=True)

    tree = build_rss(
        items_sorted,
        feed_title=args.feed_title,
        site_url=args.site_url,
        feed_description=args.feed_description,
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    tree.write(out_path, encoding="utf-8", xml_declaration=True)
    print(f"Wrote RSS feed: {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())