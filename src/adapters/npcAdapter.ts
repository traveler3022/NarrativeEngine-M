/**
 * @refactor RF-002 (infrastructure)
 * @waves W0(advance)/W1(close)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-002
 * @see ../ports/NPCCapability.ts
 *
 * NPCAdapter — thin delegate from NPCCapability to useAppStore (npcSlice + pressureSlice).
 */

import { useAppStore } from '../store/useAppStore';
import type { NPCCapability } from '../ports/NPCCapability';

export function createNPCAdapter(): NPCCapability {
  const get = () => useAppStore.getState();

  return {
    registerNPC: (npc) => get().addNPC(npc),
    updateNPC: (id, patch) => get().updateNPC(id, patch),
    setOnStageNPCs: (ids) => get().setOnStageNpcIds(ids),
    suggestNPCs: (names, context) => get().addNpcSuggestions(names, context),
    applyPressure: (npcId, pressure) => get().applyPressurePatch(npcId, pressure),
    getNPCLedger: () => get().npcLedger,
    getOnStageNPCIds: () => get().onStageNpcIds,
  };
}
