import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, statSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

const jobs = new Map();
const stringSchema = { type: "string", minLength: 1 };
const objectSchema = (properties, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

function executableCandidates() {
  const binary = process.platform === "win32" ? "agy.exe" : "agy";
  const candidates = [process.env.ANTIGRAVITY_CLI_PATH];

  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    candidates.push(join(process.env.LOCALAPPDATA, "agy", "bin", binary));
  }
  candidates.push(join(homedir(), ".local", "bin", binary));

  for (const directory of (process.env.PATH || "").split(delimiter)) {
    if (directory) candidates.push(join(directory, binary));
  }

  return [...new Set(candidates.filter(Boolean))];
}

function findCli() {
  return executableCandidates().find((candidate) => existsSync(candidate));
}

const tools = [
  {
    name: "antigravity_status",
    description:
      "Check whether the local Antigravity CLI can be found and list tasks held by this MCP process. Authentication is verified only when a task runs.",
    inputSchema: objectSchema({}),
    annotations: { readOnlyHint: true },
  },
  {
    name: "antigravity_start",
    description:
      "Delegate a task to the local Antigravity CLI. An authenticated CLI and an existing absolute working directory are required. Returns a task_id immediately; poll antigravity_result. Use plan for analysis and accept-edits only when file edits are intended. The bridge never bypasses Antigravity permissions.",
    inputSchema: objectSchema(
      {
        prompt: { ...stringSchema, maxLength: 12000 },
        cwd: stringSchema,
        mode: {
          type: "string",
          enum: ["plan", "accept-edits"],
          default: "plan",
        },
        model: stringSchema,
        conversation_id: stringSchema,
        timeout_seconds: {
          type: "integer",
          minimum: 10,
          maximum: 1800,
          default: 300,
        },
      },
      ["prompt", "cwd"],
    ),
  },
  {
    name: "antigravity_result",
    description:
      "Read a task status and final Antigravity JSON response. Poll running tasks about every 10 seconds. The response includes a conversation_id that can be passed to a later task. Task records are cleared when the MCP server restarts.",
    inputSchema: objectSchema({ task_id: stringSchema }, ["task_id"]),
    annotations: { readOnlyHint: true },
  },
  {
    name: "antigravity_cancel",
    description:
      "Stop a running Antigravity task and its child processes. File changes already completed by the task are not reverted.",
    inputSchema: objectSchema({ task_id: stringSchema }, ["task_id"]),
  },
];

function stopJob(job) {
  if (!job.child?.pid) return;

  if (process.platform === "win32") {
    const taskkill = join(process.env.SystemRoot || "C:\\Windows", "System32", "taskkill.exe");
    const killer = spawn(taskkill, ["/PID", String(job.child.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    killer.on("error", () => job.child.kill());
  } else {
    job.child.kill("SIGTERM");
  }
}

function jobSummary(job) {
  return {
    task_id: job.id,
    status: job.status,
    cwd: job.cwd,
    started_at: job.started,
    finished_at: job.finished,
    exit_code: job.exitCode,
    result: job.result,
    diagnostics: job.stderr || undefined,
    error: job.error,
  };
}

function validate(name, args) {
  const specification = tools.find((tool) => tool.name === name);
  if (!specification) throw new Error(`Unknown tool: ${name}`);

  for (const key of Object.keys(args)) {
    if (!(key in specification.inputSchema.properties)) {
      throw new Error(`Unknown argument: ${key}`);
    }
  }
  for (const key of specification.inputSchema.required) {
    if (!(key in args)) throw new Error(`Missing argument: ${key}`);
  }
  for (const [key, value] of Object.entries(args)) {
    const rule = specification.inputSchema.properties[key];
    if (
      rule.type === "string" &&
      (typeof value !== "string" ||
        !value.trim() ||
        value.includes("\0") ||
        value.length > (rule.maxLength || 32000))
    ) {
      throw new Error(`Invalid string: ${key}`);
    }
    if (
      rule.type === "integer" &&
      (!Number.isInteger(value) || value < rule.minimum || value > rule.maximum)
    ) {
      throw new Error(`Invalid integer: ${key}`);
    }
    if (rule.enum && !rule.enum.includes(value)) {
      throw new Error(`Invalid value: ${key}`);
    }
  }
}

function callTool(name, args) {
  validate(name, args);

  if (name === "antigravity_status") {
    const cli = findCli();
    return {
      cli: cli || null,
      installed: Boolean(cli),
      authentication:
        "Authentication is checked only when a task runs. Start agy interactively if sign-in is required.",
      tasks: [...jobs.values()].map((job) => ({
        task_id: job.id,
        status: job.status,
      })),
    };
  }

  if (name === "antigravity_start") {
    const cli = findCli();
    if (!cli) {
      throw new Error(
        "Antigravity CLI was not found. Install agy or set ANTIGRAVITY_CLI_PATH to its absolute path.",
      );
    }
    if (!isAbsolute(args.cwd) || !existsSync(args.cwd) || !statSync(args.cwd).isDirectory()) {
      throw new Error("cwd must be an existing absolute directory");
    }
    if ([...jobs.values()].some((job) => job.status === "running")) {
      throw new Error("A task is already running; wait for it or cancel it first.");
    }
    if (jobs.size >= 30) jobs.delete(jobs.keys().next().value);

    const seconds = args.timeout_seconds ?? 300;
    const cliArgs = [
      "-p",
      args.prompt,
      "--output-format",
      "json",
      "--mode",
      args.mode ?? "plan",
      "--print-timeout",
      `${seconds}s`,
      "--disable-slash-commands",
    ];
    if (args.model) cliArgs.push("--model", args.model);
    if (args.conversation_id) cliArgs.push("--conversation", args.conversation_id);

    const job = {
      id: randomUUID(),
      status: "running",
      cwd: args.cwd,
      started: new Date().toISOString(),
      stdout: "",
      stderr: "",
    };
    jobs.set(job.id, job);
    job.child = spawn(cli, cliArgs, {
      cwd: args.cwd,
      windowsHide: true,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      job.status = "timed_out";
      job.error = "Task exceeded its timeout";
      stopJob(job);
    }, (seconds + 15) * 1000);

    job.child.stdout.setEncoding("utf8");
    job.child.stderr.setEncoding("utf8");
    job.child.stdout.on("data", (chunk) => {
      job.stdout += chunk;
      if (job.stdout.length > 2_000_000) {
        job.stdout = job.stdout.slice(0, 2_000_000);
        job.status = "failed";
        job.error = "Output limit exceeded";
        stopJob(job);
      }
    });
    job.child.stderr.on("data", (chunk) => {
      job.stderr = (job.stderr + chunk).slice(-12000);
    });
    job.child.on("error", (error) => {
      job.status = "failed";
      job.error = error.message;
    });
    job.child.on("close", (code) => {
      clearTimeout(timer);
      job.finished = new Date().toISOString();
      job.exitCode = code;
      try {
        job.result = JSON.parse(job.stdout.trim());
      } catch {
        job.result = job.stdout.trim() || undefined;
      }
      job.stdout = "";
      if (job.status === "running") {
        job.status =
          code === 0 && (!job.result?.status || job.result.status === "SUCCESS")
            ? "completed"
            : "failed";
      }
    });

    return { task_id: job.id, status: job.status, poll_after_seconds: 10 };
  }

  const job = jobs.get(args.task_id);
  if (!job) {
    throw new Error("Unknown task_id; tasks expire when the MCP server restarts.");
  }
  if (name === "antigravity_cancel" && job.status === "running") {
    job.status = "cancelled";
    stopJob(job);
  }
  return jobSummary(job);
}

const send = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });

input.on("line", (line) => {
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }

  if (request.id === undefined) return;
  let result;
  switch (request.method) {
    case "initialize":
      result = {
        protocolVersion: ["2024-11-05", "2025-03-26", "2025-06-18", "2025-11-25"].includes(
          request.params?.protocolVersion,
        )
          ? request.params.protocolVersion
          : "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "antigravity-cli-bridge", version: "1.0.0" },
        instructions:
          "Call antigravity_start with an explicit cwd, then poll antigravity_result. Default to plan mode. Preserve the user's authorization boundaries when delegating.",
      };
      break;
    case "ping":
      result = {};
      break;
    case "tools/list":
      result = { tools };
      break;
    case "tools/call":
      try {
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                callTool(request.params?.name, request.params?.arguments ?? {}),
              ),
            },
          ],
        };
      } catch (error) {
        result = {
          isError: true,
          content: [{ type: "text", text: error.message }],
        };
      }
      break;
    default:
      send({
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32601, message: "Method not found" },
      });
      return;
  }
  send({ jsonrpc: "2.0", id: request.id, result });
});

input.on("close", () => {
  for (const job of jobs.values()) if (job.status === "running") stopJob(job);
});

process.on("SIGTERM", () => {
  for (const job of jobs.values()) if (job.status === "running") stopJob(job);
  setTimeout(() => process.exit(0), 1000);
});
