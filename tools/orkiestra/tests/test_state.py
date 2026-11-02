from __future__ import annotations

import json
import threading
from pathlib import Path

import pytest

from orkiestra.models import Plan, RunState, Task, TaskState, TaskStatus, Wave
from orkiestra.state import StateStore


def _plan(*ids: str, wave: str = "w1") -> Plan:
    tasks = tuple(Task(i, i, "p", ("a.py",)) for i in ids)
    return Plan(version=1, waves=(Wave(wave, tasks),))


def test_round_trip(tmp_path: Path) -> None:
    store = StateStore(tmp_path / "s")
    state = RunState(plan_hash="h", current_wave="w1")
    state.tasks["t1"] = TaskState("t1", "w1", status=TaskStatus.PR_OPEN, pr_url="u")
    store.save(state)
    assert store.path.exists()
    assert not store.path.with_name("state.json.tmp").exists()
    raw = json.loads(store.path.read_text(encoding="utf-8"))
    assert raw["tasks"]["t1"]["status"] == "pr_open"
    loaded = store.load()
    assert loaded == state
    assert loaded is not None
    assert loaded.tasks["t1"].status is TaskStatus.PR_OPEN


def test_load_missing(tmp_path: Path) -> None:
    assert StateStore(tmp_path).load() is None


def test_init_or_merge(tmp_path: Path) -> None:
    store = StateStore(tmp_path)
    state = store.init_or_merge(_plan("a", "b", "c"), "h1")
    store.update(state, "a", status=TaskStatus.MERGED)
    store.update(state, "b", status=TaskStatus.RUNNING)
    merged = store.init_or_merge(_plan("a", "b", "d", wave="w2"), "h2")
    assert merged.plan_hash == "h2"
    assert set(merged.tasks) == {"a", "b", "d"}
    assert merged.tasks["a"].status is TaskStatus.MERGED
    assert merged.tasks["a"].wave_id == "w2"
    assert merged.tasks["b"].status is TaskStatus.PENDING
    assert merged.tasks["d"].status is TaskStatus.PENDING


def test_update_sets_updated_at_and_persists(tmp_path: Path) -> None:
    store = StateStore(tmp_path)
    state = store.init_or_merge(_plan("a"), "h")
    ts = store.update(state, "a", attempts=2, note="x")
    assert ts.updated_at
    loaded = store.load()
    assert loaded is not None
    assert loaded.tasks["a"].attempts == 2
    assert loaded.tasks["a"].updated_at == ts.updated_at


def test_update_unknown_field(tmp_path: Path) -> None:
    store = StateStore(tmp_path)
    state = store.init_or_merge(_plan("a"), "h")
    with pytest.raises(AttributeError):
        store.update(state, "a", bogus=1)


def test_threaded_updates(tmp_path: Path) -> None:
    store = StateStore(tmp_path)
    ids = [f"t{i}" for i in range(8)]
    state = store.init_or_merge(_plan(*ids), "h")

    def work(task_id: str) -> None:
        for n in range(1, 51):
            store.update(state, task_id, attempts=n)

    threads = [threading.Thread(target=work, args=(i,)) for i in ids]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    data = json.loads(store.path.read_text(encoding="utf-8"))
    assert all(data["tasks"][i]["attempts"] == 50 for i in ids)


def test_log_path_creates_dir(tmp_path: Path) -> None:
    store = StateStore(tmp_path / "st")
    p = store.log_path("T1", 2)
    assert p == tmp_path / "st" / "logs" / "T1-a2.log"
    assert p.parent.is_dir()
