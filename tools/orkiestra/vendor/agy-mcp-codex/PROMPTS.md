# Copy-and-paste prompts

These prompts are written for Codex or another local coding agent with terminal access. The agent should inspect paths instead of assuming them and should stop if authentication requires the user to interact with a browser.

For a reusable orchestration policy that makes the primary agent design the task, direct Antigravity, and independently accept the result, use [SYSTEM_PROMPT.md](SYSTEM_PROMPT.md).

## Install and configure everything

Copy this prompt into Codex:

```text
Install and configure AGY_MCP_CODEX from https://github.com/BerryUIKI/AGY_MCP_CODEX.git as a user-level MCP server named "antigravity".

Requirements:
1. Check that Git, Node.js 18+, Codex CLI, and Google Antigravity CLI (`agy`) are installed.
2. If Antigravity CLI is missing, follow the official installation instructions at https://antigravity.google/download. Do not download executables from unofficial sources.
3. Clone or update the repository in a suitable local tools directory. Preserve any unrelated local changes if the repository already exists.
4. Run the repository test with `npm test`.
5. Run the matching installer from the repository: on Windows use `powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1`; on macOS/Linux use `sh ./scripts/install.sh`.
6. Verify the registration with `codex mcp get antigravity --json`.
7. If Antigravity is not authenticated, ask me to run `agy` interactively and complete Google sign-in. Never request, print, copy, or store my authorization code or credentials.
8. Restart Codex if necessary, call `antigravity_status`, then run a safe end-to-end test in plan mode with the prompt: "Reply with exactly AGY_MCP_OK. Do not use tools."
9. Report the installed repository path, detected `agy` path, MCP registration status, and test result.

Do not enable `--dangerously-skip-permissions`, and do not grant Antigravity broader permissions than I explicitly authorize.
```

## Configure an existing clone

```text
Configure the local AGY_MCP_CODEX repository as a Codex MCP server named "antigravity". Locate the repository, verify that `server.mjs` exists, run `npm test`, and use the repository's installer for this operating system. Detect the absolute paths to Node.js and `agy`; do not assume another user's paths. Verify with `codex mcp get antigravity --json`. If sign-in is required, tell me to authenticate by running `agy` interactively. Never handle my credentials. Restart Codex if needed and test `antigravity_status` plus a plan-mode request that replies exactly `AGY_MCP_OK`. Keep Antigravity's normal permission checks enabled.
```

## Ask Codex to use Antigravity

Analysis only:

```text
Use the Antigravity MCP to analyze the project at <ABSOLUTE_PROJECT_PATH>. Start the task in `plan` mode with a 600-second timeout. Ask Antigravity to inspect <TOPIC_OR_PROBLEM> and return evidence, risks, and a recommended implementation plan. Poll the task until it finishes, then summarize the result and include the Antigravity conversation ID.
```

Authorized code changes:

```text
Use the Antigravity MCP to implement <CHANGE> in <ABSOLUTE_PROJECT_PATH>. I authorize edits inside that project. Start the task in `accept-edits` mode with a 900-second timeout. Instruct Antigravity to preserve unrelated changes, run relevant tests, and report modified files and remaining risks. Poll until completion, inspect the resulting diff yourself, run appropriate verification, and summarize the final outcome. Do not allow changes outside the named project.
```

Continue a previous conversation:

```text
Use the Antigravity MCP to continue conversation <CONVERSATION_ID> in <ABSOLUTE_PROJECT_PATH>. Ask: <FOLLOW_UP_PROMPT>. Use `plan` mode unless I explicitly authorize file changes. Poll until the task finishes and report the result.
```

Cancel a task:

```text
Use `antigravity_cancel` to stop task <TASK_ID>, then call `antigravity_result` once and report its final status. Tell me that already completed file changes are not automatically reverted.
```
