# Cloud preview (Tailscale)

How to try the app that a Claude Code **cloud** session is running, from your
own phone or PC. On a PC nothing changes: `pnpm dev` and `http://localhost:3000`
as always.

## Why Tailscale

A cloud container has no public IP and no inbound ports; it reaches the
internet only through an HTTPS proxy. A plain tunnel (`cloudflared`) can't use
that proxy, and a VPN server (WireGuard, OpenVPN) would need inbound UDP.
Tailscale works because the container and your devices both dial _out_ to
Tailscale's relays (DERP, over HTTPS), and the app stays private to your
tailnet. `tailscale serve` adds HTTPS with a Let's Encrypt certificate, so the
camera (QR scanner) and GPS work on the phone.

## What runs where

- `scripts/cloud-preview.sh` (`pnpm preview:cloud`): `.env` if missing,
  MongoDB in Docker (`pnpm db:start`: the compose `mongodb` service, with
  the Docker daemon started if needed) seeded when its volume is new, `tailscaled` in userspace mode, `tailscale serve`
  (HTTPS → port 3000), and a managed block in `.env.local`. `--stop` undoes it.
- `.claude/skills/cloud-preview/`: tells Claude how to use the script, so in a
  cloud session it is enough to ask "fammi provare l'app".
- Code: the browser uses the public URL (`NEXT_PUBLIC_PAYLOAD_URL`); the server
  calls its own routes on `PAYLOAD_INTERNAL_URL` (`SELF_ORIGIN`,
  `src/lib/localized.ts`), because the Tailscale name only answers from the
  tailnet. `next.config.ts` lets the dev server accept `**.ts.net` origins.
  On a PC and in a deploy `PAYLOAD_INTERNAL_URL` is unset and nothing changes.

## One-time setup (tailnet owner)

1. **Serve and HTTPS**: in the Tailscale admin console, enable HTTPS
   certificates (DNS page) and Serve. Machine names that get a certificate are
   published in public Certificate Transparency logs.
2. **Tag and access rules**: in Access controls, add the tag and limit what
   the cloud machines can reach. The default "everyone reaches everything"
   rule must go, otherwise a cloud container could reach your devices:

   ```json
   {
     "tagOwners": { "tag:claude-cloud": ["autogroup:admin"] },
     "grants": [
       // Your own devices, among themselves, as before.
       { "src": ["autogroup:member"], "dst": ["autogroup:self"], "ip": ["*"] },
       // Your devices open the preview; the container reaches nothing.
       { "src": ["autogroup:member"], "dst": ["tag:claude-cloud"], "ip": ["tcp:443"] }
     ]
   }
   ```

3. **Auth key**: Settings → Keys → Generate auth key, with _Reusable_,
   _Ephemeral_ (the machine disappears when the container goes away),
   _Pre-approved_ and the tag `tag:claude-cloud`. Keys expire (90 days at most):
   generate a new one when it does.
4. **Environment variable**: in the Claude Code cloud environment settings
   (environment menu in the session's title bar → Edit), add the environment
   variable `TS_AUTHKEY` with that key. New sessions pick it up. Never paste the
   key in the chat or commit it.

Without `TS_AUTHKEY` the script still works: it prints a single-use login link
to open yourself.

## Limits

- Let's Encrypt issues at most ~5 certificates per week for the same name, and
  each new container asks for one. For frequent use, set `TS_HOSTNAME` to vary
  the name, or skip HTTPS (Chrome flag _Insecure origins treated as secure_).
- Everything lives as long as the container: a new session repeats the setup
  (about a minute, plus the first page compile).
- Object scenes built while the public URL is the Tailscale one may store
  absolute asset URLs with that host (`src/lib/pascal/object-assets.ts`), as
  with LAN phone testing. Reseed if that database is reused elsewhere.
