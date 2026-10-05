"use client";

import type { BuildingData, BuildingState, EvacuationRoute } from "@/lib/building-types";
import { Icon } from "./icon";
import { motion, useReducedMotion } from "motion/react";
import { useLanguage } from "./language-provider";

export function RoutePanel({ building, state, startId, route, routingError, onSelectStart }: {
  building: BuildingData | null;
  state: BuildingState;
  startId: string;
  route: EvacuationRoute | null;
  routingError: string | null;
  onSelectStart: (id: string) => void;
}) {
  const { t, errorText } = useLanguage();
  const reduced = useReducedMotion();
  const options = building?.nodes.filter(node => node.type !== "exit") ?? [];
  const blocked = new Set(state.blocked_nodes);
  const startBlocked = blocked.has(startId);
  const destination = building?.nodes.find(node => node.id === route?.exitId);
  const status = t(!startId ? "selectStart" : startBlocked ? "startBlocked" : routingError ? "calculationUnavailable" : route ? "routeAvailable" : "noRoute");
  const summaryKey = JSON.stringify([status, route?.nodeIds, route?.totalCost]);
  return <motion.aside className="route-panel" initial={reduced ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
    <div className="panel-heading"><span className="eyebrow">{t("planner")}</span><span className="step-number">01</span></div>
    <h2>{t("plannerTitle")}</h2><p className="panel-intro">{t("plannerIntro")}</p>
    <div className="start-control"><label htmlFor="start-location"><Icon name="pin" size={16} /> {t("startLocation")}</label>
      <select id="start-location" value={startId} disabled={!building} onChange={event => onSelectStart(event.target.value)}>
        <option value="">{t("selectRoom")}</option>
        {options.map(node => <option key={node.id} value={node.id} disabled={blocked.has(node.id)}>{node.label} · {node.id}{blocked.has(node.id) ? ` (${t("blocked")})` : ""}</option>)}
      </select><p>{t("selectOnMap")}</p>
    </div>
    <div className={`route-result ${route ? "has-route" : startId ? "no-route" : ""}`} aria-live="polite" aria-atomic="true">
      <div className="result-status"><Icon name={route ? "check" : startId ? "warning" : "pin"} size={17} /><motion.span key={status} initial={reduced ? false : { opacity: .6, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .16 }}>{status}</motion.span></div>
      <motion.div key={summaryKey} initial={reduced ? false : { opacity: .7, y: 3 }} animate={{ opacity: 1, y: 0 }}>
      {route ? <>
        <div className="destination-summary"><span className="metric-label">{t("destination")}</span><div><h3>{destination?.label}</h3><span className="destination-icon"><Icon name="exit" size={23} /></span></div><span className="destination-id">{route.exitId} · {t("openExit")}</span></div>
        <div className="route-metrics"><div><span className="metric-label">{t("totalCost")}</span><strong>{route.totalCost}</strong><span>{t("weightedCost")}</span></div><div><span className="metric-label">{t("corridors")}</span><strong>{route.edgeIds.length.toString().padStart(2, "0")}</strong><span>{t("alongRoute")}</span></div></div>
      </> : <div className="empty-route"><Icon name={startId ? "warning" : "arrow"} size={28} /><p>{startBlocked ? t("unblockStart") : routingError ? errorText(routingError) : t(startId ? "unreachable" : "detailsEmpty")}</p></div>}
      </motion.div>
    </div>
    <div className="legend"><h3>{t("legend")}</h3><ul><li><span className="legend-symbol room" />{t("room")}</li><li><span className="legend-symbol junction" />{t("junction")}</li><li><span className="legend-symbol exit" />{t("openExit")}</li><li><span className="legend-symbol active" />{t("activeRoute")}</li><li><span className="legend-symbol blocked" />{t("blockedUnavailable")}</li></ul></div>
    <div className="panel-note"><Icon name="shield" size={17} /><span>{t("routingNote")}</span></div>
  </motion.aside>;
}
