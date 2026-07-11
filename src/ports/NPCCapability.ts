/**
 * @refactor RF-002 (infrastructure)
 * @waves W0(advance)/W1(close)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-002
 * @see REFACTOR-MAP.md
 *
 * NPCCapability — contract between domain services and NPC state.
 *
 * Fixes 4 domain→state violations (services importing useAppStore
 * to register/update NPCs, set on-stage, apply pressure, suggest names).
 */

import type { NPCEntry, NPCPressure } from '../types';

export interface NPCCapability {
  /** Add a new NPC to the ledger. */
  registerNPC(npc: NPCEntry): void;

  /** Patch fields on an existing NPC. */
  updateNPC(id: string, patch: Partial<NPCEntry>): void;

  /** Replace the on-stage NPC id list. */
  setOnStageNPCs(ids: string[]): void;

  /** Suggest NPC names for the GM to consider. */
  suggestNPCs(names: string[], context?: string): void;

  /** Apply a pressure delta to an NPC. */
  applyPressure(npcId: string, pressure: NPCPressure): void;

  /** Read the current NPC ledger. */
  getNPCLedger(): NPCEntry[];

  /** Read the current on-stage NPC id list. */
  getOnStageNPCIds(): string[];
}

export const npcCapability: NPCCapability = {
  registerNPC: () => throwNotWired('NPCCapability.registerNPC'),
  updateNPC: () => throwNotWired('NPCCapability.updateNPC'),
  setOnStageNPCs: () => throwNotWired('NPCCapability.setOnStageNPCs'),
  suggestNPCs: () => throwNotWired('NPCCapability.suggestNPCs'),
  applyPressure: () => throwNotWired('NPCCapability.applyPressure'),
  getNPCLedger: () => throwNotWired('NPCCapability.getNPCLedger'),
  getOnStageNPCIds: () => throwNotWired('NPCCapability.getOnStageNPCIds'),
};

export function wireNPC(impl: NPCCapability): void {
  Object.assign(npcCapability, impl);
}

function throwNotWired(method: string): never {
  throw new Error(
    `${method} called before wireNPC(). ` +
    `Ensure wireAllAdapters() runs in main.tsx before React mounts.`
  );
}
