from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from orkiestra import cli


def run(repo: Path, *args: str) -> int:
    return cli.main(["--repo", str(repo), *args])


def test_init_creates_and_is_idempotent(git_repo: Path, capsys: pytest.CaptureFixture[str]) -> None:
    assert run(git_repo, "init") == 0
    out = capsys.readouterr().out
    assert out.count("utworzono") >= 4
    for name in ("orkiestra.toml", "waves.yaml", ".gitignore", ".github/workflows/orkiestra-ci.yml"):
        assert (git_repo / name).is_file()
    assert run(git_repo, "init") == 0
    assert "pominięto" in capsys.readouterr().out
    lines = (git_repo / ".gitignore").read_text().splitlines()
    assert lines.count(".orkiestra/") == 1 and lines.count(".orkiestra-result.json") == 1


def test_init_skips_ci_when_workflow_exists(git_repo: Path) -> None:
    wf = git_repo / ".github" / "workflows"
    wf.mkdir(parents=True)
    (wf / "ci.yml").write_text("name: x\n")
    assert run(git_repo, "init") == 0
    assert not (wf / "orkiestra-ci.yml").exists()


def test_validate(git_repo: Path, capsys: pytest.CaptureFixture[str]) -> None:
    run(git_repo, "init")
    capsys.readouterr()
    assert run(git_repo, "validate") == 0
    assert "OK: 1 fal, 1 zadań" in capsys.readouterr().out
    (git_repo / "bad.yaml").write_text("version: 2\n")
    assert run(git_repo, "validate", "--plan", "bad.yaml") == 1


@pytest.mark.parametrize(
    ("outcome", "code"),
    [(dict(ok=True, stopped_on_quota=False), 0), (dict(ok=False, stopped_on_quota=True), 75),
     (dict(ok=False, stopped_on_quota=False), 1)],
)
def test_run_exit_codes(
    git_repo: Path, monkeypatch: pytest.MonkeyPatch, outcome: dict[str, bool], code: int
) -> None:
    run(git_repo, "init")
    seen: dict[str, Any] = {}

    class FakeRunner:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            seen.update(kwargs)

        def run(self, only_wave: str | None = None, only_task: str | None = None) -> Any:
            seen.update(only_wave=only_wave, only_task=only_task)
            return SimpleNamespace(waves_done=[], needs_human=[], **outcome)

    monkeypatch.setattr(cli, "_make_runner", lambda *a, **k: FakeRunner(*a, **k))
    rc = run(git_repo, "run", "--wave", "1", "--task", "przyklad", "--dry-run", "--no-wait")
    assert rc == code
    assert seen["dry_run"] is True and seen["wait_on_quota"] is False
    assert seen["only_wave"] == "1" and seen["only_task"] == "przyklad"
    assert (git_repo / ".orkiestra" / "summary.md").is_file()


def test_status_without_state(git_repo: Path, capsys: pytest.CaptureFixture[str]) -> None:
    run(git_repo, "init")
    capsys.readouterr()
    assert run(git_repo, "status") == 0
    assert "czeka" in capsys.readouterr().out


def test_mark(git_repo: Path) -> None:
    run(git_repo, "init")
    assert run(git_repo, "mark", "przyklad", "skipped") == 0
    data = json.loads((git_repo / ".orkiestra" / "state.json").read_text())
    assert "skipped" in json.dumps(data)
    assert run(git_repo, "mark", "nope", "skipped") == 2


def test_main_module_help() -> None:
    proc = subprocess.run(
        [sys.executable, "-m", "orkiestra", "--help"], capture_output=True, text=True, check=False
    )
    assert proc.returncode == 0 and "orkiestra" in proc.stdout
