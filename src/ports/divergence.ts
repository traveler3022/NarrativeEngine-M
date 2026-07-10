/**
 * DivergencePort — state access for the canon-divergence register.
 *
 * pendingCommit.ts used to read/write divergenceRegister directly via
 * useAppStore.getState() — a services → store leak. Persistence (saving
 * the register to storage) goes through CampaignRepositoryPort, same as
 * campaign state — this port is in-memory state only.
 */

import type { DivergenceRegister } from '../types';

export interface DivergencePort {
    setDivergenceRegister(register: DivergenceRegister): void;
    getDivergenceRegister(): DivergenceRegister;
}

let _impl: DivergencePort | null = null;

export function registerDivergence(impl: DivergencePort): void { _impl = impl; }

function impl(): DivergencePort {
    if (!_impl) throw new Error('DivergencePort not wired. Call registerDivergence() from app bootstrap.');
    return _impl;
}

export const divergence: DivergencePort = {
    setDivergenceRegister: (register) => impl().setDivergenceRegister(register),
    getDivergenceRegister: () => impl().getDivergenceRegister(),
};
