from __future__ import annotations

import dataclasses
import tomllib
from pathlib import Path
from typing import Any

from orkiestra.errors import ConfigError
from orkiestra.models import AgentConfig, Config, ProjectConfig, RunConfig

CONFIG_FILENAME = "orkiestra.toml"

DEFAULT_CONFIG_TOML = """\
# Konfiguracja orkiestry (orkiestra.toml)

[project]
# Gałąź bazowa, z której startują zadania i do której trafiają merge'e
base_branch = "main"
# Nazwa zdalnego repozytorium git
remote = "origin"
# Domyślna komenda testów uruchamiana po zadaniu
test_command = "pytest -q"
# Tryb scalania: "github" (PR) lub "local"
merge_mode = "github"

[agent]
# Komenda uruchamiająca agenta Antigravity
cmd = ["agy"]
# slug z "agy models", np. model Flash; puste = domyślny model agy
model = ""
# Limit czasu pojedynczego uruchomienia agenta (minuty)
timeout_minutes = 20
# Pomijanie pytań o uprawnienia agenta
skip_permissions = true
# Dodawanie katalogu worktree do agenta (add-dir)
add_dir = true
# Format wyjścia agenta: "json" lub "text"
output_format = "json"
# Uruchamianie agenta w pseudoterminalu (PTY)
use_pty = false
# Dodatkowe argumenty przekazywane agentowi
extra_args = []

[run]
# Maksymalna liczba zadań uruchamianych równolegle
max_parallel = 3
# Maksymalna liczba prób na zadanie
max_attempts = 2
# Czas oczekiwania po wyczerpaniu limitu (minuty)
quota_wait_minutes = 30
# Limit czasu oczekiwania na CI (minuty)
ci_timeout_minutes = 30
# Katalog z worktree (względem katalogu repozytorium)
worktree_dir = "../.orkiestra-worktrees"
# Katalog ze stanem uruchomienia (względem katalogu repozytorium)
state_dir = ".orkiestra"
# Zatrzymanie fali po pierwszym nieudanym zadaniu
stop_on_failure = true
"""

_SECTIONS: dict[str, type] = {
    "project": ProjectConfig,
    "agent": AgentConfig,
    "run": RunConfig,
}
_POSITIVE_INTS = {
    ("agent", "timeout_minutes"),
    ("run", "max_parallel"),
    ("run", "max_attempts"),
    ("run", "quota_wait_minutes"),
    ("run", "ci_timeout_minutes"),
}
_CHOICES = {
    ("project", "merge_mode"): ("github", "local"),
    ("agent", "output_format"): ("json", "text"),
}
_STR_LIST_KEYS = {("agent", "extra_args")}
_NULLABLE_STR = {("agent", "model"), ("project", "test_command")}


def load_config(repo_root: Path, path: Path | None = None) -> Config:
    repo_root = repo_root.resolve()
    config_path = path if path is not None else repo_root / CONFIG_FILENAME
    if not config_path.is_file():
        if path is None:
            return Config(repo_root=repo_root)
        raise ConfigError(f"Nie znaleziono pliku konfiguracji: {config_path}")
    try:
        data = tomllib.loads(config_path.read_text(encoding="utf-8"))
    except (tomllib.TOMLDecodeError, OSError) as exc:
        raise ConfigError(f"Nie można wczytać {config_path}: {exc}") from exc
    for name in data:
        if name not in _SECTIONS:
            raise ConfigError(f"Nieznana sekcja [{name}]")
    sections = {
        name: _build_section(name, cls, data.get(name, {}))
        for name, cls in _SECTIONS.items()
    }
    return Config(repo_root=repo_root, **sections)


def _build_section(name: str, cls: type, raw: object) -> Any:
    if not isinstance(raw, dict):
        raise ConfigError(f"Sekcja [{name}] musi być tabelą")
    allowed = {f.name for f in dataclasses.fields(cls)}
    values: dict[str, Any] = {}
    for key, value in raw.items():
        if key not in allowed:
            raise ConfigError(f"Nieznany klucz [{name}].{key}")
        values[key] = _convert(name, key, value)
    return cls(**values)


def _convert(section: str, key: str, value: Any) -> Any:
    where = f"[{section}].{key}"
    pair = (section, key)
    if section == "agent" and key == "cmd":
        return _convert_cmd(where, value)
    if pair in _STR_LIST_KEYS:
        return tuple(_str_list(where, value))
    if pair in _NULLABLE_STR:
        if not isinstance(value, str):
            raise ConfigError(f"{where} musi być tekstem")
        return value or None
    if pair in _POSITIVE_INTS:
        if isinstance(value, bool) or not isinstance(value, int) or value < 1:
            raise ConfigError(f"{where} musi być liczbą całkowitą >= 1")
        return value
    expected = type(getattr(_SECTIONS[section](), key))
    if type(value) is not expected:
        label = "tekstem" if expected is str else "wartością true/false"
        raise ConfigError(f"{where} musi być {label}")
    if pair in _CHOICES and value not in _CHOICES[pair]:
        options = ", ".join(_CHOICES[pair])
        raise ConfigError(f"{where} musi być jedną z wartości: {options}")
    return value


def _convert_cmd(where: str, value: Any) -> tuple[str, ...]:
    cmd = (value,) if isinstance(value, str) else tuple(_str_list(where, value))
    if not cmd or not cmd[0]:
        raise ConfigError(f"{where} nie może być puste")
    return cmd


def _str_list(where: str, value: Any) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
        raise ConfigError(f"{where} musi być listą tekstów")
    return value


def worktree_root(config: Config) -> Path:
    return (config.repo_root / config.run.worktree_dir).resolve()


def state_dir(config: Config) -> Path:
    return (config.repo_root / config.run.state_dir).resolve()
