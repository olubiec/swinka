from __future__ import annotations

import logging
import subprocess
from pathlib import Path

from orkiestra.errors import GitError
from orkiestra.models import RESULT_FILE, ProjectConfig

logger = logging.getLogger(__name__)


def run_git(args: list[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=False)
    if check and proc.returncode != 0:
        raise GitError(f"git {' '.join(args)} nie powiodło się", stderr=proc.stderr)
    return proc


def base_ref(project: ProjectConfig) -> str:
    if project.merge_mode == "github":
        return f"{project.remote}/{project.base_branch}"
    return project.base_branch


def fetch(repo_root: Path, remote: str) -> None:
    run_git(["fetch", remote, "--prune"], repo_root)


def current_branch(repo_root: Path) -> str:
    return run_git(["rev-parse", "--abbrev-ref", "HEAD"], repo_root).stdout.strip()


def is_clean(repo_root: Path) -> bool:
    return run_git(["status", "--porcelain"], repo_root).stdout.strip() == ""


def create_worktree(repo_root: Path, path: Path, branch: str, base: str) -> Path:
    path = path.resolve()
    if path.exists():
        proc = run_git(["rev-parse", "--abbrev-ref", "HEAD"], path, check=False)
        if proc.returncode == 0 and proc.stdout.strip() == branch:
            return path
        raise GitError(f"Katalog {path} już istnieje i nie jest worktree gałęzi {branch}")
    path.parent.mkdir(parents=True, exist_ok=True)
    exists = run_git(
        ["rev-parse", "--verify", "--quiet", f"refs/heads/{branch}"], repo_root, check=False
    )
    if exists.returncode == 0:
        run_git(["worktree", "add", str(path), branch], repo_root)
    else:
        run_git(["worktree", "add", "-b", branch, str(path), base], repo_root)
    return path


def remove_worktree(repo_root: Path, path: Path, branch: str | None = None) -> None:
    if path.exists():
        run_git(["worktree", "remove", "--force", str(path)], repo_root, check=False)
    run_git(["worktree", "prune"], repo_root)
    if branch:
        run_git(["branch", "-D", branch], repo_root, check=False)


def _unquote(path: str) -> str:
    if len(path) >= 2 and path.startswith('"') and path.endswith('"'):
        return path[1:-1].encode("latin-1", "backslashreplace").decode("unicode_escape").encode(
            "latin-1"
        ).decode("utf-8", "replace")
    return path


def changed_files(worktree: Path, base: str) -> list[str]:
    files: set[str] = set()
    diff = run_git(["diff", "--name-only", f"{base}...HEAD"], worktree)
    files.update(line for line in diff.stdout.splitlines() if line.strip())
    status = run_git(["status", "--porcelain", "--untracked-files=all"], worktree)
    for line in status.stdout.splitlines():
        if len(line) < 4:
            continue
        entry = line[3:]
        if " -> " in entry:
            entry = entry.split(" -> ", 1)[1]
        files.add(_unquote(entry))
    files.discard(RESULT_FILE)
    return sorted(files)


def commit_all(worktree: Path, message: str) -> bool:
    run_git(["add", "-A"], worktree)
    run_git(["reset", "-q", "--", RESULT_FILE], worktree, check=False)
    if run_git(["diff", "--cached", "--quiet"], worktree, check=False).returncode == 0:
        return False
    run_git(["commit", "-m", message], worktree)
    return True


def rebase_onto(worktree: Path, base: str) -> bool:
    proc = run_git(["rebase", base], worktree, check=False)
    if proc.returncode != 0:
        run_git(["rebase", "--abort"], worktree, check=False)
        return False
    return True


def push_branch(worktree: Path, remote: str, branch: str) -> None:
    run_git(["push", "--force-with-lease", "-u", remote, branch], worktree)


def delete_remote_branch(repo_root: Path, remote: str, branch: str) -> None:
    run_git(["push", remote, "--delete", branch], repo_root, check=False)


def merge_local(repo_root: Path, branch: str, base_branch: str) -> None:
    if current_branch(repo_root) != base_branch:
        raise GitError(f"repozytorium główne musi być na gałęzi {base_branch}")
    if not is_clean(repo_root):
        raise GitError("repozytorium główne ma niezatwierdzone zmiany")
    try:
        run_git(["merge", "--no-ff", "--no-edit", branch], repo_root)
    except GitError:
        run_git(["merge", "--abort"], repo_root, check=False)
        raise
