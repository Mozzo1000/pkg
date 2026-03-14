#!/usr/bin/env python3
"""
Create PRs per application (one app per PR) when a new upstream version is detected.

- Scans applications/*.yaml
- For update_source.type == "github_releases", runs github_releases.py
- If newer version detected, updates only that YAML, commits on a dedicated branch, pushes, and opens a PR
- If a PR already exists for the branch, it logs and moves on
- Collects errors across apps and opens a single issue if any errors occurred

Requirements:
  - Python 3.10+
  - PyYAML
  - GitHub CLI (gh) authenticated (GH_TOKEN/GITHUB_TOKEN)
Permissions:
  - contents: write
  - pull-requests: write
  - issues: write
"""

import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List
import yaml
from datetime import datetime

REPO_ROOT = Path(__file__).resolve().parents[1]
APPS_DIR = REPO_ROOT / "applications"
CHECKER = REPO_ROOT / "scripts" / "github_releases.py"

DEFAULT_BASE = os.getenv("DEFAULT_BASE_BRANCH", "main")

def run(cmd: List[str], check=True, capture=True, env=None) -> subprocess.CompletedProcess:
    """Run a command with sane defaults, capturing stdout/stderr."""
    return subprocess.run(
        cmd,
        check=check,
        capture_output=capture,
        text=True,
        env=env or os.environ.copy(),
        cwd=str(REPO_ROOT),
    )

def info(msg: str):
    print(f"[INFO] {msg}")

def warn(msg: str):
    print(f"[WARN] {msg}")

def error(msg: str):
    print(f"[ERROR] {msg}", file=sys.stderr)

def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^\w\-]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "app"

def load_yaml(path: Path) -> Dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def save_yaml(path: Path, data: Dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, sort_keys=False)

def get_default_branch() -> str:
    """Try to detect default branch via gh; fallback to DEFAULT_BASE."""
    try:
        res = run(["gh", "repo", "view", "--json", "defaultBranchRef"])
        data = json.loads(res.stdout)
        name = data.get("defaultBranchRef", {}).get("name")
        if name:
            return name
    except Exception as e:
        warn(f"Could not query default branch via gh: {e}")
    return DEFAULT_BASE

def pr_exists(branch: str) -> bool:
    try:
        res = run(["gh", "pr", "list", "--head", branch, "--json", "number"], check=False)
        prs = json.loads(res.stdout or "[]")
        return len(prs) > 0
    except Exception:
        return False

def checkout_fresh_branch(base: str, branch: str) -> None:
    run(["git", "fetch", "origin", base], check=False)
    run(["git", "checkout", base])
    run(["git", "pull", "--ff-only"], check=False)
    run(["git", "checkout", "-B", branch, base])

def push_branch(branch: str) -> None:
    run(["git", "push", "-f", "origin", branch])

@dataclass
class AppDef:
    file_path: Path
    name: str
    slug: str
    src: Dict
    versioning: Dict
    release: Dict

def load_app_defs() -> List[AppDef]:
    apps: List[AppDef] = []
    for path in sorted(APPS_DIR.glob("*.y*ml")):
        data = load_yaml(path)
        if not isinstance(data, dict):
            continue
        src = data.get("update_source", {})
        if src.get("type") != "github_releases":
            continue
        name = data.get("name") or path.stem
        apps.append(
            AppDef(
                file_path=path,
                name=name,
                slug=slugify(name),
                src=src,
                versioning=data.get("versioning", {}) or {},
                release=data.get("release", {}) or {}
            )
        )
    return apps


def run_checker(app: AppDef) -> Dict:
    cmd = [
        sys.executable, str(CHECKER),
        "--owner", app.src["owner"],
        "--repo", app.src["repo"],
        "--current-version", app.release.get("latest_version"),
        "--version-scheme", app.versioning.get("scheme", "semver"),
    ]
    if app.src.get("include_prereleases"):
        cmd += ["--include-prereleases", "true"]
    if app.src.get("tag_pattern"):
        cmd += ["--tag-pattern", app.src["tag_pattern"]]
    if app.versioning.get("strip_prefix"):
        cmd += ["--strip-prefix", app.versioning["strip_prefix"]]
    for suf in app.versioning.get("strip_suffix", []) or []:
        cmd += ["--strip-suffix", suf]

    res = run(cmd, check=False)
    if res.returncode != 0:
        raise RuntimeError(f"checker failed: {res.stderr.strip() or res.stdout.strip()}")
    try:
        return json.loads(res.stdout or "{}")
    except json.JSONDecodeError as e:
        raise RuntimeError(f"invalid checker output: {e}: {res.stdout[:500]}")

def create_pr_for_app(app: AppDef, new_tag: str, ctx: Dict, base_branch: str) -> None:
    """
    Update a single app file and create a PR with a dedicated branch.
    """
    branch = f"automation/update/{app.slug}/{new_tag}"
    if pr_exists(branch):
        info(f"PR already exists ({branch}), skipping.")
        return 0

    info(f"Creating PR for {app.name}: {app.release.get("latest_version")} → {new_tag} on {branch}")

    # 1) Create branch from base
    checkout_fresh_branch(base_branch, branch)

    # 2) Update YAML file
    data = load_yaml(app.file_path)
    data["release"]["latest_version"] = new_tag
    data["release"]["released_on"] = datetime.fromisoformat(str(ctx.get('published_at', '')).split("T")[0]).date()
    data["release"]["notes_url"] = ctx.get('release_notes_url', '')
    save_yaml(app.file_path, data)

    # 3) Commit
    commit_title = f"chore({app.slug}): bump {app.name} to {new_tag}"
    run(["git", "add", str(app.file_path.relative_to(REPO_ROOT))])
    commit_msg = commit_title
    run(["git", "commit", "-m", commit_msg], check=False)

    # 4) Push branch
    push_branch(branch)

    # 5) Create PR
    pr_body = [
        f"Automated detection of a new upstream version for **{app.name}**.",
        "",
        f"- Old version: `{app.release.get("latest_version")}`",
        f"- New version: `{new_tag}`",
        f"- Source: `{ctx.get('source', '')}`",
        f"- Published at: `{ctx.get('published_at', '')}`",
        f"- Release notes: {ctx.get('release_notes_url', '')}",
        "",
        f"Detection details: {ctx.get('reason', '')}",
    ]

    # Create new PR
    try:
        args = [
            "gh", "pr", "create",
            "--title", commit_title,
            "--body", "\n".join(pr_body),
            "--base", base_branch,
            "--head", branch,
        ]
        pr_create = run(args, check=False)
        if pr_create.returncode != 0:
            warn(f"PR creation failed for {branch}: {pr_create.stderr.strip() or pr_create.stdout.strip()}")
    except Exception as e:
        warn(f"Failed to create PR for {branch}: {e}")


def main() -> int:
    errors: List[str] = []
    apps = load_app_defs()

    if not apps:
        info("No GitHub Releases-backed applications found.")
        return 0

    base_branch = get_default_branch()
    info(f"Using base branch: {base_branch}")

    for app in apps:
        info(f"Checking {app.name} ({app.file_path.name}) ...")
        try:
            result = run_checker(app)
            if result.get("found") == "true":
                new_tag = result.get("new_version") or result.get("new_tag")
                if not new_tag:
                    warn(f"Detected update for {app.name}, but no tag provided in result.")
                    continue
                create_pr_for_app(app, new_tag, result, base_branch)
            else:
                info(f"No update for {app.name}: {result.get('reason', '')}")
        except Exception as e:
            err = f"{app.file_path.name}: {e}"
            errors.append(err)
            error(err)

    if errors:
        body = "Errors were encountered during automated application version detection:\n\n"
        body += "\n".join(f"- {e}" for e in errors)
        try:
            run([
                "gh", "issue", "create",
                "--title", "Errors during application version detection",
                "--body", body,
                "--label", "automation,bug",
            ], check=False)
        except Exception as e:
            warn(f"Could not file Issue for errors: {e}")

    # Return success even if some apps failed
    return 0


if __name__ == "__main__":
    sys.exit(main())