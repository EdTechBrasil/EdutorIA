import express from "express";
import cors from "cors";
import { createRemoteJWKSet, jwtVerify } from "jose";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "edutoria-41b14";
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ─── Firebase JWT Verification ────────────────────────────────────────────────

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com")
);

async function verifyFirebaseToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });
  return {
    uid: payload.sub!,
    email: payload["email"] as string | undefined,
    name: payload["name"] as string | undefined,
    picture: payload["picture"] as string | undefined,
  };
}

// ─── Firestore REST Helpers ───────────────────────────────────────────────────

function toFsVal(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsVal) } };
  if (typeof v === "object") return { mapValue: { fields: toFsFields(v) } };
  return { stringValue: String(v) };
}

function toFsFields(obj: Record<string, any>) {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) fields[k] = toFsVal(v);
  }
  return fields;
}

function fromFsVal(v: any): any {
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return parseInt(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("stringValue" in v) return v.stringValue;
  if ("mapValue" in v) return fromFsFields(v.mapValue?.fields || {});
  if ("arrayValue" in v) return (v.arrayValue?.values || []).map(fromFsVal);
  return null;
}

function fromFsFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) result[k] = fromFsVal(v);
  return result;
}

function docId(name: string) {
  return name.split("/").pop()!;
}

async function fsGet(col: string, id: string, token: string) {
  const res = await fetch(`${FS_BASE}/${col}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore GET ${res.status}: ${await res.text()}`);
  const doc = await res.json() as any;
  return fromFsFields(doc.fields || {});
}

async function fsSet(col: string, id: string, data: Record<string, any>, token: string) {
  const res = await fetch(`${FS_BASE}/${col}/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore SET ${res.status}: ${await res.text()}`);
}

async function fsUpdate(col: string, id: string, data: Record<string, any>, token: string) {
  const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const res = await fetch(`${FS_BASE}/${col}/${id}?${mask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore UPDATE ${res.status}: ${await res.text()}`);
}

async function fsAdd(col: string, data: Record<string, any>, token: string) {
  const res = await fetch(`${FS_BASE}/${col}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore ADD ${res.status}: ${await res.text()}`);
  const doc = await res.json() as any;
  return docId(doc.name);
}

async function fsDelete(col: string, id: string, token: string) {
  const res = await fetch(`${FS_BASE}/${col}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Firestore DELETE ${res.status}`);
}

async function fsQuery(col: string, where: { field: string; value: any } | null, token: string) {
  const query: any = { structuredQuery: { from: [{ collectionId: col }] } };
  if (where) {
    query.structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: where.field },
        op: "EQUAL",
        value: toFsVal(where.value),
      },
    };
  }
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!res.ok) throw new Error(`Firestore QUERY ${res.status}: ${await res.text()}`);
  const results = await res.json() as any[];
  return results
    .filter(r => r.document)
    .map(r => ({ id: docId(r.document.name), ...fromFsFields(r.document.fields || {}) }));
}

async function fsList(col: string, token: string) {
  const res = await fetch(`${FS_BASE}/${col}?pageSize=500`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Firestore LIST ${res.status}`);
  const data = await res.json() as any;
  return (data.documents || []).map((d: any) => ({ id: docId(d.name), ...fromFsFields(d.fields || {}) }));
}

async function fsIncrement(col: string, id: string, field: string, delta: number, token: string) {
  const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/${col}/${id}`;
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      writes: [{
        transform: {
          document: docPath,
          fieldTransforms: [{ fieldPath: field, increment: { integerValue: String(delta) } }],
        },
      }],
    }),
  });
  if (!res.ok) throw new Error(`Firestore INCREMENT ${res.status}: ${await res.text()}`);
}

// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();

const storage = {
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

async function buildUser(uid: string, profile: { email: string; displayName: string | null; photoURL: string | null }, token: string) {
  const adminEmail = process.env.ADMIN_EMAIL || "";
  const existing = await fsGet("users", uid, token);

  if (!existing) {
    const isAdmin = adminEmail && (profile.email || "").trim().toLowerCase() === adminEmail.trim().toLowerCase();
    const data = {
      email: profile.email || "",
      displayName: profile.displayName || null,
      photoURL: profile.photoURL || null,
      credits: 10,
      role: isAdmin ? "admin" : "user",
      blocked: false,
    };
    await fsSet("users", uid, data, token);
    return { uid, ...data };
  }

  const updates: Record<string, any> = {};
  if (profile.email && profile.email !== existing.email) updates.email = profile.email;
  if (profile.displayName !== undefined && profile.displayName !== existing.displayName) updates.displayName = profile.displayName;
  if (profile.photoURL !== undefined && profile.photoURL !== existing.photoURL) updates.photoURL = profile.photoURL;

  const isAdmin = adminEmail && (profile.email || "").trim().toLowerCase() === adminEmail.trim().toLowerCase();
  if (isAdmin && existing.role !== "admin") updates.role = "admin";

  if (Object.keys(updates).length > 0) {
    await fsUpdate("users", uid, updates, token);
    Object.assign(existing, updates);
  }

  return {
    uid,
    email: existing.email || "",
    displayName: existing.displayName || null,
    photoURL: existing.photoURL || null,
    credits: existing.credits ?? 10,
    role: existing.role || "user",
    blocked: existing.blocked ?? false,
  };
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

const requireAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = authHeader.slice(7);
    const decoded = await verifyFirebaseToken(token);
    req.token = token;
    req.user = await buildUser(decoded.uid, {
      email: decoded.email || "",
      displayName: decoded.name || null,
      photoURL: decoded.picture || null,
    }, token);
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

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Missing idToken" });
    const decoded = await verifyFirebaseToken(idToken);
    const user = await buildUser(decoded.uid, {
      email: decoded.email || "",
      displayName: decoded.name || null,
      photoURL: decoded.picture || null,
    }, idToken);
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
    const token = authHeader.slice(7);
    const decoded = await verifyFirebaseToken(token);
    res.json(await buildUser(decoded.uid, {
      email: decoded.email || "",
      displayName: decoded.name || null,
      photoURL: decoded.picture || null,
    }, token));
  } catch {
    res.json(null);
  }
});

app.post("/api/auth/logout", (_req, res) => res.json({ success: true }));

// ─── Projects ─────────────────────────────────────────────────────────────────

app.get("/api/projects", requireAuth, async (req: any, res) => {
  const docs = await fsQuery("projects", { field: "userId", value: req.user.uid }, req.token);
  docs.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  res.json(docs);
});

app.get("/api/projects/:id", requireAuth, async (req: any, res) => {
  const doc = await fsGet("projects", req.params.id, req.token);
  if (!doc || doc.userId !== req.user.uid) return res.status(404).json({ error: "Not found" });
  res.json({ id: req.params.id, ...doc });
});

app.post("/api/projects", requireAuth, async (req: any, res) => {
  const { type, title, briefing } = req.body;
  const now = new Date().toISOString();
  const project = {
    userId: req.user.uid,
    title: title || briefing?.main_topic || "Novo Projeto",
    type,
    status: "draft",
    content: "",
    briefing: briefing || null,
    outline: { chapters: [] },
    createdAt: now,
    updatedAt: now,
  };
  const id = await fsAdd("projects", project, req.token);
  res.json({ id, ...project });
});

app.put("/api/projects/:id", requireAuth, async (req: any, res) => {
  const doc = await fsGet("projects", req.params.id, req.token);
  if (!doc || doc.userId !== req.user.uid) return res.status(404).json({ error: "Not found" });

  const { title, status, content, outline } = req.body;
  const now = new Date().toISOString();
  const updates: any = { updatedAt: now };
  if (title !== undefined) updates.title = title;
  if (status !== undefined) updates.status = status;
  if (content !== undefined) updates.content = content;
  if (outline !== undefined) updates.outline = outline;

  await fsUpdate("projects", req.params.id, updates, req.token);
  res.json({ id: req.params.id, ...doc, ...updates });
});

app.delete("/api/projects/:id", requireAuth, async (req: any, res) => {
  const doc = await fsGet("projects", req.params.id, req.token);
  if (!doc || doc.userId !== req.user.uid) return res.status(404).json({ error: "Not found" });
  await fsDelete("projects", req.params.id, req.token);
  res.json({ success: true });
});

// ─── Generate (Tess IA) ───────────────────────────────────────────────────────

async function callTessAgent(agentId: string, prompt: string, tessApiKey: string): Promise<string> {
  const tessRes = await fetch(`https://api.tess.im/agents/${agentId}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tessApiKey}` },
    body: JSON.stringify({ wait_execution: true, model: "tess-5", messages: [{ role: "user", content: prompt }] }),
  });
  if (!tessRes.ok) {
    const errText = await tessRes.text();
    console.error("Tess API error:", errText);
    throw new Error("Erro na API Tess IA: " + tessRes.statusText);
  }
  const data = await tessRes.json();
  const text: string = data?.output || data?.response || data?.choices?.[0]?.message?.content || data?.content || "";
  if (!text) throw new Error("Resposta vazia da Tess IA.");
  return text;
}

function buildOutlinePrompt(type: string, briefing: any): string {
  const extras = Array.isArray(briefing.extras) && briefing.extras.length > 0
    ? `Elementos extras: ${briefing.extras.join(", ")}.`
    : "";
  const lengthMap: Record<string, string> = { short: "curto (5-7 capítulos)", medium: "médio (8-12 capítulos)", long: "longo (13-20 capítulos)" };
  const lengthDesc = lengthMap[briefing.length] || "médio";

  const prompts: Record<string, string> = {
    ebook: `Gere um sumário estruturado para um ${briefing.material_type || "e-book"} sobre "${briefing.main_topic}".
Público-alvo: ${briefing.target_audience}. Objetivo: ${briefing.objective}. Tom: ${briefing.tone}. Idioma: ${briefing.language}. Tamanho: ${lengthDesc}. ${extras}
Retorne APENAS um JSON válido (sem markdown, sem explicações) no formato:
{"chapters":[{"title":"Capítulo 1: ...","sections":["Seção 1.1: ...","Seção 1.2: ..."],"status":"pending"}]}`,

    lesson_plan: `Gere um plano estruturado para "${briefing.material_type || "plano de aula"}" sobre "${briefing.main_topic}".
Público-alvo: ${briefing.target_audience}. Objetivo: ${briefing.objective}. Tom: ${briefing.tone}. Idioma: ${briefing.language}. ${extras}
Retorne APENAS um JSON válido no formato:
{"chapters":[{"title":"Etapa 1: ...","sections":["Atividade: ...","Duração: ..."],"status":"pending"}]}`,

    slides: `Gere um roteiro de slides para "${briefing.material_type || "apresentação"}" sobre "${briefing.main_topic}".
Público-alvo: ${briefing.target_audience}. Objetivo: ${briefing.objective}. Tom: ${briefing.tone}. Idioma: ${briefing.language}. Tamanho: ${lengthDesc}. ${extras}
Retorne APENAS um JSON válido no formato:
{"chapters":[{"title":"Slide X: ...","sections":["Ponto principal","Subponto"],"status":"pending"}]}`,

    images: `Gere uma lista de imagens educacionais para "${briefing.main_topic}".
Público-alvo: ${briefing.target_audience}. Estilo: ${briefing.tone}. Idioma: ${briefing.language}. ${extras}
Retorne APENAS um JSON válido no formato:
{"chapters":[{"title":"Imagem: ...","sections":["Descrição detalhada para geração da imagem"],"status":"pending"}]}`,
  };

  return prompts[type] || prompts.ebook;
}

// POST /api/generate/outline — generate outline only, no credit decrement
app.post("/api/generate/outline", requireAuth, async (req: any, res) => {
  const { type, briefing } = req.body;
  if (!type || !briefing) return res.status(400).json({ error: "Missing type or briefing" });

  const agentId = storage.agents[type as keyof typeof storage.agents];
  if (!agentId) return res.status(400).json({ error: `Agente Tess não configurado para: ${type}. Configure na área ADM.` });

  const TESS_API_KEY = process.env.TESS_API_KEY;
  if (!TESS_API_KEY) return res.status(500).json({ error: "TESS_API_KEY não configurada." });

  try {
    const rawText = await callTessAgent(agentId, buildOutlinePrompt(type, briefing), TESS_API_KEY);
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: "Resposta da Tess IA não contém JSON válido." });

    const outline = JSON.parse(jsonMatch[0]);
    res.json({ outline });
  } catch (error: any) {
    console.error("Generate outline error:", error);
    res.status(500).json({ error: error.message || "Erro interno na geração do sumário." });
  }
});

// POST /api/generate/chapter — generate one chapter, decrement 1 credit
app.post("/api/generate/chapter", requireAuth, async (req: any, res) => {
  const { projectId, chapterIndex, chapterTitle, sections, briefing, type, previousSummaries } = req.body;
  const user = req.user;

  if (!projectId || chapterIndex === undefined || !chapterTitle) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  if (user.credits <= 0) return res.status(402).json({ error: "Créditos insuficientes." });

  const agentId = storage.agents[type as keyof typeof storage.agents];
  if (!agentId) return res.status(400).json({ error: `Agente Tess não configurado para: ${type}.` });

  const TESS_API_KEY = process.env.TESS_API_KEY;
  if (!TESS_API_KEY) return res.status(500).json({ error: "TESS_API_KEY não configurada." });

  const doc = await fsGet("projects", projectId, req.token);
  if (!doc || doc.userId !== user.uid) return res.status(404).json({ error: "Projeto não encontrado." });

  const prevContext = Array.isArray(previousSummaries) && previousSummaries.length > 0
    ? `\n\nContexto dos capítulos anteriores:\n${previousSummaries.map((s, i) => `Capítulo ${i + 1}: ${s}`).join("\n")}`
    : "";

  const sectionsStr = Array.isArray(sections) ? sections.join("\n- ") : "";
  const extrasStr = Array.isArray(briefing?.extras) && briefing.extras.length > 0
    ? `Inclua: ${briefing.extras.join(", ")}.`
    : "";

  const prompt = `Você é um especialista em criação de conteúdo educacional. Escreva o conteúdo completo e detalhado de um capítulo para um ${briefing?.material_type || type} intitulado "${briefing?.main_topic}".

CAPÍTULO ${chapterIndex + 1}: ${chapterTitle}
Seções a cobrir:
- ${sectionsStr}

Briefing:
- Público-alvo: ${briefing?.target_audience}
- Objetivo: ${briefing?.objective}
- Tom: ${briefing?.tone}
- Idioma: ${briefing?.language || "PT-BR"}
- Extensão: ${briefing?.length}
${extrasStr}${prevContext}

Escreva o conteúdo completo em HTML semântico (use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>). Seja detalhado, educacional e envolvente. Não inclua o número do capítulo no título H2.`;

  try {
    const content = await callTessAgent(agentId, prompt, TESS_API_KEY);

    // Update chapter in project outline
    const currentOutline = doc.outline || { chapters: [] };
    const chapters = Array.isArray(currentOutline.chapters) ? [...currentOutline.chapters] : [];
    if (chapters[chapterIndex]) {
      chapters[chapterIndex] = { ...chapters[chapterIndex], content, status: "completed" };
    }
    const updatedOutline = { ...currentOutline, chapters };

    await Promise.all([
      fsUpdate("projects", projectId, {
        outline: updatedOutline,
        status: "generating",
        updatedAt: new Date().toISOString(),
      }, req.token),
      fsIncrement("users", user.uid, "credits", -1, req.token),
      fsAdd("logs", {
        userId: user.uid,
        userEmail: user.email || "",
        action: `Gerou capítulo ${chapterIndex + 1} de ${type}`,
        contentType: type,
        createdAt: new Date().toISOString(),
      }, req.token),
    ]);

    res.json({ content });
  } catch (error: any) {
    console.error("Generate chapter error:", error);
    // Mark chapter as error in Firestore
    try {
      const currentOutline = doc.outline || { chapters: [] };
      const chapters = Array.isArray(currentOutline.chapters) ? [...currentOutline.chapters] : [];
      if (chapters[chapterIndex]) chapters[chapterIndex] = { ...chapters[chapterIndex], status: "error" };
      await fsUpdate("projects", projectId, { outline: { ...currentOutline, chapters }, updatedAt: new Date().toISOString() }, req.token);
    } catch {}
    res.status(500).json({ error: error.message || "Erro interno na geração do capítulo." });
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

app.get("/api/admin/users", requireAdmin, async (req: any, res) => {
  const users = await fsList("users", req.token);
  res.json(users);
});

app.patch("/api/admin/users/:uid", requireAdmin, async (req: any, res) => {
  const { uid } = req.params;
  const { role, credits, blocked } = req.body;
  const updates: Record<string, any> = {};
  if (role !== undefined) updates.role = role;
  if (credits !== undefined) updates.credits = Number(credits);
  if (blocked !== undefined) updates.blocked = blocked;

  await fsUpdate("users", uid, updates, req.token);
  const snap = await fsGet("users", uid, req.token);
  res.json({ uid, ...snap });
});

app.get("/api/admin/logs", requireAdmin, async (req: any, res) => {
  const logs = await fsList("logs", req.token);
  logs.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  res.json(logs.slice(0, 500));
});

app.get("/api/admin/agents", requireAdmin, (_req, res) => {
  res.json({
    ...storage.agents,
    _envStatus: {
      ebook: !!process.env.TESS_AGENT_EBOOK,
      lesson_plan: !!process.env.TESS_AGENT_PLANO,
      slides: !!process.env.TESS_AGENT_SLIDES,
      images: !!process.env.TESS_AGENT_IMAGENS,
    },
    _vercelConfigured: !!(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID),
  });
});

app.put("/api/admin/agents", requireAdmin, async (req: any, res) => {
  const { ebook, lesson_plan, slides, images } = req.body;
  if (ebook !== undefined) storage.agents.ebook = ebook;
  if (lesson_plan !== undefined) storage.agents.lesson_plan = lesson_plan;
  if (slides !== undefined) storage.agents.slides = slides;
  if (images !== undefined) storage.agents.images = images;

  let vercelPersisted = false;
  let vercelError: string | null = null;

  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

  if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
    try {
      const envMap: Record<string, string> = {};
      if (ebook !== undefined) envMap["TESS_AGENT_EBOOK"] = ebook;
      if (lesson_plan !== undefined) envMap["TESS_AGENT_PLANO"] = lesson_plan;
      if (slides !== undefined) envMap["TESS_AGENT_SLIDES"] = slides;
      if (images !== undefined) envMap["TESS_AGENT_IMAGENS"] = images;

      const listRes = await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        const existingIds: Record<string, string> = {};
        for (const env of (listData.envs || [])) existingIds[env.key] = env.id;

        for (const [key, value] of Object.entries(envMap)) {
          const existingId = existingIds[key];
          if (existingId) {
            await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${existingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${VERCEL_TOKEN}` },
              body: JSON.stringify({ value, type: "plain", target: ["production", "preview", "development"] }),
            });
          } else {
            await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${VERCEL_TOKEN}` },
              body: JSON.stringify({ key, value, type: "plain", target: ["production", "preview", "development"] }),
            });
          }
        }
        vercelPersisted = true;
      } else {
        vercelError = `Vercel API: ${listRes.statusText}`;
      }
    } catch (e: any) {
      vercelError = e.message;
    }
  }

  res.json({ ...storage.agents, vercelPersisted, vercelError, vercelConfigured: !!(VERCEL_TOKEN && VERCEL_PROJECT_ID) });
});

export default app;
