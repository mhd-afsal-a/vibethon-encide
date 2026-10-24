const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function loadPack(event) {
  if (typeof event !== "string" || !/^[a-z0-9_]+$/i.test(event)) {
    throw new Error("Invalid event name.");
  }
  const file = path.join(DATA_DIR, `${event}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function answerMatches(answer, value) {
  if (Array.isArray(answer)) return answer.includes(value);
  return answer === value;
}

function stepApplies(step, answers) {
  const rule = step.applies_if;
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) return true;
  return Object.entries(rule).every(([key, value]) => answerMatches(answers[key], value));
}

function selectSteps(event, answers = {}) {
  const pack = loadPack(event);
  const steps = Array.isArray(pack.steps) ? pack.steps : [];
  return steps.filter((step) => stepApplies(step, answers || {}));
}

function orderSteps(steps) {
  const fileIndex = new Map();
  const byId = new Map();
  steps.forEach((step, index) => {
    fileIndex.set(step.id, index);
    byId.set(step.id, step);
  });
  const included = new Set(byId.keys());

  const indegree = new Map();
  const dependents = new Map();
  for (const step of steps) {
    indegree.set(step.id, 0);
    dependents.set(step.id, []);
  }

  for (const step of steps) {
    const deps = (step.depends_on || []).filter((id) => included.has(id));
    indegree.set(step.id, deps.length);
    for (const dep of deps) {
      dependents.get(dep).push(step.id);
    }
  }

  const remaining = new Set(included);
  const ordered = [];

  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter((id) => indegree.get(id) === 0)
      .sort((a, b) => fileIndex.get(a) - fileIndex.get(b));

    if (ready.length === 0) {
      const rest = [...remaining].sort((a, b) => fileIndex.get(a) - fileIndex.get(b));
      for (const id of rest) ordered.push(byId.get(id));
      break;
    }

    const next = ready[0];
    remaining.delete(next);
    ordered.push(byId.get(next));
    for (const child of dependents.get(next) || []) {
      indegree.set(child, indegree.get(child) - 1);
    }
  }

  return ordered;
}

function buildRoadmap(event, answers = {}) {
  const ordered = orderSteps(selectSteps(event, answers));
  const included = new Set(ordered.map((step) => step.id));
  return ordered.map((step) => ({
    ...step,
    explanation: step.why_now,
    depends_on: (step.depends_on || []).filter((id) => included.has(id)),
  }));
}

module.exports = {
  loadPack,
  selectSteps,
  orderSteps,
  buildRoadmap,
};
