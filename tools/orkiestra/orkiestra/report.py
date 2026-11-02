from __future__ import annotations

from pathlib import Path

from orkiestra.models import Plan, RunState, TaskState, TaskStatus

STATUS_LABELS: dict[TaskStatus, str] = {
    TaskStatus.PENDING: "czeka",
    TaskStatus.RUNNING: "w toku",
    TaskStatus.VERIFIED: "gotowe lokalnie",
    TaskStatus.PR_OPEN: "PR otwarty",
    TaskStatus.MERGED: "zmergowane",
    TaskStatus.NEEDS_HUMAN: "WYMAGA CZŁOWIEKA",
    TaskStatus.SKIPPED: "pominięte",
}

_TOTAL_ORDER = [
    TaskStatus.MERGED,
    TaskStatus.NEEDS_HUMAN,
    TaskStatus.PENDING,
    TaskStatus.RUNNING,
    TaskStatus.VERIFIED,
    TaskStatus.PR_OPEN,
    TaskStatus.SKIPPED,
]


def _task_state(state: RunState, task_id: str, wave_id: str) -> TaskState:
    return state.tasks.get(task_id) or TaskState(task_id, wave_id)


def _first_line(text: str | None, limit: int = 100) -> str:
    if not text:
        return ""
    lines = text.strip().splitlines()
    return lines[0][:limit] if lines else ""


def format_status(plan: Plan, state: RunState) -> str:
    width_id = max((len(t.id) for w in plan.waves for t in w.tasks), default=0)
    width_label = max(len(label) for label in STATUS_LABELS.values())
    lines: list[str] = []
    counts: dict[TaskStatus, int] = {}
    total = 0
    for wave in plan.waves:
        lines.append(f"Fala {wave.id}")
        for task in wave.tasks:
            ts = _task_state(state, task.id, wave.id)
            counts[ts.status] = counts.get(ts.status, 0) + 1
            total += 1
            label = STATUS_LABELS[ts.status]
            lines.append(
                f"  {task.id:<{width_id}}  {label:<{width_label}}  "
                f"próby: {ts.attempts}  {ts.pr_url or ''}".rstrip()
            )
            if ts.status == TaskStatus.NEEDS_HUMAN and ts.last_error:
                lines.append(f"    {_first_line(ts.last_error)}")
    parts = [f"{STATUS_LABELS[s].lower()} {counts[s]}" for s in _TOTAL_ORDER if counts.get(s)]
    lines.append(f"Razem: {total} zadań – " + ", ".join(parts))
    if state.quota_paused_until:
        lines.append(f"Pauza limitu do: {state.quota_paused_until}")
    return "\n".join(lines)


def _cell(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def write_summary(plan: Plan, state: RunState, path: Path) -> None:
    rows = ["| Fala | Zadanie | Status | Próby | PR | Błąd |", "|---|---|---|---|---|---|"]
    for wave in plan.waves:
        for task in wave.tasks:
            ts = _task_state(state, task.id, wave.id)
            cells = [
                wave.id,
                task.id,
                STATUS_LABELS[ts.status],
                str(ts.attempts),
                ts.pr_url or "",
                _first_line(ts.last_error),
            ]
            rows.append("| " + " | ".join(_cell(c) for c in cells) + " |")
    text = "# Podsumowanie orkiestry\n\n" + "\n".join(rows) + "\n"
    if state.quota_paused_until:
        text += f"\nPauza limitu do: {state.quota_paused_until}\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
