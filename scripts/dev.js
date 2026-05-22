import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
let isShuttingDown = false;

const children = [
  start("backend", ["--workspace", "apps/backend", "run", "dev"]),
  start("frontend", ["--workspace", "apps/frontend", "run", "dev"]),
];

function start(name, args) {
const child = spawn(npmCommand, args, {
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  child.on("exit", (code, signal) => {
    if (isShuttingDown) return;
    console.error(`[${name}] exited with ${signal || `code ${code}`}`);
    shutdown(code || 1);
  });

  return child;
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill();
  }

  setTimeout(() => process.exit(exitCode), 100);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
