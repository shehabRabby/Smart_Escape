import type { BuildingData, BuildingEdge, BuildingNode, BuildingState } from "./building-types.ts";

export type ValidationResult =
  | { success: true; data: BuildingData }
  | { success: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Validates unknown browser imports without modifying IDs or the input. */
export function validateBuilding(value: unknown): ValidationResult {
  if (!isRecord(value)) return { success: false, errors: ["Building data must be a JSON object."] };
  const errors: string[] = [];
  if (!isNonEmptyString(value.building)) errors.push("building must be a non-empty string.");
  // Reject invalid graph sizes before iterating attacker-controlled arrays.
  const invalidNodeCount = Array.isArray(value.nodes) && (value.nodes.length < 2 || value.nodes.length > 60);
  const invalidEdgeCount = Array.isArray(value.edges) && (value.edges.length < 1 || value.edges.length > 150);
  if (invalidNodeCount) errors.push("nodes must contain 2–60 entries.");
  if (invalidEdgeCount) errors.push("edges must contain 1–150 entries.");
  if (invalidNodeCount || invalidEdgeCount) return { success: false, errors };
  const nodes: BuildingNode[] = [];
  const edges: BuildingEdge[] = [];
  const nodeById = new Map<string, BuildingNode>();
  const edgeIds = new Set<string>();
  const pairs = new Set<string>();

  if (!Array.isArray(value.nodes)) errors.push("nodes must be an array.");
  else {
    value.nodes.forEach((entry: unknown, index: number) => {
      const path = `nodes[${index}]`;
      if (!isRecord(entry)) { errors.push(`${path} must be an object.`); return; }
      const { id, label, type, x, y } = entry;
      if (!isNonEmptyString(id)) errors.push(`${path}.id must be a non-empty string.`);
      else if (nodeById.has(id)) errors.push(`${path}.id duplicates node ID "${id}".`);
      if (!isNonEmptyString(label)) errors.push(`${path}.label must be a non-empty string.`);
      if (type !== "room" && type !== "junction" && type !== "exit") errors.push(`${path}.type must be room, junction, or exit.`);
      if (typeof x !== "number" || !Number.isFinite(x)) errors.push(`${path}.x must be a finite number.`);
      if (typeof y !== "number" || !Number.isFinite(y)) errors.push(`${path}.y must be a finite number.`);
      if (isNonEmptyString(id) && isNonEmptyString(label) && (type === "room" || type === "junction" || type === "exit") && typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y)) {
        const node: BuildingNode = { id, label, type, x, y };
        nodes.push(node);
        nodeById.set(id, node);
      }
    });
    if (!nodes.some(node => node.type !== "exit")) errors.push("At least one room or junction is required.");
    if (!nodes.some(node => node.type === "exit")) errors.push("At least one exit is required.");
  }

  if (!Array.isArray(value.edges)) errors.push("edges must be an array.");
  else {
    value.edges.forEach((entry: unknown, index: number) => {
      const path = `edges[${index}]`;
      if (!isRecord(entry)) { errors.push(`${path} must be an object.`); return; }
      const { id, from, to, cost } = entry;
      if (!isNonEmptyString(id)) errors.push(`${path}.id must be a non-empty string.`);
      else { if (edgeIds.has(id)) errors.push(`${path}.id duplicates edge ID "${id}".`); edgeIds.add(id); }
      if (typeof from !== "string" || !nodeById.has(from)) errors.push(`${path}.from must reference an existing node ID.`);
      if (typeof to !== "string" || !nodeById.has(to)) errors.push(`${path}.to must reference an existing node ID.`);
      if (typeof from === "string" && typeof to === "string") {
        if (from === to) errors.push(`${path} cannot be a self-loop.`);
        const pair = JSON.stringify(from < to ? [from, to] : [to, from]);
        if (pairs.has(pair)) errors.push(`${path} repeats an undirected node pair.`);
        pairs.add(pair);
      }
      if (typeof cost !== "number" || !Number.isSafeInteger(cost) || cost <= 0) errors.push(`${path}.cost must be a positive safe integer.`);
      if (isNonEmptyString(id) && typeof from === "string" && typeof to === "string" && typeof cost === "number") edges.push({ id, from, to, cost });
    });
  }

  const state: BuildingState = { blocked_nodes: [], blocked_edges: [], closed_exits: [] };
  if (!isRecord(value.initial_state)) errors.push("initial_state must be an object.");
  else {
    for (const key of ["blocked_nodes", "blocked_edges", "closed_exits"] as const) {
      const entries = value.initial_state[key];
      if (!Array.isArray(entries)) { errors.push(`initial_state.${key} must be an array of IDs.`); continue; }
      for (let index = 0; index < entries.length; index++) {
        // Bound the error list and stop scanning pathological invalid state arrays.
        if (errors.length >= 100) return { success: false, errors: [...errors.slice(0, 100), "Validation stopped after 100 errors. Fix the reported fields and re-import."] };
        const id: unknown = entries[index];
        const path = `initial_state.${key}[${index}]`;
        if (typeof id !== "string") { errors.push(`${path} must be a string ID.`); continue; }
        if (key === "blocked_edges") {
          if (!edgeIds.has(id)) errors.push(`${path} references unknown edge "${id}".`);
        } else {
          const node = nodeById.get(id);
          if (!node) errors.push(`${path} references unknown node "${id}".`);
          else if (key === "blocked_nodes" && node.type === "exit") errors.push(`${path} must reference a room or junction; use closed_exits for exits.`);
          else if (key === "closed_exits" && node.type !== "exit") errors.push(`${path} must reference an exit.`);
        }
        state[key].push(id);
      }
    }
  }
  if (errors.length) return { success: false, errors };
  return { success: true, data: { building: value.building as string, nodes, edges, initial_state: state } };
}

export function parseBuildingJson(text: string): ValidationResult {
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { return { success: false, errors: ["The file is not valid JSON."] }; }
  return validateBuilding(value);
}
