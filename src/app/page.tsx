"use client";

import { useEffect, useState } from "react";
import { parseBuildingJson } from "@/lib/validate-building";
import { findEvacuationRoute } from "@/lib/routing";

export default function VerificationPage() {
  const [output, setOutput] = useState("Loading sample building…");
  useEffect(() => {
    const controller = new AbortController();
    async function verify() {
      try {
        const response = await fetch("/sample-building.json", { signal: controller.signal });
        if (!response.ok) throw new Error(`Sample load failed: ${response.status}`);
        const result = parseBuildingJson(await response.text());
        if (!result.success) { setOutput(result.errors.join("\n")); return; }
        const route = findEvacuationRoute(result.data, "room-101");
        setOutput(JSON.stringify({ building: result.data.building, validation: "passed", startId: "room-101", route }, null, 2));
      } catch (error: unknown) {
        if (!controller.signal.aborted) setOutput(error instanceof Error ? error.message : "Sample verification failed.");
      }
    }
    void verify();
    return () => controller.abort();
  }, []);
  return <main><h1>SMART ESCAPE — foundation verification</h1><pre>{output}</pre></main>;
}
