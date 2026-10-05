import type { BuildingState } from "./building-types.ts";

export interface RuntimeState {
  blockedNodes: string[];
  blockedEdges: string[];
  closedExits: string[];
}

/** Always clone so toggles and reset cannot mutate the imported baseline. */
export function createRuntimeState(initial: BuildingState): RuntimeState {
  return {
    blockedNodes: [...new Set(initial.blocked_nodes)],
    blockedEdges: [...new Set(initial.blocked_edges)],
    closedExits: [...new Set(initial.closed_exits)],
  };
}

export function toggleHazard(state: RuntimeState, key: keyof RuntimeState, id: string): RuntimeState {
  const entries = state[key];
  return { ...state, [key]: entries.includes(id) ? entries.filter(entry => entry !== id) : [...entries, id] };
}
