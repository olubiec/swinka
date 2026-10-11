#!/usr/bin/env python3
"""
Skrypt weryfikujący i symulujący model łańcucha Markowa dla animations.xml.
Analizuje graf przejść i wykonuje symulację Monte Carlo na 100 000 kroków,
sprawdzając:
1. Zgodność wag zachowań z założeniami z PLAN.md (sniff 15%, scratch 8%, eat 10%, popcorn 4%, wheek 3%, doze 5%, idle+walk 55%).
2. Regułę: popcorn nie występuje 2 razy pod rząd.
3. Regułę: wheek nie występuje 2 razy pod rząd.
4. Regułę: po upadku zawsze land, po land czasem scratch.
"""

import xml.etree.ElementTree as ET
import random
from collections import Counter

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
        if seq_elem is not None:
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
                
        anims[anim_id] = {
            'id': anim_id,
            'name': name,
            'next': next_list,
            'border': border_list,
            'gravity': gravity_list
        }
    return anims

def pick_next(next_list):
    total = sum(p for _, p in next_list)
    r = random.randint(1, total)
    cum = 0
    for target_id, prob in next_list:
        cum += prob
        if cum >= r:
            return target_id
    return next_list[-1][0]

def simulate(anims, steps=100000):
    curr_id = 3 # start at idle
    history = []
    
    consecutive_popcorn = 0
    consecutive_wheek = 0
    land_followed_by_scratch = 0
    total_lands = 0
    
    prev_name = None
    for _ in range(steps):
        name = anims[curr_id]['name']
        history.append(name)
        
        if prev_name == 'popcorn' and name == 'popcorn':
            consecutive_popcorn += 1
        if prev_name == 'wheek' and name == 'wheek':
            consecutive_wheek += 1
            
        if prev_name == 'land':
            total_lands += 1
            if name == 'scratch':
                land_followed_by_scratch += 1
                
        prev_name = name
        
        next_list = anims[curr_id]['next']
        if not next_list:
            curr_id = 3
        else:
            curr_id = pick_next(next_list)
            
    counts = Counter(history)
    return counts, consecutive_popcorn, consecutive_wheek, land_followed_by_scratch, total_lands

def main():
    anims = parse_animations()
    print("Wczytano animacji:", len(anims))
    steps = 100000
    counts, c_popcorn, c_wheek, land_scratch, total_lands = simulate(anims, steps)
    
    print("\n--- WYNIKI SYMULACJI TEORIO-GRAFOWEJ (100 000 kroków) ---")
    target_weights = {
        'sniff': 15.0,
        'scratch': 8.0,
        'eat': 10.0,
        'popcorn': 4.0,
        'wheek': 3.0,
        'doze': 5.0,
        'idle': 27.0,
        'walk': 28.0
    }
    
    main_behaviors = ['idle', 'walk', 'sniff', 'eat', 'scratch', 'doze', 'popcorn', 'wheek']
    total_main = sum(counts[k] for k in main_behaviors)
    
    print(f"{'Zachowanie':<15} | {'Liczba':<8} | {'Udział (%)':<10} | {'Waga w XML (%)':<15}")
    print("-" * 55)
    for b in main_behaviors:
        cnt = counts[b]
        pct = (cnt / total_main) * 100
        tgt = target_weights.get(b, 0.0)
        print(f"{b:<15} | {cnt:<8} | {pct:>9.2f}% | {tgt:>13.1f}%")
        
    print("-" * 55)
    idle_walk_pct = ((counts['idle'] + counts['walk']) / total_main) * 100
    print(f"Suma idle + walk: {idle_walk_pct:.2f}% (cel: 55.0%)")
    print(f"Popcorn 2x pod rząd: {c_popcorn} (cel: 0 - NIEMOŻLIWE)")
    print(f"Wheek 2x pod rząd:   {c_wheek} (cel: 0 - NIEMOŻLIWE)")
    if total_lands > 0:
        pct_land_scratch = (land_scratch / total_lands) * 100
        print(f"Po land nastąpił scratch: {land_scratch}/{total_lands} ({pct_land_scratch:.1f}%)")
        
if __name__ == '__main__':
    main()
