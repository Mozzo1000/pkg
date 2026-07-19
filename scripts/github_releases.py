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
- Detects GitHub API rate-limit responses (403/429 with
  X-RateLimit-Remaining: 0) and exits with a clear message (exit code 2)
  instead of a generic HTTP traceback; retries transient 5xx responses
  with exponential backoff

Environment:
  GITHUB_TOKEN or GH_TOKEN recommended to avoid rate limits
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Dict, List, Optional, Tuple


class RateLimitError(RuntimeError):
    """Raised when the GitHub API reports we're rate-limited."""


def github_headers() -> Dict[str, str]:
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _rate_limit_message(headers: Dict[str, str]) -> Optional[str]:
    remaining = headers.get("X-RateLimit-Remaining")
    if remaining != "0":
        return None

    reset = headers.get("X-RateLimit-Reset")
    if reset:
        try:
            wait_s = max(0, int(reset) - int(time.time()))
            return f"GitHub API rate limit exceeded; resets in {wait_s}s"
        except ValueError:
            pass
    return "GitHub API rate limit exceeded"


def http_get_json(url: str, retries: int = 3) -> Tuple[object, Dict[str, str]]:
    attempt = 0
    while True:
        req = urllib.request.Request(url, headers=github_headers())
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                headers = dict(resp.headers)
                return data, headers
        except urllib.error.HTTPError as e:
            headers = dict(e.headers or {})
            if e.code in (403, 429):
                msg = _rate_limit_message(headers)
                if msg:
                    raise RateLimitError(msg) from e
            if e.code >= 500 and attempt < retries:
                attempt += 1
                time.sleep(min(2 ** attempt, 10))
                continue
            raise


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
            v = re.sub(f"{re.escape(suf)}$", "", v)

    return v


def parse_semver(v: str) -> Tuple[Tuple[int, int, int], bool, str]:
    """
    Returns ((major, minor, patch), is_prerelease, prerelease_id)
    """
    core_match = re.match(r"(\d+)(?:\.(\d+))?(?:\.(\d+))?", v)
    if core_match:
        major = int(core_match.group(1))
        minor = int(core_match.group(2) or 0)
        patch = int(core_match.group(3) or 0)
        rest = v[core_match.end():]
    else:
        nums = [int(n) for n in re.findall(r"\d+", v)]
        while len(nums) < 3:
            nums.append(0)
        major, minor, patch = nums[:3]
        rest = v

    prerelease_id = rest.split("-", 1)[1] if "-" in rest else ""
    is_prerelease = bool(prerelease_id) or bool(
        re.search(r"(alpha|beta|rc|pre|dev)", v, re.IGNORECASE)
    )
    return (major, minor, patch), is_prerelease, prerelease_id


def _compare_prerelease_id(a: str, b: str) -> int:
    """SemVer 2.0-style precedence comparison of two prerelease identifier
    strings (e.g. "alpha.1" vs "beta")."""
    a_parts = a.split(".")
    b_parts = b.split(".")
    for ap, bp in zip(a_parts, b_parts):
        a_num, b_num = ap.isdigit(), bp.isdigit()
        if a_num and b_num:
            if int(ap) != int(bp):
                return -1 if int(ap) < int(bp) else 1
        elif a_num != b_num:
            # Numeric identifiers always have lower precedence than
            # alphanumeric identifiers.
            return -1 if a_num else 1
        elif ap.lower() != bp.lower():
            return -1 if ap.lower() < bp.lower() else 1
    if len(a_parts) != len(b_parts):
        return -1 if len(a_parts) < len(b_parts) else 1
    return 0


def compare_versions(a: str, b: str, scheme: str) -> int:
    """
    Returns:
      -1 if a < b
       0 if a == b
       1 if a > b
    """
    if scheme == "semver":
        (a_core, a_pre, a_id) = parse_semver(a)
        (b_core, b_pre, b_id) = parse_semver(b)

        if a_core < b_core:
            return -1
        if a_core > b_core:
            return 1

        # same core → stable > prerelease
        if a_pre != b_pre:
            return -1 if a_pre else 1

        if a_pre and b_pre and a_id != b_id:
            return _compare_prerelease_id(a_id, b_id)

        return 0

    # Generic fallback
    def keyify(s: str):
        return [int(x) if x.isdigit() else x.lower()
                for x in re.findall(r"\d+|[A-Za-z]+", s)]

    return (keyify(a) > keyify(b)) - (keyify(a) < keyify(b))


def fetch_latest_stable_release(owner: str, repo: str) -> Optional[dict]:
    owner_q = urllib.parse.quote(owner, safe="")
    repo_q = urllib.parse.quote(repo, safe="")
    url = f"https://api.github.com/repos/{owner_q}/{repo_q}/releases/latest"
    try:
        data, _ = http_get_json(url)
        return data
    except RateLimitError:
        raise
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
            # Multiline-safe delimiter format (GitHub Actions docs), used
            # unconditionally so a value with an embedded newline can never
            # corrupt subsequent lines of the output file.
            delim = f"ghadelim_{k}"
            fh.write(f"{k}<<{delim}\n{v}\n{delim}\n")


def check_update(
    owner: str,
    repo: str,
    current_version: str,
    include_prereleases: bool = False,
    tag_pattern: Optional[str] = None,
    strip_prefix: Optional[str] = None,
    strip_suffix: Optional[List[str]] = None,
    version_scheme: str = "semver",
) -> Tuple[Dict[str, str], int]:
    """
    Core check logic, importable for in-process use (e.g. by
    detect_and_pr.py) as well as the CLI below.

    Returns (result_dict, exit_code).
    """
    current_norm = normalize_version(current_version, strip_prefix, strip_suffix)

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

    try:
        if not include_prereleases:
            candidate = fetch_latest_stable_release(owner, repo)
            if candidate:
                tag = candidate.get("tag_name", "")
                if tag_matches(tag, tag_pattern):
                    latest = candidate
                    result["source"] = "releases/latest"

        if latest is None:
            owner_q = urllib.parse.quote(owner, safe="")
            repo_q = urllib.parse.quote(repo, safe="")
            releases = fetch_all_pages(
                f"https://api.github.com/repos/{owner_q}/{repo_q}/releases?per_page=100"
            )

            releases = [
                r for r in releases
                if not r.get("draft")
                and (include_prereleases or not r.get("prerelease"))
            ]

            latest = select_latest(
                releases,
                tag_field="tag_name",
                strip_prefix=strip_prefix,
                strip_suffixes=strip_suffix,
                tag_pattern=tag_pattern,
                scheme=version_scheme,
            )

            if latest:
                result["source"] = "releases"

        if latest is None:
            owner_q = urllib.parse.quote(owner, safe="")
            repo_q = urllib.parse.quote(repo, safe="")
            tags = fetch_all_pages(
                f"https://api.github.com/repos/{owner_q}/{repo_q}/tags?per_page=100"
            )

            latest = select_latest(
                tags,
                tag_field="name",
                strip_prefix=strip_prefix,
                strip_suffixes=strip_suffix,
                tag_pattern=tag_pattern,
                scheme=version_scheme,
            )

            if latest:
                result["source"] = "tags"
                latest = {
                    "tag_name": latest["name"],
                    "html_url": f"https://github.com/{owner}/{repo}/releases/tag/{latest['name']}",
                    "published_at": "",
                }
    except RateLimitError as e:
        result["reason"] = str(e)
        return result, 2

    if not latest:
        result["reason"] = "No qualifying release or tag found"
        return result, 0

    new_tag = latest["tag_name"]
    new_norm = normalize_version(new_tag, strip_prefix, strip_suffix)

    if compare_versions(current_norm, new_norm, version_scheme) < 0:
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

    return result, 0


def main() -> int:
    arg = argparse.ArgumentParser()
    arg.add_argument("--owner", required=True)
    arg.add_argument("--repo", required=True)
    arg.add_argument("--current-version", required=True)
    arg.add_argument("--include-prereleases", default="false")
    arg.add_argument("--tag-pattern")
    arg.add_argument("--strip-prefix")
    arg.add_argument("--strip-suffix", action="append")
    arg.add_argument("--version-scheme", default="semver")

    args = arg.parse_args()

    include_prereleases = args.include_prereleases.lower() in ("1", "true", "yes")

    result, code = check_update(
        owner=args.owner,
        repo=args.repo,
        current_version=args.current_version,
        include_prereleases=include_prereleases,
        tag_pattern=args.tag_pattern,
        strip_prefix=args.strip_prefix,
        strip_suffix=args.strip_suffix,
        version_scheme=args.version_scheme,
    )

    print(json.dumps(result, indent=2))
    write_github_output(result)
    return code


if __name__ == "__main__":
    sys.exit(main())