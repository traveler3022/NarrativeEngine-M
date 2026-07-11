# Phase 2 Reset — Discovery First

## Status

During the previous iterations, implementation work (Ports, Adapters, Interfaces) started before the Discovery phase was fully completed.

This document resets the process.

Those implementations are **not considered architecture**.
They are only **draft hypotheses** until Discovery validates them.

---

# Current Status

| Step | Status |
|------|--------|
| 2.1 Audit | ✅ Completed |
| 2.2 Dependency Discovery | ⏳ Not Started |
| 2.3 Boundary Discovery | ⏳ Not Started |
| 2.4 Capability Discovery | ⏳ Not Started |
| 2.5 Responsibility Discovery | ⏳ Not Started |
| 2.6 Interaction Discovery | ⏳ Not Started |
| 2.7 Boundary Validation | ⏳ Not Started |
| 2.8 Architecture Review | ⏳ Not Started |
| 2.9 Human Approval | ⏳ Waiting |

Phase 3 is **blocked** until Phase 2 is fully approved.

---

# Important Rule

All existing Ports, Interfaces, Adapters and Boundary documents are considered:

> Candidate Architecture

They are **NOT** considered the final architecture.

Discovery must validate them.

If Discovery reaches different conclusions, they must be modified or removed.

---

# Discovery Rules

During Phase 2 the following sources are allowed:

- Repository structure
- Import graph
- Runtime dependencies
- Call graph
- Build graph
- Actual source code

The following sources MUST NOT influence Discovery:

- Existing Ports
- Existing Interfaces
- Existing Adapters
- Existing BOUNDARIES.md
- Previous architectural assumptions

Discovery must be performed as if none of those artifacts existed.

---

# Phase 2 Workflow

## 2.2 Dependency Discovery

Goal:

Discover the real dependency graph.

Output:

- Dependency Report
- Layer violations
- Runtime dependencies
- Compile-time dependencies

No code changes.

---

## 2.3 Boundary Discovery

Goal:

Discover natural architectural boundaries.

Output:

- Boundary candidates
- Layer ownership
- Coupling report

No implementation.

---

## 2.4 Capability Discovery

Goal:

Discover capabilities from system behavior.

Output:

- Capability Inventory
- Capability ownership
- Consumers

No interfaces.

---

## 2.5 Responsibility Discovery

Goal:

Determine responsibilities of each capability.

Output:

- Responsibility matrix
- Ownership validation

No ports.

---

## 2.6 Interaction Discovery

Goal:

Understand how capabilities communicate.

Output:

- Interaction diagrams
- Dependency directions
- Runtime flows

No adapters.

---

## 2.7 Boundary Validation

Validate every discovered boundary.

Questions:

- Is this boundary domain-driven?
- Is it independent from implementation?
- Would it survive replacing Zustand?
- Would it survive replacing persistence?

Only validated boundaries continue.

---

## 2.8 Architecture Review

Architecture assessment.

Review:

- Coupling
- Cohesion
- Dependency direction
- Layer isolation
- Risks
- Technical debt

No implementation.

---

## 2.9 Human Approval

Architecture review by the project owner.

Only after approval:

Phase 3 may begin.

---

# Definition of Done

Phase 2 is complete only if:

- All Discovery steps are finished.
- Every architectural boundary is validated.
- Human approval is granted.
- No architectural assumption remains unverified.

Until then:

Phase 3 is prohibited.
