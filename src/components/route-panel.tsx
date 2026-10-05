"use client";

import type { BuildingData, EvacuationRoute } from "@/lib/building-types";
import { Icon } from "./icon";

export function RoutePanel({ building, startId, route, routingError, onSelectStart }: {
  building: BuildingData | null;
  startId: string;
  route: EvacuationRoute | null;
  routingError: string | null;
  onSelectStart: (id: string) => void;
}) {
  const options = building?.nodes.filter(node => node.type !== "exit") ?? [];
  const blocked = new Set(building?.initial_state.blocked_nodes ?? []);
  const destination = building?.nodes.find(node => node.id === route?.exitId);
  const status = !startId ? "Select a starting location" : routingError ? "Route calculation unavailable" : route ? "Route available" : "No route available";
  return <aside className="route-panel">
    <div className="panel-heading"><span className="eyebrow">ROUTE PLANNER</span><span className="step-number">01</span></div>
    <h2>Your way to safety.</h2><p className="panel-intro">Choose where you are. Find the lowest-cost path to an open exit.</p>
    <div className="start-control"><label htmlFor="start-location"><Icon name="pin" size={16} /> Start location</label>
      <select id="start-location" value={startId} disabled={!building} onChange={event => onSelectStart(event.target.value)}>
        <option value="">Select a room or junction</option>
        {options.map(node => <option key={node.id} value={node.id} disabled={blocked.has(node.id)}>{node.label} · {node.id}{blocked.has(node.id) ? " (blocked)" : ""}</option>)}
      </select><p>Or select a location directly on the map.</p>
    </div>
    <div className={`route-result ${route ? "has-route" : startId ? "no-route" : ""}`} aria-live="polite" aria-atomic="true">
      <div className="result-status"><Icon name={route ? "check" : startId ? "warning" : "pin"} size={17} /><span>{status}</span></div>
      {route ? <>
        <div className="destination-summary"><span className="metric-label">DESTINATION</span><div><h3>{destination?.label}</h3><span className="destination-icon"><Icon name="exit" size={23} /></span></div><span className="destination-id">{route.exitId} · Open exit</span></div>
        <div className="route-metrics"><div><span className="metric-label">TOTAL COST</span><strong>{route.totalCost}</strong><span>Weighted cost</span></div><div><span className="metric-label">CORRIDORS</span><strong>{route.edgeIds.length.toString().padStart(2, "0")}</strong><span>Along your route</span></div></div>
      </> : <div className="empty-route"><Icon name={startId ? "warning" : "arrow"} size={28} /><p>{routingError ?? (startId ? "This location cannot reach an open exit with the current building state." : "Your destination and route details will appear here.")}</p></div>}
    </div>
    <div className="legend"><h3>Map legend</h3><ul><li><span className="legend-symbol room" />Room</li><li><span className="legend-symbol junction" />Junction</li><li><span className="legend-symbol exit" />Open exit</li><li><span className="legend-symbol active" />Active route</li><li><span className="legend-symbol blocked" />Blocked / unavailable</li></ul></div>
    <div className="panel-note"><Icon name="shield" size={17} /><span>Routes use corridor costs and the building&apos;s imported availability state.</span></div>
  </aside>;
}
