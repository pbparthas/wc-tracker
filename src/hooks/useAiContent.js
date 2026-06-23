import { useCallback, useState } from "react";
import { generateContent, hasKey } from "../lib/gemini.js";
import { systemInstruction } from "../lib/prompts.js";
import { cacheGet, cacheSet } from "../lib/storage.js";

/* The one pattern behind every AI feature: cache-first, never auto-fires
   (free-tier quota belongs to the user), degrades to an "add key" nudge. */
export function useAiContent(cacheKey, buildPrompt, { ttlMs = Infinity, grounding = false } = {}) {
  const full = "ai:" + cacheKey;
  const [item, setItem] = useState(() => cacheGet(full));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = await buildPrompt();
      const text = await generateContent(prompt, { system: systemInstruction(), grounding });
      const entry = { text, t: Date.now() };
      cacheSet(full, entry, ttlMs);
      setItem(entry);
    } catch (e) {
      setError(e);
    }
    setLoading(false);
  }, [buildPrompt, full, ttlMs, grounding]);

  return {
    text: item?.text || null,
    generatedAt: item?.t ? new Date(item.t) : null,
    loading,
    error,
    generate,
    keyReady: hasKey(),
  };
}
