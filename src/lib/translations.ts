export type Language = "en" | "bn";

const en = {
  theme: "Color theme", light: "Light", dark: "Dark", system: "System", fileTooLarge: "Building files must be 5 MiB or smaller.", unexpectedError: "The simulation could not be displayed.", recoverError: "Try again", errorHelp: "Try restoring the simulation. If the problem continues, reload this page and import the building again.",
  simulator: "EVACUATION ROUTE SIMULATOR", home: "Smart Escape home", simulationMode: "SIMULATION MODE",
  localPrivate: "Local & private", importJson: "Import JSON", changeFile: "Change file", readingFile: "Reading file…", reset: "Reset", resetHazards: "Reset hazards",
  language: "Interface language", intelligence: "BUILDING INTELLIGENCE", headline: "Every second counts.", headlineEnd: "Know your way out.", introduction: "Explore your building. Choose a starting point. Find your safest route.",
  loadingBuilding: "Loading building", simulationReady: "Simulation ready", awaitingBuilding: "Awaiting building", workspace: "CLIENT-SIDE WORKSPACE",
  importFailed: "Building could not be loaded", importKept: "Your current building and route have been kept. Fix the file and try again.", importPrompt: "Choose a valid building JSON to start the simulation.", dismissErrors: "Dismiss import errors",
  map: "Interactive building map", overview: "Building overview", noFile: "No file loaded", liveMap: "LIVE MAP", floorPlan: "FLOOR PLAN", topology: "TOPOLOGY VIEW",
  loadingMap: "Loading your building…", emptyMap: "Your map starts here", preparingDemo: "Preparing the demo simulation.", importMapPrompt: "Import a building JSON to explore evacuation routes.", selectMap: "Select a room or junction to begin",
  locations: "{count} locations", corridorCount: "{count} corridors", openExitCount: "{count} open exits", footer: "Interactive evacuation planning", privacy: "All processing stays in your browser",
  planner: "ROUTE PLANNER", plannerTitle: "Your way to safety.", plannerIntro: "Choose where you are. Find the lowest-cost path to an open exit.", startLocation: "Start location", selectStart: "Select a starting location", selectRoom: "Select a room or junction", selectOnMap: "Or select a location directly on the map.",
  routeAvailable: "Route available", noRoute: "No route available", startBlocked: "Starting location blocked", calculationUnavailable: "Route calculation unavailable", safeRoute: "SAFE ROUTE", yourRoute: "YOUR ROUTE", currentRoute: "Current route", lowestCost: "Lowest-cost path to safety", sequenceEmpty: "Your route will appear here once you choose a location.",
  destination: "DESTINATION", totalCost: "TOTAL COST", corridors: "CORRIDORS", weightedCost: "Weighted cost", alongRoute: "Along your route", openExit: "Open exit", detailsEmpty: "Your destination and route details will appear here.", unreachable: "This location cannot reach an open exit with the current building state.", unblockStart: "Unblock the selected location or reset hazards to restore routing. Your start selection is kept.",
  legend: "Map legend", room: "Room", junction: "Junction", exit: "Exit", corridor: "corridor", location: "location", activeRoute: "Active route", blockedUnavailable: "Blocked / unavailable", routingNote: "Routes use corridor costs and current hazards. Changes reroute automatically.",
  controls: "SIMULATION CONTROLS", hazardTitle: "Change conditions. See your route adapt.", hazardIntro: "Toggle a hazard below. Routes update immediately; map clicks still select your start.", roomsJunctions: "Rooms & junctions", blockAccess: "Block access to a location", corridorHazard: "Corridors", blockCorridor: "Make a corridor unavailable", exits: "Exits", closeExit: "Close or reopen a safe exit",
  blocked: "Blocked", available: "Available", unavailable: "Unavailable", open: "Open", closed: "Closed", block: "Block", unblock: "Unblock", close: "Close", reopen: "Reopen", blockedNodes: "Blocked nodes", blockedCorridors: "Blocked corridors", closedExits: "Closed exits", blockedCount: "{count} blocked", closedCount: "{count} closed", cost: "Cost {cost}",
  mapDescription: "{building} building map. Select an available room or junction to plan a route.", corridorCosts: "Corridor costs", buildingLocations: "Building locations", selectAsStart: "select as start", startCaption: "START LOCATION", blockedStartCaption: "START · BLOCKED", closedExitCaption: "CLOSED EXIT", blockedCaption: "BLOCKED", safeExitCaption: "SAFE EXIT",
  invalidJson: "The file is not valid JSON.", readFailed: "The selected file could not be read.", sampleFailed: "Sample building could not be loaded.", routeFailed: "Unable to calculate this route.", costOverflow: "Route total exceeds JavaScript's safe integer range.",
} as const;

export type TranslationKey = keyof typeof en;
const bn: Record<TranslationKey, string> = {
  theme: "রঙের থিম", light: "হালকা", dark: "গাঢ়", system: "সিস্টেম", fileTooLarge: "ভবনের ফাইল 5 MiB বা ছোট হতে হবে।", unexpectedError: "সিমুলেশন দেখানো যায়নি।", recoverError: "আবার চেষ্টা করুন", errorHelp: "সিমুলেশন ফিরিয়ে আনার চেষ্টা করুন। সমস্যা থাকলে পৃষ্ঠা আবার লোড করে ভবন আমদানি করুন।",
  simulator: "জরুরি নির্গমন পথের সিমুলেটর", home: "স্মার্ট এস্কেপ হোম", simulationMode: "সিমুলেশন মোড",
  localPrivate: "স্থানীয় ও ব্যক্তিগত", importJson: "JSON আমদানি", changeFile: "ফাইল বদলান", readingFile: "ফাইল পড়া হচ্ছে…", reset: "রিসেট", resetHazards: "ঝুঁকি রিসেট",
  language: "ইন্টারফেসের ভাষা", intelligence: "ভবনের তথ্য", headline: "প্রতিটি সেকেন্ড জরুরি।", headlineEnd: "বের হওয়ার পথ জানুন।", introduction: "ভবন দেখুন। শুরুর স্থান বাছুন। নিরাপদে বের হওয়ার পথ খুঁজুন।",
  loadingBuilding: "ভবন লোড হচ্ছে", simulationReady: "সিমুলেশন প্রস্তুত", awaitingBuilding: "ভবনের অপেক্ষায়", workspace: "ব্রাউজারে চালিত সিমুলেশন",
  importFailed: "ভবন লোড করা যায়নি", importKept: "বর্তমান ভবন ও পথ অপরিবর্তিত আছে। ফাইল ঠিক করে আবার চেষ্টা করুন।", importPrompt: "সিমুলেশন শুরু করতে সঠিক ভবনের JSON বাছুন।", dismissErrors: "ত্রুটির বার্তা সরান",
  map: "ইন্টারঅ্যাক্টিভ ভবনের মানচিত্র", overview: "ভবনের মানচিত্র", noFile: "ফাইল লোড হয়নি", liveMap: "সক্রিয় মানচিত্র", floorPlan: "তলার নকশা", topology: "সংযোগচিত্র",
  loadingMap: "ভবন লোড হচ্ছে…", emptyMap: "এখানেই আপনার মানচিত্র", preparingDemo: "নমুনা সিমুলেশন প্রস্তুত হচ্ছে।", importMapPrompt: "নির্গমন পথ দেখতে ভবনের JSON আমদানি করুন।", selectMap: "শুরু করতে কক্ষ বা সংযোগস্থল বাছুন",
  locations: "{count}টি স্থান", corridorCount: "{count}টি করিডর", openExitCount: "{count}টি খোলা প্রস্থান", footer: "ইন্টারঅ্যাক্টিভ নির্গমন পরিকল্পনা", privacy: "সব প্রক্রিয়া আপনার ব্রাউজারেই চলে",
  planner: "পথ পরিকল্পনা", plannerTitle: "নিরাপদে বের হওয়ার পথ।", plannerIntro: "আপনার অবস্থান বাছুন। খোলা প্রস্থানে সর্বনিম্ন খরচের পথ খুঁজুন।", startLocation: "শুরুর স্থান", selectStart: "শুরুর স্থান বাছুন", selectRoom: "কক্ষ বা সংযোগস্থল বাছুন", selectOnMap: "মানচিত্রেও সরাসরি একটি স্থান বাছতে পারেন।",
  routeAvailable: "পথ পাওয়া গেছে", noRoute: "কোনো পথ নেই", startBlocked: "শুরুর স্থান অবরুদ্ধ", calculationUnavailable: "পথ গণনা করা যাচ্ছে না", safeRoute: "নিরাপদ পথ", yourRoute: "আপনার পথ", currentRoute: "বর্তমান পথ", lowestCost: "নিরাপদে যাওয়ার সর্বনিম্ন খরচের পথ", sequenceEmpty: "একটি স্থান বাছলে আপনার পথ এখানে দেখা যাবে।",
  destination: "গন্তব্য", totalCost: "মোট খরচ", corridors: "করিডর", weightedCost: "ওজনভিত্তিক খরচ", alongRoute: "আপনার পথের করিডর", openExit: "খোলা প্রস্থান", detailsEmpty: "গন্তব্য ও পথের তথ্য এখানে দেখা যাবে।", unreachable: "বর্তমান অবস্থায় এই স্থান থেকে কোনো খোলা প্রস্থানে পৌঁছানো যায় না।", unblockStart: "পথ ফিরে পেতে নির্বাচিত স্থান খুলুন বা ঝুঁকি রিসেট করুন। শুরুর স্থান অপরিবর্তিত আছে।",
  legend: "মানচিত্রের চিহ্ন", room: "কক্ষ", junction: "সংযোগস্থল", exit: "প্রস্থান", corridor: "করিডর", location: "স্থান", activeRoute: "সক্রিয় পথ", blockedUnavailable: "অবরুদ্ধ / অনুপলব্ধ", routingNote: "করিডরের খরচ ও বর্তমান ঝুঁকি দিয়ে পথ গণনা হয়। পরিবর্তনে পথ সঙ্গে সঙ্গে বদলায়।",
  controls: "সিমুলেশন নিয়ন্ত্রণ", hazardTitle: "পরিস্থিতি বদলান। নতুন পথ দেখুন।", hazardIntro: "নিচে ঝুঁকি বদলালে পথ সঙ্গে সঙ্গে বদলাবে। মানচিত্রে ক্লিক করে শুরুর স্থান বাছুন।", roomsJunctions: "কক্ষ ও সংযোগস্থল", blockAccess: "কোনো স্থানে প্রবেশ বন্ধ করুন", corridorHazard: "করিডর", blockCorridor: "করিডরের চলাচল বন্ধ করুন", exits: "প্রস্থানগুলো", closeExit: "প্রস্থান বন্ধ করুন বা আবার খুলুন",
  blocked: "অবরুদ্ধ", available: "ব্যবহারযোগ্য", unavailable: "অনুপলব্ধ", open: "খোলা", closed: "বন্ধ", block: "অবরুদ্ধ করুন", unblock: "অবরোধ সরান", close: "বন্ধ করুন", reopen: "আবার খুলুন", blockedNodes: "অবরুদ্ধ স্থান", blockedCorridors: "অবরুদ্ধ করিডর", closedExits: "বন্ধ প্রস্থান", blockedCount: "{count}টি অবরুদ্ধ", closedCount: "{count}টি বন্ধ", cost: "খরচ {cost}",
  mapDescription: "{building} ভবনের মানচিত্র। পথ দেখতে ব্যবহারযোগ্য কক্ষ বা সংযোগস্থল বাছুন।", corridorCosts: "করিডরের খরচ", buildingLocations: "ভবনের স্থানগুলো", selectAsStart: "শুরুর স্থান হিসেবে বাছুন", startCaption: "শুরুর স্থান", blockedStartCaption: "শুরু · অবরুদ্ধ", closedExitCaption: "বন্ধ প্রস্থান", blockedCaption: "অবরুদ্ধ", safeExitCaption: "নিরাপদ প্রস্থান",
  invalidJson: "ফাইলটি সঠিক JSON নয়।", readFailed: "নির্বাচিত ফাইল পড়া যায়নি।", sampleFailed: "নমুনা ভবন লোড করা যায়নি।", routeFailed: "এই পথ গণনা করা যায়নি।", costOverflow: "পথের মোট খরচ নির্ভুল সংখ্যা গণনার সীমা ছাড়িয়েছে।",
};

export function translate(language: Language, key: TranslationKey, values: Record<string, string | number> = {}): string {
  const template = (language === "bn" ? bn : en)[key];
  return template.replace(/\{(\w+)\}/g, (placeholder: string, name: string) => String(values[name] ?? placeholder));
}

/** Presentation-only translations keep the validator and its field paths unchanged. */
export function localizeError(error: string, language: Language): string {
  if (language === "en") return error;
  const known: [string, TranslationKey][] = [
    [en.fileTooLarge, "fileTooLarge"],
    [en.invalidJson, "invalidJson"], [en.readFailed, "readFailed"], [en.sampleFailed, "sampleFailed"],
    [en.routeFailed, "routeFailed"], [en.costOverflow, "costOverflow"],
  ];
  const key = known.find(([original]) => original === error)?.[1];
  if (key) return translate(language, key);
  if (error.startsWith("Sample building could not be loaded")) return bn.sampleFailed + " " + bn.importMapPrompt;
  const messages: [RegExp, string][] = [
    [/^Validation stopped after 100 errors\. Fix the reported fields and re-import\.$/, "100টি ত্রুটির পরে যাচাই থামানো হয়েছে। দেখানো ক্ষেত্রগুলো ঠিক করে আবার আমদানি করুন।"],
    [/^Building data must be a JSON object\.$/, "ভবনের তথ্য একটি JSON অবজেক্ট হতে হবে।"],
    [/^At least one room or junction is required\.$/, "অন্তত একটি কক্ষ বা সংযোগস্থল থাকতে হবে।"],
    [/^At least one exit is required\.$/, "অন্তত একটি প্রস্থান থাকতে হবে।"],
    [/^(.+) must contain (.+) entries\.$/, "$1-এ $2টি তথ্য থাকতে হবে।"],
    [/^(.+) must be a non-empty string\.$/, "$1 খালি নয় এমন লেখা হতে হবে।"],
    [/^(.+) must be a finite number\.$/, "$1 একটি সসীম সংখ্যা হতে হবে।"],
    [/^(.+) must be a positive safe integer\.$/, "$1 একটি ধনাত্মক নিরাপদ পূর্ণসংখ্যা হতে হবে।"],
    [/^(.+) must be an array of IDs\.$/, "$1 ID-এর তালিকা হতে হবে।"],
    [/^(.+) must be an array\.$/, "$1 একটি তালিকা হতে হবে।"],
    [/^(.+) must be an object\.$/, "$1 একটি অবজেক্ট হতে হবে।"],
    [/^(.+) must be a string ID\.$/, "$1 লেখা হিসেবে ID হতে হবে।"],
    [/^(.+) must be room, junction, or exit\.$/, "$1 room, junction বা exit হতে হবে।"],
    [/^(.+) duplicates (node|edge) ID "(.*)"\.$/, "$1-এ পুনরাবৃত্ত ID \"$3\" আছে।"],
    [/^(.+) must reference an existing node ID\.$/, "$1-এ বিদ্যমান স্থানের ID দিতে হবে।"],
    [/^(.+) cannot be a self-loop\.$/, "$1 একই স্থানের সঙ্গে সংযোগ হতে পারবে না।"],
    [/^(.+) repeats an undirected node pair\.$/, "$1-এ একই স্থানজোড়ার সংযোগ পুনরাবৃত্ত হয়েছে।"],
    [/^(.+) references unknown (node|edge) "(.*)"\.$/, "$1-এ অজানা ID \"$3\" আছে।"],
    [/^(.+) must reference a room or junction; use closed_exits for exits\.$/, "$1-এ কক্ষ বা সংযোগস্থলের ID দিতে হবে; প্রস্থানের জন্য closed_exits ব্যবহার করুন।"],
    [/^(.+) must reference an exit\.$/, "$1-এ প্রস্থানের ID দিতে হবে।"],
  ];
  for (const [pattern, replacement] of messages) if (pattern.test(error)) return error.replace(pattern, replacement);
  return error;
}
