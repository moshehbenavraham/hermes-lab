#!/usr/bin/env python3
"""Adopt mounted Codex OAuth into an ephemeral Hermes home without logging it."""

from __future__ import annotations

from pathlib import Path

import yaml

from hermes_cli.auth import (
    DEFAULT_CODEX_BASE_URL,
    _import_codex_cli_tokens,
    _save_codex_tokens,
    _update_config_for_provider,
)


def _required_token(tokens: object, key: str) -> str:
    if not isinstance(tokens, dict):
        raise RuntimeError("Codex OAuth was not available in the expected shape.")
    value = tokens.get(key)
    if not isinstance(value, str) or not value.strip():
        raise RuntimeError(f"Codex OAuth is missing {key}.")
    return value


def main() -> int:
    tokens = _import_codex_cli_tokens()
    _required_token(tokens, "access_token")
    _required_token(tokens, "refresh_token")

    _save_codex_tokens(tokens, label="chatgpt-work")
    config_path = _update_config_for_provider(
        "openai-codex",
        DEFAULT_CODEX_BASE_URL,
        default_model="gpt-5.5",
    )

    path = Path(config_path)
    config = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(config, dict):
        raise RuntimeError("Hermes config must be a mapping.")
    config.setdefault("security", {})["allow_lazy_installs"] = False
    config["toolsets"] = []
    config.setdefault("platform_toolsets", {})["cli"] = []
    config["fallback_providers"] = []
    config.pop("fallback_model", None)
    config.pop("web", None)
    path.write_text(
        yaml.safe_dump(config, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )

    print("Hermes Codex OAuth adopted into the ephemeral runtime.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
