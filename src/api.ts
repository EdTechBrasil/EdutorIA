import { Project, Briefing, Outline, User, AdminLog, AgentConfig, ContentType } from './types';
import { auth } from './firebase';

const BASE_URL = '/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) return {};
  const token = await currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  loginWithFirebase: async (idToken: string): Promise<User> => {
    return apiFetch<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  },
  getMe: async (): Promise<User | null> => {
    return apiFetch<User | null>('/auth/me');
  },
  logout: async (): Promise<void> => {
    await apiFetch('/auth/logout', { method: 'POST' });
  },

  // Projects
  getProjects: async (): Promise<Project[]> => {
    return apiFetch<Project[]>('/projects');
  },
  getProject: async (id: string): Promise<Project> => {
    return apiFetch<Project>(`/projects/${id}`);
  },
  createProject: async (data: { briefing: Briefing; type: ContentType; title: string }): Promise<Project> => {
    return apiFetch<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateProject: async (id: string, updates: Partial<Project>): Promise<Project> => {
    return apiFetch<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  deleteProject: async (id: string): Promise<void> => {
    await apiFetch(`/projects/${id}`, { method: 'DELETE' });
  },

  // Generate (Tess IA)
  generateOutline: async (type: ContentType, briefing: Briefing): Promise<{ outline: Outline }> => {
    return apiFetch<{ outline: Outline }>('/generate/outline', {
      method: 'POST',
      body: JSON.stringify({ type, briefing }),
    });
  },
  generateChapter: async (params: {
    projectId: string;
    chapterIndex: number;
    chapterTitle: string;
    sections: string[];
    briefing: Briefing;
    type: ContentType;
    previousSummaries?: string[];
  }): Promise<{ content: string }> => {
    return apiFetch<{ content: string }>('/generate/chapter', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Admin
  admin: {
    getUsers: async (): Promise<User[]> => {
      return apiFetch<User[]>('/admin/users');
    },
    updateUser: async (uid: string, data: { role?: User['role']; credits?: number; blocked?: boolean }): Promise<User> => {
      return apiFetch<User>(`/admin/users/${uid}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    getLogs: async (): Promise<AdminLog[]> => {
      return apiFetch<AdminLog[]>('/admin/logs');
    },
    getAgents: async (): Promise<AgentConfig> => {
      return apiFetch<AgentConfig>('/admin/agents');
    },
    updateAgents: async (config: AgentConfig): Promise<AgentConfig> => {
      return apiFetch<AgentConfig>('/admin/agents', {
        method: 'PUT',
        body: JSON.stringify(config),
      });
    },
  },
};
