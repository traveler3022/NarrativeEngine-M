# 07 — Scene-stakes tag (calm/tense/dangerous)  🟣 STRONG (prompt) + 🟢 CHEAP (fallback)

**Why Strong:** it adds structured metadata to the **live GM call** (+0 cost) and is the
action-context filter the whole engine gates on. Get the prompt + parse robust or every tick mis-gates.

## Spec (§9.3#2 — DECIDED, decoupled from Combat Mode)
- **Primary (+0 calls):** the existing GM/story call emits a `sceneStakes` tag — one of
  `calm | tense | dangerous` — as **structured metadata**, semantic so it catches *political* danger,
  not just combat. **Do NOT tie to Combat Mode.**
- **Fallback:** if the GM omits/garbles the tag, fire a **cheap utility classifier** (🟢) over the
  last scene to label it. One bounded call, only on miss.
- **Telemetry:** log the fallback rate. Persistent fallback = the GM prompt is broken → fix the
  signal, not a silent crutch.
- This is also the **action-context filter** (old hole 4 merged): `dangerous` blocks relaxing +
  long-goals, allows sustaining-needs + medium-goals (→ betrayal/drastic). Wire into `contextAllow`
  (Piece A, 02).

## Build
1. Extend the story system prompt to append a trailing structured line, e.g.
   `[[SCENE_STAKES: calm|tense|dangerous]]`, with a 1-line rubric (physical OR social/political
   threat → tense/dangerous). Match existing structured-tag conventions in the payload/turn code.
2. Parse it out of the response in the turn pipeline (strip before display); store
   `lastSceneStakes` on turn/campaign state. Default `calm` when absent.
3. `classifySceneStakes(provider, recentScene): Promise<SceneStakes>` (🟢 CHEAP) — fallback only.
4. Telemetry counter: `sceneStakesFallbackRate` into the existing utility-call tracker / DebugPanel.

## Rules
- The tag is metadata, never shown to the player; strip it from rendered text.
- Fallback is the only added call and only on miss — primary path is +0 (§9.0).

## DONE =
- GM emits `sceneStakes`; pipeline parses + stores it + strips it from display; cheap fallback +
  fallback-rate telemetry wired; `contextAllow` reads it; `npm run build` + test green.
