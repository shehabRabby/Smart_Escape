# SMART ESCAPE

Next.js App Router, strict TypeScript, Tailwind CSS, browser file import,
an interactive SVG map, and a React-independent routing engine.

Run `npm install`, `npm run dev`, `npm test`, and `npm run build`.
On Windows with restricted PowerShell scripts, use `npm.cmd`.
The app fetches `/sample-building.json` automatically. Select Room 1 (`R1`) on the
map or in the start dropdown to see `R1 → C1 → C2 → E1`, cost 7.
Imported JSON is read and validated entirely in the browser. A valid
import replaces the building and clears the selected start; an invalid import
preserves the building, selection, and route and shows validation errors.

The reusable SVG map fits imported coordinates with padding, shows all nodes,
corridors and costs, and reflects the current runtime availability state.
Available rooms/junctions support pointer, Enter, and Space selection. Exits and
blocked starts cannot be selected. The route panel and sequence use the existing
engine's result, including empty, unreachable, and numeric-overflow states.
The panel stacks below the map on smaller screens. Hazard/reset controls use
`lucide-react`; no graph or animation libraries are included.

Hazard controls independently block/unblock rooms and junctions, block/unblock
corridors, and close/reopen exits. Each toggle immediately reroutes through the
existing engine. A blocked selected start stays selected and shows exactly
`Starting location blocked`; inaccessible exits show `No route available`.
Reset clones the imported `initial_state` into runtime state, keeps the building
and selection, and recalculates. Imports and toggles never modify the baseline.
The sample also supports the required C2 detour (cost 11) and R2 route (cost 7).
The original equal-cost demo is preserved as `tests/fixtures/tie-building.json`.
`node tests/ui-smoke.mjs` runs dependency-free headless Chrome checks against
`out/` after a build; set `CHROME_PATH` if Chrome is installed elsewhere. It checks
imports, state preservation, route selection, keyboard access, mobile overflow,
and extreme coordinate ranges. Screenshots and fixtures go to ignored `.tmp/`.

`parseBuildingJson(text)` handles JSON syntax errors; `validateBuilding(unknown)`
returns either validated data or an array of field-specific errors. All schema
constraints are checked, including undirected duplicate pairs and state IDs.
IDs are preserved exactly. Unknown extra fields are ignored; repeated state IDs
are accepted and naturally deduplicated by routing sets. Disconnected graphs
are valid. Costs must be positive safe integers so imported numbers are exact.

`findEvacuationRoute(building, startId, state?)` uses the initial state by default.
Pass validated building data and a valid state. It returns a route with node IDs,
edge IDs, exit ID, and total cost, or `null` for an invalid start or unreachable
exit. Dijkstra uses linear minimum selection (at most 60 nodes), full path
comparisons, and locale-independent UTF-16 string ordering. Internal bigint sums
keep costs exact; a winning total above `Number.MAX_SAFE_INTEGER` raises a
human-readable RangeError rather than returning an inaccurate number.

Static export (`out/`) keeps the app browser-only and compatible with Vercel.
Localization and animation are left for later stages.
No backend, database, or API routes are present.
