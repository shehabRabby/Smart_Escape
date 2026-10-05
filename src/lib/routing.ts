import type { BuildingData, BuildingState, EvacuationRoute } from "./building-types.ts";

/** Case-sensitive UTF-16 lexical ordering, independent of browser locale. */
function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePaths(left: string[], right: string[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    const order = compareIds(left[index], right[index]);
    if (order !== 0) return order;
  }
  return left.length - right.length;
}

interface Label {
  cost: bigint;
  nodeIds: string[];
  edgeIds: string[];
}

function compareLabels(left: Label, right: Label): number {
  return left.cost < right.cost ? -1 : left.cost > right.cost ? 1 : comparePaths(left.nodeIds, right.nodeIds);
}

/** Call with validated building data. Returns null for invalid starts or no reachable exit. */
export function findEvacuationRoute(
  building: BuildingData,
  startId: string,
  state: BuildingState = building.initial_state,
): EvacuationRoute | null {
  const excluded = new Set([...state.blocked_nodes, ...state.closed_exits]);
  const blockedEdges = new Set(state.blocked_edges);
  const start = building.nodes.find(node => node.id === startId);
  if (!start || start.type === "exit" || excluded.has(startId)) return null;

  const adjacency = new Map<string, { nodeId: string; edgeId: string; cost: number }[]>();
  for (const node of building.nodes) if (!excluded.has(node.id)) adjacency.set(node.id, []);
  for (const edge of building.edges) {
    if (blockedEdges.has(edge.id) || excluded.has(edge.from) || excluded.has(edge.to)) continue;
    adjacency.get(edge.from)?.push({ nodeId: edge.to, edgeId: edge.id, cost: edge.cost });
    adjacency.get(edge.to)?.push({ nodeId: edge.from, edgeId: edge.id, cost: edge.cost });
  }

  const labels = new Map<string, Label>([[startId, { cost: 0n, nodeIds: [startId], edgeIds: [] }]]);
  const settled = new Set<string>();
  // Linear minimum selection is small and predictable for at most 60 nodes.
  while (true) {
    let currentId: string | undefined;
    let current: Label | undefined;
    for (const [id, label] of labels) {
      if (!settled.has(id) && (!current || compareLabels(label, current) < 0)) {
        currentId = id;
        current = label;
      }
    }
    if (currentId === undefined || current === undefined) break;
    settled.add(currentId);
    for (const neighbor of adjacency.get(currentId) ?? []) {
      if (settled.has(neighbor.nodeId)) continue;
      const candidate: Label = {
        cost: current.cost + BigInt(neighbor.cost),
        nodeIds: [...current.nodeIds, neighbor.nodeId],
        edgeIds: [...current.edgeIds, neighbor.edgeId],
      };
      const previous = labels.get(neighbor.nodeId);
      if (!previous || compareLabels(candidate, previous) < 0) labels.set(neighbor.nodeId, candidate);
    }
  }

  let best: { exitId: string; label: Label } | undefined;
  for (const node of building.nodes) {
    if (node.type !== "exit" || excluded.has(node.id)) continue;
    const label = labels.get(node.id);
    if (label && (!best || label.cost < best.label.cost || (label.cost === best.label.cost && compareIds(node.id, best.exitId) < 0))) best = { exitId: node.id, label };
  }
  if (!best) return null;
  // Internal bigint arithmetic keeps comparisons exact even for very large costs.
  if (best.label.cost > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("Route total exceeds JavaScript's safe integer range.");
  return { exitId: best.exitId, totalCost: Number(best.label.cost), nodeIds: best.label.nodeIds, edgeIds: best.label.edgeIds };
}
