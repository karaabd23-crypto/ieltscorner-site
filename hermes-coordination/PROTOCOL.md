# Repo Coordination Protocol

Multiple agents work on this repo at once. This file sets who may write
where, so two agents never collide on the same files. Hermes coordinates.

## Roles

| Agent | Repo write access |
|---|---|
| Main session (Claude Code, direct) | May push straight to `main`. |
| VS Code agent | Branch + PR only. No direct push to `main`. |
| CRO chat agent | Branch + PR only. No direct push to `main`. |
| Audit routine (scheduled) | Branch + PR only. No direct push to `main`. |
| Lesson reviewer | Read-only. Makes no repo writes. |
| Hermes | Coordinates. Read-only on the repo itself. |
| Muse | Issues work orders. Read-only on the repo itself. |

## Rule

Before starting any repo work, check `hermes-coordination/ACTIVE_WORK.md`.
If another agent holds a claim that overlaps the files or areas you're
about to touch, stop and report the conflict instead of starting. Append
your own claim before you start, and mark it DONE when you finish.
