import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const server = spawn(process.execPath, ["server.mjs"], {
  stdio: ["pipe", "pipe", "inherit"],
});
const pending = new Map();
let nextId = 0;

createInterface({ input: server.stdout }).on("line", (line) => {
  const response = JSON.parse(line);
  pending.get(response.id)?.(response.result);
  pending.delete(response.id);
});

function request(method, params) {
  return new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    server.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
}

const call = (name, args = {}) => request("tools/call", { name, arguments: args });

try {
  const initialized = await request("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "smoke-test", version: "1" },
  });
  assert.equal(initialized.serverInfo.name, "antigravity-cli-bridge");

  server.stdin.write(
    `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
  );
  const list = await request("tools/list", {});
  assert.equal(list.tools.length, 4);

  const status = JSON.parse((await call("antigravity_status")).content[0].text);
  assert.equal(typeof status.installed, "boolean");
  assert.equal((await call("antigravity_start", { prompt: "test", cwd: "relative" })).isError, true);
  assert.equal(
    (await call("antigravity_start", {
      prompt: "test",
      cwd: process.cwd(),
      mode: "bypass",
    })).isError,
    true,
  );
  assert.equal((await call("antigravity_result", { task_id: "missing" })).isError, true);
  console.log("PASS: MCP handshake, four tools, status, and validation errors");
} finally {
  server.stdin.end();
}
