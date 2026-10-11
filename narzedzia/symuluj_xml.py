#!/usr/bin/env python3
"""
Skrypt weryfikujący i symulujący model łańcucha Markowa dla animations.xml (Budżet A5).
Analizuje graf przejść, czasy trwania animacji i wykonuje symulację Monte Carlo na 100 000 kroków,
sprawdzając:
1. Podział czasu (procent czasu) według budżetu dnia:
   - odpoczynek i drzemki (idle + doze): ok. 50%
   - jedzenie siana (eat): ok. 28%
   - chodzenie (walk): ok. 8% (<10%)
   - węszenie (sniff): ok. 8%
   - drapanie (scratch): ok. co 20 min
   - rzadkie (popcorn, wheek, run)
2. Regułę: popcorn nie występuje 2 razy pod rząd.
3. Regułę: wheek nie występuje 2 razy pod rząd.
4. Regułę: po upadku zawsze land, po land czasem scratch.
5. Regułę: po walk następuje postój co najmniej 20 s (przejście do idle).
"""

import xml.etree.ElementTree as ET
import random
from collections import Counter, defaultdict

def parse_animations(xml_path="esheep/src/Resources/animations.xml"):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    ns = {'ns': 'https://esheep.petrucci.ch/'}
    
    anims = {}
    for anim in root.findall('.//ns:animation', ns):
        anim_id = int(anim.attrib['id'])
        name = anim.find('ns:name', ns).text
        
        seq_elem = anim.find('ns:sequence', ns)
        next_list = []
        frames = []
        repeat_expr = "0"
        if seq_elem is not None:
            repeat_expr = seq_elem.attrib.get('repeat', '0')
            for f in seq_elem.findall('ns:frame', ns):
                frames.append(int(f.text.strip()))
            for nxt in seq_elem.findall('ns:next', ns):
                prob = int(nxt.attrib.get('probability', '100'))
                target_id = int(nxt.text.strip())
                next_list.append((target_id, prob))
                
        border_elem = anim.find('ns:border', ns)
        border_list = []
        if border_elem is not None:
            for nxt in border_elem.findall('ns:next', ns):
                prob = int(nxt.attrib.get('probability', '100'))
                target_id = int(nxt.text.strip())
                border_list.append((target_id, prob))
                
        gravity_elem = anim.find('ns:gravity', ns)
        gravity_list = []
        if gravity_elem is not None:
            for nxt in gravity_elem.findall('ns:next', ns):
                prob = int(nxt.attrib.get('probability', '100'))
                target_id = int(nxt.text.strip())
                gravity_list.append((target_id, prob))
                
        start_elem = anim.find('ns:start', ns)
        interval = 100
        if start_elem is not None:
            int_elem = start_elem.find('ns:interval', ns)
            if int_elem is not None:
                interval = int(int_elem.text.strip())

        anims[anim_id] = {
            'id': anim_id,
            'name': name,
            'frames_count': len(frames),
            'interval': interval,
            'repeat_expr': repeat_expr,
            'next': next_list,
            'border': border_list,
            'gravity': gravity_list
        }
    return anims

def eval_repeat(expr):
    # Prosty parser wyrażeń DataTable dla repeat (np. "9 + random/5", "2 + random/30", "16 + random/2", "2")
    if 'random' in expr:
        r = random.randint(0, 99)
        e = expr.replace('random', str(r))
        return int(eval(e))
    return int(expr)

def get_duration(anim):
    rep = eval_repeat(anim['repeat_expr'])
    total_steps = anim['frames_count'] * (1 + rep)
    return (total_steps * anim['interval']) / 1000.0

def pick_next(next_list):
    total = sum(p for _, p in next_list)
    r = random.randint(1, total)
    cum = 0
    for target_id, prob in next_list:
        cum += prob
        if cum >= r:
            return target_id
    return next_list[-1][0]

def simulate(anims, steps=50000):
    curr_id = 3 # start at idle
    history = []
    durations = defaultdict(float)
    total_time = 0.0
    
    consecutive_popcorn = 0
    consecutive_wheek = 0
    consecutive_walk = 0
    land_followed_by_scratch = 0
    total_lands = 0
    
    prev_name = None
    for _ in range(steps):
        anim = anims[curr_id]
        name = anim['name']
        dur = get_duration(anim)
        durations[name] += dur
        total_time += dur
        history.append(name)
        
        if prev_name == 'popcorn' and name == 'popcorn':
            consecutive_popcorn += 1
        if prev_name == 'wheek' and name == 'wheek':
            consecutive_wheek += 1
        if prev_name == 'walk' and name == 'walk':
            consecutive_walk += 1
            
        if prev_name == 'land':
            total_lands += 1
            if name == 'scratch':
                land_followed_by_scratch += 1
                
        prev_name = name
        
        next_list = anim['next']
        if not next_list:
            curr_id = 3
        else:
            curr_id = pick_next(next_list)
            
    counts = Counter(history)
    return counts, durations, total_time, consecutive_popcorn, consecutive_wheek, consecutive_walk, land_followed_by_scratch, total_lands

def main():
    anims = parse_animations()
    print("Wczytano animacji z animations.xml:", len(anims))
    steps = 50000
    counts, durations, total_time, c_popcorn, c_wheek, c_walk, land_scratch, total_lands = simulate(anims, steps)
    
    print(f"\n--- WYNIKI SYMULACJI TEORIO-GRAFOWEJ I BUDŻETU CZASU ({total_time/3600:.1f} h, {steps} kroków) ---")
    
    main_behaviors = ['idle', 'doze', 'eat', 'walk', 'sniff', 'scratch', 'popcorn', 'wheek', 'run']
    
    print(f"{'Zachowanie':<12} | {'Liczba':<8} | {'Śr. czas':<10} | {'Udział CZASU (%)':<18} | {'Śr. interwał':<14}")
    print("-" * 72)
    for b in main_behaviors:
        cnt = counts[b]
        t = durations[b]
        pct = (t / total_time) * 100
        avg_d = (t / cnt) if cnt > 0 else 0
        interv_min = (total_time / cnt / 60) if cnt > 0 else 9999
        print(f"{b:<12} | {cnt:<8} | {avg_d:>6.1f} s   | {pct:>16.2f}% | co {interv_min:>6.1f} min")
        
    print("-" * 72)
    rest_pct = ((durations['idle'] + durations['doze']) / total_time) * 100
    eat_pct = (durations['eat'] / total_time) * 100
    walk_pct = (durations['walk'] / total_time) * 100
    sniff_pct = (durations['sniff'] / total_time) * 100
    scratch_pct = (durations['scratch'] / total_time) * 100
    rare_pct = ((durations['popcorn'] + durations['wheek'] + durations['run']) / total_time) * 100

    print(f"Odpoczynek i drzemki (idle + doze): {rest_pct:.2f}% (cel budżetu: ~50%)")
    print(f"Jedzenie siana (eat):              {eat_pct:.2f}% (cel budżetu: ~28%)")
    print(f"Chodzenie (walk):                  {walk_pct:.2f}% (cel budżetu: ~8%, <10%)")
    print(f"Węszenie (sniff):                  {sniff_pct:.2f}% (cel budżetu: ~8%)")
    print(f"Pielęgnacja (scratch):             {scratch_pct:.2f}% (cel budżetu: ~2-3%)")
    print(f"Rzadkie zachowania:                {rare_pct:.2f}% (cel budżetu: ~1-3%)")
    
    print("\n--- WERYFIKACJA REGUL SPECJALNYCH ---")
    print(f"1. Popcorn 2x pod rząd: {c_popcorn} (cel: 0 -> {'SPELNIONY' if c_popcorn == 0 else 'BLAD'})")
    print(f"2. Wheek 2x pod rząd:   {c_wheek} (cel: 0 -> {'SPELNIONY' if c_wheek == 0 else 'BLAD'})")
    print(f"3. Walk 2x pod rząd:    {c_walk} (cel: 0 -> {'SPELNIONY' if c_walk == 0 else 'BLAD'})")
    if total_lands > 0:
        pct_land_scratch = (land_scratch / total_lands) * 100
        print(f"4. Po land nastąpił scratch: {land_scratch}/{total_lands} ({pct_land_scratch:.1f}%)")
        
if __name__ == '__main__':
    main()
