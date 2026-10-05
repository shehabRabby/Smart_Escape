import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { BuildingData, BuildingState } from "../src/lib/building-types.ts";
import { findEvacuationRoute } from "../src/lib/routing.ts";
import { parseBuildingJson, validateBuilding } from "../src/lib/validate-building.ts";
import { createRuntimeState, toggleHazard } from "../src/lib/simulation-state.ts";

const sample = JSON.parse(readFileSync(new URL("./fixtures/tie-building.json", import.meta.url), "utf8")) as unknown;
const validated = validateBuilding(sample);
if (!validated.success) throw new Error(validated.errors.join("\n"));
const building = validated.data;
const emptyState: BuildingState = { blocked_nodes: [], blocked_edges: [], closed_exits: [] };
const contestValidation = parseBuildingJson(readFileSync(new URL("../public/sample-building.json", import.meta.url), "utf8"));
if (!contestValidation.success) throw new Error(contestValidation.errors.join("\n"));
const contest = contestValidation.data;

test("mandatory baseline R1: R1 → C1 → C2 → E1, cost 7", () => {
  const route = findEvacuationRoute(contest, "R1");
  assert.deepEqual(route?.nodeIds, ["R1", "C1", "C2", "E1"]);
  assert.equal(route?.totalCost, 7);
});

test("mandatory blocked C2: R1 → C1 → C3 → C4 → E2, cost 11", () => {
  const route = findEvacuationRoute(contest, "R1", { ...emptyState, blocked_nodes: ["C2"] });
  assert.deepEqual(route?.nodeIds, ["R1", "C1", "C3", "C4", "E2"]);
  assert.equal(route?.totalCost, 11);
});

test("mandatory closed E1 and E2: no route", () => {
  assert.equal(findEvacuationRoute(contest, "R1", { ...emptyState, closed_exits: ["E1", "E2"] }), null);
});

test("mandatory R2: R2 → C3 → C4 → E2, cost 7", () => {
  const route = findEvacuationRoute(contest, "R2");
  assert.deepEqual(route?.nodeIds, ["R2", "C3", "C4", "E2"]);
  assert.equal(route?.totalCost, 7);
});

test("mandatory blocked R1 cannot route", () => {
  assert.equal(findEvacuationRoute(contest, "R1", { ...emptyState, blocked_nodes: ["R1"] }), null);
});

test("runtime toggles are independent and reset clones the imported baseline", () => {
  const initial: BuildingState = { blocked_nodes: ["C2", "C2"], blocked_edges: ["e5"], closed_exits: ["E2"] };
  const snapshot = structuredClone(initial);
  const original = createRuntimeState(initial);
  let runtime = toggleHazard(original, "blockedNodes", "C2");
  runtime = toggleHazard(runtime, "blockedNodes", "R1");
  runtime = toggleHazard(runtime, "blockedEdges", "e5");
  runtime = toggleHazard(runtime, "closedExits", "E2");
  assert.deepEqual(runtime, { blockedNodes: ["R1"], blockedEdges: [], closedExits: [] });
  assert.deepEqual(initial, snapshot);
  assert.deepEqual(original, { blockedNodes: ["C2"], blockedEdges: ["e5"], closedExits: ["E2"] });
  const reset = createRuntimeState(initial);
  assert.deepEqual(reset, original);
  assert.notEqual(reset.blockedNodes, initial.blocked_nodes);
  assert.notEqual(reset.blockedEdges, initial.blocked_edges);
  assert.notEqual(reset.closedExits, initial.closed_exits);
});

test("sample: exit tie precedes full path tie, regardless of input order", () => {
  for (const data of [building, { ...building, nodes: [...building.nodes].reverse(), edges: [...building.edges].reverse() }]) {
    assert.deepEqual(findEvacuationRoute(data, "room-101"), {
      exitId: "exit-a", totalCost: 5,
      nodeIds: ["room-101", "hall-a", "exit-a"], edgeIds: ["e1", "e3"],
    });
  }
});

test("blocked nodes, blocked edges, closed exits, invalid starts, and unreachable exits", () => {
  assert.equal(findEvacuationRoute(building, "room-101", { ...emptyState, blocked_nodes: ["room-101"] }), null);
  assert.equal(findEvacuationRoute(building, "missing"), null);
  assert.equal(findEvacuationRoute(building, "exit-a"), null);
  assert.deepEqual(findEvacuationRoute(building, "room-101", { ...emptyState, blocked_nodes: ["hall-a"] })?.nodeIds, ["room-101", "hall-b", "exit-a"]);
  assert.deepEqual(findEvacuationRoute(building, "room-101", { ...emptyState, blocked_edges: ["e1"] })?.nodeIds, ["room-101", "hall-b", "exit-a"]);
  assert.equal(findEvacuationRoute(building, "room-101", { ...emptyState, closed_exits: ["exit-a"] })?.exitId, "exit-b");
  assert.equal(findEvacuationRoute(building, "room-101", { ...emptyState, blocked_edges: ["e1", "e2"] }), null);
});

function graph(ids: string[], exitIds: string[], links: [string, string, number][]): BuildingData {
  return {
    building: "Unseen graph",
    nodes: ids.map(id => ({ id, label: id, type: exitIds.includes(id) ? "exit" : "junction", x: 0, y: 0 })),
    edges: links.map(([from, to, cost], index) => ({ id: `edge-${index}`, from, to, cost })),
    initial_state: emptyState,
  };
}

test("compares full path rather than immediate predecessor; graph is undirected", () => {
  const data = graph(["S", "a", "z", "b", "c", "E"], ["E"], [
    ["a", "S", 1], ["a", "z", 1], ["z", "E", 1],
    ["S", "b", 1], ["b", "c", 1], ["c", "E", 1],
  ]);
  assert.deepEqual(findEvacuationRoute(data, "S")?.nodeIds, ["S", "a", "z", "E"]);
});

test("a closed exit cannot be used as an intermediate node", () => {
  const data = graph(["S", "A", "B"], ["A", "B"], [["S", "A", 1], ["A", "B", 1]]);
  assert.equal(findEvacuationRoute(data, "S", { ...emptyState, closed_exits: ["A"] }), null);
});

test("lowest cost wins before exit ID; case-sensitive lexical order", () => {
  const data = graph(["S", "a", "Z"], ["a", "Z"], [["S", "a", 2], ["S", "Z", 2]]);
  assert.equal(findEvacuationRoute(data, "S")?.exitId, "Z");
  data.edges[0].cost = 1;
  assert.equal(findEvacuationRoute(data, "S")?.exitId, "a");
});

test("validator accepts disconnected graphs and rejects malformed input", () => {
  assert.equal(validateBuilding(graph(["S", "J", "E"], ["E"], [["S", "J", 1]])).success, true);
  for (const value of [null, {}, { ...building, building: " " },
    { ...building, nodes: [...building.nodes, building.nodes[0]] },
    { ...building, edges: [...building.edges, { id: "reverse", from: "hall-a", to: "room-101", cost: 1 }] },
    { ...building, edges: [{ id: "bad", from: "missing", to: "missing", cost: 0 }] },
    { ...building, initial_state: { ...emptyState, blocked_nodes: ["exit-a"], closed_exits: ["hall-a"], blocked_edges: ["missing"] } },
    { ...building, nodes: building.nodes.map(node => ({ ...node, x: Infinity })) },
  ]) {
    const result = validateBuilding(value);
    assert.equal(result.success, false);
    if (!result.success) assert.ok(result.errors.length > 0);
  }
  assert.equal(parseBuildingJson("{invalid").success, false);
});
