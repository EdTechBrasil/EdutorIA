import { Project, Briefing, User } from './types';

const mockBriefing: Briefing = {
  material_type: 'ebook',
  main_topic: 'Marketing Digital',
  target_audience: 'Iniciantes',
  objective: 'Ensinar o básico',
  tone: 'Didático',
  language: 'Português',
  length: 'medium',
  extras: [],
  references: ''
};

const mockProjects: Project[] = [
  {
    id: '1',
    userId: 'user1',
    title: 'Guia de Marketing Digital 2024',
    type: 'ebook',
    status: 'completed',
    content: '',
    briefing: mockBriefing,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    outline: {
      chapters: [
        { title: 'Introdução ao Marketing', sections: ['O que é?', 'História'], status: 'completed', content: '<h1>Introdução</h1><p>O marketing digital é...</p>' },
        { title: 'Estratégias de SEO', sections: ['On-page', 'Off-page'], status: 'completed', content: '<h1>SEO</h1><p>SEO significa Search Engine Optimization...</p>' }
      ]
    }
  },
  {
    id: '2',
    userId: 'user1',
    title: 'Plano de Aula: Revolução Francesa',
    type: 'lesson_plan',
    status: 'draft',
    content: '',
    briefing: { ...mockBriefing, material_type: 'lesson_plan', main_topic: 'Revolução Francesa' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    outline: {
      chapters: [
        { title: 'Contexto Histórico', sections: ['A crise do Antigo Regime', 'Os Estados Gerais'], status: 'completed', content: '<h1>Contexto</h1><p>A França no século XVIII...</p>' },
        { title: 'A Queda da Bastilha', sections: ['O 14 de Julho', 'A Assembleia Nacional'], status: 'pending', content: '' }
      ]
    }
  },
  {
    id: '3',
    userId: 'user1',
    title: 'Apresentação: Futuro da IA',
    type: 'presentation',
    status: 'completed',
    content: '',
    briefing: { ...mockBriefing, material_type: 'presentation', main_topic: 'Futuro da IA' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    outline: {
      chapters: [
        { title: 'IA Generativa', sections: ['LLMs', 'Modelos de Imagem'], status: 'completed', content: '<h1>IA Generativa</h1><p>A revolução começou com...</p>' }
      ]
    }
  }
];

export const api = {
  getProjects: async (): Promise<Project[]> => {
    return [...mockProjects];
  },
  getProject: async (id: string): Promise<Project> => {
    const project = mockProjects.find(p => p.id === id);
    if (!project) throw new Error('Projeto não encontrado');
    return { ...project };
  },
  createProject: async (briefing: Briefing): Promise<Project> => {
    const newProject: Project = {
      id: Math.random().toString(36).substring(7),
      userId: 'user1',
      title: briefing.main_topic || 'Novo Projeto',
      type: briefing.material_type as any,
      status: 'draft',
      content: '',
      briefing: briefing,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      outline: { chapters: [] }
    };
    mockProjects.unshift(newProject);
    return newProject;
  },
  updateProject: async (id: string, updates: Partial<Project>): Promise<Project> => {
    const index = mockProjects.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Projeto não encontrado');
    mockProjects[index] = { ...mockProjects[index], ...updates, updatedAt: new Date().toISOString() };
    return mockProjects[index];
  },
  logout: async (): Promise<void> => {
    console.log("Mock logout");
  }
};
