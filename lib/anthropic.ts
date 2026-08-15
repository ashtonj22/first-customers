import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function isLiveMode(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const MODEL_ID = "claude-sonnet-5";

/**
 * Extract the first JSON object/array found in a text blob. Claude is asked
 * to return raw JSON, but we parse defensively in case it wraps it in prose
 * or a code fence.
 */
export function extractJSON<T>(text: string): T | null {
  const cleaned = text.trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // fall through
  }
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim()) as T;
    } catch {
      // fall through
    }
  }
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  const start =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
        ? firstBrace
        : Math.min(firstBrace, firstBracket);
  if (start === -1) return null;
  const opener = cleaned[start];
  const closer = opener === "{" ? "}" : "]";
  const end = cleaned.lastIndexOf(closer);
  if (end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/**
 * Call Claude and expect a JSON-shaped response. Returns { data: null,
 * usedFallback: true } whenever the API key is missing, the call fails, or
 * the response can't be parsed — callers must supply a deterministic
 * fallback so the app never breaks live.
 */
export async function callClaudeJSON<T>(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<{ data: T | null; usedFallback: boolean }> {
  if (!isLiveMode()) {
    return { data: null, usedFallback: true };
  }
  try {
    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model: MODEL_ID,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";
    const parsed = extractJSON<T>(text);
    if (parsed === null) {
      console.error("[claude] response was not parseable JSON:", text.slice(0, 300));
      return { data: null, usedFallback: true };
    }
    return { data: parsed, usedFallback: false };
  } catch (err) {
    console.error("[claude] API call failed:", err instanceof Error ? err.message : err);
    return { data: null, usedFallback: true };
  }
}
