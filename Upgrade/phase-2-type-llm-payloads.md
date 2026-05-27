# Phase 2 — Type LLM Payloads

**AI Tier: Mid AI** (Sonnet 4.6 / GPT-4o / GLM-4.6)

Needs type design judgment. Should follow OpenAI/Anthropic message conventions. A model needs to balance "type things tightly" vs. "don't over-constrain message shapes that vary across providers."

## Why before Phase 4

If `payloadBuilder.ts` is split first (Phase 4), the `any` escapes propagate from 1 file into 5. Typing first means the split inherits clean types.

## Top `any` escapes to fix

| File | Line(s) | Current | Target |
|------|---------|---------|--------|
| `src/services/llm/payloadSanitizer.ts` | 4, 7, 21, 38, 89 | `any[]`, `(tc: any) => tc.id` | `OpenAIMessage[]`, `ToolCall` |
| `src/services/turn/turnOrchestrator.ts` | 83 | `currentPayload: any[]` | `OpenAIMessage[]` |
| `src/services/payload/payloadBuilder.ts` | 125, 126, 171 | `(msg as any).tool_calls`, `(msg as any).name` | Type guard or proper `AssistantMessage` discriminated union |
| `src/services/llm/llmService.ts` | 51, 90 | `(data as any)?.choices?.[0]?.message` | Typed response extractor |
| `src/services/llm/llmService.ts` | 235 | `(err as any)?.name === 'AbortError'` | `isAbortError(err)` type guard |

(Paths assume Phase 1 has been merged.)

## New types module

Create `src/types/llmMessages.ts`:

```ts
export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ToolResultMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

export interface AssistantMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCall[];
  reasoning_content?: string;
}

export interface UserMessage {
  role: 'user';
  content: string;
}

export interface SystemMessage {
  role: 'system';
  content: string;
}

export type OpenAIMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage;

export interface OpenAICompletionResponse {
  choices: Array<{
    message: AssistantMessage;
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// Type guards
export function isAssistantMessage(m: OpenAIMessage): m is AssistantMessage {
  return m.role === 'assistant';
}

export function hasToolCalls(m: OpenAIMessage): m is AssistantMessage & { tool_calls: ToolCall[] } {
  return m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length > 0;
}

export function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError';
}
```

## Execution order within Phase 2

1. Create `src/types/llmMessages.ts` (above).
2. Update `payloadSanitizer.ts` first — it's the most concentrated `any` site.
3. Update `payloadBuilder.ts` — replace `(msg as any).tool_calls` with `hasToolCalls(msg)` guard.
4. Update `llmService.ts` — typed response parsing.
5. Update `turnOrchestrator.ts` — payload type propagation.

## Verification

- [ ] `tsc --noEmit` exits 0
- [ ] `npm test` green
- [ ] Grep for `as any` in the touched files shows no remaining instances in the message-handling paths
- [ ] Manual: send a turn that triggers a tool call (query_campaign_lore or notebook). Verify the tool result is processed correctly.

## Notes for the executing model

- Some providers (Gemini, Anthropic) return slightly different shapes. Keep the response extractor in `llmService.ts` as the seam — don't bleed provider differences upward.
- If you find an `any` cast you can't eliminate without rewriting more code than the task warrants, leave a `// TYPE-TODO: <reason>` comment and move on. Don't expand scope.
- Don't add zod or runtime validation — the typing here is for static checking only.
