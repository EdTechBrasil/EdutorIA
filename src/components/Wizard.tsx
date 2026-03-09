import React, { useState } from 'react';
import { Briefing } from '../types';
import { api } from '../api';
import { GoogleGenAI } from "@google/genai";
import { PROJECT_TYPE_LABELS } from '../constants';
import { 
  BookOpen, 
  FileText, 
  Presentation, 
  Sparkles, 
  ArrowRight, 
  RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WizardProps {
  onCancel: () => void;
  onComplete: (projectId: string) => void;
}

export const Wizard: React.FC<WizardProps> = ({ onCancel, onComplete }) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefing, setBriefing] = useState<Briefing>({
    material_type: '',
    main_topic: '',
    target_audience: '',
    objective: '',
    tone: 'Didático',
    language: 'Português',
    length: 'medium',
    extras: [],
    references: ''
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Gere um sumário estruturado para um ${briefing.material_type} sobre "${briefing.main_topic}". 
      Público: ${briefing.target_audience}. Tom: ${briefing.tone}.
      Retorne APENAS um JSON no formato: { "chapters": [{ "title": "...", "sections": ["...", "..."], "status": "pending" }] }`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });

      const projectId = Math.random().toString(36).substring(7);
      const text = result.text;
      const outline = JSON.parse(text.replace(/```json|```/g, ''));

      console.log("Project created locally for visualization:", projectId);
      onComplete(projectId);
    } catch (error) {
      console.error("Generation error:", error);
      onComplete('demo-project-id');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12">
      <div className="glass-card p-16 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-neon-cyan/10 rounded-full blur-[100px] animate-pulse-slow" />

        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-2 h-2 bg-neon-cyan rounded-full" />
            <span className="text-[10px] font-mono tracking-[0.5em] text-white/30 uppercase">Gerador Neural // Passo 0{step}</span>
          </div>
          <h2 className="text-5xl lg:text-7xl font-bold tracking-tighter">
            {step === 1 ? 'DEFINA O NÚCLEO' : step === 2 ? 'MAPEIE O PÚBLICO' : 'SINTETIZAR'}
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { id: 'ebook', label: 'E-BOOK', icon: BookOpen, desc: 'Publicação digital abrangente' },
                  { id: 'guide', label: 'GUIA PRÁTICO', icon: FileText, desc: 'Manual instrucional passo a passo' },
                  { id: 'lesson_plan', label: 'PLANO DE AULA', icon: BookOpen, desc: 'Estrutura educacional organizada' },
                  { id: 'presentation', label: 'APRESENTAÇÃO', icon: Presentation, desc: 'Slides visuais de alto impacto' },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setBriefing({ ...briefing, material_type: type.id })}
                    className={`p-8 rounded-3xl border text-left transition-all duration-500 group ${
                      briefing.material_type === type.id 
                        ? 'bg-neon-cyan/5 border-neon-cyan/40 shadow-[0_0_30px_rgba(0,240,255,0.1)]' 
                        : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 ${
                      briefing.material_type === type.id ? 'bg-neon-cyan text-obsidian' : 'bg-white/5 text-white/40'
                    }`}>
                      <type.icon className="w-6 h-6" />
                    </div>
                    <h4 className={`text-sm font-mono tracking-widest mb-2 ${briefing.material_type === type.id ? 'text-neon-cyan' : 'text-white/60'}`}>{type.label}</h4>
                    <p className="text-xs text-white/30 font-light">{type.desc}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-mono tracking-[0.4em] text-white/20 uppercase">Tópico Principal</label>
                <input
                  type="text"
                  placeholder="Digite o assunto central do seu material..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-xl font-light placeholder:text-white/10 focus:outline-none focus:border-neon-cyan/40 transition-all"
                  value={briefing.main_topic}
                  onChange={(e) => setBriefing({ ...briefing, main_topic: e.target.value })}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!briefing.material_type || !briefing.main_topic}
                  className="group flex items-center gap-4 bg-white text-obsidian px-10 py-5 rounded-full font-bold hover:bg-neon-cyan transition-all duration-500 disabled:opacity-20"
                >
                  CONTINUAR
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-[10px] font-mono tracking-[0.4em] text-white/20 uppercase">Público-Alvo</label>
                  <input
                    type="text"
                    placeholder="Para quem é este material?"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-lg font-light placeholder:text-white/10 focus:outline-none focus:border-neon-cyan/40 transition-all"
                    value={briefing.target_audience}
                    onChange={(e) => setBriefing({ ...briefing, target_audience: e.target.value })}
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-mono tracking-[0.4em] text-white/20 uppercase">Tom de Comunicação</label>
                  <select
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-lg font-light focus:outline-none focus:border-neon-cyan/40 transition-all appearance-none"
                    value={briefing.tone}
                    onChange={(e) => setBriefing({ ...briefing, tone: e.target.value })}
                  >
                    <option value="Didático" className="bg-obsidian">Didático / Educacional</option>
                    <option value="Profissional" className="bg-obsidian">Profissional / Corporativo</option>
                    <option value="Descontraído" className="bg-obsidian">Casual / Amigável</option>
                    <option value="Acadêmico" className="bg-obsidian">Acadêmico / Formal</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-mono tracking-[0.4em] text-white/20 uppercase">Objetivo Central</label>
                <textarea
                  placeholder="Qual é o objetivo final deste conteúdo?"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-lg font-light placeholder:text-white/10 focus:outline-none focus:border-neon-cyan/40 transition-all h-40 resize-none"
                  value={briefing.objective}
                  onChange={(e) => setBriefing({ ...briefing, objective: e.target.value })}
                />
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep(1)}
                  className="text-[10px] font-mono tracking-widest text-white/20 hover:text-white uppercase transition-colors"
                >
                  Voltar ao Início
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!briefing.target_audience || !briefing.objective}
                  className="group flex items-center gap-4 bg-white text-obsidian px-10 py-5 rounded-full font-bold hover:bg-neon-cyan transition-all duration-500 disabled:opacity-20"
                >
                  REVISAR SÍNTESE
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="glass-card p-12 border-neon-cyan/10 bg-neon-cyan/[0.02]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-white/20 uppercase mb-2">Tipo de Material</p>
                    <p className="text-2xl font-medium text-neon-cyan">{PROJECT_TYPE_LABELS[briefing.material_type] || briefing.material_type.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-white/20 uppercase mb-2">Tópico Principal</p>
                    <p className="text-2xl font-medium">{briefing.main_topic}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-white/20 uppercase mb-2">Tom Alvo</p>
                    <p className="text-2xl font-medium">{briefing.tone}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-neon-cyan text-obsidian py-8 rounded-full font-bold text-xl hover:scale-[1.02] transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-4 shadow-[0_0_50px_rgba(0,240,255,0.3)]"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      SINTETIZANDO CAMINHOS NEURAIS...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      INICIALIZAR GERAÇÃO
                    </>
                  )}
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={isGenerating}
                  className="text-[10px] font-mono tracking-widest text-white/20 hover:text-white uppercase transition-colors text-center"
                >
                  Modificar Parâmetros
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
