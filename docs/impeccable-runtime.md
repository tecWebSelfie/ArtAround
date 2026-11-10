# Impeccable in Claude Code and Codex

## What failed

The repository ships engine `0.1.16` for Windows x64, in each skill's
`scripts/bin/windows-x64/` directory. Linux must bootstrap its own release.
The original launcher attempted to create `~/.impeccable/bin/0.1.16/`, which
the Codex cloud filesystem sandbox could not write. This is a cache/platform
problem, not an engine restricted to Claude.

Both Unix launchers now retain the existing search order for installed binaries
and the versioned user cache. In this Node project, if no binary has been found
and no explicit `IMPECCABLE_HOME` was supplied, bootstrap uses
`node_modules/.cache/impeccable/`. That path is already ignored by Git and
writable inside the checkout. `IMPECCABLE_BIN`, explicit cache overrides, the
bundled Windows binary, TLS checks and release SHA-256 verification are unchanged.
No binary is added to tracked files. Keep this small launcher patch synchronized
between `.agents` and `.claude` if updating upstream skill files.

Run from the repository root:

```sh
.agents/skills/impeccable/scripts/impeccable engine-probe
.claude/skills/impeccable/scripts/impeccable engine-probe
```

Both should print `impeccable-engine 0.1.16`. The first Linux bootstrap needs
access to `github.com` and its release assets through the configured proxy.
Use authorized execution outside a network-restricted sandbox for that first
download; subsequent cached launches work within the filesystem sandbox.
Never disable TLS/checksum validation to install it.

In native Windows shells, use the corresponding `scripts/impeccable.cmd`.
The existing bundled Windows executable takes precedence; Windows execution
was not tested in this Linux session.

## Skills, engine commands and hooks are separate

`shape`, `polish`, `harden`, `adapt`, `extract` and `document` are agent
workflows described in the skill references. They are not standalone engine
subcommands and are not automatically executed by typing `impeccable polish`
in a terminal. The agent follows those workflows and calls engine utilities
such as `context`, `doctor`, `detect`, `surface-brief` and `hook` where required.

The installed skill copies intentionally have different client metadata:
Claude has slash-command/frontmatter fields; Codex uses the `.agents` format.
Their engine version and launcher behavior are shared. Do not erase these
intentional metadata differences by copying the entire SKILL.md between clients.

| Client      | Skill location               | Project hook configuration | Edited-file tool                                  |
| ----------- | ---------------------------- | -------------------------- | ------------------------------------------------- |
| Claude Code | `.claude/skills/impeccable/` | `.claude/settings.json`    | `Edit`, `Write`                                   |
| Codex       | `.agents/skills/impeccable/` | `.codex/hooks.json`        | `apply_patch` (also compatible Edit/Write inputs) |

Both manifests already configure `PostToolUse` and `Stop` design checks.
Claude additionally has its existing session-start hooks. Those differences
are intentional, not evidence that Codex lacks engine support. Official
Impeccable tests put Codex patch text in `tool_input.command`; a fabricated
`tool_input.patch` event does not exercise the same parser.

`impeccable hooks status` reports Impeccable's configuration, not proof that a
particular hosted client dispatches native hooks. A Codex CLI may require the
user to approve the project's hooks through `/hooks` before its first native
execution. Preserve that approval mechanism. Tool edits through a shell or an
API that does not dispatch those events still need the explicit final detector
pass required by the skill. Synthetic hook tests validate payload handling,
not the host application's event dispatcher.

## Revalidation after the fix

- Both launchers pass `engine-probe` without extra environment variables, with
  network access blocked by the normal execution sandbox after bootstrap.
- Explicit `IMPECCABLE_HOME` is honored: an intentionally unwritable test
  destination fails rather than silently choosing a different cache.
- Claude Edit and Codex apply_patch hook fixtures produce the expected
  structured design feedback using the real engine.
- `doctor` and source detection run through the engine; the navigation surface
  brief is registered using `surface-brief write` with actual source targets.
- Rendered detection found a skipped heading level in the new nearby-work
  notice. Changing its heading from h3 to h2 preserved appearance and corrected
  the outline. Fresh mobile, desktop and dark-mode scans then returned no
  findings. This is a scoped detector result, not proof of hardware GPS accuracy.
- The skill's independent finish reviewer returned `ship` for the supplied
  source and captures; design documentation is reconciled separately.

## Documentation consulted

- [Official Claude hook-development guide](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md).
- [Official Codex configuration notes](https://github.com/openai/codex/blob/main/docs/config.md)
  and [configuration schema](https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json).
- [Official Impeccable hook wiring](https://github.com/pbakaus/impeccable/blob/main/crates/context/src/hook_wiring.rs)
  and [hook tests](https://github.com/pbakaus/impeccable/blob/main/crates/hook/tests/hook_tests.rs).

The hosted Claude documentation URL was denied by this environment's network
policy; the official public plugin repository supplied the hook documentation.
