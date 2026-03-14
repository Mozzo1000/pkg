#!/usr/bin/env python3
"""
List applications and versions as JSON, including metadata.

Output structure:
[
  {
    "name": "Pangolin",
    "current_version": "1.4.2",
    "file": "pangolin.yml",
    "metadata": { ... },        # copied as-is from YAML (or {})
  },
  ...
]

Usage:
  python scripts/list_apps_json.py --apps-dir applications
  python scripts/list_apps_json.py --apps-dir applications --pretty
  python scripts/list_apps_json.py --apps-dir applications --out docs/index.json --pretty
  python scripts/list_apps_json.py --apps-dir applications --sort-by name --pretty
  python scripts/list_apps_json.py --apps-dir applications --include-missing

Notes:
- 'current_version' is taken verbatim (vendor string).
- Files without 'current_version' are skipped unless --include-missing.
- 'metadata' are included as-is ({} if not present).
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

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
        version = str(y.get("current_version") or "").strip()

        if not version and not include_missing:
            continue

        metadata = y.get("metadata") if isinstance(y.get("metadata"), dict) else {}

        items.append({
            "name": name,
            "current_version": version,
            "metadata": metadata,
        })
    return items


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Output a JSON list of applications, versions, metadata, and update_source."
    )
    ap.add_argument("--apps-dir", required=True, help="Directory containing application YAML files.")
    ap.add_argument("--out", help="Write JSON to this file instead of stdout.")
    ap.add_argument("--pretty", action="store_true", help="Pretty-print JSON.")
    ap.add_argument("--include-missing", action="store_true",
                    help="Include apps missing current_version (as empty string).")
    ap.add_argument("--sort-by", choices=["name", "current_version", "file"],
                    help="Sort output by a field.")
    args = ap.parse_args()

    apps_dir = Path(args.apps_dir)
    if not apps_dir.is_dir():
        print(f"ERROR: apps-dir not found or not a directory: {apps_dir}", file=sys.stderr)
        return 2

    items = collect_apps(apps_dir, include_missing=args.include_missing if hasattr(args, 'include_missing') else args.include_missing)

    if args.sort_by:
        # Sort case-insensitively for strings
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