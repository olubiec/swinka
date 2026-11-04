#!/usr/bin/env bash
# Manual mode (Antigravity subagents, no orkiestra). Usage: tools/release-wave.sh W24
# Lists the packages of a wave from docs/opt/packages.json: prompt file, allowed files, verify command.
# Waves: PK-00, W17, W18a, W18b, W19, W20a, W20b, W21, W22, W23a, W23b, W24, W25, W26a-c, W27a-b, W30a-c, W31, W32, W33
set -euo pipefail
cd "$(dirname "$0")/.."
wave="${1:?usage: release-wave.sh <wave id, e.g. W24 or PK-00>}"
python3 - "$wave" <<'P'
import json, sys, yaml
wave = sys.argv[1]
pk = json.load(open('docs/opt/packages.json'))['packages']
ids = [w for w in yaml.safe_load(open('waves.yaml'))['waves'] if w['id'] == wave]
if not ids:
    sys.exit(f"unknown wave {wave}")
for t in ids[0]['tasks']:
    p = pk.get(t['id'])
    if p:
        title, prompt, files, verify, gate = p['title'], p['prompt_file'], p['files'], p['verify'], 'YES' if p['gate'] else 'no'
    else:  # old task (W11-W16), not in packages.json: take it from waves.yaml
        title, prompt, files = t.get('title', t['id']), t['prompt_file'], t.get('files', [])
        verify, gate = t.get('test_command', ''), 'no'
    print(f"== {t['id']}  {title}  (stage gate: {gate})")
    print(f"PROMPT: {prompt}")
    print("FILES:  " + ", ".join(files))
    print(f"VERIFY: {verify}")
P
