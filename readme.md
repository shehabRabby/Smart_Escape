# SMART ESCAPE

Foundation stage only: Next.js App Router, strict TypeScript, Tailwind CSS,
browser validation, and a React-independent routing engine.

Run `npm install`, `npm run dev`, `npm test`, and `npm run build`.
On Windows with restricted PowerShell scripts, use `npm.cmd`.
The temporary page fetches `/sample-building.json` in the browser and prints a
validated route from `room-101`. No map or later-stage UI is implemented.

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
The next stage can connect browser file import and simulation controls to these
modules, then build the map. No backend, database, or API routes are present.
