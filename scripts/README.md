# Scripts

Python utilities that power the PKG registry: detecting new upstream releases,
opening bump PRs, and generating the RSS feed / JSON feed consumed by the
website.

## Setup

All scripts require Python 3.12+ and [PyYAML](https://pypi.org/project/PyYAML/):

```bash
pip install pyyaml
```

`detect_and_pr.py` also requires the [GitHub CLI](https://cli.github.com/)
(`gh`), authenticated (`gh auth login`, or a `GH_TOKEN`/`GITHUB_TOKEN`
environment variable) with permission to push branches and open PRs/issues on
the repo.

All commands below are run from the repository root.

---

## `github_releases.py`

Checks a single GitHub repo for a newer release/tag than the version you give
it. Prints a JSON result to stdout and, if run in GitHub Actions, writes the
same fields to `$GITHUB_OUTPUT`. Read-only — makes no changes to anything.

```bash
python scripts/github_releases.py \
  --owner dani-garcia --repo vaultwarden \
  --current-version 1.35.7
```

Useful for testing a single app's detection in isolation, e.g. after editing
its `applications/*.yml` or when debugging why an app isn't being detected.

Key options:

| Flag | Purpose |
|---|---|
| `--owner` / `--repo` | GitHub repo to check (required) |
| `--current-version` | Version currently on record (required) |
| `--include-prereleases` | `true`/`false` — include pre-release tags |
| `--tag-pattern` | Regex a tag must match to be considered |
| `--strip-prefix` | Prefix to strip before comparing versions (e.g. `v`) |
| `--strip-suffix` | Suffix to strip; repeatable |
| `--version-scheme` | `semver` (default) or `generic` |

Set `GITHUB_TOKEN` or `GH_TOKEN` in your environment to avoid the 60
requests/hour unauthenticated GitHub API rate limit.

---

## `detect_and_pr.py`

Orchestrator: scans every `applications/*.yml` with
`update_source.type: github_releases`, runs `github_releases.py` for each,
and for anything newer opens a dedicated branch + PR bumping that app's
`release.latest_version`. Files a GitHub issue summarizing errors, if any.

```bash
python scripts/detect_and_pr.py
```

Environment variables:

| Variable | Purpose |
|---|---|
| `GH_TOKEN` / `GITHUB_TOKEN` | Required — used by `gh` and the GitHub API calls |
| `DEFAULT_BASE_BRANCH` | Base branch for PRs (default: `main`, or whatever `gh repo view` reports) |

### Dry run (recommended for local testing)

`--dry-run` runs full detection across every app but skips all git/gh writes
— no branch, commit, push, PR, or issue is created. It just logs what it
*would* do:

```bash
python scripts/detect_and_pr.py --dry-run
```

This is safe to run directly against your working copy of the repo — no
scratch clone needed — since it never touches git state or calls `gh` for
anything beyond the read-only default-branch check (which itself is skipped
in dry-run mode).

---

## `build_feed.py`

Generates an RSS 2.0 feed (`feed.xml`) from `applications/*.yml`, one item
per app's current known version.

```bash
python scripts/build_feed.py \
  --apps-dir applications \
  --out web/dist/feed.xml \
  --site-url "https://pkg.rewake.org" \
  --feed-title "Application Updates"
```

| Flag | Purpose |
|---|---|
| `--apps-dir` | Directory of app YAML files (required) |
| `--out` | Output path for the RSS XML (required) |
| `--site-url` | Channel `<link>` (default: `https://example.com`) |
| `--feed-title` | Feed title |
| `--feed-description` | Feed description |

---

## `generate_json.py`

Generates `apps.json`, the JSON feed the Preact website (`web/`) fetches at
`/apps.json` to render the app table.

```bash
python scripts/generate_json.py \
  --apps-dir applications \
  --out web/dist/apps.json \
  --pretty
```

| Flag | Purpose |
|---|---|
| `--apps-dir` | Directory of app YAML files (required) |
| `--out` | Write JSON to this file (omit to print to stdout) |
| `--pretty` | Pretty-print the JSON output |
| `--include-missing` | Include apps that have no `release.latest_version` set |
| `--sort-by` | `name` or `latest_version` |

`npm run dev` in `web/` runs this automatically via a `predev` hook
(`web/scripts/generate-dev-data.mjs`), writing straight to
`web/public/apps.json` — no manual step needed for local frontend
development. That hook shells out to whichever of `python`/`python3` is on
your `PATH`; if neither works it just warns and lets `npm run dev` continue,
so you can still run the command above manually if needed.
