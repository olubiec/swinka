#!/usr/bin/env bash
# Starts one Jules task per task file of a wave (Jules Tools CLI: npm i -g @google/jules && jules login).
# Usage: tools/jules-wave.sh W2            # all tasks/W2-*.md (files must already be on main)
#        MAX=15 tools/jules-wave.sh W2     # Pro limit: 15 tasks at once; the rest is printed, run it later
#        tools/jules-wave.sh variants tasks/W4-04-x.md 3   # same task N times ([WARIANTY], max 5)
set -euo pipefail
cd "$(dirname "$0")/.."
MAX="${MAX:-15}"
if [ "${1:-}" = "variants" ]; then
  f="$2"; n="${3:-3}"
  jules remote new --repo . --parallel "$n" --session "Wykonaj $f zgodnie z AGENTS.md. Każdy wariant inny wizualnie."
  exit 0
fi
wave="${1:?usage: tools/jules-wave.sh W2}"
count=0
for f in tasks/"$wave"-*.md; do
  [ -e "$f" ] || { echo "no files for $wave"; exit 1; }
  if grep -q '\[WARIANTY\]' "$f"; then echo "SKIP (variants, run: tools/jules-wave.sh variants $f 3): $f"; continue; fi
  if [ "$count" -ge "$MAX" ]; then echo "LATER (limit $MAX): $f"; continue; fi
  jules remote new --repo . --session "Wykonaj $f zgodnie z AGENTS.md."
  count=$((count+1))
done
echo "started $count task(s)"
