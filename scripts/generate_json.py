#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
import datetime

import yaml

def load_yaml(path: Path) -> Optional[Dict[str, Any]]:
    try:
        with path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data if isinstance(data, dict) else None
    except Exception as e:
        print(f"WARNING: Failed to parse {path.name}: {e}", file=sys.stderr)
        return None

def collect_apps(apps_dir: Path, include_missing: bool) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for fp in sorted(apps_dir.glob("*.y*ml")):
        y = load_yaml(fp)
        if not y:
            continue

        name = str(y.get("name") or fp.stem).strip()
        
        # Extract the release block
        release_info = y.get("release") if isinstance(y.get("release"), dict) else {}
        version = str(release_info.get("latest_version") or "").strip()

        if not version and not include_missing:
            continue

        # Handle Date serialization
        released_on = release_info.get("released_on")
        if isinstance(released_on, (datetime.date, datetime.datetime)):
            released_on_str = released_on.isoformat()
        else:
            released_on_str = str(released_on or "")

        # Handle Metadata
        metadata = y.get("metadata") if isinstance(y.get("metadata"), dict) else {}

        # Get the notes URL - priority to specific release notes, fallback to general notes
        notes_url = release_info.get("notes_url") or metadata.get("release_notes", "")

        items.append({
            "name": name,
            "latest_version": version,
            "released_on": released_on_str,
            "release_notes": notes_url,
            "metadata": metadata,
            "security": release_info.get("security", False),
            "breaking": release_info.get("breaking", False)
        })
    return items

def main() -> int:
    ap = argparse.ArgumentParser(description="Output a JSON list of apps from the YAML spec.")
    ap.add_argument("--apps-dir", required=True, help="Directory containing YAML files.")
    ap.add_argument("--out", help="Write JSON to this file.")
    ap.add_argument("--pretty", action="store_true", help="Pretty-print JSON.")
    ap.add_argument("--include-missing", action="store_true", help="Include apps missing version.")
    ap.add_argument("--sort-by", choices=["name", "current_version"], help="Sort output.")
    args = ap.parse_args()

    apps_dir = Path(args.apps_dir)
    if not apps_dir.is_dir():
        print(f"ERROR: apps-dir not found: {apps_dir}", file=sys.stderr)
        return 2

    items = collect_apps(apps_dir, include_missing=args.include_missing)

    if args.sort_by:
        items.sort(key=lambda x: (x.get(args.sort_by) or "").lower())

    indent = 2 if args.pretty else None
    text = json.dumps(items, indent=indent, ensure_ascii=False)

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(text, encoding="utf-8")
        print(f"Wrote {len(items)} items → {out_path}")
    else:
        print(text)

    return 0

if __name__ == "__main__":
    raise SystemExit(main())