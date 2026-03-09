import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { api } from '../api';
import { 
  ArrowLeft, 
  Save, 
  Sparkles, 
  Download, 
  Share2, 
  ChevronRight,
  CheckCircle2,
  Circle,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface ProjectEditorProps {
  projectId: string;
  onBack: () => void;
}

export const ProjectEditor: React.FC<ProjectEditorProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await api.getProject(projectId);
        setProject(data);
        if (data.outline?.chapters[activeChapterIndex]?.content) {
          setEditorContent(data.outline.chapters[activeChapterIndex].content || '');
        } else {
          setEditorContent('');
        }
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, activeChapterIndex]);

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      const updatedOutline = { ...project.outline! };
      updatedOutline.chapters[activeChapterIndex].content = editorContent;
      updatedOutline.chapters[activeChapterIndex].status = 'completed';
      
      await api.updateProject(projectId, { outline: updatedOutline });
      setProject({ ...project, outline: updatedOutline });
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="h-full flex flex-col gap-8">
      {/* Editor Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="w-12 h-12 rounded-2xl border border-white/5 flex items-center justify-center hover:border-neon-cyan/40 hover:text-neon-cyan transition-all duration-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1.5 h-1.5 bg-neon-cyan rounded-full animate-pulse" />
              <span className="text-[9px] font-mono tracking-widest text-white/20 uppercase">Sessão Ativa // {project.id}</span>
            </div>
            <h3 className="text-3xl font-bold tracking-tight">{project.title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-white/[0.02] border border-white/5 rounded-2xl p-1">
            <button className="px-4 py-2 text-[10px] font-mono tracking-widest text-white/40 hover:text-white transition-colors">COMPARTILHAR</button>
            <button className="px-4 py-2 text-[10px] font-mono tracking-widest text-white/40 hover:text-white transition-colors">EXPORTAR</button>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-white text-obsidian font-bold text-xs hover:bg-neon-cyan transition-all duration-500 disabled:opacity-50 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            CONFIRMAR ALTERAÇÕES
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* Sidebar: Outline */}
        <aside className="w-80 glass-card p-8 flex flex-col gap-8 overflow-y-auto border-white/5">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-mono tracking-[0.4em] text-white/20 uppercase">Mapa Neural</h4>
            <span className="text-[8px] font-mono bg-neon-purple/10 text-neon-purple px-2 py-1 rounded-md">
              {project.outline?.chapters.length} NODOS
            </span>
          </div>

          <div className="space-y-3">
            {project.outline?.chapters.map((chapter, index) => (
              <button
                key={index}
                onClick={() => setActiveChapterIndex(index)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-500 group ${
                  activeChapterIndex === index 
                    ? 'bg-neon-cyan/5 border-neon-cyan/30 text-neon-cyan' 
                    : 'bg-white/[0.02] border-white/5 text-white/30 hover:bg-white/[0.05] hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                    chapter.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                    activeChapterIndex === index ? 'bg-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.5)]' : 'bg-white/10'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight transition-colors ${activeChapterIndex === index ? 'text-white' : ''}`}>
                      {chapter.title}
                    </p>
                    <p className="text-[9px] font-mono tracking-widest opacity-40 mt-2 uppercase">{chapter.sections.length} SEÇÕES</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button className="mt-auto w-full py-5 rounded-2xl border border-dashed border-white/10 text-[10px] font-mono tracking-widest text-white/20 hover:text-neon-cyan hover:border-neon-cyan/40 transition-all flex items-center justify-center gap-3">
            <Sparkles className="w-4 h-4" />
            ADICIONAR NODO
          </button>
        </aside>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="glass-card p-12 flex-1 flex flex-col min-h-0 overflow-hidden border-white/5">
            <div className="flex items-center justify-between mb-12">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-white/20 uppercase mb-2 block">Editando Nodo</span>
                <h2 className="text-4xl font-bold tracking-tight">{project.outline?.chapters[activeChapterIndex].title}</h2>
              </div>
              <button className="group flex items-center gap-3 text-neon-cyan hover:text-white transition-colors">
                <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                <span className="text-[10px] font-mono tracking-widest uppercase">Refino Neural</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-quill-futuristic">
              <ReactQuill 
                theme="snow" 
                value={editorContent} 
                onChange={setEditorContent}
                placeholder="Inicializar síntese neural..."
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-quill-futuristic .ql-toolbar {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-radius: 16px;
          padding: 16px !important;
          margin-bottom: 32px;
        }
        .custom-quill-futuristic .ql-container {
          border: none !important;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.8);
        }
        .custom-quill-futuristic .ql-editor {
          padding: 0 !important;
        }
        .custom-quill-futuristic .ql-stroke {
          stroke: rgba(255, 255, 255, 0.4) !important;
        }
        .custom-quill-futuristic .ql-fill {
          fill: rgba(255, 255, 255, 0.4) !important;
        }
        .custom-quill-futuristic .ql-picker {
          color: rgba(255, 255, 255, 0.4) !important;
        }
        .custom-quill-futuristic .ql-editor h1 { font-size: 2.5em; font-weight: 700; margin-bottom: 0.5em; color: white; }
        .custom-quill-futuristic .ql-editor p { margin-bottom: 1em; }
      `}</style>
    </div>
  );
};
