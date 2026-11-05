#!/usr/bin/env bash
# SessionStart hook (.claude/settings.json): starts Storybook (port 6006) in the
# background when a Claude Code cloud session starts, so its MCP endpoint
# (`storybook` in .mcp.json, http://localhost:6006/mcp) that AGENTS.md asks to
# use for UI work is there without starting it by hand. Returns at once: the
# hook must not hold up the session.
#
# Cloud sessions only (on a PC run `pnpm storybook` when needed). Opt out with
# STORYBOOK_AUTOSTART=0 in the environment's variables.
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
[ "${STORYBOOK_AUTOSTART:-1}" != "0" ] || exit 0

ROOT=$(cd "$(dirname "$0")/.." && pwd)
LOG="${XDG_CACHE_HOME:-$HOME/.cache}/artaround-storybook.log"

# SessionStart also fires on resume and /clear: keep a running Storybook.
if pgrep -f "[s]torybook dev" >/dev/null; then
  echo "Storybook already running on http://localhost:6006 (log: $LOG)."
  exit 0
fi

mkdir -p "$(dirname "$LOG")"
cd "$ROOT"
# setsid + nohup detach it from the hook so it survives the hook's exit;
# --ci skips the interactive prompts and the browser launch.
setsid nohup pnpm storybook --ci >"$LOG" 2>&1 </dev/null &

# Hook stdout lands in Claude's context: the MCP server connects at session
# start, before Storybook is up, so it may need a reconnect (/mcp).
echo "Storybook starting in the background on http://localhost:6006 (log: $LOG)."
echo "If the storybook MCP server failed to connect, reconnect it once Storybook is up."
