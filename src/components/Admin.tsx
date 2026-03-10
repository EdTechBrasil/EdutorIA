import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../App';
import { User, AdminLog, AgentConfig, AgentsMeta } from '../types';
import { Users, CreditCard, ScrollText, Bot, Save, RefreshCw, ShieldAlert, ChevronDown, Check, Copy, AlertTriangle, Zap } from 'lucide-react';
import { motion } from 'motion/react';

type AdminTab = 'users' | 'credits' | 'logs' | 'agents';

export const Admin: React.FC = () => {
  const { refreshUser } = useAuth();
  const [tab, setTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [agents, setAgents] = useState<AgentConfig>({ ebook: '', lesson_plan: '', slides: '', images: '' });
  const [agentsMeta, setAgentsMeta] = useState<AgentsMeta>({});
  const [agentsSaved, setAgentsSaved] = useState<'idle' | 'saved' | 'vercel'>('idle');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditEdits, setCreditEdits] = useState<Record<string, number>>({});

  useEffect(() => {
    loadTab(tab);
  }, [tab]);

  const loadTab = async (t: AdminTab) => {
    setLoading(true);
    setError(null);
    try {
      if (t === 'users' || t === 'credits') {
        const data = await api.admin.getUsers();
        setUsers(data);
      } else if (t === 'logs') {
        const data = await api.admin.getLogs();
        setLogs(data);
      } else if (t === 'agents') {
        const data = await api.admin.getAgents();
        const { _envStatus, _vercelConfigured, ...agentIds } = data as any;
        setAgents(agentIds);
        setAgentsMeta({ _envStatus, _vercelConfigured });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (uid: string, changes: Partial<User>) => {
    try {
      const updated = await api.admin.updateUser(uid, changes);
      setUsers(prev => prev.map(u => u.uid === uid ? updated : u));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSaveCredits = async (uid: string) => {
    const credits = creditEdits[uid];
    if (credits === undefined) return;
    await handleUpdateUser(uid, { credits });
    setCreditEdits(prev => { const n = { ...prev }; delete n[uid]; return n; });
    await refreshUser();
  };

  const handleSaveAgents = async () => {
    try {
      const result = await api.admin.updateAgents(agents) as any;
      const { vercelPersisted, vercelError, vercelConfigured, ...agentIds } = result;
      setAgents(agentIds);
      setAgentsMeta(prev => ({ ...prev, vercelPersisted, vercelError, vercelConfigured }));
      setAgentsSaved(vercelPersisted ? 'vercel' : 'saved');
      setTimeout(() => setAgentsSaved('idle'), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCmd(key);
      setTimeout(() => setCopiedCmd(null), 2000);
    });
  };

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'users', label: 'USUÁRIOS', icon: Users },
    { id: 'credits', label: 'CRÉDITOS', icon: CreditCard },
    { id: 'logs', label: 'LOGS', icon: ScrollText },
    { id: 'agents', label: 'AGENTES', icon: Bot },
  ];

  return (
    <div className="h-full flex flex-col gap-10 py-8">
      {/* Header */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <ShieldAlert className="w-4 h-4 text-neon-cyan" />
          <span className="text-[10px] font-mono tracking-[0.4em] text-white/40 uppercase">Painel de Administração</span>
        </motion.div>
        <h1 className="text-5xl font-bold tracking-tighter">ÁREA <span className="text-neon-cyan neon-text-glow">ADM</span></h1>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-6 py-4 text-[10px] font-mono tracking-widest uppercase transition-all border-b-2 -mb-px ${
              tab === t.id
                ? 'text-neon-cyan border-neon-cyan'
                : 'text-white/30 border-transparent hover:text-white/60'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-mono">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-neon-cyan/50" />
        </div>
      ) : (
        <>
          {/* Users Tab */}
          {tab === 'users' && (
            <div className="flex flex-col gap-4">
              {users.map(u => (
                <div key={u.uid} className="glass-card p-6 flex items-center justify-between gap-6 border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-sm font-bold">
                      {u.displayName?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.displayName || 'Sem nome'}</p>
                      <p className="text-[10px] font-mono text-white/30">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[9px] font-mono text-white/20 uppercase mb-1">Créditos</p>
                      <p className="text-sm font-medium">{u.credits}</p>
                    </div>

                    {/* Role selector */}
                    <div className="relative">
                      <select
                        value={u.role}
                        onChange={e => handleUpdateUser(u.uid, { role: e.target.value as User['role'] })}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono tracking-widest uppercase text-white/60 appearance-none pr-8 focus:outline-none focus:border-neon-cyan/40 cursor-pointer"
                      >
                        <option value="user" className="bg-obsidian">USER</option>
                        <option value="admin" className="bg-obsidian">ADMIN</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-white/30 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Block toggle */}
                    <button
                      onClick={() => handleUpdateUser(u.uid, { blocked: !u.blocked })}
                      className={`px-4 py-2 rounded-xl text-[10px] font-mono tracking-widest uppercase transition-all ${
                        u.blocked
                          ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/10'
                          : 'bg-white/5 border border-white/10 text-white/40 hover:border-white/20'
                      }`}
                    >
                      {u.blocked ? 'Bloqueado' : 'Bloquear'}
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="glass-card p-12 text-center border-dashed border-white/10">
                  <p className="text-white/20 font-mono text-xs uppercase tracking-widest">Nenhum usuário cadastrado.</p>
                </div>
              )}
            </div>
          )}

          {/* Credits Tab */}
          {tab === 'credits' && (
            <div className="flex flex-col gap-4">
              {users.map(u => (
                <div key={u.uid} className="glass-card p-6 flex items-center justify-between gap-6 border-white/5">
                  <div>
                    <p className="text-sm font-medium">{u.displayName || 'Sem nome'}</p>
                    <p className="text-[10px] font-mono text-white/30">{u.email}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[9px] font-mono text-white/20 uppercase mb-1">Atual</p>
                      <p className="text-lg font-bold text-neon-cyan">{u.credits}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder={String(u.credits)}
                        value={creditEdits[u.uid] ?? ''}
                        onChange={e => setCreditEdits(prev => ({ ...prev, [u.uid]: Number(e.target.value) }))}
                        className="w-24 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-sm text-center focus:outline-none focus:border-neon-cyan/40"
                      />
                      <button
                        onClick={() => handleSaveCredits(u.uid)}
                        disabled={creditEdits[u.uid] === undefined}
                        className="p-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan hover:text-obsidian transition-all disabled:opacity-30"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Logs Tab */}
          {tab === 'logs' && (
            <div className="flex flex-col gap-3">
              {logs.map(log => (
                <div key={log.id} className="glass-card p-5 flex items-center justify-between border-white/5">
                  <div className="flex items-center gap-6">
                    <div className="w-2 h-2 bg-neon-cyan rounded-full flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{log.action}</p>
                      <p className="text-[10px] font-mono text-white/30 mt-1">{log.userEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-[9px] font-mono tracking-widest text-white/20 uppercase px-3 py-1 bg-white/5 rounded-lg">
                      {log.contentType}
                    </span>
                    <span className="text-[10px] font-mono text-white/20">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="glass-card p-12 text-center border-dashed border-white/10">
                  <p className="text-white/20 font-mono text-xs uppercase tracking-widest">Nenhum log registrado.</p>
                </div>
              )}
            </div>
          )}

          {/* Agents Tab */}
          {tab === 'agents' && (
            <div className="max-w-2xl flex flex-col gap-6">
              {/* Vercel persistence banner */}
              {agentsMeta._vercelConfigured ? (
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-neon-cyan/5 border border-neon-cyan/15">
                  <Zap className="w-3.5 h-3.5 text-neon-cyan flex-shrink-0" />
                  <p className="text-[10px] font-mono text-neon-cyan/70">
                    Vercel API configurada — os IDs serão persistidos automaticamente como env vars ao salvar.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono text-amber-400/80">
                      Sem Vercel API — IDs salvos aqui ficam apenas em memória e são perdidos ao reiniciar.
                    </p>
                    <p className="text-[9px] font-mono text-white/20">
                      Adicione <span className="text-white/40">VERCEL_TOKEN</span> e <span className="text-white/40">VERCEL_PROJECT_ID</span> nas env vars para persistência automática.
                    </p>
                  </div>
                </div>
              )}

              <div className="glass-card p-10 flex flex-col gap-8 border-white/5">
                <p className="text-xs text-white/40 font-light leading-relaxed">
                  Configure os IDs dos agentes Tess IA para cada tipo de conteúdo. Os IDs são obtidos no painel da Tess IA ao criar ou editar um agente.
                </p>

                {[
                  { key: 'ebook' as const, label: 'E-BOOK / PDF', env: 'TESS_AGENT_EBOOK' },
                  { key: 'lesson_plan' as const, label: 'PLANO DE AULA', env: 'TESS_AGENT_PLANO' },
                  { key: 'slides' as const, label: 'SLIDES / APRESENTAÇÃO', env: 'TESS_AGENT_SLIDES' },
                  { key: 'images' as const, label: 'IMAGENS / ARTES', env: 'TESS_AGENT_IMAGENS' },
                ].map(({ key, label, env }) => {
                  const fromEnv = agentsMeta._envStatus?.[key];
                  const isSet = !!agents[key];
                  const statusColor = fromEnv ? 'bg-emerald-400' : isSet ? 'bg-amber-400' : 'bg-red-500/60';
                  const statusLabel = fromEnv ? 'ENV VAR' : isSet ? 'MEMÓRIA' : 'NÃO CONFIG.';
                  const statusText = fromEnv ? 'text-emerald-400' : isSet ? 'text-amber-400' : 'text-red-400/60';

                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                          <label className="text-[10px] font-mono tracking-[0.4em] text-white/30 uppercase">{label}</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-mono tracking-widest ${statusText}`}>{statusLabel}</span>
                          <span className="text-[9px] font-mono text-white/15">{env}</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder={`ID do agente para ${label.toLowerCase()}...`}
                        value={agents[key]}
                        onChange={e => setAgents(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm font-mono placeholder:text-white/10 focus:outline-none focus:border-neon-cyan/40 transition-all"
                      />
                    </div>
                  );
                })}

                <button
                  onClick={handleSaveAgents}
                  className={`flex items-center justify-center gap-3 w-full py-5 rounded-2xl font-bold tracking-widest uppercase text-xs transition-all duration-300 ${
                    agentsSaved !== 'idle'
                      ? 'bg-emerald-400 text-obsidian'
                      : 'bg-neon-cyan text-obsidian hover:scale-[1.01]'
                  }`}
                >
                  {agentsSaved === 'vercel' ? (
                    <><Zap className="w-4 h-4" />SALVO NA VERCEL</>
                  ) : agentsSaved === 'saved' ? (
                    <><Check className="w-4 h-4" />SALVO EM MEMÓRIA</>
                  ) : (
                    <><Save className="w-4 h-4" />SALVAR CONFIGURAÇÕES</>
                  )}
                </button>

                {agentsMeta.vercelError && (
                  <p className="text-[10px] font-mono text-red-400/70 text-center">
                    Vercel API: {agentsMeta.vercelError}
                  </p>
                )}
              </div>

              {/* Manual fallback instructions */}
              {!agentsMeta._vercelConfigured && (
                <div className="glass-card p-8 flex flex-col gap-5 border-white/5 border-dashed">
                  <p className="text-[10px] font-mono tracking-[0.3em] text-white/20 uppercase">Como configurar via CLI (persistente)</p>
                  {[
                    { env: 'TESS_AGENT_EBOOK', val: agents.ebook || '<ID_DO_AGENTE>' },
                    { env: 'TESS_AGENT_PLANO', val: agents.lesson_plan || '<ID_DO_AGENTE>' },
                    { env: 'TESS_AGENT_SLIDES', val: agents.slides || '<ID_DO_AGENTE>' },
                    { env: 'TESS_AGENT_IMAGENS', val: agents.images || '<ID_DO_AGENTE>' },
                  ].map(({ env, val }) => {
                    const cmd = `npx vercel env add ${env}`;
                    return (
                      <div key={env} className="flex items-center gap-3">
                        <code className="flex-1 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-[10px] font-mono text-white/30 truncate">
                          {cmd}
                        </code>
                        <button
                          onClick={() => copyToClipboard(cmd, env)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all flex-shrink-0"
                          title="Copiar comando"
                        >
                          {copiedCmd === env
                            ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                            : <Copy className="w-3.5 h-3.5 text-white/30" />
                          }
                        </button>
                      </div>
                    );
                  })}
                  <p className="text-[9px] font-mono text-white/15 leading-relaxed">
                    Após executar cada comando, faça um novo deploy: <span className="text-white/25">npx vercel --prod</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
