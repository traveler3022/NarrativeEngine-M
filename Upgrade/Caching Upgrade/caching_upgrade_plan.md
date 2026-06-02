# Technical Design & Implementation Plan: Caching Upgrade

## Goal
Optimize prompt caching for stateless LLM providers (e.g., DeepSeek's automatic prompt cache) and provider-specific caching headers (e.g., Anthropic's ephemeral prompt caching). 

By ensuring the prompt prefix is 100% stable and strictly append-only turn-over-turn, we can scale the prompt cache hit rate from a flat **~80k tokens** (Game Rules only) to **300k+ tokens** (Game Rules + Divergence Facts + Pinned Memories + Compounding Conversation History).

---

## Architectural Breakdown (Target Prompt Sequence)

The prompt payload must be constructed as a two-stage rocket. The first stage is the **Stable Prefix** (cached), and the second stage is the **Volatile Footer** (processed fresh each turn).

```
+-----------------------------------------------------------------------+
| 1. STABLE PREFIX (100% Cacheable & Stable)                            |
|                                                                       |
|   - Base System Rules (stableContent)                                 |
|   - Pinned Memories (Player-controlled facts; stable once set)       |
|   - Divergence Facts (divergenceContent; stable until chapter seals)  |
|   - Fitted History (Clean dialogue turns only; append-only)           |
+-----------------------------------------------------------------------+
| 2. VOLATILE FOOTER (Uncached & Highly Dynamic)                        |
|                                                                       |
|   - Volatile RAG Lore, NPC ledgers, and inventories                  |
|   - Active Scene Notebook (temporary notepad)                         |
|   - Active Scene Notes (GM local directions / volatile guidelines)    |
|   - Latest Player User Message (new turn)                            |
+-----------------------------------------------------------------------+
```

---

## Key Differences: Current vs. Target Behavior

| Prompt Component | Current Code Behavior (Scrambles Cache) | Target Code Behavior (Protects Cache) |
| :--- | :--- | :--- |
| **Pinned Memories** | Spliced directly into the middle of the history array at a shifting depth relative to the end. Scrambles the prefix on every turn. | Placed as a static, stable block in the system prompt block directly underneath the base Game Rules. |
| **Scene Notes** | Spliced directly into the middle of the history array at a shifting depth relative to the end. Scrambles the prefix on every turn. | Moved down into the **Volatile Block** at the very bottom, right next to the player's latest message. |
| **Fitted History** | Interrupted by moving memories and scene notes, causing a 100% prefix cache miss on the history every turn. | Strictly clean, verbatim dialogue turns (`User` and `Assistant` turns only). Always append-only. |
| **Volatile Block** | Prepended to the latest user message (Correct). | Prepended to the latest user message, now also including the Scene Note. |

---

## Step-by-Step Implementation Steps

### Step 1: Clean Up `payloadHistoryFitting.ts`
We must strip all dynamic splicing from the clean dialogue history array (`fitted`).

*   **File:** [payloadHistoryFitting.ts](file:///d:/Games/AI%20DM%20Project/Automated_system/mobileApp/src/services/payload/payloadHistoryFitting.ts)
*   **Action:** 
    1.  Remove `spliceSceneNote()` completely from the history fitting process.
    2.  Remove `splicePinnedMemories()` completely from the history fitting process.
    3.  Ensure `fitHistory()` continues to strip tool messages, scene-markers, and tool-calling assistant messages to keep the dialogue history array 100% clean.

---

### Step 2: Refactor `payloadBuilder.ts`
We must re-route Pinned Memories to the Stable block and Scene Notes to the Volatile block.

*   **File:** [payloadBuilder.ts](file:///d:/Games/AI%20DM%20Project/Automated_system/mobileApp/src/services/payload/payloadBuilder.ts)
*   **Action:**
    1.  **Re-route Pinned Memories:** 
        *   Extract the Pinned Memories block assembly from `payloadHistoryFitting.ts` (the `buildPinnedMemoriesBlock` helper).
        *   Assemble the Pinned Memories inside `buildPayload()` if `pinnedExcerpts` exist.
        *   Append the Pinned Memories block directly to the `stableContent` (System Message 1) so it sits safely in the stable, cached system segment.
    2.  **Re-route Scene Notes:**
        *   If `context.sceneNoteActive` and `context.sceneNote` are present, assemble the Scene Note block:
            ```text
            [SCENE NOTE: VOLATILE GUIDANCE]
            {context.sceneNote}
            ```
        *   Push the assembled Scene Note block into `volatileParts` so it gets folded directly into the uncached `volatileBlock` at the very bottom of the prompt.
    3.  **Adjust historyBudget tokens:**
        *   Ensure the token count for Pinned Memories is accounted for in `stableTokens` (which reduces the history budget properly).
        *   Ensure the token count for Scene Notes is accounted for in `volatileTokens` (which reduces the history budget properly).

---

### Step 3: Enforce the "RAG Duplicate Filtering" Rule
Ensure that the dynamic RAG block at the bottom does not recall scenes currently visible in the Fitted History prefix.

*   **File:** [payloadWorldContext.ts](file:///d:/Games/AI%20DM%20Project/Automated_system/mobileApp/src/services/payload/payloadWorldContext.ts)
*   **Action:**
    *   Verify that `assembleWorldBlocks()` continues to extract `activeAssistantContents` from `history` and aggressively filters out duplicate matches in `archiveRecall`.

---

## Verification & Caching Metrics Plan

To verify that the caching upgrade is successful:
1.  **Test a multi-turn chat session** using a provider that supports caching stats (like DeepSeek or Anthropic).
2.  **Verify the Cache Hit Rate:**
    *   **Turn 1:** Cache hit should equal the system prompt size (~80k tokens).
    *   **Turn 2:** Cache hit should stay at ~80k tokens (due to the clean-vs-dirty history transition).
    *   **Turn 3:** Cache hit **must increase** by the size of the Turn 1 dialogue (~81k+ tokens).
    *   **Turn 4:** Cache hit **must increase** by the size of Turn 1 & Turn 2 dialogues (~82k+ tokens).
3.  **Verify UI & AI behavior:**
    *   Confirm that manual Scene Notes are followed strictly by the AI (placing them at the very bottom should result in stronger instruction compliance).
    *   Confirm that Pinned Memories are still recalled perfectly by the AI from the Stable block.
