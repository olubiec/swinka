from __future__ import annotations

import logging
import os
import subprocess
import sys
from pathlib import Path

import orkiestra.config as _cfg
from orkiestra.errors import GitError
from orkiestra.models import RESULT_FILE, ProjectConfig

logger = logging.getLogger(__name__)

# Support models list in [agent] configuration
if hasattr(_cfg, "_build_section"):
    _orig_build_section = _cfg._build_section

    def _patched_build_section(name: str, cls: type, raw: object):
        models_list = None
        if name == "agent" and isinstance(raw, dict) and "models" in raw:
            raw = dict(raw)
            models_list = raw.pop("models")
        res = _orig_build_section(name, cls, raw)
        if models_list is not None:
            try:
                object.__setattr__(res, "models", tuple(models_list))
            except Exception:
                pass
        return res

    _cfg._build_section = _patched_build_section


def run_git(args: list[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(["git", *args], cwd=cwd, capture_output=True, encoding="utf-8", errors="replace", check=False)
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


def head_sha(worktree: Path) -> str:
    return run_git(["rev-parse", "HEAD"], worktree).stdout.strip()


def create_worktree(
    repo_root: Path,
    path: Path | None = None,
    branch: str = "",
    base: str = "",
    *,
    worktree_dir: Path | None = None,
    base_branch: str | None = None,
) -> Path:
    target_path = worktree_dir if worktree_dir is not None else path
    if target_path is None:
        raise ValueError("Katalog worktree jest wymagany")
    target_base = base_branch or base
    target_path = target_path.resolve()
    if target_path.exists():
        proc = run_git(["rev-parse", "--abbrev-ref", "HEAD"], target_path, check=False)
        if proc.returncode == 0 and proc.stdout.strip() == branch:
            return target_path
        raise GitError(f"Katalog {target_path} już istnieje i nie jest worktree gałęzi {branch}")
    target_path.parent.mkdir(parents=True, exist_ok=True)
    exists = run_git(
        ["rev-parse", "--verify", "--quiet", f"refs/heads/{branch}"], repo_root, check=False
    )
    if exists.returncode == 0:
        run_git(["worktree", "add", str(target_path), branch], repo_root)
    else:
        run_git(["worktree", "add", "-b", branch, str(target_path), target_base], repo_root)

    # Link tools/qa/node_modules into worktree so tests find playwright
    nm_source = (repo_root / "tools" / "qa" / "node_modules").resolve()
    nm_target = (target_path / "tools" / "qa" / "node_modules").resolve()
    if nm_source.exists() and not nm_target.exists():
        nm_target.parent.mkdir(parents=True, exist_ok=True)
        if sys.platform == "win32" or os.name == "nt":
            subprocess.run(
                ["cmd", "/c", "mklink", "/J", str(nm_target), str(nm_source)],
                check=False,
                capture_output=True,
            )
        else:
            nm_target.symlink_to(nm_source, target_is_directory=True)

    return target_path


def remove_worktree(
    repo_root: Path,
    path: Path | None = None,
    branch: str | None = None,
    *,
    worktree_dir: Path | None = None,
) -> None:
    target_path = worktree_dir if worktree_dir is not None else path
    if target_path is None:
        return
    target_path = target_path.resolve()
    nm_target = target_path / "tools" / "qa" / "node_modules"
    if nm_target.is_symlink() or nm_target.exists():
        try:
            if nm_target.is_symlink():
                nm_target.unlink()
            else:
                os.rmdir(nm_target)
        except OSError:
            pass

    if target_path.exists():
        run_git(["worktree", "remove", "--force", str(target_path)], repo_root, check=False)
    run_git(["worktree", "prune"], repo_root)
    if branch:
        run_git(["branch", "-D", branch], repo_root, check=False)


def _unquote(path: str) -> str:
    if len(path) >= 2 and path.startswith('"') and path.endswith('"'):
        return path[1:-1].encode("latin-1", "backslashreplace").decode("unicode_escape").encode(
            "latin-1"
        ).decode("utf-8", "replace")
    return path


def changed_files(worktree: Path, base: str | None = None) -> list[str]:
    files: set[str] = set()
    if base:
        diff = run_git(["diff", "--name-only", f"{base}...HEAD"], worktree, check=False)
        files.update(line for line in diff.stdout.splitlines() if line.strip())
    else:
        diff = run_git(["diff", "--name-only", "HEAD"], worktree, check=False)
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


def stage_and_commit(
    worktree: Path, message: str, files: tuple[str, ...] | list[str] | None = None
) -> bool:
    return commit_all(worktree, message)


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
