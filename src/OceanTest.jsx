import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── QUESTIONS (25-item BFI validated scale) ─────────────────────────────────
// Big Five Inventory (BFI; John, Donahue, & Kentle, 1991)
// Copyright Oliver P. John. Used for non-commercial educational purposes.
const QUESTIONS = [
  { text: "I see myself as someone who is talkative", trait: "E", reversed: false },
  { text: "I see myself as someone who tends to find fault with others", trait: "A", reversed: true },
  { text: "I see myself as someone who does a thorough job", trait: "C", reversed: false },
  { text: "I see myself as someone who is depressed, blue", trait: "N", reversed: false },
  { text: "I see myself as someone who is original, comes up with new ideas", trait: "O", reversed: false },
  { text: "I see myself as someone who is reserved", trait: "E", reversed: true },
  { text: "I see myself as someone who is helpful and unselfish with others", trait: "A", reversed: false },
  { text: "I see myself as someone who can be somewhat careless", trait: "C", reversed: true },
  { text: "I see myself as someone who is relaxed, handles stress well", trait: "N", reversed: true },
  { text: "I see myself as someone who is curious about many different things", trait: "O", reversed: false },
  { text: "I see myself as someone who is full of energy", trait: "E", reversed: false },
  { text: "I see myself as someone who starts quarrels with others", trait: "A", reversed: true },
  { text: "I see myself as someone who is a reliable worker", trait: "C", reversed: false },
  { text: "I see myself as someone who can be tense", trait: "N", reversed: false },
  { text: "I see myself as someone who is ingenious, a deep thinker", trait: "O", reversed: false },
  { text: "I see myself as someone who generates a lot of enthusiasm", trait: "E", reversed: false },
  { text: "I see myself as someone who has a forgiving nature", trait: "A", reversed: false },
  { text: "I see myself as someone who tends to be disorganized", trait: "C", reversed: true },
  { text: "I see myself as someone who worries a lot", trait: "N", reversed: false },
  { text: "I see myself as someone who has an active imagination", trait: "O", reversed: false },
  { text: "I see myself as someone who tends to be quiet", trait: "E", reversed: true },
  { text: "I see myself as someone who is generally trusting", trait: "A", reversed: false },
  { text: "I see myself as someone who tends to be lazy", trait: "C", reversed: true },
  { text: "I see myself as someone who is emotionally stable, not easily upset", trait: "N", reversed: true },
  { text: "I see myself as someone who values artistic, aesthetic experiences", trait: "O", reversed: false },
];

const TRAITS = {
  O: { name: "Openness", color: "#6B5CA5", desc: "Intellectual curiosity, creativity, and preference for novelty" },
  C: { name: "Conscientiousness", color: "#3B7A5E", desc: "Organization, dependability, and self-discipline" },
  E: { name: "Extraversion", color: "#C47534", desc: "Energy, sociability, and tendency to seek stimulation" },
  A: { name: "Agreeableness", color: "#C25B6A", desc: "Compassion, cooperation, and trust in others" },
  N: { name: "Neuroticism", color: "#4A7BA5", desc: "Emotional sensitivity and tendency to experience stress" },
};

const TRAIT_ORDER = ["O", "C", "E", "A", "N"];

// ─── OCEAN ARCHETYPES ────────────────────────────────────────────────────────
const ARCHETYPES = [
  { name: "The Voyager", emoji: "⛵", pattern: (s) => s.O >= 65 && s.E >= 65, tagline: "Explorer of ideas and people", brief: "You chase the horizon. High curiosity paired with social energy means you're the one starting conversations about things nobody else has thought about yet." },
  { name: "The Lighthouse", emoji: "🗼", pattern: (s) => s.C >= 65 && s.E >= 65, tagline: "Organized energy that others follow", brief: "You lead by showing up consistently. Structured, outgoing, and reliable — people gravitate toward your clarity." },
  { name: "The Anchor", emoji: "⚓", pattern: (s) => s.C >= 65 && s.A >= 65, tagline: "The person everyone trusts", brief: "Dependable and warm. You're the steady hand that holds teams and relationships together when things get choppy." },
  { name: "The Tide", emoji: "🌊", pattern: (s) => s.E >= 65 && s.A >= 65, tagline: "Social glue with warm energy", brief: "You connect people. High sociability plus genuine care for others makes you the person who brings groups together." },
  { name: "The Reef", emoji: "🪸", pattern: (s) => s.C >= 65 && s.N <= 35, tagline: "Quietly resilient and unshakable", brief: "You don't rattle. Disciplined and emotionally steady — you're the calm in the storm that others lean on." },
  { name: "The Deep", emoji: "🐋", pattern: (s) => s.O >= 65 && s.E <= 40, tagline: "Rich inner world, thoughtful observer", brief: "You see what others miss. A creative introvert who processes deeply and produces insights that surprise people." },
  { name: "The Storm", emoji: "⛈️", pattern: (s) => s.O >= 65 && s.N >= 65, tagline: "Intense creative with deep feeling", brief: "Passion and sensitivity fuel your creativity. You feel everything more intensely, and that's where your best work comes from." },
  { name: "The Drift", emoji: "🍃", pattern: (s) => s.O >= 65 && s.C <= 35, tagline: "Visionary who needs an anchor", brief: "Ideas come faster than you can finish them. Your imagination is your superpower — and sometimes your trap." },
  { name: "The Harbor", emoji: "🛟", pattern: (s) => s.A >= 65 && s.N <= 35, tagline: "Calm, nurturing safe space", brief: "People exhale around you. Warm and emotionally stable — you create the conditions where others can be honest." },
  { name: "The Current", emoji: "🔄", pattern: (s) => { const vals = TRAIT_ORDER.map(t => s[t]); return (Math.max(...vals) - Math.min(...vals)) <= 30; }, tagline: "Adaptive and balanced", brief: "No extremes. You read the room and adjust. That versatility is rare — most people have sharp peaks and valleys." },
];

// ─── FAMOUS FIGURES ──────────────────────────────────────────────────────────
const FAMOUS_FIGURES = [
  { name: "Marie Curie", O: 92, C: 95, E: 30, A: 60, N: 40, tag: "Pioneering scientist" },
  { name: "Oprah Winfrey", O: 80, C: 85, E: 95, A: 85, N: 45, tag: "Media mogul" },
  { name: "Elon Musk", O: 95, C: 70, E: 55, A: 25, N: 65, tag: "Tech entrepreneur" },
  { name: "Mr. Rogers", O: 70, C: 90, E: 60, A: 98, N: 15, tag: "Beloved educator" },
  { name: "Frida Kahlo", O: 98, C: 50, E: 65, A: 45, N: 80, tag: "Iconic artist" },
  { name: "Warren Buffett", O: 65, C: 95, E: 45, A: 70, N: 20, tag: "Investment legend" },
  { name: "Serena Williams", O: 60, C: 98, E: 80, A: 40, N: 55, tag: "Tennis champion" },
  { name: "Albert Einstein", O: 99, C: 40, E: 50, A: 70, N: 35, tag: "Theoretical physicist" },
  { name: "Maya Angelou", O: 95, C: 75, E: 70, A: 80, N: 50, tag: "Poet & activist" },
  { name: "Steve Jobs", O: 95, C: 80, E: 65, A: 20, N: 60, tag: "Design visionary" },
  { name: "Jane Goodall", O: 90, C: 85, E: 40, A: 92, N: 25, tag: "Primatologist" },
  { name: "David Bowie", O: 99, C: 55, E: 75, A: 55, N: 60, tag: "Musical chameleon" },
  { name: "Ruth Bader Ginsburg", O: 75, C: 95, E: 45, A: 55, N: 30, tag: "Supreme Court justice" },
  { name: "Robin Williams", O: 95, C: 40, E: 98, A: 80, N: 75, tag: "Comedy legend" },
  { name: "Marcus Aurelius", O: 80, C: 90, E: 35, A: 65, N: 25, tag: "Philosopher emperor" },
  { name: "Dolly Parton", O: 75, C: 80, E: 90, A: 95, N: 30, tag: "Country icon & philanthropist" },
  { name: "Nikola Tesla", O: 99, C: 70, E: 20, A: 50, N: 70, tag: "Inventor & futurist" },
  { name: "Michelle Obama", O: 75, C: 90, E: 75, A: 80, N: 35, tag: "Author & advocate" },
  { name: "Anthony Bourdain", O: 95, C: 45, E: 70, A: 55, N: 65, tag: "Chef & storyteller" },
  { name: "Ada Lovelace", O: 95, C: 80, E: 35, A: 60, N: 45, tag: "Computing pioneer" },
  { name: "Muhammad Ali", O: 70, C: 85, E: 98, A: 50, N: 40, tag: "Boxing legend" },
  { name: "Brené Brown", O: 85, C: 80, E: 65, A: 85, N: 50, tag: "Vulnerability researcher" },
  { name: "Leonardo da Vinci", O: 99, C: 35, E: 45, A: 60, N: 40, tag: "Renaissance polymath" },
  { name: "Malala Yousafzai", O: 80, C: 90, E: 60, A: 85, N: 30, tag: "Education activist" },
  { name: "Keanu Reeves", O: 70, C: 75, E: 40, A: 90, N: 25, tag: "Actor & quietly kind" },
  { name: "Amelia Earhart", O: 95, C: 75, E: 70, A: 50, N: 35, tag: "Aviation pioneer" },
  { name: "Bob Ross", O: 85, C: 70, E: 55, A: 95, N: 15, tag: "Gentle painter" },
  { name: "Coco Chanel", O: 90, C: 85, E: 65, A: 30, N: 55, tag: "Fashion revolutionary" },
  { name: "Nelson Mandela", O: 80, C: 85, E: 70, A: 75, N: 20, tag: "Freedom leader" },
  { name: "Simone Biles", O: 65, C: 98, E: 70, A: 65, N: 45, tag: "Gymnastics GOAT" },
  { name: "Salvador Dalí", O: 99, C: 30, E: 90, A: 25, N: 70, tag: "Surrealist provocateur" },
  { name: "Toni Morrison", O: 95, C: 85, E: 35, A: 60, N: 40, tag: "Nobel laureate novelist" },
];

// ─── LOGIC ───────────────────────────────────────────────────────────────────
function calculateScores(answers) {
  const sums = {}, counts = {};
  TRAIT_ORDER.forEach(t => { sums[t] = 0; counts[t] = 0; });
  QUESTIONS.forEach((q, i) => {
    if (answers[i] !== undefined) {
      sums[q.trait] += q.reversed ? (6 - answers[i]) : answers[i];
      counts[q.trait]++;
    }
  });
  const scores = {};
  TRAIT_ORDER.forEach(t => {
    scores[t] = Math.round(((( counts[t] > 0 ? sums[t] / counts[t] : 3) - 1) / 4) * 100);
  });
  return scores;
}

function findArchetype(scores) {
  for (const a of ARCHETYPES) { if (a.pattern(scores)) return a; }
  return ARCHETYPES[ARCHETYPES.length - 1];
}

function findTopFigures(scores, n = 3) {
  return FAMOUS_FIGURES.map(fig => {
    const dist = Math.sqrt(TRAIT_ORDER.reduce((s, t) => s + (scores[t] - fig[t]) ** 2, 0));
    return { ...fig, similarity: Math.max(0, Math.round(100 - dist / 2.236)) };
  }).sort((a, b) => b.similarity - a.similarity).slice(0, n);
}

async function getAIAnalysis(scores, archetype, topFigures) {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scores,
        archetype: { name: archetype.name, tagline: archetype.tagline },
        topFigure: { name: topFigures[0].name, tag: topFigures[0].tag, similarity: topFigures[0].similarity },
      }),
    });
    if (res.status === 429) {
      const data = await res.json();
      return { rateLimited: true, message: data.error || "Rate limit reached. Try again later." };
    }
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    return JSON.parse((data.text || "").replace(/```json|```/g, "").trim());
  } catch (e) { console.error("AI analysis error:", e); return null; }
}

// ─── RADAR CHART ─────────────────────────────────────────────────────────────
function RadarChart({ scores, size = 300 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.34;
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return { x: cx + r * v * Math.cos(a), y: cy + r * v * Math.sin(a) };
  };
  const dataPts = TRAIT_ORDER.map((t, i) => pt(i, scores[t] / 100));
  const path = dataPts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: size, display: "block", margin: "0 auto" }}>
      {/* Grid */}
      {[0.2, 0.4, 0.6, 0.8, 1.0].map((lv, li) => {
        const pts = TRAIT_ORDER.map((_, i) => pt(i, lv));
        const d = pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ") + " Z";
        return <path key={li} d={d} fill="none" stroke="#D9D0C3" strokeWidth={lv === 1 ? "1.5" : "0.75"} strokeDasharray={lv === 1 ? "none" : "2 3"} />;
      })}
      {TRAIT_ORDER.map((_, i) => {
        const p = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#D9D0C3" strokeWidth="0.75" />;
      })}
      {/* Fill */}
      <path d={path} fill="rgba(43,107,96,0.1)" stroke="#2B6B60" strokeWidth="2" strokeLinejoin="round" />
      {/* Dots */}
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="5" fill={TRAITS[TRAIT_ORDER[i]].color} stroke="#FAF6F0" strokeWidth="2.5" />
      ))}
      {/* Labels */}
      {TRAIT_ORDER.map((t, i) => {
        const lp = pt(i, 1.26);
        return (
          <text key={t} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
            fill="#5A5148" fontSize="10" fontWeight="600"
            fontFamily="'DM Mono', monospace" letterSpacing="0.04em">
            {TRAITS[t].name}
          </text>
        );
      })}
    </svg>
  );
}

// ─── TRAIT BAR ───────────────────────────────────────────────────────────────
function TraitBar({ trait, score, delay }) {
  const t = TRAITS[trait];
  const [go, setGo] = useState(false);
  useEffect(() => { const id = setTimeout(() => setGo(true), delay); return () => clearTimeout(id); }, [delay]);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "baseline" }}>
        <span style={{ color: t.color, fontWeight: 700, fontSize: 13, fontFamily: "var(--serif)" }}>{t.name}</span>
        <span style={{ color: "var(--muted)", fontSize: 11, fontFamily: "var(--mono)" }}>{score}th percentile</span>
      </div>
      <div style={{ height: 6, background: "#EDE7DD", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: go ? `${score}%` : "0%",
          background: t.color, borderRadius: 3,
          transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
        }} />
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4, lineHeight: 1.5, fontFamily: "var(--serif)" }}>{t.desc}</p>
    </div>
  );
}

// ─── DECORATIVE RULE ─────────────────────────────────────────────────────────
function Rule({ accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0" }}>
      <div style={{ flex: 1, height: 1, background: "#D9D0C3" }} />
      <div style={{ width: 6, height: 6, borderRadius: "50%", border: `1.5px solid ${accent || "#B56B2F"}` }} />
      <div style={{ flex: 1, height: 1, background: "#D9D0C3" }} />
    </div>
  );
}

// ─── SHARE CARD ─────────────────────────────────────────────────────────────
const SITE_URL = "https://ocean-test-ten.vercel.app";

function ShareCard({ archetype, topFigure }) {
  const [copied, setCopied] = useState(false);

  const shareText = `${archetype.emoji} I'm ${archetype.name} — ${archetype.tagline.toLowerCase()}.\n\n"${archetype.brief}"\n\nClosest famous match: ${topFigure.name} (${topFigure.tag})\n\nWhat's your ocean current? Free AI personality test by TensorShift:`;

  const shareUrl = SITE_URL;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const btnBase = {
    flex: 1, padding: "12px 8px", borderRadius: 3, fontSize: 13, fontWeight: 500,
    cursor: "pointer", fontFamily: "var(--serif)", transition: "all 0.15s",
    textDecoration: "none", textAlign: "center", display: "flex",
    alignItems: "center", justifyContent: "center", gap: 6,
  };

  return (
    <div style={{
      background: "var(--white)", border: "1px solid var(--rule)", borderRadius: 4,
      padding: "24px 20px", marginBottom: 16, boxShadow: "0 1px 3px rgba(28,42,58,0.04)",
      animation: "fadeUp 0.5s ease-out 0.5s both",
    }}>
      <div style={{
        fontSize: 10, fontWeight: 500, color: "var(--copper)", marginBottom: 14,
        letterSpacing: "0.14em", fontFamily: "var(--mono)", textTransform: "uppercase",
      }}>
        Share Your Current
      </div>

      <div style={{
        background: "var(--warm-bg)", borderRadius: 3, padding: "14px 16px", marginBottom: 16,
        fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.6,
        whiteSpace: "pre-line",
      }}>
        {shareText}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleCopy} style={{
          ...btnBase,
          background: copied ? "var(--teal)" : "var(--ink)",
          color: "var(--cream)", border: "none",
        }}>
          {copied ? "Copied!" : "Copy"}
        </button>
        <a href={xUrl} target="_blank" rel="noopener noreferrer" style={{
          ...btnBase, background: "var(--white)", color: "var(--ink)",
          border: "1px solid var(--rule)",
        }}>
          𝕏 Post
        </a>
      </div>
    </div>
  );
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300..700;1,300..700&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --cream: #FAF6F0;
  --white: #FFFFFF;
  --ink: #1C2A3A;
  --ink-soft: #3A4A5A;
  --muted: #7A7267;
  --faint: #A8A099;
  --rule: #D9D0C3;
  --copper: #B56B2F;
  --teal: #2B6B60;
  --warm-bg: #F3EDE4;
  --display: 'Cormorant', serif;
  --serif: 'Newsreader', serif;
  --mono: 'DM Mono', monospace;
}

html { background: var(--cream); }
body {
  background: var(--cream);
  color: var(--ink);
  font-family: var(--serif);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* Paper grain texture */
body::after {
  content: '';
  position: fixed; inset: 0;
  opacity: 0.025; pointer-events: none; z-index: 9999;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fillBar { from { width: 0%; } }

@media (max-width: 600px) {
  .intro-grid { grid-template-columns: 1fr !important; }
}
`;

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function OceanTest() {
  const [screen, setScreen] = useState("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [scores, setScores] = useState(null);
  const [archetype, setArchetype] = useState(null);
  const [topFigures, setTopFigures] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  const progress = Object.keys(answers).length / QUESTIONS.length;

  // Browser history management — back button returns to intro, not previous site
  const changeScreen = useCallback((newScreen) => {
    setScreen(newScreen);
    if (newScreen !== "analyzing") {
      window.history.pushState({ screen: newScreen }, "");
    }
  }, []);

  useEffect(() => {
    // Set initial history state
    window.history.replaceState({ screen: "intro" }, "");

    const onPopState = (e) => {
      // Always go back to intro when user hits browser back
      setScreen("intro"); setCurrentQ(0); setAnswers({});
      setScores(null); setArchetype(null); setTopFigures(null);
      setAiAnalysis(null); setAiLoading(false); setAiError(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleAnswer = useCallback((value) => {
    const next = { ...answers, [currentQ]: value };
    setAnswers(next);
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(c => c + 1), 200);
    } else {
      const s = calculateScores(next);
      const a = findArchetype(s);
      const f = findTopFigures(s, 3);
      setScores(s); setArchetype(a); setTopFigures(f);
      changeScreen("consent");
    }
  }, [answers, currentQ, changeScreen]);

  const handleConsent = () => {
    setScreen("analyzing");
    setAiLoading(true);
    getAIAnalysis(scores, archetype, topFigures).then(r => {
      if (r?.rateLimited) {
        setAiAnalysis(null); setAiLoading(false); setAiError(r.message);
      } else {
        setAiAnalysis(r); setAiLoading(false);
        if (!r) setAiError(true);
      }
      setTimeout(() => changeScreen("results"), 600);
    });
  };

  const handleSkipAI = () => changeScreen("results");

  const handleRestart = () => {
    setScreen("intro"); setCurrentQ(0); setAnswers({});
    setScores(null); setArchetype(null); setTopFigures(null);
    setAiAnalysis(null); setAiLoading(false); setAiError(false);
    window.history.replaceState({ screen: "intro" }, "");
  };

  const page = { maxWidth: 600, margin: "0 auto", padding: "48px 24px" };

  // Card style
  const card = (extra = {}) => ({
    background: "var(--white)", border: "1px solid var(--rule)",
    borderRadius: 4, padding: "28px 24px", marginBottom: 20,
    boxShadow: "0 1px 3px rgba(28,42,58,0.04)", ...extra,
  });

  const label = {
    fontSize: 10, fontWeight: 500, color: "var(--copper)", marginBottom: 16,
    letterSpacing: "0.14em", fontFamily: "var(--mono)", textTransform: "uppercase",
  };

  // ═══════════════════════════════════════════
  //  INTRO
  // ═══════════════════════════════════════════
  if (screen === "intro") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
        <div style={page}>
          {/* Masthead */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{
              fontSize: 10, fontFamily: "var(--mono)", fontWeight: 500,
              letterSpacing: "0.2em", color: "var(--copper)", textTransform: "uppercase",
              marginBottom: 40,
            }}>
              TensorShift
            </div>

            <h1 style={{
              fontFamily: "var(--display)", fontSize: "clamp(48px, 10vw, 72px)",
              fontWeight: 300, fontStyle: "italic", lineHeight: 1.0,
              color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: 4,
            }}>
              What's Your
            </h1>
            <h1 style={{
              fontFamily: "var(--display)", fontSize: "clamp(52px, 11vw, 80px)",
              fontWeight: 700, lineHeight: 1.0, color: "var(--ink)",
              letterSpacing: "-0.03em", marginBottom: 8,
            }}>
              Ocean Current?
            </h1>

            <Rule />

            <p style={{
              fontFamily: "var(--serif)", fontSize: 19, lineHeight: 1.75,
              color: "var(--ink-soft)", maxWidth: 400, margin: "0 auto 32px",
              fontStyle: "italic",
            }}>
              The personality test backed by 100 years of research, analyzed by AI, and finally given a name worth sharing.
            </p>

            {/* Trait row */}
            <div style={{
              display: "flex", gap: 0, justifyContent: "center", alignItems: "center",
              marginBottom: 40, fontFamily: "var(--mono)", fontSize: 13,
              color: "var(--muted)", letterSpacing: "0.06em",
            }}>
              {TRAIT_ORDER.map((t, i) => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <span style={{ color: TRAITS[t].color, fontWeight: 500 }}>{TRAITS[t].name}</span>
                  {i < 4 && <span style={{ margin: "0 12px", color: "var(--rule)" }}>/</span>}
                </span>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => changeScreen("test")}
              style={{
                background: "var(--ink)", color: "var(--cream)",
                border: "none", padding: "18px 52px", borderRadius: 3,
                fontSize: 16, fontWeight: 500, cursor: "pointer",
                fontFamily: "var(--serif)", letterSpacing: "0.04em",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => e.target.style.background = "#2A3C4E"}
              onMouseLeave={e => e.target.style.background = "var(--ink)"}
            >
              Begin the Assessment
            </button>
          </div>

          {/* Feature grid */}
          <div className="intro-grid" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40,
          }}>
            {[
              { n: "01", title: "Real Science", body: "Big Five model. Validated across 12+ languages and decades of peer-reviewed research." },
              { n: "02", title: "AI Analysis", body: "Claude analyzes your full profile — how traits interact, not each one in isolation." },
              { n: "03", title: "3 Minutes", body: "25 questions. No sign-up. No data stored. Completely private." },
              { n: "04", title: "Your Current", body: "An ocean archetype and famous figure match with personalized reasoning." },
            ].map((f, i) => (
              <div key={i} style={{
                padding: "20px", border: "1px solid var(--rule)", borderRadius: 3,
                animation: `fadeUp 0.4s ease-out ${0.2 + i * 0.08}s both`,
              }}>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 10, color: "var(--copper)",
                  letterSpacing: "0.1em", marginBottom: 8,
                }}>{f.n}</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.55 }}>{f.body}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", borderTop: "1px solid var(--rule)", paddingTop: 20 }}>
            <p style={{ color: "var(--faint)", fontSize: 10, fontFamily: "var(--mono)", lineHeight: 1.7, maxWidth: 440, margin: "0 auto 10px" }}>
              Items adapted from the Big Five Inventory (BFI; John, Donahue, & Kentle, 1991).
              Copyright Oliver P. John. Non-commercial educational use.
              Archetypes, AI analysis, and celebrity matching are original to TensorShift LLC.
              Educational tool — not a clinical assessment. No data collected or stored.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, fontFamily: "var(--mono)", fontSize: 10 }}>
              <a href="https://tensorshift.ai" target="_blank" rel="noopener noreferrer" style={{ color: "var(--copper)", textDecoration: "none" }}>tensorshift.ai</a>
              <a href="https://tensorshift.ai/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--faint)", textDecoration: "none" }}>Terms</a>
              <a href="https://tensorshift.ai/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--faint)", textDecoration: "none" }}>Privacy</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  //  TEST
  // ═══════════════════════════════════════════
  if (screen === "test") {
    const q = QUESTIONS[currentQ];
    const likert = [
      { val: 1, label: "Strongly\nDisagree", emoji: "😟" },
      { val: 2, label: "Disagree", emoji: "🙁" },
      { val: 3, label: "Neutral", emoji: "😐" },
      { val: 4, label: "Agree", emoji: "🙂" },
      { val: 5, label: "Strongly\nAgree", emoji: "😊" },
    ];

    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
        <div style={page}>
          {/* Progress */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
              {currentQ + 1} / {QUESTIONS.length}
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--copper)" }}>
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div style={{ height: 2, background: "var(--rule)", marginBottom: 48 }}>
            <div style={{
              height: "100%", width: `${progress * 100}%`, background: "var(--copper)",
              transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }} />
          </div>

          {/* Question number */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span style={{
              fontFamily: "var(--display)", fontSize: 64, fontWeight: 300,
              color: "var(--rule)", lineHeight: 1, userSelect: "none",
            }}>
              {String(currentQ + 1).padStart(2, "0")}
            </span>
          </div>

          {/* Question card */}
          <div style={{
            ...card({ marginBottom: 32, padding: "32px 28px" }),
            animation: "fadeIn 0.25s ease-out",
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              color: TRAITS[q.trait].color, letterSpacing: "0.12em",
              textTransform: "uppercase", marginBottom: 14,
            }}>
              {TRAITS[q.trait].name}
            </div>
            <p style={{
              fontFamily: "var(--display)", fontSize: "clamp(22px, 4.5vw, 28px)",
              fontWeight: 400, fontStyle: "italic", lineHeight: 1.35,
              color: "var(--ink)",
            }}>
              {q.text}
            </p>
          </div>

          {/* Likert */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {likert.map(({ val, label: lbl, emoji }) => {
              const sel = answers[currentQ] === val;
              return (
                <button key={val} onClick={() => handleAnswer(val)} style={{
                  flex: 1, maxWidth: 96, padding: "14px 6px", borderRadius: 4,
                  background: sel ? "var(--warm-bg)" : "var(--white)",
                  border: `1.5px solid ${sel ? "var(--copper)" : "var(--rule)"}`,
                  color: sel ? "var(--ink)" : "var(--muted)",
                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                  fontFamily: "var(--serif)", whiteSpace: "pre-line", lineHeight: 1.3,
                  transition: "all 0.15s",
                }}
                  onMouseEnter={e => { if (!sel) e.target.style.borderColor = "#B8A99A"; }}
                  onMouseLeave={e => { if (!sel) e.target.style.borderColor = "var(--rule)"; }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</div>
                  {lbl}
                </button>
              );
            })}
          </div>

          {currentQ > 0 && (
            <button onClick={() => setCurrentQ(c => c - 1)} style={{
              marginTop: 24, background: "none", border: "1px solid var(--rule)",
              color: "var(--muted)", padding: "8px 20px", borderRadius: 3,
              cursor: "pointer", fontSize: 12, fontFamily: "var(--serif)",
            }}>
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  //  CONSENT
  // ═══════════════════════════════════════════
  if (screen === "consent") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center" }}>
        <div style={{ ...page, maxWidth: 480 }}>
          <div style={{ ...card({ padding: "36px 28px" }), animation: "fadeUp 0.4s ease-out" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                fontFamily: "var(--display)", fontSize: 36, color: "var(--ink)",
                marginBottom: 8,
              }}>
                Before We Dive Deeper
              </div>
              <p style={{ color: "var(--muted)", fontSize: 14, fontStyle: "italic" }}>
                Please review the following:
              </p>
            </div>

            <Rule accent="var(--teal)" />

            {[
              { bold: "Not a clinical tool.", text: "This is educational. Not a substitute for professional psychological assessment or mental health advice." },
              { bold: "AI analysis.", text: "Your trait scores (not individual answers) will be sent to an AI model for personalized analysis. No data is stored." },
              { bold: "Entertainment and education.", text: "Archetype matching, celebrity comparisons, and AI insights are fun and thought-provoking, not diagnostic." },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex", gap: 14, alignItems: "flex-start",
                padding: "14px 0",
                borderBottom: i < 2 ? "1px solid var(--rule)" : "none",
              }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--copper)", marginTop: 3, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p style={{ color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.65, margin: 0, fontFamily: "var(--serif)" }}>
                  <strong style={{ color: "var(--ink)" }}>{item.bold}</strong> {item.text}
                </p>
              </div>
            ))}

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={handleConsent} style={{
                background: "var(--ink)", color: "var(--cream)", border: "none",
                padding: "15px 24px", borderRadius: 3, fontSize: 14, fontWeight: 500,
                cursor: "pointer", fontFamily: "var(--serif)", transition: "background 0.2s",
              }}
                onMouseEnter={e => e.target.style.background = "#2A3C4E"}
                onMouseLeave={e => e.target.style.background = "var(--ink)"}
              >
                I Understand — Show My AI Analysis
              </button>
              <button onClick={handleSkipAI} style={{
                background: "none", color: "var(--muted)", border: "1px solid var(--rule)",
                padding: "13px 24px", borderRadius: 3, fontSize: 13, cursor: "pointer",
                fontFamily: "var(--serif)", transition: "border-color 0.2s",
              }}
                onMouseEnter={e => e.target.style.borderColor = "#B8A99A"}
                onMouseLeave={e => e.target.style.borderColor = "var(--rule)"}
              >
                Skip AI — Just Show My Scores
              </button>
            </div>

            <p style={{ color: "var(--faint)", fontSize: 9, fontFamily: "var(--mono)", textAlign: "center", marginTop: 20 }}>
              An educational product by TensorShift LLC
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  //  ANALYZING
  // ═══════════════════════════════════════════
  if (screen === "analyzing") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease-out" }}>
          <div style={{
            fontFamily: "var(--display)", fontSize: 48, fontWeight: 300,
            fontStyle: "italic", color: "var(--ink)", marginBottom: 12,
          }}>
            Reading your depths...
          </div>
          <p style={{ color: "var(--muted)", fontSize: 14, fontStyle: "italic", marginBottom: 32 }}>
            AI is analyzing how your traits interact
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%", background: "var(--copper)",
                animation: `fadeIn 0.6s ease-in-out ${i * 0.3}s infinite alternate`,
              }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  //  RESULTS
  // ═══════════════════════════════════════════
  if (screen === "results" && scores && archetype && topFigures) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
        <div style={{ ...page, maxWidth: 640 }}>

          {/* Archetype Hero */}
          <div style={{ textAlign: "center", marginBottom: 16, animation: "fadeUp 0.6s ease-out" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.16em", color: "var(--copper)", textTransform: "uppercase", marginBottom: 20 }}>
              Your Ocean Current
            </div>
            <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 16 }}>{archetype.emoji}</div>
            <h1 style={{
              fontFamily: "var(--display)", fontSize: "clamp(40px, 9vw, 60px)",
              fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.03em",
              lineHeight: 1.05, marginBottom: 6,
            }}>
              {archetype.name}
            </h1>
            <p style={{
              fontFamily: "var(--display)", fontSize: 20, fontStyle: "italic",
              fontWeight: 300, color: "var(--muted)", marginBottom: 16,
            }}>
              {archetype.tagline}
            </p>
            <Rule />
            <p style={{
              fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.8,
              color: "var(--ink-soft)", maxWidth: 460, margin: "0 auto",
              fontStyle: "italic",
            }}>
              {archetype.brief}
            </p>
          </div>

          <Rule accent="var(--teal)" />

          {/* Radar */}
          <div style={{ ...card(), animation: "fadeUp 0.5s ease-out 0.1s both" }}>
            <RadarChart scores={scores} size={300} />
          </div>

          {/* Trait Bars */}
          <div style={{ ...card(), animation: "fadeUp 0.5s ease-out 0.2s both" }}>
            <h3 style={label}>Trait Breakdown</h3>
            {TRAIT_ORDER.map((t, i) => (
              <TraitBar key={t} trait={t} score={scores[t]} delay={400 + i * 120} />
            ))}
          </div>

          {/* AI Analysis */}
          {aiAnalysis && (
            <div style={{ animation: "fadeUp 0.5s ease-out 0.3s both" }}>
              {[
                { key: "crossTraitAnalysis", title: "Cross-Trait Analysis" },
                { key: "archetypeExplanation", title: "Why This Archetype" },
                { key: "tensionPoints", title: "Tension Points" },
                { key: "growthEdges", title: "Growth Edges" },
              ].filter(s => aiAnalysis[s.key]).map(s => (
                <div key={s.key} style={card()}>
                  <h3 style={label}>{s.title}</h3>
                  <p style={{ fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.85, color: "var(--ink-soft)" }}>
                    {aiAnalysis[s.key]}
                  </p>
                </div>
              ))}
            </div>
          )}

          {aiError && !aiAnalysis && (
            <div style={{ ...card(), textAlign: "center" }}>
              <p style={{ color: "var(--muted)", fontSize: 13, fontStyle: "italic" }}>
                {typeof aiError === "string" ? aiError : "AI analysis unavailable."} Your scores and archetype are still accurate.
              </p>
            </div>
          )}

          {/* Famous Figures */}
          <div style={{ ...card(), animation: "fadeUp 0.5s ease-out 0.4s both" }}>
            <h3 style={label}>You Remind Us Of</h3>
            {topFigures.map((fig, i) => (
              <div key={fig.name} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 0",
                borderBottom: i < topFigures.length - 1 ? "1px solid var(--rule)" : "none",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)",
                    }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {i === 0 && <span style={{
                      fontSize: 8, background: "var(--copper)", color: "var(--cream)",
                      padding: "2px 8px", borderRadius: 2, fontWeight: 600,
                      letterSpacing: "0.06em", fontFamily: "var(--mono)", textTransform: "uppercase",
                    }}>Closest</span>}
                    <span style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{fig.name}</span>
                  </div>
                  <span style={{ fontFamily: "var(--serif)", color: "var(--muted)", fontSize: 12, fontStyle: "italic", marginLeft: 28 }}>{fig.tag}</span>
                </div>
                <span style={{
                  fontFamily: "var(--mono)", fontWeight: 500, fontSize: 16,
                  color: i === 0 ? "var(--copper)" : "var(--muted)",
                }}>{fig.similarity}%</span>
              </div>
            ))}
            {aiAnalysis?.figureMatchReasoning && (
              <>
                <Rule accent="var(--teal)" />
                <p style={{
                  fontFamily: "var(--serif)", color: "var(--ink-soft)",
                  fontSize: 13, lineHeight: 1.75, fontStyle: "italic",
                }}>
                  {aiAnalysis.figureMatchReasoning}
                </p>
              </>
            )}
            <p style={{ color: "var(--faint)", fontSize: 9, marginTop: 14, fontFamily: "var(--mono)" }}>
              Based on estimated Big Five profiles from biographical research. For entertainment.
            </p>
          </div>

          {/* Share & Actions */}
          <ShareCard archetype={archetype} topFigure={topFigures[0]} />

          <button onClick={handleRestart} style={{
            width: "100%", background: "var(--white)", color: "var(--ink-soft)",
            border: "1px solid var(--rule)", padding: "15px 20px", borderRadius: 3,
            fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--serif)",
            marginBottom: 28, transition: "border-color 0.2s",
          }}
            onMouseEnter={e => e.target.style.borderColor = "#B8A99A"}
            onMouseLeave={e => e.target.style.borderColor = "var(--rule)"}
          >
            Retake the Assessment
          </button>

          {/* Footer */}
          <div style={{ textAlign: "center", borderTop: "1px solid var(--rule)", paddingTop: 20, paddingBottom: 20 }}>
            <p style={{ color: "var(--faint)", fontSize: 9, fontFamily: "var(--mono)", lineHeight: 1.7, maxWidth: 460, margin: "0 auto 8px" }}>
              Items adapted from the Big Five Inventory (BFI; John, Donahue, & Kentle, 1991). Copyright Oliver P. John.
              Non-commercial educational use. Archetypes and AI analysis are original to TensorShift LLC.
              Educational and entertainment purposes only. Not a clinical assessment.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, fontFamily: "var(--mono)", fontSize: 10, marginBottom: 8 }}>
              <a href="https://tensorshift.ai" target="_blank" rel="noopener noreferrer" style={{ color: "var(--copper)", textDecoration: "none" }}>tensorshift.ai</a>
              <a href="https://tensorshift.ai/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--faint)", textDecoration: "none" }}>Terms</a>
              <a href="https://tensorshift.ai/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--faint)", textDecoration: "none" }}>Privacy</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
