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

    await Promise.all([
      fsIncrement("users", user.uid, "credits", -1, req.token),
      fsAdd("logs", {
        userId: user.uid,
        userEmail: user.email || "",
        action: `Gerou ${type}`,
        contentType: type,
        createdAt: new Date().toISOString(),
      }, req.token),
    ]);

    res.json({ outline });
  } catch (error: any) {
    console.error("Generate error:", error);
    res.status(500).json({ error: "Erro interno na geração: " + error.message });
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
