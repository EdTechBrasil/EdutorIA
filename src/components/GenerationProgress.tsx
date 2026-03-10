import React, { useState, useEffect, useRef } from 'react';
import { Project, ContentType } from '../types';
import { api } from '../api';
import { CheckCircle2, Circle, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface GenerationProgressProps {
  projectId: string;
  onComplete: () => void;
}

type ChapterStatus = 'pending' | 'generating' | 'completed' | 'error';

interface ChapterProgress {
  title: string;
  status: ChapterStatus;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({ projectId, onComplete }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<ChapterProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const generatingRef = useRef(false);

  useEffect(() => {
    loadAndGenerate();
  }, [projectId]);

  const loadAndGenerate = async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;

    try {
      const proj = await api.getProject(projectId);
      setProject(proj);

      const rawChapters = proj.outline?.chapters || [];
      if (rawChapters.length === 0) {
        setError('Nenhum capítulo encontrado no projeto.');
        return;
      }

      const progress: ChapterProgress[] = rawChapters.map(ch => ({
        title: ch.title,
        status: 'pending',
      }));
      setChapters(progress);

      const previousSummaries: string[] = [];

      for (let i = 0; i < rawChapters.length; i++) {
        const ch = rawChapters[i];

        setCurrentIndex(i);
        setChapters(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'generating' } : c));

        try {
          const { content } = await api.generateChapter({
            projectId,
            chapterIndex: i,
            chapterTitle: ch.title,
            sections: ch.sections,
            briefing: proj.briefing,
            type: proj.type as ContentType,
            previousSummaries,
          });

          // Store a short summary for context in next chapters
          const summary = ch.title + ': ' + ch.sections.slice(0, 2).join(', ');
          previousSummaries.push(summary);

          setChapters(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'completed' } : c));
        } catch (err: any) {
          setChapters(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'error' } : c));
          // Continue with next chapters even on error
        }
      }

      // Mark project as completed
      await api.updateProject(projectId, { status: 'completed' });

      setIsDone(true);
      setTimeout(() => onComplete(), 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar projeto.');
      generatingRef.current = false;
    }
  };

  const completedCount = chapters.filter(c => c.status === 'completed').length;
  const errorCount = chapters.filter(c => c.status === 'error').length;

  return (
    <div className="max-w-2xl mx-auto py-16">
      <div className="glass-card p-12 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-neon-cyan/10 rounded-full blur-[100px] animate-pulse-slow" />

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" />
            <span className="text-[9px] font-mono tracking-[0.5em] text-white/30 uppercase">
              Pipeline de Geração // {project?.type || '...'}
            </span>
          </div>
          <h2 className="text-4xl font-bold tracking-tighter">
            {isDone ? 'GERAÇÃO COMPLETA' : 'GERANDO CONTEÚDO'}
          </h2>
          {project && (
            <p className="text-white/40 mt-2">{project.title}</p>
          )}
        </div>

        {error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Erro ao iniciar geração</span>
            </div>
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            {chapters.length > 0 && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-mono text-white/40">
                    {completedCount} / {chapters.length} capítulos
                  </span>
                  {errorCount > 0 && (
                    <span className="text-[10px] font-mono text-red-400">{errorCount} com erro</span>
                  )}
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-neon-cyan rounded-full"
                    animate={{ width: `${chapters.length > 0 ? (completedCount / chapters.length) * 100 : 0}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {/* Chapter list */}
            <div className="space-y-3">
              {chapters.map((ch, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                    ch.status === 'generating'
                      ? 'bg-neon-cyan/5 border-neon-cyan/30'
                      : ch.status === 'completed'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : ch.status === 'error'
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-white/[0.02] border-white/5'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {ch.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {ch.status === 'generating' && <Loader2 className="w-5 h-5 text-neon-cyan animate-spin" />}
                    {ch.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                    {ch.status === 'pending' && <Circle className="w-5 h-5 text-white/20" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      ch.status === 'generating' ? 'text-neon-cyan' :
                      ch.status === 'completed' ? 'text-white' :
                      ch.status === 'error' ? 'text-red-400' :
                      'text-white/30'
                    }`}>
                      {ch.title}
                    </p>
                    {ch.status === 'generating' && (
                      <p className="text-[9px] font-mono text-neon-cyan/60 mt-0.5">gerando...</p>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-white/20">
                    {i + 1}/{chapters.length}
                  </span>
                </motion.div>
              ))}
            </div>

            {isDone && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 flex items-center justify-center gap-4 py-6"
              >
                <Sparkles className="w-5 h-5 text-neon-cyan" />
                <span className="text-neon-cyan font-mono tracking-widest text-sm">
                  Abrindo editor...
                </span>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
