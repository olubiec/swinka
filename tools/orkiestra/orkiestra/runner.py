from __future__ import annotations

import json
import logging
import subprocess
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path

from orkiestra import agent, github, gitops, prompts
from orkiestra import plan as planmod
from orkiestra.config import worktree_root
from orkiestra.errors import GitError, GitHubError, OrkiestraError
from orkiestra.models import (
    RESULT_FILE,
    AgentResult,
    Config,
    Plan,
    RunState,
    Task,
    TaskStatus,
    Wave,
)
from orkiestra.state import StateStore

logger = logging.getLogger(__name__)

AgentFn = Callable[..., AgentResult]

MAX_QUOTA_PAUSES = 10
TEST_TIMEOUT_SECONDS = 900
DONE_STATUSES = (TaskStatus.MERGED, TaskStatus.SKIPPED)
PENDING_STATUSES = (TaskStatus.PENDING, TaskStatus.RUNNING)
INTEGRATE_STATUSES = (TaskStatus.VERIFIED, TaskStatus.PR_OPEN)


@dataclass
class RunOutcome:
    ok: bool
    stopped_on_quota: bool = False
    waves_done: list[str] = field(default_factory=list)
    needs_human: list[str] = field(default_factory=list)


def _error_text(exc: BaseException, tail: int = 1500) -> str:
    text = f"{type(exc).__name__}: {exc}"
    stderr = getattr(exc, "stderr", None)
    if isinstance(stderr, str) and stderr.strip():
        text += "\n" + stderr[-tail:]
    return text


def _as_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", "replace")
    return str(value)


class WaveRunner:
    def __init__(
        self,
        plan: Plan,
        config: Config,
        store: StateStore,
        state: RunState,
        *,
        dry_run: bool = False,
        wait_on_quota: bool = True,
        agent_fn: AgentFn | None = None,
        sleep: Callable[[float], None] = time.sleep,
        notify: Callable[[str], None] | None = None,
    ) -> None:
        self.plan = plan
        self.config = config
        self.store = store
        self.state = state
        self.dry_run = dry_run
        self.wait_on_quota = wait_on_quota
        self._agent_fn = agent_fn
        self.sleep = sleep
        self.notify = notify or logger.info
        self.repo_root = config.repo_root
        self.base = gitops.base_ref(config.project)
        self._quota_event = threading.Event()
        self._quota_reset: int | None = None
        self._lock = threading.Lock()
        self._git_lock = threading.Lock()

    # ----------------------------------------------------------------- helpers
    def _branch(self, wave: Wave, task: Task) -> str:
        return f"orkiestra/{wave.id}/{task.id}"

    def _path(self, wave: Wave, task: Task) -> Path:
        return worktree_root(self.config) / f"{wave.id}__{task.id}"

    def _say(self, wave: Wave, task: Task, message: str) -> None:
        self.notify(f"[{wave.id}/{task.id}] {message}")

    def _status(self, task: Task) -> TaskStatus:
        return self.state.tasks[task.id].status

    # --------------------------------------------------------------------- run
    def run(self, only_wave: str | None = None, only_task: str | None = None) -> RunOutcome:
        if not self.dry_run:
            self._preflight()
        outcome = RunOutcome(ok=True)
        for wave, tasks in self._selection(only_wave, only_task):
            if all(self._status(t) in DONE_STATUSES for t in tasks):
                outcome.waves_done.append(wave.id)
                continue
            self.state.current_wave = wave.id
            self.store.save(self.state)
            if self.dry_run:
                self._describe(wave, tasks)
                continue
            if self._execute_wave(wave, tasks) == "quota":
                outcome.ok = False
                outcome.stopped_on_quota = True
                return outcome
            self._integrate_wave(wave, tasks)
            failed = [t for t in tasks if self._status(t) not in DONE_STATUSES]
            if failed:
                outcome.needs_human.extend(
                    t.id for t in failed if self._status(t) == TaskStatus.NEEDS_HUMAN
                )
                if self.config.run.stop_on_failure:
                    outcome.ok = False
                    return outcome
                continue
            outcome.waves_done.append(wave.id)
        outcome.ok = not outcome.needs_human
        return outcome

    def _preflight(self) -> None:
        project = self.config.project
        if project.merge_mode == "github":
            github.ensure_ready(self.repo_root)
            return
        branch = gitops.current_branch(self.repo_root)
        if branch != project.base_branch:
            raise OrkiestraError(
                f"Tryb lokalny: repozytorium musi być na gałęzi {project.base_branch} "
                f"(obecnie: {branch})."
            )
        if not gitops.is_clean(self.repo_root):
            raise OrkiestraError(
                "Tryb lokalny: repozytorium ma niezatwierdzone zmiany – zatwierdź je lub schowaj."
            )

    def _selection(
        self, only_wave: str | None, only_task: str | None
    ) -> list[tuple[Wave, list[Task]]]:
        waves = list(self.plan.waves)
        if only_wave is not None:
            waves = [w for w in waves if w.id == only_wave]
            if not waves:
                raise OrkiestraError(f"Nieznana fala: {only_wave}")
        if only_task is None:
            return [(w, list(w.tasks)) for w in waves]
        for wave in waves:
            for task in wave.tasks:
                if task.id == only_task:
                    return [(wave, [task])]
        raise OrkiestraError(f"Nieznane zadanie: {only_task}")

    # ----------------------------------------------------------------- execute
    def _execute_wave(self, wave: Wave, tasks: list[Task]) -> str:
        if self.config.project.merge_mode == "github":
            gitops.fetch(self.repo_root, self.config.project.remote)
        pauses = 0
        while True:
            todo = [t for t in tasks if self._status(t) in PENDING_STATUSES]
            if not todo:
                return "ok"
            self._quota_event.clear()
            self._quota_reset = None
            with ThreadPoolExecutor(max_workers=self.config.run.max_parallel) as pool:
                list(pool.map(lambda t: self._safe_run_task(wave, t), todo))
            still = [t for t in tasks if self._status(t) in PENDING_STATUSES]
            if not (self._quota_event.is_set() and still):
                return "ok"
            if not self.wait_on_quota or pauses >= MAX_QUOTA_PAUSES:
                return "quota"
            pauses += 1
            self._pause_for_quota()

    def _pause_for_quota(self) -> None:
        seconds = (self._quota_reset or self.config.run.quota_wait_minutes * 60) + 60
        until = datetime.now(UTC) + timedelta(seconds=seconds)
        self.state.quota_paused_until = until.isoformat(timespec="seconds")
        self.store.save(self.state)
        self.notify(f"Limit Antigravity wyczerpany – czekam {seconds // 60} min")
        self.sleep(seconds)
        self.state.quota_paused_until = None
        self.store.save(self.state)

    def _safe_run_task(self, wave: Wave, task: Task) -> None:
        try:
            self._run_task(wave, task)
        except Exception as exc:  # noqa: BLE001 - any failure must park the task
            message = _error_text(exc)
            logger.exception("Task %s failed", task.id)
            self.store.update(
                self.state, task.id, status=TaskStatus.NEEDS_HUMAN, last_error=message
            )
            self._say(wave, task, f"błąd: {message.splitlines()[0]}")

    def _run_task(self, wave: Wave, task: Task) -> None:
        if self._quota_event.is_set():
            return
        cfg = self.config
        ts = self.state.tasks[task.id]
        path = self._path(wave, task)
        branch = self._branch(wave, task)
        self.store.update(
            self.state, task.id, status=TaskStatus.RUNNING, branch=branch, worktree=str(path)
        )
        with self._git_lock:
            gitops.create_worktree(self.repo_root, path, branch, self.base)
        feedback = ts.last_error if ts.attempts > 0 else None
        agent_fn = self._agent_fn or agent.run_agent
        while ts.attempts < cfg.run.max_attempts:
            if self._quota_event.is_set():
                self.store.update(self.state, task.id, status=TaskStatus.PENDING)
                return
            attempt = ts.attempts + 1
            self.store.update(self.state, task.id, attempts=attempt)
            self._say(wave, task, f"próba {attempt}")
            prompt = prompts.build_prompt(task, wave, cfg, feedback)
            res = agent_fn(
                prompt,
                path,
                cfg.agent,
                model=task.model or cfg.agent.model,
                timeout_minutes=task.timeout_minutes or cfg.agent.timeout_minutes,
                log_path=self.store.log_path(task.id, attempt),
            )
            if res.quota_exhausted:
                self._signal_quota(res.quota_reset_seconds)
                self.store.update(
                    self.state,
                    task.id,
                    status=TaskStatus.PENDING,
                    attempts=attempt - 1,
                    last_error=None,
                )
                self._say(wave, task, "limit Antigravity wyczerpany")
                return
            problem, blocked, note = self._check(task, path, res)
            if blocked:
                self.store.update(
                    self.state,
                    task.id,
                    status=TaskStatus.NEEDS_HUMAN,
                    last_error=f"Agent zgłosił blokadę: {note}",
                )
                self._say(wave, task, f"agent zgłosił blokadę: {note}")
                return
            if problem is None:
                with self._git_lock:
                    gitops.commit_all(path, f"{task.id}: {task.title}")
                self.store.update(
                    self.state, task.id, status=TaskStatus.VERIFIED, last_error=None, note=note
                )
                self._say(wave, task, "gotowe")
                return
            feedback = problem
            self.store.update(self.state, task.id, last_error=problem)
            self._say(wave, task, problem.splitlines()[0] if problem else "problem")
        self.store.update(self.state, task.id, status=TaskStatus.NEEDS_HUMAN)
        self._say(wave, task, "wyczerpano próby – wymaga człowieka")

    def _signal_quota(self, reset_seconds: int | None) -> None:
        with self._lock:
            if reset_seconds is not None:
                self._quota_reset = max(self._quota_reset or 0, reset_seconds)
            self._quota_event.set()

    # ------------------------------------------------------------------- check
    def _read_result(self, path: Path) -> tuple[str | None, str | None]:
        result_path = path / RESULT_FILE
        if not result_path.exists():
            return None, None
        status: str | None = None
        note: str | None = None
        try:
            data = json.loads(result_path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                status = _as_text(data.get("status")) or None
                note = _as_text(data.get("note")) or None
        except (OSError, ValueError):
            pass
        result_path.unlink(missing_ok=True)
        return status, note

    def _check(
        self, task: Task, path: Path, res: AgentResult
    ) -> tuple[str | None, bool, str | None]:
        status, note = self._read_result(path)
        if status == "blocked":
            return None, True, note
        changed = gitops.changed_files(path, self.base)
        if not changed:
            if not res.ok:
                detail = res.error or res.response[:300] or "brak odpowiedzi"
                problem = f"Błąd agenta: {detail}"
                if res.timed_out:
                    problem += " (timeout)"
                return problem, False, note
            return "Agent nie wprowadził żadnych zmian.", False, note
        out = planmod.out_of_scope(changed, task.files)
        if out:
            return (
                f"Zmieniono pliki spoza zakresu: {', '.join(out)}. Cofnij te zmiany; "
                f"wolno zmieniać tylko: {', '.join(task.files)}.",
                False,
                note,
            )
        cmd = prompts.effective_test_command(task, self.config)
        if cmd:
            failure = self._run_tests(cmd, path)
            if failure is not None:
                return (
                    f"Testy nie przechodzą (`{cmd}`):\n" + prompts.truncate_tail(failure, 3000),
                    False,
                    note,
                )
        return None, False, note

    def _run_tests(self, cmd: str, path: Path) -> str | None:
        try:
            proc = subprocess.run(
                cmd,
                shell=True,
                cwd=path,
                capture_output=True,
                text=True,
                timeout=TEST_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired as exc:
            return _as_text(exc.stdout) + _as_text(exc.stderr) + "\n[timeout]"
        if proc.returncode != 0:
            return (proc.stdout or "") + (proc.stderr or "")
        return None

    # --------------------------------------------------------------- integrate
    def _integrate_wave(self, wave: Wave, tasks: list[Task]) -> None:
        for task in tasks:
            if self._status(task) not in INTEGRATE_STATUSES:
                continue
            try:
                merged = self._integrate_task(wave, task)
            except (GitError, GitHubError) as exc:
                message = _error_text(exc)
                self.store.update(
                    self.state, task.id, status=TaskStatus.NEEDS_HUMAN, last_error=message
                )
                self._say(wave, task, f"błąd integracji: {message.splitlines()[0]}")
                continue
            if merged:
                path = self._path(wave, task)
                self.store.update(self.state, task.id, status=TaskStatus.MERGED, last_error=None)
                gitops.remove_worktree(self.repo_root, path, self._branch(wave, task))
                self._say(wave, task, "zmergowane")

    def _needs_human(self, wave: Wave, task: Task, message: str) -> bool:
        self.store.update(self.state, task.id, status=TaskStatus.NEEDS_HUMAN, last_error=message)
        self._say(wave, task, message)
        return False

    def _integrate_task(self, wave: Wave, task: Task) -> bool:
        project = self.config.project
        path = self._path(wave, task)
        branch = self._branch(wave, task)
        if project.merge_mode == "local":
            if not gitops.rebase_onto(path, project.base_branch):
                return self._needs_human(wave, task, "Konflikt przy rebase")
            gitops.merge_local(self.repo_root, branch, project.base_branch)
            return True
        gitops.fetch(self.repo_root, project.remote)
        if not gitops.rebase_onto(path, f"{project.remote}/{project.base_branch}"):
            return self._needs_human(wave, task, "Konflikt przy rebase")
        gitops.push_branch(path, project.remote, branch)
        ts = self.state.tasks[task.id]
        url = ts.pr_url or github.create_pr(
            self.repo_root,
            branch,
            project.base_branch,
            title=f"[{wave.id}] {task.id}: {task.title}",
            body=self._pr_body(wave, task, ts.note),
        )
        self.store.update(self.state, task.id, status=TaskStatus.PR_OPEN, pr_url=url)
        result = github.wait_for_checks(
            url, self.repo_root, self.config.run.ci_timeout_minutes, sleep=self.sleep
        )
        if result in ("pass", "none"):
            github.merge_pr(url, self.repo_root, sleep=self.sleep)
            gitops.delete_remote_branch(self.repo_root, project.remote, branch)
            return True
        github.comment(url, self.repo_root, f"orkiestra: CI = {result}. Zadanie wymaga człowieka.")
        return self._needs_human(wave, task, f"CI: {result}")

    @staticmethod
    def _pr_body(wave: Wave, task: Task, note: str | None) -> str:
        return "\n".join(
            [
                f"**Zadanie:** {task.id}",
                f"**Fala:** {wave.id}",
                f"**Tytuł:** {task.title}",
                "",
                f"**Notatka agenta:** {note or '(brak)'}",
                "",
                "_Utworzone automatycznie przez orkiestra._",
            ]
        )

    # ---------------------------------------------------------------- dry run
    def _describe(self, wave: Wave, tasks: list[Task]) -> None:
        cfg = self.config
        for task in tasks:
            path = self._path(wave, task)
            prompt = prompts.build_prompt(task, wave, cfg)
            self.notify(
                f"[dry-run] {wave.id}/{task.id}: prompt {len(prompt)} znaków, "
                f"pliki: {', '.join(task.files)}"
            )
            args = agent.build_agy_args(
                cfg.agent,
                "<prompt>",
                path,
                model=task.model or cfg.agent.model,
                timeout_minutes=task.timeout_minutes or cfg.agent.timeout_minutes,
            )
            self.notify(f"[dry-run] {wave.id}/{task.id}: {' '.join(args)}")
