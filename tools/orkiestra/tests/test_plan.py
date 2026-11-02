from __future__ import annotations

import textwrap
from pathlib import Path

import pytest

from orkiestra.errors import PlanError
from orkiestra.models import RESULT_FILE
from orkiestra.plan import (
    literal_prefix,
    load_plan,
    normalize_pattern,
    out_of_scope,
    patterns_overlap,
    plan_hash,
    validate_plan,
)

EXAMPLE = Path(__file__).parent.parent / "examples" / "waves.example.yaml"


def write(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "waves.yaml"
    path.write_text(textwrap.dedent(text), encoding="utf-8")
    return path


def test_example_loads() -> None:
    plan = load_plan(EXAMPLE)
    assert [w.id for w in plan.waves] == ["w1", "w2"]
    assert len(plan.waves[0].tasks) == 2
    assert any(t.test_command for t in plan.waves[0].tasks)
    assert validate_plan(plan) == []
    assert len(plan_hash(EXAMPLE)) == 16


def test_prompt_file_resolution(tmp_path: Path) -> None:
    (tmp_path / "tasks").mkdir()
    (tmp_path / "tasks" / "a.md").write_text("\n  Do it.  \n", encoding="utf-8")
    path = write(tmp_path, """\
        version: 1
        waves:
          - id: w1
            tasks:
              - id: a
                title: A
                files: ["./src/"]
                prompt_file: tasks/a.md
                model: ""
        """)
    task = load_plan(path).waves[0].tasks[0]
    assert task.prompt == "Do it."
    assert task.files == ("src/**",)
    assert task.model is None


def test_missing_prompt_file(tmp_path: Path) -> None:
    path = write(tmp_path, """\
        version: 1
        waves:
          - id: w1
            tasks:
              - {id: a, title: A, files: [x.py], prompt_file: nope.md}
        """)
    with pytest.raises(PlanError, match="nope.md"):
        load_plan(path)


def test_missing_plan_file(tmp_path: Path) -> None:
    with pytest.raises(PlanError, match="Brak pliku planu"):
        load_plan(tmp_path / "none.yaml")


def test_missing_prompt(tmp_path: Path) -> None:
    path = write(tmp_path, """\
        version: 1
        waves:
          - id: w1
            tasks:
              - {id: a, title: A, files: [x.py]}
        """)
    with pytest.raises(PlanError, match="waves\\[0\\].tasks\\[0\\] \\(id=a\\)"):
        load_plan(path)


def test_prompt_and_prompt_file(tmp_path: Path) -> None:
    (tmp_path / "p.md").write_text("x", encoding="utf-8")
    path = write(tmp_path, """\
        version: 1
        waves:
          - id: w1
            tasks:
              - {id: a, title: A, files: [x.py], prompt: hi, prompt_file: p.md}
        """)
    with pytest.raises(PlanError, match="prompt"):
        load_plan(path)


def test_unknown_key(tmp_path: Path) -> None:
    path = write(tmp_path, """\
        version: 1
        waves:
          - id: w1
            tasks:
              - {id: a, title: A, files: [x.py], prompt: hi, tittle: oops}
        """)
    with pytest.raises(PlanError, match="tittle"):
        load_plan(path)


def test_duplicate_task_id_across_waves(tmp_path: Path) -> None:
    path = write(tmp_path, """\
        version: 1
        waves:
          - id: w1
            tasks:
              - {id: a, title: A, files: [x.py], prompt: hi}
          - id: w2
            tasks:
              - {id: a, title: A2, files: [y.py], prompt: hi}
        """)
    with pytest.raises(PlanError, match="Zduplikowane id zadania: a"):
        load_plan(path)


def test_overlap_in_wave_detected(tmp_path: Path) -> None:
    path = write(tmp_path, """\
        version: 1
        waves:
          - id: w1
            tasks:
              - {id: a, title: A, files: ["src/**"], prompt: hi}
              - {id: b, title: B, files: ["src/b.py"], prompt: hi}
        """)
    with pytest.raises(PlanError, match="Fala w1: zadania a i b mają wspólne pliki"):
        load_plan(path)


def test_same_patterns_in_different_waves_ok(tmp_path: Path) -> None:
    path = write(tmp_path, """\
        version: 1
        waves:
          - id: w1
            tasks:
              - {id: a, title: A, files: ["src/**"], prompt: hi}
          - id: w2
            tasks:
              - {id: b, title: B, files: ["src/**"], prompt: hi}
        """)
    assert len(load_plan(path).waves) == 2


def test_dotdot_rejected(tmp_path: Path) -> None:
    path = write(tmp_path, """\
        version: 1
        waves:
          - id: w1
            tasks:
              - {id: a, title: A, files: ["../x/**"], prompt: hi}
        """)
    with pytest.raises(PlanError, match="\\.\\."):
        load_plan(path)


def test_invalid_id_and_timeout(tmp_path: Path) -> None:
    path = write(tmp_path, """\
        version: 1
        waves:
          - id: w1
            tasks:
              - {id: "-bad", title: A, files: [x.py], prompt: hi, timeout_minutes: 0}
        """)
    with pytest.raises(PlanError) as exc:
        load_plan(path)
    assert "timeout_minutes" in str(exc.value)


@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [
        ("src/auth/**", "src/auth/models.py", True),
        ("src/a.py", "src/ab.py", False),
        ("src/a.py", "src/a.py", True),
        ("src/a/**", "src/b/**", False),
        ("**/*.py", "anything/x.txt", True),
    ],
)
def test_patterns_overlap(a: str, b: str, expected: bool) -> None:
    assert patterns_overlap(a, b) is expected
    assert patterns_overlap(b, a) is expected


def test_literal_prefix() -> None:
    assert literal_prefix("src/auth/**") == "src/auth/"
    assert literal_prefix("src/a.py") == "src/a.py"


def test_out_of_scope() -> None:
    changed = ["src/a/b/c.py", "docs/x.md", RESULT_FILE, "README.md"]
    assert out_of_scope(changed, ("src/**",)) == ["README.md", "docs/x.md"]


def test_normalize_pattern() -> None:
    assert normalize_pattern("./src/") == "src/**"
    assert normalize_pattern("  src\\a.py ") == "src/a.py"
