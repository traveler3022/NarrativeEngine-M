/**
 * UIStatePort — transient UI state that services need to update.
 *
 * This is a pragmatic port: setPipelinePhase, setStreamingStats, and
 * setLastPayloadTrace are UI-only state that the turn pipeline
 * (pendingCommit, turnOrchestrator) updates as it progresses. They
 * don't belong in any domain port (Messaging, NPC, etc.) because
 * they're not domain concepts — they're presentation hints.
 *
 * In Phase 4, when pendingCommit is split, these calls should move
 * to the orchestration layer (which is UI-adjacent) and this port
 * can be removed.
 */

import type { PayloadTrace, PipelinePhase, StreamingStats } from '../types';

export interface UIStatePort {
    setPipelinePhase(phase: PipelinePhase): void;
    setStreamingStats(stats: StreamingStats | null): void;
    setLastPayloadTrace(trace?: PayloadTrace[]): void;
}

let _impl: UIStatePort | null = null;

export function registerUIState(impl: UIStatePort): void { _impl = impl; }

function impl(): UIStatePort {
    if (!_impl) throw new Error('UIStatePort not wired.');
    return _impl;
}

export const uiState: UIStatePort = {
    setPipelinePhase:     (p) => impl().setPipelinePhase(p),
    setStreamingStats:    (s) => impl().setStreamingStats(s),
    setLastPayloadTrace:  (t) => impl().setLastPayloadTrace(t),
};
