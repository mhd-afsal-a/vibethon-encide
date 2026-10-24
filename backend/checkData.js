const fs = require("fs");
const path = require("path");

const REQUIRED_FIELDS = [
  "id",
  "title",
  "why_now",
  "documents",
  "where",
  "time",
  "fee",
  "depends_on",
  "source_url",
  "last_verified",
];

const DATA_DIR = path.join(__dirname, "..", "data");
const FILES = ["death.json", "lost_documents.json"];

function extractSteps(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.steps)) return data.steps;
  return [];
}

function hasField(step, field) {
  return Object.prototype.hasOwnProperty.call(step, field) && step[field] !== undefined;
}

function uniqueIds(steps) {
  const seen = new Set();
  const dupes = new Set();
  for (const step of steps) {
    if (typeof step.id !== "string") continue;
    if (seen.has(step.id)) dupes.add(step.id);
    seen.add(step.id);
  }
  return { seen, dupes };
}

function missingDependsOn(steps, ids) {
  const missing = [];
  for (const step of steps) {
    const deps = Array.isArray(step.depends_on) ? step.depends_on : [];
    for (const dep of deps) {
      if (!ids.has(dep)) missing.push({ from: step.id, dep });
    }
  }
  return missing;
}

function hasCircularDeps(steps) {
  const ids = new Set(steps.map((step) => step.id).filter((id) => typeof id === "string"));
  const graph = new Map();
  for (const step of steps) {
    if (typeof step.id !== "string") continue;
    const deps = Array.isArray(step.depends_on) ? step.depends_on : [];
    graph.set(
      step.id,
      deps.filter((dep) => ids.has(dep))
    );
  }

  const visiting = new Set();
  const visited = new Set();

  function dfs(id) {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dep of graph.get(id) || []) {
      if (dfs(dep)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  for (const id of graph.keys()) {
    if (dfs(id)) return true;
  }
  return false;
}

function httpsFailures(steps) {
  return steps.filter((step) => typeof step.source_url !== "string" || !step.source_url.startsWith("https://"));
}

function collectAppliesIf(node, acc) {
  if (Array.isArray(node)) {
    for (const item of node) collectAppliesIf(item, acc);
    return;
  }
  if (!node || typeof node !== "object") return;

  if (node.applies_if && typeof node.applies_if === "object" && !Array.isArray(node.applies_if)) {
    for (const [key, value] of Object.entries(node.applies_if)) {
      if (!acc.has(key)) acc.set(key, new Set());
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) {
        acc.get(key).add(typeof item === "string" ? item : JSON.stringify(item));
      }
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "applies_if") continue;
    collectAppliesIf(value, acc);
  }
}

function printResult(n, label, pass, detail) {
  const status = pass ? "PASS" : "FAIL";
  const extra = !pass && detail ? ` — ${detail}` : "";
  console.log(`${n}) ${label}: ${status}${extra}`);
  return pass;
}

function checkFile(filename) {
  const rel = path.join("data", filename);
  const abs = path.join(DATA_DIR, filename);
  console.log(`\n=== ${rel} ===`);

  let data;
  try {
    data = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (err) {
    printResult(1, "valid JSON", false, err.message);
    printResult(2, "required step fields", false, "skipped (invalid JSON)");
    printResult(3, "ids unique within file", false, "skipped (invalid JSON)");
    printResult(4, "depends_on ids exist in file", false, "skipped (invalid JSON)");
    printResult(5, "no circular dependencies", false, "skipped (invalid JSON)");
    printResult(6, "source_url starts with https://", false, "skipped (invalid JSON)");
    return { ok: false, appliesIf: new Map() };
  }

  const steps = extractSteps(data);
  let ok = true;

  ok = printResult(1, "valid JSON", true) && ok;

  const missingFields = [];
  for (const step of steps) {
    const missing = REQUIRED_FIELDS.filter((field) => !hasField(step, field));
    if (missing.length) {
      missingFields.push(`${step.id || "(no id)"}: ${missing.join(", ")}`);
    }
  }
  ok =
    printResult(
      2,
      "required step fields",
      missingFields.length === 0,
      missingFields.join("; ")
    ) && ok;

  const { seen, dupes } = uniqueIds(steps);
  ok =
    printResult(
      3,
      "ids unique within file",
      dupes.size === 0,
      `duplicates: ${[...dupes].join(", ")}`
    ) && ok;

  const missingDeps = missingDependsOn(steps, seen);
  ok =
    printResult(
      4,
      "depends_on ids exist in file",
      missingDeps.length === 0,
      missingDeps.map((m) => `${m.from} -> ${m.dep}`).join("; ")
    ) && ok;

  ok = printResult(5, "no circular dependencies", !hasCircularDeps(steps)) && ok;

  const badUrls = httpsFailures(steps);
  ok =
    printResult(
      6,
      "source_url starts with https://",
      badUrls.length === 0,
      badUrls.map((s) => s.id || s.source_url).join(", ")
    ) && ok;

  const appliesIf = new Map();
  collectAppliesIf(data, appliesIf);
  return { ok, appliesIf };
}

function printAppliesIf(filename, appliesIf) {
  const rel = path.join("data", filename);
  if (appliesIf.size === 0) {
    console.log(`${rel}: no applies_if keys`);
    return;
  }
  console.log(`${rel}:`);
  for (const key of [...appliesIf.keys()].sort()) {
    const values = [...appliesIf.get(key)].sort();
    console.log(`  ${key}: ${values.join(", ")}`);
  }
}

let allOk = true;
const appliesByFile = [];

for (const file of FILES) {
  const result = checkFile(file);
  allOk = allOk && result.ok;
  appliesByFile.push([file, result.appliesIf]);
}

console.log("\n=== applies_if keys ===");
for (const [file, appliesIf] of appliesByFile) {
  printAppliesIf(file, appliesIf);
}

process.exit(allOk ? 0 : 1);
