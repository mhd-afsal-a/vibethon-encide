const fs = require("fs");
const path = require("path");
const { askJson } = require("./llm");
const { EXPLAIN_PROMPT, INTAKE_PROMPT } = require("./prompts");

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

const MAX_EXPLANATION_CHARS = 300;
// Any digit (any script), any currency symbol, or a written-out rupee marker.
const FORBIDDEN_IN_EXPLANATION = /\p{Nd}|\p{Sc}|\bRs\b|\bINR\b|\brupees?\b/iu;

function isValidExplanation(text) {
  return (
    typeof text === "string" &&
    text.trim().length > 0 &&
    text.trim().length <= MAX_EXPLANATION_CHARS &&
    !FORBIDDEN_IN_EXPLANATION.test(text)
  );
}

// Map returned explanations onto the selected steps; anything missing or invalid falls back to why_now.
function mergeExplanations(steps, reply) {
  if (!reply || !Array.isArray(reply.explanations)) {
    throw new Error("LLM reply is missing the explanations list.");
  }

  const selectedIds = new Set(steps.map((step) => step.id));
  const byId = new Map();
  for (const entry of reply.explanations) {
    if (!entry || !selectedIds.has(entry.id) || byId.has(entry.id)) continue;
    byId.set(entry.id, entry.text);
  }

  return steps.map((step) => {
    const text = byId.get(step.id);
    return { ...step, explanation: isValidExplanation(text) ? text.trim() : step.why_now };
  });
}

async function explainRoadmap(answers, steps, ask = askJson) {
  if (steps.length === 0) return { ai_status: "ok", steps };

  const userData = {
    answers,
    steps: steps.map(({ id, title, why_now }) => ({ id, title, why_now })),
  };

  try {
    const reply = await ask(EXPLAIN_PROMPT, userData);
    return { ai_status: "ok", steps: mergeExplanations(steps, reply) };
  } catch (error) {
    console.warn(`AI explanations unavailable, using why_now: ${error.message}`);
    return { ai_status: "fallback", steps };
  }
}

const INTAKE_MIN_CONFIDENCE = 0.7;

// Keep only answers that name a real question and an allowed option; multi answers become arrays.
function sanitizeAnswers(questions, raw) {
  const answers = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return answers;

  for (const question of questions) {
    const allowed = new Set((question.options || []).map((option) => option.value));
    const value = raw[question.key];
    if (question.type === "multi") {
      const list = (Array.isArray(value) ? value : [value]).filter((item) => allowed.has(item));
      if (list.length > 0) answers[question.key] = [...new Set(list)];
    } else if (typeof value === "string" && allowed.has(value)) {
      answers[question.key] = value;
    }
  }
  return answers;
}

async function classifyIntake(prompt, questionsByEvent, supportedEvents, ask = askJson) {
  const events = supportedEvents.map((id) => ({
    id,
    questions: (questionsByEvent[id] || []).map(({ key, label, type, options }) => ({
      key,
      label,
      type: type === "multi" ? "multi" : "single",
      options: (options || []).map(({ value, label: optionLabel }) => ({ value, label: optionLabel })),
    })),
  }));

  try {
    const reply = await ask(INTAKE_PROMPT, { message: prompt, events });
    const event = reply && reply.event;
    const confidence = Number(reply && reply.confidence);
    if (!supportedEvents.includes(event) || !(confidence >= INTAKE_MIN_CONFIDENCE)) {
      return { event: null, answers: {}, ai_status: "ok" };
    }
    return {
      event,
      answers: sanitizeAnswers(questionsByEvent[event] || [], reply.answers),
      ai_status: "ok",
    };
  } catch (error) {
    console.warn(`AI intake unavailable: ${error.message}`);
    return { event: null, answers: {}, ai_status: "fallback" };
  }
}

module.exports = {
  loadPack,
  selectSteps,
  orderSteps,
  buildRoadmap,
  explainRoadmap,
  mergeExplanations,
  sanitizeAnswers,
  classifyIntake,
};
