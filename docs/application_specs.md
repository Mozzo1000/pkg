# Application YAML Specification — **Draft**

This document describes how to author `applications/<app>.yml` files so our automation can detect upstream versions.


## Conventions

*   **Vendor version:** All version values stored in YAML are **exact vendor strings** (e.g., keep `v1.2.3` if the vendor uses it).
*   **Normalization policy:** Never normalize in YAML. Any prefix/suffix handling or parsing rules live under `versioning` and are applied at runtime.
*   **Location:** One file per application under `applications/`
*   **Format:** YAML (`.yml` or `.yaml`)
*   **Naming:** Lowercase, hyphenated file names (e.g., `google-chrome.yml`, `syncthing.yml`)

## Top‑level structure overview

```yaml
name: <string>
vendor: <string>                  # optional

metadata:
  homepage: <uri>                 # optional, for human readers and site links
  release_notes: <uri>            # recommended, used as RSS item link if per-release notes not provided
  description: <string>           # optional, short summary

update_source:
  type: <string>                  # required, e.g., github_releases
  # ...type-specific fields (see below)
  include_prereleases: <bool>     # optional, defaults to false
  tag_pattern: <regex>            # optional but recommended for filtering tags

versioning:
  scheme: <string>                # required, e.g., semver
  strip_prefix: <string>          # optional, e.g., "v" for vendors tagging with v1.2.3
  strip_suffix:                   # optional, list of regex end-matches to remove when comparing
    - <regex>
    - <regex>

release:
  latest_version: <string>        # required if platforms not used (vendor string)
  released_on: <date>             # optional, ISO 8601 date (YYYY-MM-DD) when the release was published upstream
  breaking: <bool>                # optional, marks breaking-change release
  security: <bool>                # optional, marks security-relevant release
  notes_url: <uri>                # optional, per-release notes link (preferred over metadata.release_notes)

  platforms:                      # optional, use when versions differ per OS
    windows|macos|linux:
      latest_version: <string>    # required per platform if versions diverge
      released_on: <date>          # optional, overrides global release date for this platform
      breaking: <bool>            # optional override for this platform
      security: <bool>            # optional override for this platform
      notes_url: <uri>            # optional per-platform notes link

      architectures:              # optional, only if arch differs under platform
        x64|arm64|x86|...:
          latest_version: <string>  # required per architecture if diverging
          released_on: <date>        # optional, overrides platform/global release date for this architecture
          breaking: <bool>          # optional override for this architecture
          security: <bool>          # optional override for this architecture
          notes_url: <uri>          # optional per-arch notes link
```

## Fields

### `name` *(string, required)*
Name of the application

### `vendor` *(string, optional)*

### `metadata` *(object, optional)*

*   **`homepage`**: Product website URL. Used for human context and as a fallback site link.
*   **`release_notes`**: Stable release notes or releases listing URL. **Preferred for RSS link** when no per‑release `notes_url` is provided.
*   **`description`**: Short, one‑sentence summary for UI contexts. Not used in detection.

### `update_source` *(object, required)*

*   **`type`**: Must be `github_releases`.
*   **`owner`**: GitHub org/user name for the repository.
*   **`repo`**: GitHub repository name.
*   **`include_prereleases`**: `false` by default. If `true`, pre‑releases and RCs are considered.
*   **`tag_pattern`**: Regex applied to tag names to include only relevant tags (e.g., `^v?\d+\.\d+\.\d+$`).  
    **Detector behavior:**
*   If `include_prereleases: false`, uses `/releases/latest` fast path and validates against `tag_pattern`; otherwise falls back to full listings and selection.
*   If `include_prereleases: true`, queries full listings and applies filtering and version comparison accordingly.

> [!NOTE]
> *(Other types like `rss`, `json`, or `html_scrape` can be introduced with similar, type‑specific fields. These are currently not implemented.)*

### `versioning` *(object, required)*

*   **`scheme`**: Comparison strategy. `semver` is recommended for `major.minor.patch`.
*   **`strip_prefix`**: String removed **only during comparison** (e.g., `"v"` for `v1.2.3`).
*   **`strip_suffix`**: List of regex end‑matches removed **only during comparison** (e.g., `"-stable"`, `"\+build\d+$"`).  
    **Detector behavior:**
*   Parses the detected version and stored version under these rules; compares numerically for semver; treats stable > prerelease.
*   Stored YAML values remain vendor‑exact.

### `release` *(object, required)*
The current, human‑curated snapshot of the latest known release for this application, including optional platform/architecture specializations, release metadata, and links.

#### Fields

*   **`latest_version`**: Vendor version string for the latest release. **Required if `platforms` is not provided.**
*    **`released_on`**: Date the release was published upstream, in **ISO 8601 format (`YYYY-MM-DD`)**. Optional but recommended.
*   **`breaking`**: Boolean flag indicating a release with breaking changes (e.g., major version bump or compatibility changes).
*   **`security`**: Boolean flag indicating a security‑relevant release (e.g., fixes CVEs).
*   **`notes_url`**: URL to release‑specific notes/changelog. **Preferred for RSS link** over `metadata.release_notes` when present.

#### Platform overrides (use when versions differ per OS)

*   **`platforms`**: Map of platform keys to overrides (`windows`, `macos`, `linux`).
    *   **`latest_version`**: Vendor string for this platform’s latest release. **Required if versions diverge by platform.**
    *   **`breaking` / `security`**: Optional booleans overriding global flags for this platform.
    *   **`notes_url`**: Optional per‑platform notes link overriding the global `notes_url`.
    *   **`architectures`**: Optional map (e.g., `x64`, `arm64`, `x86`) if versions diverge within a platform by CPU arch.
        *   **`latest_version`**: Vendor string for this architecture’s latest release. **Required if diverging.**
        *   **`breaking` / `security`**: Optional booleans overriding platform/global flags.
        *   **`notes_url`**: Optional per‑arch notes link overriding platform/global.

**Consumer resolution order:** architecture → platform → global. The most specific scope available is used for version and notes.

## Examples

### Single version application, no difference in plattform/architecture

```yaml
name: Example App

metadata:
  homepage: https://example.com/app
  release_notes: https://github.com/acme/app/releases

update_source:
  type: github_releases
  owner: acme
  repo: app
  include_prereleases: false
  tag_pattern: ^v?\d+\.\d+\.\d+$

versioning:
  scheme: semver
  strip_prefix: "v"

release:
  latest_version: "v3.2.1"
  released_on: "2026-02-18"
  breaking: false
  security: true
  notes_url: https://github.com/acme/app/releases/tag/v3.2.1
```

### Application with different versions by platform and architecture

```yaml
name: Syncthing

metadata:
  homepage: https://syncthing.net/
  release_notes: https://github.com/syncthing/syncthing/releases

update_source:
  type: github_releases
  owner: syncthing
  repo: syncthing
  include_prereleases: false
  tag_pattern: ^v?\d+\.\d+\.\d+$

versioning:
  scheme: semver
  strip_prefix: "v"

release:
  security: true
  notes_url: https://github.com/syncthing/syncthing/releases/tag/v1.26.1

  platforms:
    windows:
      latest_version: "v1.26.1"
      released_on: "2026-02-10"
      architectures:
        x64:
          latest_version: "v1.26.1"
          released_on: "2026-02-10"
        arm64:
          latest_version: "v1.26.1"
          released_on: "2026-02-10"

    macos:
      latest_version: "v1.26.0"
      breaking: true
      notes_url: https://github.com/syncthing/syncthing/releases/tag/v1.26.0
      architectures:
        arm64:
          latest_version: "v1.26.0"
        x64:
          latest_version: "v1.26.0"

    linux:
      latest_version: "v1.26.1"
      architectures:
        x64:
          latest_version: "v1.26.1"
        arm64:
          latest_version: "v1.26.1"
```

## Authoring checklist

- [ ] The file is placed in `applications/` and named in lowercase [kebab‑case](https://developer.mozilla.org/en-US/docs/Glossary/Kebab_case).
- [ ] The YAML includes `name`, `update_source`, `versioning`, and `release`.
- [ ] If versions are the same everywhere: set `release.latest_version`.
- [ ] If versions diverge: set `release.platforms.<platform>.latest_version`, and optionally `architectures` when needed.
- [ ] The stored versions are **exact vendor strings**; do not remove `v` or other decorations.
- [ ] `versioning.scheme` is set (`semver` in most cases). Add `strip_prefix: "v"` for vendors who use `v` tags.
- [ ] `update_source.tag_pattern` is precise and matches the vendors tag convention.