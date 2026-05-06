# AI Task Queue

## Current Task
Stabilize the next smallest production-safe improvement only.

## Current Task Scope
- Pick one small, high-leverage issue from the app.
- Edit a maximum of 3 files.
- Do not refactor unrelated code.
- Do not change database schema unless this task explicitly says so.
- Do not touch auth, billing, email, cron, or production secrets unless this task explicitly says so.

## Execution Rules
1. Read `AGENTS.md` first.
2. Read this file before making changes.
3. Explain the planned change before editing when the change is broad or risky.
4. Prefer the smallest patch that fixes the task.
5. Run only relevant checks:
   - `npm run lint` when UI/code style changed.
   - `npm run typecheck` when TypeScript changed.
   - `npm test` only when logic/tests changed.
   - `npm run build` only before release/PR readiness.
6. After finishing, update `ops/progress.md` with:
   - what changed
   - files edited
   - checks run
   - next recommended task

## Next Recommended Backlog
1. Improve CSV import error messages.
2. Add empty-state guidance to dashboard cards.
3. Add loading state to customer table.
4. Add small smoke test for repeat customer scoring.
5. Improve onboarding copy after login.

## Human Approval Rule
AI may create branches, commits, and PRs. Do not auto-merge to `main` unless Golf explicitly asks.
