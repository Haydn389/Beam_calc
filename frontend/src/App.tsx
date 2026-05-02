import InputPanel   from './components/InputPanel';
import BeamCanvas   from './components/BeamCanvas';
import DiagramPanel from './components/DiagramPanel';
import './index.css';

export default function App() {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F0F9FF 30%, #F5F3FF 60%, #EFF6FF 100%)',
      }}
    >
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
