from __future__ import annotations

from pathlib import Path

from orkiestra.models import Plan, RunState, Task, TaskState, TaskStatus, Wave
from orkiestra.report import STATUS_LABELS, format_status, write_summary


def _plan() -> Plan:
    def t(i: str) -> Task:
        return Task(id=i, title=i, prompt="p", files=("a",))

    return Plan(1, (Wave("1", (t("t1"), t("t2"))), Wave("2", (t("t3"), t("t4")))))


def _state() -> RunState:
    st = RunState(plan_hash="h")
    st.tasks["t1"] = TaskState("t1", "1", TaskStatus.MERGED, attempts=1, pr_url="http://pr/1")
    st.tasks["t2"] = TaskState(
        "t2", "1", TaskStatus.NEEDS_HUMAN, attempts=2, last_error="boom\nsecond line"
    )
    st.tasks["t3"] = TaskState("t3", "2", TaskStatus.RUNNING)
    return st


def test_labels_cover_all_statuses() -> None:
    assert set(STATUS_LABELS) == set(TaskStatus)
    assert STATUS_LABELS[TaskStatus.NEEDS_HUMAN] == "WYMAGA CZŁOWIEKA"
    assert STATUS_LABELS[TaskStatus.VERIFIED] == "gotowe lokalnie"


def test_format_status_lines() -> None:
    out = format_status(_plan(), _state())
    assert "Fala 1" in out and "Fala 2" in out
    assert "zmergowane" in out and "próby: 1  http://pr/1" in out
    assert "    boom" in out and "second line" not in out
    assert "t4" in out and "czeka" in out  # missing from state


def test_totals_and_quota() -> None:
    st = _state()
    st.quota_paused_until = "2026-01-01T10:00:00"
    out = format_status(_plan(), st)
    assert "Razem: 4 zadań – zmergowane 1, wymaga człowieka 1, czeka 1, w toku 1" in out
    assert "Pauza limitu do: 2026-01-01T10:00:00" in out
    assert "Pauza" not in format_status(_plan(), _state())


def test_write_summary_table(tmp_path: Path) -> None:
    path = tmp_path / "sub" / "summary.md"
    write_summary(_plan(), _state(), path)
    text = path.read_text(encoding="utf-8")
    assert "| Fala | Zadanie | Status | Próby | PR | Błąd |" in text
    rows = [ln for ln in text.splitlines() if ln.startswith("| ") and "Fala |" not in ln]
    assert len(rows) == 4
    assert any("t2" in r and "boom" in r for r in rows)
