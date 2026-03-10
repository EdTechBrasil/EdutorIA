import React, { useState, useEffect } from 'react';
import { Briefing, ContentType, Outline } from '../types';
import { api } from '../api';
import {
  ArrowRight,
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

const STEP_META = [
  { title: 'TIPO DE MATERIAL',   sub: 'O que você vai criar?' },
  { title: 'TEMA PRINCIPAL',     sub: 'Sobre o que é o conteúdo?' },
  { title: 'PÚBLICO-ALVO',       sub: 'Para quem é este material?' },
  { title: 'OBJETIVO',           sub: 'Qual é a intenção do conteúdo?' },
  { title: 'TOM E LINGUAGEM',    sub: 'Como o conteúdo deve soar?' },
  { title: 'IDIOMA',             sub: 'Em que língua será produzido?' },
  { title: 'EXTENSÃO',           sub: 'Qual o tamanho do material?' },
  { title: 'ESTRUTURA',          sub: 'Revise e ajuste os capítulos' },
  { title: 'ELEMENTOS EXTRAS',   sub: 'Componentes adicionais' },
  { title: 'REFERÊNCIAS',        sub: 'Fontes e materiais base' },
  { title: 'REVISÃO FINAL',      sub: 'Confirme o briefing completo' },
];

const MATERIAL_OPTIONS: Record<ContentType, { value: string; desc: string }[]> = {
  ebook: [
    { value: 'E-book',    desc: 'Livro digital educacional' },
    { value: 'Guia',      desc: 'Guia prático passo a passo' },
    { value: 'Manual',    desc: 'Manual técnico ou de referência' },
    { value: 'Apostila',  desc: 'Material didático completo' },
    { value: 'Tutorial',  desc: 'Tutorial de aprendizado' },
  ],
  lesson_plan: [
    { value: 'Plano de Aula',        desc: 'Planejamento detalhado de uma aula' },
    { value: 'Sequência Didática',   desc: 'Série de aulas conectadas' },
    { value: 'Projeto Pedagógico',   desc: 'Projeto educacional completo' },
  ],
  slides: [
    { value: 'Apresentação', desc: 'Slides de apresentação educacional' },
    { value: 'Palestra',     desc: 'Roteiro de palestra com slides' },
    { value: 'Workshop',     desc: 'Material interativo de workshop' },
  ],
  images: [
    { value: 'Infográfico', desc: 'Visual informativo estruturado' },
    { value: 'Ilustração',  desc: 'Arte educacional ilustrativa' },
    { value: 'Poster',      desc: 'Poster educativo temático' },
  ],
};

const OBJECTIVE_OPTIONS = [
  { value: 'Ensinar',    desc: 'Transmitir conhecimento novo' },
  { value: 'Capacitar',  desc: 'Desenvolver habilidades práticas' },
  { value: 'Informar',   desc: 'Apresentar dados e contexto' },
  { value: 'Guiar',      desc: 'Conduzir passo a passo' },
];

const TONE_OPTIONS = [
  { value: 'Didático',     desc: 'Claro e educativo' },
  { value: 'Formal',       desc: 'Sério e profissional' },
  { value: 'Técnico',      desc: 'Preciso e especializado' },
  { value: 'Informal',     desc: 'Amigável e acessível' },
  { value: 'Corporativo',  desc: 'Empresarial e objetivo' },
];

const LANGUAGE_OPTIONS = [
  { value: 'PT-BR', label: 'Português (BR)', tag: 'BR' },
  { value: 'EN',    label: 'English',        tag: 'EN' },
  { value: 'ES',    label: 'Español',        tag: 'ES' },
];

const LENGTH_OPTIONS = [
  { value: 'short'  as const, label: 'CURTO',  range: '20–30', unit: 'páginas', chapters: '~5 caps' },
  { value: 'medium' as const, label: 'MÉDIO',  range: '40–80', unit: 'páginas', chapters: '~10 caps' },
  { value: 'long'   as const, label: 'LONGO',  range: '100+',  unit: 'páginas', chapters: '~18 caps' },
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

const AGE_OPTIONS   = ['< 12 anos', '12–17 anos', '18–25 anos', '26–40 anos', '40+ anos', 'Todas as idades'];
const LEVEL_OPTIONS = ['Iniciante', 'Intermediário', 'Avançado', 'Todos os níveis'];

// ─── Option Row ───────────────────────────────────────────────────────────────
// Used in all single-select steps. Clean horizontal row with index + indicator.

function OptionRow({
  index,
  label,
  desc,
  selected,
  onClick,
}: {
  index: number;
  label: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: selected ? 0 : 3 }}
      transition={{ duration: 0.15 }}
      className={`relative w-full flex items-center gap-5 px-6 py-4 rounded-xl border text-left transition-all duration-300 overflow-hidden group ${
        selected
          ? 'border-neon-cyan/40 bg-neon-cyan/[0.04]'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.03]'
      }`}
    >
      {/* Active left bar */}
      <span
        className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full transition-all duration-300 ${
          selected ? 'bg-neon-cyan opacity-100' : 'bg-white/20 opacity-0 group-hover:opacity-100'
        }`}
      />

      {/* Index */}
      <span
        className={`font-mono text-[11px] w-6 flex-shrink-0 transition-colors duration-300 ${
          selected ? 'text-neon-cyan' : 'text-white/20'
        }`}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Label + desc */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm transition-colors duration-300 ${
          selected ? 'text-white' : 'text-white/55 group-hover:text-white/80'
        }`}>
          {label}
        </p>
        {desc && (
          <p className={`text-[10px] font-mono mt-0.5 transition-colors duration-300 ${
            selected ? 'text-white/35' : 'text-white/20'
          }`}>
            {desc}
          </p>
        )}
      </div>

      {/* Radio indicator */}
      <span
        className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
          selected
            ? 'border-neon-cyan shadow-[0_0_8px_rgba(0,240,255,0.4)]'
            : 'border-white/15 group-hover:border-white/30'
        }`}
      >
        {selected && <span className="w-1.5 h-1.5 bg-neon-cyan rounded-full block" />}
      </span>
    </motion.button>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

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
    <div className="flex justify-between items-center pt-6">
      <button
        onClick={onBack}
        className="text-[10px] font-mono tracking-widest text-white/20 hover:text-white/60 uppercase transition-colors duration-200"
      >
        {backLabel}
      </button>
      <button
        onClick={onNext}
        disabled={!canNext}
        className="group flex items-center gap-3 bg-white text-obsidian px-8 py-4 rounded-full font-bold text-xs tracking-widest hover:bg-neon-cyan transition-all duration-500 disabled:opacity-20 disabled:cursor-not-allowed"
      >
        {nextLabel}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
      </button>
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export const Wizard: React.FC<WizardProps> = ({ contentType, onCancel, onComplete }) => {
  const [step, setStep] = useState(1);
  const [isConfirming, setIsConfirming]         = useState(false);
  const [confirmError, setConfirmError]         = useState<string | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [outlineError, setOutlineError]         = useState<string | null>(null);

  // Step 3 sub-fields merged into target_audience
  const [audienceText, setAudienceText] = useState('');
  const [ageRange, setAgeRange]         = useState('');
  const [level, setLevel]               = useState('');

  const [briefing, setBriefing] = useState<Briefing>({
    material_type: MATERIAL_OPTIONS[contentType][0].value,
    main_topic:      '',
    target_audience: '',
    objective:       '',
    tone:            'Didático',
    language:        'PT-BR',
    length:          'medium',
    extras:          [],
    references:      '',
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
      setOutlineError(err.message || 'Erro ao gerar sumário.');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const goNext = () => {
    if (step === 3) {
      const parts = [audienceText.trim(), ageRange, level].filter(Boolean);
      setBriefing(prev => ({ ...prev, target_audience: parts.join(' · ') }));
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

  // Outline editing
  const updateChapterTitle = (ci: number, title: string) => {
    if (!briefing.outline) return;
    const chapters = briefing.outline.chapters.map((ch, i) => i === ci ? { ...ch, title } : ch);
    setBriefing(prev => ({ ...prev, outline: { chapters } }));
  };
  const updateSection = (ci: number, si: number, val: string) => {
    if (!briefing.outline) return;
    const chapters = briefing.outline.chapters.map((ch, i) => {
      if (i !== ci) return ch;
      return { ...ch, sections: ch.sections.map((s, j) => j === si ? val : s) };
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
    const n = briefing.outline.chapters.length + 1;
    const chapters = [...briefing.outline.chapters, { title: `Capítulo ${n}`, sections: ['Nova seção'], status: 'pending' as const }];
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
      const project = await api.createProject({ type: contentType, title: briefing.main_topic, briefing });
      onComplete(project.id);
    } catch (err: any) {
      setConfirmError(err.message || 'Erro ao criar projeto.');
      setIsConfirming(false);
    }
  };

  const canProceed: Record<number, boolean> = {
    1:  !!briefing.material_type,
    2:  briefing.main_topic.trim().length > 0,
    3:  audienceText.trim().length > 0,
    4:  !!briefing.objective,
    5:  !!briefing.tone,
    6:  !!briefing.language,
    7:  !!briefing.length,
    8:  !isGeneratingOutline && !!briefing.outline && briefing.outline.chapters.length > 0,
    9:  true,
    10: true,
    11: true,
  };

  const meta = STEP_META[step - 1];

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="glass-card p-10 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute top-0 right-0 w-72 h-72 bg-neon-cyan/[0.06] rounded-full blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 bg-neon-purple/[0.04] rounded-full blur-[80px]" />

        {/* ── Progress ── */}
        <div className="mb-10 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono tracking-[0.45em] text-white/25 uppercase">
              Etapa {step} / {TOTAL_STEPS}
            </span>
            <span className="text-[9px] font-mono text-white/15 tracking-widest uppercase">
              {meta.title}
            </span>
          </div>
          {/* Segmented track */}
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="flex-1 h-[2px] rounded-full overflow-hidden bg-white/[0.06]">
                <motion.div
                  className="h-full bg-neon-cyan rounded-full"
                  initial={false}
                  animate={{ width: i < step ? '100%' : '0%' }}
                  transition={{ duration: 0.3, ease: 'easeOut', delay: i < step ? 0 : 0 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Step Header ── */}
        <div className="mb-8">
          <p className="text-[9px] font-mono tracking-[0.5em] text-white/20 uppercase mb-3">
            {meta.sub}
          </p>
          <h2 className="text-4xl font-bold tracking-tighter leading-none">{meta.title}</h2>
        </div>

        {/* ── Step Content ── */}
        <AnimatePresence mode="wait">

          {/* Step 1 — Tipo */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-7">
              <div className="space-y-2">
                {MATERIAL_OPTIONS[contentType].map((opt, i) => (
                  <OptionRow
                    key={opt.value}
                    index={i}
                    label={opt.value}
                    desc={opt.desc}
                    selected={briefing.material_type === opt.value}
                    onClick={() => setBriefing(prev => ({ ...prev, material_type: opt.value }))}
                  />
                ))}
              </div>
              <Nav onBack={onCancel} backLabel="← Cancelar" onNext={goNext} canNext={canProceed[1]} />
            </motion.div>
          )}

          {/* Step 2 — Tema */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-7">
              <textarea
                rows={4}
                autoFocus
                placeholder="Descreva o tema central do material. Seja específico para melhores resultados..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-6 py-5 text-base font-light placeholder:text-white/[0.12] focus:outline-none focus:border-neon-cyan/40 transition-all resize-none leading-relaxed"
                value={briefing.main_topic}
                onChange={e => setBriefing(prev => ({ ...prev, main_topic: e.target.value }))}
              />
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[2]} />
            </motion.div>
          )}

          {/* Step 3 — Público */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-7">
              <div className="space-y-3">
                <label className="text-[9px] font-mono tracking-[0.4em] text-white/25 uppercase block">Descrição</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ex: Professores de ensino médio, estudantes universitários de TI..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-6 py-4 text-base font-light placeholder:text-white/[0.12] focus:outline-none focus:border-neon-cyan/40 transition-all"
                  value={audienceText}
                  onChange={e => setAudienceText(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[9px] font-mono tracking-[0.4em] text-white/25 uppercase block">Faixa Etária</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-3.5 text-sm focus:outline-none focus:border-neon-cyan/40 transition-all"
                      value={ageRange}
                      onChange={e => setAgeRange(e.target.value)}
                    >
                      <option value="" className="bg-[#0a0a0f]">Opcional...</option>
                      {AGE_OPTIONS.map(a => <option key={a} value={a} className="bg-[#0a0a0f]">{a}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-mono tracking-[0.4em] text-white/25 uppercase block">Nível</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-3.5 text-sm focus:outline-none focus:border-neon-cyan/40 transition-all"
                      value={level}
                      onChange={e => setLevel(e.target.value)}
                    >
                      <option value="" className="bg-[#0a0a0f]">Opcional...</option>
                      {LEVEL_OPTIONS.map(l => <option key={l} value={l} className="bg-[#0a0a0f]">{l}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                  </div>
                </div>
              </div>
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[3]} />
            </motion.div>
          )}

          {/* Step 4 — Objetivo */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-7">
              <div className="space-y-2">
                {OBJECTIVE_OPTIONS.map((opt, i) => (
                  <OptionRow
                    key={opt.value}
                    index={i}
                    label={opt.value}
                    desc={opt.desc}
                    selected={briefing.objective === opt.value}
                    onClick={() => setBriefing(prev => ({ ...prev, objective: opt.value }))}
                  />
                ))}
              </div>
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[4]} />
            </motion.div>
          )}

          {/* Step 5 — Tom */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-7">
              <div className="space-y-2">
                {TONE_OPTIONS.map((opt, i) => (
                  <OptionRow
                    key={opt.value}
                    index={i}
                    label={opt.value}
                    desc={opt.desc}
                    selected={briefing.tone === opt.value}
                    onClick={() => setBriefing(prev => ({ ...prev, tone: opt.value }))}
                  />
                ))}
              </div>
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[5]} />
            </motion.div>
          )}

          {/* Step 6 — Idioma */}
          {step === 6 && (
            <motion.div key="s6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-7">
              <div className="space-y-2">
                {LANGUAGE_OPTIONS.map((opt, i) => (
                  <OptionRow
                    key={opt.value}
                    index={i}
                    label={opt.label}
                    desc={opt.tag}
                    selected={briefing.language === opt.value}
                    onClick={() => setBriefing(prev => ({ ...prev, language: opt.value }))}
                  />
                ))}
              </div>
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[6]} />
            </motion.div>
          )}

          {/* Step 7 — Extensão */}
          {step === 7 && (
            <motion.div key="s7" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-7">
              <div className="grid grid-cols-3 gap-3">
                {LENGTH_OPTIONS.map(opt => {
                  const sel = briefing.length === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setBriefing(prev => ({ ...prev, length: opt.value }))}
                      className={`relative flex flex-col items-center justify-center py-8 px-4 rounded-xl border text-center transition-all duration-300 overflow-hidden group ${
                        sel
                          ? 'border-neon-cyan/40 bg-neon-cyan/[0.04]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className={`absolute left-0 top-4 bottom-4 w-[2px] rounded-full transition-all duration-300 ${sel ? 'bg-neon-cyan' : 'bg-transparent group-hover:bg-white/15'}`} />
                      <p className={`text-[9px] font-mono tracking-[0.4em] uppercase mb-3 ${sel ? 'text-neon-cyan' : 'text-white/25'}`}>{opt.label}</p>
                      <p className={`text-3xl font-bold tracking-tight ${sel ? 'text-white' : 'text-white/50'}`}>{opt.range}</p>
                      <p className={`text-[9px] font-mono mt-1 ${sel ? 'text-white/40' : 'text-white/20'}`}>{opt.unit}</p>
                      <p className={`text-[8px] font-mono mt-3 tracking-wider ${sel ? 'text-neon-cyan/60' : 'text-white/15'}`}>{opt.chapters}</p>
                    </button>
                  );
                })}
              </div>
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[7]} nextLabel="GERAR ESTRUTURA" />
            </motion.div>
          )}

          {/* Step 8 — Estrutura */}
          {step === 8 && (
            <motion.div key="s8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-7">
              {isGeneratingOutline ? (
                <div className="flex flex-col items-center gap-5 py-16">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border border-neon-cyan/20 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-neon-cyan animate-pulse" />
                    </div>
                    <div className="absolute inset-0 bg-neon-cyan/10 rounded-full blur-xl animate-pulse" />
                  </div>
                  <p className="text-[9px] font-mono tracking-[0.4em] text-white/30 uppercase">Sintetizando via Tess IA...</p>
                </div>
              ) : outlineError ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{outlineError}</div>
                  <button onClick={generateOutline} className="flex items-center gap-2 px-5 py-2.5 border border-white/10 text-white/50 rounded-xl text-xs hover:border-neon-cyan/30 hover:text-neon-cyan transition-all">
                    <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                  </button>
                </div>
              ) : briefing.outline ? (
                <div className="space-y-4">
                  <p className="text-[9px] font-mono tracking-[0.35em] text-white/25 uppercase">
                    {briefing.outline.chapters.length} capítulos — edite conforme necessário
                  </p>
                  <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                    {briefing.outline.chapters.map((ch, ci) => (
                      <div key={ci} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-[9px] font-mono text-white/20 w-5">{String(ci + 1).padStart(2, '0')}</span>
                          <input
                            className="flex-1 bg-transparent text-white text-sm font-semibold focus:outline-none border-b border-transparent focus:border-white/20 pb-0.5 transition-all"
                            value={ch.title}
                            onChange={e => updateChapterTitle(ci, e.target.value)}
                          />
                          <button onClick={() => removeChapter(ci)} className="text-white/15 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1.5 pl-8">
                          {ch.sections.map((sec, si) => (
                            <div key={si} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-white/15 rounded-full flex-shrink-0" />
                              <input
                                className="flex-1 bg-transparent text-white/50 text-xs focus:outline-none focus:text-white/80 transition-all"
                                value={sec}
                                onChange={e => updateSection(ci, si, e.target.value)}
                              />
                              <button onClick={() => removeSection(ci, si)} className="text-white/10 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => addSection(ci)} className="flex items-center gap-1.5 text-white/15 hover:text-neon-cyan text-[10px] font-mono transition-colors mt-1">
                            <Plus className="w-3 h-3" /> seção
                          </button>
                        </div>
                      </div>
                    ))}
                    <button onClick={addChapter} className="w-full py-3.5 rounded-xl border border-dashed border-white/[0.08] text-[9px] font-mono tracking-widest text-white/20 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all flex items-center justify-center gap-2">
                      <Plus className="w-3.5 h-3.5" /> ADICIONAR CAPÍTULO
                    </button>
                  </div>
                </div>
              ) : null}
              <Nav onBack={goBack} onNext={goNext} canNext={canProceed[8]} nextLabel="CONFIRMAR ESTRUTURA" />
            </motion.div>
          )}

          {/* Step 9 — Extras */}
          {step === 9 && (
            <motion.div key="s9" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-7">
              <div className="space-y-2">
                {EXTRAS_OPTIONS.map((extra, i) => {
                  const active = briefing.extras.includes(extra);
                  return (
                    <button
                      key={extra}
                      onClick={() => toggleExtra(extra)}
                      className={`relative w-full flex items-center gap-5 px-6 py-3.5 rounded-xl border text-left transition-all duration-200 group ${
                        active
                          ? 'border-neon-cyan/40 bg-neon-cyan/[0.04]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15'
                      }`}
                    >
                      <span className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full transition-all duration-200 ${active ? 'bg-neon-cyan' : 'bg-transparent group-hover:bg-white/15'}`} />
                      <span className="font-mono text-[10px] text-white/20 w-6 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span className={`flex-1 text-sm transition-colors ${active ? 'text-white' : 'text-white/45 group-hover:text-white/70'}`}>{extra}</span>
                      <span className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-all ${active ? 'bg-neon-cyan border-neon-cyan' : 'border-white/15'}`}>
                        {active && <Check className="w-2.5 h-2.5 text-obsidian" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] font-mono text-white/15">Opcional — selecione zero ou mais</p>
              <Nav onBack={goBack} onNext={goNext} canNext={true} />
            </motion.div>
          )}

          {/* Step 10 — Referências */}
          {step === 10 && (
            <motion.div key="s10" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-7">
              <textarea
                rows={6}
                autoFocus
                placeholder="Liste referências, fontes ou materiais base que o conteúdo deve considerar. (Opcional)"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-6 py-5 text-base font-light placeholder:text-white/[0.12] focus:outline-none focus:border-neon-cyan/40 transition-all resize-none leading-relaxed"
                value={briefing.references}
                onChange={e => setBriefing(prev => ({ ...prev, references: e.target.value }))}
              />
              <Nav onBack={goBack} onNext={goNext} canNext={true} nextLabel="REVISAR BRIEFING" />
            </motion.div>
          )}

          {/* Step 11 — Revisão */}
          {step === 11 && (
            <motion.div key="s11" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-7">
              <div className="space-y-1 border border-white/[0.07] rounded-xl overflow-hidden">
                {[
                  ['Tipo de Material',  briefing.material_type],
                  ['Tema Principal',    briefing.main_topic],
                  ['Público-Alvo',      briefing.target_audience],
                  ['Objetivo',         briefing.objective],
                  ['Tom',              briefing.tone],
                  ['Idioma',           briefing.language],
                  ['Extensão',         briefing.length === 'short' ? 'Curto · 20–30 págs' : briefing.length === 'medium' ? 'Médio · 40–80 págs' : 'Longo · 100+ págs'],
                  ['Capítulos',        briefing.outline ? `${briefing.outline.chapters.length} capítulos` : '—'],
                  ...(briefing.extras.length > 0 ? [['Extras', briefing.extras.join(', ')] as [string, string]] : []),
                  ...(briefing.references ? [['Referências', briefing.references] as [string, string]] : []),
                ].map(([label, value], i) => (
                  <div key={i} className="flex gap-6 px-6 py-3.5 border-b border-white/[0.05] last:border-none hover:bg-white/[0.02] transition-colors">
                    <p className="text-[9px] font-mono tracking-widest text-white/20 uppercase w-28 flex-shrink-0 pt-0.5">{label}</p>
                    <p className="text-white/70 text-sm flex-1 leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>

              {confirmError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-mono">{confirmError}</div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button onClick={goBack} disabled={isConfirming} className="text-[10px] font-mono tracking-widest text-white/20 hover:text-white/60 uppercase transition-colors">
                  ← Voltar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className="group flex items-center gap-3 bg-neon-cyan text-obsidian px-8 py-4 rounded-full font-bold text-xs tracking-widest hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 shadow-[0_0_32px_rgba(0,240,255,0.25)]"
                >
                  {isConfirming
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> CRIANDO...</>
                    : <><Sparkles className="w-4 h-4" /> CONFIRMAR E GERAR</>
                  }
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};
