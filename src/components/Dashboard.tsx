import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Project } from '../types';
import { api } from '../api';
import { PROJECT_TYPE_LABELS } from '../constants';
import { 
  BookOpen, 
  Image as ImageIcon, 
  FileText, 
  Presentation, 
  Video, 
  Brain, 
  Sparkles,
  RefreshCw,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  onNewProject: () => void;
  onSelectProject: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNewProject, onSelectProject }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      try {
        const data = await api.getProjects();
        setProjects(data);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  const categories = [
    { id: 'content', label: 'CONTEÚDO NEURAL', icon: BookOpen, desc: 'Gere materiais educacionais de alta fidelidade, e-books e guias estruturados.' },
    { id: 'images', label: 'SÍNTESE VISUAL', icon: ImageIcon, desc: 'Crie ilustrações, diagramas e assets visuais imersivos para seu conteúdo.' },
    { id: 'tutoria', label: 'TUTOR COGNITIVO', icon: Brain, desc: 'Configure mecanismos de interação e tutoria inteligente para estudantes.' },
    { id: 'audio', label: 'ESTÚDIO DE VOZ', icon: Video, desc: 'Converta texto em narrações neurais ultra-realistas para videoaulas.' },
  ];

  return (
    <div className="h-full flex flex-col gap-12 py-8">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.4em] text-white/40 uppercase">Hub de Criação Neural</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl lg:text-6xl font-bold tracking-tighter leading-none"
          >
            Olá, <span className="text-neon-cyan neon-text-glow">{user?.displayName?.split(' ')[0]}</span>
          </motion.h1>
          <p className="text-white/30 mt-4 font-light max-w-md">O que vamos sintetizar hoje? Escolha um módulo abaixo para iniciar sua jornada criativa.</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Projetos Ativos', value: projects.length, icon: BookOpen },
            { label: 'Créditos Disponíveis', value: user?.credits, icon: Sparkles },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card px-8 py-5 flex flex-col gap-1 min-w-[160px] border-white/5"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="w-4 h-4 text-neon-cyan/60" />
                <div className="w-1.5 h-1.5 bg-neon-cyan/40 rounded-full" />
              </div>
              <p className="text-[9px] font-mono tracking-widest text-white/20 uppercase">{stat.label}</p>
              <p className="text-2xl font-bold tracking-tighter">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Functional HUB Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-1 h-4 bg-neon-cyan rounded-full" />
            <h2 className="text-[10px] font-mono tracking-[0.5em] text-white/30 uppercase">Módulos de Funcionalidade</h2>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, i) => (
            <motion.button
              key={cat.id}
              whileHover={{ scale: 1.02, translateY: -5 }}
              onClick={cat.id === 'content' ? onNewProject : undefined}
              className="glass-card p-8 text-left group relative overflow-hidden neo-brutalist-border flex flex-col h-full"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <cat.icon className="w-32 h-32 -mr-12 -mt-12 rotate-12" />
              </div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:bg-neon-cyan group-hover:text-obsidian transition-all duration-500">
                  <cat.icon className="w-6 h-6" />
                </div>
                
                <h3 className="text-xl font-bold tracking-tight mb-3 group-hover:text-neon-cyan transition-colors">{cat.label}</h3>
                <p className="text-xs text-white/40 font-light leading-relaxed mb-8 flex-1">{cat.desc}</p>
                
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="flex items-center gap-2 text-neon-cyan text-[9px] font-mono tracking-widest uppercase">
                    <span>Inicializar</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <Sparkles className="w-3 h-3 text-white/10 group-hover:text-neon-cyan transition-colors" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Projects List */}
        <section className="lg:col-span-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-1 h-4 bg-neon-purple rounded-full" />
              <h2 className="text-[10px] font-mono tracking-[0.5em] text-white/30 uppercase">Atividade Recente</h2>
            </div>
            <button className="text-[9px] font-mono tracking-widest text-white/20 hover:text-white uppercase transition-colors">Ver Arquivo Completo</button>
          </div>
          
          <div className="flex flex-col gap-4">
            {projects.length > 0 ? (
              projects.slice(0, 3).map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="glass-card p-6 flex items-center justify-between group hover:bg-white/[0.04] transition-all border-white/5"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-neon-purple/20 transition-colors">
                      <FileText className="w-6 h-6 text-white/20 group-hover:text-neon-purple" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium group-hover:text-neon-cyan transition-colors">{project.title}</h4>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[9px] font-mono tracking-widest text-white/20 uppercase px-2 py-1 bg-white/5 rounded-md">
                          {PROJECT_TYPE_LABELS[project.type]}
                        </span>
                        <span className="text-[9px] font-mono tracking-widest text-white/20 uppercase">
                          {new Date(project.updatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-[8px] font-mono tracking-widest text-white/20 uppercase mb-1">Integridade</p>
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                        <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-tighter">Sincronizado</p>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center group-hover:border-neon-cyan/40 transition-all">
                      <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-neon-cyan" />
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="glass-card p-12 text-center border-dashed border-white/10">
                <p className="text-white/20 font-mono text-xs uppercase tracking-widest">Nenhum projeto sintetizado ainda.</p>
                <button onClick={onNewProject} className="mt-4 text-neon-cyan text-[10px] font-mono tracking-widest uppercase hover:underline">Iniciar Primeiro Projeto</button>
              </div>
            )}
          </div>
        </section>

        {/* AI Insights / Quick Actions */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-1 h-4 bg-white/10 rounded-full" />
            <h2 className="text-[10px] font-mono tracking-[0.5em] text-white/30 uppercase">Insights Neurais</h2>
          </div>
          
          <div className="glass-card p-8 border-neon-cyan/20 bg-neon-cyan/[0.02] relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Brain className="w-24 h-24" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center mb-6">
              <Sparkles className="w-5 h-5 text-neon-cyan" />
            </div>
            <h3 className="text-base font-bold tracking-tight mb-4">Otimização de Fluxo</h3>
            <p className="text-xs text-white/50 leading-relaxed mb-8">
              "Detectamos um padrão em seus últimos guias. Posso sugerir um template de 'Manual Técnico' para seu próximo projeto sobre Marketing?"
            </p>
            <button className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-[9px] font-mono tracking-widest text-white/40 uppercase hover:bg-neon-cyan hover:text-obsidian hover:border-neon-cyan transition-all duration-500">
              Aceitar Sugestão
            </button>
          </div>

          <div className="glass-card p-8 border-white/5">
            <h3 className="text-[10px] font-mono tracking-[0.4em] text-white/20 uppercase mb-6">Dica de Produtividade</h3>
            <div className="flex gap-4">
              <div className="w-1 bg-neon-purple rounded-full" />
              <p className="text-xs text-white/40 leading-relaxed italic">
                "Use o atalho 'Refino Neural' no editor para melhorar a coesão pedagógica de seus parágrafos instantaneamente."
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
