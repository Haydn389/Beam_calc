import { useTheme } from './hooks/useTheme';
import InputPanel   from './components/InputPanel';
import BeamCanvas   from './components/BeamCanvas';
import DiagramPanel from './components/DiagramPanel';
import './index.css';

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className="flex h-screen w-screen overflow-hidden relative"
      style={{
        background: theme === 'light'
          ? 'linear-gradient(135deg, #EEF2FF 0%, #F0F9FF 30%, #F5F3FF 60%, #EFF6FF 100%)'
          : 'linear-gradient(135deg, #080E1A 0%, #0D1526 30%, #0A1020 60%, #080E1A 100%)',
      }}
    >
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-[9999] w-11 h-11 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
        style={{
          background: theme === 'light'
            ? 'rgba(255,255,255,0.55)'
            : 'rgba(30,41,59,0.60)',
          border: `1px solid ${theme === 'light' ? 'rgba(99,102,241,0.25)' : 'rgba(148,163,184,0.18)'}`,
          boxShadow: theme === 'light'
            ? '0 2px 16px rgba(99,102,241,0.18), 0 1px 4px rgba(0,0,0,0.07)'
            : '0 2px 16px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: theme === 'light' ? '#4F46E5' : '#C7D2FE',
        }}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          /* Moon icon — switch to dark */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
          </svg>
        ) : (
          /* Sun icon — switch to light */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1"  x2="12" y2="3"  />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"  />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1"  y1="12" x2="3"  y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
          </svg>
        )}
      </button>

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
