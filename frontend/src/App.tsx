import { useState, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import InputPanel   from './components/InputPanel';
import BeamCanvas   from './components/BeamCanvas';
import DiagramPanel from './components/DiagramPanel';
import './index.css';

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile(640);
  const [mobileTab, setMobileTab] = useState<'input' | 'results'>('input');

  const ThemeButton = (
    <button
      onClick={toggleTheme}
      className="w-11 h-11 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center flex-shrink-0"
      style={{
        background: theme === 'light' ? 'rgba(255,255,255,0.55)' : 'rgba(30,41,59,0.60)',
        border: `1px solid ${theme === 'light' ? 'rgba(99,102,241,0.25)' : 'rgba(148,163,184,0.18)'}`,
        boxShadow: theme === 'light'
          ? '0 2px 16px rgba(99,102,241,0.18)'
          : '0 2px 16px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        color: theme === 'light' ? '#4F46E5' : '#C7D2FE',
      }}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );

  const bgStyle = {
    background: theme === 'light'
      ? 'linear-gradient(135deg, #EEF2FF 0%, #F0F9FF 30%, #F5F3FF 60%, #EFF6FF 100%)'
      : 'linear-gradient(135deg, #080E1A 0%, #0D1526 30%, #0A1020 60%, #080E1A 100%)',
  };

  /* ── MOBILE ─────────────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div className="flex flex-col w-screen h-screen overflow-hidden" style={bgStyle}>

        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            background: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border-panel)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500
                            flex items-center justify-center shadow-[0_4px_12px_rgba(99,102,241,0.35)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                   strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <line x1="5" y1="6"  x2="5"  y2="18" />
                <line x1="19" y1="6" x2="19" y2="18" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Beam Calculator
            </span>
          </div>
          {ThemeButton}
        </div>

        {/* Tab switcher */}
        <div
          className="flex mx-4 mt-3 mb-2 rounded-2xl p-1 gap-1 flex-shrink-0"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle2)' }}
        >
          {(['input', 'results'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200"
              style={{
                background: mobileTab === tab ? 'var(--bg-card)' : 'transparent',
                color: mobileTab === tab ? 'var(--accent-indigo)' : 'var(--text-muted)',
                boxShadow: mobileTab === tab ? 'var(--shadow-card)' : 'none',
              }}
            >
              {tab === 'input' ? '⚙️ Input' : '📊 Results'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {mobileTab === 'input' ? (
            <div className="h-full overflow-y-auto">
              <InputPanel mobile />
            </div>
          ) : (
            <div className="h-full overflow-y-auto flex flex-col gap-3 px-4 pb-4">
              <BeamCanvas svgWidth={Math.max(window.innerWidth - 32, 300)} />
              <DiagramPanel />
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── DESKTOP ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen w-screen overflow-hidden relative" style={bgStyle}>
      <div className="absolute top-4 right-4 z-[9999]">{ThemeButton}</div>
      <InputPanel />
      <main className="flex flex-col flex-1 min-w-0 h-full overflow-hidden p-4 gap-4">
        <BeamCanvas svgWidth={900} />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <DiagramPanel />
        </div>
      </main>
    </div>
  );
}
