/**
 * Ollama AI behavior analyzer.
 *
 * Sends a user's recent action history to a locally-running Ollama LLM
 * and asks it to assess whether the behavior is suspicious.
 *
 * Ollama must be running locally (default: http://localhost:11434).
 * If it is not running, every call returns null — detection continues
 * without AI analysis and no errors are thrown.
 *
 * Environment variables:
 *   OLLAMA_URL   — base URL of the Ollama server  (default: http://localhost:11434)
 *   OLLAMA_MODEL — model to use                   (default: llama3.2)
 *
 * Usage:
 *   const analysis = await analyzeUserBehavior({ userId, recentActions, triggeredRule, currentScore });
 *   // analysis → { suspicious, confidence, reason, model, analyzedAt } | null
 */

const OLLAMA_BASE  = process.env.OLLAMA_URL   ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
const TIMEOUT_MS   = 30_000; // 30 s — small 3B models respond well within this

/**
 * Asks the local Ollama LLM whether a user's recent activity is suspicious.
 *
 * @param {{
 *   userId:        string,
 *   recentActions: Array<{action:string, timestamp:string|Date, ipAddress?:string}>,
 *   triggeredRule: string,
 *   currentScore:  number,
 * }} params
 *
 * @returns {Promise<{
 *   suspicious:  boolean,
 *   confidence:  number,   // 0.0 – 1.0
 *   reason:      string,
 *   model:       string,
 *   analyzedAt:  string,   // ISO timestamp
 * } | null>}
 */
export async function analyzeUserBehavior({ userId, recentActions, triggeredRule, currentScore }) {
  const actionLines = (recentActions ?? [])
    .slice(0, 20)
    .map((a) => {
      const ts = a.timestamp ? new Date(a.timestamp).toISOString() : "unknown";
      const ip = a.ipAddress || "unknown";
      return `  - ${a.action} at ${ts} from IP ${ip}`;
    })
    .join("\n");

  const prompt =
    `You are a security monitor for a financial consulting web application.\n` +
    `Analyze the following user activity and decide if it is suspicious.\n\n` +
    `User ID: ${userId}\n` +
    `Rule that fired: ${triggeredRule}\n` +
    `Accumulated risk score: ${currentScore}/100\n` +
    `Recent actions (newest first):\n${actionLines || "  (no actions recorded)"}\n\n` +
    `Respond with ONLY a JSON object — no markdown, no extra text:\n` +
    `{"suspicious": true, "confidence": 0.85, "reason": "one-sentence explanation"}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:   OLLAMA_MODEL,
        prompt,
        stream:  false,
        format:  "json",           // tells Ollama to enforce JSON output
        options: { temperature: 0.1 }, // low temperature → consistent structure
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) return null;

    const data    = await res.json();
    const rawText = data.response ?? "";

    const parsed = JSON.parse(rawText);

    if (
      typeof parsed.suspicious === "boolean" &&
      typeof parsed.confidence === "number"  &&
      typeof parsed.reason     === "string"
    ) {
      return {
        suspicious:  parsed.suspicious,
        confidence:  Math.min(1, Math.max(0, parsed.confidence)),
        reason:      parsed.reason,
        model:       OLLAMA_MODEL,
        analyzedAt:  new Date().toISOString(),
      };
    }

    return null;
  } catch {
    // Ollama not running, request timed out, or LLM returned malformed JSON.
    // Always swallowed — AI analysis must never affect the detection pipeline.
    return null;
  }
}
