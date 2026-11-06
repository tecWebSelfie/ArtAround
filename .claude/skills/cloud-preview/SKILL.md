---
name: cloud-preview
description: Let the user try the app running in a Claude Code cloud session from their own phone or PC, over their Tailscale tailnet with HTTPS. Use when, in a cloud session (CLAUDE_CODE_REMOTE=true), the user asks to try, open, test or preview the app themselves ("fammi provare l'app", "voglio vederla dal telefono"). Not for local PC sessions, where `pnpm dev` and localhost are enough.
---

# Cloud preview

`scripts/cloud-preview.sh` (`pnpm preview:cloud`) prepares Tailscale with
HTTPS, MongoDB and LiveKit in Docker (`pnpm services:start`) with a seeded database and the env
files; do not rebuild the setup by hand. Background, tailnet setup and limits: `docs/cloud-preview.md`.

0. With `TS_AUTHKEY` set, a `SessionStart` hook
   (`scripts/cloud-preview-autostart.sh`) has already started the setup and
   `pnpm dev` in the background: read `~/.cache/artaround-preview/autostart.log`
   first. If it has the "Ready" line and `pnpm dev` answers, skip to step 3.
1. Run `pnpm preview:cloud` in the foreground (timeout ~10 minutes: the first
   run downloads the MongoDB image and Tailscale and seeds the database).
   - With `TS_AUTHKEY` in the environment it joins the tailnet by itself.
   - Without it, it prints a `login.tailscale.com` link and waits up to 5
     minutes: run it in the background, send the user the link, wait for the
     "Ready" line. The link is single-use; tell the user only they should open it.
   - If `tailscale serve` prints an admin link ("Serve is not enabled"), the
     tailnet owner must enable Serve and HTTPS certificates: send the link.
2. Start `pnpm dev` in the background (longest timeout). If it was already
   running, restart it: `NEXT_PUBLIC_*` variables are read at startup.
3. Warm the first page (`curl --noproxy '*' http://localhost:3000/en/navigator`)
   and give the user the `https://….ts.net` URL from the script, plus the seed
   login (`dev` / `test`).
4. When the user is done: `pnpm preview:cloud --stop`, then restart or stop
   `pnpm dev`.

Never commit `.env.local` (its block sits between `# >>> cloud-preview`
markers), and never ask for the auth key in chat: it lives in the environment's
variables.
