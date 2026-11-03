"""Autonomous Wave Loop Runner for Cuy.

Executes remaining waves sequentially using orkiestra with gemini-3.8-flash-medium,
monitoring battery levels, pacing API rate limits, verifying test suites,
and pushing commits & dashboard updates to GitHub for mobile monitoring.
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("tools/loop_runner.log", mode="a", encoding="utf-8"),
    ],
)
logger = logging.getLogger("loop_runner")

REPO_ROOT = Path(__file__).resolve().parent.parent
STATE_FILE = REPO_ROOT / ".orkiestra" / "state.json"
WAVES_FILE = REPO_ROOT / "waves.yaml"


def run_cmd(cmd: list[str], cwd: Path = REPO_ROOT) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def get_battery():
    from battery_guard import get_battery_status

    return get_battery_status()


def read_state() -> dict:
    if not STATE_FILE.exists():
        return {}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning(f"Failed to read state: {exc}")
        return {}


def is_wave_completed(wave_id: str, state: dict) -> bool:
    tasks = state.get("tasks", {})
    wave_tasks = [t for t, v in tasks.items() if v.get("wave_id") == wave_id]
    if not wave_tasks:
        return False
    return all(tasks[t].get("status") == "merged" for t in wave_tasks)


def get_all_waves() -> list[str]:
    import re

    if not WAVES_FILE.exists():
        return []
    content = WAVES_FILE.read_text(encoding="utf-8")
    waves = re.findall(r"^- id:\s*([^\s#]+)", content, re.MULTILINE)
    return waves


def push_to_remote() -> bool:
    res = run_cmd(["git", "push", "origin", "main"])
    if res.returncode == 0:
        logger.info("Successfully pushed main to origin/main")
        return True
    logger.warning(f"git push origin main failed: {res.stderr.strip()}")
    # Attempt quick pull --rebase if remote has heartbeat commits
    run_cmd(["git", "pull", "--rebase", "origin", "main"])
    res2 = run_cmd(["git", "push", "origin", "main"])
    return res2.returncode == 0


def update_dashboard():
    try:
        from battery_guard import get_battery_status, update_readme_dashboard

        bat = get_battery_status()
        update_readme_dashboard(bat)
    except Exception as exc:
        logger.warning(f"Could not update dashboard: {exc}")


def run_tests() -> bool:
    logger.info("Running dotnet test regression check...")
    res = run_cmd(
        [
            "dotnet",
            "test",
            "tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj",
            "-c",
            "Release",
            "--nologo",
        ]
    )
    if res.returncode == 0:
        logger.info("All unit tests passed cleanly!")
        return True
    logger.error(f"Unit tests failed:\n{res.stdout[-1500:]}\n{res.stderr[-1000:]}")
    return False


def main():
    logger.info("=== STARTING AUTONOMOUS WAVE LOOP RUNNER ===")
    all_waves = get_all_waves()
    logger.info(f"Loaded {len(all_waves)} waves from waves.yaml: {', '.join(all_waves[:10])}...")

    # Waves up to W12 are already done
    wave_queue = [w for w in all_waves if w not in ("w-validation-tests", "w-perf-tests", "w-backlog-cleanup", "W11", "W12")]
    logger.info(f"Queued {len(wave_queue)} waves to run: {', '.join(wave_queue)}")

    cooldown_seconds = 20  # Pacing between waves to avoid quota/RPM bursts

    for wave_id in wave_queue:
        logger.info("=" * 60)
        logger.info(f"--- PREPARING WAVE: {wave_id} ---")

        # 1. Check battery status
        bat = get_battery()
        logger.info(f"Battery: {bat.summary()}")
        if bat.is_low():
            logger.warning(f"Battery is low ({bat.summary()})! Triggering emergency checkpoint.")
            from battery_guard import emergency_save

            emergency_save(bat, kill_agents=True)
            logger.info("Exiting loop runner safely due to low battery.")
            sys.exit(0)

        # 2. Check if wave already merged
        state = read_state()
        if is_wave_completed(wave_id, state):
            logger.info(f"Wave {wave_id} is already completed and merged. Skipping.")
            continue

        # 3. Execute wave via orkiestra
        logger.info(f"Launching orkiestra for wave {wave_id}...")
        attempts = 0
        max_wave_retries = 3

        while attempts < max_wave_retries:
            attempts += 1
            cmd = [sys.executable, "-m", "orkiestra", "-v", "run", "--wave", wave_id]
            logger.info(f"Execution command: {' '.join(cmd)} (attempt {attempts}/{max_wave_retries})")

            proc = subprocess.run(
                cmd,
                cwd=REPO_ROOT,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )

            # Check if battery became low during execution
            bat_post = get_battery()
            if bat_post.is_low():
                logger.warning(f"Battery dropped low during wave {wave_id}! Triggering emergency checkpoint.")
                from battery_guard import emergency_save

                emergency_save(bat_post, kill_agents=True)
                sys.exit(0)

            # Check output for quota exhaustion
            if "limit Antigravity wyczerpany" in proc.stdout or "quota" in proc.stdout.lower() or "RESOURCE_EXHAUSTED" in proc.stdout:
                logger.warning(f"Wave {wave_id} encountered rate limit / quota pause. Waiting 25 minutes before retry...")
                time.sleep(25 * 60)
                continue

            state = read_state()
            if is_wave_completed(wave_id, state):
                logger.info(f"Wave {wave_id} COMPLETED AND MERGED SUCCESSFULLY!")
                break
            else:
                logger.warning(f"Wave {wave_id} did not complete all tasks on attempt {attempts}.")
                logger.warning(f"Stdout summary: {proc.stdout[-1000:]}")
                if proc.stderr:
                    logger.warning(f"Stderr: {proc.stderr[-1000:]}")
                time.sleep(30)

        # 4. Post-wave verification & sync
        state = read_state()
        if is_wave_completed(wave_id, state):
            # Run test regression check
            test_ok = run_tests()
            if not test_ok:
                logger.error(f"Test failure detected after wave {wave_id}!")
                # Document in TODO
                break

            # Update dashboard & push
            update_dashboard()
            push_to_remote()

            # Pacing delay
            logger.info(f"Wave {wave_id} complete. Cooling down for {cooldown_seconds}s to pace API limits...")
            time.sleep(cooldown_seconds)
        else:
            logger.error(f"Wave {wave_id} could not be completed after {max_wave_retries} attempts.")
            # Update dashboard with error status
            update_dashboard()
            push_to_remote()
            # If a task needs human, continue to next wave or halt based on rule
            logger.info("Moving to next wave...")

    logger.info("=== AUTONOMOUS WAVE LOOP RUNNER FINISHED ===")


if __name__ == "__main__":
    main()
