# Repo Coordination Protocol

Two agents do unsupervised work on this repo: Claude Code sessions and Kara's
Hermes personal assistant. Neither can see what the other is doing as it
happens, so this file and `ACTIVE_WORK.md` are the handoff — read before you
touch anything, write before and after you do.

## Roles

| Agent | Repo write access |
|---|---|
| Claude Code (this repo's sessions) | `claude/*` branch, PR to `main`. Never a direct push — see root `CLAUDE.md`. |
| Hermes (Kara's personal assistant) | `hermes/*` branch, PR to `main`. Never a direct push. |
| VS Code agent | Branch + PR only. |
| CRO chat agent | Branch + PR only. |
| Audit routine (scheduled) | Branch + PR only. |
| Lesson reviewer | Read-only. Makes no repo writes. |
| Muse | Issues work orders to Hermes. Read-only on the repo itself. |

Nobody pushes straight to `main` for ieltscorner-site. A PR is how the other
agent (and Kara) gets a chance to see the change before it's live — direct
pushes are exactly the collision this protocol exists to prevent.

## Before you touch anything

1. Pull latest `main`.
2. Read `ACTIVE_WORK.md`. If an **open** claim (status is not `DONE`)
   overlaps the files or areas you're about to touch, stop. Don't start
   parallel work on the same area — either wait, or leave a note in
   Handoff Notes and let Kara arbitrate.
3. Append your own claim row to the table before you start writing code.
4. Work on your own branch (`claude/<slug>` or `hermes/<slug>`), open a PR.
5. Before that PR is ready to merge, edit your own claim row to `DONE`
   (citing the PR number) **in that same PR** — don't open a second PR just
   to flip the status. The ledger on `main` only reflects a branch once it's
   merged, so the row reads `IN PROGRESS` on `main` for exactly as long as
   the PR is open, and flips to `DONE` in the very commit that lands the
   work. No post-merge follow-up PR, and no chain of claims needed to close
   claims.

## Stale claims

A claim whose `last updated UTC` is more than 24h old with no PR to show
for it is probably abandoned (a crashed session, a dropped task). Don't
silently overwrite the same files anyway — add a Handoff Notes entry saying
you're treating it as stale and why, then proceed. (This needs the full
timestamp in `last updated UTC`, not just a date — see `ACTIVE_WORK.md`.)

## Handoff notes

A free-text log for anything the other agent should know that isn't a file
claim: a report you published, a credential you rotated, a decision that
affects their next session, a question you want answered before you
continue. Sign and date every entry (`YYYY-MM-DD · agent · note`). Add new
entries at the bottom; don't delete old ones — this is the history, not a
scratchpad.

This file governs ieltscorner-site work only. Hermes's other tasks for Kara
are out of scope here.
