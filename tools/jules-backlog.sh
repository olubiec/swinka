#!/usr/bin/env bash
# Evening run: every line "- ..." of tasks/BACKLOG.md becomes one Jules task (Pro: 15 at once, 100 per rolling 24 h).
# Usage: tools/jules-backlog.sh [max-lines]   (default 15; run again later with an offset: OFFSET=15 tools/jules-backlog.sh)
set -euo pipefail
cd "$(dirname "$0")/.."
MAX="${1:-15}"; OFFSET="${OFFSET:-0}"
grep '^- ' tasks/BACKLOG.md | sed 's/^- //' | tail -n +"$((OFFSET+1))" | head -n "$MAX" | while IFS= read -r line; do
  jules remote new --repo . --session "$line Zgodnie z AGENTS.md; jeden mały PR."
done
