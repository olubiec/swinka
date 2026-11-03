#!/usr/bin/env bash
# Usage: tools/release-wave.sh W12      (copies docs/prompts/W12-*.md to tasks/)
#        tools/release-wave.sh W26b     (a sub-wave listed in docs/prompts/subwaves.json, W23-W30)
set -euo pipefail
wave="${1:?usage: release-wave.sh W<n>[a-f]}"
cd "$(dirname "$0")/.."
shopt -s nullglob
files=()
if [[ "$wave" =~ ^W[0-9]{2}[a-f]$ ]]; then
  for id in $(python3 -c "import json,sys; print(' '.join(json.load(open('docs/prompts/subwaves.json')).get(sys.argv[1], [])))" "$wave"); do
    files+=(docs/prompts/"$id"-*.md)
  done
else
  files=(docs/prompts/"$wave"-*.md)
fi
[ ${#files[@]} -gt 0 ] || { echo "no prompts for $wave" >&2; exit 1; }
for f in "${files[@]}"; do cp "$f" tasks/; done
echo "copied ${#files[@]} files to tasks/. Commit and push to main to start the wave."
