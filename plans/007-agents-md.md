# Plan 007: Create AGENTS.md for agent-executed plans

> **Executor instructions**: Follow this plan step by step.

## Status
- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `4a3ed1f`, 2026-07-11

## Why this matters

This repo has 59 architecture documentation files and was refactored using
agent-driven workflows. An AGENTS.md file tells future agents (and humans)
how to work with this codebase: build/test commands, architecture layers,
conventions, and what NOT to touch.

## Current state

No AGENTS.md exists. Architecture docs are in `architecture/` with 59 files
across 5 phases. The codebase follows a strict layer isolation pattern
(types → utils → ports → adapters → services → store → components).

## Steps

1. **Create `AGENTS.md`** at repo root with:
   - Build/test/lint commands (exact, verified)
   - Architecture layer map (from audit)
   - Port/Adapter pattern explanation
   - Convention: store = pure state, services = domain logic
   - Convention: gate.mjs = 0 violations required
   - Convention: no dynamic imports to hide dependencies (POSTMORTEM_W4)
   - Files/directories to avoid touching without reason

2. **Verify**: `cat AGENTS.md` reads correctly, commands work.

## Done criteria

- `AGENTS.md` exists at repo root
- Contains verified build/test/lint commands
- Documents the 7-layer architecture
- References POSTMORTEM_W4.md for the dynamic import rule
