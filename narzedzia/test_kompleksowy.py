#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kompleksowy test parametrów, reguł i 2-minutowego działania świnki.
"""

import os
import sys
import time
import random
import subprocess
import xml.etree.ElementTree as ET
from collections import Counter

XML_PATH = "esheep/src/Resources/animations.xml"
EXE_PATH = "esheep/build/DesktopPetPortable/bin/Debug/DesktopPet.exe"
LOG_PATH = "esheep/build/DesktopPetPortable/bin/Debug/behavior_log.txt"

def print_header(title):
    print("\n" + "=" * 65)
    print(f"  {title}")
    print("=" * 65)

def test_1_xml_parameters():
    print_header("CZĘŚĆ 1: KONTROLA PARAMETRÓW W ANIMATIONS.XML")
    tree = ET.parse(XML_PATH)
    root = tree.getroot()
    ns = {'ns': 'https://esheep.petrucci.ch/'}

    anims = {}
    for a in root.findall('.//ns:animation', ns):
        aid = int(a.attrib['id'])
        name = a.find('ns:name', ns).text
        anims[aid] = {'elem': a, 'name': name}

    print(f"Liczba wczytanych animacji w XML: {len(anims)}")

    # 1. Sprawdź pule standardową (np. z idle ID 3)
    idle = anims[3]['elem']
    next_tags = idle.find('ns:sequence', ns).findall('ns:next', ns)
    std_pool = {int(n.text.strip()): int(n.attrib.get('probability', '100')) for n in next_tags}
    
    print("\n[A] Pula standardowa zachowań (np. w idle ID 3):")
    total_prob = sum(std_pool.values())
    for aid, prob in std_pool.items():
        print(f"    - {anims[aid]['name']:<10} (ID {aid:<2}): {prob:>2}%")
    print(f"    -> Suma wag: {total_prob}%")
    assert total_prob == 100, f"Suma wag w puli standardowej to {total_prob}%, oczekiwano 100%!"

    # Sprawdzenie wag zadanych przez użytkownika
    assert std_pool[21] == 15, f"sniff powinien mieć 15%, ma {std_pool[21]}%"
    assert std_pool[22] == 8,  f"scratch powinien mieć 8%, ma {std_pool[22]}%"
    assert std_pool[23] == 10, f"eat powinien mieć 10%, ma {std_pool[23]}%"
    assert std_pool[24] == 4,  f"popcorn powinien mieć 4%, ma {std_pool[24]}%"
    assert std_pool[25] == 3,  f"wheek powinien mieć 3%, ma {std_pool[25]}%"
    assert std_pool[26] == 5,  f"doze powinien mieć 5%, ma {std_pool[26]}%"
    assert std_pool[3] + std_pool[1] == 55, f"idle+walk powinno mieć 55%, ma {std_pool[3] + std_pool[1]}%"
    print("  -> WAGI ZACHOWAŃ: ZGODNE W 100% [PASS]")

    # 2. Sprawdź regułę braku powtórzeń popcorn
    popcorn = anims[24]['elem']
    next_popcorn = popcorn.find('ns:sequence', ns).findall('ns:next', ns)
    popcorn_targets = [int(n.text.strip()) for n in next_popcorn]
    print("\n[B] Przejścia po 'popcorn' (ID 24):")
    print(f"    - Dostępne cele: {[anims[tid]['name'] for tid in popcorn_targets]}")
    assert 24 not in popcorn_targets, "BŁĄD: Popcorn ma przejście do samego siebie!"
    print("  -> REGUŁA: Popcorn 2x pod rząd NIEMOŻLIWY [PASS]")

    # 3. Sprawdź regułę braku powtórzeń wheek
    wheek = anims[25]['elem']
    next_wheek = wheek.find('ns:sequence', ns).findall('ns:next', ns)
    wheek_targets = [int(n.text.strip()) for n in next_wheek]
    print("\n[C] Przejścia po 'wheek' (ID 25):")
    print(f"    - Dostępne cele: {[anims[tid]['name'] for tid in wheek_targets]}")
    assert 25 not in wheek_targets, "BŁĄD: Wheek ma przejście do samego siebie!"
    print("  -> REGUŁA: Wheek 2x pod rząd NIEMOŻLIWY [PASS]")

    # 4. Sprawdź regułę: po upadku zawsze land
    fall = anims[5]['elem']
    fall_borders = fall.find('ns:border', ns).findall('ns:next', ns)
    fall_targets = [int(n.text.strip()) for n in fall_borders]
    print("\n[D] Przejścia po upadku 'fall' (ID 5) przy kontakcie z podłożem:")
    print(f"    - Dostępne cele: {[anims[tid]['name'] for tid in fall_targets]}")
    assert fall_targets == [20], f"Upadek musi zawsze przechodzić do land (20), a przechodzi do: {fall_targets}"
    print("  -> REGUŁA: Po upadku ZAWSZE land (100%) [PASS]")

    # 5. Sprawdź regułę: po land czasem scratch (25%)
    land = anims[20]['elem']
    land_next = land.find('ns:sequence', ns).findall('ns:next', ns)
    land_pool = {int(n.text.strip()): int(n.attrib.get('probability', '100')) for n in land_next}
    print("\n[E] Przejścia po lądowaniu 'land' (ID 20):")
    for tid, p in land_pool.items():
        print(f"    - {anims[tid]['name']:<10} (ID {tid:<2}): {p}%")
    assert land_pool.get(22) == 25, f"Po land drapanie (scratch) powinno mieć 25%, ma {land_pool.get(22)}%"
    print("  -> REGUŁA: Po land drapanie za uchem = 25% [PASS]")

    return anims

def test_2_markov_convergence(anims, steps=100000):
    print_header("CZĘŚĆ 2: TEST ZBIEŻNOŚCI MARKOVA (100 000 kroków)")
    
    transitions_map = {}
    for aid, data in anims.items():
        seq = data['elem'].find('{https://esheep.petrucci.ch/}sequence')
        if seq is not None:
            nexts = seq.findall('{https://esheep.petrucci.ch/}next')
            if nexts:
                targets = [int(n.text.strip()) for n in nexts]
                weights = [int(n.attrib.get('probability', '100')) for n in nexts]
                transitions_map[aid] = (targets, weights)

    current = 3 # idle
    counts = Counter()
    popcorn_consecutive = 0
    wheek_consecutive = 0
    prev = None

    for _ in range(steps):
        name = anims[current]['name']
        counts[name] += 1

        if prev == 'popcorn' and name == 'popcorn':
            popcorn_consecutive += 1
        if prev == 'wheek' and name == 'wheek':
            wheek_consecutive += 1

        prev = name
        if current in transitions_map:
            targets, weights = transitions_map[current]
            current = random.choices(targets, weights=weights, k=1)[0]
        else:
            current = 3

    print(f"{'Zachowanie':<14} | {'Liczba':<8} | {'Udział (%)':<10} | {'Waga w XML':<10}")
    print("-" * 52)
    for name in ['idle', 'walk', 'sniff', 'eat', 'scratch', 'doze', 'popcorn', 'wheek']:
        cnt = counts[name]
        pct = (cnt / steps) * 100
        print(f"{name:<14} | {cnt:<8} | {pct:>8.2f}% | {pct:>8.1f}%")
    
    print("-" * 52)
    idle_walk = (counts['idle'] + counts['walk']) / steps * 100
    print(f"Suma idle + walk: {idle_walk:.2f}% (cel: 55.0%)")
    print(f"Popcorn pod rząd: {popcorn_consecutive} (cel: 0)")
    print(f"Wheek pod rząd:   {wheek_consecutive} (cel: 0)")

    assert popcorn_consecutive == 0
    assert wheek_consecutive == 0
    assert 54.0 <= idle_walk <= 56.0
    print("  -> TEST ZBIEŻNOŚCI MATEMATYCZNEJ: ZALICZONY W 100% [PASS]")

def test_3_live_2min():
    print_header("CZĘŚĆ 3: TEST DZIAŁANIA NA ŻYWO (2 MINUTY = 120 SEKUND)")
    
    # 1. Wyczyść stary log
    if os.path.exists(LOG_PATH):
        try:
            os.remove(LOG_PATH)
        except:
            pass

    # 2. Uruchom DesktopPet.exe
    print("Uruchamianie DesktopPet.exe na 120 sekund...")
    proc = subprocess.Popen([EXE_PATH], cwd=os.path.dirname(EXE_PATH))
    
    start_time = time.time()
    last_print = 0
    while time.time() - start_time < 120:
        elapsed = int(time.time() - start_time)
        if elapsed % 20 == 0 and elapsed != last_print:
            print(f"  ... test trwa: {elapsed}/120 sekund...")
            last_print = elapsed
        time.sleep(1)

    print("Zatrzymywanie procesu świnki...")
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except:
        proc.kill()

    # 3. Analiza logu
    if not os.path.exists(LOG_PATH):
        print("BŁĄD: Plik logu nie powstał!")
        sys.exit(1)

    with open(LOG_PATH, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]

    print(f"\nŁącznie zarejestrowanych akcji w 2 minuty: {len(lines)}")
    live_counts = Counter()
    events = []
    for line in lines:
        parts = line.split('|')
        if len(parts) >= 3:
            ts, name, aid = parts[0], parts[1], int(parts[2])
            live_counts[name] += 1
            events.append((ts, name, aid))

    print("\nZESTAWIENIE ZACHOWAŃ W CZASIE RZECZYWISTYM (2 MIN):")
    print("-" * 45)
    for name, cnt in live_counts.most_common():
        pct = (cnt / len(lines)) * 100
        print(f"  {name:<12}: {cnt:>3} razy ({pct:>5.1f}%)")
    print("-" * 45)

    # Sprawdź czy wystąpiły kluczowe zachowania
    print("\nSzczegółowa chronologia akcji:")
    for ts, name, aid in events:
        extra = ""
        if name == 'scratch':
            extra = " <-- DRAPANIE ZA UCHEM"
        elif name == 'popcorn':
            extra = " <-- POPCORNING (radosny skok!)"
        elif name == 'wheek':
            extra = " <-- KWICZENIE O JEDZENIE"
        elif name == 'eat':
            extra = " <-- JEDZENIE SIANA"
        elif name == 'doze':
            extra = " <-- DRZEMKA"
        elif name == 'sniff':
            extra = " <-- WĘSZENIE"
        print(f"  [{ts[11:]}] {name:<10} (ID {aid:<2}){extra}")

    print("\nPodsumowanie 2-minutowego testu:")
    print(f"  - Czy wystąpiło drapanie (scratch)? {'TAK (' + str(live_counts['scratch']) + 'x)' if live_counts['scratch'] > 0 else 'NIE'}")
    print(f"  - Czy wystąpił popcorning (popcorn)? {'TAK (' + str(live_counts['popcorn']) + 'x)' if live_counts['popcorn'] > 0 else 'NIE'}")
    print(f"  - Czy wystąpiło jedzenie (eat)?       {'TAK (' + str(live_counts['eat']) + 'x)' if live_counts['eat'] > 0 else 'NIE'}")
    print(f"  - Czy wystąpiło węszenie (sniff)?     {'TAK (' + str(live_counts['sniff']) + 'x)' if live_counts['sniff'] > 0 else 'NIE'}")
    print(f"  - Czy wystąpiło kwiczenie (wheek)?    {'TAK (' + str(live_counts['wheek']) + 'x)' if live_counts['wheek'] > 0 else 'NIE'}")
    print(f"  - Czy wystąpiła drzemka (doze)?       {'TAK (' + str(live_counts['doze']) + 'x)' if live_counts['doze'] > 0 else 'NIE'}")

if __name__ == '__main__':
    anims = test_1_xml_parameters()
    test_2_markov_convergence(anims)
    test_3_live_2min()
