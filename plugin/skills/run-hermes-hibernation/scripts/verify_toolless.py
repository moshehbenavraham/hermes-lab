#!/usr/bin/env python3
"""Fail closed unless the pinned Hermes runtime exposes zero model tools."""

from __future__ import annotations

import os

from model_tools import get_tool_definitions


def main() -> int:
    forbidden_context = (
        "HERMES_KANBAN_TASK",
        "HERMES_KANBAN_RUN_ID",
        "HERMES_KANBAN_GOAL_MODE",
    )
    present = [name for name in forbidden_context if os.environ.get(name)]
    if present:
        raise RuntimeError(
            "Toolless verification requires an unscoped Hermes process."
        )

    definitions = get_tool_definitions(["kanban"], quiet_mode=True)
    names = sorted(
        item.get("function", {}).get("name", "<unnamed>")
        for item in definitions
    )
    if names:
        raise RuntimeError(
            "Hermes unexpectedly exposed model tools: " + ", ".join(names)
        )

    print("Hermes tool schema verified empty.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
