from __future__ import annotations

import fnmatch
import hashlib
import re
from pathlib import Path
from typing import Any

import yaml

from orkiestra.errors import PlanError
from orkiestra.models import RESULT_FILE, Plan, Task, Wave

ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
ALLOWED_TASK_KEYS = frozenset(
    {"id", "title", "files", "prompt", "prompt_file", "model", "test_command", "timeout_minutes"}
)
_WILDCARDS = "*?["


def normalize_pattern(pattern: str) -> str:
    result = pattern.strip().replace("\\", "/")
    while result.startswith("./"):
        result = result[2:]
    if result.endswith("/"):
        result += "**"
    return result


def literal_prefix(pattern: str) -> str:
    for index, char in enumerate(pattern):
        if char in _WILDCARDS:
            return pattern[:index]
    return pattern


def _has_wildcard(pattern: str) -> bool:
    return any(c in pattern for c in _WILDCARDS)


def patterns_overlap(a: str, b: str) -> bool:
    if not _has_wildcard(a) and not _has_wildcard(b):
        return a == b
    pa, pb = literal_prefix(a), literal_prefix(b)
    return pa.startswith(pb) or pb.startswith(pa)


def out_of_scope(changed: list[str], patterns: tuple[str, ...]) -> list[str]:
    result = [
        path
        for path in changed
        if path != RESULT_FILE and not any(fnmatch.fnmatchcase(path, p) for p in patterns)
    ]
    return sorted(result)


def plan_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def validate_plan(plan: Plan) -> list[str]:
    problems: list[str] = []
    seen_waves: set[str] = set()
    seen_tasks: set[str] = set()
    for wave in plan.waves:
        if wave.id in seen_waves:
            problems.append(f"Zduplikowane id fali: {wave.id}")
        seen_waves.add(wave.id)
        for task in wave.tasks:
            if not ID_RE.match(task.id):
                problems.append(f"Fala {wave.id}: niepoprawne id zadania: {task.id}")
            if task.id in seen_tasks:
                problems.append(f"Zduplikowane id zadania: {task.id}")
            seen_tasks.add(task.id)
        problems.extend(_wave_overlaps(wave))
    return problems


def _wave_overlaps(wave: Wave) -> list[str]:
    problems: list[str] = []
    tasks = wave.tasks
    for i, a in enumerate(tasks):
        for b in tasks[i + 1:]:
            for pa in a.files:
                for pb in b.files:
                    if patterns_overlap(pa, pb):
                        problems.append(
                            f"Fala {wave.id}: zadania {a.id} i {b.id} mają wspólne pliki "
                            f"({pa} ~ {pb})"
                        )
    return problems


def load_plan(path: Path) -> Plan:
    if not path.is_file():
        raise PlanError(f"Brak pliku planu: {path}")
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise PlanError(f"Niepoprawny YAML w {path}: {exc}") from exc
    problems: list[str] = []
    waves = _parse_plan(data, path.parent, problems)
    if problems:
        raise PlanError("\n".join(problems))
    plan = Plan(version=1, waves=tuple(waves))
    problems = validate_plan(plan)
    if problems:
        raise PlanError("\n".join(problems))
    return plan


def _parse_plan(data: Any, base: Path, problems: list[str]) -> list[Wave]:
    if not isinstance(data, dict):
        problems.append("Plan musi być mapą na najwyższym poziomie")
        return []
    if data.get("version") != 1:
        problems.append("version: musi wynosić 1")
    raw_waves = data.get("waves")
    if not isinstance(raw_waves, list) or not raw_waves:
        problems.append("waves: musi być niepustą listą")
        return []
    waves: list[Wave] = []
    for wi, raw in enumerate(raw_waves):
        wave = _parse_wave(raw, wi, base, problems)
        if wave is not None:
            waves.append(wave)
    return waves


def _parse_wave(raw: Any, wi: int, base: Path, problems: list[str]) -> Wave | None:
    loc = f"waves[{wi}]"
    if not isinstance(raw, dict):
        problems.append(f"{loc}: fala musi być mapą")
        return None
    ok = True
    wave_id = raw.get("id")
    if not isinstance(wave_id, str) or not wave_id:
        problems.append(f"{loc}: brak id (str)")
        ok = False
    raw_tasks = raw.get("tasks")
    if not isinstance(raw_tasks, list) or not raw_tasks:
        problems.append(f"{loc}: tasks musi być niepustą listą")
        return None
    tasks: list[Task] = []
    for ti, raw_task in enumerate(raw_tasks):
        task = _parse_task(raw_task, f"{loc}.tasks[{ti}]", base, problems)
        if task is None:
            ok = False
        else:
            tasks.append(task)
    if not ok or not isinstance(wave_id, str):
        return None
    return Wave(id=wave_id, tasks=tuple(tasks))


def _parse_task(raw: Any, loc: str, base: Path, problems: list[str]) -> Task | None:
    if not isinstance(raw, dict):
        problems.append(f"{loc}: zadanie musi być mapą")
        return None
    task_id = raw.get("id")
    if isinstance(task_id, str) and task_id:
        loc = f"{loc} (id={task_id})"
    local: list[str] = []

    def bad(msg: str) -> None:
        local.append(f"{loc}: {msg}")

    if not isinstance(task_id, str) or not task_id:
        bad("brak id (str)")
    for key in sorted(set(raw) - ALLOWED_TASK_KEYS, key=str):
        bad(f"nieznany klucz: {key}")
    title = raw.get("title")
    if not isinstance(title, str) or not title.strip():
        bad("title musi być niepustym stringiem")
    files = _parse_files(raw.get("files"), bad)
    prompt = _parse_prompt(raw, base, bad)
    model = _opt_str(raw, "model", bad)
    test_command = _opt_str(raw, "test_command", bad)
    timeout = raw.get("timeout_minutes")
    if timeout is not None and (
        not isinstance(timeout, int) or isinstance(timeout, bool) or timeout < 1
    ):
        bad("timeout_minutes musi być liczbą całkowitą >= 1")
    if local:
        problems.extend(local)
        return None
    return Task(
        id=task_id,
        title=title.strip(),
        prompt=prompt or "",
        files=files,
        model=model,
        test_command=test_command,
        timeout_minutes=timeout,
    )


def _parse_files(raw: Any, bad: Any) -> tuple[str, ...]:
    if not isinstance(raw, list) or not raw:
        bad("files musi być niepustą listą wzorców")
        return ()
    patterns: list[str] = []
    for item in raw:
        if not isinstance(item, str) or not item.strip():
            bad(f"niepoprawny wzorzec w files: {item!r}")
            continue
        pattern = normalize_pattern(item)
        if pattern.startswith("/") or re.match(r"^[A-Za-z]:/", pattern):
            bad(f"wzorzec nie może być ścieżką bezwzględną: {item}")
        elif ".." in pattern.split("/"):
            bad(f"wzorzec nie może zawierać '..': {item}")
        else:
            patterns.append(pattern)
    return tuple(patterns)


def _parse_prompt(raw: dict[str, Any], base: Path, bad: Any) -> str | None:
    has_prompt = raw.get("prompt") is not None
    has_file = raw.get("prompt_file") is not None
    if has_prompt == has_file:
        bad("wymagane dokładnie jedno z: prompt, prompt_file")
        return None
    if has_prompt:
        text = raw["prompt"]
        if not isinstance(text, str):
            bad("prompt musi być stringiem")
            return None
    else:
        name = raw["prompt_file"]
        if not isinstance(name, str) or not name.strip():
            bad("prompt_file musi być niepustym stringiem")
            return None
        file_path = base / name
        if not file_path.is_file():
            bad(f"brak pliku prompt_file: {name}")
            return None
        text = file_path.read_text(encoding="utf-8")
    text = text.strip()
    if not text:
        bad("prompt jest pusty")
        return None
    return text


def _opt_str(raw: dict[str, Any], key: str, bad: Any) -> str | None:
    value = raw.get(key)
    if value is None:
        return None
    if not isinstance(value, str):
        bad(f"{key} musi być stringiem")
        return None
    return value.strip() or None
