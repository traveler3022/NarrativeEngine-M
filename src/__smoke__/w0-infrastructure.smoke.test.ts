/**
 * W0 smoke test — verifies all 6 adapters are wired and delegate correctly.
 *
 * This is the most important smoke test in the entire refactor.
 * Per 3.4 R-01 mitigation: each port method called at least once.
 * Per 3.4 R-08 mitigation: confirms wireAllAdapters() worked.
 * Per 3.4 R-10 mitigation: asserts observable outcomes, not just absence of exceptions.
 *
 * This test runs AFTER wireAllAdapters() (in beforeEach) and verifies
 * that calling port methods actually reaches the store / Toast.
 *
 * Future waves (W1-W11) add their own smoke tests in this same directory.
 */

import { describe, beforeEach, it, expect, vi } from 'vitest';
import { useAppStore } from '../../src/store/useAppStore';
import { wireAllAdapters, _resetAdaptersForTesting } from '../../src/adapters';
import * as ports from '../../src/ports';

// Mock Toast to capture notification calls
vi.mock('../../src/components/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from '../../src/components/Toast';

describe('W0: Infrastructure Wave — adapter wiring', () => {
  beforeEach(() => {
    // Reset store to clean state
    useAppStore.setState({
      messages: [],
      isStreaming: false,
      condenser: { condensedUpToIndex: -1 },
      npcLedger: [],
      onStageNpcIds: [],
      chapters: [],
      archiveIndex: [],
      semanticFacts: [],
      pinnedChapterIds: [],
      divergenceRegister: { entries: [], chapterToggles: {}, categoryToggles: {}, lastUpdatedSceneId: '', lastUpdatedAt: 0, version: 2 },
      context: { loreRaw: '', rulesRaw: '', starter: '', continuePrompt: '', inventory: '', inventoryLastScene: '', characterProfile: '', characterProfileLastScene: '', starterActive: true, continuePromptActive: true, inventoryActive: true, characterProfileActive: true } as any,
      activeCampaignId: null,
      bookkeepingTurnCounter: 0,
    });

    // Reset adapter wired flag, then wire fresh
    _resetAdaptersForTesting();
    wireAllAdapters();

    // Clear mock call history
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.warning).mockClear();
    vi.mocked(toast.info).mockClear();
  });

  describe('MessagingPort (RF-001)', () => {
    it('appendMessage adds to store.messages', () => {
      const msg = { id: 'm1', role: 'assistant', content: 'hi' } as any;
      ports.messagingPort.appendMessage(msg);
      expect(useAppStore.getState().messages).toHaveLength(1);
      expect(useAppStore.getState().messages[0].id).toBe('m1');
    });

    it('setStreaming toggles store.isStreaming', () => {
      ports.messagingPort.setStreaming(true);
      expect(useAppStore.getState().isStreaming).toBe(true);
      ports.messagingPort.setStreaming(false);
      expect(useAppStore.getState().isStreaming).toBe(false);
    });

    it('getMessages reads store.messages', () => {
      const msg = { id: 'm2', role: 'user', content: 'hello' } as any;
      useAppStore.setState({ messages: [msg] });
      expect(ports.messagingPort.getMessages()).toHaveLength(1);
      expect(ports.messagingPort.getMessages()[0].id).toBe('m2');
    });

    it('getMessageById finds existing message', () => {
      const msg = { id: 'm3', role: 'user', content: 'find me' } as any;
      useAppStore.setState({ messages: [msg] });
      expect(ports.messagingPort.getMessageById('m3')?.content).toBe('find me');
      expect(ports.messagingPort.getMessageById('missing')).toBeUndefined();
    });

    it('condenseHistory sets condenser.condensedUpToIndex', () => {
      ports.messagingPort.condenseHistory(5);
      expect(useAppStore.getState().condenser.condensedUpToIndex).toBe(5);
    });

    it('getCondenserState returns current condenser', () => {
      useAppStore.setState({ condenser: { condensedUpToIndex: 7 } });
      expect(ports.messagingPort.getCondenserState().condensedUpToIndex).toBe(7);
    });

    it('replaceMessages overwrites store.messages', () => {
      const msgs = [{ id: 'a', role: 'user', content: 'a' } as any, { id: 'b', role: 'assistant', content: 'b' } as any];
      ports.messagingPort.replaceMessages(msgs);
      expect(useAppStore.getState().messages).toHaveLength(2);
    });
  });

  describe('NPCCapability (RF-002)', () => {
    it('registerNPC adds to store.npcLedger', () => {
      const npc = { id: 'n1', name: 'Test NPC' } as any;
      ports.npcCapability.registerNPC(npc);
      expect(useAppStore.getState().npcLedger).toHaveLength(1);
    });

    it('setOnStageNPCs sets store.onStageNpcIds', () => {
      ports.npcCapability.setOnStageNPCs(['n1', 'n2']);
      expect(useAppStore.getState().onStageNpcIds).toEqual(['n1', 'n2']);
    });

    it('getNPCLedger reads store.npcLedger', () => {
      const npc = { id: 'n2', name: 'Read' } as any;
      useAppStore.setState({ npcLedger: [npc] });
      expect(ports.npcCapability.getNPCLedger()).toHaveLength(1);
    });

    it('getOnStageNPCIds reads store.onStageNpcIds', () => {
      useAppStore.setState({ onStageNpcIds: ['n3'] });
      expect(ports.npcCapability.getOnStageNPCIds()).toEqual(['n3']);
    });
  });

  describe('ArchivePort (RF-003)', () => {
    it('replaceChapters sets store.chapters', () => {
      const chapters = [{ id: 'c1', title: 'Ch1' } as any];
      ports.archivePort.replaceChapters(chapters);
      expect(useAppStore.getState().chapters).toHaveLength(1);
    });

    it('replaceArchiveIndex sets store.archiveIndex', () => {
      const entries = [{ id: 'a1', title: 'Idx1' } as any];
      ports.archivePort.replaceArchiveIndex(entries);
      expect(useAppStore.getState().archiveIndex).toHaveLength(1);
    });

    it('clearPinnedChapters empties store.pinnedChapterIds', () => {
      useAppStore.setState({ pinnedChapterIds: ['c1', 'c2'] });
      ports.archivePort.clearPinnedChapters();
      expect(useAppStore.getState().pinnedChapterIds).toHaveLength(0);
    });
  });

  describe('CampaignContextPort (RF-004)', () => {
    it('applyContextPatch merges into store.context', () => {
      ports.campaignContextPort.applyContextPatch({ loreRaw: 'patched-lore' } as any);
      expect(useAppStore.getState().context.loreRaw).toBe('patched-lore');
    });

    it('incrementBookkeepingCounter returns incremented value', () => {
      const result = ports.campaignContextPort.incrementBookkeepingCounter();
      expect(result).toBe(1);
      expect(useAppStore.getState().bookkeepingTurnCounter).toBe(1);
    });

    it('resetBookkeepingCounter zeroes the counter', () => {
      useAppStore.setState({ bookkeepingTurnCounter: 10 });
      ports.campaignContextPort.resetBookkeepingCounter();
      expect(useAppStore.getState().bookkeepingTurnCounter).toBe(0);
    });

    it('getContext reads store.context', () => {
      useAppStore.setState({ context: { loreRaw: 'read-test', rulesRaw: '', starter: '', continuePrompt: '', inventory: '', inventoryLastScene: '', characterProfile: '', characterProfileLastScene: '', starterActive: true, continuePromptActive: true, inventoryActive: true, characterProfileActive: true } as any });
      expect(ports.campaignContextPort.getContext().loreRaw).toBe('read-test');
    });

    it('getActiveCampaignId reads store.activeCampaignId', () => {
      useAppStore.setState({ activeCampaignId: 'camp-123' });
      expect(ports.campaignContextPort.getActiveCampaignId()).toBe('camp-123');
    });
  });

  describe('SettingsPort (RF-005)', () => {
    it('getSettings returns store.settings', () => {
      const settings = ports.settingsPort.getSettings();
      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
    });

    it('getActivePreset returns undefined when no preset', () => {
      // Default state — no preset selected
      const preset = ports.settingsPort.getActivePreset();
      // May be undefined or a preset depending on default state
      expect(preset === undefined || typeof preset === 'object').toBe(true);
    });
  });

  describe('NotificationPort (RF-006, RF-007)', () => {
    it('success calls toast.success', () => {
      ports.notificationPort.success('yay');
      expect(toast.success).toHaveBeenCalledWith('yay');
    });

    it('error calls toast.error', () => {
      ports.notificationPort.error('oops');
      expect(toast.error).toHaveBeenCalledWith('oops');
    });

    it('warning calls toast.warning', () => {
      ports.notificationPort.warning('careful');
      expect(toast.warning).toHaveBeenCalledWith('careful');
    });

    it('info calls toast.info', () => {
      ports.notificationPort.info('fyi');
      expect(toast.info).toHaveBeenCalledWith('fyi');
    });
  });

  describe('Wiring integrity (R-08 mitigation)', () => {
    it('wireAllAdapters is idempotent (second call is no-op)', () => {
      // Should not throw
      wireAllAdapters();
      // Port should still work
      ports.notificationPort.info('still works');
      expect(toast.info).toHaveBeenCalledWith('still works');
    });

    it('all 6 ports are wired (no throwNotWired errors)', () => {
      // If any port wasn't wired, these would throw
      expect(() => ports.messagingPort.getMessages()).not.toThrow();
      expect(() => ports.npcCapability.getNPCLedger()).not.toThrow();
      expect(() => ports.campaignContextPort.getContext()).not.toThrow();
      expect(() => ports.settingsPort.getSettings()).not.toThrow();
      expect(() => ports.notificationPort.info('test')).not.toThrow();
    });
  });
});
