import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      // Dev-only: proxy /api/analyze to Anthropic so the edge function isn't needed locally
      {
        name: "api-proxy",
        configureServer(server) {
          server.middlewares.use("/api/analyze", async (req, res) => {
            if (req.method !== "POST") {
              res.writeHead(405); res.end("Method not allowed"); return;
            }
            let body = "";
            req.on("data", (c) => (body += c));
            req.on("end", async () => {
              try {
                const { scores, archetype, topFigure } = JSON.parse(body);
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
                const resp = await fetch("https://api.anthropic.com/v1/messages", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": env.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                  },
                  body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: prompt }],
                  }),
                });
                const data = await resp.json();
                const text = data.content?.map((b) => b.text || "").join("") || "";
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ text }));
              } catch (e) {
                console.error("Proxy error:", e);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "proxy error" }));
              }
            });
          });
        },
      },
    ],
    server: { port: 5174 },
  };
});
