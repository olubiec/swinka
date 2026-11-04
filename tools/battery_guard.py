#!/usr/bin/env python3
"""Battery Guard, status report and emergency checkpoint for Cuy / Orkiestra.

Watches the battery (Windows GetSystemPowerStatus) and the orkiestra state, and
publishes a status report (STATUS.md) to the `orkiestra-status` branch on GitHub.
The report goes out through git plumbing as a single force-pushed commit, so it
never touches the working tree, the index or `main`: no merge races with the
orkiestra and no heartbeat commits in the history.

`watch` looks at the local state every `--interval` seconds (no network), publishes a
full report every `--heartbeat-interval` seconds (default 30 min) and an extra report
at once when something new goes wrong (stalled task, needs_human, quota hit or pause,
session budget exceeded, low battery).
"""

from __future__ import annotations

import argparse
import ctypes
import datetime
import json
import logging
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
STATE_DIR = REPO_ROOT / ".orkiestra"
STATE_FILE = STATE_DIR / "state.json"
LOGS_DIR = STATE_DIR / "logs"
MEMORY_FILE = STATE_DIR / "heartbeat.json"

STATUS_BRANCH = "orkiestra-status"
STATUS_PATH = "STATUS.md"
REMOTE = "origin"

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
        if self.is_on_battery and self.percent <= threshold_percent:
            return True
        if self.percent <= 10:
            return True
        if self.battery_flag & 4:
            return True
        return False

    def summary(self) -> str:
        ac_desc = "Zasilacz AC" if self.is_plugged_in else ("Na baterii" if self.is_on_battery else "Nieznane")
        pct_str = f"{self.percent}%" if self.percent != 255 else "nieznany"
        return f"{pct_str} ({ac_desc})"


def get_battery_status() -> BatteryStatus:
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
        try:
            supply = Path("/sys/class/power_supply")
            for bat in supply.glob("BAT*"):
                cap = (bat / "capacity").read_text().strip()
                stat = (bat / "status").read_text().strip().lower()
                is_ac = stat in ("charging", "full")
                return BatteryStatus(
                    ac_line_status=1 if is_ac else 0,
                    battery_flag=1,
                    percent=int(cap),
                    lifetime_seconds=0,
                )
        except Exception:
            pass

    return BatteryStatus(ac_line_status=1, battery_flag=1, percent=100, lifetime_seconds=0)




# --------------------------------------------------------------------------- git
def run_git(
    args: list[str], cwd: Path = REPO_ROOT, input_text: str | None = None
) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=cwd,
        input=input_text,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def _identity_args() -> list[str]:
    """`commit-tree` needs an identity; fall back to a fixed one when git has none."""
    if run_git(["config", "user.email"]).stdout.strip():
        return []
    return ["-c", "user.name=orkiestra-status", "-c", "user.email=orkiestra-status@localhost"]


def publish_status(markdown: str) -> bool:
    """Force-push `markdown` as the only file of the orphan branch `orkiestra-status`."""
    blob = run_git(["hash-object", "-w", "--stdin"], input_text=markdown)
    if blob.returncode != 0:
        logger.warning(f"hash-object: {blob.stderr.strip()}")
        return False
    tree = run_git(["mktree"], input_text=f"100644 blob {blob.stdout.strip()}\t{STATUS_PATH}\n")
    if tree.returncode != 0:
        logger.warning(f"mktree: {tree.stderr.strip()}")
        return False
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    commit = run_git([*_identity_args(), "commit-tree", tree.stdout.strip(), "-m", f"status {stamp}"])
    if commit.returncode != 0:
        logger.warning(f"commit-tree: {commit.stderr.strip()}")
        return False
    push = run_git(["push", REMOTE, f"+{commit.stdout.strip()}:refs/heads/{STATUS_BRANCH}"])
    if push.returncode != 0:
        logger.warning(f"Push statusu nie powiódł się: {push.stderr.strip()}")
        return False
    return True


# ------------------------------------------------------------------------- state
@dataclass
class Opts:
    stall_minutes: int = 30          # no sign of life from a running task for this long = stalled
    max_sessions_per_hour: int = 0   # 0 = no budget; otherwise warn when agy sessions/hour reach it


QUOTA_LOG_RE = re.compile(
    r"RESOURCE_EXHAUSTED|rate[ _-]?limit|quota[ _-]?(?:exceeded|exhausted)|exhausted your|"
    r"too many requests|(?:http|status|error|code)[ :=]*429",
    re.IGNORECASE,
)
SAMPLE_KEEP_SECONDS = 6 * 3600
EVENTS_KEEP = 200
LOG_SCAN_BYTES = 200_000


def _parse_ts(value: object) -> datetime.datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        dt = datetime.datetime.fromisoformat(value)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=datetime.timezone.utc)


def load_state() -> dict | None:
    if not STATE_FILE.exists():
        return None
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        logger.warning(f"Błąd odczytu {STATE_FILE}: {exc}")
        return None


def load_memory() -> dict:
    try:
        return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_memory(mem: dict) -> None:
    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        tmp = MEMORY_FILE.with_name(MEMORY_FILE.name + ".tmp")
        tmp.write_text(json.dumps(mem, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, MEMORY_FILE)
    except OSError as exc:
        logger.warning(f"Nie można zapisać {MEMORY_FILE}: {exc}")


def _task_logs(task_id: str) -> list[Path]:
    return list(LOGS_DIR.glob(f"{task_id}-a*.log")) if LOGS_DIR.is_dir() else []


def _quota_hits(since_epoch: float) -> tuple[int, int]:
    """(hits since `since_epoch`, hits in all logs): failed agy calls whose log shows a limit error."""
    recent = total = 0
    if not LOGS_DIR.is_dir():
        return 0, 0
    for log in LOGS_DIR.glob("*.log"):
        try:
            mtime = log.stat().st_mtime
            with log.open("rb") as fh:
                text = fh.read(LOG_SCAN_BYTES).decode("utf-8", "replace")
        except OSError:
            continue
        m = re.search(r"^exit code: (-?\d+)", text, re.MULTILINE)
        if not m or m.group(1) == "0" or not QUOTA_LOG_RE.search(text):
            continue
        total += 1
        if mtime >= since_epoch:
            recent += 1
    return recent, total


def _sessions_in(samples: list[list[float]], total: int, now: float, window: int) -> tuple[int, float]:
    """agy sessions started in the last `window` s, and how many seconds of it the samples cover."""
    inside = [s for s in samples if s[0] >= now - window]
    if not inside:
        return 0, 0.0
    return max(0, total - int(inside[0][1])), now - inside[0][0]


def observe(state: dict | None, battery: BatteryStatus, mem: dict, opts: Opts) -> dict:
    """Diff the orkiestra state against the last check; update `mem` (events, samples); return a snapshot."""
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    now = now_dt.timestamp()
    snap: dict = {"now": now, "battery": battery, "alerts": {}, "state": state is not None}

    def alert(key: str, text: str) -> None:
        snap["alerts"][key] = text

    if battery.is_low():
        alert("battery", f"Niska bateria: {battery.summary()}")
    if state is None:
        snap.update(counts={}, total=0, running=[], needs_human=[], wave=None, paused_until=None,
                    sessions_30m=(0, 0.0), sessions_1h=(0, 0.0), retries=0, quota_1h=0, quota_total=0)
        return snap

    tasks: dict = state.get("tasks", {})
    counts: dict[str, int] = {}
    for v in tasks.values():
        counts[v.get("status", "?")] = counts.get(v.get("status", "?"), 0) + 1
    attempts = sum(int(v.get("attempts") or 0) for v in tasks.values())

    # events: only after the first check (otherwise the whole history would be one flood)
    prev: dict = mem.get("statuses", {})
    prev_att: dict = mem.get("attempts", {})
    events: list = mem.setdefault("events", [])
    stamp = now
    if prev:
        for tid, v in tasks.items():
            old, new = prev.get(tid), v.get("status")
            if new != old:
                if new == "merged":
                    events.append([stamp, f"✅ {tid} zmergowane"])
                elif new == "needs_human":
                    err = (v.get("last_error") or "").strip().splitlines()
                    events.append([stamp, f"🛑 {tid} wymaga człowieka" + (f": {err[0][:120]}" if err else "")])
                elif new == "running":
                    events.append([stamp, f"▶️ {tid} wystartowało"])
                elif new == "verified":
                    events.append([stamp, f"🔎 {tid} zweryfikowane, czeka na scalenie"])
                elif new == "pending" and old == "running":
                    events.append([stamp, f"⏳ {tid} wróciło do kolejki (limit lub restart)"])
            elif new == "running" and int(v.get("attempts") or 0) > int(prev_att.get(tid, 0)) and old == "running":
                events.append([stamp, f"🔁 {tid} kolejna próba ({v.get('attempts')})"])
        if state.get("current_wave") != mem.get("wave"):
            events.append([stamp, f"🌊 fala {state.get('current_wave')}"])
        if bool(state.get("quota_paused_until")) != bool(mem.get("paused_until")):
            events.append([stamp, "⏸️ pauza na limit" if state.get("quota_paused_until") else "▶️ koniec pauzy na limit"])
    mem["events"] = events[-EVENTS_KEEP:]
    mem["statuses"] = {t: v.get("status") for t, v in tasks.items()}
    mem["attempts"] = {t: int(v.get("attempts") or 0) for t, v in tasks.items()}
    mem["wave"] = state.get("current_wave")
    mem["paused_until"] = state.get("quota_paused_until")

    # sessions (every attempt = one agy session) and limit hits
    samples = [s for s in mem.get("samples", []) if s[0] >= now - SAMPLE_KEEP_SECONDS]
    samples.append([now, attempts])
    mem["samples"] = samples
    s30 = _sessions_in(samples, attempts, now, 1800)
    s1h = _sessions_in(samples, attempts, now, 3600)
    quota_1h, quota_total = _quota_hits(now - 3600)
    retries = sum(1 for v in tasks.values() if int(v.get("attempts") or 0) > 1)

    # running tasks and stalls
    running = []
    for tid, v in tasks.items():
        if v.get("status") != "running":
            continue
        marks = [t for t in (_parse_ts(v.get("updated_at")),) if t]
        last = max([m.timestamp() for m in marks] + [p.stat().st_mtime for p in _task_logs(tid) if p.exists()] or [now])
        idle_min = (now - last) / 60
        running.append({"id": tid, "attempt": v.get("attempts"), "idle": idle_min})
        if idle_min >= opts.stall_minutes:
            alert(f"stall:{tid}", f"{tid} stoi od {idle_min:.0f} min (próba {v.get('attempts')})")
    needs_human = [(t, (v.get("last_error") or "").strip().splitlines()[:1]) for t, v in tasks.items()
                   if v.get("status") == "needs_human"]
    for tid, err in needs_human:
        alert(f"human:{tid}", f"{tid} wymaga człowieka" + (f": {err[0][:100]}" if err else ""))

    paused_until = _parse_ts(state.get("quota_paused_until"))
    if paused_until and paused_until > now_dt:
        alert("quota-pause", f"Pauza na limit do {paused_until.astimezone().strftime('%H:%M')}")
    if quota_1h:
        alert("quota-hit", f"Limit Antigravity: nieudane wywołania w ostatniej godzinie: {quota_1h}")
    if opts.max_sessions_per_hour and s1h[0] >= opts.max_sessions_per_hour:
        alert("budget", f"Budżet sesji: {s1h[0]} w ostatniej godzinie (próg {opts.max_sessions_per_hour})")

    open_tasks = counts.get("pending", 0) + counts.get("running", 0) + counts.get("verified", 0)
    if open_tasks and not running and not paused_until:
        try:
            idle_state = (now - STATE_FILE.stat().st_mtime) / 60
        except OSError:
            idle_state = 0
        if idle_state >= opts.stall_minutes:
            alert("idle", f"Brak aktywności od {idle_state:.0f} min, a zadania czekają: orkiestra chyba nie działa")

    snap.update(counts=counts, total=len(tasks), running=running, needs_human=needs_human,
                wave=state.get("current_wave"), paused_until=paused_until, sessions_30m=s30,
                sessions_1h=s1h, retries=retries, quota_1h=quota_1h, quota_total=quota_total)
    return snap


# ------------------------------------------------------------------------ report
def _hhmm(epoch: float) -> str:
    return datetime.datetime.fromtimestamp(epoch).strftime("%H:%M")


def _sessions_text(sessions: tuple[int, float], window_min: int) -> str:
    n, span = sessions
    note = "" if span >= window_min * 60 * 0.9 else f" (liczone od {span / 60:.0f} min)"
    return f"**{n}**{note}"


def render_report(snap: dict, mem: dict, opts: Opts, last_report: float | None) -> str:
    bat: BatteryStatus = snap["battery"]
    counts = snap["counts"]
    total = snap["total"]
    merged = counts.get("merged", 0)
    alerts = snap["alerts"]
    if not snap["state"]:
        verdict = "⚪ Orkiestra jeszcze nie startowała (brak `.orkiestra/state.json`)"
    elif total and merged == total:
        verdict = "✅ Wszystkie zadania zrobione"
    elif any(k.startswith(("battery", "stall", "human", "idle", "stopped")) for k in alerts):
        verdict = "🔴 Wymaga uwagi"
    elif alerts or bat.is_on_battery:
        verdict = "🟡 Działa, ale uważaj"
    else:
        verdict = "🟢 Działa"

    now_s = datetime.datetime.fromtimestamp(snap["now"]).strftime("%Y-%m-%d %H:%M")
    lines = [f"# Status orkiestry — {now_s}", "", f"**{verdict}**", ""]
    if alerts:
        lines += ["## ⚠️ Alerty", *[f"- {t}" for t in alerts.values()], ""]

    pct = round(merged / total * 100, 1) if total else 0.0
    wave = snap["wave"] or "—"
    run_txt = ", ".join(f"{r['id']} (próba {r['attempt']}, cisza {r['idle']:.0f} min)" for r in snap["running"]) or "nic"
    bat_txt = f"{bat.percent}% ({'zasilacz' if bat.is_plugged_in else 'na baterii'})" if bat.percent != 255 else "brak danych"
    lines += [
        "## Stan",
        "| | |",
        "| :-- | :-- |",
        f"| Fala | **{wave}** |",
        f"| Zadania | **{merged} / {total}** zmergowane ({pct}%) |",
        f"| W toku | {run_txt} |",
        f"| Czekają / zweryfikowane | {counts.get('pending', 0)} / {counts.get('verified', 0)} |",
        f"| Wymagają człowieka | {counts.get('needs_human', 0)} |",
        f"| Bateria | {bat_txt} |",
        "",
        "## Zużycie limitu (szacunek)",
        "Antigravity nie udostępnia stanu limitu. Liczę sesje `agy`, które uruchomiła orkiestra (jedna próba zadania = jedna sesja).",
        "",
        "| | |",
        "| :-- | :-- |",
        f"| Sesje, ostatnie 30 min | {_sessions_text(snap['sessions_30m'], 30)} |",
        f"| Sesje, ostatnia godzina | {_sessions_text(snap['sessions_1h'], 60)}"
        + (f" z progu {opts.max_sessions_per_hour}" if opts.max_sessions_per_hour else "") + " |",
        f"| Zadania z ponowną próbą | {snap['retries']} |",
        f"| Wywołania zatrzymane przez limit | {snap['quota_1h']} w ostatniej godzinie, {snap['quota_total']} łącznie w logach |",
        f"| Pauza na limit | {('do ' + snap['paused_until'].astimezone().strftime('%H:%M')) if snap['paused_until'] and snap['paused_until'].timestamp() > snap['now'] else 'nie'} |",
        "",
    ]
    since = last_report or 0.0
    changes = [e for e in mem.get("events", []) if e[0] > since]
    title = f"Co się zmieniło od {_hhmm(since)}" if since else "Co się zmieniło"
    lines += [f"## {title}", *([f"- `{_hhmm(t)}` {txt}" for t, txt in changes[-25:]] or ["- nic"]), ""]
    if snap["needs_human"]:
        lines += ["## Wymagają człowieka",
                  *[f"- **{t}**" + (f": {e[0][:200]}" if e else "") for t, e in snap["needs_human"]],
                  "", "Log zadania: `.orkiestra/logs/<zadanie>-a<próba>.log`, worktree: `../.orkiestra-worktrees/`.", ""]
    lines.append(f"_Raport co ~30 min i od razu przy nowym alercie. Gałąź `{STATUS_BRANCH}` ma zawsze jeden commit._")
    return "\n".join(lines) + "\n"


def emergency_save(battery: BatteryStatus, kill_agents: bool = False) -> None:
    logger.warning("=" * 60)
    logger.warning(f"URUCHAMIAM PROCEDURĘ AWARYJNEGO ZAPISU! Bateria: {battery.summary()}")
    logger.warning("=" * 60)

    if kill_agents:
        logger.info("Zatrzymywanie procesów agentów (agy)...")
        if os.name == "nt":
            subprocess.run(
                ["powershell", "-Command", "Get-Process -Name agy -ErrorAction SilentlyContinue | Stop-Process -Force"],
                capture_output=True,
            )

    heartbeat_once(battery, Opts(), report=True, stopped=f"zatrzymano: niska bateria ({battery.summary()})")
    pushed = push_active_worktree_branches()
    push_res = run_git(["push", REMOTE, "main"])
    if push_res.returncode == 0:
        logger.info("Gałąź main wypchnięta do origin/main.")
    else:
        logger.error(f"Błąd przy push origin main: {push_res.stderr.strip()}")
    logger.warning(f"BEZPIECZNY ZAPIS ZAKOŃCZONY (gałęzie robocze: {len(pushed)}).")


def push_active_worktree_branches() -> list[str]:
    pushed = []
    res = run_git(["branch", "--list", "orkiestra/*"])
    if res.returncode == 0:
        for line in res.stdout.splitlines():
            branch = line.strip().lstrip("*+ ").strip()
            if branch:
                p_res = run_git(["push", REMOTE, branch])
                if p_res.returncode == 0:
                    pushed.append(branch)
                    logger.info(f"Wypchnięto gałąź roboczą do origin: {branch}")
                else:
                    logger.warning(f"Nie udało się wypchnąć {branch}: {p_res.stderr.strip()}")
    return pushed


def heartbeat_once(
    battery: BatteryStatus, opts: Opts, report: bool = True, stopped: str = ""
) -> dict:
    """Observe, build the report and publish it. `report=False` is an alert-only publish."""
    mem = load_memory()
    snap = observe(load_state(), battery, mem, opts)
    if stopped:
        snap["alerts"]["stopped"] = f"Monitor {stopped}"
    text = render_report(snap, mem, opts, mem.get("last_report"))
    if publish_status(text):
        mem["last_publish"] = snap["now"]
        mem["published_alerts"] = list(snap["alerts"])
        if report:
            mem["last_report"] = snap["now"]
        logger.info(f"Status opublikowany ({'raport' if report else 'alert'}): {battery.summary()}")
    save_memory(mem)
    return snap


def cmd_status(opts: Opts) -> None:
    bat = get_battery_status()
    mem = load_memory()
    snap = observe(load_state(), bat, mem, opts)
    save_memory(mem)
    print(render_report(snap, mem, opts, mem.get("last_report")))


def cmd_watch(
    threshold: int, interval: int, heartbeat_interval: int, min_alert_gap: int, kill_agents: bool, opts: Opts
) -> None:
    logger.info(
        f"Monitor: próg baterii {threshold}%, sprawdzanie co {interval}s, raport co {heartbeat_interval}s, "
        f"alert natychmiast (min. {min_alert_gap}s odstępu), stall po {opts.stall_minutes} min"
    )
    mem = load_memory()
    last_report = float(mem.get("last_report") or 0)
    last_publish = float(mem.get("last_publish") or 0)
    retry_at = 0.0

    while True:
        bat = get_battery_status()
        now = time.time()

        if bat.is_low(threshold_percent=threshold):
            logger.warning(f"Wykryto niski poziom baterii: {bat.summary()} <= {threshold}%!")
            emergency_save(bat, kill_agents=kill_agents)
            sys.exit(0)

        snap = observe(load_state(), bat, mem, opts)
        published = set(mem.get("published_alerts", [])) & set(snap["alerts"])
        mem["published_alerts"] = sorted(published)
        new_alerts = set(snap["alerts"]) - published
        due = now - last_report >= heartbeat_interval
        urgent = bool(new_alerts) and now - last_publish >= min_alert_gap

        if (due or urgent) and now >= retry_at:
            text = render_report(snap, mem, opts, mem.get("last_report"))
            if publish_status(text):
                last_publish = now
                mem["published_alerts"] = sorted(snap["alerts"])
                if due:
                    last_report = now
                    mem["last_report"] = now
                mem["last_publish"] = now
                logger.info(f"Status opublikowany ({'raport' if due else 'alert: ' + ', '.join(sorted(new_alerts))})")
            else:
                retry_at = now + 120
        save_memory(mem)
        time.sleep(interval)


def main() -> None:
    parser = argparse.ArgumentParser(description="Battery guard and status report for Cuy / orkiestra")
    sub = parser.add_subparsers(dest="cmd")

    def add_opts(p: argparse.ArgumentParser) -> None:
        p.add_argument("--stall-minutes", type=int, default=30, help="Po ilu minutach ciszy zadanie uznać za stojące (domyślnie 30)")
        p.add_argument("--max-sessions-per-hour", type=int, default=0, help="Próg ostrzeżenia: sesji agy na godzinę (0 = wyłączone)")

    add_opts(sub.add_parser("status", help="Wypisz raport lokalnie (nic nie wysyła)"))
    sub.add_parser("check", help="Kod 0 jeśli OK, kod 1 jeśli bateria niska")
    add_opts(sub.add_parser("publish", help="Opublikuj raport teraz na gałąź orkiestra-status"))

    save_p = sub.add_parser("emergency-save", help="Natychmiastowy bezpieczny zapis i push na GitHub")
    save_p.add_argument("--kill-agents", action="store_true", help="Zabij procesy agy przed zapisem")

    watch_p = sub.add_parser("watch", help="Pętla: bateria, alerty, raport co 30 min")
    add_opts(watch_p)
    watch_p.add_argument("--threshold", type=int, default=20, help="Próg baterii w procentach (domyślnie 20)")
    watch_p.add_argument("--interval", type=int, default=60, help="Sprawdzanie stanu lokalnie, w sekundach (domyślnie 60)")
    watch_p.add_argument("--heartbeat-interval", type=int, default=1800, help="Pełny raport na GitHub, w sekundach (domyślnie 1800 = 30 min)")
    watch_p.add_argument("--min-alert-gap", type=int, default=300, help="Minimalny odstęp między raportami alarmowymi, w sekundach (domyślnie 300)")
    watch_p.add_argument("--kill-agents", action="store_true", help="Zabij procesy agy w razie rozładowania")

    args = parser.parse_args()
    opts = Opts(getattr(args, "stall_minutes", 30), getattr(args, "max_sessions_per_hour", 0))
    if args.cmd == "status" or args.cmd is None:
        cmd_status(opts)
    elif args.cmd == "check":
        sys.exit(1 if get_battery_status().is_low() else 0)
    elif args.cmd == "publish":
        heartbeat_once(get_battery_status(), opts, report=True)
    elif args.cmd == "emergency-save":
        emergency_save(get_battery_status(), kill_agents=args.kill_agents)
    elif args.cmd == "watch":
        cmd_watch(args.threshold, args.interval, args.heartbeat_interval, args.min_alert_gap, args.kill_agents, opts)


if __name__ == "__main__":
    main()
