/* Gemini REST client. Security invariants:
   - The key is supplied by the user at runtime and lives ONLY in
     localStorage (remembered) or sessionStorage (session-only).
   - It is sent exclusively to generativelanguage.googleapis.com, in the
     x-goog-api-key HEADER — never in a URL, so it cannot leak into logs
     or browser history.
   - The service worker has no caching rule for this host. */
const KEY = "wc26:geminiKey";
const MODEL = "wc26:geminiModel";
export const DEFAULT_MODEL = "gemini-2.5-flash";

export function getKey() {
  try { return localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || ""; } catch { return ""; }
}
export function hasKey() { return !!getKey(); }
export function isRemembered() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}
export function setKey(key, remember) {
  forgetKey();
  if (!key) return;
  try { (remember ? localStorage : sessionStorage).setItem(KEY, key.trim()); } catch { /* private mode */ }
}
export function forgetKey() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function getModel() {
  try { return localStorage.getItem(MODEL) || DEFAULT_MODEL; } catch { return DEFAULT_MODEL; }
}
export function setModel(m) {
  try { localStorage.setItem(MODEL, (m || DEFAULT_MODEL).trim()); } catch { /* ignore */ }
}

export class GeminiError extends Error {
  constructor(message, kind = "error") {
    super(message);
    this.kind = kind; // 'auth' | 'quota' | 'error'
  }
}

export async function generateContent(prompt, { system, temperature = 0.7, grounding = false } = {}) {
  const key = getKey();
  if (!key) throw new GeminiError("No API key set — add your free Gemini key in Settings.", "auth");
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: 2048 },
  };
  if (system) body.system_instruction = { parts: [{ text: system }] };
  if (grounding) body.tools = [{ google_search: {} }];

  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getModel())}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
      }
    );
  } catch {
    throw new GeminiError("Couldn't reach Gemini — check your connection.", "error");
  }

  if (res.status === 400 || res.status === 401 || res.status === 403) {
    throw new GeminiError("Gemini rejected the request — check your API key (and model name) in Settings.", "auth");
  }
  if (res.status === 429) {
    throw new GeminiError("Free-tier rate limit reached. Wait a minute and try again.", "quota");
  }
  if (!res.ok) throw new GeminiError(`Gemini error (HTTP ${res.status}).`, "error");

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();
  if (!text) throw new GeminiError("Gemini returned an empty response — try again.", "error");
  return text;
}

export async function testKey() {
  return generateContent("Reply with exactly: OK", { temperature: 0 });
}
