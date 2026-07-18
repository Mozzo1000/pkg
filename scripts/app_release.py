#!/usr/bin/env python3
"""
Resolution logic for the release/platforms/architectures schema documented
in docs/application_specs.md.

A `release:` block may set fields directly (global scope) and/or override
them per platform (`release.platforms.<platform>`) and per architecture
within a platform (`release.platforms.<platform>.architectures.<arch>`).

Resolution order: architecture -> platform -> global. The most specific
scope available wins for each individual field (latest_version,
released_on, breaking, security, notes_url).
"""

from typing import Any, Callable, Dict, List, Optional

FIELDS = ("latest_version", "released_on", "breaking", "security", "notes_url")


def _layer(data: Dict[str, Any]) -> Dict[str, Any]:
    return {field: data.get(field) for field in FIELDS}


def _merge(base: Dict[str, Any], overlay: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(base)
    for field in FIELDS:
        if overlay.get(field) is not None:
            merged[field] = overlay[field]
    return merged


def resolve_platform_arch(
    release: Dict[str, Any], platform: str, arch: Optional[str] = None
) -> Dict[str, Any]:
    """Resolve a release dict for one platform (+ optional architecture),
    merging architecture -> platform -> global."""
    resolved = _layer(release)

    platforms = release.get("platforms") or {}
    platform_data = platforms.get(platform) or {}
    resolved = _merge(resolved, _layer(platform_data))

    if arch:
        architectures = platform_data.get("architectures") or {}
        arch_data = architectures.get(arch) or {}
        resolved = _merge(resolved, _layer(arch_data))

    return resolved


def iter_leaf_releases(release: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Fully-resolved release dict for every platform/architecture leaf
    under release.platforms, merged down through platform and global
    scope. Empty list if no platforms are defined."""
    platforms = release.get("platforms") or {}
    leaves: List[Dict[str, Any]] = []

    for platform_name, platform_data in platforms.items():
        if not isinstance(platform_data, dict):
            continue
        architectures = platform_data.get("architectures") or {}
        if architectures:
            for arch_name in architectures:
                leaves.append(resolve_platform_arch(release, platform_name, arch_name))
        else:
            leaves.append(resolve_platform_arch(release, platform_name))

    return leaves


def resolve_representative(
    release: Dict[str, Any],
    compare_versions: Optional[Callable[[str, str], int]] = None,
) -> Dict[str, Any]:
    """Resolve a single release dict for contexts that don't target a
    specific platform (the JSON/RSS feeds, and the automated version
    checker's "current version" baseline).

    Uses the global `latest_version` if set (this is what
    detect_and_pr.py always writes to, so once an app has been
    auto-bumped once it stays on this path). Otherwise falls back to the
    highest version found across all platform/architecture leaves,
    using `compare_versions(a, b) -> -1/0/1` if provided, else the first
    leaf encountered.
    """
    if release.get("latest_version"):
        return _layer(release)

    leaves = iter_leaf_releases(release)
    candidates = [leaf for leaf in leaves if leaf.get("latest_version")]
    if not candidates:
        return _layer(release)

    if compare_versions is None:
        return candidates[0]

    best = candidates[0]
    for leaf in candidates[1:]:
        if compare_versions(best.get("latest_version", ""), leaf.get("latest_version", "")) < 0:
            best = leaf
    return best
