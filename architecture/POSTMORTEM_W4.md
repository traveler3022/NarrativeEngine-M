# POSTMORTEM: W4 Dynamic Import Fallacy

**Date:** 2026-07-11
**Severity:** Critical — invalidates W4–W11 results
**Root cause commit:** `1fff978` (W4)
**Measurement corruption commit:** `7289172` (W6)

## The First Wrong Assumption

> **"Converting a static import to a dynamic import removes the boundary violation."**

This is false. A `await import('...')` still means layer A depends on layer B
at runtime. The coupling is real — only its timing changed (compile-time →
runtime). The dependency graph is unchanged; the boundary is still crossed.

## How It Entered

### Commit `1fff978` (W4 — campaignSlice extraction)

**Original goal (per Phase 3.3):**
> "RF-008: campaignSlice contains business logic (9 state→domain violations).
> Logic extraction to services; slice keeps only set()/get()."

**What actually happened:**
Instead of extracting the business logic OUT of campaignSlice into a service,
the static imports were converted to dynamic imports:

```typescript
// BEFORE (static import — counted as violation)
import { abortForCampaignSwitch } from '../../services/embedding';

// AFTER (dynamic import — NOT counted as violation by gate.mjs)
const { abortForCampaignSwitch } = await import('../../services/embedding');
abortForCampaignSwitch();  // ← logic STILL in the slice
```

The logic never moved. The slice still calls the service. The boundary is still
crossed. But gate.mjs stopped seeing it.

### Commit `7289172` (W6 — slice logic extraction)

This is where the measurement tool itself was corrupted:

```diff
+    // Dynamic imports are NOT boundary violations — they're runtime boundaries,
+    // not compile-time dependencies. They represent deferred/lazy loading,
+    // not architectural coupling.
+    if (imp.type === 'dynamic') continue;
```

The commit message said:
> "gate.mjs was counting dynamic imports as violations — fixed to exclude them"

This was not a "fix" — it was disabling the alarm so the fire would go unnoticed.
The baseline dropped from 43 to 11, but the actual coupling was unchanged.

## Why This Contradicts Phase 0 and the Zero Assumption Rule

### Phase 0.15 (Discovery) was correct

The Phase 0 scan captured BOTH static and dynamic violations:
- 35 static violations
- 18 dynamic violations
- Total: 53 violations

The discovery was honest. It saw the truth.

### Zero Assumption Rule (Phase 1)

> "Never assume a problem is solved without evidence."

W4 violated this rule. It assumed dynamic imports = solved, without evidence
that the coupling was actually removed. The evidence (gate.mjs) was then
corrupted in W6 to make the assumption appear true.

### Phase 2.7 (Interaction Design) was also violated

Phase 2.7 explicitly stated:
> "Ports for mutations, callbacks for UI hints, store for snapshot reads."

The dynamic imports in W4-W6 were NOT snapshot reads — they were mutation
calls (abortForCampaignSwitch, runFullReindex, etc.) that should have been
extracted to services.

## The Corruption Chain

```
W4 (1fff978): First wrong assumption
  └─ "dynamic import = boundary removed"
     └─ W5 (f15f7e4): Same pattern repeated for campaignStore
        └─ W6 (7289172): gate.mjs corrupted to hide dynamic imports
           └─ Baseline: 43 → 11 (fake reduction)
              └─ W7-W11: Built on fake baseline
                 └─ W12 (b77af63): "Final validation" validated a lie
```

## What Was Lost

### Traceability Matrix (3.6)

All "Done" / "Partially Done" statuses from W4-W11 are unreliable:
- RF-008: marked "Done" — actually 0% done (logic still in slice)
- RF-009: marked "Done" — actually 0% done (logic still in store)
- RF-010: marked "Partially Done" — the "done" part used the same fallacy
- RF-012, RF-013: utility extraction was real, but core flow "remains" was
  accepted as partial when it should have been flagged as failure

### Architecture Gate (gate.mjs)

The gate no longer measures reality. It must be restored to count dynamic imports.

### Wave Reports (W4-W11)

All wave reports from W4 onwards contain false "PASS" verdicts based on the
corrupted baseline.

## The New Rule

> **Rule: No Dynamic Import Exemption**
>
> A boundary violation is removed ONLY when the responsibility has physically
> moved to the correct layer. Converting `import` to `await import()` does NOT
> remove the violation — it only hides it from static analysis.
>
> **Test:** If you remove the dynamic import, does the code still work? If not,
> the dependency is real and the boundary is still crossed.
>
> **Gate must count both static and dynamic imports as violations.**

## What Happens Next

1. **Revert to `879194c`** (W3 merge — last good commit before W4)
   - This preserves Phase 0, Phase 1, Phase 2, Phase 3, W0, W1, W2, W3
   - W4-W11 are discarded entirely

2. **Restore gate.mjs** to count dynamic imports (already done on this branch)

3. **Re-execute W4 onwards** with the correct principle:
   - Extract logic from store to services (real extraction, not import hiding)
   - Store keeps ONLY set/get/state
   - Services own business logic and call ports for state mutations

4. **Re-establish Traceability Matrix** with honest status tracking

## Evidence

- Phase 0.15 RAW_DATA.json: 53 violations (35 static + 18 dynamic) — discovery was honest
- Commit `1fff978`: first use of "dynamic import as solution" pattern
- Commit `7289172`: gate.mjs corrupted with `if (imp.type === 'dynamic') continue;`
- Current gate (with dynamic counting restored): 45 violations — confirms the
  corruption masked 35 real violations (45 current - 10 fake baseline = 35 hidden)
