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
          : 'linear-gradient(135deg, #0F172A 0%, #1E293B 30%, #1A1F35 60%, #0F1729 100%)',
      }}
    >
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-50 p-2 rounded-lg transition-all duration-200"
        style={{
          background: theme === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(30, 41, 59, 0.7)',
          border: `1px solid ${theme === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(71, 85, 105, 0.7)'}`,
          backdropFilter: 'blur(20px)',
        }}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l-2.12-2.12a1 1 0 00-1.414 0l-.828.828a1 1 0 00-1.414-1.414l.828-.828a1 1 0 000-1.414l-2.12-2.121a1 1 0 00-1.414 1.414l2.12 2.12a1 1 0 000 1.415l.828.828a1 1 0 001.414 0l2.12-2.12a1 1 0 001.414-1.415z" clipRule="evenodd" />
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
