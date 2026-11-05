#!/usr/bin/env node
/**
 * Cross-platform launcher for the stdio MCP servers in `.mcp.json`
 * (`node scripts/mcp-npx.mjs -y <package> [args]`).
 *
 * Native Windows can't spawn `npx` directly (it is `npx.cmd`), which is why
 * the servers used to be declared as `cmd /c npx …`; but `cmd` doesn't exist
 * on Linux/macOS, so in cloud sessions those servers failed to start
 * (ENOENT). `node` exists everywhere: this script runs `npx` through a shell
 * only on Windows and hands it the MCP stdio pipes untouched.
 */
import { spawn } from 'node:child_process'

const child = spawn('npx', process.argv.slice(2), {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

// Stopping the client stops the server too.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
child.on('error', (error) => {
  console.error(`mcp-npx: ${error.message}`)
  process.exit(1)
})
