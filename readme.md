# Smart Escape — Interactive Evacuation Route Simulator

Smart Escape lets users explore a building graph, select a starting location,
and find the lowest-cost route to an accessible open exit. Change simulated
hazards to see the route update immediately.

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
- Subtle Motion transitions, reduced-motion support, and visible keyboard focus.

Routing, validation, imports, and simulation state are completely client-side.
Imported files are read locally; there is no backend, API, database, or remote
storage. Route costs are weighted costs, not physical distance units.

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

**Live URL:** `<ADD_LIVE_URL_HERE>`

Deploy with Vercel using `npm run build` and the static output directory `out/`.
No server environment variables or database configuration are required.

## Screenshots

- [Baseline route](screenshots/baseline-route.png): R1 → C1 → C2 → E1, cost 7.
- [C2 blocked reroute](screenshots/c2-blocked-reroute.png):
  R1 → C1 → C3 → C4 → E2, cost 11.

## Verification

```sh
npm test
```

The checks cover deterministic routing, validation, runtime-state independence,
localization, and the mandatory sample scenarios. After a production build,
`node tests/ui-smoke.mjs` runs the browser checks with local headless Chrome.
Set `CHROME_PATH` if Chrome is installed elsewhere.

## Known issue

Very dense or coincident coordinates may cause label overlap. Supplied node
coordinates are preserved; the app does not apply automatic graph layout.

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
