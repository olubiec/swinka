#!/usr/bin/env python3
"""Adds every animation from assets/sprites/baby/animations.json that is missing in
src/Cuy/Resources/animations.xml (desktop pet). The Brain picks the next animation itself,
so the added ones only loop back to idle (id 3) and fall (id 5) without ground."""
import json, re, sys

XML = 'src/Cuy/Resources/animations.xml'
SPR = 'assets/sprites/baby/animations.json'
COLS = 16

s = open(XML, encoding='utf-8').read()
have = set(re.findall(r'<name>([^<]+)</name>', s[s.find('<animations>', s.find('</spawns>')):]))
ids = [int(i) for i in re.findall(r'<animation id="(\d+)"', s)]
next_id = max(100, max(ids) + 1)
anims = json.load(open(SPR))['animations']

blocks = []
for name, a in anims.items():
    if name in have:
        continue
    interval = max(40, round(1000 / a.get('fps', 8)))
    dx = 0
    frames = '\n'.join('        <frame>%d</frame>' % (a['row'] * COLS + i) for i in range(a['frames']))
    blocks.append('''    <animation id="%d">
      <name>%s</name>
      <start>
        <x>%d</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>%d</interval>
      </start>
      <end>
        <x>%d</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>%d</interval>
      </end>
      <sequence repeat="0" repeatfrom="0">
%s
        <next probability="100" only="none">3</next>
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>
''' % (next_id, name, dx, interval, dx, interval, frames))
    next_id += 1

if not blocks:
    print('Nothing to add.')
    sys.exit(0)
end = s.rfind('</animations>', 0, s.find('<childs'))
s = s[:end] + ''.join(blocks) + '  ' + s[end:]
open(XML, 'w', encoding='utf-8').write(s)
print('Added %d animations.' % len(blocks))
