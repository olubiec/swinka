from __future__ import annotations

from pathlib import Path

import pytest

from orkiestra.config import (
    DEFAULT_CONFIG_TOML,
    load_config,
    state_dir,
    worktree_root,
)
from orkiestra.errors import ConfigError
from orkiestra.models import Config, ProjectConfig

EXAMPLE = Path(__file__).parent.parent / "orkiestra.toml.example"


def _write(tmp_path: Path, text: str) -> None:
    (tmp_path / "orkiestra.toml").write_text(text, encoding="utf-8")


def test_defaults_when_missing(tmp_path: Path) -> None:
    assert load_config(tmp_path) == Config(repo_root=tmp_path.resolve())


def test_explicit_missing_path(tmp_path: Path) -> None:
    with pytest.raises(ConfigError):
        load_config(tmp_path, tmp_path / "nope.toml")


def test_example_matches_defaults(tmp_path: Path) -> None:
    cfg = load_config(tmp_path, EXAMPLE)
    expected = Config(
        repo_root=tmp_path.resolve(),
        project=ProjectConfig(test_command="pytest -q"),
    )
    assert cfg == expected


def test_default_toml_equals_example() -> None:
    assert DEFAULT_CONFIG_TOML == EXAMPLE.read_text(encoding="utf-8")


def test_cmd_str_to_tuple(tmp_path: Path) -> None:
    _write(tmp_path, '[agent]\ncmd = "agy"\n')
    assert load_config(tmp_path).agent.cmd == ("agy",)


def test_empty_model_is_none(tmp_path: Path) -> None:
    _write(tmp_path, '[agent]\nmodel = ""\n[project]\ntest_command = ""\n')
    cfg = load_config(tmp_path)
    assert cfg.agent.model is None
    assert cfg.project.test_command is None


def test_unknown_key(tmp_path: Path) -> None:
    _write(tmp_path, '[agent]\nmodle = "x"\n')
    with pytest.raises(ConfigError, match="modle"):
        load_config(tmp_path)


def test_unknown_section(tmp_path: Path) -> None:
    _write(tmp_path, "[foo]\na = 1\n")
    with pytest.raises(ConfigError, match="foo"):
        load_config(tmp_path)


def test_bad_merge_mode(tmp_path: Path) -> None:
    _write(tmp_path, '[project]\nmerge_mode = "ftp"\n')
    with pytest.raises(ConfigError):
        load_config(tmp_path)


def test_bool_rejected_for_int(tmp_path: Path) -> None:
    _write(tmp_path, "[run]\nmax_parallel = true\n")
    with pytest.raises(ConfigError):
        load_config(tmp_path)


def test_empty_cmd_rejected(tmp_path: Path) -> None:
    _write(tmp_path, "[agent]\ncmd = []\n")
    with pytest.raises(ConfigError):
        load_config(tmp_path)


def test_dirs_resolve_relative_to_repo_root(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    cfg = load_config(repo)
    assert worktree_root(cfg) == (tmp_path / ".orkiestra-worktrees").resolve()
    assert state_dir(cfg) == (repo / ".orkiestra").resolve()
