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
                const { prompt } = JSON.parse(body);
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
