# 03 — Word-band formatters  🟢 CHEAP (Gemini Flash 3.5)

**Task:** Write pure lookup functions that turn a stored integer (`-3..+3`) into a human word.
This is a direct pattern-copy of the SHIPPED function `affinityDescriptor` in
`src/services/npc/npcBehaviorDirective.ts`:

```ts
function affinityDescriptor(v: number): string {
    if (v <= 15) return 'Nemesis — actively hostile';
    if (v <= 30) return 'Distrustful — suspicious and cold';
    // ...etc (0..100 scale)
}
```

You are writing the same idea on a `-3..+3` scale, ×7 axes. **No logic beyond the lookup.**

## What to build

Create `src/services/npc/agencyBands.ts`.

### Relation band (1 function, scale -3..+3)
Bands are LOCKED by the spec (§9.4): `Arch-enemy / Hostile / Cold / Neutral / Friendly / Close / Devoted`.
```ts
export function relationBand(v: number): string {
  // -3 Arch-enemy, -2 Hostile, -1 Cold, 0 Neutral, +1 Friendly, +2 Close, +3 Devoted
  // clamp out-of-range to nearest end.
}
```

### Hexagon bands (6 functions, scale -3..+3)
One per axis. Words per axis (–3 → +3), authored below — use verbatim:

| Axis | -3 | -2 | -1 | 0 | +1 | +2 | +3 |
|---|---|---|---|---|---|---|---|
| drive | Listless | Apathetic | Idle | Steady | Motivated | Driven | Relentless |
| diligence | Negligent | Lazy | Lax | Reliable | Diligent | Meticulous | Exacting |
| boldness | Timid | Cautious | Wary | Measured | Bold | Daring | Reckless |
| warmth | Frigid | Cold | Aloof | Even | Warm | Affable | Effusive |
| empathy | Callous | Hard | Detached | Fair | Kind | Compassionate | Selfless |
| composure | Volatile | Excitable | Tense | Calm | Composed | Serene | Unflappable |

```ts
export type HexAxis = 'drive'|'diligence'|'boldness'|'warmth'|'empathy'|'composure';
export function hexBand(axis: HexAxis, v: number): string { /* table lookup, clamp */ }
```
(`HexAxis` is also declared in `01_STRONG_types_contract` / `src/types`; import it from there if already
present, otherwise define locally — Claude will reconcile during wiring.)

### Convenience (no new logic)
```ts
// "Driven, Diligent, Bold, Warm, Fair, Composed" — for the PLAY AS line; omit axes at 0 ('Steady'/'Even' etc. still printed is fine — Claude decides at wiring, just expose the helper)
export function describeHex(hex: Record<HexAxis, number>): string;
```

## Rules
- Pure functions, no side effects, no imports beyond the type.
- Clamp: `v < -3` → treat as -3; `v > 3` → treat as +3.
- Do NOT touch `npcBehaviorDirective.ts` — Claude wires these in (work-order 05).
- Match existing code style in `src/services/npc/`.

## DONE =
- `agencyBands.ts` exports `relationBand`, `hexBand`, `describeHex`;
- `npm run build` (tsc -b) green.
