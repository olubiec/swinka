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
    p = pk[t['id']]
    print(f"== {t['id']}  {p['title']}  (stage gate: {'YES' if p['gate'] else 'no'})")
    print(f"PROMPT: {p['prompt_file']}")
    print("FILES:  " + ", ".join(p['files']))
    print(f"VERIFY: {p['verify']}")
P
