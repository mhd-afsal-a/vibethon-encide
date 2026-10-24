require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { buildRoadmap, explainRoadmap, classifyIntake } = require("./engine");

const app = express();
const PORT = process.env.PORT || 3001;
const ROADMAP_PATH = path.join(__dirname, "fakeRoadmap.json");
const QUESTIONS_PATH = path.join(__dirname, "..", "data", "questions.json");
const SUPPORTED_EVENTS = new Set(["death", "lost_documents"]);

app.use(cors());
app.use(express.json());

function loadFakeRoadmap() {
  return JSON.parse(fs.readFileSync(ROADMAP_PATH, "utf8"));
}

function loadQuestions() {
  return JSON.parse(fs.readFileSync(QUESTIONS_PATH, "utf8"));
}

function validateAnswers(event, answers) {
  const incoming = answers == null ? {} : answers;
  if (typeof incoming !== "object" || Array.isArray(incoming)) {
    return {
      ok: false,
      message: "Please send answers as an object mapping question keys to your choices.",
    };
  }

  const questions = loadQuestions()[event] || [];
  const allowedKeys = new Set(questions.map((q) => q.key));

  for (const key of Object.keys(incoming)) {
    if (!allowedKeys.has(key)) {
      return {
        ok: false,
        message: `We don't have a question called "${key}" for this event.`,
      };
    }
  }

  for (const question of questions) {
    if (!(question.key in incoming)) continue;

    const value = incoming[question.key];
    const optionValues = (question.options || []).map((option) => option.value);
    const label = question.label || question.key;

    if (question.type === "multi") {
      if (!Array.isArray(value)) {
        return {
          ok: false,
          message: `Please choose one or more options for "${label}".`,
        };
      }
      for (const item of value) {
        if (!optionValues.includes(item)) {
          return {
            ok: false,
            message: `"${item}" is not a valid choice for "${label}".`,
          };
        }
      }
    } else if (Array.isArray(value) || !optionValues.includes(value)) {
      return {
        ok: false,
        message: `"${Array.isArray(value) ? value.join(", ") : value}" is not a valid choice for "${label}".`,
      };
    }
  }

  return { ok: true };
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/roadmap-test", (_req, res) => {
  res.json(loadFakeRoadmap());
});

app.get("/questions/:event", (req, res) => {
  const { event } = req.params;
  const all = loadQuestions();
  if (!Object.prototype.hasOwnProperty.call(all, event)) {
    return res.status(404).json({ error: `No questions found for "${event}".` });
  }
  res.json(all[event]);
});

app.post("/roadmap", async (req, res) => {
  const { event, answers } = req.body || {};

  if (!SUPPORTED_EVENTS.has(event)) {
    return res.json({ tier: "unsupported", event, steps: [] });
  }

  const validation = validateAnswers(event, answers);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.message });
  }

  // validateAnswers has already rejected unknown keys and invalid choices.
  const validAnswers = answers || {};
  const ordered = buildRoadmap(event, validAnswers);
  const { ai_status, steps } = await explainRoadmap(validAnswers, ordered);
  res.json({
    tier: "verified",
    event,
    ai_status,
    steps,
  });
});

const MAX_INTAKE_CHARS = 1000;

app.post("/intake", async (req, res) => {
  const { prompt } = req.body || {};
  const text = typeof prompt === "string" ? prompt.trim() : "";

  if (!text) {
    return res.status(400).json({ error: "Please describe your situation in a few words." });
  }
  if (text.length > MAX_INTAKE_CHARS) {
    return res
      .status(400)
      .json({ error: `Please keep your description under ${MAX_INTAKE_CHARS} characters.` });
  }

  const result = await classifyIntake(text, loadQuestions(), [...SUPPORTED_EVENTS]);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
