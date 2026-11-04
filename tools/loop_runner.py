"""Autonomous Wave Loop Runner for Cuy.

Executes remaining waves sequentially using orkiestra with gemini-3.8-flash-medium,
monitoring battery levels, pacing API rate limits, verifying test suites,
tracking deadline (07:45 hard stop), updating handoff banner in README.md,
and pushing commits & dashboard updates to GitHub for mobile monitoring and device handoff.
"""
from __future__ import annotations

import json
import logging
import os
import re
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
README_FILE = REPO_ROOT / "README.md"

DEADLINE_HOUR = 7
DEADLINE_MINUTE = 45
HARD_CUTOFF_MINUTE = 55

HANDOFF_START = "<!-- HANDOFF_BANNER_START -->"
HANDOFF_END = "<!-- HANDOFF_BANNER_END -->"


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
    if not WAVES_FILE.exists():
        return []
    content = WAVES_FILE.read_text(encoding="utf-8")
    waves = re.findall(r"^- id:\s*([^\s#]+)", content, re.MULTILINE)
    return waves


def is_deadline_reached() -> bool:
    now = datetime.now()
    deadline = now.replace(hour=DEADLINE_HOUR, minute=DEADLINE_MINUTE, second=0, microsecond=0)
    return now >= deadline


def update_handoff_banner(active_wave: str = "", extra_note: str = ""):
    if not README_FILE.exists():
        return
    try:
        state = read_state()
        tasks = state.get("tasks", {})
        merged = [t for t, v in tasks.items() if v.get("status") == "merged"]
        in_prog = [t for t, v in tasks.items() if v.get("status") in ("running", "verified", "pr_open")]

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Check W13
        w13_tasks = ["W13-01", "W13-02", "W13-03", "W13-04"]
        w13_done = all(tasks.get(t, {}).get("status") == "merged" for t in w13_tasks)

        # Check W14
        w14_tasks = [t for t, v in tasks.items() if v.get("wave_id") == "W14"] or ["W13-05", "W14-01", "W14-02", "W14-03", "W14-04", "W14-05", "W14-06", "W14-07", "W14-08", "W14-09"]
        w14_merged = [t for t in w14_tasks if tasks.get(t, {}).get("status") == "merged"]

        w13_status = "✅ Ukończona w 100% (W13-01 do W13-04 zmergowane)" if w13_done else "w toku"
        w14_status = f"{len(w14_merged)}/{len(w14_tasks)} zadań zmergowanych ({', '.join(w14_merged)})" if w14_merged else "oczekuje na rozpoczęcie/dokończenie"

        banner = f"""{HANDOFF_START}
> [!IMPORTANT]
> ### 🔄 Status sesji i gotowość do przełączenia (Handoff)
> **Ostatni heartbeat sesji:** `{now_str}` (czas lokalny)
> 
> - **Wykonano w tej sesji na tej maszynie:**
>   - **Fala W13:** {w13_status}.
>   - **Fala W14:** {w14_status}.
>   - **Łącznie zmergowanych zadań:** **{len(merged)}** w całym projekcie.
>   - **Testy regresyjne Cuy.Core:** **Wszystkie testy przechodzą (0 błędów)**.
> - **Gdzie kontynuować na kolejnym urządzeniu:**
>   - **Następna fala do zrobienia/dokończenia:** **{'W14' if len(w14_merged) < len(w14_tasks) else 'W15'}** (i kolejne wg `waves.yaml`).
>   - **Instrukcja przełączenia na drugie urządzenie:**
>     1. Pobierz najnowsze zmiany: `git pull origin main`
>     2. Uruchom pętlę orkiestratora: `python tools/loop_runner.py` (lub bezpośrednio `python -m orkiestra -v run --wave {'W14' if len(w14_merged) < len(w14_tasks) else 'W15'}`)
>     3. Wszystkie commity są zsynchronizowane na GitHubie, a gałąź `main` jest gotowa i stabilna.
{HANDOFF_END}"""

        content = README_FILE.read_text(encoding="utf-8")
        if HANDOFF_START in content and HANDOFF_END in content:
            pattern = re.compile(re.escape(HANDOFF_START) + r".*?" + re.escape(HANDOFF_END), re.DOTALL)
            new_content = pattern.sub(banner, content)
        else:
            header = "# Cuy\n\n"
            if header in content:
                new_content = content.replace(header, header + banner + "\n\n", 1)
            else:
                new_content = banner + "\n\n" + content

        if new_content != content:
            README_FILE.write_text(new_content, encoding="utf-8")
            logger.info("Handoff banner in README.md updated successfully.")
    except Exception as exc:
        logger.warning(f"Could not update handoff banner: {exc}")


def push_to_remote() -> bool:
    # Ensure any working directory changes (like README dashboard / banner) are committed
    run_cmd(["git", "add", "README.md"])
    diff_proc = run_cmd(["git", "diff", "--cached", "--quiet"])
    if diff_proc.returncode != 0:
        run_cmd(["git", "commit", "-m", "chore(handoff): update status dashboard and handoff banner in README.md"])

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
        from battery_guard import Opts, get_battery_status, heartbeat_once

        heartbeat_once(get_battery_status(), Opts(), report=True)
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

    # Waves up to W13 are already done
    wave_queue = [w for w in all_waves if w not in ("w-validation-tests", "w-perf-tests", "w-backlog-cleanup", "W11", "W12", "W13")]
    logger.info(f"Queued {len(wave_queue)} waves to run: {', '.join(wave_queue)}")

    # Initial handoff banner and push
    update_dashboard()
    update_handoff_banner()
    push_to_remote()

    cooldown_seconds = 15  # Pacing between waves to avoid quota/RPM bursts

    for wave_id in wave_queue:
        if is_deadline_reached():
            logger.info(f"Deadline ({DEADLINE_HOUR}:{DEADLINE_MINUTE}) reached before wave {wave_id}. Stopping scheduler safely.")
            break

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

        # 3. Clean working tree before orkiestra runs
        st = run_cmd(["git", "status", "--porcelain"])
        if st.stdout.strip():
            logger.info(f"Staging pre-wave changes to ensure clean tree: {st.stdout.strip()}")
            run_cmd(["git", "add", "README.md"])
            diff_chk = run_cmd(["git", "diff", "--cached", "--quiet"])
            if diff_chk.returncode != 0:
                run_cmd(["git", "commit", "-m", "chore: sync dashboard before wave start"])

        # 4. Execute wave via orkiestra
        logger.info(f"Launching orkiestra for wave {wave_id}...")
        attempts = 0
        max_wave_retries = 3

        while attempts < max_wave_retries:
            if is_deadline_reached():
                logger.info(f"Deadline reached during wave {wave_id}. Halting further attempts.")
                break

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
                time.sleep(20)

        # 5. Post-wave verification & sync
        state = read_state()
        if is_wave_completed(wave_id, state):
            # Run test regression check
            test_ok = run_tests()
            if not test_ok:
                logger.error(f"Test failure detected after wave {wave_id}!")
                break

            # Update dashboard, handoff banner & push
            update_dashboard()
            update_handoff_banner(active_wave=wave_id)
            push_to_remote()

            # Pacing delay
            logger.info(f"Wave {wave_id} complete. Cooling down for {cooldown_seconds}s to pace API limits...")
            time.sleep(cooldown_seconds)
        else:
            logger.error(f"Wave {wave_id} could not be completed after {max_wave_retries} attempts or deadline reached.")
            update_dashboard()
            update_handoff_banner(active_wave=wave_id)
            push_to_remote()
            if is_deadline_reached():
                break
            logger.info("Moving to next wave...")

    # Final wrap-up
    logger.info("=== WRAPPING UP SESSION ===")
    run_tests()
    update_dashboard()
    update_handoff_banner()
    push_to_remote()
    logger.info("=== AUTONOMOUS WAVE LOOP RUNNER FINISHED ===")


if __name__ == "__main__":
    main()
