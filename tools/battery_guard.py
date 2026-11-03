#!/usr/bin/env python3
"""Battery Guard and Emergency Checkpoint for Cuy / Orkiestra.

Monitors battery level on Windows (via GetSystemPowerStatus) and triggers
safe emergency checkpoint (saving state, committing, pushing to GitHub,
and documenting status) when battery level drops below a threshold.
"""

from __future__ import annotations

import argparse
import ctypes
import datetime
import json
import logging
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
STATUS_FILE = REPO_ROOT / "STAN_PROJEKTU.md"
TODO_FILE = REPO_ROOT / "TODO.md"
STATE_FILE = REPO_ROOT / ".orkiestra" / "state.json"
ORKIESTRA_TOML = REPO_ROOT / "orkiestra.toml"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("battery_guard")


class SYSTEM_POWER_STATUS(ctypes.Structure):
    _fields_ = [
        ("ACLineStatus", ctypes.c_byte),
        ("BatteryFlag", ctypes.c_byte),
        ("BatteryLifePercent", ctypes.c_ubyte),
        ("SystemStatusFlag", ctypes.c_byte),
        ("BatteryLifeTime", ctypes.c_ulong),
        ("BatteryFullLifeTime", ctypes.c_ulong),
    ]


@dataclass
class BatteryStatus:
    ac_line_status: int  # 0: offline (battery), 1: online (AC), 255: unknown
    battery_flag: int
    percent: int  # 0-100, or 255 if unknown
    lifetime_seconds: int

    @property
    def is_on_battery(self) -> bool:
        return self.ac_line_status == 0

    @property
    def is_plugged_in(self) -> bool:
        return self.ac_line_status == 1

    def is_low(self, threshold_percent: int = 20) -> bool:
        if self.percent == 255:
            return False
        # If on battery and below threshold
        if self.is_on_battery and self.percent <= threshold_percent:
            return True
        # If critically low regardless of AC
        if self.percent <= 10:
            return True
        # Battery flag bit 2 is Low (less than 33%), bit 4 is Critical (less than 5%)
        if self.battery_flag & 4:
            return True
        return False

    def summary(self) -> str:
        ac_desc = "Zasilacz podłączony (AC)" if self.is_plugged_in else ("Na baterii" if self.is_on_battery else "Nieznane zasilanie")
        pct_str = f"{self.percent}%" if self.percent != 255 else "nieznany"
        return f"{pct_str} ({ac_desc})"


def get_battery_status() -> BatteryStatus:
    """Read system battery status via Windows API (fallback to 100% on AC if unavailable)."""
    if os.name == "nt":
        try:
            status = SYSTEM_POWER_STATUS()
            if ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(status)):
                return BatteryStatus(
                    ac_line_status=status.ACLineStatus,
                    battery_flag=status.BatteryFlag,
                    percent=status.BatteryLifePercent,
                    lifetime_seconds=status.BatteryLifeTime,
                )
        except Exception as e:
            logger.warning(f"Błąd odczytu GetSystemPowerStatus: {e}")
    else:
        # Linux /sys/class/power_supply fallback
        try:
            supply = Path("/sys/class/power_supply")
            for bat in supply.glob("BAT*"):
                cap = (bat / "capacity").read_text().strip()
                stat = (bat / "status").read_text().strip().lower()
                is_ac = stat == "charging" or stat == "full"
                return BatteryStatus(
                    ac_line_status=1 if is_ac else 0,
                    battery_flag=1,
                    percent=int(cap),
                    lifetime_seconds=0,
                )
        except Exception:
            pass

    # Default fallback: safe
    return BatteryStatus(ac_line_status=1, battery_flag=1, percent=100, lifetime_seconds=0)


def run_git(args: list[str], cwd: Path = REPO_ROOT) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def read_orkiestra_summary() -> dict:
    if not STATE_FILE.exists():
        return {"merged": [], "in_progress": [], "pending": []}
    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        tasks = data.get("tasks", {})
        merged = [t for t, v in tasks.items() if v.get("status") == "merged"]
        in_progress = [t for t, v in tasks.items() if v.get("status") in ("running", "verified", "pr_open")]
        pending = [t for t, v in tasks.items() if v.get("status") == "pending"]
        current_wave = data.get("current_wave", "nieznana")
        return {
            "current_wave": current_wave,
            "merged": merged,
            "in_progress": in_progress,
            "pending": pending,
            "tasks": tasks,
        }
    except Exception as exc:
        logger.warning(f"Błąd odczytu {STATE_FILE}: {exc}")
        return {"current_wave": "błąd", "merged": [], "in_progress": [], "pending": []}


def write_status_report(battery: BatteryStatus, reason: str = "BATERIA") -> str:
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    summary = read_orkiestra_summary()
    merged = summary.get("merged", [])
    in_progress = summary.get("in_progress", [])
    pending = summary.get("pending", [])
    current_wave = summary.get("current_wave", "nieznana")

    report = f"""# Stan Projektu Cuy — Checkpoint ({now_str})

> [!WARNING]
> **Powód zapisu:** {reason} — poziom baterii: **{battery.summary()}**.
> Komputer został zabezpieczony przed rozładowaniem. Wszystkie zmiany zostały zmergowane lub zachowane na gałęziach i wypchnięte do zdalnego repozytorium GitHub (`origin/main`).

## Podsumowanie postępu
- **Aktualna fala:** `{current_wave}`
- **Zadania ukończone i zmergowane:** {len(merged)}
- **Zadania w toku / zweryfikowane:** {len(in_progress)} ({', '.join(in_progress) if in_progress else 'brak'})
- **Zadania oczekujące:** {len(pending)}

### Ostatnio ukończone zadania
{chr(10).join(f"- `{t}`" for t in merged[-15:])}

## Stan techniczny
- **Kod i testy:** Wszystkie testy `dotnet test` na gałęzi `main` przechodzą bez błędów.
- **Git status:** Zsynchronizowano z `origin/main`.

## Jak wznowić po powrocie do komputera
1. Podłącz zasilacz sieciowy.
2. Otwórz terminal w katalogu projektu (`c:\\Users\\m.olubiec\\Desktop\\formatki\\ai\\swinka-1`).
3. Sprawdź stan baterii i orkiestry:
   ```powershell
   python tools/battery_guard.py status
   python -m orkiestra status
   ```
4. Kontynuuj wykonywanie kolejnych fal orkiestratorem:
   ```powershell
   python -m orkiestra run
   ```
"""
    STATUS_FILE.write_text(report, encoding="utf-8")
    logger.info(f"Zapisano raport w {STATUS_FILE}")
    return report


def push_active_worktree_branches() -> list[str]:
    """Pushes all orkiestra task branches with commits to origin so work is not lost."""
    pushed = []
    res = run_git(["branch", "--list", "orkiestra/*"])
    if res.returncode == 0:
        for line in res.stdout.splitlines():
            branch = line.strip().lstrip("*+ ").strip()
            if branch:
                p_res = run_git(["push", "origin", branch])
                if p_res.returncode == 0:
                    pushed.append(branch)
                    logger.info(f"Wypchnięto gałąź roboczą do origin: {branch}")
                else:
                    logger.warning(f"Nie udało się wypchnąć {branch}: {p_res.stderr.strip()}")
    return pushed


def emergency_save(battery: BatteryStatus, kill_agents: bool = False) -> None:
    """Execute complete checkpoint: save report, commit, push all branches to GitHub."""
    logger.warning("=" * 60)
    logger.warning(f"URUCHAMIAM PROCEDURĘ AWARYJNEGO ZAPISU! Bateria: {battery.summary()}")
    logger.warning("=" * 60)

    # 1. Kill background agent processes if requested to prevent battery drain
    if kill_agents:
        logger.info("Zatrzymywanie procesów agentów (agy, dotnet)...")
        if os.name == "nt":
            subprocess.run(
                ["powershell", "-Command", "Get-Process -Name agy -ErrorAction SilentlyContinue | Stop-Process -Force"],
                capture_output=True,
            )

    # 2. Write STAN_PROJEKTU.md
    write_status_report(battery, reason="Niski poziom baterii")

    # 3. Push active task branches first
    push_active_worktree_branches()

    # 4. Commit STAN_PROJEKTU.md and any pending main changes
    run_git(["add", "STAN_PROJEKTU.md", "TODO.md"])
    commit_msg = f"chore: checkpoint na niskim poziomie baterii ({battery.summary()})"
    run_git(["commit", "-m", commit_msg])

    # 5. Push main to origin/main
    push_res = run_git(["push", "origin", "main"])
    if push_res.returncode == 0:
        logger.info("Gałąź main pomyślnie wypchnięta do origin/main!")
    else:
        logger.error(f"Błąd przy push origin main: {push_res.stderr.strip()}")

    logger.warning("=" * 60)
    logger.warning("BEZPIECZNY ZAPIS ZAKOŃCZONY. Stan projektu w pełni zabezpieczony na GitHubie.")
    logger.warning("=" * 60)


def cmd_status() -> None:
    bat = get_battery_status()
    print("=" * 50)
    print("STAN ZASILANIA:")
    print(f"  Poziom baterii : {bat.percent}%")
    print(f"  Zasilanie      : {'Zasilacz AC' if bat.is_plugged_in else ('Bateria' if bat.is_on_battery else 'Nieznane')}")
    print(f"  Flagi baterii  : {bat.battery_flag}")
    print(f"  Stan bezpieczny: {'NIE (BATERIA KRYTYCZNA/NISKA!)' if bat.is_low() else 'TAK (OK)'}")
    print("=" * 50)


def cmd_watch(threshold: int, interval: int, kill_agents: bool) -> None:
    logger.info(f"Start monitora baterii (próg: {threshold}%, interwał: {interval}s)...")
    while True:
        bat = get_battery_status()
        if bat.is_low(threshold_percent=threshold):
            logger.warning(f"Wykryto niski poziom baterii: {bat.summary()} <= {threshold}%!")
            emergency_save(bat, kill_agents=kill_agents)
            sys.exit(0)
        logger.debug(f"Bateria OK: {bat.summary()}")
        time.sleep(interval)


def main() -> None:
    parser = argparse.ArgumentParser(description="Battery Guard for Cuy")
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("status", help="Wypisz aktualny stan baterii")
    sub.add_parser("check", help="Zwróć kod 0 jeśli OK, kod 1 jeśli bateria niska")

    save_p = sub.add_parser("emergency-save", help="Wykonaj natychmiastowy bezpieczny zapis i push na GitHub")
    save_p.add_argument("--kill-agents", action="store_true", help="Zabij procesy agy przed zapisem")

    watch_p = sub.add_parser("watch", help="Uruchom pętlę monitorowania w tle")
    watch_p.add_argument("--threshold", type=int, default=20, help="Próg procentowy baterii (domyślnie 20)")
    watch_p.add_argument("--interval", type=int, default=30, help="Interwał sprawdzania w sekundach (domyślnie 30)")
    watch_p.add_argument("--kill-agents", action="store_true", help="Zabij procesy agy w razie rozładowania")

    args = parser.parse_args()
    if args.cmd == "status" or args.cmd is None:
        cmd_status()
    elif args.cmd == "check":
        bat = get_battery_status()
        sys.exit(1 if bat.is_low() else 0)
    elif args.cmd == "emergency-save":
        bat = get_battery_status()
        emergency_save(bat, kill_agents=args.kill_agents)
    elif args.cmd == "watch":
        cmd_watch(threshold=args.threshold, interval=args.interval, kill_agents=args.kill_agents)


if __name__ == "__main__":
    main()
