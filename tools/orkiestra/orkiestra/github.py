from __future__ import annotations

import json
import logging
import subprocess
import time
from collections.abc import Callable
from pathlib import Path

from orkiestra.errors import GitHubError

logger = logging.getLogger(__name__)

MERGE_TRIES = 5


def run_gh(args: list[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess[str]:
    try:
        result = subprocess.run(
            ["gh", *args], cwd=cwd, capture_output=True, encoding="utf-8", errors="replace", check=False
        )
    except FileNotFoundError as exc:
        raise GitHubError("Nie znaleziono gh – zainstaluj GitHub CLI") from exc
    if check and result.returncode != 0:
        second = args[1] if len(args) > 1 else ""
        raise GitHubError(
            f"gh {args[0]} {second} nie powiodło się", stderr=result.stderr
        )
    return result


def ensure_ready(repo_root: Path) -> None:
    result = run_gh(["auth", "status"], repo_root, check=False)
    if result.returncode != 0:
        raise GitHubError("gh nie jest zalogowany – uruchom: gh auth login")


def find_open_pr(repo_root: Path, branch: str) -> str | None:
    result = run_gh(
        ["pr", "list", "--head", branch, "--state", "open", "--json", "url", "--limit", "1"],
        repo_root,
    )
    try:
        data = json.loads(result.stdout or "[]")
    except json.JSONDecodeError:
        return None
    if isinstance(data, list) and data and isinstance(data[0], dict):
        url = data[0].get("url")
        return url if isinstance(url, str) and url else None
    return None


def create_pr(repo_root: Path, branch: str, base: str, title: str, body: str) -> str:
    existing = find_open_pr(repo_root, branch)
    if existing:
        return existing
    result = run_gh(
        ["pr", "create", "--head", branch, "--base", base, "--title", title, "--body", body],
        repo_root,
    )
    for line in reversed(result.stdout.splitlines()):
        line = line.strip()
        if line.startswith("https://"):
            return line
    raise GitHubError("Nie udało się odczytać URL utworzonego PR", stderr=result.stderr)


def checks_state(pr_url: str, cwd: Path) -> str:
    result = run_gh(["pr", "checks", pr_url, "--json", "name,bucket"], cwd, check=False)
    try:
        data = json.loads(result.stdout)
    except (json.JSONDecodeError, TypeError):
        data = None
    if isinstance(data, list):
        if not data:
            return "none"
        buckets = {item.get("bucket") for item in data if isinstance(item, dict)}
        if buckets & {"fail", "cancel"}:
            return "fail"
        if "pending" in buckets:
            return "pending"
        return "pass"
    combined = f"{result.stdout}\n{result.stderr}".lower()
    if "no checks reported" in combined:
        return "none"
    raise GitHubError("gh pr checks nie powiodło się", stderr=result.stderr)


def wait_for_checks(
    pr_url: str,
    cwd: Path,
    timeout_minutes: int,
    *,
    poll_seconds: int = 30,
    grace_seconds: int = 60,
    sleep: Callable[[float], None] = time.sleep,
    clock: Callable[[], float] = time.monotonic,
) -> str:
    start = clock()
    while True:
        state = checks_state(pr_url, cwd)
        elapsed = clock() - start
        if state in ("pass", "fail"):
            return state
        if state == "none" and elapsed >= grace_seconds:
            return "none"
        if elapsed >= timeout_minutes * 60:
            return "timeout"
        sleep(poll_seconds)


def mergeable(pr_url: str, cwd: Path) -> str:
    result = run_gh(["pr", "view", pr_url, "--json", "mergeable"], cwd)
    try:
        data = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return "UNKNOWN"
    value = data.get("mergeable") if isinstance(data, dict) else None
    return value if isinstance(value, str) and value else "UNKNOWN"


def merge_pr(
    pr_url: str, cwd: Path, *, sleep: Callable[[float], None] = time.sleep
) -> None:
    stderr = ""
    for attempt in range(MERGE_TRIES):
        if mergeable(pr_url, cwd) == "CONFLICTING":
            raise GitHubError("Konflikt – PR wymaga rebase")
        result = run_gh(["pr", "merge", pr_url, "--squash"], cwd, check=False)
        if result.returncode == 0:
            return
        stderr = result.stderr
        logger.warning("gh pr merge failed (try %d): %s", attempt + 1, stderr)
        if attempt < MERGE_TRIES - 1:
            sleep(5)
    raise GitHubError("Nie udało się zmergować PR", stderr=stderr)


def comment(pr_url: str, cwd: Path, body: str) -> None:
    run_gh(["pr", "comment", pr_url, "--body", body], cwd, check=False)
