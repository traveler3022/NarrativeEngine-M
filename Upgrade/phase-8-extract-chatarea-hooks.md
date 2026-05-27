# Phase 8 — Extract ChatArea Hooks (HIGH RISK)

**AI Tier: Strong AI** (Opus 4.7 / GPT-5 / GLM-5.1)

ChatArea is the heart of the user-facing turn loop: it subscribes to 62 store fields, manages 23 useState + 4 useRef, and orchestrates `runTurn` via 15+ callbacks plus an abort controller. A hook extraction here can plausibly compile clean but break: streaming, abort-mid-stream, edit-and-regenerate, scroll-during-stream, scene note banner, deep archive arming, divergence extraction, or pinned memories.

**MANDATORY:** Runtime test the listed scenarios after extraction. Type-check alone is insufficient.

## Current state

`src/components/chat/ChatArea.tsx` (391 lines):
- `handleSend()` (78 lines): runTurn invocation + streaming state + abort + callbacks
- 4 useEffect hooks for scroll behavior + streaming stats polling
- Inline confirmation dialog for clear archive
- 62 store subscriptions
- Already uses `useMessageEditor` and `useCondenser` (good base to build on)

## Target structure

```
src/components/chat/
  ChatArea.tsx              ← shell (~120 lines): wire store, hooks, sub-components
  MessageList.tsx           ← renders bubbles + load-more (~80 lines)
  ChatFooter.tsx            ← action button bar TRIM/LORE/PINS/CLEAR (~60 lines)
  ClearArchiveDialog.tsx    ← confirmation modal (~40 lines)
src/hooks/
  useTurnOrchestrator.ts    ← handleSend, handleStop, isStreaming, streamingStats, abortRef
  useScrollBehavior.ts      ← auto-scroll-to-bottom, showScrollFab
  useStreamingStats.ts      ← polling loop for token/sec display (extracted from useEffect)
```

## useTurnOrchestrator shape

```ts
// src/hooks/useTurnOrchestrator.ts
export interface UseTurnOrchestratorArgs {
  // Inputs needed for runTurn — read from store or props
  // Keep this surface small: ideally just the user input + a few flags
}

export interface UseTurnOrchestratorResult {
  handleSend: (text: string) => Promise<void>;
  handleStop: () => void;
  isStreaming: boolean;
  isCheckingNotes: boolean;
  loadingStatus: string;
  streamingStats: { tokensPerSec: number; elapsedMs: number };
}

export function useTurnOrchestrator(): UseTurnOrchestratorResult {
  // Read everything needed from useAppStore inside the hook
  // Manage abortController via useRef
  // Encapsulate the runTurn callbacks (onCheckingNotes, addMessage, updateLastAssistant, etc.)
}
```

The hook owns:
- `isStreaming`, `isCheckingNotes`, `loadingStatus` state
- `abortControllerRef`
- `runTurn` callback object construction
- Streaming stats polling
- Cleanup on unmount

ChatArea calls `const { handleSend, isStreaming, ... } = useTurnOrchestrator();` — that's it.

## useScrollBehavior shape

```ts
// src/hooks/useScrollBehavior.ts
export function useScrollBehavior(
  messages: ChatMessage[],
  isStreaming: boolean
): {
  bottomRef: RefObject<HTMLDivElement>;
  showScrollFab: boolean;
  scrollToBottom: () => void;
} {
  // Auto-scroll on new messages + streaming
  // Detect user-scrolled-up → show FAB
}
```

## ChatArea after extraction

```tsx
export function ChatArea() {
  // UI state
  const [input, setInput] = useState('');
  const [pinnedPanelOpen, setPinnedPanelOpen] = useState(false);
  const [clearArchiveOpen, setClearArchiveOpen] = useState(false);
  
  // Store reads (only what this component renders directly)
  const messages = useAppStore(s => s.messages);
  const context = useAppStore(s => s.context);
  const pipelinePhase = useAppStore(s => s.pipelinePhase);
  
  // Domain hooks
  const turn = useTurnOrchestrator();
  const editor = useMessageEditor();
  const condenser = useCondenser();
  const scroll = useScrollBehavior(messages, turn.isStreaming);
  
  return (
    <div>
      <SceneNoteBanner context={context} />
      <MessageList
        messages={messages}
        isStreaming={turn.isStreaming}
        editor={editor}
      />
      <div ref={scroll.bottomRef} />
      {scroll.showScrollFab && <ScrollFab onClick={scroll.scrollToBottom} />}
      <ChatFooter
        onTrim={condenser.trim}
        onClearArchive={() => setClearArchiveOpen(true)}
        onTogglePins={() => setPinnedPanelOpen(p => !p)}
      />
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => turn.handleSend(input)}
        onStop={turn.handleStop}
        isStreaming={turn.isStreaming}
      />
      <ClearArchiveDialog open={clearArchiveOpen} onClose={() => setClearArchiveOpen(false)} />
      {pinnedPanelOpen && <PinnedMemoriesPanel />}
    </div>
  );
}
```

## Critical runtime tests (NOT optional)

After extraction, manually verify every scenario:

1. **Basic send:** Type a message → send → assistant streams → completes → message persists on reload.
2. **Abort mid-stream:** Send → click stop while streaming → stream halts → partial message saved.
3. **Edit and regenerate:** Click edit on past user message → modify → send → conversation truncates and regenerates.
4. **Condense:** Click TRIM → history condenses → next turn uses condensed context.
5. **Scroll behavior:** Scroll up during stream → FAB appears → click FAB → scrolls to bottom.
6. **Scene note banner:** Set a scene note in context → banner shows → clear note → banner hides.
7. **Deep archive search:** Arm deep search → send message → verify archive search runs.
8. **Divergence extraction:** Send a message that should trigger divergence → verify entry appears in MemoryTab.
9. **Pinned memories:** Pin a memory → open pins panel → memory visible → unpin → gone.
10. **Tool calls:** Send a message that triggers query_campaign_lore → tool message appears → assistant uses result.
11. **Clear archive confirmation:** Click CLEAR → dialog appears → confirm → archive cleared → cancel path also works.
12. **Streaming stats:** During streaming, verify tokens/sec display updates ~1×/sec.
13. **Race: rapid send:** Send → immediately try to send again → second send is ignored or queued correctly.
14. **Race: edit during stream:** Send → start editing past message while streaming → behavior is sane (probably: edit blocked until stream ends).

If ANY of these regress, revert.

## Verification

- [ ] `tsc --noEmit` exits 0
- [ ] `npm test` green
- [ ] All 14 runtime scenarios above verified manually
- [ ] No new console errors during any scenario
- [ ] Streaming feels visually identical (no jank, no extra flicker)

## Notes for the executing model

- The 15+ callbacks `runTurn` accepts are a sign that `runTurn` itself wants to be event-emitting rather than callback-driven. DO NOT refactor `runTurn` in this phase — out of scope. Just wrap the callbacks inside the hook.
- The `abortControllerRef` must live in the hook, NOT in ChatArea. If the user navigates away during streaming, the hook's cleanup should abort.
- React StrictMode double-renders effects in dev. Test extraction under StrictMode to catch double-fire bugs in the streaming stats polling.
- `useMessageEditor` and `useCondenser` already exist — don't rebuild them, just compose.
- If you find that extracting `useTurnOrchestrator` requires passing 10+ args, STOP and reconsider. The hook should be parameter-free, reading what it needs from the store internally.
- Ship as ONE PR. Sub-splitting risks broken intermediate states.
- Tag pre-merge commit as `pre-phase-8-baseline`.

## Rollback plan

If regressions appear post-merge:
1. Revert to `pre-phase-8-baseline`
2. Re-attempt with narrower scope (e.g. only extract `useScrollBehavior`, leave turn orchestration in ChatArea)
