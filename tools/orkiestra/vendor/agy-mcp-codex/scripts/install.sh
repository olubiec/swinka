#!/usr/bin/env sh
set -eu

NAME="${1:-antigravity}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(dirname "$SCRIPT_DIR")
SERVER_PATH="$REPO_ROOT/server.mjs"

command -v node >/dev/null 2>&1 || { echo "Node.js 18 or newer is required." >&2; exit 1; }
command -v codex >/dev/null 2>&1 || { echo "Codex CLI was not found on PATH." >&2; exit 1; }

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 18 ] || { echo "Node.js 18 or newer is required." >&2; exit 1; }

AGY_PATH="${ANTIGRAVITY_CLI_PATH:-$(command -v agy 2>/dev/null || true)}"
if [ -z "$AGY_PATH" ] && [ -x "$HOME/.local/bin/agy" ]; then AGY_PATH="$HOME/.local/bin/agy"; fi
[ -n "$AGY_PATH" ] && [ -x "$AGY_PATH" ] || {
  echo "Antigravity CLI was not found. Install it or set ANTIGRAVITY_CLI_PATH." >&2
  exit 1
}

codex mcp remove "$NAME" >/dev/null 2>&1 || true
codex mcp add "$NAME" --env "ANTIGRAVITY_CLI_PATH=$AGY_PATH" -- "$(command -v node)" "$SERVER_PATH"
echo "Registered MCP server '$NAME'. Restart Codex, then ask it to call antigravity_status."
