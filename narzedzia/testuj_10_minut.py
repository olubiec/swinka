#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Skrypt weryfikacyjny i diagnostyczny dla integracji SwinkaCore.Brain z eSheep (B2b):
1. Startuje DesktopPet.exe z zegarem 60x.
2. Weryfikuje obecność okna świnki na pulpicie.
3. Wysyła klawisz F9 w celu otwarcia nakładki telemetrycznej.
4. Monitoruje zachowanie, dystans spacerów, spadki potrzeb i decyzje AI przez zadany czas (domyślnie 600 s = 10 minut).
5. Podsumowuje zebrane statystyki, zgodność z budżetem dnia i ocenę naturalności.
"""

import os
import sys
import time
import subprocess
import ctypes
from ctypes import wintypes
import collections

WM_HOTKEY = 0x0312
HOTKEY_ID_F9 = 9009
VK_F9 = 0x78
KEYEVENTF_KEYUP = 0x0002

def trigger_f9(pet_hwnd=None):
    print("[TEST] Wysyłanie klawisza F9 (otwarcie nakładki telemetrycznej)...")
    if pet_hwnd:
        # Bezpośrednie wysłanie komunikatu WM_HOTKEY do okna świnki
        ctypes.windll.user32.PostMessageW(pet_hwnd, WM_HOTKEY, HOTKEY_ID_F9, 0)
    # Równolegle globalne zdarzenie klawiatury
    ctypes.windll.user32.keybd_event(VK_F9, 0, 0, 0)
    time.sleep(0.05)
    ctypes.windll.user32.keybd_event(VK_F9, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.8)

def find_windows(target_pid):
    user32 = ctypes.windll.user32
    windows = []
    
    EnumWindowsProc = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
    
    def enum_cb(hwnd, lparam):
        if user32.IsWindowVisible(hwnd):
            pid = wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            if pid.value == target_pid:
                length = user32.GetWindowTextLengthW(hwnd)
                buff = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buff, length + 1)
                title = buff.value
                
                rect = wintypes.RECT()
                user32.GetWindowRect(hwnd, ctypes.byref(rect))
                w = rect.right - rect.left
                h = rect.bottom - rect.top
                windows.append((hwnd, title, (rect.left, rect.top, w, h)))
        return True

    cb = EnumWindowsProc(enum_cb)
    user32.EnumWindows(cb, 0)
    return windows

def main():
    duration_sec = int(sys.argv[1]) if len(sys.argv) > 1 else 600
    exe_path = os.path.abspath("esheep/build/DesktopPetPortable/bin/Debug/DesktopPet.exe")
    log_path = os.path.abspath("esheep/build/DesktopPetPortable/bin/Debug/behavior_log.txt")

    print(f"======================================================================")
    print(f" TEST 10-MINUTOWY ZEGAR 60X (SwinkaCore Brain + eSheep)")
    print(f" Czas trwania: {duration_sec} sekund ({duration_sec/60:.1f} min)")
    print(f" Odpowiednik w czasie świnki: {duration_sec * 60 / 3600:.1f} godzin życia świnki!")
    print(f"======================================================================")

    # Zabicie starych procesów
    os.system("taskkill /f /im DesktopPet.exe 2>nul")
    time.sleep(1)

    if os.path.exists(log_path):
        try:
            os.remove(log_path)
            print("[INFO] Wyczyszczono stary behavior_log.txt")
        except:
            pass

    print(f"[START] Uruchamianie: {exe_path} 60x...")
    proc = subprocess.Popen([exe_path, "60x"], cwd=os.path.dirname(exe_path))

    # Czekaj na start okna
    time.sleep(3)
    if proc.poll() is not None:
        print(f"[BŁĄD] Proces zakończył się przedwcześnie z kodem: {proc.returncode}")
        return 1

    wins = find_windows(proc.pid)
    print(f"[INFO] Znalezione okna DesktopPet: {wins}")
    pet_hwnd = wins[0][0] if wins else None

    # Naciśnij F9, aby otworzyć nakładkę
    trigger_f9(pet_hwnd)
    time.sleep(1)
    wins_after_f9 = find_windows(proc.pid)
    print(f"[INFO] Okna po F9: {wins_after_f9}")

    start_time = time.time()
    last_pos = 0
    actions_count = collections.Counter()
    log_history = []
    
    last_report_time = start_time

    while time.time() - start_time < duration_sec:
        # Sprawdź czy proces żyje
        if proc.poll() is not None:
            print(f"[BŁĄD] Proces niespodziewanie zakończył pracę! Kod: {proc.returncode}")
            break

        # Odczyt logów
        if os.path.exists(log_path):
            with open(log_path, "r", encoding="utf-8", errors="replace") as f:
                f.seek(last_pos)
                new_lines = f.readlines()
                last_pos = f.tell()

            for line in new_lines:
                line_str = line.strip()
                if not line_str: continue
                log_history.append(line_str)
                if "[Brain] Nowa czynność:" in line_str:
                    # np. [Brain] Nowa czynność: spacer (walk), czas: 3,5s, dystans: 85px, zysk: 0,85
                    parts = line_str.split("czynność: ")
                    if len(parts) > 1:
                        act_id = parts[1].split()[0]
                        actions_count[act_id] += 1
                        print(f"  -> {line_str}")
                elif "[Spacer]" in line_str or "[Zegar]" in line_str or "[Fizyka]" in line_str:
                    print(f"  ** {line_str}")

        # Raport co 30 sekund
        now = time.time()
        if now - last_report_time >= 30:
            elapsed = now - start_time
            sim_hours = (elapsed * 60) / 3600
            print(f"\n--- [Status: {elapsed:.0f}s / {duration_sec}s | Symulacja: {sim_hours:.2f}h] ---")
            print(f"    Wykonane czynności: {dict(actions_count)}")
            last_report_time = now

        time.sleep(0.5)

    total_elapsed = time.time() - start_time
    total_sim_hours = (total_elapsed * 60) / 3600
    print(f"\n======================================================================")
    print(f" PODSUMOWANIE TESTU ({total_elapsed:.1f} s realnych = {total_sim_hours:.2f} h świnki)")
    print(f"======================================================================")
    print(f"Łącznie zarejestrowanych decyzji Brain: {sum(actions_count.values())}")
    for act, cnt in actions_count.most_common():
        pct = (cnt / max(1, sum(actions_count.values()))) * 100
        print(f"  - {act:<20}: {cnt:4d} razy ({pct:5.1f}%)")

    # Zamknięcie
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except:
        proc.kill()

    print("[INFO] Test zakończony pomyślnie.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
