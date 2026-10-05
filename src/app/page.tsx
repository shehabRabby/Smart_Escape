"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { BuildingData, BuildingState } from "@/lib/building-types";
import { parseBuildingJson } from "@/lib/validate-building";
import { findEvacuationRoute } from "@/lib/routing";
import { BuildingMap } from "@/components/building-map";
import { RoutePanel } from "@/components/route-panel";
import { Icon } from "@/components/icon";
import { HazardControls } from "@/components/hazard-controls";
import { createRuntimeState, toggleHazard } from "@/lib/simulation-state";
import type { RuntimeState } from "@/lib/simulation-state";
import { LanguageSwitcher, useLanguage } from "@/components/language-provider";
import { ThemeSwitcher } from "@/components/theme-provider";
import { MAX_BUILDING_FILE_BYTES } from "@/lib/import-limits";

export default function SmartEscapePage() {
  const { t, errorText } = useLanguage();
  const reduced = useReducedMotion();
  const [building, setBuilding] = useState<BuildingData | null>(null);
  const [filename, setFilename] = useState("");
  const [startId, setStartId] = useState("");
  const [runtimeState, setRuntimeState] = useState<RuntimeState>({ blockedNodes: [], blockedEdges: [], closedExits: [] });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);
  const importedBuilding = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSample() {
      try {
        const response = await fetch("/sample-building.json", { signal: controller.signal });
        if (!response.ok) throw new Error(`Sample building could not be loaded (${response.status}). Import a building JSON to get started.`);
        const result = parseBuildingJson(await response.text());
        if (controller.signal.aborted || importedBuilding.current) return;
        if (result.success) { setBuilding(result.data); setRuntimeState(createRuntimeState(result.data.initial_state)); setFilename("sample-building.json"); }
        else setErrors(result.errors);
      } catch (error: unknown) {
        if (!controller.signal.aborted && !importedBuilding.current) setErrors([error instanceof Error ? error.message : "Sample building could not be loaded."]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
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
    if (file.size > MAX_BUILDING_FILE_BYTES) { setImporting(false); setErrors(["Building files must be 5 MiB or smaller."]); return; }
    setImporting(true);
    setLoading(false);
    try {
      const result = parseBuildingJson(await file.text());
      if (version !== requestVersion.current) return;
      if (!result.success) { setErrors(result.errors); return; }
      importedBuilding.current = true;
      setBuilding(result.data);
      setRuntimeState(createRuntimeState(result.data.initial_state));
      setFilename(file.name);
      setStartId("");
      setErrors([]);
    } catch (error: unknown) {
      if (version === requestVersion.current) { console.error("Building file read failed", error); setErrors(["The selected file could not be read."]); }
    } finally {
      if (version === requestVersion.current) setImporting(false);
    }
  }

  function selectStart(id: string) {
    if (id === "") { setStartId(""); return; }
    const node = building?.nodes.find(node => node.id === id);
    if (node && node.type !== "exit" && !runtimeState.blockedNodes.includes(id)) setStartId(id);
  }

  function changeHazard(key: keyof RuntimeState, id: string) {
    if (!building) return;
    const node = building.nodes.find(node => node.id === id);
    const valid = key === "blockedEdges" ? building.edges.some(edge => edge.id === id)
      : key === "closedExits" ? node?.type === "exit" : node !== undefined && node.type !== "exit";
    if (valid) setRuntimeState(previous => toggleHazard(previous, key, id));
  }

  function resetHazards() {
    if (building) setRuntimeState(createRuntimeState(building.initial_state));
  }

  const simulationState = useMemo<BuildingState>(() => ({
    blocked_nodes: runtimeState.blockedNodes,
    blocked_edges: runtimeState.blockedEdges,
    closed_exits: runtimeState.closedExits,
  }), [runtimeState]);
  const startBlocked = !!startId && runtimeState.blockedNodes.includes(startId);

  const { route, routingError } = useMemo(() => {
    if (!building || !startId) return { route: null, routingError: null };
    try { return { route: findEvacuationRoute(building, startId, simulationState), routingError: null }; }
    catch (error: unknown) { return { route: null, routingError: error instanceof Error ? error.message : "Unable to calculate this route." }; }
  }, [building, startId, simulationState]);
  const routeStatus = t(startBlocked ? "startBlocked" : routingError ? "calculationUnavailable" : "noRoute");
  const openExits = building?.nodes.filter(node => node.type === "exit" && !runtimeState.closedExits.includes(node.id)).length ?? 0;
  const nodeById = new Map(building?.nodes.map(node => [node.id, node]) ?? []);

  return <div className="app-shell">
    <header className="app-header"><a className="brand" href="/" aria-label={t("home")}><span className="brand-mark"><Icon name="shield" size={26} /></span><span>smart<span className="brand-accent">escape</span><small>{t("simulator")}</small></span></a>
      <div className="header-center"><span className="live-dot" /> {t("simulationMode")}</div>
      <LanguageSwitcher />
      <ThemeSwitcher />
      <div className="header-actions"><span className="local-badge"><Icon name="shield" size={14} /> {t("localPrivate")}</span><motion.button className="reset-button header-reset" onClick={resetHazards} disabled={!building} whileHover={reduced ? undefined : { y: -1 }} whileTap={reduced ? undefined : { scale: .98 }}><RotateCcw size={16} aria-hidden="true" />{t("reset")}</motion.button><input ref={inputRef} className="visually-hidden" type="file" accept=".json,application/json" aria-label={t("importJson")} onChange={event => { void importFile(event); }} /><motion.button className="import-button" onClick={() => inputRef.current?.click()} disabled={importing} whileHover={reduced ? undefined : { y: -1 }} whileTap={reduced ? undefined : { scale: .98 }}><Icon name="upload" size={17} />{t(importing ? "readingFile" : building ? "changeFile" : "importJson")}</motion.button></div>
    </header>
    <motion.main className="main-content" initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
      <section className="page-heading"><div><div className="eyebrow heading-eyebrow"><span /> {t("intelligence")}</div><h1>{t("headline")}<br className="mobile-break" /> <span>{t("headlineEnd")}</span></h1><p>{t("introduction")}</p></div><div className="workspace-badge"><span className="live-dot" />{t(loading ? "loadingBuilding" : building ? "simulationReady" : "awaitingBuilding")}<small>{t("workspace")}</small></div></section>
      {errors.length > 0 && <section className="import-errors" role="alert"><Icon name="warning" /><div><h2>{t("importFailed")}</h2><p>{t(building ? "importKept" : "importPrompt")}</p><ul>{errors.map((error, index) => <li key={index}>{errorText(error)}</li>)}</ul></div><motion.button className="dismiss-button" onClick={() => setErrors([])} aria-label={t("dismissErrors")} whileTap={reduced ? undefined : { scale: .96 }}><Icon name="close" size={18} /></motion.button></section>}
      <div className="workspace-grid"><motion.section className="map-panel" aria-label={t("map")} initial={reduced ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}><div className="map-toolbar"><div className="building-title"><span className="building-icon"><Icon name="layers" size={20} /></span><div><h2>{building?.building ?? t("overview")}</h2><span className="source-file"><Icon name="file" size={12} />{filename || t("noFile")}</span></div></div><span className="map-mode">{t("liveMap")}<span className="live-dot" /></span></div>
        <div className="map-canvas">{building ? <BuildingMap building={building} state={simulationState} startId={startId} route={route} onSelectStart={selectStart} /> : <div className="map-empty"><Icon name="layers" size={40} /><h3>{t(loading ? "loadingMap" : "emptyMap")}</h3><p>{t(loading ? "preparingDemo" : "importMapPrompt")}</p></div>}<div className="canvas-label">{t("floorPlan")} <span>/</span> {t("topology")}</div></div>
        <div className="map-footer"><span><span className="selection-dot" />{t("selectMap")}</span><div><span>{t("locations", { count: building?.nodes.length ?? "—" })}</span><span>{t("corridorCount", { count: building?.edges.length ?? "—" })}</span><span className="exit-count">{t("openExitCount", { count: openExits })}</span></div></div>
      </motion.section><RoutePanel building={building} state={simulationState} startId={startId} route={route} routingError={routingError} onSelectStart={selectStart} /></div>
      <section className={`route-sequence ${route ? "is-active" : ""}`} aria-label={t("currentRoute")}><div className="sequence-heading"><span className="sequence-icon"><Icon name="arrow" size={20} /></span><div><span className="eyebrow">{t(route ? "safeRoute" : "yourRoute")}</span><p>{route ? t("lowestCost") : startId ? routeStatus : t("selectStart")}</p></div></div><div className="sequence-nodes">{route ? route.nodeIds.map((id, index) => <span className="sequence-step" key={id}>{index > 0 && <Icon name="arrow" size={16} />}<span className={`sequence-node ${index === 0 ? "first" : index === route.nodeIds.length - 1 ? "last" : ""}`} title={nodeById.get(id)?.label}>{id}</span></span>) : <span className="sequence-placeholder">{startId ? routeStatus : t("sequenceEmpty")}</span>}</div>{route && <span className="sequence-cost">{route.totalCost}<small>{t("totalCost")}</small></span>}</section>
      {building && <HazardControls building={building} state={runtimeState} onToggle={changeHazard} onReset={resetHazards} />}
      <footer className="app-footer"><span>SMART ESCAPE <span className="footer-divider">/</span> {t("footer")}</span><span><span className="live-dot" /> {t("privacy")}</span></footer>
    </motion.main>
  </div>;
}
