"""Run ONE headless Antigravity (`agy`) call in a worktree.

Quota regex / duration parsing adapted from agy-headless-bridge (MIT licence).
"""
from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import orkiestra.config as _cfg
from orkiestra.errors import AgentError
from orkiestra.models import AgentConfig, AgentResult

logger = logging.getLogger(__name__)

# Support models list in [agent] configuration
if hasattr(_cfg, "_build_section"):
    _orig_build_section = _cfg._build_section

    def _patched_build_section(name: str, cls: type, raw: object):
        models_list = None
        if name == "agent" and isinstance(raw, dict) and "models" in raw:
            raw = dict(raw)
            models_list = raw.pop("models")
        res = _orig_build_section(name, cls, raw)
        if models_list is not None:
            try:
                object.__setattr__(res, "models", tuple(models_list))
            except Exception:
                pass
        return res

    _cfg._build_section = _patched_build_section

QUOTA_RE = re.compile(
    r"quota|rate[ _-]?limit|RESOURCE_EXHAUSTED|(?<!\d)429(?!\d)|too many requests",
    re.IGNORECASE,
)
_DURATION_RE = re.compile(
    r"(\d+)\s*(h|m|s)(?:ours?|rs?|inutes?|ins?|econds?|ecs?)?(?![a-z])"
)
_UNIT_SECONDS = {"h": 3600, "m": 60, "s": 1}
_ANSI_RE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07")


def parse_reset_seconds(text: str) -> int | None:
    """Seconds until quota resets from prose; None if no duration found."""
    hits: dict[str, int] = {}
    for n, unit in _DURATION_RE.findall(text.lower()):
        hits.setdefault(unit, int(n))
    if not hits:
        return None
    return sum(n * _UNIT_SECONDS[u] for u, n in hits.items())


def detect_quota(exit_code: int, text: str) -> tuple[bool, int | None]:
    if exit_code != 0 and QUOTA_RE.search(text):
        return True, parse_reset_seconds(text)
    return False, None


def build_agy_args(
    config: AgentConfig,
    prompt: str,
    worktree: Path,
    *,
    model: str | None,
    timeout_minutes: int,
) -> list[str]:
    args = [
        *config.cmd,
        "-p",
        prompt,
        "--output-format",
        config.output_format,
        "--print-timeout",
        f"{timeout_minutes}m",
    ]
    if model:
        args += ["--model", model]
    if config.skip_permissions:
        args.append("--dangerously-skip-permissions")
    if config.add_dir:
        args += ["--add-dir", str(worktree)]
    args += list(config.extra_args)
    return args


def _try_json(text: str) -> dict | None:
    try:
        data = json.loads(text)
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def parse_output(stdout: str, output_format: str) -> tuple[bool, str, str]:
    """Return (ok, response, error)."""
    text = stdout.replace("\r", "").strip()
    if output_format == "json":
        data = _try_json(text)
        if data is None:
            for line in reversed(text.splitlines()):
                if line.strip().startswith("{"):
                    data = _try_json(line.strip())
                    break
        if data is not None:
            ok = data.get("status") == "SUCCESS"
            return ok, str(data.get("response") or ""), str(data.get("error") or "")
    return bool(text), text, ""


def _hard_timeout(minutes: int) -> float:
    return minutes * 60 + 60


def _run_in_pty(
    args: list[str], cwd: Path, timeout: float, env: dict[str, str] | None = None
) -> tuple[int, str]:
    if sys.platform == "win32":
        raise AgentError("use_pty działa tylko na Linux/macOS")
    import fcntl
    import pty
    import select
    import struct
    import termios

    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 50, 2000, 0, 0))
    try:
        proc = subprocess.Popen(
            args,
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            stdout=slave,
            stderr=slave,
            close_fds=True,
            env=env,
        )
    except FileNotFoundError:
        os.close(master)
        os.close(slave)
        raise
    os.close(slave)
    chunks: list[bytes] = []
    deadline = time.monotonic() + timeout
    try:
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                proc.kill()
                proc.wait()
                raise subprocess.TimeoutExpired(args, timeout)
            ready, _, _ = select.select([master], [], [], min(remaining, 0.5))
            if not ready:
                continue
            try:
                data = os.read(master, 65536)
            except OSError:
                break
            if not data:
                break
            chunks.append(data)
    finally:
        os.close(master)
    exit_code = proc.wait()
    text = b"".join(chunks).decode("utf-8", errors="replace")
    return exit_code, _ANSI_RE.sub("", text)


def _write_log(
    log_path: Path,
    args: list[str],
    prompt: str,
    exit_code: int,
    duration: float,
    stdout: str,
    stderr: str,
) -> None:
    shown = [f"<prompt: {len(prompt)} znaków>" if a == prompt else a for a in args]
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text(
        f"args: {shown}\nexit code: {exit_code}\nduration: {duration:.1f}s\n"
        f"--- stdout ---\n{stdout}\n--- stderr ---\n{stderr}\n",
        encoding="utf-8",
    )


def run_agent(
    prompt: str,
    worktree: Path,
    config: AgentConfig,
    *,
    model: str | None,
    timeout_minutes: int,
    log_path: Path,
    repo_root: Path | None = None,
) -> AgentResult:
    args = build_agy_args(config, prompt, worktree, model=model, timeout_minutes=timeout_minutes)
    start = time.monotonic()
    hard_timeout = _hard_timeout(timeout_minutes)
    stdout = stderr = ""

    env = os.environ.copy()
    if repo_root is None:
        cwd_cand = Path.cwd()
        if (cwd_cand / "tools" / "qa" / "node_modules").exists():
            repo_root = cwd_cand
        elif (worktree / "tools" / "qa" / "node_modules").exists():
            repo_root = worktree
        else:
            try:
                proc = subprocess.run(
                    ["git", "rev-parse", "--git-common-dir"],
                    cwd=worktree,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                if proc.returncode == 0 and proc.stdout.strip():
                    common = Path(proc.stdout.strip())
                    if not common.is_absolute():
                        common = (worktree / common).resolve()
                    repo_root = common.parent
                else:
                    repo_root = worktree
            except Exception:
                repo_root = worktree

    if repo_root is not None and (repo_root / "tools" / "qa" / "node_modules").exists():
        env["NODE_PATH"] = str((repo_root / "tools" / "qa" / "node_modules").resolve())

    try:
        if config.use_pty:
            exit_code, stdout = _run_in_pty(args, worktree, hard_timeout, env=env)
        else:
            proc = subprocess.run(
                args,
                cwd=worktree,
                capture_output=True,
                text=True,
                timeout=hard_timeout,
                stdin=subprocess.DEVNULL,
                check=False,
                env=env,
            )
            exit_code, stdout, stderr = proc.returncode, proc.stdout or "", proc.stderr or ""
    except FileNotFoundError as exc:
        raise AgentError(f"Nie znaleziono polecenia agenta: {config.cmd[0]}") from exc
    except subprocess.TimeoutExpired as exc:
        duration = time.monotonic() - start
        out = exc.stdout
        stdout = out.decode("utf-8", "replace") if isinstance(out, bytes) else (out or "")
        _write_log(log_path, args, prompt, -1, duration, stdout, "timeout")
        return AgentResult(
            ok=False,
            exit_code=-1,
            error="timeout",
            timed_out=True,
            log_path=log_path,
            duration_s=duration,
        )

    ok, response, error = parse_output(stdout, config.output_format)
    if exit_code != 0:
        ok = False
    elif not stdout.strip():
        ok = False
        error = (
            "pusty wynik agy: brak uprawnień (soft-deny) albo błąd TTY – "
            "ustaw agent.use_pty = true"
        )
    # A failed call that exits 0 (e.g. JSON status ERROR) must still be recognised as quota.
    quota, reset = detect_quota(
        exit_code or (0 if ok else 1), f"{stdout}\n{stderr}\n{error}"
    )
    duration = time.monotonic() - start
    _write_log(log_path, args, prompt, exit_code, duration, stdout, stderr)
    if exit_code != 0 and not error:
        error = stderr.strip()[:500]
    return AgentResult(
        ok=ok,
        exit_code=exit_code,
        response=response[:2000],
        error=error,
        quota_exhausted=quota,
        quota_reset_seconds=reset,
        log_path=log_path,
        duration_s=duration,
    )
