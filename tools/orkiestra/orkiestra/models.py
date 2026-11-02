from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

RESULT_FILE = ".orkiestra-result.json"


class TaskStatus(str, Enum):  # noqa: UP042
    PENDING = "pending"
    RUNNING = "running"
    VERIFIED = "verified"        # agent done, scope + tests OK, committed in worktree
    PR_OPEN = "pr_open"
    MERGED = "merged"
    NEEDS_HUMAN = "needs_human"
    SKIPPED = "skipped"


@dataclass(frozen=True)
class Task:
    id: str
    title: str
    prompt: str
    files: tuple[str, ...]
    model: str | None = None
    test_command: str | None = None
    timeout_minutes: int | None = None


@dataclass(frozen=True)
class Wave:
    id: str
    tasks: tuple[Task, ...]


@dataclass(frozen=True)
class Plan:
    version: int
    waves: tuple[Wave, ...]

    def task_by_id(self, task_id: str) -> Task:
        for wave in self.waves:
            for task in wave.tasks:
                if task.id == task_id:
                    return task
        raise KeyError(task_id)

    def wave_of(self, task_id: str) -> Wave:
        for wave in self.waves:
            if any(t.id == task_id for t in wave.tasks):
                return wave
        raise KeyError(task_id)


@dataclass(frozen=True)
class ProjectConfig:
    base_branch: str = "main"
    remote: str = "origin"
    test_command: str | None = None
    merge_mode: str = "github"   # "github" | "local"


@dataclass(frozen=True)
class AgentConfig:
    cmd: tuple[str, ...] = ("agy",)
    model: str | None = None
    timeout_minutes: int = 20
    skip_permissions: bool = True
    add_dir: bool = True
    output_format: str = "json"  # "json" | "text"
    use_pty: bool = False
    extra_args: tuple[str, ...] = ()


@dataclass(frozen=True)
class RunConfig:
    max_parallel: int = 3
    max_attempts: int = 2
    quota_wait_minutes: int = 30
    ci_timeout_minutes: int = 30
    worktree_dir: str = "../.orkiestra-worktrees"
    state_dir: str = ".orkiestra"
    stop_on_failure: bool = True


@dataclass(frozen=True)
class Config:
    repo_root: Path
    project: ProjectConfig = field(default_factory=ProjectConfig)
    agent: AgentConfig = field(default_factory=AgentConfig)
    run: RunConfig = field(default_factory=RunConfig)


@dataclass
class AgentResult:
    ok: bool
    exit_code: int
    response: str = ""
    error: str = ""
    quota_exhausted: bool = False
    quota_reset_seconds: int | None = None
    timed_out: bool = False
    log_path: Path | None = None
    duration_s: float = 0.0


@dataclass
class TaskState:
    task_id: str
    wave_id: str
    status: TaskStatus = TaskStatus.PENDING
    attempts: int = 0
    branch: str | None = None
    worktree: str | None = None
    pr_url: str | None = None
    last_error: str | None = None
    note: str | None = None
    updated_at: str | None = None


@dataclass
class RunState:
    plan_hash: str
    tasks: dict[str, TaskState] = field(default_factory=dict)
    current_wave: str | None = None
    quota_paused_until: str | None = None
