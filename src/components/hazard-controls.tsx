"use client";

import type { BuildingData } from "@/lib/building-types";
import type { RuntimeState } from "@/lib/simulation-state";
import { Layers, LockKeyhole, LogOut, MapPin, RotateCcw, TriangleAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useLanguage } from "./language-provider";

interface HazardControlsProps {
  building: BuildingData;
  state: RuntimeState;
  onToggle: (key: keyof RuntimeState, id: string) => void;
  onReset: () => void;
}

export function HazardControls({ building, state, onToggle, onReset }: HazardControlsProps) {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const groups = [
    { key: "blockedNodes", title: t("roomsJunctions"), description: t("blockAccess"), counter: t("blockedNodes"), active: t("blocked"), inactive: t("available"), icon: MapPin, items: building.nodes.filter(node => node.type !== "exit").map(node => ({ id: node.id, label: node.label, detail: t(node.type) })) },
    { key: "blockedEdges", title: t("corridorHazard"), description: t("blockCorridor"), counter: t("blockedCorridors"), active: t("blocked"), inactive: t("open"), icon: Layers, items: building.edges.map(edge => ({ id: edge.id, label: `${edge.from} ↔ ${edge.to}`, detail: t("cost", { cost: edge.cost }) })) },
    { key: "closedExits", title: t("exits"), description: t("closeExit"), counter: t("closedExits"), active: t("closed"), inactive: t("open"), icon: LogOut, items: building.nodes.filter(node => node.type === "exit").map(node => ({ id: node.id, label: node.label, detail: t("exit") })) },
  ] as const;

  return <motion.section className="hazard-controls" aria-labelledby="hazard-title" initial={reduced ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
    <div className="hazard-heading"><div><div className="eyebrow"><TriangleAlert size={14} aria-hidden="true" /> {t("controls")}</div><h2 id="hazard-title">{t("hazardTitle")}</h2><p>{t("hazardIntro")}</p></div><motion.button className="reset-button" onClick={onReset} whileHover={reduced ? undefined : { y: -1 }} whileTap={reduced ? undefined : { scale: .98 }}><RotateCcw size={16} aria-hidden="true" />{t("resetHazards")}</motion.button></div>
    <div className="hazard-groups">{groups.map(group => <div className="hazard-group" key={group.key}>
      <div className="hazard-group-heading"><group.icon size={18} aria-hidden="true" /><div><h3>{group.title}</h3><p>{group.description}</p></div><span className={`hazard-count ${state[group.key].length ? "nonzero" : ""}`} aria-label={`${group.counter}: ${state[group.key].length}`}>{t(group.key === "closedExits" ? "closedCount" : "blockedCount", { count: state[group.key].length })}</span></div>
      <ul className="hazard-list">{group.items.map(item => {
        const active = state[group.key].includes(item.id);
        return <li key={item.id}><motion.button className={`hazard-toggle ${active ? "is-active" : ""}`} type="button" aria-pressed={active}
          animate={{ backgroundColor: active ? "#73384430" : "#14213600" }} whileTap={reduced ? undefined : { scale: .985 }}
          aria-label={`${t(active ? group.key === "closedExits" ? "reopen" : "unblock" : group.key === "closedExits" ? "close" : "block")} ${t(group.key === "blockedEdges" ? "corridor" : group.key === "closedExits" ? "exit" : "location")} ${item.id}: ${item.label}`}
          data-hazard={group.key} data-id={item.id} onClick={() => onToggle(group.key, item.id)}>
          <span className="hazard-item-icon">{active ? <LockKeyhole size={15} aria-hidden="true" /> : <group.icon size={15} aria-hidden="true" />}</span>
          <span className="hazard-item-text"><strong>{item.label}</strong><small>{item.id} · {item.detail}</small></span>
          <span className="hazard-state">{active ? group.active : group.inactive}<span className="toggle-track" aria-hidden="true"><span /></span></span>
        </motion.button></li>;
      })}</ul>
    </div>)}</div>
  </motion.section>;
}
