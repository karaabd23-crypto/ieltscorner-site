# Memory System

This folder is the durable project memory for `ieltscorner-site`.

Use it to keep future chats up to speed without relying on thread history.

## Files

- `project-brief.md`: stable project context, architecture, deployment path, user preferences, and operating rules.
- `chat-sessions/`: dated session notes with what changed, what was verified, and what remains open.
- `session-catalog.md`: generated index of local Codex and VS Code chat sessions.
- `session-catalog.json`: machine-readable version of the session catalog.
- `assistant-handoff-database.json`: older thread-level handoff snapshot retained for historical context.

## Workflow

1. Start a new chat by reading `memory/project-brief.md`.
2. Read the newest file in `memory/chat-sessions/`.
3. Refresh `memory/session-catalog.*` with `npm run session:index` if prior session history matters.
4. After meaningful work, update or add a dated session note.
5. If a durable project rule changes, update `memory/project-brief.md`.

## Scope

Store concise summaries and decisions here, not raw transcripts.
