# Guidance for Claude Code agents

This is a **low-stakes, frontend-only** sports club app. The repo is safe for agents to commit and push directly.

## Preferences

- **Commit and push from the agent**: Don't ask for permission or hand off to the user. This speeds up iteration and keeps the workflow clean.
- **Exceptions**: Only ask the user for confirmation if you're unsure about:
  - Destructive operations (deleting functionality, major refactors that could break the UX)
  - Changes to GitHub Pages deployment config (`.github/workflows/`, `next.config.mjs` output/basePath)
  - Anything that would make the live site undeployable

## Context

- **Deployment**: Static export to GitHub Pages at [thorndon-tennis-club-day.pages.dev](https://jaronsteenson.github.io/thorndon-tennis-club-day/) via a GitHub Actions workflow
- **Users**: ~15 club members who use the board on club day (no production SLA, no auth, all data localStorage)
- **Testing**: Vitest unit tests, Playwright e2e golden-path test, ESLint. All should pass before pushing.

## Workflow

1. Plan the work (ask questions if unclear on UX or requirements).
2. Implement and test locally (`npm test`, `npm run e2e`, `npm run build`).
3. Commit with a clear message ("Add X", "Fix Y", "Polish Z").
4. Push to `master` or a feature branch (your choice based on scope).
5. Done — the GH Pages workflow redeploys on master push.

No need to hand off or wait for confirmation unless you hit one of the exceptions above.
