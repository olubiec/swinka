from __future__ import annotations

import re
from importlib import resources
from string import Template

from orkiestra.models import RESULT_FILE, Config, Task, Wave

TEMPLATE_NAME = "task_prompt.md"
MAX_FEEDBACK_CHARS = 4000


def load_template(config: Config) -> str:
    override = config.repo_root / config.run.state_dir / TEMPLATE_NAME
    if override.exists():
        return override.read_text(encoding="utf-8")
    return (
        resources.files("orkiestra.templates")
        .joinpath(TEMPLATE_NAME)
        .read_text(encoding="utf-8")
    )


def effective_test_command(task: Task, config: Config) -> str | None:
    return task.test_command or config.project.test_command or None


def truncate_tail(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return "...[skrócono]\n" + text[-max_chars:]


def build_prompt(
    task: Task, wave: Wave, config: Config, feedback: str | None = None
) -> str:
    cmd = effective_test_command(task, config)
    test_rule = (
        f"- Before finishing, run `{cmd}` once; fix failures (max 3 attempts)."
        if cmd
        else ""
    )
    feedback_text = ""
    if feedback:
        feedback_text = (
            "\n## Previous attempt failed\n"
            + truncate_tail(feedback, MAX_FEEDBACK_CHARS)
            + "\nFix exactly this problem. Keep the correct work already present in the files."
        )
    text = Template(load_template(config)).substitute(
        task_id=task.id,
        title=task.title,
        wave_id=wave.id,
        files="\n".join(f"  - {p}" for p in task.files),
        test_rule=test_rule,
        result_file=RESULT_FILE,
        prompt=task.prompt,
        feedback=feedback_text,
    )
    text = re.sub(r"\n{3,}", "\n\n", text.rstrip())
    return text + "\n"
