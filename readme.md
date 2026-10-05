# Smart Escape — Interactive Evacuation Route Simulator

Smart Escape lets users explore a building graph, select a starting location,
and find the lowest-cost route to an accessible open exit. Change simulated
hazards to see the route update immediately.

**Participant:** Md Shehab Al Rabby

**Role:** Full Stack Developer

**Registration Number:** Shehab467#

**Live site:** [smart-escape-one.vercel.app](https://smart-escape-one.vercel.app)

## Tech stack

- Next.js App Router and React
- Strict TypeScript and Tailwind CSS
- Responsive SVG map
- Motion for subtle animations and Lucide React for icons
- Typed English/Bangla translation dictionary

## Implemented features

- Local browser JSON import with schema validation and useful errors; invalid
  imports preserve the current simulation.
- Deterministic Dijkstra routing on undirected weighted graphs, with exit-ID
  and full node-sequence tie-breaking.
- Responsive SVG map showing locations, corridor costs, available exits,
  hazards, and the active route.
- Synchronized map, keyboard, and dropdown start selection.
- Room/junction blocking, corridor blocking, exit closing, and instant rerouting.
- Reset to the imported initial state while keeping the selected start.
- Route sequence, destination, total weighted cost, corridor count, and clear
  blocked-start/unreachable statuses.
- English and Bangla UI without changing imported labels or IDs.
- Light, Dark, and System themes with locally saved preference, keyboard
  controls, and automatic response to system appearance changes.
- Subtle Motion transitions, reduced-motion support, and visible keyboard focus.

Routing, validation, imports, and simulation state are completely client-side.
Imported files are read locally; there is no backend, API, database, or remote
storage. Route costs are weighted costs, not physical distance units.
Only the theme preference is saved in browser storage. Graphs, selected starts,
hazards, and language remain in memory and reset when the page reloads.

## Architecture

The App Router page coordinates imported data and runtime state. React displays
the SVG map, route summary, hazard controls, language control, and theme control.
All graph algorithms and validation remain independent of React.

| Module | Responsibility |
| --- | --- |
| `src/lib/building-types.ts` | Complete graph, initial-state, and route types |
| `src/lib/validate-building.ts` | Parse unknown JSON and return field-specific errors |
| `src/lib/routing.ts` | Deterministic lowest-cost Dijkstra routing |
| `src/lib/simulation-state.ts` | Clone initial hazards and toggle runtime hazards immutably |
| `src/lib/map-geometry.ts` | Fit supplied coordinates into the SVG without overflow |
| `src/lib/translations.ts` | Typed English/Bangla strings and validation-error translation |
| `src/lib/theme.ts`, `src/components/theme-provider.tsx` | Pre-paint theme selection, storage, and system changes |
| `src/app/theme.css` | Semantic colors for both themes and the shared light map canvas |

The map preserves the supplied geometry, topology, IDs, and costs. Coordinate
fitting is memoized per graph; routing is memoized per building, start, and hazard
state. Theme and language changes do not recalculate or reset the simulation.

### Routing and hazards

Edges are undirected and their costs alone determine the route. Blocked nodes,
all their incident edges, explicitly blocked corridors, and closed exits are
excluded. Closed exits cannot be intermediate nodes.

Dijkstra chooses the reachable open exit using this exact priority:

1. Lowest total edge cost.
2. Lexicographically smallest exit ID when exits have equal cost.
3. Lexicographically smallest complete node-ID sequence when paths to the same
   exit have equal cost.

ID comparisons are case-sensitive and use JavaScript string ordering, independent
of language and input declaration order. Internal costs use `bigint` for exact
comparison. The existing numeric route contract reports a friendly calculation
error if the winning total exceeds `Number.MAX_SAFE_INTEGER`.

Hazard changes reroute immediately. Blocking the selected start preserves that
selection and displays **Starting location blocked**. An unreachable open exit
displays **No route available**. Reset clones the imported `initial_state`, keeps
the graph and selected start, and recalculates. A valid new import replaces the
simulation and clears the selected start; a failed import preserves it.

## Building JSON format

Import a local `.json` file, such as [sample-building.json](public/sample-building.json).
This minimal valid example illustrates every field:

```json
{
  "building": "Example Building",
  "nodes": [
    { "id": "R1", "label": "Room 1", "type": "room", "x": 0, "y": 0 },
    { "id": "E1", "label": "Main Exit", "type": "exit", "x": 100, "y": 0 }
  ],
  "edges": [
    { "id": "corridor-1", "from": "R1", "to": "E1", "cost": 3 }
  ],
  "initial_state": {
    "blocked_nodes": [],
    "blocked_edges": [],
    "closed_exits": []
  }
}
```

- `building`, node IDs/labels, and edge IDs must be non-empty strings.
- There must be 2–60 nodes, 1–150 edges, at least one room/junction, and at least
  one exit. Node types are `room`, `junction`, and `exit`.
- Coordinates must be finite numbers. Costs must be positive safe integers.
- Node IDs and edge IDs must be unique within their respective collections;
  comparisons are case-sensitive. Every edge endpoint must exist.
- Self-loops and repeated undirected node pairs are rejected.
- Every initial-state ID must exist. `blocked_nodes` accepts rooms/junctions;
  `closed_exits` accepts exits; `blocked_edges` accepts corridors.
- Empty hazard arrays and disconnected graphs are valid.

Files are limited to **5 MiB** to bound browser parsing and error rendering.
This is a file-reading limit; the graph schema retains the original contest limits.
Invalid hazard-array validation stops after 100 errors with a clear summary,
so malformed files cannot produce an unbounded list of error rows.
Files never leave the browser. Re-importing the same filename is supported, and
only the most recent file read can replace the current graph.

## Language and appearance

Use the English/Bangla control in the header; imported labels and IDs stay intact.
The Sun, Moon, and Monitor controls choose Light, Dark, and System. System is the
default and follows `prefers-color-scheme`. The preference is stored under
`smart-escape-theme`; unavailable storage falls back to an in-memory preference.
A small script applies the saved appearance before the page paints.

Both themes retain a light SVG canvas for graph contrast. Blue denotes selection
and routes, green denotes open exits, red denotes hazards, and amber denotes
warnings. Cross symbols, dashed corridors, status labels, and pressed toggle
states communicate hazards without relying solely on color. Animation respects
`prefers-reduced-motion`.

## Run locally

Use Node.js 24 LTS and npm, then run:

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The sample building loads
automatically. On PowerShell systems that restrict scripts, use `npm.cmd`.

## Production build

```sh
npm run build
```

The static-export output is generated in `out/`.

## Deployment

**Live URL:** [https://smart-escape-one.vercel.app](https://smart-escape-one.vercel.app)

Deploy with Vercel using `npm run build` and the static output directory `out/`.
No server environment variables or database configuration are required.

## Screenshots

- [Baseline route](screenshots/baseline-route.png): R1 → C1 → C2 → E1, cost 7.
- [C2 blocked reroute](screenshots/c2-blocked-reroute.png):
  R1 → C1 → C3 → C4 → E2, cost 11.

## Verification

```sh
npm test
npm run typecheck
npm run build
npm run test:browser
```

The 21 unit tests cover validation, deterministic routing, independent runtime
state, localization, theme resolution, and extreme coordinate fitting. An
independent exhaustive-path oracle checks 120 seeded cyclic graphs and reversed
declarations (240 routing comparisons), alongside the 60-node/150-edge boundaries.

After a production build, the dependency-free browser smoke script serves `out/`
and launches local headless Chrome. Set `CHROME_PATH` to your Chrome executable
if it is installed elsewhere. Node.js 24 supplies the native WebSocket and
TypeScript stripping used by these tests; no browser test package is required.

Browser coverage includes all five mandatory scenarios in both themes and both
languages (20 scenario combinations), and the full 40-case responsive matrix:
320, 360, 375, 390, 430, 768, 1024, 1280, 1440, and 1920 pixels. It also checks
hazards/reset, keyboard selection, theme persistence and system changes, contrast
on key text/status controls, minimum map hit areas, reduced motion, import races,
same-file re-imports, malformed files, oversized files, and extreme coordinates.
It also renders the maximum 60-node/150-edge graph and deliberately injects a
rendering failure to verify the error boundary and recovery. Unexpected
runtime/hydration exceptions and console errors fail the run. QA screenshots and
temporary browser profiles go into the ignored `.tmp/ui-check/` directory.

| Required sample check | Expected result |
| --- | --- |
| R1 baseline | R1 → C1 → C2 → E1; cost 7 |
| R1 with C2 blocked | R1 → C1 → C3 → C4 → E2; cost 11 |
| E1 and E2 closed | No route available |
| R2 baseline | R2 → C3 → C4 → E2; cost 7 |
| Selected R1 blocked | Starting location blocked |

The submitted contest commit remains recoverable at `1840390` on `main`.
Post-contest hardening is developed separately on `post-contest-production`;
the submitted screenshots above are preserved.

## Known limitations

Very dense or coincident coordinates may cause label overlap. Supplied node
coordinates are preserved; the app does not apply automatic graph layout.
Overlapping nodes can also have overlapping touch targets; the start dropdown
and hazard panel remain available. Very disproportionate coordinate magnitudes
can collapse small differences at floating-point precision. Large edge costs
are accepted only as safe integers, and route totals beyond safe numeric output
are reported rather than rounded. Browser smoke checks use Chrome; this project
does not claim a complete cross-browser or screen-reader certification.

## AI assistance

**AI tool used:** Codex.

**Most useful AI prompt:** Codex was instructed to implement deterministic
Dijkstra routing, robust client-side JSON validation, a responsive SVG building
map, immediate hazard rerouting, an English/Bangla UI, and subtle animations,
while keeping the project browser-only, dependency-light, and compatible with
Vercel static export.

## Educational simulation disclaimer

This project is an educational evacuation simulation, not a certified emergency
navigation system. It does not verify real-world conditions or replace official
evacuation plans. In an emergency, follow posted instructions and guidance from
authorized personnel.

## License

Released under the [MIT License](LICENSE).
