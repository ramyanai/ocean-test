export const config = { runtime: "edge" };

// In-memory rate limiting (per edge instance — not perfect but catches most abuse)
const ipHits = new Map();   // ip -> [timestamps]
const dailyCount = { date: "", count: 0 };

const IP_LIMIT = 3;          // max analyses per IP per hour
const IP_WINDOW_MS = 3600000; // 1 hour
const DAILY_CAP = 500;       // global daily cap (~$3.50/day max)

function getIP(req) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  // Reset daily counter at midnight
  if (dailyCount.date !== today) {
    dailyCount.date = today;
    dailyCount.count = 0;
  }

  // Global daily cap
  if (dailyCount.count >= DAILY_CAP) {
    return { allowed: false, reason: "Daily limit reached. Try again tomorrow." };
  }

  // Per-IP rate limit
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < IP_WINDOW_MS);
  if (hits.length >= IP_LIMIT) {
    return { allowed: false, reason: "You've used all your analyses for this hour. Try again later." };
  }

  // Record hit
  hits.push(now);
  ipHits.set(ip, hits);
  dailyCount.count++;

  return { allowed: true };
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limit check
  const ip = getIP(req);
  const { allowed, reason } = checkRateLimit(ip);
  if (!allowed) {
    return new Response(JSON.stringify({ error: reason }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "3600" },
    });
  }

  try {
    const { scores, archetype, topFigure } = await req.json();

    // Validate structured input
    const VALID_TRAITS = ["O", "C", "E", "A", "N"];
    if (!scores || typeof scores !== "object"
      || !VALID_TRAITS.every(t => typeof scores[t] === "number" && scores[t] >= 0 && scores[t] <= 100)
      || !archetype || typeof archetype.name !== "string" || typeof archetype.tagline !== "string"
      || !topFigure || typeof topFigure.name !== "string") {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build prompt server-side — client cannot inject arbitrary text
    const prompt = `You are an expert personality psychologist analyzing Big Five (OCEAN) personality test results. Be conversational, insightful, and specific. Never use bullet points.

The person scored:
- Openness: ${scores.O}th percentile
- Conscientiousness: ${scores.C}th percentile
- Extraversion: ${scores.E}th percentile
- Agreeableness: ${scores.A}th percentile
- Neuroticism: ${scores.N}th percentile

Their archetype is "${archetype.name}" — ${archetype.tagline}.
Their closest famous figure match is ${topFigure.name} (${topFigure.tag || ""}) at ${topFigure.similarity || 0}% similarity.

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "crossTraitAnalysis": "2-3 paragraphs analyzing how their specific trait COMBINATIONS interact.",
  "archetypeExplanation": "1 paragraph explaining why they got this archetype.",
  "figureMatchReasoning": "1 paragraph explaining WHY they matched with ${topFigure.name}.",
  "tensionPoints": "1 paragraph about where their traits pull against each other.",
  "growthEdges": "1 paragraph with 2-3 specific, actionable suggestions."
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", response.status, err);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.content?.map((b) => b.text || "").join("") || "";

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
