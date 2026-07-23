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
    ("GitHub classic token", re.compile(r"ghp_[A-Za-z0-9]{20,}")),
    ("GitHub fine-grained token", re.compile(r"github_pat_[A-Za-z0-9_]{20,}")),
    ("OpenAI-style secret key", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}")),
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}")),
    (
        "literal bearer token",
        re.compile(r"\bBearer\s+[A-Za-z0-9][A-Za-z0-9._~-]{23,}"),
    ),
    (
        "private key",
        re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    ),
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


def scan_secrets(label: str, data: bytes, failures: list[str]) -> None:
    text = decode_text(data)
    if text is None:
        return
    for secret_name, pattern in SECRET_PATTERNS:
        match = pattern.search(text)
        if match:
            line = text.count("\n", 0, match.start()) + 1
            failures.append(f"{label}:{line}: possible {secret_name}")


def scan_archives(root: Path, failures: list[str]) -> None:
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
                    scan_secrets(
                        f"{relative}!{member.filename}",
                        archive.read(member),
                        failures,
                    )
            continue

        try:
            with tarfile.open(archive_path, "r:gz") as archive:
                for member in archive.getmembers():
                    if not member.isfile() or member.size > MAX_TEXT_BYTES:
                        continue
                    extracted = archive.extractfile(member)
                    if extracted is not None:
                        scan_secrets(
                            f"{relative}!{member.name}",
                            extracted.read(),
                            failures,
                        )
        except tarfile.TarError as error:
            failures.append(f"{relative}: invalid archive: {error}")


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

    for relative in FORBIDDEN_PATHS:
        if (root / relative).exists():
            failures.append(f"{relative}: forbidden publication path is present")

    try:
        files = tracked_files(root)
    except (OSError, subprocess.CalledProcessError) as error:
        print(f"Unable to enumerate tracked files: {error}", file=sys.stderr)
        return 1

    for path in files:
        scan_secrets(str(path.relative_to(root)), path.read_bytes(), failures)

    scan_archives(root, failures)
    validate_markdown_links(root, files, failures)

    if failures:
        print("Publication validation failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(
        f"Publication validation passed: {len(files)} tracked files, "
        f"{len(ARCHIVES)} release artifacts, no candidate secrets."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
