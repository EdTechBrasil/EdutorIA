import express from "express";
import cors from "cors";
import admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }
}

const app = express();

// In-memory storage (projetos e logs persistem enquanto a instância viver)
const storage = {
  projects: [] as any[],
  logs: [] as any[],
  credits: {} as Record<string, number>,   // uid → credits
  roles: {} as Record<string, string>,     // uid → role
  blocked: {} as Record<string, boolean>,  // uid → blocked
  agents: {
    ebook: process.env.TESS_AGENT_EBOOK || "",
    lesson_plan: process.env.TESS_AGENT_PLANO || "",
    slides: process.env.TESS_AGENT_SLIDES || "",
    images: process.env.TESS_AGENT_IMAGENS || "",
  },
};

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function decodeToken(token: string) {
  if (admin.apps.length) {
    return await admin.auth().verifyIdToken(token);
  }
  // Dev fallback (no firebase-admin configured)
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  return { uid: payload.user_id || payload.sub, email: payload.email, name: payload.name, picture: payload.picture };
}

function buildUser(decoded: any) {
  const uid: string = decoded.uid;
  const email: string = decoded.email || "";
  const adminEmail = process.env.ADMIN_EMAIL || "";

  const isAdmin = adminEmail && email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
  const role = storage.roles[uid] ?? (isAdmin ? "admin" : "user");
  if (isAdmin) storage.roles[uid] = "admin"; // always keep admin

  const credits = storage.credits[uid] ?? 10;
  if (storage.credits[uid] === undefined) storage.credits[uid] = credits;

  return {
    uid,
    email,
    displayName: decoded.name || null,
    photoURL: decoded.picture || null,
    role,
    credits,
    blocked: storage.blocked[uid] ?? false,
  };
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

const requireAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = await decodeToken(authHeader.slice(7));
    req.user = buildUser(decoded);
    if (req.user.blocked) return res.status(403).json({ error: "Conta bloqueada." });
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido." });
  }
};

const requireAdmin = async (req: any, res: any, next: any) => {
  await requireAuth(req, res, () => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    next();
  });
};

function addLog(userId: string, userEmail: string, action: string, contentType: string) {
  storage.logs.unshift({
    id: Math.random().toString(36).substring(7),
    userId,
    userEmail,
    action,
    contentType,
    createdAt: new Date().toISOString(),
  });
  if (storage.logs.length > 500) storage.logs = storage.logs.slice(0, 500);
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Missing idToken" });
    const decoded = await decodeToken(idToken);
    const user = buildUser(decoded);
    if (user.blocked) return res.status(403).json({ error: "Conta bloqueada. Entre em contato com o suporte." });
    res.json(user);
  } catch (error: any) {
    res.status(401).json({ error: "Token inválido: " + error.message });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.json(null);
  try {
    const decoded = await decodeToken(authHeader.slice(7));
    res.json(buildUser(decoded));
  } catch {
    res.json(null);
  }
});

app.post("/api/auth/logout", (_req, res) => res.json({ success: true }));

// ─── Projects ─────────────────────────────────────────────────────────────────

app.get("/api/projects", requireAuth, (req: any, res) => {
  res.json(storage.projects.filter((p) => p.userId === req.user.uid));
});

app.get("/api/projects/:id", requireAuth, (req: any, res) => {
  const project = storage.projects.find((p) => p.id === req.params.id && p.userId === req.user.uid);
  if (!project) return res.status(404).json({ error: "Not found" });
  res.json(project);
});

app.post("/api/projects", requireAuth, (req: any, res) => {
  const { type, title, briefing } = req.body;
  const id = Math.random().toString(36).substring(7);
  const now = new Date().toISOString();
  const project = {
    id,
    userId: req.user.uid,
    title: title || briefing?.main_topic || "Novo Projeto",
    type,
    status: "draft",
    content: "",
    briefing,
    outline: { chapters: [] },
    createdAt: now,
    updatedAt: now,
  };
  storage.projects.unshift(project);
  res.json(project);
});

app.put("/api/projects/:id", requireAuth, (req: any, res) => {
  const idx = storage.projects.findIndex((p) => p.id === req.params.id && p.userId === req.user.uid);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const { title, status, content, outline } = req.body;
  const now = new Date().toISOString();
  const updates: any = { updatedAt: now };
  if (title !== undefined) updates.title = title;
  if (status !== undefined) updates.status = status;
  if (content !== undefined) updates.content = content;
  if (outline !== undefined) updates.outline = outline;
  storage.projects[idx] = { ...storage.projects[idx], ...updates };
  res.json(storage.projects[idx]);
});

app.delete("/api/projects/:id", requireAuth, (req: any, res) => {
  storage.projects = storage.projects.filter((p) => !(p.id === req.params.id && p.userId === req.user.uid));
  res.json({ success: true });
});

// ─── Generate (Tess IA) ───────────────────────────────────────────────────────

app.post("/api/generate", requireAuth, async (req: any, res) => {
  const { type, briefing } = req.body;
  const user = req.user;

  if (!type || !briefing) return res.status(400).json({ error: "Missing type or briefing" });

  if (user.credits <= 0) return res.status(402).json({ error: "Créditos insuficientes." });

  const agentId = storage.agents[type as keyof typeof storage.agents];
  if (!agentId) return res.status(400).json({ error: `Agente Tess não configurado para: ${type}. Configure na área ADM.` });

  const TESS_API_KEY = process.env.TESS_API_KEY;
  if (!TESS_API_KEY) return res.status(500).json({ error: "TESS_API_KEY não configurada." });

  const prompts: Record<string, string> = {
    ebook: `Gere um sumário estruturado para um e-book sobre "${briefing.main_topic}".
Público-alvo: ${briefing.target_audience}. Tom: ${briefing.tone}. Tamanho: ${briefing.length}.
Retorne APENAS um JSON válido no formato:
{"chapters":[{"title":"...","sections":["...","..."],"status":"pending"}]}`,

    lesson_plan: `Gere um plano de aula estruturado sobre "${briefing.main_topic}".
Público-alvo: ${briefing.target_audience}. Objetivo: ${briefing.objective}. Tom: ${briefing.tone}.
Retorne APENAS um JSON válido no formato:
{"chapters":[{"title":"...","sections":["...","..."],"status":"pending"}]}`,

    slides: `Gere um roteiro de slides para uma apresentação sobre "${briefing.main_topic}".
Público-alvo: ${briefing.target_audience}. Tom: ${briefing.tone}. Tamanho: ${briefing.length}.
Retorne APENAS um JSON válido no formato:
{"chapters":[{"title":"Slide X: ...","sections":["Ponto 1","Ponto 2"],"status":"pending"}]}`,

    images: `Gere prompts descritivos para criação de imagens educacionais sobre "${briefing.main_topic}".
Público-alvo: ${briefing.target_audience}. Estilo: ${briefing.tone}.
Retorne APENAS um JSON válido no formato:
{"chapters":[{"title":"Imagem: ...","sections":["Prompt detalhado para geração"],"status":"pending"}]}`,
  };

  const prompt = prompts[type] || prompts.ebook;

  try {
    const tessRes = await fetch(`https://api.tess.im/agents/${agentId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TESS_API_KEY}` },
      body: JSON.stringify({ wait_execution: true, model: "tess-5", messages: [{ role: "user", content: prompt }] }),
    });

    if (!tessRes.ok) {
      const errText = await tessRes.text();
      console.error("Tess API error:", errText);
      return res.status(502).json({ error: "Erro na API Tess IA: " + tessRes.statusText });
    }

    const tessData = await tessRes.json();
    const rawText: string =
      tessData?.output || tessData?.response || tessData?.choices?.[0]?.message?.content || tessData?.content || "";

    if (!rawText) return res.status(502).json({ error: "Resposta vazia da Tess IA." });

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: "Resposta da Tess IA não contém JSON válido." });

    const outline = JSON.parse(jsonMatch[0]);

    // Debit credit
    storage.credits[user.uid] = Math.max(0, (storage.credits[user.uid] ?? 10) - 1);

    addLog(user.uid, user.email || "", `Gerou ${type}`, type);

    res.json({ outline });
  } catch (error: any) {
    console.error("Generate error:", error);
    res.status(500).json({ error: "Erro interno na geração: " + error.message });
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

app.get("/api/admin/users", requireAdmin, (_req, res) => {
  // Build user list from what we know
  const allUids = new Set([
    ...Object.keys(storage.credits),
    ...Object.keys(storage.roles),
  ]);
  const users = Array.from(allUids).map((uid) => ({
    uid,
    email: null,
    displayName: null,
    photoURL: null,
    role: storage.roles[uid] || "user",
    credits: storage.credits[uid] ?? 10,
    blocked: storage.blocked[uid] ?? false,
  }));
  res.json(users);
});

app.patch("/api/admin/users/:uid", requireAdmin, (req, res) => {
  const { uid } = req.params;
  const { role, credits, blocked } = req.body;
  if (role !== undefined) storage.roles[uid] = role;
  if (credits !== undefined) storage.credits[uid] = Number(credits);
  if (blocked !== undefined) storage.blocked[uid] = blocked;
  res.json({ uid, role: storage.roles[uid], credits: storage.credits[uid], blocked: storage.blocked[uid] });
});

app.get("/api/admin/logs", requireAdmin, (_req, res) => {
  res.json(storage.logs);
});

app.get("/api/admin/agents", requireAdmin, (_req, res) => {
  res.json(storage.agents);
});

app.put("/api/admin/agents", requireAdmin, (req, res) => {
  const { ebook, lesson_plan, slides, images } = req.body;
  if (ebook !== undefined) storage.agents.ebook = ebook;
  if (lesson_plan !== undefined) storage.agents.lesson_plan = lesson_plan;
  if (slides !== undefined) storage.agents.slides = slides;
  if (images !== undefined) storage.agents.images = images;
  res.json(storage.agents);
});

export default app;
