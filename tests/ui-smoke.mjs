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
let sampleDelay = 0;
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname === "/sample-building.json" && sampleDelay) await new Promise(done => setTimeout(done, sampleDelay));
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
const browserErrors = [];
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
    if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
    if (message.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(message.params.type)) browserErrors.push(message.params.args.map(arg => arg.value ?? arg.description).join(" "));
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
  async function importJson(name, contents, waitForRead = true) {
    const file = resolve(artifacts, name);
    await writeFile(file, contents);
    const { root: document } = await command("DOM.getDocument");
    const { nodeId } = await command("DOM.querySelector", { nodeId: document.nodeId, selector: "input[type=file]" });
    await command("DOM.setFileInputFiles", { nodeId, files: [file] });
    if (waitForRead) await poll(() => evaluate("document.querySelector('.import-button').disabled"), value => value === false, "file read");
  }
  async function capture(name) {
    const height = await evaluate("document.documentElement.scrollHeight");
    const width = await evaluate("window.innerWidth");
    const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
    await writeFile(resolve(artifacts, name), Buffer.from(screenshot.data, "base64"));
  }
  async function checkContrast(selector, minimum = 4.5) {
    const ratio = await evaluate(`(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      const color = getComputedStyle(node).color.match(/[\\d.]+/g).map(Number);
      let parent = node, background;
      while (parent) {
        const values = getComputedStyle(parent).backgroundColor.match(/[\\d.]+/g).map(Number);
        if (values.length === 3 || values[3] === 1) { background = values; break; }
        parent = parent.parentElement;
      }
      function luminance(rgb) { return rgb.slice(0,3).map(value => { const c=value/255; return c<=.04045 ? c/12.92 : ((c+.055)/1.055)**2.4; }).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0); }
      const a=luminance(color), b=luminance(background);
      return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    })()`);
    assert.ok(ratio >= minimum, `${selector} contrast ${ratio.toFixed(2)}:1 (minimum ${minimum}:1)`);
  }
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  sampleDelay = 2000;
  await command("Page.navigate", { url: `http://127.0.0.1:${address.port}` });
  await poll(() => evaluate("Boolean(document.querySelector('input[type=file]')) && document.querySelector('.main-content')?.style.opacity === '1'"), value => value, "hydrated initial import control");
  await importJson("invalid-during-sample.json", "{broken");
  await poll(() => evaluate("document.querySelector('.import-errors')?.textContent"), value => value?.includes("not valid JSON"), "invalid import while sample is pending");
  await poll(() => evaluate("document.querySelectorAll('.map-node').length"), count => count === 8, "sample render");
  assert.ok((await evaluate("document.querySelector('.import-errors')?.textContent")).includes("not valid JSON"));
  await evaluate("document.querySelector('.dismiss-button').click()");
  sampleDelay = 0;
  assert.equal(await evaluate("document.documentElement.dataset.theme"), "light");
  assert.equal(await evaluate("document.querySelectorAll('.cost-label text').length"), 7);
  const point = await evaluate("(() => { const r = document.querySelector('.map-node.room .node-shape').getBoundingClientRect(); return { x: r.x+r.width/2, y: r.y+r.height/2 }; })()");
  await command("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
  await command("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
  await poll(() => evaluate("document.querySelector('#start-location').value"), value => value === "R1", "map selection");
  assert.equal(await evaluate("document.querySelectorAll('.map-edge.active').length"), 3);
  assert.equal(await evaluate("document.querySelector('.destination-id').textContent"), "E1 · Open exit");
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.sequence-node')].map(node => node.textContent)"), ["R1", "C1", "C2", "E1"]);
  await evaluate("(() => { const s=document.querySelector('#start-location'); s.value='C3'; s.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await poll(() => evaluate("document.querySelector('.map-node.selected').getAttribute('aria-label')"), value => value.includes("C3"), "dropdown synchronization");
  assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.selected .junction-center')).fill"), await evaluate("getComputedStyle(document.querySelector('.selected .node-shape')).fill"), "selected junction dot remains visible");
  await evaluate("document.querySelector('.map-node.room').focus()");
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter" });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter" });
  await poll(() => evaluate("document.querySelector('#start-location').value"), value => value === "R1", "keyboard selection");
  async function clickHazard(key, id) {
    const selector = `[data-hazard="${key}"][data-id="${id}"]`;
    const before = await evaluate(`document.querySelector(${JSON.stringify(selector)}).getAttribute('aria-pressed')`);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await poll(() => evaluate(`document.querySelector(${JSON.stringify(selector)}).getAttribute('aria-pressed')`), value => value !== before, `toggle ${key} ${id}`);
  }
  async function selectStart(id) {
    await evaluate(`(() => { const s=document.querySelector('#start-location'); s.value=${JSON.stringify(id)}; s.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await poll(() => evaluate("document.querySelector('#start-location').value"), value => value === id, "start selection");
  }
  let activeLanguage = "en";
  async function setLanguage(language) {
    await evaluate(`document.querySelector('[data-language="${language}"]').click()`);
    await poll(() => evaluate("document.documentElement.lang"), value => value === language, "document language");
    activeLanguage = language;
    assert.equal(await evaluate(`document.querySelector('[data-language="${language}"]').getAttribute('aria-pressed')`), "true");
  }
  async function expectRoute(nodeIds, cost) {
    await poll(() => evaluate("[...document.querySelectorAll('.sequence-node')].map(node => node.textContent)"), value => JSON.stringify(value) === JSON.stringify(nodeIds), "route sequence");
    assert.equal(await evaluate("Number(document.querySelector('.route-metrics strong').textContent)"), cost);
    assert.equal(await evaluate("Number(document.querySelectorAll('.route-metrics strong')[1].textContent)"), nodeIds.length - 1);
    assert.equal(await evaluate("document.querySelectorAll('.map-edge.active').length"), nodeIds.length - 1);
    assert.equal(await evaluate("document.querySelector('.destination-id').textContent"), `${nodeIds.at(-1)} · ${activeLanguage === "en" ? "Open exit" : "খোলা প্রস্থান"}`);
    assert.equal(await evaluate("document.querySelector('.result-status').textContent"), activeLanguage === "en" ? "Route available" : "পথ পাওয়া গেছে");
  }
  await expectRoute(["R1", "C1", "C2", "E1"], 7);
  await clickHazard("blockedNodes", "C2");
  await expectRoute(["R1", "C1", "C3", "C4", "E2"], 11);
  assert.equal(await evaluate("document.querySelector('#start-location').value"), "R1");
  await clickHazard("blockedNodes", "C2");
  await expectRoute(["R1", "C1", "C2", "E1"], 7);
  await clickHazard("closedExits", "E1");
  await expectRoute(["R1", "C1", "C3", "C4", "E2"], 11);
  await clickHazard("closedExits", "E2");
  await poll(() => evaluate("document.querySelector('.result-status').textContent"), value => value === "No route available", "both exits closed");
  assert.equal(await evaluate("document.querySelectorAll('.map-edge.active').length"), 0);
  assert.equal(await evaluate("document.querySelector('.exit-count').textContent"), "0 open exits");
  await evaluate("document.querySelector('.reset-button').click()");
  await expectRoute(["R1", "C1", "C2", "E1"], 7);
  await selectStart("R2");
  await expectRoute(["R2", "C3", "C4", "E2"], 7);
  await selectStart("R1");
  await clickHazard("blockedNodes", "R1");
  await poll(() => evaluate("document.querySelector('.result-status').textContent"), value => value === "Starting location blocked", "blocked start exact status");
  assert.equal(await evaluate("document.querySelector('#start-location').value"), "R1");
  assert.equal(await evaluate("document.querySelectorAll('.map-node.selected.unavailable').length"), 1);
  assert.equal(await evaluate("document.querySelectorAll('.map-edge.active').length"), 0);
  assert.ok((await evaluate("document.querySelector('.route-sequence').textContent")).includes("Starting location blocked"));
  await clickHazard("blockedNodes", "R1");
  await expectRoute(["R1", "C1", "C2", "E1"], 7);
  await clickHazard("blockedEdges", "e2");
  await expectRoute(["R1", "C1", "C3", "C4", "E2"], 11);
  assert.equal(await evaluate("document.querySelectorAll('.map-edge.blocked-edge').length"), 1);
  await clickHazard("blockedEdges", "e2");
  await expectRoute(["R1", "C1", "C2", "E1"], 7);
  async function setTheme(theme) {
    await evaluate(`document.querySelector('[data-theme-choice="${theme}"]').click()`);
    await poll(() => evaluate("document.documentElement.dataset.themePreference"), value => value === theme, "theme preference");
    assert.equal(await evaluate(`document.querySelector('[data-theme-choice="${theme}"]').getAttribute('aria-pressed')`), "true");
  }
  // Theme changes preserve route, hazards and the selected start.
  await clickHazard("blockedNodes", "C2");
  for (const theme of ["dark", "light", "system"]) {
    await setTheme(theme);
    await expectRoute(["R1", "C1", "C3", "C4", "E2"], 11);
    assert.equal(await evaluate("document.querySelector('#start-location').value"), "R1");
    assert.equal(await evaluate("document.querySelector('[data-id=C2][data-hazard=blockedNodes]').getAttribute('aria-pressed')"), "true");
  }
  await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  await poll(() => evaluate("document.documentElement.dataset.theme"), value => value === "dark", "system dark change");
  await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
  await poll(() => evaluate("document.documentElement.dataset.theme"), value => value === "light", "system light change");
  await clickHazard("blockedNodes", "C2");
  // Replay every mandatory scenario in both themes and both languages.
  for (const theme of ["light", "dark"]) for (const language of ["en", "bn"]) {
    await setTheme(theme);
    await setLanguage(language);
    await evaluate("document.querySelector('.reset-button').click()");
    await selectStart("R1");
    await expectRoute(["R1", "C1", "C2", "E1"], 7);
    for (const selector of [".panel-intro", ".result-status", ".import-button", ".sequence-node.first", ".sequence-node.last", ".theme-switcher button[aria-pressed=true]"]) await checkContrast(selector);
    await clickHazard("blockedNodes", "C2");
    await expectRoute(["R1", "C1", "C3", "C4", "E2"], 11);
    await evaluate("document.querySelector('.reset-button').click()");
    await clickHazard("closedExits", "E1");
    await clickHazard("closedExits", "E2");
    assert.equal(await evaluate("document.querySelector('.result-status').textContent"), language === "en" ? "No route available" : "কোনো পথ নেই");
    await checkContrast(".result-status");
    await checkContrast(".hazard-toggle.is-active .hazard-state");
    await evaluate("document.querySelector('.reset-button').click()");
    await selectStart("R2");
    await expectRoute(["R2", "C3", "C4", "E2"], 7);
    await selectStart("R1");
    await clickHazard("blockedNodes", "R1");
    assert.equal(await evaluate("document.querySelector('.result-status').textContent"), language === "en" ? "Starting location blocked" : "শুরুর স্থান অবরুদ্ধ");
    await clickHazard("blockedNodes", "R1");
    for (const width of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
      await command("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: width < 800 });
      assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true, `${theme}/${language} overflow ${width}px`);
      assert.equal(await evaluate("document.querySelector('.building-svg').getBoundingClientRect().width > 0"), true);
      if (width < 800) assert.equal(await evaluate("document.querySelector('.route-panel').getBoundingClientRect().top >= document.querySelector('.map-panel').getBoundingClientRect().bottom"), true);
      await poll(() => evaluate("[...document.querySelectorAll('.node-hit-area')].every(node => node.getBoundingClientRect().width >= 43)"), value => value, `map hit target at ${width}px`);
      assert.equal(await evaluate("[...document.querySelectorAll('.theme-switcher button')].every(node => node.getBoundingClientRect().height >= 39)"), true);
      if ((width === 390 && language === "bn") || (width === 1440 && language === "en")) await capture(`${theme}-${language}-${width}.png`);
    }
  }
  await setLanguage("en");
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await setTheme("dark");
  await evaluate("document.documentElement.dataset.testOld='true'");
  await command("Page.reload");
  await poll(() => evaluate("!document.documentElement.dataset.testOld && document.querySelectorAll('.map-node').length === 8"), value => value, "persisted theme reload");
  assert.equal(await evaluate("document.documentElement.dataset.theme"), "dark");
  assert.equal(await evaluate("localStorage.getItem('smart-escape-theme')"), "dark");
  await evaluate("localStorage.setItem('smart-escape-theme','invalid')");
  await evaluate("document.documentElement.dataset.testOld='true'");
  await command("Page.reload");
  await poll(() => evaluate("!document.documentElement.dataset.testOld && document.querySelectorAll('.map-node').length === 8"), value => value, "invalid theme preference reload");
  assert.equal(await evaluate("document.documentElement.dataset.themePreference"), "system");
  assert.equal(await evaluate("document.documentElement.dataset.theme"), "light");
  // Browser storage can be unavailable; theme changes must still work in memory.
  await evaluate("window.originalStorageSet=Storage.prototype.setItem; Storage.prototype.setItem=function(){throw new DOMException('Storage unavailable','SecurityError')}");
  await evaluate("document.querySelector('[data-theme-choice=dark]').focus()");
  assert.equal(await evaluate("document.activeElement.dataset.themeChoice"), "dark");
  await command("Page.bringToFront");
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await poll(() => evaluate("document.documentElement.dataset.theme"), value => value === "dark", "keyboard theme switch with unavailable storage");
  await evaluate("Storage.prototype.setItem=window.originalStorageSet; delete window.originalStorageSet");
  await setTheme("system");
  await selectStart("R1");
  // Repeat all mandatory scenarios in Bangla; changing language preserves simulation.
  await setLanguage("bn");
  await expectRoute(["R1", "C1", "C2", "E1"], 7);
  assert.equal(await evaluate("document.querySelector('.building-title h2').textContent"), "Campus Demo");
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.node-label')].map(node => node.textContent)"), ["Room 1", "Room 2", "Junction 1", "Junction 2", "Junction 3", "Junction 4", "East Exit", "South Exit"]);
  assert.equal(await evaluate("document.querySelector('.import-button').textContent"), "ফাইল বদলান");
  await clickHazard("blockedNodes", "C2");
  await expectRoute(["R1", "C1", "C3", "C4", "E2"], 11);
  await clickHazard("blockedNodes", "C2");
  await clickHazard("closedExits", "E1");
  await clickHazard("closedExits", "E2");
  await poll(() => evaluate("document.querySelector('.result-status').textContent"), value => value === "কোনো পথ নেই", "Bangla no route");
  await evaluate("document.querySelector('.reset-button').click()");
  await selectStart("R2");
  await expectRoute(["R2", "C3", "C4", "E2"], 7);
  await selectStart("R1");
  await clickHazard("blockedNodes", "R1");
  await poll(() => evaluate("document.querySelector('.result-status').textContent"), value => value === "শুরুর স্থান অবরুদ্ধ", "Bangla blocked start");
  await setLanguage("en");
  assert.equal(await evaluate("document.querySelector('.result-status').textContent"), "Starting location blocked");
  assert.equal(await evaluate("document.querySelector('#start-location').value"), "R1");
  await setLanguage("bn");
  await clickHazard("blockedNodes", "R1");
  await expectRoute(["R1", "C1", "C2", "E1"], 7);
  await importJson("invalid-bangla.json", "{broken");
  await poll(() => evaluate("document.querySelector('.import-errors')?.textContent"), value => value?.includes("ফাইলটি সঠিক JSON নয়।"), "Bangla JSON error");
  await importJson("invalid-schema-bangla.json", JSON.stringify({ building: "Bad", nodes: [] }));
  await poll(() => evaluate("document.querySelector('.import-errors')?.textContent"), value => value?.includes("nodes-এ 2–60টি তথ্য থাকতে হবে।"), "Bangla validation fields");
  await evaluate("document.querySelector('.dismiss-button').click()");
  for (const width of [320, 375, 768, 1024, 1440]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 800 });
    assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true, `Bangla horizontal overflow at ${width}px`);
    assert.equal(await evaluate("document.querySelector('.building-svg').getBoundingClientRect().width > 0"), true);
    if (width < 800) assert.equal(await evaluate("document.querySelector('.route-panel').getBoundingClientRect().top >= document.querySelector('.map-panel').getBoundingClientRect().bottom"), true);
  }
  await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await clickHazard("blockedNodes", "C2");
  await expectRoute(["R1", "C1", "C3", "C4", "E2"], 11);
  await clickHazard("blockedNodes", "C2");
  await expectRoute(["R1", "C1", "C2", "E1"], 7);
  assert.equal(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"), true);
  await setLanguage("en");
  await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await importJson("invalid.json", "{broken");
  await poll(() => evaluate("document.querySelector('.import-errors')?.textContent"), value => value?.includes("not valid JSON"), "syntax error");
  assert.equal(await evaluate("document.querySelector('#start-location').value"), "R1");
  assert.equal(await evaluate("document.querySelectorAll('.map-edge.active').length"), 3);
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
  // A committed manual import must win over a pending sample fetch.
  sampleDelay = 2000;
  await evaluate("document.documentElement.dataset.testOld='true'");
  await command("Page.reload");
  await poll(() => evaluate("!document.documentElement.dataset.testOld && document.querySelector('.main-content')?.style.opacity === '1'"), value => value, "hydrated fresh import control");
  await importJson("state-test.json", JSON.stringify(fixture));
  await poll(() => evaluate("document.querySelector('.building-title h2').textContent"), value => value === fixture.building, "valid replacement");
  await pause(2200);
  sampleDelay = 0;
  assert.equal(await evaluate("document.querySelector('.building-title h2').textContent"), fixture.building, "sample cannot replace manual import");
  assert.equal(await evaluate("document.querySelector('#start-location').value"), "");
  assert.equal(await evaluate("document.querySelector('.import-errors')"), null);
  assert.equal(await evaluate("document.querySelectorAll('.map-node.unavailable').length"), 2);
  assert.equal(await evaluate("document.querySelectorAll('.map-edge.unavailable').length"), 3);
  assert.equal(await evaluate("document.querySelector('option[value=R2]').disabled"), true);
  assert.equal(await evaluate("document.querySelectorAll('.map-node.exit[role=button]').length"), 0);
  await evaluate("(() => { const s=document.querySelector('#start-location'); s.value='R1'; s.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await poll(() => evaluate("document.querySelector('.result-status').textContent"), value => value === "No route available", "unreachable status");
  await clickHazard("blockedNodes", "R2");
  await clickHazard("blockedEdges", "c");
  await clickHazard("closedExits", "E1");
  await expectRoute(["R1", "C1", "E1"], 5);
  assert.equal(await evaluate("document.querySelectorAll('.hazard-toggle.is-active').length"), 0);
  await evaluate("document.querySelector('.reset-button').click()");
  await poll(() => evaluate("document.querySelectorAll('.hazard-toggle.is-active').length"), value => value === 3, "reset to nonempty imported state");
  assert.equal(await evaluate("document.querySelector('#start-location').value"), "R1");
  assert.equal(await evaluate("document.querySelector('.result-status').textContent"), "No route available");
  assert.equal(await evaluate("document.querySelectorAll('.map-edge.unavailable').length"), 3);
  await clickHazard("blockedNodes", "R1");
  await importJson("invalid-while-hazardous.json", "{broken");
  await poll(() => evaluate("document.querySelector('.import-errors')?.textContent"), value => value?.includes("not valid JSON"), "invalid import preserves runtime hazards");
  assert.equal(await evaluate("document.querySelectorAll('.hazard-toggle.is-active').length"), 4);
  assert.equal(await evaluate("document.querySelector('.result-status').textContent"), "Starting location blocked");
  await evaluate("document.querySelector('.reset-button').click()");
  await poll(() => evaluate("document.querySelectorAll('.hazard-toggle.is-active').length"), value => value === 3, "reset after invalid import");
  await evaluate("document.querySelector('.dismiss-button').click()");
  await importJson("state-test.json", JSON.stringify(fixture));
  await poll(() => evaluate("document.querySelector('#start-location').value"), value => value === "", "same-file reimport clears start");
  assert.equal(await evaluate("document.querySelectorAll('.hazard-toggle.is-active').length"), 3);
  // Resolve two reads out of order: only the latest import may commit.
  await evaluate("window.originalFileText=File.prototype.text; File.prototype.text=async function(){const text=await window.originalFileText.call(this); if(this.name==='slow-import.json') await new Promise(done=>window.finishSlowImport=done); return text;}");
  await importJson("slow-import.json", JSON.stringify({ ...fixture, building: "Stale graph" }), false);
  await poll(() => evaluate("typeof window.finishSlowImport"), value => value === "function", "pending slow file read");
  await importJson("latest-import.json", JSON.stringify(fixture));
  await evaluate("window.finishSlowImport(); File.prototype.text=window.originalFileText; delete window.originalFileText; delete window.finishSlowImport");
  await pause(150);
  assert.equal(await evaluate("document.querySelector('.building-title h2').textContent"), fixture.building);
  assert.equal(await evaluate("document.querySelector('.source-file').textContent"), "latest-import.json");
  await importJson("too-large.json", " ".repeat(5 * 1024 * 1024 + 1));
  await poll(() => evaluate("document.querySelector('.import-errors')?.textContent"), value => value?.includes("5 MiB"), "oversize import");
  assert.equal(await evaluate("document.querySelector('.building-title h2').textContent"), fixture.building);
  await evaluate("document.querySelector('.dismiss-button').click()");
  for (const width of [320, 375, 768, 1024, 1440]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 800 });
    assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true, `horizontal overflow at ${width}px`);
    if (width < 800) assert.equal(await evaluate("document.querySelector('.route-panel').getBoundingClientRect().top >= document.querySelector('.map-panel').getBoundingClientRect().bottom"), true);
  }
  await command("Emulation.setDeviceMetricsOverride", { width: 375, height: 1100, deviceScaleFactor: 1, mobile: true });
  // Valid coordinates may be zero, coincident, tiny, or close to numeric limits.
  for (const coordinates of [[0, 0], [1e-320, -1e-320], [1e308, -1e308], [1e308, 1]]) {
    const data = structuredClone(fixture);
    data.nodes.forEach((node, index) => { node.x = coordinates[index % 2]; node.y = coordinates[(index + 1) % 2]; });
    await importJson("coordinates.json", JSON.stringify(data));
    await poll(() => evaluate("document.querySelector('.source-file').textContent"), value => value === "coordinates.json", "coordinate import");
    assert.equal(await evaluate("[...document.querySelectorAll('.map-node')].every(node => !/NaN|Infinity/.test(node.getAttribute('transform')))"), true);
  }
  assert.deepEqual(browserErrors, [], "browser console/hydration errors");
  const maximum = {
    building: "Maximum graph",
    nodes: Array.from({ length: 60 }, (_, index) => ({ id: `N${index}`, label: `Location ${index}`, type: index === 59 ? "exit" : "junction", x: index % 10, y: Math.floor(index / 10) })),
    edges: Array.from({ length: 59 }, (_, index) => ({ id: `long-${index}`, from: `N${index}`, to: `N${index + 1}`, cost: 1 })),
    initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: [] },
  };
  for (let a = 0; a < 60 && maximum.edges.length < 150; a++) for (let b = a + 2; b < 60 && maximum.edges.length < 150; b++) maximum.edges.push({ id: `extra-${a}-${b}`, from: `N${a}`, to: `N${b}`, cost: 100 });
  await importJson("maximum.json", JSON.stringify(maximum));
  await poll(() => evaluate("document.querySelectorAll('.map-node').length"), count => count === 60, "maximum graph render");
  assert.equal(await evaluate("document.querySelectorAll('.map-edge').length"), 150);
  await selectStart("N0");
  await expectRoute(maximum.nodes.map(node => node.id), 59);
  for (const [width, theme] of [[320, "light"], [1440, "dark"]]) {
    await setTheme(theme);
    await command("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: width < 800 });
    assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true, `maximum graph ${width}px`);
  }
  const unsafeTotal = { ...fixture, building: "Unsafe total", initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: [] }, edges: fixture.edges.map(edge => ({ ...edge, cost: Number.MAX_SAFE_INTEGER })) };
  await importJson("unsafe-total.json", JSON.stringify(unsafeTotal));
  await selectStart("R1");
  await poll(() => evaluate("document.querySelector('.result-status').textContent"), value => value === "Route calculation unavailable", "safe numeric output guard");
  assert.ok((await evaluate("document.querySelector('.empty-route').textContent")).includes("safe integer range"));
  assert.deepEqual(browserErrors, [], "unexpected browser console/hydration errors");
  // Deliberately exercise the new boundary. Only this injected failure may log errors.
  const injected = await command("Page.addScriptToEvaluateOnNewDocument", { source: "window.NativeResizeObserver=ResizeObserver; window.ResizeObserver=class{constructor(){throw new Error('Injected QA rendering failure')}}" });
  await command("Page.reload");
  await poll(() => evaluate("Boolean(document.querySelector('.failure-page'))"), value => value, "localized error boundary");
  assert.ok((await evaluate("document.querySelector('.failure-page').textContent")).includes("The simulation could not be displayed."));
  assert.ok(browserErrors.length > 0, "developer failure is logged");
  await command("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
  await evaluate("window.ResizeObserver=window.NativeResizeObserver; delete window.NativeResizeObserver; document.querySelector('.failure-page button').click()");
  await poll(() => evaluate("document.querySelectorAll('.map-node').length"), count => count === 8, "error boundary recovery");
  await selectStart("R1");
  await expectRoute(["R1", "C1", "C2", "E1"], 7);
  console.log("PASS: 21 unit checks are separate; browser verified 20 mandatory scenario combinations, 40 theme/language/width cases, key text contrast, 4 QA screenshots, system changes and persisted theme reloads, unavailable storage, initial import races and out-of-order file reads, same-file reimport, file size guard, maximum 60-node/150-edge graph, numeric overflow UX, minimum map hit targets, reduced motion, keyboard/hazard/reset/coordinate checks; zero unexpected browser errors; injected rendering failure logged and recovered.");
} finally {
  socket?.close();
  chrome.kill();
  server.close();
}
