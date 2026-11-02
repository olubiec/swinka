from __future__ import annotations

from dataclasses import replace
from pathlib import Path

from orkiestra.models import RESULT_FILE, Config, ProjectConfig, Task, Wave
from orkiestra.prompts import MAX_FEEDBACK_CHARS, build_prompt, truncate_tail


def _setup(
    tmp_path: Path, prompt: str = "Do the thing.", task_cmd: str | None = None,
    project_cmd: str | None = None,
) -> tuple[Task, Wave, Config]:
    task = Task(
        id="T9.1", title="My title", prompt=prompt,
        files=("src/a.py", "tests/test_a.py"), test_command=task_cmd,
    )
    wave = Wave(id="W9", tasks=(task,))
    config = Config(repo_root=tmp_path, project=ProjectConfig(test_command=project_cmd))
    return task, wave, config


def test_basic_contents(tmp_path: Path) -> None:
    task, wave, config = _setup(tmp_path)
    out = build_prompt(task, wave, config)
    for s in ("T9.1", "My title", "W9", "src/a.py", "tests/test_a.py", "Do the thing.", RESULT_FILE):
        assert s in out
    assert "  - src/a.py" in out
    assert out.endswith("\n") and not out.endswith("\n\n")
    assert "Previous attempt failed" not in out
    assert "run `" not in out


def test_test_rule_project_and_task_override(tmp_path: Path) -> None:
    task, wave, config = _setup(tmp_path, project_cmd="pytest -q")
    assert "run `pytest -q` once" in build_prompt(task, wave, config)
    task, wave, config = _setup(tmp_path, task_cmd="make t", project_cmd="pytest -q")
    out = build_prompt(task, wave, config)
    assert "run `make t` once" in out
    assert "pytest -q" not in out


def test_feedback_present_and_truncated(tmp_path: Path) -> None:
    task, wave, config = _setup(tmp_path)
    long = "A" * 10000 + "THE-END"
    out = build_prompt(task, wave, config, feedback=long)
    assert "## Previous attempt failed" in out
    assert "THE-END" in out
    assert "...[skrócono]" in out
    assert out.count("A") < MAX_FEEDBACK_CHARS + 100
    assert "Fix exactly this problem." in out


def test_truncate_tail_short_unchanged() -> None:
    assert truncate_tail("abc", 10) == "abc"
    assert truncate_tail("abcdef", 3) == "...[skrócono]\ndef"


def test_dollar_stays_literal(tmp_path: Path) -> None:
    task, wave, config = _setup(tmp_path, prompt="use $HOME and ${x} here")
    assert "use $HOME and ${x} here" in build_prompt(task, wave, config)


def test_user_override_template(tmp_path: Path) -> None:
    task, wave, config = _setup(tmp_path)
    d = tmp_path / config.run.state_dir
    d.mkdir()
    (d / "task_prompt.md").write_text("CUSTOM ${task_id} ${prompt}${test_rule}${feedback}", encoding="utf-8")
    out = build_prompt(task, wave, config)
    assert out == "CUSTOM T9.1 Do the thing.\n"


def test_no_triple_blank_lines(tmp_path: Path) -> None:
    task, wave, config = _setup(tmp_path)
    task = replace(task, prompt="x\n\n\n\n\ny")
    out = build_prompt(task, wave, config)
    assert "\n\n\n" not in out
