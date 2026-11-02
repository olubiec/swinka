from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import pytest

from orkiestra import agent
from orkiestra.errors import AgentError
from orkiestra.models import AgentConfig

FAKE = Path(__file__).parent / "fakes" / "fake_agy.py"


def cfg(**kw) -> AgentConfig:
    return AgentConfig(cmd=(sys.executable, str(FAKE)), **kw)


def run(tmp_path, config=None, prompt="FAKE_WRITE: a/b.txt", timeout=1):
    return agent.run_agent(
        prompt,
        tmp_path,
        config or cfg(),
        model=None,
        timeout_minutes=timeout,
        log_path=tmp_path / "logs" / "t.log",
    )


def test_build_args_order(tmp_path):
    c = AgentConfig(cmd=("agy",), extra_args=("--x",))
    args = agent.build_agy_args(c, "P", tmp_path, model="m", timeout_minutes=7)
    assert args == [
        "agy", "-p", "P", "--output-format", "json", "--print-timeout", "7m",
        "--model", "m", "--dangerously-skip-permissions", "--add-dir", str(tmp_path), "--x",
    ]


def test_build_args_optional(tmp_path):
    c = AgentConfig(cmd=("agy",), skip_permissions=False, add_dir=False, output_format="text")
    args = agent.build_agy_args(c, "P", tmp_path, model=None, timeout_minutes=1)
    assert args == ["agy", "-p", "P", "--output-format", "text", "--print-timeout", "1m"]


def test_parse_output():
    env = json.dumps({"status": "SUCCESS", "response": "hi", "error": ""})
    assert agent.parse_output(env, "json") == (True, "hi", "")
    assert agent.parse_output("noise\r\n" + env + "\n", "json") == (True, "hi", "")
    err = json.dumps({"status": "ERROR", "response": "", "error": "bad"})
    assert agent.parse_output(err, "json") == (False, "", "bad")
    assert agent.parse_output("hello\n", "text") == (True, "hello", "")
    assert agent.parse_output("garbage", "json") == (True, "garbage", "")
    assert agent.parse_output("  ", "json") == (False, "", "")


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("resets in 4 hours and 50 minutes", 4 * 3600 + 50 * 60),
        ("retry after ~28 minutes", 28 * 60),
        ("in 30s", 30),
        ("4h50m", 4 * 3600 + 50 * 60),
        ("nothing here", None),
    ],
)
def test_parse_reset_seconds(text, expected):
    assert agent.parse_reset_seconds(text) == expected


def test_detect_quota():
    assert agent.detect_quota(0, "error 429 quota") == (False, None)
    assert agent.detect_quota(1, "HTTP 429, resets in 2 minutes") == (True, 120)
    assert agent.detect_quota(1, "boom") == (False, None)


def test_run_edit(tmp_path):
    res = run(tmp_path)
    assert res.ok and res.exit_code == 0
    assert (tmp_path / "a" / "b.txt").read_text() == "written by fake agy\n"
    assert (tmp_path / ".orkiestra-result.json").exists()
    assert res.response == "DONE: fake"
    log = (tmp_path / "logs" / "t.log").read_text()
    assert "<prompt:" in log and "FAKE_WRITE" not in log
    assert "--- stdout ---" in log and "--- stderr ---" in log


def test_run_fail(tmp_path, monkeypatch):
    monkeypatch.setenv("FAKE_AGY_MODE", "fail")
    res = run(tmp_path)
    assert not res.ok and res.error == "boom" and not res.quota_exhausted


def test_run_quota(tmp_path, monkeypatch):
    monkeypatch.setenv("FAKE_AGY_MODE", "quota")
    res = run(tmp_path)
    assert not res.ok and res.quota_exhausted and res.quota_reset_seconds == 120


def test_run_empty(tmp_path, monkeypatch):
    monkeypatch.setenv("FAKE_AGY_MODE", "empty")
    res = run(tmp_path)
    assert not res.ok and "use_pty" in res.error


def test_run_text_format(tmp_path):
    res = run(tmp_path, cfg(output_format="text"))
    assert res.ok and res.response == "DONE: fake"


def test_timeout(tmp_path, monkeypatch):
    monkeypatch.setenv("FAKE_AGY_MODE", "sleep")
    monkeypatch.setenv("FAKE_AGY_SLEEP", "3")
    monkeypatch.setattr(agent, "_hard_timeout", lambda m: 1)
    start = time.monotonic()
    res = run(tmp_path)
    assert res.timed_out and not res.ok and res.exit_code == -1 and res.error == "timeout"
    assert time.monotonic() - start < 2.9


def test_missing_binary(tmp_path):
    with pytest.raises(AgentError):
        run(tmp_path, AgentConfig(cmd=("definitely-not-a-real-agy-binary",)))


def test_log_env_records_args(tmp_path, monkeypatch):
    log = tmp_path / "calls.log"
    monkeypatch.setenv("FAKE_AGY_LOG", str(log))
    run(tmp_path, prompt="hello")
    rec = json.loads(log.read_text().splitlines()[0])
    assert rec[:2] == ["-p", "hello"]


def test_modes_file(tmp_path, monkeypatch):
    modes = tmp_path / "modes.txt"
    modes.write_text("fail\nedit\n")
    monkeypatch.setenv("FAKE_AGY_MODES_FILE", str(modes))
    assert not run(tmp_path).ok
    assert run(tmp_path).ok
    assert run(tmp_path).ok  # file empty -> falls back to FAKE_AGY_MODE default (edit)


@pytest.mark.skipif(sys.platform == "win32", reason="pty is POSIX only")
def test_pty_edit(tmp_path):
    res = run(tmp_path, cfg(use_pty=True))
    assert res.ok
    assert (tmp_path / "a" / "b.txt").exists()


def test_quota_detected_when_exit_zero_but_status_error(tmp_path, monkeypatch):
    import json
    import subprocess
    from types import SimpleNamespace

    from orkiestra import agent
    from orkiestra.models import AgentConfig

    payload = json.dumps(
        {"status": "ERROR", "response": "", "error": "RESOURCE_EXHAUSTED: resets in 2 hours"}
    )
    monkeypatch.setattr(
        subprocess, "run", lambda *a, **k: SimpleNamespace(returncode=0, stdout=payload, stderr="")
    )
    res = agent.run_agent(
        "p", tmp_path, AgentConfig(), model=None, timeout_minutes=1, log_path=tmp_path / "l.log"
    )
    assert res.quota_exhausted and res.quota_reset_seconds == 7200
