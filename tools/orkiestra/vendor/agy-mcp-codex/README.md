# AGY MCP for Codex

A small, dependency-free MCP server that lets OpenAI Codex delegate local tasks to Google Antigravity CLI (`agy`). It starts Antigravity in headless mode, returns immediately with a task ID, and lets Codex poll for the final response.

This is an independent community bridge. It is not an official Google or OpenAI project.

## What it provides

| MCP tool | Purpose |
| --- | --- |
| `antigravity_status` | Find the local CLI and list tasks held by the current MCP process |
| `antigravity_start` | Start an Antigravity task and return a `task_id` |
| `antigravity_result` | Poll task status and retrieve the final JSON response |
| `antigravity_cancel` | Stop a running task and its child processes |

The bridge supports Windows, macOS, and Linux. It has no npm dependencies and does not read or copy authentication credentials.

## Requirements

- Node.js 18 or newer
- Codex CLI or the Codex desktop app with CLI access
- Google Antigravity CLI installed and authenticated
- Git, if installing from the repository

Install Antigravity CLI from the [official download page](https://antigravity.google/download), then run `agy` interactively once to complete Google sign-in. Headless runs use the credentials cached by the official CLI.

## Quick installation

Clone the repository and test it:

```bash
git clone https://github.com/BerryUIKI/AGY_MCP_CODEX.git
cd AGY_MCP_CODEX
npm test
```

On Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

On macOS or Linux:

```bash
sh ./scripts/install.sh
```

The installer detects Node.js and `agy`, replaces an existing Codex MCP entry with the same name, and registers this repository's `server.mjs`. Restart Codex after installation.

To use a nonstandard CLI path on Windows:

```powershell
.\scripts\install.ps1 -AntigravityCliPath "C:\path\to\agy.exe"
```

On macOS or Linux:

```bash
ANTIGRAVITY_CLI_PATH=/path/to/agy sh ./scripts/install.sh
```

## Let an agent install it

[PROMPTS.md](PROMPTS.md) contains ready-to-paste prompts for full installation, configuration of an existing clone, analysis tasks, authorized code edits, follow-up conversations, and cancellation.

[SYSTEM_PROMPT.md](SYSTEM_PROMPT.md) provides a complete Lead Agent system prompt. It makes the primary agent responsible for task design, Antigravity delegation, independent verification, and final acceptance.

The shortest setup prompt is:

```text
Install and configure AGY_MCP_CODEX from https://github.com/BerryUIKI/AGY_MCP_CODEX.git as a user-level Codex MCP server named "antigravity". Check Git, Node.js 18+, Codex CLI, and `agy`; clone the repository; run `npm test`; run the correct script in `scripts/`; verify with `codex mcp get antigravity --json`; and perform a safe plan-mode test that replies exactly AGY_MCP_OK. If Google sign-in is required, ask me to run `agy` interactively. Never handle my credentials or disable Antigravity permissions.
```

## Manual configuration

Codex stores user-level MCP configuration in `~/.codex/config.toml`. The recommended way to update it is through Codex CLI:

```bash
codex mcp add antigravity --env ANTIGRAVITY_CLI_PATH=/absolute/path/to/agy -- /absolute/path/to/node /absolute/path/to/AGY_MCP_CODEX/server.mjs
```

Verify or remove the registration:

```bash
codex mcp get antigravity --json
codex mcp remove antigravity
```

If `ANTIGRAVITY_CLI_PATH` is omitted, the bridge searches the platform's normal installation location and `PATH`.

## Usage

After restarting Codex, ask:

```text
Use the Antigravity MCP to analyze the project at C:\work\my-project. Run in plan mode, investigate the failing build, and return likely causes with evidence. Poll until the task finishes.
```

For an edit you explicitly authorize:

```text
Use the Antigravity MCP to fix the failing build in C:\work\my-project. I authorize edits inside that project. Use accept-edits mode, preserve unrelated changes, run relevant tests, and poll until completion. Then inspect the diff and summarize it.
```

`antigravity_start` accepts:

| Argument | Meaning |
| --- | --- |
| `prompt` | Required task instructions, up to 12,000 characters |
| `cwd` | Required existing absolute project directory |
| `mode` | `plan` by default, or `accept-edits` for authorized edits |
| `model` | Optional Antigravity model override |
| `conversation_id` | Optional prior conversation to continue |
| `timeout_seconds` | 10–1,800 seconds; default 300 |

Only one task runs at a time in each MCP process. Up to 30 recent task records remain in memory and are cleared when Codex restarts the server. Poll `antigravity_result` about every 10 seconds.

## Security model

- The bridge never passes `--dangerously-skip-permissions`.
- Antigravity retains its own permission and sandbox behavior.
- `cwd` must be an existing absolute directory.
- Arguments are passed directly to the executable without a shell.
- Output is capped at 2 MB; diagnostics retain only the latest 12 KB.
- Cancelling a task stops its process tree but does not revert changes already written.
- Credentials remain under the official Antigravity CLI's authentication system.

Because MCP clients can invoke powerful tools, review the task prompt and working directory before authorizing file-changing work.

## Troubleshooting

**`installed: false` from `antigravity_status`**

Install `agy`, add it to `PATH`, or reinstall the MCP entry with `ANTIGRAVITY_CLI_PATH` set to the executable's absolute path.

**`authentication required`**

Run `agy` in a terminal, complete Google sign-in, exit the interactive session, and retry from Codex. Do not paste authorization codes into an agent chat.

**Tools do not appear in Codex**

Run `codex mcp get antigravity --json`, confirm that the entry is enabled, then restart Codex so the MCP server is loaded in a new session.

**A file operation needs approval or fails in headless mode**

Antigravity's normal permission policy still applies. Grant only the specific operations required for the task through Antigravity's own configuration, then retry. The bridge intentionally offers no permission-bypass option.

## Development

Run the protocol and validation smoke test:

```bash
npm test
```

The test verifies MCP initialization, tool discovery, CLI status shape, and rejection of invalid working directories, modes, and task IDs. A real model request requires an authenticated Antigravity account and is intentionally excluded from automated tests.

## References

- [Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Antigravity CLI installation and authentication](https://www.antigravity.google/docs/cli/install/)
- [Antigravity CLI headless mode](https://www.antigravity.google/docs/cli/headless/)

## License

[MIT](LICENSE)
