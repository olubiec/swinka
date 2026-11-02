#!/usr/bin/env bash
# Usage: tools/release-wave.sh W12   (copies docs/prompts/W12-*.md to tasks/)
set -euo pipefail
wave="${1:?usage: release-wave.sh W<n>}"
cd "$(dirname "$0")/.."
shopt -s nullglob
files=(docs/prompts/"$wave"-*.md)
[ ${#files[@]} -gt 0 ] || { echo "no prompts for $wave" >&2; exit 1; }
for f in "${files[@]}"; do cp "$f" tasks/; done
echo "copied ${#files[@]} files to tasks/. Commit and push to main to start the wave."
