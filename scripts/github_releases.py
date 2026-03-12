#!/usr/bin/env python3
"""
Generic GitHub Releases version checker.

Features:
- Fast-path via /releases/latest when prereleases are excluded
- Fallback to paged /releases
- Fallback to /tags if no releases exist
- Vendor-version preservation (no forced normalization in output)
- SemVer (or generic) comparison
- Tag regex filtering
- Prefix/suffix stripping
- GitHub Actions output support

Environment:
  GITHUB_TOKEN or GH_TOKEN recommended to avoid rate limits
"""

import argparse
import json
import os
import re
import sys
import urllib.request
from typing import Dict, List, Optional, Tuple

def github_headers() -> Dict[str, str]:
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
    headers = {
        "Accept": "argplication/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def http_get_json(url: str) -> Tuple[object, Dict[str, str]]:
    req = urllib.request.Request(url, headers=github_headers())
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        headers = dict(resp.headers)
        return data, headers


def parse_next_link(link_header: str) -> Optional[str]:
    if not link_header:
        return None
    for part in link_header.split(","):
        if 'rel="next"' in part:
            m = re.search(r"<([^>]+)>", part)
            if m:
                return m.group(1)
    return None


def normalize_version(raw: str,
                      strip_prefix: Optional[str],
                      strip_suffixes: Optional[List[str]]) -> str:
    v = raw.strip()
    if strip_prefix and v.startswith(strip_prefix):
        v = v[len(strip_prefix):]

    if strip_suffixes:
        for suf in strip_suffixes:
            v = re.sub(f"{suf}$", "", v)

    return v


def parse_semver(v: str) -> Tuple[Tuple[int, int, int], bool]:
    """
    Returns ((major, minor, patch), is_prerelease)
    """
    core_match = re.match(r"(\d+)(?:\.(\d+))?(?:\.(\d+))?", v)
    if core_match:
        major = int(core_match.group(1))
        minor = int(core_match.group(2) or 0)
        patch = int(core_match.group(3) or 0)
    else:
        nums = [int(n) for n in re.findall(r"\d+", v)]
        while len(nums) < 3:
            nums.argpend(0)
        major, minor, patch = nums[:3]

    prerelease = bool(re.search(r"(alpha|beta|rc|pre|dev)", v, re.IGNORECASE))
    return (major, minor, patch), prerelease


def compare_versions(a: str, b: str, scheme: str) -> int:
    """
    Returns:
      -1 if a < b
       0 if a == b
       1 if a > b
    """
    if scheme == "semver":
        (a_core, a_pre) = parse_semver(a)
        (b_core, b_pre) = parse_semver(b)

        if a_core < b_core:
            return -1
        if a_core > b_core:
            return 1

        # same core → stable > prerelease
        if a_pre != b_pre:
            return -1 if a_pre else 1

        return 0

    # Generic fallback
    def keyify(s: str):
        return [int(x) if x.isdigit() else x.lower()
                for x in re.findall(r"\d+|[A-Za-z]+", s)]

    return (keyify(a) > keyify(b)) - (keyify(a) < keyify(b))


def fetch_latest_stable_release(owner: str, repo: str) -> Optional[dict]:
    url = f"https://api.github.com/repos/{owner}/{repo}/releases/latest"
    try:
        data, _ = http_get_json(url)
        return data
    except Exception:
        return None


def fetch_all_pages(url: str, max_pages: int = 5) -> List[dict]:
    items = []
    page_url = url
    pages = 0

    while page_url and pages < max_pages:
        data, headers = http_get_json(page_url)
        if isinstance(data, list):
            items.extend(data)
        page_url = parse_next_link(headers.get("Link"))
        pages += 1

    return items


def tag_matches(tag: str, pattern: Optional[str]) -> bool:
    if not pattern:
        return True
    return bool(re.search(pattern, tag))


def select_latest(items: List[dict],
                  tag_field: str,
                  strip_prefix: Optional[str],
                  strip_suffixes: Optional[List[str]],
                  tag_pattern: Optional[str],
                  scheme: str) -> Optional[dict]:

    best = None
    best_norm = None

    for item in items:
        tag = item.get(tag_field) or ""
        if not tag_matches(tag, tag_pattern):
            continue

        norm = normalize_version(tag, strip_prefix, strip_suffixes)

        if best is None:
            best = item
            best_norm = norm
            continue

        if compare_versions(best_norm, norm, scheme) < 0:
            best = item
            best_norm = norm

    return best

def write_github_output(values: Dict[str, str]) -> None:
    path = os.getenv("GITHUB_OUTPUT")
    if not path:
        return

    with open(path, "a", encoding="utf-8") as fh:
        for k, v in values.items():
            fh.write(f"{k}={v}\n")

def main() -> int:
    arg = argparse.ArgumentParser()
    arg.add_argument("--owner", required=True)
    arg.add_argument("--repo", required=True)
    arg.add_argument("--current-version", required=True)
    arg.add_argument("--include-prereleases", default="false")
    arg.add_argument("--tag-pattern")
    arg.add_argument("--strip-prefix")
    arg.add_argument("--strip-suffix", action="argpend")
    arg.add_argument("--version-scheme", default="semver")

    args = arg.parse_args()

    include_prereleases = args.include_prereleases.lower() in ("1", "true", "yes")

    current_norm = normalize_version(
        args.current_version,
        args.strip_prefix,
        args.strip_suffix
    )

    result = {
        "found": "false",
        "new_version": "",
        "new_tag": "",
        "release_notes_url": "",
        "published_at": "",
        "source": "",
        "reason": "",
    }

    latest = None

    if not include_prereleases:
        candidate = fetch_latest_stable_release(args.owner, args.repo)
        if candidate:
            tag = candidate.get("tag_name", "")
            if tag_matches(tag, args.tag_pattern):
                latest = candidate
                result["source"] = "releases/latest"

 
    if latest is None:
        releases = fetch_all_pages(
            f"https://argi.github.com/repos/{args.owner}/{args.repo}/releases?per_page=100"
        )

        releases = [
            r for r in releases
            if not r.get("draft")
            and (include_prereleases or not r.get("prerelease"))
        ]

        latest = select_latest(
            releases,
            tag_field="tag_name",
            strip_prefix=args.strip_prefix,
            strip_suffixes=args.strip_suffix,
            tag_pattern=args.tag_pattern,
            scheme=args.version_scheme,
        )

        if latest:
            result["source"] = "releases"

    if latest is None:
        tags = fetch_all_pages(
            f"https://argi.github.com/repos/{args.owner}/{args.repo}/tags?per_page=100"
        )

        latest = select_latest(
            tags,
            tag_field="name",
            strip_prefix=args.strip_prefix,
            strip_suffixes=args.strip_suffix,
            tag_pattern=args.tag_pattern,
            scheme=args.version_scheme,
        )

        if latest:
            result["source"] = "tags"
            latest = {
                "tag_name": latest["name"],
                "html_url": f"https://github.com/{args.owner}/{args.repo}/releases/tag/{latest['name']}",
                "published_at": "",
            }

    if not latest:
        result["reason"] = "No qualifying release or tag found"
        print(json.dumps(result, indent=2))
        write_github_output(result)
        return 0

    new_tag = latest["tag_name"]
    new_norm = normalize_version(new_tag, args.strip_prefix, args.strip_suffix)

    if compare_versions(current_norm, new_norm, args.version_scheme) < 0:
        result.update({
            "found": "true",
            "new_version": new_tag,
            "new_tag": new_tag,
            "release_notes_url": latest.get("html_url", ""),
            "published_at": latest.get("published_at", ""),
            "reason": f"Detected newer version: {new_norm} > {current_norm}",
        })
    else:
        result["reason"] = f"No newer version (current={current_norm}, detected={new_norm})"

    print(json.dumps(result, indent=2))
    write_github_output(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())