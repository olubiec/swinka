from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
import yaml

from orkiestra import cli

FAKE_AGY = Path(__file__).parent / "fakes" / "fake_agy.py"


def _git(repo: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", *args], cwd=repo, check=True, capture_output=True, text=True
    )
    return proc.stdout


def _task(task_id: str, files: list[str], writes: list[str] | None = None, **extra: Any) -> dict:
    lines = [f"FAKE_WRITE: {p}" for p in (files if writes is None else writes)]
    task = {"id": task_id, "title": f"Task {task_id}", "files": files}
    task["prompt"] = "Do the work.\n" + "\n".join(lines) + "\n"
    task.update(extra)
    return task


class E2E:
    def __init__(self, repo: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        self.repo = repo
        self.tmp_path = tmp_path
        self.wt = tmp_path / "wt"
        self.log = tmp_path / "agy.log"
        monkeypatch.setenv("FAKE_AGY_LOG", str(self.log))
        monkeypatch.delenv("FAKE_AGY_MODE", raising=False)
        monkeypatch.delenv("FAKE_AGY_MODES_FILE", raising=False)
        toml = (
            "[project]\n"
            'merge_mode = "local"\n'
            'test_command = ""\n\n'
            "[agent]\n"
            f"cmd = [{json.dumps(sys.executable)}, {json.dumps(FAKE_AGY.as_posix())}]\n"
            "add_dir = false\n\n"
            "[run]\n"
            "max_parallel = 2\n"
            f"worktree_dir = {json.dumps(self.wt.as_posix())}\n"
            "quota_wait_minutes = 1\n"
        )
        (repo / "orkiestra.toml").write_text(toml, encoding="utf-8")
        (repo / ".gitignore").write_text(".orkiestra/\n.orkiestra-result.json\n", encoding="utf-8")

    def commit_plan(self, waves: list[list[dict]]) -> None:
        data = {
            "version": 1,
            "waves": [{"id": str(i + 1), "tasks": tasks} for i, tasks in enumerate(waves)],
        }
        (self.repo / "waves.yaml").write_text(yaml.safe_dump(data, allow_unicode=True), "utf-8")
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-m", "setup")

    def cli(self, *args: str) -> int:
        return cli.main(["--repo", str(self.repo), *args])

    def run(self, *extra: str) -> int:
        return self.cli("run", "--plan", "waves.yaml", *extra)

    def calls(self) -> int:
        if not self.log.exists():
            return 0
        return len(self.log.read_text(encoding="utf-8").splitlines())

    def state(self) -> dict:
        path = self.repo / ".orkiestra" / "state.json"
        return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture
def e2e(git_repo: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> E2E:
    return E2E(git_repo, tmp_path, monkeypatch)


def test_two_waves_happy_path(e2e: E2E, capsys: pytest.CaptureFixture[str]) -> None:
    e2e.commit_plan(
        [
            [_task("a", ["src/a.txt"]), _task("b", ["src/b.txt"])],
            [_task("c", ["src/c.txt"])],
        ]
    )
    assert e2e.run() == 0
    for name in ("a", "b", "c"):
        assert _git(e2e.repo, "show", f"main:src/{name}.txt") == "written by fake agy\n"
    assert e2e.calls() == 3
    capsys.readouterr()
    assert e2e.cli("status", "--plan", "waves.yaml") == 0
    out = capsys.readouterr().out
    assert sum(1 for ln in out.splitlines() if "próby" in ln and "zmergowane" in ln) == 3
    assert not e2e.wt.exists() or not any(e2e.wt.iterdir())
    assert e2e.run() == 0
    assert e2e.calls() == 3


def _python_check(path: str) -> str:
    code = f"import pathlib,sys; sys.exit(0 if pathlib.Path('{path}').exists() else 1)"
    return f'"{sys.executable}" -c "{code}"'


def test_test_command_gate(
    e2e: E2E, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    cmd = _python_check("src/a.txt")
    e2e.commit_plan([[_task("a", ["src/a.txt"], test_command=cmd)]])
    assert e2e.run() == 0
    assert _git(e2e.repo, "show", "main:src/a.txt") == "written by fake agy\n"
    assert e2e.calls() == 1


def test_test_command_gate_fails_on_noop(
    e2e: E2E, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    cmd = _python_check("src/a.txt")
    e2e.commit_plan([[_task("a", ["src/a.txt"], test_command=cmd)]])
    monkeypatch.setenv("FAKE_AGY_MODE", "noop")
    assert e2e.run() == 1
    assert "WYMAGA CZŁOWIEKA" in capsys.readouterr().out
    assert e2e.calls() == 2
    assert e2e.state()["tasks"]["a"]["status"] == "needs_human"


def test_scope_violation(e2e: E2E, capsys: pytest.CaptureFixture[str]) -> None:
    e2e.commit_plan(
        [[_task("a", ["src/a.txt"], writes=["src/a.txt", "other/x.txt"])]]
    )
    assert e2e.run() == 1
    task = e2e.state()["tasks"]["a"]
    assert task["status"] == "needs_human"
    assert "spoza zakresu" in (task["last_error"] or "")
    assert e2e.cli("mark", "--plan", "waves.yaml", "a", "skipped") == 0
    assert e2e.run() == 0


def test_quota_no_wait(
    e2e: E2E, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    e2e.commit_plan([[_task("a", ["src/a.txt"])]])
    modes = tmp_path / "modes.txt"
    modes.write_text("quota\n", encoding="utf-8")
    monkeypatch.setenv("FAKE_AGY_MODES_FILE", str(modes))
    assert e2e.run("--no-wait") == 75
    assert e2e.state()["tasks"]["a"]["status"] == "pending"
    assert "czeka" in capsys.readouterr().out
    assert e2e.run() == 0
    state = e2e.state()["tasks"]["a"]
    assert state["status"] == "merged"
    assert state["attempts"] == 1


def test_dry_run(e2e: E2E, capsys: pytest.CaptureFixture[str]) -> None:
    e2e.commit_plan([[_task("a", ["src/a.txt"])]])
    assert e2e.run("--dry-run") == 0
    out = capsys.readouterr().out
    assert e2e.calls() == 0
    assert "[dry-run]" in out
    assert "--output-format" in out


def test_validate_overlapping_files(e2e: E2E, capsys: pytest.CaptureFixture[str]) -> None:
    e2e.commit_plan([[_task("a", ["src/*.txt"]), _task("b", ["src/b.txt"])]])
    assert e2e.cli("validate", "--plan", "waves.yaml") == 1
    assert "wspólne pliki" in capsys.readouterr().out
