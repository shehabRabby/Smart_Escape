"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { BuildingData } from "@/lib/building-types";
import { parseBuildingJson } from "@/lib/validate-building";
import { findEvacuationRoute } from "@/lib/routing";
import { BuildingMap } from "@/components/building-map";
import { RoutePanel } from "@/components/route-panel";
import { Icon } from "@/components/icon";

export default function SmartEscapePage() {
  const [building, setBuilding] = useState<BuildingData | null>(null);
  const [filename, setFilename] = useState("");
  const [startId, setStartId] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const version = requestVersion.current;
    async function loadSample() {
      try {
        const response = await fetch("/sample-building.json", { signal: controller.signal });
        if (!response.ok) throw new Error(`Sample building could not be loaded (${response.status}). Import a building JSON to get started.`);
        const result = parseBuildingJson(await response.text());
        if (controller.signal.aborted || version !== requestVersion.current) return;
        if (result.success) { setBuilding(result.data); setFilename("sample-building.json"); }
        else setErrors(result.errors);
      } catch (error: unknown) {
        if (!controller.signal.aborted && version === requestVersion.current) setErrors([error instanceof Error ? error.message : "Sample building could not be loaded."]);
      } finally {
        if (!controller.signal.aborted && version === requestVersion.current) setLoading(false);
      }
    }
    void loadSample();
    return () => controller.abort();
  }, []);

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const version = ++requestVersion.current;
    setImporting(true);
    setLoading(false);
    try {
      const result = parseBuildingJson(await file.text());
      if (version !== requestVersion.current) return;
      if (!result.success) { setErrors(result.errors); return; }
      setBuilding(result.data);
      setFilename(file.name);
      setStartId("");
      setErrors([]);
    } catch (error: unknown) {
      if (version === requestVersion.current) setErrors([error instanceof Error ? error.message : "The selected file could not be read."]);
    } finally {
      if (version === requestVersion.current) setImporting(false);
    }
  }

  function selectStart(id: string) {
    if (id === "") { setStartId(""); return; }
    const node = building?.nodes.find(node => node.id === id);
    if (node && node.type !== "exit" && !building?.initial_state.blocked_nodes.includes(id)) setStartId(id);
  }

  const { route, routingError } = useMemo(() => {
    if (!building || !startId) return { route: null, routingError: null };
    try { return { route: findEvacuationRoute(building, startId), routingError: null }; }
    catch (error: unknown) { return { route: null, routingError: error instanceof Error ? error.message : "Unable to calculate this route." }; }
  }, [building, startId]);
  const openExits = building?.nodes.filter(node => node.type === "exit" && !building.initial_state.closed_exits.includes(node.id)).length ?? 0;
  const nodeById = new Map(building?.nodes.map(node => [node.id, node]) ?? []);

  return <div className="app-shell">
    <header className="app-header"><a className="brand" href="/" aria-label="Smart Escape home"><span className="brand-mark"><Icon name="shield" size={26} /></span><span>smart<span className="brand-accent">escape</span><small>EVACUATION ROUTE SIMULATOR</small></span></a>
      <div className="header-center"><span className="live-dot" /> SIMULATION MODE</div>
      <div className="header-actions"><span className="local-badge"><Icon name="shield" size={14} /> Local & private</span><input ref={inputRef} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Import building JSON" onChange={event => { void importFile(event); }} /><button className="import-button" onClick={() => inputRef.current?.click()} disabled={importing}><Icon name="upload" size={17} />{importing ? "Reading file…" : "Import JSON"}</button></div>
    </header>
    <main className="main-content">
      <section className="page-heading"><div><div className="eyebrow heading-eyebrow"><span /> BUILDING INTELLIGENCE</div><h1>Every second counts.<br className="mobile-break" /> <span>Know your way out.</span></h1><p>Explore your building. Choose a starting point. Find your safest route.</p></div><div className="workspace-badge"><span className="live-dot" />{loading ? "Loading building" : building ? "Simulation ready" : "Awaiting building"}<small>CLIENT-SIDE WORKSPACE</small></div></section>
      {errors.length > 0 && <section className="import-errors" role="alert"><Icon name="warning" /><div><h2>Building could not be loaded</h2><p>{building ? "Your current building and route have been kept. Fix the file and try again." : "Choose a valid building JSON to start the simulation."}</p><ul>{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div><button className="dismiss-button" onClick={() => setErrors([])} aria-label="Dismiss import errors"><Icon name="close" size={18} /></button></section>}
      <div className="workspace-grid"><section className="map-panel" aria-label="Interactive building map"><div className="map-toolbar"><div className="building-title"><span className="building-icon"><Icon name="layers" size={20} /></span><div><h2>{building?.building ?? "Building overview"}</h2><span className="source-file"><Icon name="file" size={12} />{filename || "No file loaded"}</span></div></div><span className="map-mode">LIVE MAP<span className="live-dot" /></span></div>
        <div className="map-canvas">{building ? <BuildingMap building={building} startId={startId} route={route} onSelectStart={selectStart} /> : <div className="map-empty"><Icon name="layers" size={40} /><h3>{loading ? "Loading your building…" : "Your map starts here"}</h3><p>{loading ? "Preparing the demo simulation." : "Import a building JSON to explore evacuation routes."}</p></div>}<div className="canvas-label">FLOOR PLAN <span>/</span> TOPOLOGY VIEW</div></div>
        <div className="map-footer"><span><span className="selection-dot" />Select a room or junction to begin</span><div><span>{building?.nodes.length ?? "—"} locations</span><span>{building?.edges.length ?? "—"} corridors</span><span className="exit-count">{openExits} open exits</span></div></div>
      </section><RoutePanel building={building} startId={startId} route={route} routingError={routingError} onSelectStart={selectStart} /></div>
      <section className={`route-sequence ${route ? "is-active" : ""}`} aria-label="Current route" aria-live="polite"><div className="sequence-heading"><span className="sequence-icon"><Icon name="arrow" size={20} /></span><div><span className="eyebrow">{route ? "SAFE ROUTE" : "YOUR ROUTE"}</span><p>{route ? "Lowest-cost path to safety" : startId ? "No route available" : "Select a starting location"}</p></div></div><div className="sequence-nodes">{route ? route.nodeIds.map((id, index) => <span className="sequence-step" key={id}>{index > 0 && <Icon name="arrow" size={16} />}<span className={`sequence-node ${index === 0 ? "first" : index === route.nodeIds.length - 1 ? "last" : ""}`} title={nodeById.get(id)?.label}>{id}</span></span>) : <span className="sequence-placeholder">{startId ? "No route available" : "Your route will appear here once you choose a location."}</span>}</div>{route && <span className="sequence-cost">{route.totalCost}<small>TOTAL COST</small></span>}</section>
      <footer className="app-footer"><span>SMART ESCAPE <span className="footer-divider">/</span> Interactive evacuation planning</span><span><span className="live-dot" /> All processing stays in your browser</span></footer>
    </main>
  </div>;
}
