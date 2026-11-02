from __future__ import annotations

from pathlib import Path

import pytest

from orkiestra.errors import QuotaExhausted
from orkiestra.models import Config, Plan, Task, TaskStatus, Wave


def _plan() -> Plan:
    t1 = Task(id="T1", title="one", prompt="p", files=("a.py",))
    t2 = Task(id="T2", title="two", prompt="p", files=("b.py",))
    t3 = Task(id="T3", title="three", prompt="p", files=("c.py",))
    return Plan(version=1, waves=(Wave(id="w1", tasks=(t1, t2)), Wave(id="w2", tasks=(t3,))))


def test_task_by_id_found_and_missing() -> None:
    plan = _plan()
    assert plan.task_by_id("T3").title == "three"
    with pytest.raises(KeyError):
        plan.task_by_id("nope")


def test_wave_of() -> None:
    plan = _plan()
    assert plan.wave_of("T2").id == "w1"
    assert plan.wave_of("T3").id == "w2"
    with pytest.raises(KeyError):
        plan.wave_of("nope")


def test_task_status_from_value() -> None:
    assert TaskStatus("merged") is TaskStatus.MERGED


def test_config_defaults() -> None:
    cfg = Config(repo_root=Path("."))
    assert cfg.run.max_parallel == 3
    assert cfg.agent.cmd == ("agy",)


def test_quota_exhausted_reset_seconds() -> None:
    assert QuotaExhausted("x", 60).reset_seconds == 60
