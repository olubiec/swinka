#!/usr/bin/env python3
import random
from collections import defaultdict

durations = {
    'idle': 20.0,
    'doze': 64.0,
    'eat': 44.0,
    'walk': 4.0,
    'sniff': 6.0,
    'scratch': 4.32,
    'popcorn': 1.8,
    'wheek': 2.0,
    'run': 3.41
}

transitions = {
    'idle': [
        ('eat', 35),
        ('doze', 3),
        ('walk', 85),
        ('sniff', 55),
        ('scratch', 3),
        ('popcorn', 1),
        ('wheek', 1),
        ('run', 1),
    ],
    'walk': [('idle', 100)],
    'eat': [('idle', 82), ('doze', 18)],
    'doze': [('idle', 100)],
    'sniff': [('idle', 45), ('walk', 40), ('sniff', 15)],
    'scratch': [('idle', 100)],
    'popcorn': [('idle', 100)],
    'wheek': [('idle', 100)],
    'run': [('idle', 100)],
}

current = 'idle'
time_spent = defaultdict(float)
counts = defaultdict(int)
total_time = 0.0

steps = 100000
for _ in range(steps):
    d = durations[current]
    time_spent[current] += d
    counts[current] += 1
    total_time += d

    next_list = transitions.get(current, [('idle', 100)])
    names, probs = zip(*next_list)
    total_p = sum(probs)
    r = random.randint(1, total_p)
    cum = 0
    for n, p in zip(names, probs):
        cum += p
        if cum >= r:
            current = n
            break

print(f"\n--- WYNIKI SYMULACJI ({total_time/3600:.1f} h, {steps} kroków) ---")
for s in ['idle', 'doze', 'eat', 'walk', 'sniff', 'scratch', 'popcorn', 'wheek', 'run']:
    pct = (time_spent[s] / total_time) * 100
    cnt = counts[s]
    interv_min = (total_time / cnt / 60) if cnt > 0 else 9999
    print(f"{s:<10} | {durations[s]:>5.1f}s | {cnt:<8} | {pct:>6.2f}% | co {interv_min:>5.1f} min")

rest = ((time_spent['idle'] + time_spent['doze']) / total_time) * 100
eat = time_spent['eat'] / total_time * 100
walk = time_spent['walk'] / total_time * 100
sniff = time_spent['sniff'] / total_time * 100
scratch = time_spent['scratch'] / total_time * 100
rare = (time_spent['popcorn'] + time_spent['wheek'] + time_spent['run']) / total_time * 100

print("-" * 55)
print(f"Odpoczynek i drzemki (idle + doze): {rest:>6.2f}% (cel: ~50%)")
print(f"Jedzenie siana (eat):              {eat:>6.2f}% (cel: ~28%)")
print(f"Chodzenie (walk):                  {walk:>6.2f}% (cel: ~8%, <10%)")
print(f"Węszenie (sniff):                  {sniff:>6.2f}% (cel: ~8%)")
print(f"Pielęgnacja (scratch):             {scratch:>6.2f}% (cel: ~2-3%)")
print(f"Zabawa i rzadkie:                  {rare:>6.2f}% (cel: ~1-3%)")
