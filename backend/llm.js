require("dotenv").config({ path: require("path").join(__dirname, ".env"), quiet: true });

const TIMEOUT_MS = 45000;
const MAX_ATTEMPTS = 2; // first try + one automatic retry

const DEFAULT_MODELS = {
  gemini: "gemini-3.5-flash-lite", // gemini-2.5-flash is closed to new API keys
  anthropic: "claude-haiku-5-5",
};

const JSON_RULE =
  "Reply with a single valid JSON object only. No prose, no explanations, no markdown code fences.";

function getApiKey() {
  const key = (process.env.LLM_API_KEY || "").trim();
  if (!key || /^your_actual_(api_)?key_here$/i.test(key)) {
    throw new Error("LLM_API_KEY is not set in backend/.env.");
  }
  return key;
}

// LLM_PROVIDER wins if set; otherwise infer from the key's format.
function getProvider(key) {
  const explicit = (process.env.LLM_PROVIDER || "").trim().toLowerCase();
  if (explicit) {
    if (!DEFAULT_MODELS[explicit]) {
      throw new Error(`Unknown LLM_PROVIDER "${explicit}". Use "gemini" or "anthropic".`);
    }
    return explicit;
  }
  return key.startsWith("sk-ant-") ? "anthropic" : "gemini";
}

let cachedClient = null;

function getClient(provider, key) {
  if (cachedClient && cachedClient.provider === provider) return cachedClient.client;
  let client;
  if (provider === "anthropic") {
    const Anthropic = require("@anthropic-ai/sdk");
    // Retries and timeouts are handled below so there is exactly one retry.
    client = new (Anthropic.default || Anthropic)({ apiKey: key, maxRetries: 0 });
  } else {
    const { GoogleGenAI } = require("@google/genai");
    client = new GoogleGenAI({ apiKey: key });
  }
  cachedClient = { provider, client };
  return client;
}

async function callGemini(client, model, systemPrompt, userText, signal) {
  const response = await client.models.generateContent({
    model,
    contents: userText,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      temperature: 0,
      abortSignal: signal,
    },
  });
  return response.text || "";
}

async function callAnthropic(client, model, systemPrompt, userText, signal) {
  const response = await client.messages.create(
    {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    },
    { signal, timeout: TIMEOUT_MS },
  );
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

function stripCodeFences(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)\n?```$/);
  return (fenced ? fenced[1] : trimmed).trim();
}

function parseJson(text) {
  const cleaned = stripCodeFences(text);
  if (!cleaned) throw new Error("The model returned an empty reply.");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("The model reply was not valid JSON.");
  }
}

function withTimeout(run) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`The model did not respond within ${TIMEOUT_MS / 1000} seconds.`));
    }, TIMEOUT_MS);
  });
  return Promise.race([run(controller.signal), timeout]).finally(() => clearTimeout(timer));
}

// Error messages from SDKs can echo request details; make sure the key never leaks.
function redact(message, key) {
  return String(message || "Unknown error").split(key).join("[redacted]");
}

async function askJson(systemPrompt, userData) {
  const key = getApiKey();
  const provider = getProvider(key);
  const model = process.env.LLM_MODEL || DEFAULT_MODELS[provider];
  const client = getClient(provider, key);
  const call = provider === "anthropic" ? callAnthropic : callGemini;

  const system = `${systemPrompt}\n\n${JSON_RULE}`;
  const userText = JSON.stringify(userData ?? {});

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const text = await withTimeout((signal) => call(client, model, system, userText, signal));
      return parseJson(text);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `LLM request failed after ${MAX_ATTEMPTS} attempts (${provider}/${model}): ${redact(
      lastError && lastError.message,
      key,
    )}`,
  );
}

module.exports = { askJson };
