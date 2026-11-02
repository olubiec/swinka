#!/usr/bin/env python3
"""Fake `agy` CLI for tests. Behaviour is controlled by env vars (see below)."""
from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

WRITE_RE = re.compile(r"^\s*FAKE_WRITE:\s*(\S+)\s*$")


def _arg(argv: list[str], flag: str, default: str = "") -> str:
    if flag in argv:
        i = argv.index(flag)
        if i + 1 < len(argv):
            return argv[i + 1]
    return default


def _pop_mode() -> str:
    modes_file = os.environ.get("FAKE_AGY_MODES_FILE")
    if modes_file:
        path = Path(modes_file)
        if path.is_file() and path.read_text(encoding="utf-8").strip():
            lines = path.read_text(encoding="utf-8").splitlines()
            path.write_text("\n".join(lines[1:]) + ("\n" if lines[1:] else ""), encoding="utf-8")
            return lines[0].strip()
    return os.environ.get("FAKE_AGY_MODE", "edit")


def _succeed(fmt: str) -> int:
    if fmt == "json":
        print(json.dumps({"status": "SUCCESS", "response": "DONE: fake", "error": "", "usage": {}}))
    else:
        print("DONE: fake")
    return 0


def _error(fmt: str, msg: str) -> int:
    if fmt == "json":
        print(json.dumps({"status": "ERROR", "response": "", "error": msg, "usage": {}}))
    else:
        print(msg, file=sys.stderr)
    return 1


def _write_result(status: str, note: str) -> None:
    Path(".orkiestra-result.json").write_text(
        json.dumps({"status": status, "note": note}), encoding="utf-8"
    )


def _edit(prompt: str) -> None:
    for line in prompt.splitlines():
        m = WRITE_RE.match(line)
        if m:
            target = Path(m.group(1))
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("written by fake agy\n", encoding="utf-8")
    _write_result("done", "fake")


def main() -> int:
    argv = sys.argv[1:]
    prompt = _arg(argv, "-p")
    fmt = _arg(argv, "--output-format", "text")
    log = os.environ.get("FAKE_AGY_LOG")
    if log:
        with open(log, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(argv) + "\n")
    mode = _pop_mode()
    if mode == "quota":
        return _error(fmt, "RESOURCE_EXHAUSTED: quota exceeded, resets in 2 minutes")
    if mode == "fail":
        return _error(fmt, "boom")
    if mode == "empty":
        return 0
    if mode == "noop":
        return _succeed(fmt)
    if mode == "blocked":
        _write_result("blocked", "fake blocked")
        return _succeed(fmt)
    if mode == "sleep":
        time.sleep(float(os.environ.get("FAKE_AGY_SLEEP") or 5))
    _edit(prompt)
    return _succeed(fmt)


if __name__ == "__main__":
    sys.exit(main())
