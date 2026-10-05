// Dependency-free browser checks against the production static export.
// Run: node tests/ui-smoke.mjs (requires a local Chrome installation).
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const artifacts = resolve(".tmp/ui-check");
await mkdir(artifacts, { recursive: true });
const root = resolve("out");
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const contentType = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" }[extname(file)] ?? "application/octet-stream";
    const contents = await readFile(file);
    response.writeHead(200, { "Content-Type": contentType }).end(contents);
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const address = server.address();
assert.ok(address && typeof address !== "string");
const profile = resolve(artifacts, `chrome-profile-${process.pid}`);
const chrome = spawn(process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { windowsHide: true, stdio: "ignore" });
let socket;
const pending = new Map();
let nextId = 0;
const pause = ms => new Promise(done => setTimeout(done, ms));
async function poll(read, condition, description) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const result = await read();
    if (condition(result)) return result;
    await pause(100);
  }
  throw new Error(`Timed out: ${description}`);
}
try {
  const port = await poll(async () => {
    try { return Number((await readFile(resolve(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); }
    catch { return 0; }
  }, value => value > 0, "Chrome debugging port");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((done, reject) => { socket.onopen = done; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  };
  function command(method, params = {}) {
    return new Promise((resolveCommand, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve: resolveCommand, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }
  async function importJson(name, contents) {
    const file = resolve(artifacts, name);
    await writeFile(file, contents);
    const { root: document } = await command("DOM.getDocument");
    const { nodeId } = await command("DOM.querySelector", { nodeId: document.nodeId, selector: "input[type=file]" });
    await command("DOM.setFileInputFiles", { nodeId, files: [file] });
    await poll(() => evaluate("document.querySelector('.import-button').disabled"), value => value === false, "file read");
  }
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: `http://127.0.0.1:${address.port}` });
  await poll(() => evaluate("document.querySelectorAll('.map-node').length"), count => count === 5, "sample render");
  assert.equal(await evaluate("document.querySelectorAll('.cost-label text').length"), 5);
  const point = await evaluate("(() => { const r = document.querySelector('.map-node.room .node-shape').getBoundingClientRect(); return { x: r.x+r.width/2, y: r.y+r.height/2 }; })()");
  await command("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
  await command("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
  await poll(() => evaluate("document.querySelector('#start-location').value"), value => value === "room-101", "map selection");
  assert.equal(await evaluate("document.querySelectorAll('.map-edge.active').length"), 2);
  assert.equal(await evaluate("document.querySelector('.destination-id').textContent"), "exit-a · Open exit");
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.sequence-node')].map(node => node.textContent)"), ["room-101", "hall-a", "exit-a"]);
  await evaluate("(() => { const s=document.querySelector('#start-location'); s.value='hall-b'; s.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await poll(() => evaluate("document.querySelector('.map-node.selected').getAttribute('aria-label')"), value => value.includes("hall-b"), "dropdown synchronization");
  await evaluate("document.querySelector('.map-node.room').focus()");
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter" });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter" });
  await poll(() => evaluate("document.querySelector('#start-location').value"), value => value === "room-101", "keyboard selection");
  const desktop = await command("Page.captureScreenshot", { format: "png" });
  await writeFile(resolve(artifacts, "desktop.png"), Buffer.from(desktop.data, "base64"));
  await importJson("invalid.json", "{broken");
  await poll(() => evaluate("document.querySelector('.import-errors')?.textContent"), value => value?.includes("not valid JSON"), "syntax error");
  assert.equal(await evaluate("document.querySelector('#start-location').value"), "room-101");
  assert.equal(await evaluate("document.querySelectorAll('.map-edge.active').length"), 2);
  await importJson("invalid-schema.json", JSON.stringify({ building: "Bad", nodes: [] }));
  await poll(() => evaluate("document.querySelector('.import-errors')?.textContent"), value => value?.includes("2–60"), "schema error");
  const fixture = {
    building: "Imported State Test",
    nodes: [
      { id: "R1", label: "West Room", type: "room", x: -400, y: 800 },
      { id: "R2", label: "Blocked Room", type: "room", x: -400, y: 1200 },
      { id: "C1", label: "Main Hall", type: "junction", x: 100, y: 800 },
      { id: "E1", label: "Closed Exit", type: "exit", x: 600, y: 800 },
      { id: "E2", label: "Open Exit", type: "exit", x: 600, y: 1200 },
    ],
    edges: [
      { id: "a", from: "R1", to: "C1", cost: 2 },
      { id: "b", from: "C1", to: "E1", cost: 3 },
      { id: "c", from: "C1", to: "E2", cost: 4 },
      { id: "d", from: "R2", to: "E2", cost: 5 },
    ],
    initial_state: { blocked_nodes: ["R2"], blocked_edges: ["c"], closed_exits: ["E1"] },
  };
  await importJson("state-test.json", JSON.stringify(fixture));
  await poll(() => evaluate("document.querySelector('.building-title h2').textContent"), value => value === fixture.building, "valid replacement");
  assert.equal(await evaluate("document.querySelector('#start-location').value"), "");
  assert.equal(await evaluate("document.querySelector('.import-errors')"), null);
  assert.equal(await evaluate("document.querySelectorAll('.map-node.unavailable').length"), 2);
  assert.equal(await evaluate("document.querySelectorAll('.map-edge.unavailable').length"), 3);
  assert.equal(await evaluate("document.querySelector('option[value=R2]').disabled"), true);
  assert.equal(await evaluate("document.querySelectorAll('.map-node.exit[role=button]').length"), 0);
  await evaluate("(() => { const s=document.querySelector('#start-location'); s.value='R1'; s.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await poll(() => evaluate("document.querySelector('.result-status').textContent"), value => value === "No route available", "unreachable status");
  for (const width of [320, 375, 768, 1024, 1440]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 800 });
    assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true, `horizontal overflow at ${width}px`);
    if (width < 800) assert.equal(await evaluate("document.querySelector('.route-panel').getBoundingClientRect().top >= document.querySelector('.map-panel').getBoundingClientRect().bottom"), true);
  }
  await command("Emulation.setDeviceMetricsOverride", { width: 375, height: 1100, deviceScaleFactor: 1, mobile: true });
  const mobile = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(resolve(artifacts, "mobile.png"), Buffer.from(mobile.data, "base64"));
  // Valid coordinates may be zero, coincident, tiny, or close to numeric limits.
  for (const coordinates of [[0, 0], [1e-320, -1e-320], [1e308, -1e308]]) {
    const data = structuredClone(fixture);
    data.nodes.forEach((node, index) => { node.x = coordinates[index % 2]; node.y = coordinates[(index + 1) % 2]; });
    await importJson("coordinates.json", JSON.stringify(data));
    await poll(() => evaluate("document.querySelector('.source-file').textContent"), value => value === "coordinates.json", "coordinate import");
    assert.equal(await evaluate("[...document.querySelectorAll('.map-node')].every(node => !/NaN|Infinity/.test(node.getAttribute('transform')))"), true);
  }
  console.log("PASS: sample, costs, mouse/keyboard/dropdown selection, route highlight, invalid imports, replacement, initial state, no route, 5 responsive widths, extreme coordinates.");
  console.log(`Screenshots: ${artifacts}`);
} finally {
  socket?.close();
  chrome.kill();
  server.close();
}
