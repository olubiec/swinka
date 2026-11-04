from __future__ import annotations

import json
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path

import pytest

from orkiestra import runner
from orkiestra.models import (
    RESULT_FILE,
    AgentConfig,
    AgentResult,
    Config,
    Plan,
    ProjectConfig,
    RunConfig,
    Task,
    TaskStatus,
    Wave,
)
from orkiestra.runner import WaveRunner
from orkiestra.state import StateStore


def _task(tid: str, files: tuple[str, ...] | None = None, **kw: object) -> Task:
    return Task(id=tid, title=f"Zadanie {tid}", prompt=f"Zrób {tid}",
                files=files or (f"src/{tid}.py",), **kw)  # type: ignore[arg-type]


def _config(repo: Path, tmp_path: Path, merge_mode: str = "local",
            test_command: str | None = None, **run_kw: object) -> Config:
    run_cfg = RunConfig(worktree_dir=str(tmp_path / "wt"), max_parallel=2, **run_kw)  # type: ignore[arg-type]
    return Config(
        repo_root=repo,
        project=ProjectConfig(merge_mode=merge_mode, test_command=test_command),
        run=run_cfg,
    )


class FakeAgent:
    """Writes each task's declared file; per-task behaviour can be overridden."""

    def __init__(self, behaviours: dict[str, Callable[[Path, int, str], AgentResult]] | None = None):
        self.behaviours = behaviours or {}
        self.calls: list[tuple[str, int, str]] = []

    def __call__(self, prompt: str, path: Path, agent_cfg: object, *, model: str | None,
                 timeout_minutes: int, log_path: Path) -> AgentResult:
        name = log_path.stem  # "<task>-a<attempt>"
        task_id, attempt_s = name.rsplit("-a", 1)
        attempt = int(attempt_s)
        self.calls.append((task_id, attempt, prompt))
        if task_id in self.behaviours:
            return self.behaviours[task_id](path, attempt, prompt)
        return write_ok(path, f"src/{task_id}.py")


def write_ok(path: Path, rel: str) -> AgentResult:
    target = path / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(f"# {rel}\n")
    return AgentResult(ok=True, exit_code=0, response="ok")


def _setup(repo: Path, tmp_path: Path, plan: Plan, **cfg_kw: object):
    config = _config(repo, tmp_path, **cfg_kw)  # type: ignore[arg-type]
    store = StateStore(tmp_path / "state")
    state = store.init_or_merge(plan, "h")
    return config, store, state


def _make(plan: Plan, config: Config, store: StateStore, state, agent_fn, **kw):
    sleeps: list[float] = []
    notes: list[str] = []
    wr = WaveRunner(plan, config, store, state, agent_fn=agent_fn, sleep=sleeps.append,
                    notify=notes.append, **kw)
    return wr, sleeps, notes


def _main_files(repo: Path) -> set[str]:
    out = subprocess.run(["git", "ls-tree", "-r", "--name-only", "main"], cwd=repo,
                         capture_output=True, text=True, check=True).stdout
    return set(out.split())


def two_wave_plan() -> Plan:
    return Plan(version=1, waves=(
        Wave("w1", (_task("a"), _task("b"))),
        Wave("w2", (_task("c"),)),
    ))


def test_happy_path(git_repo: Path, tmp_path: Path) -> None:
    plan = two_wave_plan()
    config, store, state = _setup(git_repo, tmp_path, plan)
    fake = FakeAgent()
    wr, _, _ = _make(plan, config, store, state, fake)
    outcome = wr.run()
    assert outcome.ok
    assert outcome.waves_done == ["w1", "w2"]
    assert all(ts.status == TaskStatus.MERGED for ts in state.tasks.values())
    assert {"src/a.py", "src/b.py", "src/c.py"} <= _main_files(git_repo)
    wt = tmp_path / "wt"
    assert not wt.exists() or not any(wt.iterdir())


def test_scope_violation_then_fixed(git_repo: Path, tmp_path: Path) -> None:
    plan = Plan(version=1, waves=(Wave("w1", (_task("a"),)),))

    def behave(path: Path, attempt: int, prompt: str) -> AgentResult:
        if attempt == 1:
            (path / "extra.txt").write_text("nope\n")
        else:
            (path / "extra.txt").unlink(missing_ok=True)
        return write_ok(path, "src/a.py")

    config, store, state = _setup(git_repo, tmp_path, plan)
    fake = FakeAgent({"a": behave})
    wr, _, _ = _make(plan, config, store, state, fake)
    assert wr.run().ok
    assert "spoza zakresu" in fake.calls[1][2]
    assert state.tasks["a"].status == TaskStatus.MERGED
    assert state.tasks["a"].attempts == 2
    assert "extra.txt" not in _main_files(git_repo)


def test_failing_tests_stop_wave(git_repo: Path, tmp_path: Path) -> None:
    plan = Plan(version=1, waves=(Wave("w1", (_task("a"),)), Wave("w2", (_task("c"),))))
    cmd = f'"{sys.executable}" -c "import sys; sys.exit(1)"'
    config, store, state = _setup(git_repo, tmp_path, plan, test_command=cmd)
    fake = FakeAgent()
    wr, _, _ = _make(plan, config, store, state, fake)
    outcome = wr.run()
    assert not outcome.ok
    assert outcome.needs_human == ["a"]
    assert state.tasks["a"].status == TaskStatus.NEEDS_HUMAN
    assert state.tasks["a"].attempts == config.run.max_attempts
    assert "Testy nie przechodzą" in (state.tasks["a"].last_error or "")
    assert state.tasks["c"].status == TaskStatus.PENDING
    assert all(c[0] == "a" for c in fake.calls)


def test_no_changes_and_blocked(git_repo: Path, tmp_path: Path) -> None:
    plan = Plan(version=1, waves=(Wave("w1", (_task("a"), _task("b"))),))

    def nothing(path: Path, attempt: int, prompt: str) -> AgentResult:
        return AgentResult(ok=True, exit_code=0)

    def blocked(path: Path, attempt: int, prompt: str) -> AgentResult:
        (path / RESULT_FILE).write_text(json.dumps({"status": "blocked", "note": "brak API"}))
        return AgentResult(ok=True, exit_code=0)

    config, store, state = _setup(git_repo, tmp_path, plan, stop_on_failure=False)
    fake = FakeAgent({"a": nothing, "b": blocked})
    wr, _, _ = _make(plan, config, store, state, fake)
    outcome = wr.run()
    assert not outcome.ok
    assert sorted(outcome.needs_human) == ["a", "b"]
    a, b = state.tasks["a"], state.tasks["b"]
    assert a.status == TaskStatus.NEEDS_HUMAN
    assert "nie wprowadził" in (a.last_error or "")
    assert b.status == TaskStatus.NEEDS_HUMAN
    assert b.attempts == 1
    assert "brak API" in (b.last_error or "")


def _quota_then_ok() -> Callable[[Path, int, str], AgentResult]:
    calls = {"n": 0}

    def behave(path: Path, attempt: int, prompt: str) -> AgentResult:
        calls["n"] += 1
        if calls["n"] == 1:
            return AgentResult(ok=False, exit_code=1, quota_exhausted=True, quota_reset_seconds=30)
        return write_ok(path, "src/a.py")

    return behave


def test_quota_wait(git_repo: Path, tmp_path: Path) -> None:
    plan = Plan(version=1, waves=(Wave("w1", (_task("a"),)),))
    config, store, state = _setup(git_repo, tmp_path, plan)
    wr, sleeps, notes = _make(plan, config, store, state, FakeAgent({"a": _quota_then_ok()}))
    assert wr.run().ok
    assert sleeps == [90]
    assert state.tasks["a"].status == TaskStatus.MERGED
    assert state.tasks["a"].attempts == 1
    assert state.quota_paused_until is None
    assert any("Limit Antigravity" in n for n in notes)


def test_quota_no_wait(git_repo: Path, tmp_path: Path) -> None:
    plan = Plan(version=1, waves=(Wave("w1", (_task("a"),)),))
    config, store, state = _setup(git_repo, tmp_path, plan)
    wr, sleeps, _ = _make(plan, config, store, state, FakeAgent({"a": _quota_then_ok()}),
                          wait_on_quota=False)
    outcome = wr.run()
    assert outcome.stopped_on_quota
    assert not outcome.ok
    assert sleeps == []
    assert state.tasks["a"].status == TaskStatus.PENDING
    assert state.tasks["a"].attempts == 0


def test_resume_finished(git_repo: Path, tmp_path: Path) -> None:
    plan = two_wave_plan()
    config, store, state = _setup(git_repo, tmp_path, plan)
    wr, _, _ = _make(plan, config, store, state, FakeAgent())
    assert wr.run().ok
    state2 = store.init_or_merge(plan, "h")
    fake2 = FakeAgent()
    wr2, _, _ = _make(plan, config, store, state2, fake2)
    outcome = wr2.run()
    assert outcome.ok
    assert outcome.waves_done == ["w1", "w2"]
    assert fake2.calls == []


def test_dry_run(git_repo: Path, tmp_path: Path) -> None:
    plan = two_wave_plan()
    config, store, state = _setup(git_repo, tmp_path, plan)
    fake = FakeAgent()
    wr, _, notes = _make(plan, config, store, state, fake, dry_run=True)
    outcome = wr.run()
    assert outcome.ok
    assert fake.calls == []
    assert not (tmp_path / "wt").exists()
    dry = [n for n in notes if n.startswith("[dry-run]")]
    assert len(dry) == 6
    assert any("w1/a: prompt" in n and "src/a.py" in n for n in dry)


def test_unknown_selection(git_repo: Path, tmp_path: Path) -> None:
    plan = two_wave_plan()
    config, store, state = _setup(git_repo, tmp_path, plan)
    wr, _, _ = _make(plan, config, store, state, FakeAgent())
    with pytest.raises(runner.OrkiestraError):
        wr.run(only_wave="nope")
    with pytest.raises(runner.OrkiestraError):
        wr.run(only_task="nope")


class GhStub:
    def __init__(self, checks: str) -> None:
        self.checks = checks
        self.created: list[str] = []
        self.merged: list[str] = []
        self.comments: list[str] = []

    def install(self, monkeypatch: pytest.MonkeyPatch) -> None:
        gh, git = runner.github, runner.gitops
        monkeypatch.setattr(gh, "ensure_ready", lambda repo_root: None)
        monkeypatch.setattr(gh, "create_pr", self.create_pr)
        monkeypatch.setattr(gh, "wait_for_checks", lambda url, cwd, t, sleep=None: self.checks)
        monkeypatch.setattr(gh, "merge_pr", lambda url, cwd, sleep=None: self.merged.append(url))
        monkeypatch.setattr(gh, "comment", lambda url, cwd, body: self.comments.append(body))
        monkeypatch.setattr(git, "fetch", lambda repo_root, remote: None)
        monkeypatch.setattr(git, "push_branch", lambda wt, remote, branch: None)
        monkeypatch.setattr(git, "delete_remote_branch", lambda repo_root, remote, branch: None)
        monkeypatch.setattr(git, "rebase_onto", lambda wt, base: True)

    def create_pr(self, repo_root: Path, branch: str, base: str, title: str, body: str) -> str:
        assert "_Utworzone automatycznie przez orkiestra._" in body
        url = f"https://github.com/x/y/pull/{len(self.created) + 1}"
        self.created.append(title)
        return url


@pytest.mark.parametrize("checks", ["pass", "fail"])
def test_github_mode(git_repo: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
                     checks: str) -> None:
    subprocess.run(["git", "update-ref", "refs/remotes/origin/main", "main"], cwd=git_repo,
                   check=True, capture_output=True)
    stub = GhStub(checks)
    stub.install(monkeypatch)
    plan = Plan(version=1, waves=(Wave("w1", (_task("a"),)),))
    config, store, state = _setup(git_repo, tmp_path, plan, merge_mode="github")
    wr, _, _ = _make(plan, config, store, state, FakeAgent())
    outcome = wr.run()
    ts = state.tasks["a"]
    assert stub.created == ["[w1] a: Zadanie a"]
    assert ts.pr_url == "https://github.com/x/y/pull/1"
    if checks == "pass":
        assert outcome.ok
        assert ts.status == TaskStatus.MERGED
        assert stub.merged == [ts.pr_url]
        assert stub.comments == []
    else:
        assert not outcome.ok
        assert ts.status == TaskStatus.NEEDS_HUMAN
        assert ts.last_error == "CI: fail"
        assert len(stub.comments) == 1
        assert stub.merged == []


def test_agent_exception_isolated(git_repo: Path, tmp_path: Path) -> None:
    plan = Plan(version=1, waves=(Wave("w1", (_task("a"), _task("b"))),))

    def boom(path: Path, attempt: int, prompt: str) -> AgentResult:
        raise RuntimeError("kaboom")

    config, store, state = _setup(git_repo, tmp_path, plan)
    wr, _, _ = _make(plan, config, store, state, FakeAgent({"a": boom}))
    outcome = wr.run()
    assert not outcome.ok
    assert outcome.needs_human == ["a"]
    assert state.tasks["a"].status == TaskStatus.NEEDS_HUMAN
    assert "RuntimeError: kaboom" in (state.tasks["a"].last_error or "")
    assert state.tasks["b"].status == TaskStatus.MERGED
    assert "src/b.py" in _main_files(git_repo)


def _models_config(repo: Path, tmp_path: Path, models: tuple[str, ...]) -> Config:
    cfg = _config(repo, tmp_path)
    agent_cfg = AgentConfig(model=models[0])
    object.__setattr__(agent_cfg, "models", models)
    return Config(repo_root=cfg.repo_root, project=cfg.project, agent=agent_cfg, run=cfg.run)


class ModelAgent:
    """Quota for the models in `exhausted` (until `recover_after` calls), otherwise writes the file."""

    def __init__(self, exhausted: set[str], recover_after: int | None = None):
        self.exhausted = set(exhausted)
        self.recover_after = recover_after
        self.models: list[str | None] = []

    def __call__(self, prompt: str, path: Path, agent_cfg: object, *, model: str | None,
                 timeout_minutes: int, log_path: Path) -> AgentResult:
        self.models.append(model)
        if self.recover_after is not None and len(self.models) > self.recover_after:
            self.exhausted.clear()
        if model in self.exhausted:
            return AgentResult(ok=False, exit_code=1, quota_exhausted=True, quota_reset_seconds=30)
        task_id = log_path.stem.rsplit("-a", 1)[0]
        return write_ok(path, f"src/{task_id}.py")


def test_quota_falls_back_to_next_model(git_repo: Path, tmp_path: Path) -> None:
    plan = Plan(version=1, waves=(Wave("w1", (_task("a"),)),))
    config = _models_config(git_repo, tmp_path, ("m1", "m2", "m3"))
    store = StateStore(tmp_path / "state")
    state = store.init_or_merge(plan, "h")
    agent_fn = ModelAgent({"m1"})
    wr, sleeps, notes = _make(plan, config, store, state, agent_fn)
    assert wr.run().ok
    assert agent_fn.models == ["m1", "m2"]
    assert sleeps == []  # no waiting: another model had quota
    assert state.tasks["a"].status == TaskStatus.MERGED
    assert state.tasks["a"].attempts == 1  # the quota hit did not use up an attempt
    assert any("przełączam na m2" in n for n in notes)


def test_exhausted_model_is_not_retried_by_next_task(git_repo: Path, tmp_path: Path) -> None:
    plan = Plan(version=1, waves=(Wave("w1", (_task("a"),)), Wave("w2", (_task("b"),))))
    config = _models_config(git_repo, tmp_path, ("m1", "m2"))
    store = StateStore(tmp_path / "state")
    state = store.init_or_merge(plan, "h")
    agent_fn = ModelAgent({"m1"})
    wr, sleeps, _ = _make(plan, config, store, state, agent_fn)
    assert wr.run().ok
    assert agent_fn.models == ["m1", "m2", "m2"]  # b goes straight to m2
    assert sleeps == []


def test_all_models_exhausted_waits_then_recovers(git_repo: Path, tmp_path: Path) -> None:
    plan = Plan(version=1, waves=(Wave("w1", (_task("a"),)),))
    config = _models_config(git_repo, tmp_path, ("m1", "m2"))
    store = StateStore(tmp_path / "state")
    state = store.init_or_merge(plan, "h")
    agent_fn = ModelAgent({"m1", "m2"}, recover_after=2)
    wr, sleeps, notes = _make(plan, config, store, state, agent_fn)
    assert wr.run().ok
    assert len(sleeps) == 1  # one pause, then the quotas are considered back
    assert agent_fn.models[:2] == ["m1", "m2"]
    assert state.tasks["a"].status == TaskStatus.MERGED
    assert any("Limit Antigravity" in n for n in notes)


def test_task_model_goes_first(git_repo: Path, tmp_path: Path) -> None:
    plan = Plan(version=1, waves=(Wave("w1", (_task("a", model="m2"),)),))
    config = _models_config(git_repo, tmp_path, ("m1", "m2"))
    store = StateStore(tmp_path / "state")
    state = store.init_or_merge(plan, "h")
    agent_fn = ModelAgent(set())
    wr, _, _ = _make(plan, config, store, state, agent_fn)
    assert wr.run().ok
    assert agent_fn.models == ["m2"]
