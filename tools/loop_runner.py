"""Autonomous wave loop runner with watchdog for Cuy (orkiestra + Antigravity).

What it does, compared with the first version:
  * streams orkiestra output live into tools/loop_runner.log (no more silent capture),
  * runs orkiestra with --no-wait and does the quota waiting itself, in short slices,
    so the battery is checked and the status file stays fresh while waiting,
  * watchdog: if nothing in .orkiestra/state.json changes for --stall-minutes (and we are not
    waiting for a quota reset), the whole process tree (orkiestra + agy) is killed and the wave
    is restarted; finished work is kept (orkiestra resumes from state.json),
  * tasks parked as NEEDS_HUMAN are reset to pending and retried (limited), because most of
    them are transient (timeouts, rate limits, rebase races),
  * never skips to the next wave when a wave fails: later waves depend on earlier ones,
  * battery low (also during a wave): emergency checkpoint, kill agents, exit,
  * writes .orkiestra/loop_status.json, which battery_guard shows in the README dashboard.

Usage (from the repo root, on branch main, clean tree):
    python tools/loop_runner.py
    python tools/loop_runner.py --stall-minutes 45 --quota-wait 30
    python tools/loop_runner.py --only W13          # just one wave
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import subprocess
import sys
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
STATE_FILE = REPO_ROOT / ".orkiestra" / "state.json"
LOOP_STATUS_FILE = REPO_ROOT / ".orkiestra" / "loop_status.json"
WAVES_FILE = REPO_ROOT / "waves.yaml"
LOG_FILE = REPO_ROOT / "tools" / "loop_runner.log"

DONE = ("merged", "skipped")
GENERATED_FILES = ("README.md", "STAN_PROJEKTU.md", "TODO.md")
POLL_SECONDS = 15
EXIT_QUOTA = 75

sys.path.insert(0, str(Path(__file__).resolve().parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, mode="a", encoding="utf-8"),
    ],
)
logger = logging.getLogger("loop_runner")


# ------------------------------------------------------------------ helpers
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def run_cmd(cmd: list[str], cwd: Path = REPO_ROOT) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )


def read_state() -> dict:
    if not STATE_FILE.exists():
        return {}
    for _ in range(3):  # the file is replaced atomically, but Windows may hold it briefly
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            time.sleep(0.5)
    return {}


def get_all_waves() -> list[str]:
    if not WAVES_FILE.exists():
        return []
    return re.findall(r"^- id:\s*([^\s#]+)", WAVES_FILE.read_text(encoding="utf-8"), re.MULTILINE)


def wave_task_states(wave_id: str, state: dict) -> dict[str, dict]:
    return {t: v for t, v in state.get("tasks", {}).items() if v.get("wave_id") == wave_id}


def is_wave_completed(wave_id: str, state: dict) -> bool:
    tasks = wave_task_states(wave_id, state)
    return bool(tasks) and all(v.get("status") in DONE for v in tasks.values())


def merged_count(state: dict) -> int:
    return sum(1 for v in state.get("tasks", {}).values() if v.get("status") == "merged")


_status: dict = {}


def write_status(**changes: object) -> None:
    """Small status file read by battery_guard (README dashboard)."""
    _status.update(changes)
    _status["updated"] = now_utc().isoformat(timespec="seconds")
    try:
        LOOP_STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
        tmp = LOOP_STATUS_FILE.with_name(LOOP_STATUS_FILE.name + ".tmp")
        tmp.write_text(json.dumps(_status, indent=2, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, LOOP_STATUS_FILE)
    except OSError as exc:
        logger.debug("status write failed: %s", exc)


def get_battery():
    from battery_guard import get_battery_status

    return get_battery_status()


def battery_low() -> bool:
    bat = get_battery()
    if bat.is_low():
        logger.warning("Battery is low (%s): emergency checkpoint.", bat.summary())
        from battery_guard import emergency_save

        emergency_save(bat, kill_agents=True)
        write_status(phase="battery", message=f"Zatrzymano: niska bateria ({bat.summary()})")
        return True
    return False


def tree_kill(proc: subprocess.Popen) -> None:
    """Kill orkiestra together with the agy processes it started."""
    if proc.poll() is not None:
        return
    logger.warning("Killing process tree of PID %s", proc.pid)
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True, text=True
        )
    else:
        proc.kill()
    try:
        proc.wait(timeout=30)
    except subprocess.TimeoutExpired:
        logger.error("Process %s did not exit after kill", proc.pid)


def ensure_clean_tree() -> bool:
    """orkiestra (merge_mode=local) refuses to start on a dirty tree.

    The only expected dirt is a generated file (dashboard written, commit lost a race with a
    git lock). Those are safe to restore. Anything else is reported, never touched.
    """
    res = run_cmd(["git", "status", "--porcelain"])
    dirty = [line[3:].strip().strip('"') for line in res.stdout.splitlines() if line.strip()]
    if not dirty:
        return True
    foreign = [p for p in dirty if p not in GENERATED_FILES]
    if foreign:
        logger.error("Working tree has changes I will not touch: %s", ", ".join(foreign[:10]))
        write_status(phase="halted", message="Drzewo robocze ma niezatwierdzone zmiany: " + ", ".join(foreign[:5]))
        return False
    run_cmd(["git", "checkout", "--", *dirty])
    logger.info("Restored generated files: %s", ", ".join(dirty))
    return True


def push_to_remote() -> bool:
    res = run_cmd(["git", "push", "origin", "main"])
    if res.returncode == 0:
        logger.info("Pushed main to origin/main")
        return True
    logger.warning("git push failed: %s", res.stderr.strip()[:300])
    run_cmd(["git", "pull", "--rebase", "origin", "main"])
    return run_cmd(["git", "push", "origin", "main"]).returncode == 0


def update_dashboard() -> None:
    try:
        from battery_guard import update_readme_dashboard

        update_readme_dashboard(get_battery())
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not update dashboard: %s", exc)


def run_tests() -> bool:
    logger.info("Running dotnet test regression check...")
    try:
        res = run_cmd(
            ["dotnet", "test", "tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj", "-c", "Release", "--nologo"]
        )
    except OSError as exc:
        write_status(tests="FAIL")
        logger.error("Cannot run dotnet: %s", exc)
        return False
    m = re.search(r"(Passed!|Failed!).*?Failed:\s*(\d+).*?Passed:\s*(\d+).*?Total:\s*(\d+)", res.stdout, re.S)
    if res.returncode == 0:
        total = m.group(4) if m else "?"
        write_status(tests=f"{total} / {total}")
        logger.info("All unit tests passed.")
        return True
    write_status(tests="FAIL")
    logger.error("Unit tests failed:\n%s\n%s", res.stdout[-1500:], res.stderr[-1000:])
    return False


# ------------------------------------------------------------ one orkiestra run
def last_progress(started: datetime, last_output: float) -> datetime:
    """Latest sign of life: any task update in state.json, state.json mtime, or a console line."""
    best = started
    for ts in read_state().get("tasks", {}).values():
        dt = parse_iso(ts.get("updated_at"))
        if dt and dt > best:
            best = dt
    try:
        mtime = datetime.fromtimestamp(STATE_FILE.stat().st_mtime, tz=timezone.utc)
        best = max(best, mtime)
    except OSError:
        pass
    out = datetime.fromtimestamp(last_output, tz=timezone.utc)
    return min(max(best, out), now_utc())


def orkiestra_base() -> list[str]:
    override = os.environ.get("LOOP_ORKIESTRA_CMD")  # for tests
    return override.split() if override else [sys.executable, "-m", "orkiestra"]


def spawn_orkiestra(wave_id: str) -> subprocess.Popen:
    cmd = [*orkiestra_base(), "-v", "run", "--wave", wave_id, "--no-wait"]
    logger.info("Starting: %s", " ".join(cmd))
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"
    return subprocess.Popen(
        cmd,
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )


def run_orkiestra_once(wave_id: str, stall: timedelta) -> tuple[str, int | None]:
    """Run orkiestra for one wave. Returns (reason, exit_code); reason: exit|stalled|battery."""
    proc = spawn_orkiestra(wave_id)
    started = now_utc()
    last_output = [time.time()]

    def pump() -> None:
        assert proc.stdout is not None
        for line in proc.stdout:
            last_output[0] = time.time()
            logger.info("[orkiestra] %s", line.rstrip())

    reader = threading.Thread(target=pump, daemon=True)
    reader.start()

    while proc.poll() is None:
        time.sleep(POLL_SECONDS)
        if battery_low():
            tree_kill(proc)
            return "battery", None
        progress = last_progress(started, last_output[0])
        idle = now_utc() - progress
        write_status(
            phase="running",
            wave=wave_id,
            last_progress=progress.isoformat(timespec="seconds"),
            paused_until=None,
            message=f"Fala {wave_id} w toku, ostatni postęp {int(idle.total_seconds() // 60)} min temu",
        )
        if idle > stall:
            logger.error(
                "No progress for %d min (limit %d). Restarting wave %s.",
                idle.total_seconds() // 60,
                stall.total_seconds() // 60,
                wave_id,
            )
            tree_kill(proc)
            reader.join(timeout=5)
            return "stalled", None
    reader.join(timeout=5)
    return "exit", proc.returncode


def wait_for_quota(minutes: int, wave_id: str) -> bool:
    """Sleep in short slices; returns False if the battery ran low meanwhile."""
    until = now_utc() + timedelta(minutes=minutes)
    logger.warning("Rate limit: waiting until %s UTC", until.strftime("%H:%M"))
    while now_utc() < until:
        write_status(
            phase="quota",
            wave=wave_id,
            paused_until=until.isoformat(timespec="seconds"),
            message=f"Limit Antigravity: czekam do {until.astimezone().strftime('%H:%M')}",
        )
        if battery_low():
            return False
        time.sleep(min(30, max(1, (until - now_utc()).total_seconds())))
    return True


def parked_tasks(wave_id: str) -> list[str]:
    state = read_state()
    out = []
    for task_id, ts in wave_task_states(wave_id, state).items():
        if ts.get("status") == "needs_human":
            logger.warning("Task %s needs human: %s", task_id, (ts.get("last_error") or "")[:200].replace("\n", " "))
            out.append(task_id)
    return out


def reset_tasks(task_ids: list[str]) -> list[str]:
    reset = []
    for task_id in task_ids:
        res = run_cmd([*orkiestra_base(), "mark", task_id, "pending"])
        if res.returncode == 0:
            reset.append(task_id)
        else:
            logger.error("mark %s failed: %s", task_id, res.stderr.strip()[:200])
    return reset


# --------------------------------------------------------------------- waves
def run_wave(wave_id: str, a: argparse.Namespace) -> str:
    """Returns: done | battery | halted."""
    stall = timedelta(minutes=a.stall_minutes)
    restarts = resets = quota_waits = 0
    while True:
        if is_wave_completed(wave_id, read_state()):
            return "done"
        if battery_low():
            return "battery"
        if not ensure_clean_tree():
            return "halted"

        reason, rc = run_orkiestra_once(wave_id, stall)
        if reason == "battery":
            return "battery"
        state = read_state()
        if is_wave_completed(wave_id, state):
            return "done"

        if reason == "stalled":
            restarts += 1
        elif rc == EXIT_QUOTA:
            quota_waits += 1
            if quota_waits > a.max_quota_waits:
                write_status(phase="halted", message=f"Fala {wave_id}: limit trwa zbyt długo")
                return "halted"
            if not wait_for_quota(a.quota_wait, wave_id):
                return "battery"
            continue
        elif rc == 0:
            # orkiestra says ok but not everything merged: look at the states again
            restarts += 1
        else:
            parked = parked_tasks(wave_id)
            if parked and resets < a.max_resets:
                resets += 1
                logger.warning("Reset %d/%d: %s", resets, a.max_resets, ", ".join(reset_tasks(parked)))
                continue
            restarts += 1

        if restarts > a.max_restarts or (rc not in (None, 0) and parked_tasks(wave_id)):
            left = [t for t, v in wave_task_states(wave_id, state).items() if v.get("status") not in DONE]
            write_status(
                phase="halted",
                wave=wave_id,
                message=f"Fala {wave_id} zatrzymana, wymaga człowieka: {', '.join(left[:6])}",
            )
            logger.error("Wave %s halted. Open: %s", wave_id, ", ".join(left))
            return "halted"
        logger.warning("Restart %d/%d of wave %s in 30 s", restarts, a.max_restarts, wave_id)
        time.sleep(30)


def main() -> int:
    ap = argparse.ArgumentParser(description="Autonomous wave loop with watchdog")
    ap.add_argument("--stall-minutes", type=int, default=60, help="no progress in state.json for this long = hung")
    ap.add_argument("--quota-wait", type=int, default=30, help="minutes to wait after a rate limit")
    ap.add_argument("--max-quota-waits", type=int, default=48)
    ap.add_argument("--max-restarts", type=int, default=3, help="restarts per wave (hang, crash)")
    ap.add_argument("--max-resets", type=int, default=2, help="how many times parked tasks are retried per wave")
    ap.add_argument("--only", help="run only this wave id")
    ap.add_argument("--skip-tests", action="store_true", help="do not run dotnet test after each wave")
    ap.add_argument("--cooldown", type=int, default=20, help="seconds between waves")
    a = ap.parse_args()

    logger.info("=== LOOP RUNNER (watchdog) START ===")
    waves = [w for w in get_all_waves() if not a.only or w == a.only]
    write_status(phase="starting", message="Start pętli", restarts=0, tests=_status.get("tests", "-"))

    for wave_id in waves:
        if is_wave_completed(wave_id, read_state()):
            continue
        logger.info("=" * 60)
        logger.info("--- WAVE %s ---", wave_id)
        write_status(phase="running", wave=wave_id, message=f"Start fali {wave_id}")
        result = run_wave(wave_id, a)
        if result == "battery":
            return 0
        if result == "halted":
            update_dashboard()
            push_to_remote()
            logger.error("Loop stopped at wave %s. Fix it, then run this script again.", wave_id)
            return 1
        if not a.skip_tests and not run_tests():
            write_status(phase="halted", message=f"Testy czerwone po fali {wave_id}")
            update_dashboard()
            push_to_remote()
            logger.error("Tests failed after %s. Stopping.", wave_id)
            return 1
        write_status(phase="idle", message=f"Fala {wave_id} zakończona", merged=merged_count(read_state()))
        update_dashboard()
        push_to_remote()
        time.sleep(a.cooldown)

    write_status(phase="finished", message="Wszystkie fale zakończone")
    update_dashboard()
    push_to_remote()
    logger.info("=== LOOP RUNNER FINISHED ===")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        write_status(phase="halted", message="Przerwano ręcznie (Ctrl+C)")
        logger.info("Interrupted. State is saved; run the script again to resume.")
        sys.exit(130)
