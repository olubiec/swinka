from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from orkiestra import gitops
from orkiestra.errors import GitError
from orkiestra.models import RESULT_FILE, ProjectConfig


def g(cwd: Path, *args: str) -> str:
    proc = subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True)
    return proc.stdout


def commit_file(cwd: Path, name: str, content: str = "x\n", msg: str = "c") -> None:
    (cwd / name).write_text(content)
    g(cwd, "add", name)
    g(cwd, "-c", "user.name=t", "-c", "user.email=t@e.com", "commit", "-m", msg)


def make_wt(repo: Path, tmp_path: Path, branch: str = "feat", base: str = "main") -> Path:
    return gitops.create_worktree(repo, tmp_path / "wt" / branch, branch, base)


def test_create_worktree_and_reuse(git_repo, tmp_path):
    wt = make_wt(git_repo, tmp_path)
    assert wt.is_dir()
    assert gitops.current_branch(wt) == "feat"
    assert make_wt(git_repo, tmp_path) == wt


def test_create_worktree_refuses_foreign_dir(git_repo, tmp_path):
    foreign = tmp_path / "wt" / "feat"
    foreign.mkdir(parents=True)
    with pytest.raises(GitError):
        gitops.create_worktree(git_repo, foreign, "feat", "main")


def test_create_worktree_reattaches_existing_branch(git_repo, tmp_path):
    g(git_repo, "branch", "feat")
    wt = make_wt(git_repo, tmp_path)
    assert gitops.current_branch(wt) == "feat"


def test_changed_files(git_repo, tmp_path):
    wt = make_wt(git_repo, tmp_path)
    commit_file(wt, "committed.txt")
    (wt / "README.md").write_text("changed\n")
    (wt / "untracked.txt").write_text("u\n")
    (wt / RESULT_FILE).write_text("{}")
    commit_file(wt, "old.txt")
    g(wt, "mv", "old.txt", "new.txt")
    assert gitops.changed_files(wt, "main") == [
        "README.md",
        "committed.txt",
        "new.txt",
        "old.txt",
        "untracked.txt",
    ]


def test_commit_all(git_repo, tmp_path):
    wt = make_wt(git_repo, tmp_path)
    (wt / RESULT_FILE).write_text("{}")
    assert gitops.commit_all(wt, "nothing") is False
    (wt / "a.txt").write_text("a\n")
    assert gitops.commit_all(wt, "add a") is True
    assert RESULT_FILE not in g(wt, "ls-tree", "-r", "--name-only", "HEAD")
    assert "a.txt" in g(wt, "ls-tree", "-r", "--name-only", "HEAD")


def test_rebase_success_and_conflict(git_repo, tmp_path):
    wt = make_wt(git_repo, tmp_path)
    commit_file(wt, "mine.txt")
    commit_file(git_repo, "other.txt")
    assert gitops.rebase_onto(wt, "main") is True

    wt2 = make_wt(git_repo, tmp_path, "feat2")
    commit_file(wt2, "README.md", "branch\n")
    commit_file(git_repo, "README.md", "main\n")
    assert gitops.rebase_onto(wt2, "main") is False
    git_dir = Path(g(wt2, "rev-parse", "--absolute-git-dir").strip())
    assert not (git_dir / "rebase-merge").exists()
    assert not (git_dir / "rebase-apply").exists()


def test_merge_local(git_repo, tmp_path):
    wt = make_wt(git_repo, tmp_path)
    commit_file(wt, "f.txt")
    gitops.merge_local(git_repo, "feat", "main")
    assert (git_repo / "f.txt").exists()


def test_merge_local_wrong_branch(git_repo, tmp_path):
    make_wt(git_repo, tmp_path)
    g(git_repo, "checkout", "-q", "-b", "other")
    with pytest.raises(GitError):
        gitops.merge_local(git_repo, "feat", "main")


def test_merge_local_dirty(git_repo, tmp_path):
    make_wt(git_repo, tmp_path)
    (git_repo / "README.md").write_text("dirty\n")
    with pytest.raises(GitError):
        gitops.merge_local(git_repo, "feat", "main")


def test_is_clean(git_repo):
    assert gitops.is_clean(git_repo)
    (git_repo / "z.txt").write_text("z")
    assert not gitops.is_clean(git_repo)


def test_base_ref():
    assert gitops.base_ref(ProjectConfig(merge_mode="github")) == "origin/main"
    assert gitops.base_ref(ProjectConfig(merge_mode="local")) == "main"


def test_remote_flow(git_repo_with_remote, tmp_path):
    repo, bare = git_repo_with_remote
    gitops.fetch(repo, "origin")
    ref = gitops.base_ref(ProjectConfig())
    wt = make_wt(repo, tmp_path, "feat", ref)
    commit_file(wt, "p.txt")
    gitops.push_branch(wt, "origin", "feat")
    assert "feat" in g(bare, "branch", "--list", "feat")
    gitops.delete_remote_branch(repo, "origin", "feat")
    assert g(bare, "branch", "--list", "feat").strip() == ""


def test_remove_worktree(git_repo, tmp_path):
    wt = make_wt(git_repo, tmp_path)
    gitops.remove_worktree(git_repo, wt, "feat")
    assert not wt.exists()
    assert g(git_repo, "branch", "--list", "feat").strip() == ""
