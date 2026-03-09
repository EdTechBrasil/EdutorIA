import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory storage for demo reliability
const storage = {
  users: [] as any[],
  projects: [] as any[]
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(session({
    secret: "edutoria-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000
    }
  }));

  // Auth Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!(req.session as any).user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Simple Auth Routes
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, displayName, photoURL, uid } = req.body;
      
      if (!uid) {
        return res.status(400).json({ error: "Missing uid" });
      }

      let user = storage.users.find(u => u.uid === uid);
      if (!user) {
        user = { uid, email, displayName, photoURL, role: 'user', credits: 10 };
        storage.users.push(user);
      } else {
        user.email = email;
        user.displayName = displayName;
        user.photoURL = photoURL;
      }

      (req.session as any).user = user;
      res.json(user);
    } catch (error) {
      console.error("Login route error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    res.json((req.session as any).user || null);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Project Routes
  app.get("/api/projects", requireAuth, (req, res) => {
    const projects = storage.projects.filter(p => p.userId === (req.session as any).user.uid);
    res.json(projects);
  });

  app.get("/api/projects/:id", requireAuth, (req, res) => {
    const project = storage.projects.find(p => p.id === req.params.id && p.userId === (req.session as any).user.uid);
    if (!project) return res.status(404).json({ error: "Not found" });
    res.json(project);
  });

  app.post("/api/projects", requireAuth, (req, res) => {
    const { id, title, type, status, briefing, content, outline } = req.body;
    const now = new Date().toISOString();
    
    const project = {
      id,
      userId: (req.session as any).user.uid,
      title,
      type,
      status,
      content,
      briefing,
      outline,
      createdAt: now,
      updatedAt: now
    };
    
    storage.projects.push(project);
    res.json({ id, success: true });
  });

  app.put("/api/projects/:id", requireAuth, (req, res) => {
    const projectIndex = storage.projects.findIndex(p => p.id === req.params.id && p.userId === (req.session as any).user.uid);
    
    if (projectIndex === -1) return res.status(404).json({ error: "Not found" });

    const { title, status, content, outline } = req.body;
    const now = new Date().toISOString();
    
    storage.projects[projectIndex] = {
      ...storage.projects[projectIndex],
      title: title || storage.projects[projectIndex].title,
      status: status || storage.projects[projectIndex].status,
      content: content || storage.projects[projectIndex].content,
      outline: outline || storage.projects[projectIndex].outline,
      updatedAt: now
    };
    
    res.json({ success: true });
  });

  app.delete("/api/projects/:id", requireAuth, (req, res) => {
    storage.projects = storage.projects.filter(p => !(p.id === req.params.id && p.userId === (req.session as any).user.uid));
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
