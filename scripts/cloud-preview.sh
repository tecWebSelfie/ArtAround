#!/usr/bin/env bash
# Cloud preview: open the app running in a Claude Code cloud session from your
# own devices, over your Tailscale tailnet with HTTPS. Why and how, plus the
# one-time tailnet setup: docs/cloud-preview.md. On a PC none of this runs.
#
# Sets up Tailscale (`tailscale serve`: HTTPS → port 3000), `.env` if missing,
# MongoDB (`pnpm services:start`, Docker) with a seeded database and a managed block
# in `.env.local`; then start `pnpm dev`. Idempotent: re-run freely.
#
# Usage: scripts/cloud-preview.sh          set up
#        scripts/cloud-preview.sh --stop   log out, stop Tailscale, drop the block
# Env:   TS_AUTHKEY   Tailscale auth key (optional; else a login link is printed)
#        TS_HOSTNAME  machine name in the tailnet (default: artaround-cloud)
#        TS_SOCKET    tailscaled socket (default: /tmp/artaround-ts.sock)
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
TOOLS="${XDG_CACHE_HOME:-$HOME/.cache}/artaround-preview"
# Unix sockets have a ~108-character path limit: keep this one short.
TS_SOCK="${TS_SOCKET:-/tmp/artaround-ts.sock}"
TS_HOST="${TS_HOSTNAME:-artaround-cloud}"
# Markers of the managed block (no '/': they sit inside a sed address).
BEGIN='# >>> cloud-preview >>>'
END='# <<< cloud-preview <<<'

log() { printf '\033[1m[cloud-preview]\033[0m %s\n' "$*"; }
ts() { "$TOOLS/tailscale/tailscale" --socket="$TS_SOCK" "$@"; }
tailscaled_running() { pgrep -f "tailscaled .*--socket=$TS_SOCK" >/dev/null; }
# Prints one expression of the JSON on stdin: `… | json Self.DNSName`.
json() { node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).$1"; }

# Removes the managed block from .env.local, leaving any other line in place.
drop_env_block() {
  [ -f "$ROOT/.env.local" ] || return 0
  sed -i "/^$BEGIN\$/,/^$END\$/d" "$ROOT/.env.local"
  [ -s "$ROOT/.env.local" ] || rm "$ROOT/.env.local"
}

if [ "${1:-}" = "--stop" ]; then
  # Logging out an ephemeral machine removes it from the tailnet right away.
  if tailscaled_running; then ts serve reset || true; ts logout || true; fi
  pkill -f "tailscaled .*--socket=$TS_SOCK" || true
  drop_env_block
  log 'Stopped. Restart `pnpm dev` so it forgets the preview URL.'
  exit 0
fi

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ] && [ "${FORCE:-}" != "1" ]; then
  log 'Meant for Claude Code cloud sessions; on a PC just run `pnpm dev`. (FORCE=1 to override.)'
  exit 1
fi
mkdir -p "$TOOLS"

# 1. Tailscale first: without TS_AUTHKEY the user signs in before the slow steps.
if [ ! -x "$TOOLS/tailscale/tailscaled" ]; then
  TGZ=$(curl -fsSL 'https://pkgs.tailscale.com/stable/?mode=json' | json Tarballs.amd64)
  log "Downloading $TGZ…"
  mkdir -p "$TOOLS/tailscale"
  curl -fsSL "https://pkgs.tailscale.com/stable/$TGZ" | tar xz -C "$TOOLS/tailscale" --strip-components=1
fi
if ! tailscaled_running; then
  # Userspace networking (no root network setup) and in-memory state: every
  # container is a new, ephemeral machine. `--statedir` is still required:
  # `tailscale serve` stores its HTTPS certificate there, and without it the
  # certificate fails ("no TailscaleVarRoot"). tailscaled reaches Tailscale
  # through the session's HTTPS proxy (HTTPS_PROXY).
  nohup "$TOOLS/tailscale/tailscaled" --tun=userspace-networking --state=mem: \
    --statedir="$TOOLS/tailscale-state" --socket="$TS_SOCK" >"$TOOLS/tailscaled.log" 2>&1 &
  for _ in $(seq 20); do [ -S "$TS_SOCK" ] && break; sleep 0.5; done
fi
if [ "$(ts status --json | json BackendState)" != Running ]; then
  if [ -n "${TS_AUTHKEY:-}" ]; then
    ts up --auth-key="$TS_AUTHKEY" --hostname="$TS_HOST"
  else
    log 'No TS_AUTHKEY: open the link below and sign in (waits up to 5 minutes).'
    ts up --hostname="$TS_HOST" --timeout=300s
  fi
fi
# The tailnet may have renamed the machine (e.g. artaround-cloud-1).
DNS_NAME=$(ts status --json | json 'Self.DNSName.replace(/\.$/, "")')
URL="https://$DNS_NAME"
# Needs Serve and HTTPS certificates enabled on the tailnet; otherwise this
# prints the admin link that enables them.
ts serve --bg 3000

# 2. `.env` is gitignored, so a fresh container has none: start from the
# template with the local database and a random secret. Before MongoDB: the
# seed below reads it.
if [ ! -f "$ROOT/.env" ]; then
  sed -e "s|^PAYLOAD_SECRET=.*|PAYLOAD_SECRET=$(openssl rand -hex 24)|" \
    -e 's|^DATABASE_URL=.*|DATABASE_URL=mongodb://127.0.0.1:27017/artaround|' \
    "$ROOT/.env.example" >"$ROOT/.env"
  log 'Created .env from .env.example (local MongoDB, random PAYLOAD_SECRET).'
fi

# 3. MongoDB in Docker (the compose `mongodb` service), seeded only when its
# volume is new: an existing one may hold your test data.
(cd "$ROOT" && node scripts/services-start.mjs --seed-if-new)

# 4. The browser uses the public URL; the server calls itself on localhost
# (`SELF_ORIGIN`, src/lib/localized.ts), since the tailnet name only answers
# from the tailnet.
drop_env_block
cat >>"$ROOT/.env.local" <<EOF
$BEGIN
NEXT_PUBLIC_PAYLOAD_URL=$URL
NEXT_PUBLIC_APP_URL=$URL
PAYLOAD_INTERNAL_URL=http://localhost:3000
$END
EOF

log "Ready. Start (or restart) \`pnpm dev\`, then open $URL"
log 'on a device in your tailnet. The first request also fetches the certificate.'
