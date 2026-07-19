#!/usr/bin/env python3
"""
Create PRs per application (one app per PR) when a new upstream version is detected.

- Scans applications/*.yaml
- For update_source.type == "github_releases", runs github_releases.py
- If newer version detected, updates only that YAML, commits on a dedicated branch, pushes, and opens a PR
- If a PR already exists for the branch, it logs and moves on
- Collects errors across apps and opens a single issue if any errors occurred

Requirements:
  - Python 3.12+
  - PyYAML
  - GitHub CLI (gh) authenticated (GH_TOKEN/GITHUB_TOKEN)
Permissions:
  - contents: write
  - pull-requests: write
  - issues: write
"""

import argparse
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

from app_release import resolve_representative
from github_releases import check_update, compare_versions

REPO_ROOT = Path(__file__).resolve().parents[1]
APPS_DIR = REPO_ROOT / "applications"

DEFAULT_BASE = os.getenv("DEFAULT_BASE_BRANCH", "main")
DEFAULT_TIMEOUT = 60
errors: List[str] = []

def run(cmd: List[str], check=True, capture=True, env=None, timeout=DEFAULT_TIMEOUT) -> subprocess.CompletedProcess:
    """Run a command with sane defaults, capturing stdout/stderr."""
    return subprocess.run(
        cmd,
        check=check,
        capture_output=capture,
        text=True,
        env=env or os.environ.copy(),
        cwd=str(REPO_ROOT),
        timeout=timeout,
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


def resolve_current(app: AppDef) -> Dict:
    """Resolves release.platforms/architectures overrides (see
    docs/application_specs.md) down to a single current version to check
    against, for apps that don't set a top-level release.latest_version."""
    scheme = app.versioning.get("scheme", "semver")
    return resolve_representative(
        app.release,
        compare_versions=lambda a, b: compare_versions(a, b, scheme),
    )

def run_checker(app: AppDef, resolved: Dict) -> Dict:
    scheme = app.versioning.get("scheme", "semver")
    result, code = check_update(
        owner=app.src["owner"],
        repo=app.src["repo"],
        current_version=str(resolved.get("latest_version") or ""),
        include_prereleases=bool(app.src.get("include_prereleases")),
        tag_pattern=app.src.get("tag_pattern"),
        strip_prefix=app.versioning.get("strip_prefix"),
        strip_suffix=app.versioning.get("strip_suffix") or None,
        version_scheme=scheme,
    )
    if code != 0:
        err = f"{app.file_path.name}: {result.get('reason', 'checker failed')}"
        errors.append(err)
        raise RuntimeError(err)
    return result

def create_pr_for_app(app: AppDef, new_tag: str, ctx: Dict, base_branch: str, current_version: str, dry_run: bool = False) -> None:
    """
    Update a single app file and create a PR with a dedicated branch.
    """
    # The upstream tag is untrusted (it comes straight from the release's
    # repo) and can contain characters git branch names disallow, or a
    # leading "-" that some git subcommands can misparse as a flag. Slugify
    # it for the branch name only; the raw tag is still used for the YAML
    # value, commit message, and PR body, where it's just data.
    branch = f"automation/update/{app.slug}/{slugify(new_tag)}"

    if dry_run:
        info(
            f"[dry-run] Would bump {app.name}: {current_version} -> {new_tag} "
            f"on branch {branch} (source={ctx.get('source', '')}, "
            f"notes={ctx.get('release_notes_url', '')})"
        )
        return

    if pr_exists(branch):
        info(f"PR already exists ({branch}), skipping.")
        return

    info(f"Creating PR for {app.name}: {current_version} -> {new_tag} on {branch}")

    # 1) Create branch from base
    checkout_fresh_branch(base_branch, branch)

    # 2) Update YAML file
    #
    # Always write to the top-level release.latest_version, even for apps
    # that only had release.platforms overrides set (no global version).
    # Per docs/application_specs.md, per-platform/architecture entries are
    # a human-curated snapshot; automation only tracks a single upstream
    # version per repo, so bumping always targets (and, if absent,
    # creates) the global field. Once set, resolve_representative() always
    # prefers the global field over platform overrides going forward.
    data = load_yaml(app.file_path)
    data["release"]["latest_version"] = new_tag
    published_at = str(ctx.get('published_at') or "").split("T")[0]
    data["release"]["released_on"] = (
        datetime.fromisoformat(published_at).date() if published_at else datetime.now().date()
    )
    data["release"]["notes_url"] = ctx.get('release_notes_url', '')
    save_yaml(app.file_path, data)

    # 3) Commit
    commit_title = f"chore({app.slug}): bump {app.name} to {new_tag}"
    run(["git", "add", str(app.file_path.relative_to(REPO_ROOT))])
    commit_res = run(["git", "commit", "-m", commit_title], check=False)
    if commit_res.returncode != 0:
        warn(
            f"Nothing to commit for {app.name} on {branch}, skipping push/PR: "
            f"{commit_res.stderr.strip() or commit_res.stdout.strip()}"
        )
        return

    # 4) Push branch
    push_branch(branch)

    # 5) Create PR
    pr_body = [
        f"Automated detection of a new upstream version for **{app.name}**.",
        "",
        f"- Old version: `{current_version}`",
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run detection for all apps but skip git/gh writes (no branch, commit, push, PR, or issue creation).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    dry_run = args.dry_run

    apps = load_app_defs()

    if not apps:
        info("No GitHub Releases-backed applications found.")
        return 0

    if dry_run:
        info("Running in --dry-run mode: no branches, commits, pushes, PRs, or issues will be created.")
        base_branch = DEFAULT_BASE
    else:
        base_branch = get_default_branch()
    info(f"Using base branch: {base_branch}")

    for app in apps:
        info(f"Checking {app.name} ({app.file_path.name}) ...")
        try:
            resolved = resolve_current(app)
            result = run_checker(app, resolved)
            if result.get("found") == "true":
                new_tag = result.get("new_version") or result.get("new_tag")
                if not new_tag:
                    warn(f"Detected update for {app.name}, but no tag provided in result.")
                    continue
                current_version = resolved.get("latest_version")
                create_pr_for_app(app, new_tag, result, base_branch, current_version, dry_run=dry_run)
            else:
                info(f"No update for {app.name}: {result.get('reason', '')}")
        except Exception as e:
            err = f"{app.file_path.name}: {e}"
            errors.append(err)
            error(err)

    if errors and dry_run:
        warn(f"{len(errors)} app(s) failed during dry-run detection:")
        for e in errors:
            warn(f"  - {e}")
    elif errors:
        body = f"Errors were encountered during automated application version detection\n Automation ran: {datetime.now()}\n\n"
        body += "```\n"
        body += "\n".join(f"{e}" for e in errors)
        body += "\n```"
        try:
            run([
                "gh", "issue", "create",
                "--title", "Errors during application version detection",
                "--body", body,
                "--label", "automation,bug",
            ], check=False)
        except Exception as e:
            warn(f"Could not file Issue for errors: {e}")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())