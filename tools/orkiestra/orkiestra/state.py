from __future__ import annotations

import dataclasses
import json
import os
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from orkiestra.models import Plan, RunState, TaskState, TaskStatus


class StateStore:
    def __init__(self, state_dir: Path) -> None:
        self._dir = state_dir
        self._lock = threading.RLock()

    @property
    def path(self) -> Path:
        return self._dir / "state.json"

    def load(self) -> RunState | None:
        with self._lock:
            if not self.path.is_file():
                return None
            data = json.loads(self.path.read_text(encoding="utf-8"))
        return _state_from_dict(data)

    def save(self, state: RunState) -> None:
        with self._lock:
            self._dir.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_name(self.path.name + ".tmp")
            payload = json.dumps(_state_to_dict(state), indent=2, ensure_ascii=False)
            tmp.write_text(payload, encoding="utf-8")
            os.replace(tmp, self.path)

    def init_or_merge(self, plan: Plan, plan_hash: str) -> RunState:
        with self._lock:
            state = self.load() or RunState(plan_hash=plan_hash)
            tasks: dict[str, TaskState] = {}
            for wave in plan.waves:
                for task in wave.tasks:
                    ts = state.tasks.get(task.id) or TaskState(task.id, wave.id)
                    ts.wave_id = wave.id
                    if ts.status == TaskStatus.RUNNING:
                        ts.status = TaskStatus.PENDING
                    tasks[task.id] = ts
            state.tasks = tasks
            state.plan_hash = plan_hash
            self.save(state)
            return state

    def update(self, state: RunState, task_id: str, **changes: object) -> TaskState:
        with self._lock:
            ts = state.tasks[task_id]
            for name, value in changes.items():
                if not hasattr(ts, name):
                    raise AttributeError(f"TaskState has no field {name!r}")
                setattr(ts, name, value)
            ts.updated_at = datetime.now(UTC).isoformat(timespec="seconds")
            self.save(state)
            return ts

    def log_path(self, task_id: str, attempt: int) -> Path:
        logs = self._dir / "logs"
        logs.mkdir(parents=True, exist_ok=True)
        return logs / f"{task_id}-a{attempt}.log"


def _state_to_dict(state: RunState) -> dict[str, Any]:
    tasks: dict[str, Any] = {}
    for task_id, ts in state.tasks.items():
        item = dataclasses.asdict(ts)
        item["status"] = ts.status.value
        tasks[task_id] = item
    return {
        "plan_hash": state.plan_hash,
        "current_wave": state.current_wave,
        "quota_paused_until": state.quota_paused_until,
        "tasks": tasks,
    }


def _state_from_dict(data: dict[str, Any]) -> RunState:
    known = {f.name for f in dataclasses.fields(TaskState)}
    tasks: dict[str, TaskState] = {}
    for task_id, raw in data.get("tasks", {}).items():
        fields = {k: v for k, v in raw.items() if k in known}
        fields["status"] = TaskStatus(fields.get("status", "pending"))
        fields.setdefault("task_id", task_id)
        fields.setdefault("wave_id", "")
        tasks[task_id] = TaskState(**fields)
    return RunState(
        plan_hash=data.get("plan_hash", ""),
        tasks=tasks,
        current_wave=data.get("current_wave"),
        quota_paused_until=data.get("quota_paused_until"),
    )
