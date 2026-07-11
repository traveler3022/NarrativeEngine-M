# Plan 004: Fix npm vulnerabilities (1 critical, 3 high)

> **Executor instructions**: Follow this plan step by step.

## Status
- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4a3ed1f`, 2026-07-11

## Why this matters

`npm audit` reports 18 vulnerabilities including 1 critical (concurrently)
and 3 high (xmldom, flatted, minimatch). These are in transitive dependencies
and may not be directly exploitable, but the critical rating on concurrently
warrants investigation.

## Current state

```
concurrently: critical
@xmldom/xmldom: high
flatted: high
minimatch: high
+ 14 lower severity
```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Audit     | `npm audit`             | 0 vulnerabilities   |
| Build     | `npx vite build`        | exit 0              |
| Tests     | `npx vitest run`        | all pass            |

## Steps

1. **Run `npm audit --fix`** — attempts to auto-fix vulnerabilities.

2. **If `concurrently` is a devDependency**: check if it's used in scripts.
   If unused, remove it. If used, update to latest version.

3. **Check `@xmldom/xmldom`**: likely transitive via @capacitor/* or
   @huggingface/transformers. If so, update the parent package.

4. **Run `npm audit` again** — verify remaining count.

5. **Run build + tests** — verify no breakage from dependency updates.

## STOP conditions

- If `npm audit --fix` updates a major version of a core dependency
  (react, zustand, vite, @capacitor/*), STOP and test manually first.
- If tests fail after update, STOP and report which test broke.

## Done criteria

- `npm audit` shows 0 critical, 0 high vulnerabilities
- `npx tsc -b --noEmit` passes
- `npx vite build` passes
- `npx vitest run` passes
