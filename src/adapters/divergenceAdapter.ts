import { useAppStore } from '../store/useAppStore';
import { registerDivergence, type DivergencePort } from '../ports/divergence';

export const divergenceAdapter: DivergencePort = {
    setDivergenceRegister: (register) => useAppStore.getState().setDivergenceRegister(register),
    getDivergenceRegister: () => useAppStore.getState().divergenceRegister,
};

export function wireDivergence(): void { registerDivergence(divergenceAdapter); }
