#!/usr/bin/env bash
# SessionStart hook (.claude/settings.json): brings the cloud preview up on its
# own when a Claude Code cloud session starts, so the app is reachable from the
# user's tailnet without asking. It only launches `scripts/cloud-preview.sh`
# and then `pnpm dev` in the background and returns at once: the hook must not
# hold up the session (the first run downloads Tailscale and seeds MongoDB).
#
# Runs only in a cloud session with TS_AUTHKEY set: without the key the setup
# would wait for an interactive login link nobody sees. Opt out with
# CLOUD_PREVIEW_AUTOSTART=0 in the environment's variables.
#
# Not the environment's setup script on purpose: that one can't read the
# environment's variables, so it has no TS_AUTHKEY to join the tailnet with.
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
[ "${CLOUD_PREVIEW_AUTOSTART:-1}" != "0" ] || exit 0
[ -n "${TS_AUTHKEY:-}" ] || exit 0

ROOT=$(cd "$(dirname "$0")/.." && pwd)
TOOLS="${XDG_CACHE_HOME:-$HOME/.cache}/artaround-preview"
TS_SOCK="${TS_SOCKET:-/tmp/artaround-ts.sock}"
LOG="$TOOLS/autostart.log"

# SessionStart also fires on resume and /clear: if tailscaled is already up
# (same pattern as cloud-preview.sh), the preview is running; leave it alone.
if pgrep -f "tailscaled .*--socket=$TS_SOCK" >/dev/null; then
  echo "Cloud preview already running (log: $LOG)."
  exit 0
fi

mkdir -p "$TOOLS"
# setsid + nohup detach the job from the hook, so it survives the hook's exit.
# `pnpm dev` is (re)started after the setup because Next reads the
# NEXT_PUBLIC_* URLs the setup writes to .env.local only at startup.
# A failing setup stops here: its error is the last thing in the log.
#
# Payload regenerates src/payload-types.ts unformatted when the dev server
# first loads its config, which leaves a formatting-only diff that the cloud
# session's end-of-turn git check reports as uncommitted work. So the first
# page is requested once (it also warms the compile for the user), then, since
# Payload writes the file asynchronously a moment after that first load, the
# job waits for the rewrite (newer than a stamp taken before `pnpm dev`, up to
# 2 minutes) and formats the file back to its committed form.
cd "$ROOT"
STAMP="$TOOLS/dev-started" setsid nohup bash -c '
  bash scripts/cloud-preview.sh || exit 1
  # "[n]ext" so the pattern does not match this very bash -c command line.
  pkill -f "[n]ext dev" || true
  touch "$STAMP"
  pnpm dev &
  DEV=$!
  for _ in $(seq 60); do
    curl --noproxy "*" -sf -o /dev/null --max-time 300 http://localhost:3000/en/navigator && break
    sleep 5
  done
  for _ in $(seq 60); do
    [ src/payload-types.ts -nt "$STAMP" ] && break
    sleep 2
  done
  sleep 2 # let the write finish
  npx prettier --write src/payload-types.ts
  wait "$DEV"
' >"$LOG" 2>&1 </dev/null &

# Hook stdout lands in Claude's context: say where to look.
echo "Cloud preview starting in the background (Tailscale, MongoDB, then pnpm dev)."
echo "Log: $LOG — the https://….ts.net URL is on its '[cloud-preview] Ready' line."
