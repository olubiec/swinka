from __future__ import annotations

import argparse
import logging
from importlib import resources
from pathlib import Path
from typing import Any

from orkiestra import gitops, report
from orkiestra.config import CONFIG_FILENAME, DEFAULT_CONFIG_TOML, load_config, state_dir
from orkiestra.errors import OrkiestraError, PlanError
from orkiestra.models import Plan, RunState, TaskStatus
from orkiestra.plan import load_plan, plan_hash
from orkiestra.state import StateStore

WAVES_TEMPLATE = """\
# Plan fal dla orkiestry. Każda fala to zestaw zadań wykonywanych równolegle.
# Zadania w jednej fali nie mogą zmieniać tych samych plików.
version: 1
waves:
  - id: "1"
    tasks:
      - id: przyklad
        title: "Przykładowe zadanie"
        # Pliki, które agent może zmieniać (wzorce glob).
        files:
          - "src/przyklad.txt"
        # Treść polecenia dla agenta (albo prompt_file: ścieżka do pliku).
        prompt: |
          Utwórz plik src/przyklad.txt z jedną linią tekstu.
"""

GITIGNORE_LINES = (".orkiestra/", ".orkiestra-result.json")
CI_TARGET = Path(".github") / "workflows" / "orkiestra-ci.yml"
MARK_STATUSES = {
    "pending": TaskStatus.PENDING,
    "merged": TaskStatus.MERGED,
    "skipped": TaskStatus.SKIPPED,
    "needs_human": TaskStatus.NEEDS_HUMAN,
}


def _make_runner(*args: Any, **kwargs: Any) -> Any:
    from orkiestra.runner import WaveRunner

    return WaveRunner(*args, **kwargs)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="orkiestra", description="Orkiestracja fal zadań agy.")
    parser.add_argument("--repo", type=Path, default=None, help="katalog repozytorium")
    parser.add_argument("--config", type=Path, default=None, help="ścieżka do orkiestra.toml")
    parser.add_argument("-v", "--verbose", action="store_true", help="szczegółowe logi")
    sub = parser.add_subparsers(dest="command", required=True)

    def add_plan(p: argparse.ArgumentParser) -> None:
        p.add_argument("--plan", type=Path, default=Path("waves.yaml"), help="plik planu")

    sub.add_parser("init", help="utwórz pliki startowe")
    add_plan(sub.add_parser("validate", help="sprawdź plan"))
    run_p = sub.add_parser("run", help="uruchom fale")
    add_plan(run_p)
    run_p.add_argument("--wave")
    run_p.add_argument("--task")
    run_p.add_argument("--dry-run", action="store_true")
    run_p.add_argument("--no-wait", action="store_true")
    add_plan(sub.add_parser("status", help="pokaż stan"))
    mark_p = sub.add_parser("mark", help="ustaw status zadania ręcznie")
    add_plan(mark_p)
    mark_p.add_argument("task")
    mark_p.add_argument("status", choices=sorted(MARK_STATUSES))
    clean_p = sub.add_parser("clean", help="usuń worktree")
    add_plan(clean_p)
    clean_p.add_argument("--all", action="store_true")
    return parser


def _resolve_repo(repo: Path | None) -> Path:
    if repo is not None:
        return repo.resolve()
    cwd = Path.cwd()
    try:
        proc = gitops.run_git(["rev-parse", "--show-toplevel"], cwd, check=False)
    except OSError:
        return cwd
    top = proc.stdout.strip()
    if proc.returncode == 0 and top:
        return Path(top)
    return cwd


def _plan_path(repo: Path, plan: Path) -> Path:
    return plan if plan.is_absolute() else repo / plan


def _write_if_missing(path: Path, content: str, repo: Path) -> None:
    rel = path.relative_to(repo)
    if path.exists():
        print(f"pominięto (istnieje): {rel}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"utworzono: {rel}")


def _update_gitignore(repo: Path) -> None:
    path = repo / ".gitignore"
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    present = {line.strip() for line in existing.splitlines()}
    missing = [line for line in GITIGNORE_LINES if line not in present]
    if not missing:
        print("pominięto (istnieje): .gitignore")
        return
    prefix = "" if not existing or existing.endswith("\n") else "\n"
    path.write_text(existing + prefix + "\n".join(missing) + "\n", encoding="utf-8")
    print("utworzono: .gitignore" if not existing else "zaktualizowano: .gitignore")


def _has_workflows(repo: Path) -> bool:
    wf = repo / ".github" / "workflows"
    if not wf.is_dir():
        return False
    return any(wf.glob("*.yml")) or any(wf.glob("*.yaml"))


def _cmd_init(repo: Path, args: argparse.Namespace) -> int:
    _write_if_missing(repo / CONFIG_FILENAME, DEFAULT_CONFIG_TOML, repo)
    _write_if_missing(repo / "waves.yaml", WAVES_TEMPLATE, repo)
    _update_gitignore(repo)
    if _has_workflows(repo):
        print(f"pominięto (istnieje): {CI_TARGET}")
    else:
        template = (
            resources.files("orkiestra.templates").joinpath("ci_workflow.yml").read_text("utf-8")
        )
        _write_if_missing(repo / CI_TARGET, template, repo)
    return 0


def _cmd_validate(repo: Path, args: argparse.Namespace) -> int:
    try:
        plan = load_plan(_plan_path(repo, args.plan))
    except PlanError as exc:
        print("Plan niepoprawny:")
        print(str(exc))
        return 1
    tasks = sum(len(w.tasks) for w in plan.waves)
    print(f"OK: {len(plan.waves)} fal, {tasks} zadań")
    return 0


def _cmd_run(repo: Path, args: argparse.Namespace) -> int:
    cfg = load_config(repo, args.config)
    plan_path = _plan_path(repo, args.plan)
    plan = load_plan(plan_path)
    store = StateStore(state_dir(cfg))
    state = store.init_or_merge(plan, plan_hash(plan_path))
    runner = _make_runner(
        plan, cfg, store, state,
        dry_run=args.dry_run, wait_on_quota=not args.no_wait, notify=print,
    )  # fmt: skip
    outcome = runner.run(args.wave, args.task)
    print(report.format_status(plan, state))
    report.write_summary(plan, state, state_dir(cfg) / "summary.md")
    if outcome.ok:
        return 0
    return 75 if outcome.stopped_on_quota else 1


def _load_state(store: StateStore) -> RunState:
    return store.load() or RunState(plan_hash="")


def _cmd_status(repo: Path, args: argparse.Namespace) -> int:
    cfg = load_config(repo, args.config)
    plan = load_plan(_plan_path(repo, args.plan))
    print(report.format_status(plan, _load_state(StateStore(state_dir(cfg)))))
    return 0


def _known_task(plan: Plan, task_id: str) -> bool:
    return any(t.id == task_id for w in plan.waves for t in w.tasks)


def _cmd_mark(repo: Path, args: argparse.Namespace) -> int:
    cfg = load_config(repo, args.config)
    plan_path = _plan_path(repo, args.plan)
    plan = load_plan(plan_path)
    if not _known_task(plan, args.task):
        raise OrkiestraError(f"Nieznane zadanie: {args.task}")
    store = StateStore(state_dir(cfg))
    state = store.init_or_merge(plan, plan_hash(plan_path))
    status = MARK_STATUSES[args.status]
    changes: dict[str, object] = {"status": status}
    if status == TaskStatus.PENDING:
        changes.update(attempts=0, last_error=None)
    store.update(state, args.task, **changes)
    print(f"{args.task}: {report.STATUS_LABELS[status]}")
    return 0


def _cmd_clean(repo: Path, args: argparse.Namespace) -> int:
    cfg = load_config(repo, args.config)
    store = StateStore(state_dir(cfg))
    state = store.load()
    removed = 0
    if state is not None:
        done = {TaskStatus.MERGED, TaskStatus.SKIPPED}
        for task_id, ts in state.tasks.items():
            if not ts.worktree or not (args.all or ts.status in done):
                continue
            gitops.remove_worktree(repo, Path(ts.worktree), ts.branch)
            store.update(state, task_id, worktree=None)
            removed += 1
    print(f"Usunięto worktree: {removed}")
    return 0


_COMMANDS = {
    "init": _cmd_init,
    "validate": _cmd_validate,
    "run": _cmd_run,
    "status": _cmd_status,
    "mark": _cmd_mark,
    "clean": _cmd_clean,
}


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format="%(message)s")
    try:
        repo = _resolve_repo(args.repo)
        return _COMMANDS[args.command](repo, args)
    except OrkiestraError as exc:
        print(f"Błąd: {exc}")
        stderr = getattr(exc, "stderr", "")
        if stderr:
            print(stderr)
        return 2
    except KeyboardInterrupt:
        print("Przerwano – stan zapisany. Wznów: orkiestra run")
        return 130
