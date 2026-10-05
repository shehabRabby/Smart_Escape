"use client";

import { useId } from "react";
import type { BuildingData, BuildingState, EvacuationRoute } from "@/lib/building-types";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLanguage } from "./language-provider";

interface BuildingMapProps {
  building: BuildingData;
  state: BuildingState;
  startId: string;
  route: EvacuationRoute | null;
  onSelectStart: (id: string) => void;
}

/** Uniform fitting preserves supplied geometry, including negative/extreme finite coordinates. */
function fitCoordinates(building: BuildingData) {
  const magnitude = Math.max(...building.nodes.flatMap(node => [Math.abs(node.x), Math.abs(node.y)])) || 1;
  const xs = building.nodes.map(node => node.x / magnitude);
  const ys = building.nodes.map(node => node.y / magnitude);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX, spanY = Math.max(...ys) - minY;
  const scale = spanX === 0 && spanY === 0 ? 1 : Math.min(spanX > 0 ? 760 / spanX : Infinity, spanY > 0 ? 380 / spanY : Infinity);
  return new Map(building.nodes.map((node, index) => [node.id, {
    x: 120 + (760 - spanX * scale) / 2 + (xs[index] - minX) * scale,
    y: 100 + (380 - spanY * scale) / 2 + (ys[index] - minY) * scale,
  }]));
}
function compactLabel(label: string): string { return label.length > 22 ? `${label.slice(0, 21)}…` : label; }

export function BuildingMap({ building, state, startId, route, onSelectStart }: BuildingMapProps) {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const patternId = useId().replace(/:/g, "");
  const positions = fitCoordinates(building);
  const blockedNodes = new Set(state.blocked_nodes);
  const closedExits = new Set(state.closed_exits);
  const blockedEdges = new Set(state.blocked_edges);
  const routeEdges = new Set(route?.edgeIds ?? []);
  const routeNodes = new Set(route?.nodeIds ?? []);
  const unavailable = (id: string) => blockedNodes.has(id) || closedExits.has(id);

  return <svg className="building-svg" viewBox="0 0 1000 620" role="group" aria-label={t("mapDescription", { building: building.building })}>
    <defs><pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#cbd5df" opacity=".65" /></pattern></defs>
    <rect width="1000" height="620" fill={`url(#${patternId})`} />
    <g aria-label={t("corridors")}>{building.edges.map(edge => {
      const from = positions.get(edge.from)!, to = positions.get(edge.to)!;
      const blocked = blockedEdges.has(edge.id) || unavailable(edge.from) || unavailable(edge.to);
      const active = routeEdges.has(edge.id) && !blocked;
      return <g key={edge.id} className={`map-edge ${blocked ? "unavailable" : active ? "active" : ""} ${blockedEdges.has(edge.id) ? "blocked-edge" : ""}`}>
        <title>{`${edge.id}: ${edge.from} ↔ ${edge.to}; ${t("cost", { cost: edge.cost })}${blocked ? `; ${t("unavailable")}` : active ? `; ${t("activeRoute")}` : ""}`}</title>
        <AnimatePresence initial={false}>{active && <motion.line key="route-glow" x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="route-underlay" initial={{ opacity: 0 }} animate={{ opacity: .1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .18 }} />}</AnimatePresence>
        <motion.line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="corridor-line" animate={{ opacity: active && !reduced ? [.7, 1] : 1 }} transition={{ duration: reduced ? 0 : .18 }} />
      </g>;
    })}</g>
    <g aria-label={t("corridorCosts")}>{building.edges.map(edge => {
      const from = positions.get(edge.from)!, to = positions.get(edge.to)!;
      const blocked = blockedEdges.has(edge.id) || unavailable(edge.from) || unavailable(edge.to);
      const active = routeEdges.has(edge.id) && !blocked;
      const width = Math.max(30, String(edge.cost).length * 8 + 16);
      return <g key={edge.id} transform={`translate(${(from.x + to.x) / 2}, ${(from.y + to.y) / 2})`} className={`cost-label ${blocked ? "unavailable" : active ? "active" : ""}`}>
        <rect x={-width / 2} y="-13" width={width} height="26" rx="8" />
        <text textAnchor="middle" dominantBaseline="central">{edge.cost}</text>
      </g>;
    })}</g>
    <g aria-label={t("buildingLocations")}>{building.nodes.map(node => {
      const position = positions.get(node.id)!;
      const blocked = unavailable(node.id), eligible = node.type !== "exit" && !blocked;
      const selected = startId === node.id, destination = route?.exitId === node.id;
      return <g key={node.id} transform={`translate(${position.x}, ${position.y})`}
        className={`map-node ${node.type} ${blocked ? "unavailable" : ""} ${eligible ? "selectable" : ""} ${routeNodes.has(node.id) ? "on-route" : ""} ${selected ? "selected" : ""} ${destination ? "destination" : ""}`}
        role={eligible ? "button" : "img"} tabIndex={eligible ? 0 : undefined}
        aria-label={`${node.label} (${node.id}), ${t(node.type)}, ${t(blocked ? "unavailable" : eligible ? "selectAsStart" : "openExit")}`}
        aria-pressed={eligible ? selected : undefined}
        onClick={eligible ? () => onSelectStart(node.id) : undefined}
        onKeyDown={eligible ? event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectStart(node.id); } } : undefined}>
        <title>{`${node.label} · ${node.id}${blocked ? ` · ${t("unavailable")}` : ""}`}</title>
        <motion.g className="node-art" animate={{ scale: selected && !reduced ? [1, 1.06, 1] : 1 }} transition={{ duration: reduced ? 0 : .22 }} style={{ transformOrigin: "0px 0px" }}>
        {(selected || destination) && <rect className="node-halo" x="-54" y="-36" width="108" height="72" rx="19" />}
        {node.type === "junction" ? <circle className="node-shape" r="22" /> : <rect className="node-shape" x="-44" y="-27" width="88" height="54" rx="12" />}
        {blocked ? <path className="node-symbol" d="m-7-7 14 14 M7-7-7 7" /> : node.type === "exit" ? <path className="node-symbol" d="M-3-10h-9v20h9 M-3 0h17 M8-6l6 6-6 6" /> : node.type === "room" ? <path className="node-symbol" d="M-10 10v-20H7v20 M-13 10h26 M2 0v1" /> : <circle className="junction-center" r="5" />}
        </motion.g>
        <text className="node-label" y="49" textAnchor="middle">{compactLabel(node.label)}</text>
        <text className="node-caption" y="67" textAnchor="middle">{selected ? t(blocked ? "blockedStartCaption" : "startCaption") : destination ? t("destination") : blocked ? t(node.type === "exit" ? "closedExitCaption" : "blockedCaption") : node.type === "exit" ? t("safeExitCaption") : compactLabel(node.id)}</text>
      </g>;
    })}</g>
  </svg>;
}
