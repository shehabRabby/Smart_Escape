"use client";

import type { BuildingData } from "@/lib/building-types";
import type { RuntimeState } from "@/lib/simulation-state";
import { Layers, LockKeyhole, LogOut, MapPin, RotateCcw, TriangleAlert } from "lucide-react";

interface HazardControlsProps {
  building: BuildingData;
  state: RuntimeState;
  onToggle: (key: keyof RuntimeState, id: string) => void;
  onReset: () => void;
}

export function HazardControls({ building, state, onToggle, onReset }: HazardControlsProps) {
  const groups = [
    { key: "blockedNodes", title: "Rooms & junctions", description: "Block access to a location", active: "Blocked", inactive: "Available", icon: MapPin, items: building.nodes.filter(node => node.type !== "exit").map(node => ({ id: node.id, label: node.label, detail: node.type })) },
    { key: "blockedEdges", title: "Corridors", description: "Make a corridor unavailable", active: "Blocked", inactive: "Open", icon: Layers, items: building.edges.map(edge => ({ id: edge.id, label: `${edge.from} ↔ ${edge.to}`, detail: `Cost ${edge.cost}` })) },
    { key: "closedExits", title: "Exits", description: "Close or reopen a safe exit", active: "Closed", inactive: "Open", icon: LogOut, items: building.nodes.filter(node => node.type === "exit").map(node => ({ id: node.id, label: node.label, detail: "exit" })) },
  ] as const;

  return <section className="hazard-controls" aria-labelledby="hazard-title">
    <div className="hazard-heading"><div><div className="eyebrow"><TriangleAlert size={14} aria-hidden="true" /> SIMULATION CONTROLS</div><h2 id="hazard-title">Change conditions. See your route adapt.</h2><p>Toggle a hazard below. Routes update immediately; map clicks still select your start.</p></div><button className="reset-button" onClick={onReset}><RotateCcw size={16} aria-hidden="true" />Reset hazards</button></div>
    <div className="hazard-groups">{groups.map(group => <div className="hazard-group" key={group.key}>
      <div className="hazard-group-heading"><group.icon size={18} aria-hidden="true" /><div><h3>{group.title}</h3><p>{group.description}</p></div><span className={`hazard-count ${state[group.key].length ? "nonzero" : ""}`} aria-label={`${state[group.key].length} ${group.active.toLowerCase()}`}>{state[group.key].length} {group.active.toLowerCase()}</span></div>
      <ul className="hazard-list">{group.items.map(item => {
        const active = state[group.key].includes(item.id);
        return <li key={item.id}><button className={`hazard-toggle ${active ? "is-active" : ""}`} type="button" aria-pressed={active}
          aria-label={`${active ? group.key === "closedExits" ? "Reopen" : "Unblock" : group.key === "closedExits" ? "Close" : "Block"} ${group.key === "blockedEdges" ? "corridor" : group.key === "closedExits" ? "exit" : "location"} ${item.id}: ${item.label}`}
          data-hazard={group.key} data-id={item.id} onClick={() => onToggle(group.key, item.id)}>
          <span className="hazard-item-icon">{active ? <LockKeyhole size={15} aria-hidden="true" /> : <group.icon size={15} aria-hidden="true" />}</span>
          <span className="hazard-item-text"><strong>{item.label}</strong><small>{item.id} · {item.detail}</small></span>
          <span className="hazard-state">{active ? group.active : group.inactive}<span className="toggle-track"><span /></span></span>
        </button></li>;
      })}</ul>
    </div>)}</div>
  </section>;
}
