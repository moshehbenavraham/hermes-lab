#!/usr/bin/env python3
"""Validate the public Hermes Lab repository before and after publication."""

from __future__ import annotations

import re
import subprocess
import sys
import tarfile
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlparse


MAX_TEXT_BYTES = 5 * 1024 * 1024
FORBIDDEN_PATHS = (
    "logs",
    "control-plane/node_modules",
    "control-plane/.wrangler",
    "control-plane/dist",
    "artifacts/hermes-control-plane-site.tar.gz",
    "artifacts/hermes-hibernation-plugin-preconnection.zip",
)
ARCHIVES = (
    "artifacts/hermes-hibernation-plugin-v0.3.0.zip",
    "artifacts/run-hermes-hibernation-skill-v0.3.0.zip",
    "artifacts/hermes-control-plane-site-v4.tar.gz",
)
SECRET_PATTERNS = (
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"\bsk-[A-Za-z0-9_-]{20,}"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}"),
    re.compile(r"\bBearer\s+[A-Za-z0-9][A-Za-z0-9._~-]{23,}"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
)
MARKDOWN_LINK = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")


def tracked_files(root: Path) -> list[Path]:
    result = subprocess.run(
        ["git", "-C", str(root), "ls-files", "-z"],
        check=True,
        capture_output=True,
    )
    paths = []
    for raw_path in result.stdout.split(b"\0"):
        if not raw_path:
            continue
        relative = Path(raw_path.decode("utf-8", errors="strict"))
        candidate = root / relative
        if candidate.is_file():
            paths.append(candidate)
    return paths


def decode_text(data: bytes) -> str | None:
    if len(data) > MAX_TEXT_BYTES or b"\0" in data:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return None


def contains_candidate_secret(data: bytes) -> bool:
    text = decode_text(data)
    if text is None:
        return False
    return any(pattern.search(text) is not None for pattern in SECRET_PATTERNS)


def scan_archives(root: Path, failures: list[str]) -> bool:
    candidate_secret_found = False
    for relative in ARCHIVES:
        archive_path = root / relative
        if not archive_path.is_file():
            failures.append(f"{relative}: required release artifact is missing")
            continue

        if zipfile.is_zipfile(archive_path):
            with zipfile.ZipFile(archive_path) as archive:
                for member in archive.infolist():
                    if member.is_dir() or member.file_size > MAX_TEXT_BYTES:
                        continue
                    candidate_secret_found = (
                        contains_candidate_secret(archive.read(member))
                        or candidate_secret_found
                    )
            continue

        try:
            with tarfile.open(archive_path, "r:gz") as archive:
                for member in archive.getmembers():
                    if not member.isfile() or member.size > MAX_TEXT_BYTES:
                        continue
                    extracted = archive.extractfile(member)
                    if extracted is not None:
                        candidate_secret_found = (
                            contains_candidate_secret(extracted.read())
                            or candidate_secret_found
                        )
        except tarfile.TarError as error:
            failures.append(f"{relative}: invalid archive: {error}")
    return candidate_secret_found


def validate_markdown_links(root: Path, files: list[Path], failures: list[str]) -> None:
    for path in files:
        if path.suffix.lower() != ".md":
            continue
        text = decode_text(path.read_bytes())
        if text is None:
            continue
        for match in MARKDOWN_LINK.finditer(text):
            target = match.group(1).strip().strip("<>")
            if not target or target.startswith("#"):
                continue
            parsed = urlparse(target)
            if parsed.scheme or target.startswith("//"):
                continue
            relative_target = unquote(target.split("#", 1)[0].split("?", 1)[0])
            if not relative_target:
                continue
            resolved = (path.parent / relative_target).resolve()
            try:
                resolved.relative_to(root)
            except ValueError:
                line = text.count("\n", 0, match.start()) + 1
                failures.append(
                    f"{path.relative_to(root)}:{line}: link escapes repository: {target}"
                )
                continue
            if not resolved.exists():
                line = text.count("\n", 0, match.start()) + 1
                failures.append(
                    f"{path.relative_to(root)}:{line}: missing link target: {target}"
                )


def main() -> int:
    root = (
        Path(sys.argv[1]).resolve()
        if len(sys.argv) > 1
        else Path(__file__).resolve().parents[1]
    )
    failures: list[str] = []

    try:
        files = tracked_files(root)
    except (OSError, subprocess.CalledProcessError) as error:
        print(f"Unable to enumerate tracked files: {error}", file=sys.stderr)
        return 1

    tracked_relative = {path.relative_to(root).as_posix() for path in files}
    for relative in FORBIDDEN_PATHS:
        if relative in tracked_relative or any(
            path.startswith(f"{relative}/") for path in tracked_relative
        ):
            failures.append(f"{relative}: forbidden publication path is tracked")

    candidate_secret_found = False
    for path in files:
        candidate_secret_found = (
            contains_candidate_secret(path.read_bytes()) or candidate_secret_found
        )

    candidate_secret_found = (
        scan_archives(root, failures) or candidate_secret_found
    )
    validate_markdown_links(root, files, failures)

    if candidate_secret_found:
        print(
            "Publication validation failed: candidate secret detected.",
            file=sys.stderr,
        )
    if failures:
        print("Publication validation failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
    if candidate_secret_found or failures:
        return 1

    print(
        f"Publication validation passed: {len(files)} tracked files, "
        f"{len(ARCHIVES)} release artifacts, no candidate secrets."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
