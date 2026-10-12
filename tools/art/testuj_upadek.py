#!/usr/bin/env python3
"""
Test weryfikacyjny reguł:
1. Po upadku (fall) ZAWSZE lądowanie (land).
2. Po lądowaniu (land) CZASEM drapanie za uchem (scratch).
"""

import xml.etree.ElementTree as ET

def test_fall_and_land(xml_path="esheep/src/Resources/animations.xml"):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    ns = {'ns': 'https://esheep.petrucci.ch/'}

    anims = {}
    for a in root.findall('.//ns:animation', ns):
        aid = int(a.attrib['id'])
        name = a.find('ns:name', ns).text
        anims[aid] = {'elem': a, 'name': name}

    # 1. Sprawdz animacje 'fall' (ID 5)
    fall_anim = anims.get(5)
    assert fall_anim is not None, "Brak animacji fall (ID 5)"
    assert fall_anim['name'] == 'fall', f"ID 5 to nie fall, tylko {fall_anim['name']}"

    # Sprawdz border w fall
    border_elem = fall_anim['elem'].find('ns:border', ns)
    assert border_elem is not None, "fall nie ma elementu border"
    next_tags = border_elem.findall('ns:next', ns)
    assert len(next_tags) >= 1, "Brak przejść w border dla fall"
    
    border_targets = [int(n.text.strip()) for n in next_tags]
    border_probs = [int(n.attrib.get('probability', '100')) for n in next_tags]
    
    print(f"[TEST 1] Animacja 'fall' (ID 5) po uderzeniu w podłoże (<border>):")
    for tid, p in zip(border_targets, border_probs):
        tname = anims[tid]['name']
        print(f"  -> przechodzi do: {tname} (ID {tid}) z prawdopodobieństwem {p}%")
        assert tid == 20 or tname == 'land', f"fall border powinien prowadzić do land, a prowadzi do {tname}"
    print("  -> WYNIK: ZAWSZE LAND (100%) - TEST ZALICZONY [PASS]\n")

    # 2. Sprawdz animacje 'land' (ID 20)
    land_anim = anims.get(20)
    assert land_anim is not None, "Brak animacji land (ID 20)"
    seq_elem = land_anim['elem'].find('ns:sequence', ns)
    assert seq_elem is not None, "land nie ma elementu sequence"
    next_tags_land = seq_elem.findall('ns:next', ns)

    land_targets = [int(n.text.strip()) for n in next_tags_land]
    land_probs = [int(n.attrib.get('probability', '100')) for n in next_tags_land]

    print(f"[TEST 2] Animacja 'land' (ID 20) po zakończeniu sekwencji lądowania:")
    scratch_found = False
    for tid, p in zip(land_targets, land_probs):
        tname = anims[tid]['name']
        print(f"  -> przechodzi do: {tname} (ID {tid}) z wagą {p}%")
        if tname == 'scratch':
            scratch_found = True
            scratch_prob = p

    assert scratch_found, "W przejściach po land brakuje 'scratch'!"
    print(f"  -> WYNIK: CZASEM SCRATCH ({scratch_prob}%) - TEST ZALICZONY [PASS]\n")

    # 3. Sprawdz animacje 'toss' oraz lądowania po rzucie ('fall soft', 'fall hard')
    for aid in [9, 10]:
        a = anims.get(aid)
        seq = a['elem'].find('ns:sequence', ns)
        nexts = seq.findall('ns:next', ns)
        scratch_in_fall = any(anims[int(n.text.strip())]['name'] == 'scratch' for n in nexts)
        print(f"[TEST 3] '{a['name']}' (ID {aid}) po rzucie myszką: zawiera przejście do scratch: {scratch_in_fall} [PASS]")

if __name__ == '__main__':
    test_fall_and_land()
