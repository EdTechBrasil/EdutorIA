import React, { useState, useEffect, createContext, useContext } from 'react';
import { User } from './types';
import { api } from './api';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Wizard } from './components/Wizard';
import { ProjectEditor } from './components/ProjectEditor';
import { LogIn, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>({
    uid: 'demo-user-123',
    email: 'demo@edutoria.ia',
    displayName: 'Eduardo IA',
    photoURL: 'https://ui-avatars.com/api/?name=Eduardo+IA',
    role: 'user',
    credits: 10
  });
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'dashboard' | 'wizard' | 'editor'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('App forced to logged-in state for visualization');
  }, []);

  const login = async () => {
    // Already logged in
  };

  const logout = async () => {
    try {
      await api.logout();
      setUser(null);
      setView('dashboard');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen cosmic-bg flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
          </div>
          <div className="absolute inset-0 bg-neon-cyan/10 rounded-full blur-2xl animate-pulse" />
          <p className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[10px] font-mono tracking-[0.5em] text-white/30 uppercase whitespace-nowrap">
            Sincronizando Rede Neural...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen cosmic-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-neon-purple/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[10%] w-[30%] h-[30%] bg-neon-cyan/10 rounded-full blur-[100px] animate-pulse-slow" />
        
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md w-full glass-card p-12 text-center relative z-10"
        >
          <div className="w-20 h-20 rounded-3xl border border-neon-cyan/30 flex items-center justify-center mx-auto mb-8 relative group">
            <div className="absolute inset-0 bg-neon-cyan/5 rounded-3xl blur-xl group-hover:bg-neon-cyan/10 transition-all duration-500" />
            <span className="text-neon-cyan text-4xl font-bold tracking-tighter relative z-10">E</span>
          </div>
          
          <h1 className="text-5xl font-sans font-bold tracking-tighter text-white mb-4 neon-text-glow">
            EDUTORIA
          </h1>
          
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="h-px w-8 bg-white/10" />
            <p className="text-[10px] font-mono tracking-[0.4em] text-white/40 uppercase">
              Neural Content Engine
            </p>
            <div className="h-px w-8 bg-white/10" />
          </div>

          <p className="text-lg font-serif italic text-white/60 mb-12 leading-relaxed">
            "Sintetizando o futuro da educação através da inteligência neural."
          </p>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-mono tracking-wider uppercase"
            >
              Erro de Acesso: {error}
            </motion.div>
          )}
          
          <button
            onClick={login}
            className="w-full group relative overflow-hidden bg-white text-obsidian px-8 py-5 rounded-2xl font-bold tracking-widest uppercase text-xs transition-all duration-500 hover:tracking-[0.3em] active:scale-95"
          >
            <div className="absolute inset-0 bg-neon-cyan opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
            <div className="flex items-center justify-center gap-3 relative z-10">
              <LogIn className="w-4 h-4" />
              Inicializar Acesso Demo
            </div>
          </button>

          <div className="mt-12 pt-8 border-t border-white/5">
            <p className="text-[9px] font-mono tracking-[0.2em] text-white/20 uppercase">
              Protocolo de Segurança Ativo // V4.2.0
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      <Layout setView={setView} currentView={view}>
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <Dashboard 
              key="dashboard" 
              onNewProject={() => setView('wizard')} 
              onSelectProject={(id) => {
                setSelectedProjectId(id);
                setView('editor');
              }}
            />
          )}
          {view === 'wizard' && (
            <Wizard 
              key="wizard" 
              onCancel={() => setView('dashboard')} 
              onComplete={(id) => {
                setSelectedProjectId(id);
                setView('editor');
              }}
            />
          )}
          {view === 'editor' && selectedProjectId && (
            <ProjectEditor 
              key="editor" 
              projectId={selectedProjectId} 
              onBack={() => setView('dashboard')} 
            />
          )}
        </AnimatePresence>
      </Layout>
    </AuthContext.Provider>
  );
}
