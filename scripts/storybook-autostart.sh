#!/usr/bin/env bash
# SessionStart hook (.claude/settings.json): starts Storybook (port 6006, its
# MCP endpoint at /mcp) in the background when a Claude Code cloud session
# starts, so the `storybook` MCP server has something to connect to. It
# returns at once: the hook must not hold up the session.
#
# Cloud sessions only (a PC starts `pnpm storybook` by hand: it costs memory).
# Opt out with STORYBOOK_AUTOSTART=0 in the environment's variables.
#
# Not the environment's setup script: that one runs before the session and
# can't leave a server running behind it.
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
[ "${STORYBOOK_AUTOSTART:-1}" != "0" ] || exit 0

ROOT=$(cd "$(dirname "$0")/.." && pwd)
LOG="${XDG_CACHE_HOME:-$HOME/.cache}/artaround-storybook.log"

# SessionStart also fires on resume and /clear: leave a running one alone.
if pgrep -f "[s]torybook dev" >/dev/null; then
  echo "Storybook already running (log: $LOG)."
  exit 0
fi

cd "$ROOT"
mkdir -p "$(dirname "$LOG")"
# setsid + nohup detach it from the hook, so it survives the hook's exit.
setsid nohup pnpm storybook --ci >"$LOG" 2>&1 </dev/null &
echo "Storybook starting on http://localhost:6006 (log: $LOG)."
