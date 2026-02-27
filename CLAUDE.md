## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One tack per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

- **PLan First**: Write plan to `tasks/todo.md` with checkable items
- **Verify Plan**: Check in before starting implementation
- **Track Progress**: Mark items complete as you go
- **Explaint Changes**: High-Level summary at each step
- **Document Results**: Add review section to `tasks/todo.md`
- **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Project-Local Memory

- Store ALL persistent notes, patterns, and session memory in `tasks/memory.md` — not in `~/.claude/`
- This keeps all artifacts version-controlled and portable with the repo
- At session start, review `tasks/memory.md` and `tasks/lessons.md` for relevant context
- Update `tasks/memory.md` when discovering stable patterns, architecture decisions, or user preferences

## Git Branching

- **Always branch for new work**: Before building anything new (features, enhancements, non-trivial changes), create a dedicated git branch from `main`
- Branch naming: use descriptive names like `feat/health-endpoint`, `fix/login-bug`, `refactor/auth-module`
- Do NOT commit new work directly to `main` — work on the branch, then merge via PR
- Trivial one-line fixes (typos, config tweaks) may be committed to `main` directly

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes, Senior developer standards.
- **Minimat Impact**: Changes should only touch what's necessary, Avoid introducing bugs.
