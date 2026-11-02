from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from orkiestra import github
from orkiestra.errors import GitHubError


class FakeGh:
    """Records gh calls; responses chosen by first matching rule (queue per rule)."""

    def __init__(self) -> None:
        self.calls: list[list[str]] = []
        self.rules: list[tuple[tuple[str, ...], list[tuple[int, str, str]]]] = []

    def add(self, prefix: tuple[str, ...], *responses: tuple[int, str, str]) -> None:
        self.rules.append((prefix, list(responses)))

    def __call__(self, args, **kwargs):  # noqa: ANN001, ANN003
        self.calls.append(list(args))
        gh_args = tuple(args[1:])
        for prefix, queue in self.rules:
            if gh_args[: len(prefix)] == prefix:
                code, out, err = queue.pop(0) if len(queue) > 1 else queue[0]
                return subprocess.CompletedProcess(args, code, out, err)
        return subprocess.CompletedProcess(args, 0, "", "")

    def count(self, *prefix: str) -> int:
        return sum(1 for c in self.calls if tuple(c[1 : 1 + len(prefix)]) == prefix)


@pytest.fixture
def fake(monkeypatch: pytest.MonkeyPatch) -> FakeGh:
    f = FakeGh()
    monkeypatch.setattr(github.subprocess, "run", f)
    return f


class Clock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now

    def sleep(self, seconds: float) -> None:
        self.now += seconds


def test_missing_gh(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    def boom(*a, **k):  # noqa: ANN002, ANN003
        raise FileNotFoundError

    monkeypatch.setattr(github.subprocess, "run", boom)
    with pytest.raises(GitHubError, match="Nie znaleziono gh"):
        github.run_gh(["auth", "status"], tmp_path)


def test_ensure_ready_auth_failure(fake: FakeGh, tmp_path: Path) -> None:
    fake.add(("auth",), (1, "", "not logged in"))
    with pytest.raises(GitHubError, match="gh auth login"):
        github.ensure_ready(tmp_path)


def test_create_pr_reuses_existing(fake: FakeGh, tmp_path: Path) -> None:
    fake.add(("pr", "list"), (0, json.dumps([{"url": "https://github.com/o/r/pull/1"}]), ""))
    assert github.create_pr(tmp_path, "b", "main", "t", "x") == "https://github.com/o/r/pull/1"
    assert fake.count("pr", "create") == 0


def test_create_pr_parses_url(fake: FakeGh, tmp_path: Path) -> None:
    fake.add(("pr", "list"), (0, "[]", ""))
    fake.add(("pr", "create"), (0, "Creating pull request\n\nhttps://github.com/o/r/pull/7\n", ""))
    assert github.create_pr(tmp_path, "b", "main", "t", "x") == "https://github.com/o/r/pull/7"


def test_create_pr_no_url(fake: FakeGh, tmp_path: Path) -> None:
    fake.add(("pr", "list"), (0, "[]", ""))
    fake.add(("pr", "create"), (0, "nothing useful\n", ""))
    with pytest.raises(GitHubError):
        github.create_pr(tmp_path, "b", "main", "t", "x")


@pytest.mark.parametrize(
    ("buckets", "expected"),
    [
        ([], "none"),
        (["pass", "fail"], "fail"),
        (["pass", "cancel"], "fail"),
        (["pass", "pending"], "pending"),
        (["pass", "skipping"], "pass"),
    ],
)
def test_checks_state_json(fake: FakeGh, tmp_path: Path, buckets: list[str], expected: str) -> None:
    out = json.dumps([{"name": f"c{i}", "bucket": b} for i, b in enumerate(buckets)])
    fake.add(("pr", "checks"), (8, out, ""))
    assert github.checks_state("u", tmp_path) == expected


def test_checks_state_no_checks_text(fake: FakeGh, tmp_path: Path) -> None:
    fake.add(("pr", "checks"), (1, "", "no checks reported on the 'b' branch"))
    assert github.checks_state("u", tmp_path) == "none"


def test_checks_state_unknown_error(fake: FakeGh, tmp_path: Path) -> None:
    fake.add(("pr", "checks"), (1, "", "boom"))
    with pytest.raises(GitHubError) as exc:
        github.checks_state("u", tmp_path)
    assert exc.value.stderr == "boom"


def _checks(*buckets: str) -> tuple[int, str, str]:
    return (0, json.dumps([{"name": "c", "bucket": b} for b in buckets]), "")


def test_wait_pending_then_pass(fake: FakeGh, tmp_path: Path) -> None:
    clock = Clock()
    fake.add(("pr", "checks"), _checks("pending"), _checks("pass"))
    result = github.wait_for_checks(
        "u", tmp_path, 10, sleep=clock.sleep, clock=clock
    )
    assert result == "pass"


def test_wait_none_waits_for_grace(fake: FakeGh, tmp_path: Path) -> None:
    clock = Clock()
    fake.add(("pr", "checks"), (0, "[]", ""))
    result = github.wait_for_checks(
        "u", tmp_path, 10, poll_seconds=30, grace_seconds=60, sleep=clock.sleep, clock=clock
    )
    assert result == "none"
    assert clock.now >= 60
    assert fake.count("pr", "checks") > 1


def test_wait_timeout(fake: FakeGh, tmp_path: Path) -> None:
    clock = Clock()
    fake.add(("pr", "checks"), _checks("pending"))
    result = github.wait_for_checks(
        "u", tmp_path, 1, poll_seconds=30, sleep=clock.sleep, clock=clock
    )
    assert result == "timeout"


def test_merge_retries_after_failure(fake: FakeGh, tmp_path: Path) -> None:
    sleeps: list[float] = []
    fake.add(("pr", "view"), (0, json.dumps({"mergeable": "UNKNOWN"}), ""))
    fake.add(("pr", "merge"), (1, "", "not mergeable yet"), (0, "", ""))
    github.merge_pr("u", tmp_path, sleep=sleeps.append)
    assert fake.count("pr", "merge") == 2
    assert sleeps == [5]
    assert all("--delete-branch" not in c for c in fake.calls)


def test_merge_conflicting(fake: FakeGh, tmp_path: Path) -> None:
    fake.add(("pr", "view"), (0, json.dumps({"mergeable": "CONFLICTING"}), ""))
    with pytest.raises(GitHubError, match="Konflikt"):
        github.merge_pr("u", tmp_path, sleep=lambda s: None)
    assert fake.count("pr", "merge") == 0


def test_merge_gives_up(fake: FakeGh, tmp_path: Path) -> None:
    fake.add(("pr", "view"), (0, json.dumps({"mergeable": "MERGEABLE"}), ""))
    fake.add(("pr", "merge"), (1, "", "nope"))
    with pytest.raises(GitHubError) as exc:
        github.merge_pr("u", tmp_path, sleep=lambda s: None)
    assert exc.value.stderr == "nope"
    assert fake.count("pr", "merge") == 5


def test_comment_ignores_failure(fake: FakeGh, tmp_path: Path) -> None:
    fake.add(("pr", "comment"), (1, "", "fail"))
    github.comment("u", tmp_path, "hi")
    assert fake.count("pr", "comment") == 1
