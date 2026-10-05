import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { BuildingData, BuildingNode, BuildingState, EvacuationRoute } from "../src/lib/building-types.ts";
import { validateBuilding, parseBuildingJson } from "../src/lib/validate-building.ts";
import { findEvacuationRoute } from "../src/lib/routing.ts";
import { fitCoordinates } from "../src/lib/map-geometry.ts";
import { parseThemePreference, resolveTheme } from "../src/lib/theme.ts";

const parsed = parseBuildingJson(readFileSync(new URL("../public/sample-building.json", import.meta.url), "utf8"));
if (!parsed.success) throw new Error(parsed.errors.join("\n"));
const sample = parsed.data;
const empty: BuildingState = { blocked_nodes: [], blocked_edges: [], closed_exits: [] };

function invalid(value: unknown, field: string) {
  const result = validateBuilding(value);
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.errors.some(error => error.includes(field)), result.errors.join("\n"));
}

test("validator checks every node field, counts, and required node categories", () => {
  invalid({ ...sample, building: "\t " }, "building");
  for (const [key, value] of [["id", ""], ["label", " "], ["type", "stairs"], ["x", "1"], ["y", NaN], ["x", Infinity]] as const) {
    const data = structuredClone(sample);
    const nodes: unknown[] = [...data.nodes];
    nodes[0] = { ...data.nodes[0], [key]: value };
    invalid({ ...data, nodes }, `nodes[0].${key}`);
  }
  invalid({ ...sample, nodes: [null, ...sample.nodes.slice(1)] }, "nodes[0]");
  invalid({ ...sample, nodes: [sample.nodes[0]] }, "nodes");
  invalid({ ...sample, nodes: Array.from({ length: 61 }, () => sample.nodes[0]) }, "nodes");
  invalid({ ...sample, nodes: sample.nodes.map(node => ({ ...node, type: "exit" })) }, "room or junction");
  invalid({ ...sample, nodes: sample.nodes.map(node => ({ ...node, type: "room" })) }, "exit");
  invalid({ ...sample, nodes: [...sample.nodes, sample.nodes[0]] }, "duplicates node ID");
});

test("validator checks all edge constraints and initial-state references", () => {
  for (const [key, value] of [["id", ""], ["from", "r1"], ["to", 12], ["cost", 0], ["cost", -2], ["cost", 1.2], ["cost", Infinity], ["cost", Number.MAX_SAFE_INTEGER + 1]] as const) {
    const edges: unknown[] = [...sample.edges];
    edges[0] = { ...sample.edges[0], [key]: value };
    invalid({ ...sample, edges }, `edges[0].${key}`);
  }
  invalid({ ...sample, edges: [] }, "edges");
  invalid({ ...sample, edges: Array.from({ length: 151 }, () => sample.edges[0]) }, "edges");
  invalid({ ...sample, edges: [...sample.edges, { ...sample.edges[0], from: "C1", to: "R1" }] }, "duplicates edge ID");
  invalid({ ...sample, edges: [...sample.edges, { ...sample.edges[0], id: "reverse", from: "C1", to: "R1" }] }, "node pair");
  invalid({ ...sample, edges: [{ ...sample.edges[0], to: "R1" }] }, "self-loop");
  for (const [key, ids] of [["blocked_nodes", ["missing"]], ["blocked_nodes", ["E1"]], ["blocked_edges", ["missing"]], ["closed_exits", ["R1"]], ["closed_exits", ["missing"]], ["blocked_nodes", [null]]] as const) {
    invalid({ ...sample, initial_state: { ...empty, [key]: ids } }, `initial_state.${key}[0]`);
  }
  invalid({ ...sample, initial_state: { ...empty, blocked_edges: "e1" } }, "initial_state.blocked_edges");
  invalid({ ...sample, initial_state: null }, "initial_state");
});

test("validator handles malformed structures and prototype-like IDs without mutation", () => {
  for (const value of [null, [], true, 15, "text", { nodes: null, edges: {}, initial_state: [] }, JSON.parse('{"__proto__":{"polluted":true}}')]) assert.equal(validateBuilding(value).success, false);
  assert.equal(parseBuildingJson("{" + "\"x\":".repeat(20)).success, false);
  const data = structuredClone(sample);
  data.nodes[0].id = "__proto__";
  data.edges[0].from = "__proto__";
  const before = JSON.stringify(data);
  const result = validateBuilding(data);
  assert.equal(result.success, true);
  if (result.success) assert.equal(findEvacuationRoute(result.data, "__proto__")?.totalCost, 7);
  assert.equal(JSON.stringify(data), before);
  const huge = { ...sample, nodes: new Array(100_000).fill(null) };
  invalid(huge, "nodes");
  const invalidState = validateBuilding({ ...sample, initial_state: { ...empty, blocked_nodes: new Array(100_000).fill("missing") } });
  assert.equal(invalidState.success, false);
  if (!invalidState.success) { assert.equal(invalidState.errors.length, 101); assert.ok(invalidState.errors.at(-1)?.includes("stopped after 100 errors")); }
});

test("60-node long path and 150-edge graph meet the allowed boundaries", () => {
  const nodes: BuildingNode[] = Array.from({ length: 60 }, (_, index) => ({ id: `N${index}`, label: `Location ${index}`, type: index === 59 ? "exit" : "junction", x: index, y: 0 }));
  const edges = nodes.slice(1).map((node, index) => ({ id: `e${index}`, from: nodes[index].id, to: node.id, cost: 1 }));
  const data: BuildingData = { building: "Long path", nodes, edges, initial_state: empty };
  assert.equal(validateBuilding(data).success, true);
  assert.equal(findEvacuationRoute(data, "N0")?.totalCost, 59);
  assert.equal(findEvacuationRoute(data, "N0")?.nodeIds.length, 60);
  const pairs = new Set(edges.map(edge => JSON.stringify([edge.from, edge.to].sort())));
  for (let a = 0; a < 60 && edges.length < 150; a++) for (let b = a + 1; b < 60 && edges.length < 150; b++) {
    const pair = JSON.stringify([nodes[a].id, nodes[b].id].sort());
    if (!pairs.has(pair)) { pairs.add(pair); edges.push({ id: `e${edges.length}`, from: nodes[a].id, to: nodes[b].id, cost: 100 }); }
  }
  assert.equal(edges.length, 150);
  assert.equal(validateBuilding(data).success, true);
  assert.equal(findEvacuationRoute(data, "N0")?.totalCost, 59);
});

test("route totals use exact comparisons and fail gracefully above safe numeric output", () => {
  const data = structuredClone(sample);
  data.edges.forEach(edge => { edge.cost = Number.MAX_SAFE_INTEGER; });
  assert.throws(() => findEvacuationRoute(data, "R1"), RangeError);
  assert.equal(findEvacuationRoute(sample, "R1", { ...empty, blocked_nodes: ["C1"] }), null);
  const snapshot = JSON.stringify(sample);
  findEvacuationRoute(sample, "R1");
  assert.equal(JSON.stringify(sample), snapshot);
});

function comparePaths(a: string[], b: string[]) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return a.length - b.length;
}

// Exhaustive simple-path enumeration is independent of Dijkstra and only used for tiny test graphs.
function oracle(data: BuildingData, state: BuildingState): EvacuationRoute | null {
  const excluded = new Set([...state.blocked_nodes, ...state.closed_exits]);
  if (excluded.has("S")) return null;
  const candidates: EvacuationRoute[] = [];
  function visit(id: string, path: string[], edgeIds: string[], cost: number) {
    if (data.nodes.find(node => node.id === id)?.type === "exit") candidates.push({ exitId: id, nodeIds: path, edgeIds, totalCost: cost });
    for (const edge of data.edges) {
      const next = edge.from === id ? edge.to : edge.to === id ? edge.from : undefined;
      if (next === undefined || excluded.has(next) || state.blocked_edges.includes(edge.id) || path.includes(next)) continue;
      visit(next, [...path, next], [...edgeIds, edge.id], cost + edge.cost);
    }
  }
  visit("S", ["S"], [], 0);
  candidates.sort((a, b) => a.totalCost - b.totalCost || (a.exitId < b.exitId ? -1 : a.exitId > b.exitId ? 1 : comparePaths(a.nodeIds, b.nodeIds)));
  return candidates[0] ?? null;
}

test("Dijkstra matches an exhaustive oracle across 120 seeded cyclic graphs and declaration permutations", () => {
  let seed = 123456;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const ids = ["S", "a", "A", "b", "z", "E", "e"];
  for (let run = 0; run < 120; run++) {
    const data: BuildingData = { building: "Oracle graph", nodes: ids.map((id, index) => ({ id, label: id, type: index >= 5 ? "exit" : "junction", x: index, y: 0 })), edges: [], initial_state: empty };
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) if (random() < .4) data.edges.push({ id: `edge-${a}-${b}`, from: ids[a], to: ids[b], cost: 1 + Math.floor(random() * 4) });
    if (!data.edges.length) data.edges.push({ id: "fallback", from: "S", to: "E", cost: 1 });
    const state: BuildingState = { blocked_nodes: ids.slice(0, 5).filter(() => random() < .12), blocked_edges: data.edges.filter(() => random() < .12).map(edge => edge.id), closed_exits: ids.slice(5).filter(() => random() < .2) };
    const expected = oracle(data, state);
    assert.deepEqual(findEvacuationRoute(data, "S", state), expected, `graph ${run}`);
    const reversed = { ...data, nodes: [...data.nodes].reverse(), edges: [...data.edges].reverse().map(edge => ({ ...edge, from: edge.to, to: edge.from })) };
    assert.deepEqual(findEvacuationRoute(reversed, "S", state), expected, `permuted graph ${run}`);
  }
});

test("coordinate fitting is finite, padded and stable for degenerate and mixed extreme ranges", () => {
  for (const coords of [[[0, 0], [0, 0]], [[1e308, 1], [1e308, 2]], [[1e308, 1e-12], [1e308, 2e-12]], [[-1e308, -1e308], [1e308, 1e308]], [[1e-320, 0], [2e-320, 1e-320]], [[-800, -200], [-600, 500]]]) {
    const nodes = coords.map(([x, y], i) => ({ id: String(i), label: String(i), type: "junction" as const, x, y }));
    for (const point of fitCoordinates(nodes).values()) {
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
      assert.ok(point.x >= 119 && point.x <= 881 && point.y >= 99 && point.y <= 481);
    }
  }
  assert.equal(fitCoordinates([]).size, 0);
});

test("theme preferences default safely and resolve system preference", () => {
  for (const input of [null, undefined, "broken", {}, "system"]) assert.equal(parseThemePreference(input), "system");
  assert.equal(parseThemePreference("dark"), "dark");
  assert.equal(parseThemePreference("light"), "light");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
});
