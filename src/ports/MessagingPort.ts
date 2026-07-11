/**
 * @refactor RF-001 (infrastructure)
 * @waves W0(advance)/W1(close)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-001
 * @see REFACTOR-MAP.md
 *
 * MessagingPort — contract between domain services and chat state.
 *
 * Fixes 9 domain→state violations (services importing useAppStore
 * to append/update messages, manage streaming, condense history).
 *
 * Adapters live in src/adapters/messagingAdapter.ts.
 * Wiring happens in src/main.tsx via wireAllAdapters().
 */

import type { ChatMessage, CondenserState } from '../types';

export interface MessagingPort {
  /** Append a message to the chat history. */
  appendMessage(msg: ChatMessage): void;

  /** Update the last assistant message's content (streaming). */
  updateLastAssistant(content: string): void;

  /** Patch an arbitrary field on the last message. */
  updateLastMessage(patch: Partial<ChatMessage>): void;

  /** Attach an image to an existing message. */
  attachImage(messageId: string, image: ChatMessage['image']): void;

  /** Mark history as condensed up to (and including) the given index. */
  condenseHistory(upToIndex: number): void;

  /** Replace the entire message list (used by pendingCommit on rollback). */
  replaceMessages(messages: ChatMessage[]): void;

  /** Toggle the streaming flag. */
  setStreaming(v: boolean): void;

  /** Read the current message list. */
  getMessages(): ChatMessage[];

  /** Read the current condenser state. */
  getCondenserState(): CondenserState;

  /** Look up a single message by id. */
  getMessageById(id: string): ChatMessage | undefined;
}

/**
 * Singleton handle. The actual implementation is wired in main.tsx
 * via `wireMessaging()`. Services import `messagingPort` and call
 * methods on it — they never import the store directly.
 *
 * Before wiring, calls throw a clear error rather than silently no-op'ing.
 */
export const messagingPort: MessagingPort = {
  appendMessage: () => throwNotWired('MessagingPort.appendMessage'),
  updateLastAssistant: () => throwNotWired('MessagingPort.updateLastAssistant'),
  updateLastMessage: () => throwNotWired('MessagingPort.updateLastMessage'),
  attachImage: () => throwNotWired('MessagingPort.attachImage'),
  condenseHistory: () => throwNotWired('MessagingPort.condenseHistory'),
  replaceMessages: () => throwNotWired('MessagingPort.replaceMessages'),
  setStreaming: () => throwNotWired('MessagingPort.setStreaming'),
  getMessages: () => throwNotWired('MessagingPort.getMessages'),
  getCondenserState: () => throwNotWired('MessagingPort.getCondenserState'),
  getMessageById: () => throwNotWired('MessagingPort.getMessageById'),
};

/** Internal: called by wireMessaging() to install the real implementation. */
export function wireMessaging(impl: MessagingPort): void {
  Object.assign(messagingPort, impl);
}

function throwNotWired(method: string): never {
  throw new Error(
    `${method} called before wireMessaging(). ` +
    `Ensure wireAllAdapters() runs in main.tsx before React mounts.`
  );
}
