/**
 * @refactor RF-001 (infrastructure)
 * @waves W0(advance)/W1(close)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-001
 * @see ../ports/MessagingPort.ts
 *
 * MessagingAdapter — thin delegate from MessagingPort to useAppStore (chatSlice).
 *
 * Rules (per 2.6 Adapter Design):
 * - No business logic. Every method is `store.method()`.
 * - No imports of other adapters.
 * - May import store + ports + pure utilities.
 */

import { useAppStore } from '../store/useAppStore';
import type { MessagingPort } from '../ports/MessagingPort';

export function createMessagingAdapter(): MessagingPort {
  const get = () => useAppStore.getState();

  return {
    appendMessage: (msg) => get().addMessage(msg),
    updateLastAssistant: (content) => get().updateLastAssistant(content),
    updateLastMessage: (patch) => get().updateLastMessage(patch),
    attachImage: (messageId, image) => get().setMessageImage(messageId, image),
    condenseHistory: (upToIndex) => get().setCondensed(upToIndex),
    replaceMessages: (messages) => useAppStore.setState({ messages }),
    setStreaming: (v) => get().setStreaming(v),
    getMessages: () => get().messages,
    getCondenserState: () => get().condenser,
    getMessageById: (id) => get().messages.find((m) => m.id === id),
  };
}
