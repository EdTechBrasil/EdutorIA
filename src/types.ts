export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'user';
  credits: number;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  type: 'ebook' | 'guide' | 'manual' | 'lesson_plan' | 'presentation';
  status: 'draft' | 'generating' | 'completed' | 'error';
  content: string;
  outline?: Outline;
  briefing: Briefing;
  createdAt: any;
  updatedAt: any;
}

export interface Briefing {
  material_type: string;
  main_topic: string;
  target_audience: string;
  objective: string;
  tone: string;
  language: string;
  length: 'short' | 'medium' | 'long';
  extras: string[];
  references: string;
}

export interface Outline {
  chapters: Chapter[];
}

export interface Chapter {
  title: string;
  sections: string[];
  content?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
}
