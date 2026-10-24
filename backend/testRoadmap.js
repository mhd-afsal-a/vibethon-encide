const path = require("path");
const { spawn } = require("child_process");

const MAIN_PORT = 3101;
const FALLBACK_PORT = 3102;
// Looks like a real Gemini key, so the request reaches the provider and is rejected.
const INVALID_KEY = "AIzaSyInvalidKeyForFallbackTest000000000";

const samples = [
  {
    label: "Both PAN and driving licence lost",
    event: "lost_documents",
    answers: { lost_item: ["pan_card", "driving_licence"] },
  },
  {
    label: "Only PAN lost",
    event: "lost_documents",
    answers: { lost_item: ["pan_card"] },
  },
  {
    label: "Death event",
    event: "death",
    answers: {},
  },
];

function startServer(port, extraEnv = {}) {
  const child = spawn(process.execPath, [path.join(__dirname, "server.js")], {
    cwd: __dirname,
    env: { ...process.env, ...extraEnv, PORT: String(port) },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => (stderr += chunk));

  const ready = (async () => {
    for (let i = 0; i < 50; i++) {
      if (child.exitCode !== null) {
        throw new Error(`Server on port ${port} exited early:\n${stderr.trim()}`);
      }
      try {
        const res = await fetch(`http://localhost:${port}/health`);
        if (res.ok) return;
      } catch {
        // not listening yet
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`Server on port ${port} did not start in time.`);
  })();

  return { child, ready };
}

async function postRoadmap(port, event, answers) {
  const res = await fetch(`http://localhost:${port}/roadmap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, answers }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.error || JSON.stringify(body)}`);
  return body;
}

function printRoadmap(label, roadmap) {
  console.log(`\n${label}`);
  console.log(`tier: ${roadmap.tier} | ai_status: ${roadmap.ai_status}`);
  if (roadmap.steps.length === 0) {
    console.log("(no steps)");
    return;
  }
  roadmap.steps.forEach((step, index) => {
    const source = step.explanation === step.why_now ? " [why_now]" : "";
    console.log(`${index + 1}. ${step.title}`);
    console.log(`   ${step.explanation}${source}`);
  });
}

async function main() {
  const main = startServer(MAIN_PORT);
  const fallback = startServer(FALLBACK_PORT, { LLM_API_KEY: INVALID_KEY, LLM_PROVIDER: "gemini" });
  let failed = false;

  try {
    await Promise.all([main.ready, fallback.ready]);

    console.log("=== Full flow (key from .env) ===");
    for (const sample of samples) {
      try {
        printRoadmap(sample.label, await postRoadmap(MAIN_PORT, sample.event, sample.answers));
      } catch (error) {
        failed = true;
        console.log(`\n${sample.label}\nFAILED: ${error.message}`);
      }
    }

    console.log("\n=== Fallback test (invalid key) ===");
    const sample = samples[0];
    const roadmap = await postRoadmap(FALLBACK_PORT, sample.event, sample.answers);
    printRoadmap(`${sample.label} — invalid key`, roadmap);

    const usesWhyNow = roadmap.steps.every((step) => step.explanation === step.why_now);
    if (roadmap.ai_status === "fallback" && usesWhyNow && roadmap.steps.length > 0) {
      console.log("\nPASS: invalid key returned ai_status 'fallback' with why_now explanations.");
    } else {
      failed = true;
      console.log(
        `\nFAIL: expected ai_status 'fallback' with why_now explanations, got ai_status '${roadmap.ai_status}'` +
          (usesWhyNow ? "." : " and AI-written explanations."),
      );
    }
  } finally {
    main.child.kill();
    fallback.child.kill();
  }

  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
