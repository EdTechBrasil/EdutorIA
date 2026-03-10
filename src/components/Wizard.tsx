import React, { useState, useEffect } from 'react';
import { Briefing, ContentType, Outline } from '../types';
import { api } from '../api';
import {
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Check,
  Plus,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WizardProps {
  contentType: ContentType;
  onCancel: () => void;
  onComplete: (projectId: string) => void;
}

const TOTAL_STEPS = 11;

const STEP_TITLES = [
  'TIPO DE MATERIAL',
  'TEMA PRINCIPAL',
  'PÚBLICO-ALVO',
  'OBJETIVO',
  'TOM E LINGUAGEM',
  'IDIOMA',
  'EXTENSÃO',
  'ESTRUTURA',
  'ELEMENTOS EXTRAS',
  'REFERÊNCIAS',
  'REVISÃO FINAL',
];

const MATERIAL_OPTIONS: Record<ContentType, { value: string; desc: string }[]> = {
  ebook: [
    { value: 'E-book', desc: 'Livro digital educacional' },
    { value: 'Guia', desc: 'Guia prático passo a passo' },
    { value: 'Manual', desc: 'Manual técnico ou de referência' },
    { value: 'Apostila', desc: 'Material didático completo' },
    { value: 'Tutorial', desc: 'Tutorial de aprendizado' },
  ],
  lesson_plan: [
    { value: 'Plano de Aula', desc: 'Planejamento detalhado de uma aula' },
    { value: 'Sequência Didática', desc: 'Série de aulas conectadas' },
    { value: 'Projeto Pedagógico', desc: 'Projeto educacional completo' },
  ],
  slides: [
    { value: 'Apresentação', desc: 'Slides de apresentação educacional' },
    { value: 'Palestra', desc: 'Roteiro de palestra com slides' },
    { value: 'Workshop', desc: 'Material interativo de workshop' },
  ],
  images: [
    { value: 'Infográfico', desc: 'Visual informativo estruturado' },
    { value: 'Ilustração', desc: 'Arte educacional ilustrativa' },
    { value: 'Poster', desc: 'Poster educativo temático' },
  ],
};

const OBJECTIVE_OPTIONS = [
  { value: 'Ensinar', desc: 'Transmitir conhecimento novo' },
  { value: 'Capacitar', desc: 'Desenvolver habilidades práticas' },
  { value: 'Informar', desc: 'Apresentar dados e contexto' },
  { value: 'Guiar', desc: 'Conduzir passo a passo' },
];

const TONE_OPTIONS = [
  { value: 'Didático', desc: 'Claro e educativo' },
  { value: 'Formal', desc: 'Sério e profissional' },
  { value: 'Técnico', desc: 'Preciso e especializado' },
  { value: 'Informal', desc: 'Amigável e acessível' },
  { value: 'Corporativo', desc: 'Empresarial e objetivo' },
];

const LANGUAGE_OPTIONS = [
  { value: 'PT-BR', label: 'Português (BR)' },
  { value: 'EN', label: 'English' },
  { value: 'ES', label: 'Español' },
];

const LENGTH_OPTIONS = [
  { value: 'short' as const, label: 'CURTO', pages: '20–30 págs', chapters: '~5 capítulos' },
  { value: 'medium' as const, label: 'MÉDIO', pages: '40–80 págs', chapters: '~10 capítulos' },
  { value: 'long' as const, label: 'LONGO', pages: '100+ págs', chapters: '~18 capítulos' },
];

const EXTRAS_OPTIONS = [
  'Exercícios e atividades',
  'Glossário de termos',
  'Referências bibliográficas',
  'Resumos por capítulo',
  'Questões de revisão',
  'Casos práticos',
  'Dicas e destaques',
  'Infográficos',
];

const AGE_OPTIONS = ['< 12 anos', '12–17 anos', '18–25 anos', '26–40 anos', '40+ anos', 'Todas as idades'];
const LEVEL_OPTIONS = ['Iniciante', 'Intermediário', 'Avançado', 'Todos os níveis'];

function SelectCard({
  selected,
  onClick,
  label,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  desc?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-5 rounded-2xl border text-left transition-all duration-300 ${
        selected
          ? 'bg-neon-cyan/5 border-neon-cyan/40 text-white'
          : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/20 hover:text-white/70'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
            selected ? 'border-neon-cyan bg-neon-cyan/20' : 'border-white/20'
          }`}
        >
          {selected && <div className="w-1.5 h-1.5 bg-neon-cyan rounded-full" />}
        </div>
        <div>
          <p className={`text-sm font-semibold ${selected ? 'text-neon-cyan' : ''}`}>{label}</p>
          {desc && <p className="text-[10px] mt-0.5 opacity-60">{desc}</p>}
        </div>
      </div>
    </button>
  );
}

export const Wizard: React.FC<WizardProps> = ({ contentType, onCancel, onComplete }) => {
  const [step, setStep] = useState(1);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [outlineError, setOutlineError] = useState<string | null>(null);

  // Step 3 local state (combined into target_audience)
  const [audienceText, setAudienceText] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [level, setLevel] = useState('');

  const [briefing, setBriefing] = useState<Briefing>({
    material_type: MATERIAL_OPTIONS[contentType][0].value,
    main_topic: '',
    target_audience: '',
    objective: '',
    tone: 'Didático',
    language: 'PT-BR',
    length: 'medium',
    extras: [],
    references: '',
  });

  // Auto-generate outline when entering step 8
  useEffect(() => {
    if (step === 8 && !briefing.outline && !isGeneratingOutline) {
      generateOutline();
    }
  }, [step]);

  const generateOutline = async () => {
    setIsGeneratingOutline(true);
    setOutlineError(null);
    try {
      const { outline } = await api.generateOutline(contentType, briefing);
      setBriefing(prev => ({ ...prev, outline }));
    } catch (err: any) {
      setOutlineError(err.message || 'Erro ao gerar sumário. Tente novamente.');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const syncAudience = (text: string, age: string, lvl: string) => {
    const parts = [text.trim(), age, lvl].filter(Boolean);
    setBriefing(prev => ({ ...prev, target_audience: parts.join(' · ') }));
  };

  const goNext = () => {
    if (step === 3) {
      syncAudience(audienceText, ageRange, level);
    }
    setStep(s => s + 1);
  };

  const goBack = () => setStep(s => s - 1);

  const toggleExtra = (extra: string) => {
    setBriefing(prev => ({
      ...prev,
      extras: prev.extras.includes(extra)
        ? prev.extras.filter(e => e !== extra)
        : [...prev.extras, extra],
    }));
  };

  // Outline editing helpers
  const updateChapterTitle = (ci: number, title: string) => {
    if (!briefing.outline) return;
    const chapters = briefing.outline.chapters.map((ch, i) =>
      i === ci ? { ...ch, title } : ch
    );
    setBriefing(prev => ({ ...prev, outline: { chapters } }));
  };

  const updateSection = (ci: number, si: number, val: string) => {
    if (!briefing.outline) return;
    const chapters = briefing.outline.chapters.map((ch, i) => {
      if (i !== ci) return ch;
      const sections = ch.sections.map((s, j) => (j === si ? val : s));
      return { ...ch, sections };
    });
    setBriefing(prev => ({ ...prev, outline: { chapters } }));
  };

  const addSection = (ci: number) => {
    if (!briefing.outline) return;
    const chapters = briefing.outline.chapters.map((ch, i) =>
      i === ci ? { ...ch, sections: [...ch.sections, 'Nova seção'] } : ch
    );
    setBriefing(prev => ({ ...prev, outline: { chapters } }));
  };

  const removeSection = (ci: number, si: number) => {
    if (!briefing.outline) return;
    const chapters = briefing.outline.chapters.map((ch, i) =>
      i === ci ? { ...ch, sections: ch.sections.filter((_, j) => j !== si) } : ch
    );
    setBriefing(prev => ({ ...prev, outline: { chapters } }));
  };

  const addChapter = () => {
    if (!briefing.outline) return;
    const chapters = [
      ...briefing.outline.chapters,
      { title: `Capítulo ${briefing.outline.chapters.length + 1}`, sections: ['Nova seção'], status: 'pending' as const },
    ];
    setBriefing(prev => ({ ...prev, outline: { chapters } }));
  };

  const removeChapter = (ci: number) => {
    if (!briefing.outline) return;
    const chapters = briefing.outline.chapters.filter((_, i) => i !== ci);
    setBriefing(prev => ({ ...prev, outline: { chapters } }));
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    setConfirmError(null);
    try {
      const project = await api.createProject({
        type: contentType,
        title: briefing.main_topic,
        briefing,
      });
      onComplete(project.id);
    } catch (err: any) {
      setConfirmError(err.message || 'Erro ao criar projeto.');
      setIsConfirming(false);
    }
  };

  const canProceed: Record<number, boolean> = {
    1: !!briefing.material_type,
    2: briefing.main_topic.trim().length > 0,
    3: audienceText.trim().length > 0,
    4: !!briefing.objective,
    5: !!briefing.tone,
    6: !!briefing.language,
    7: !!briefing.length,
    8: !isGeneratingOutline && !!briefing.outline && briefing.outline.chapters.length > 0,
    9: true,
    10: true,
    11: true,
  };

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="glass-card p-12 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-neon-cyan/10 rounded-full blur-[100px] animate-pulse-slow" />

        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-mono tracking-[0.4em] text-white/30 uppercase">
              Etapa {step} de {TOTAL_STEPS}
            </span>
            <span className="text-[9px] font-mono text-white/20">{STEP_TITLES[step - 1]}</span>
          </div>
          <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-neon-cyan rounded-full"
              initial={false}
              animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Step title */}
        <div className="mb-10">
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter">{STEP_TITLES[step - 1]}</h2>
        </div>

        <AnimatePresence mode="wait">
          {/* ── STEP 1: Tipo de Material ── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MATERIAL_OPTIONS[contentType].map(opt => (
                  <SelectCard
                    key={opt.value}
                    selected={briefing.material_type === opt.value}
                    onClick={() => setBriefing(prev => ({ ...prev, material_type: opt.value }))}
                    label={opt.value}
                    desc={opt.desc}
                  />
                ))}
              </div>
              <Nav onBack={onCancel} backLabel="Cancelar" onNext={goNext} canNext={canProceed[1]} />
            </motion.div>
          )}

          {/* ── STEP 2: Tema Principal ── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <textarea
                rows={4}
                placeholder="Descreva o tema central do material. Seja específico para melhores resultados..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-lg font-light placeholder:text-white/10 focus:outline-none focus:border-neon-cyan/40 transition-all resize-none"
                value={briefing.main_topic}
                onChange={e => setBriefing(prev => ({ ...prev, main_topic: e.target.value }))}
              />
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[2]} />
            </motion.div>
          )}

          {/* ── STEP 3: Público-Alvo ── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-mono tracking-[0.4em] text-white/30 uppercase">Descrição do Público</label>
                <input
                  type="text"
                  placeholder="Ex: Professores de ensino médio, estudantes universitários de TI..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-5 text-lg font-light placeholder:text-white/10 focus:outline-none focus:border-neon-cyan/40 transition-all"
                  value={audienceText}
                  onChange={e => setAudienceText(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-mono tracking-[0.4em] text-white/30 uppercase">Faixa Etária</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-neon-cyan/40 transition-all"
                      value={ageRange}
                      onChange={e => setAgeRange(e.target.value)}
                    >
                      <option value="" className="bg-obsidian">Selecionar...</option>
                      {AGE_OPTIONS.map(a => <option key={a} value={a} className="bg-obsidian">{a}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-mono tracking-[0.4em] text-white/30 uppercase">Nível</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-neon-cyan/40 transition-all"
                      value={level}
                      onChange={e => setLevel(e.target.value)}
                    >
                      <option value="" className="bg-obsidian">Selecionar...</option>
                      {LEVEL_OPTIONS.map(l => <option key={l} value={l} className="bg-obsidian">{l}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  </div>
                </div>
              </div>
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[3]} />
            </motion.div>
          )}

          {/* ── STEP 4: Objetivo ── */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="grid grid-cols-2 gap-3">
                {OBJECTIVE_OPTIONS.map(opt => (
                  <SelectCard
                    key={opt.value}
                    selected={briefing.objective === opt.value}
                    onClick={() => setBriefing(prev => ({ ...prev, objective: opt.value }))}
                    label={opt.value}
                    desc={opt.desc}
                  />
                ))}
              </div>
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[4]} />
            </motion.div>
          )}

          {/* ── STEP 5: Tom ── */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TONE_OPTIONS.map(opt => (
                  <SelectCard
                    key={opt.value}
                    selected={briefing.tone === opt.value}
                    onClick={() => setBriefing(prev => ({ ...prev, tone: opt.value }))}
                    label={opt.value}
                    desc={opt.desc}
                  />
                ))}
              </div>
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[5]} />
            </motion.div>
          )}

          {/* ── STEP 6: Idioma ── */}
          {step === 6 && (
            <motion.div key="s6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="grid grid-cols-3 gap-3">
                {LANGUAGE_OPTIONS.map(opt => (
                  <SelectCard
                    key={opt.value}
                    selected={briefing.language === opt.value}
                    onClick={() => setBriefing(prev => ({ ...prev, language: opt.value }))}
                    label={opt.label}
                  />
                ))}
              </div>
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[6]} />
            </motion.div>
          )}

          {/* ── STEP 7: Extensão ── */}
          {step === 7 && (
            <motion.div key="s7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="grid grid-cols-3 gap-4">
                {LENGTH_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setBriefing(prev => ({ ...prev, length: opt.value }))}
                    className={`p-6 rounded-2xl border text-center transition-all duration-300 ${
                      briefing.length === opt.value
                        ? 'bg-neon-cyan/5 border-neon-cyan/40'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <p className={`text-[10px] font-mono tracking-widest uppercase font-bold ${briefing.length === opt.value ? 'text-neon-cyan' : 'text-white/40'}`}>
                      {opt.label}
                    </p>
                    <p className="text-lg font-bold mt-2">{opt.pages}</p>
                    <p className="text-[9px] text-white/30 mt-1">{opt.chapters}</p>
                  </button>
                ))}
              </div>
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[7]} nextLabel="GERAR ESTRUTURA" />
            </motion.div>
          )}

          {/* ── STEP 8: Estrutura (Outline) ── */}
          {step === 8 && (
            <motion.div key="s8" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              {isGeneratingOutline ? (
                <div className="flex flex-col items-center gap-6 py-16">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border border-neon-cyan/20 flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-neon-cyan animate-pulse" />
                    </div>
                    <div className="absolute inset-0 bg-neon-cyan/10 rounded-full blur-xl animate-pulse" />
                  </div>
                  <p className="text-[10px] font-mono tracking-[0.4em] text-white/40 uppercase">Sintetizando estrutura via Tess IA...</p>
                </div>
              ) : outlineError ? (
                <div className="space-y-6">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm">
                    {outlineError}
                  </div>
                  <button
                    onClick={generateOutline}
                    className="flex items-center gap-3 px-6 py-3 border border-neon-cyan/30 text-neon-cyan rounded-2xl text-sm hover:bg-neon-cyan/5 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" /> Tentar novamente
                  </button>
                </div>
              ) : briefing.outline ? (
                <div className="space-y-6">
                  <p className="text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase">
                    {briefing.outline.chapters.length} capítulos gerados — edite conforme necessário
                  </p>
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                    {briefing.outline.chapters.map((ch, ci) => (
                      <div key={ci} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <input
                            className="flex-1 bg-transparent text-white font-semibold focus:outline-none border-b border-transparent focus:border-white/20 pb-1 transition-all"
                            value={ch.title}
                            onChange={e => updateChapterTitle(ci, e.target.value)}
                          />
                          <button
                            onClick={() => removeChapter(ci)}
                            className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2 pl-2">
                          {ch.sections.map((sec, si) => (
                            <div key={si} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-white/20 rounded-full flex-shrink-0" />
                              <input
                                className="flex-1 bg-transparent text-white/60 text-sm focus:outline-none focus:text-white transition-all"
                                value={sec}
                                onChange={e => updateSection(ci, si, e.target.value)}
                              />
                              <button
                                onClick={() => removeSection(ci, si)}
                                className="text-white/10 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addSection(ci)}
                            className="flex items-center gap-2 text-white/20 hover:text-neon-cyan text-xs transition-colors mt-1"
                          >
                            <Plus className="w-3 h-3" /> Adicionar seção
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addChapter}
                      className="w-full py-4 rounded-2xl border border-dashed border-white/10 text-[10px] font-mono tracking-widest text-white/20 hover:text-neon-cyan hover:border-neon-cyan/40 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> ADICIONAR CAPÍTULO
                    </button>
                  </div>
                </div>
              ) : null}
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[8]} nextLabel="CONFIRMAR ESTRUTURA" />
            </motion.div>
          )}

          {/* ── STEP 9: Elementos Extras ── */}
          {step === 9 && (
            <motion.div key="s9" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="grid grid-cols-2 gap-3">
                {EXTRAS_OPTIONS.map(extra => (
                  <button
                    key={extra}
                    onClick={() => toggleExtra(extra)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border text-left text-sm transition-all duration-300 ${
                      briefing.extras.includes(extra)
                        ? 'bg-neon-cyan/5 border-neon-cyan/40 text-white'
                        : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                      briefing.extras.includes(extra) ? 'bg-neon-cyan border-neon-cyan' : 'border-white/20'
                    }`}>
                      {briefing.extras.includes(extra) && <Check className="w-3 h-3 text-obsidian" />}
                    </div>
                    {extra}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-white/20 font-mono">Opcional — selecione zero ou mais elementos</p>
              <Nav onBack={goBack} onNext={goNext} canNext={true} />
            </motion.div>
          )}

          {/* ── STEP 10: Referências ── */}
          {step === 10 && (
            <motion.div key="s10" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <textarea
                rows={6}
                placeholder="Liste referências, fontes ou materiais base que o conteúdo deve considerar. (Opcional)"
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-lg font-light placeholder:text-white/10 focus:outline-none focus:border-neon-cyan/40 transition-all resize-none"
                value={briefing.references}
                onChange={e => setBriefing(prev => ({ ...prev, references: e.target.value }))}
              />
              <Nav onBack={goBack} onNext={goNext} canNext={true} nextLabel="REVISAR BRIEFING" />
            </motion.div>
          )}

          {/* ── STEP 11: Revisão Final ── */}
          {step === 11 && (
            <motion.div key="s11" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="glass-card p-8 border-neon-cyan/10 bg-neon-cyan/[0.02] space-y-6">
                <BriefingRow label="Tipo de Material" value={briefing.material_type} />
                <BriefingRow label="Tema Principal" value={briefing.main_topic} />
                <BriefingRow label="Público-Alvo" value={briefing.target_audience} />
                <BriefingRow label="Objetivo" value={briefing.objective} />
                <BriefingRow label="Tom" value={briefing.tone} />
                <BriefingRow label="Idioma" value={briefing.language} />
                <BriefingRow
                  label="Extensão"
                  value={briefing.length === 'short' ? 'Curto (20–30 págs)' : briefing.length === 'medium' ? 'Médio (40–80 págs)' : 'Longo (100+ págs)'}
                />
                <BriefingRow
                  label="Capítulos"
                  value={briefing.outline ? `${briefing.outline.chapters.length} capítulos definidos` : 'Não gerado'}
                />
                {briefing.extras.length > 0 && (
                  <BriefingRow label="Extras" value={briefing.extras.join(', ')} />
                )}
                {briefing.references && (
                  <BriefingRow label="Referências" value={briefing.references} />
                )}
              </div>

              {confirmError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-mono">
                  {confirmError}
                </div>
              )}

              <div className="flex justify-between items-center">
                <button
                  onClick={goBack}
                  disabled={isConfirming}
                  className="text-[10px] font-mono tracking-widest text-white/20 hover:text-white uppercase transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className="group flex items-center gap-4 bg-neon-cyan text-obsidian px-10 py-5 rounded-full font-bold hover:scale-[1.02] transition-all duration-500 disabled:opacity-50 shadow-[0_0_40px_rgba(0,240,255,0.3)]"
                >
                  {isConfirming ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> CRIANDO PROJETO...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> CONFIRMAR E GERAR</>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

function Nav({
  onBack,
  onNext,
  canNext,
  backLabel = '← Voltar',
  nextLabel = 'CONTINUAR',
}: {
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  backLabel?: string;
  nextLabel?: string;
}) {
  return (
    <div className="flex justify-between items-center pt-4">
      <button
        onClick={onBack}
        className="text-[10px] font-mono tracking-widest text-white/20 hover:text-white uppercase transition-colors"
      >
        {backLabel}
      </button>
      <button
        onClick={onNext}
        disabled={!canNext}
        className="group flex items-center gap-4 bg-white text-obsidian px-10 py-5 rounded-full font-bold hover:bg-neon-cyan transition-all duration-500 disabled:opacity-20"
      >
        {nextLabel}
        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
      </button>
    </div>
  );
}

function BriefingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-6">
      <p className="text-[9px] font-mono tracking-widest text-white/20 uppercase w-32 flex-shrink-0 pt-0.5">{label}</p>
      <p className="text-white/80 text-sm flex-1">{value}</p>
    </div>
  );
}
