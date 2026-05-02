import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBeamStore } from '../store';
import MaterialPropertyPanel, { type MaterialSelection } from './MaterialPropertyPanel';

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionType = 'rectangle' | 'h-section' | 'circle' | 'pipe' | 'box';

const SEC_LABELS: Record<SectionType, string> = {
  'rectangle': 'Rectangle',
  'h-section': 'H-Section',
  'circle':    'Solid Circle',
  'pipe':      'Pipe',
  'box':       'Box',
};

// ── Section dimension defaults (mm) ──────────────────────────────────────────

const DEFAULT_DIMS: Record<SectionType, Record<string, number>> = {
  'rectangle': { b: 200,  h: 400               },
  'h-section': { H: 400,  B: 200, tw: 9, tf: 16 },
  'circle':    { D: 300                         },
  'pipe':      { D: 300,  t: 12                 },
  'box':       { B: 250,  H: 250, t: 12         },
};

type DimDef = { key: string; label: string };

const DIM_DEFS: Record<SectionType, DimDef[]> = {
  'rectangle': [
    { key: 'b',  label: 'b  \u2014  Width (mm)'          },
    { key: 'h',  label: 'h  \u2014  Height (mm)'         },
  ],
  'h-section': [
    { key: 'H',  label: 'H  \u2014  Total Height (mm)'   },
    { key: 'B',  label: 'B  \u2014  Flange Width (mm)'   },
    { key: 'tw', label: 'tw \u2014  Web Thick. (mm)'      },
    { key: 'tf', label: 'tf \u2014  Flange Thick. (mm)'   },
  ],
  'circle':    [
    { key: 'D',  label: 'D  \u2014  Diameter (mm)'       },
  ],
  'pipe':      [
    { key: 'D',  label: 'D  \u2014  Outer Dia. (mm)'     },
    { key: 't',  label: 't  \u2014  Wall Thickness (mm)'  },
  ],
  'box':       [
    { key: 'B',  label: 'B  \u2014  Width (mm)'          },
    { key: 'H',  label: 'H  \u2014  Height (mm)'         },
    { key: 't',  label: 't  \u2014  Wall Thickness (mm)'  },
  ],
};

// ── I_z calculation ────────────────────────────────────────────────────────────

function calcI(type: SectionType, d: Record<string, number>): number {
  switch (type) {
    case 'rectangle':
      return (d.b * Math.pow(d.h, 3)) / 12;
    case 'h-section': {
      const hw = d.H - 2 * d.tf;
      if (hw <= 0) return (d.B * Math.pow(d.H, 3)) / 12;
      return (d.B * Math.pow(d.H, 3) - (d.B - d.tw) * Math.pow(hw, 3)) / 12;
    }
    case 'circle':
      return (Math.PI * Math.pow(d.D, 4)) / 64;
    case 'pipe': {
      const di = Math.max(d.D - 2 * d.t, 0);
      return (Math.PI * (Math.pow(d.D, 4) - Math.pow(di, 4))) / 64;
    }
    case 'box': {
      const bi = Math.max(d.B - 2 * d.t, 0);
      const hi = Math.max(d.H - 2 * d.t, 0);
      return (d.B * Math.pow(d.H, 3) - bi * Math.pow(hi, 3)) / 12;
    }
  }
}

function fmtI(val: number): string {
  if (val >= 1e9) return `${(val / 1e9).toFixed(3)} \u00d7 10\u2079 mm\u2074`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(3)} \u00d7 10\u2076 mm\u2074`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(3)} \u00d7 10\u00b3 mm\u2074`;
  return `${val.toFixed(1)} mm\u2074`;
}

// ── SVG Section Preview ───────────────────────────────────────────────────────

function SectionPreview({ type, dims, size = 160 }: { type: SectionType; dims: Record<string, number>; size?: number }) {
  const pad  = size * 0.10;
  const avW  = size - pad * 2;
  const avH  = size - pad * 2;
  const cx   = size / 2;
  const cy   = size / 2;
  const fill   = 'rgba(99,102,241,0.14)';
  const stroke = '#6366F1';
  const sw     = 2;
  let shape: React.ReactNode = null;

  if (type === 'rectangle') {
    const sc = Math.min(avW / dims.b, avH / dims.h);
    const bw = dims.b * sc, bh = dims.h * sc;
    shape = <rect x={cx - bw/2} y={cy - bh/2} width={bw} height={bh} fill={fill} stroke={stroke} strokeWidth={sw} rx={1} />;
  } else if (type === 'h-section') {
    const sc = Math.min(avW / dims.B, avH / dims.H);
    const sH = dims.H * sc, sB = dims.B * sc;
    const stw = Math.max(dims.tw * sc, 3), stf = Math.max(dims.tf * sc, 3);
    const x0 = cx - sB/2, y0 = cy - sH/2, flW = (sB - stw)/2, hw = sH - 2*stf;
    const d = [`M${x0},${y0}`,`h${sB}`,`v${stf}`,`h${-flW}`,`v${hw}`,`h${flW}`,`v${stf}`,`h${-sB}`,`v${-stf}`,`h${flW}`,`v${-hw}`,`h${-flW}`,'Z'].join(' ');
    shape = <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} />;
  } else if (type === 'circle') {
    const r = Math.min(avW, avH) / 2;
    shape = <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />;
  } else if (type === 'pipe') {
    const ro = Math.min(avW, avH) / 2;
    const ri = Math.max(ro * (1 - (2*dims.t)/dims.D), 4);
    shape = <g><circle cx={cx} cy={cy} r={ro} fill={fill} stroke={stroke} strokeWidth={sw} /><circle cx={cx} cy={cy} r={ri} fill="rgba(255,255,255,0.88)" stroke={stroke} strokeWidth={sw*0.7} strokeDasharray="5 3" /></g>;
  } else if (type === 'box') {
    const sc = Math.min(avW/dims.B, avH/dims.H);
    const sB = dims.B*sc, sH = dims.H*sc, st = Math.max(dims.t*sc, 3);
    shape = <g><rect x={cx-sB/2} y={cy-sH/2} width={sB} height={sH} fill={fill} stroke={stroke} strokeWidth={sw} rx={1} /><rect x={cx-sB/2+st} y={cy-sH/2+st} width={sB-2*st} height={sH-2*st} fill="rgba(255,255,255,0.88)" stroke={stroke} strokeWidth={sw*0.7} strokeDasharray="5 3" /></g>;
  }
  return (
    <svg width={size} height={size}>
      <line x1={pad} y1={cy} x2={size-pad} y2={cy} stroke="#CBD5E1" strokeWidth={0.8} strokeDasharray="3 2" />
      <line x1={cx} y1={pad} x2={cx} y2={size-pad} stroke="#CBD5E1" strokeWidth={0.8} strokeDasharray="3 2" />
      {shape}
      <text x={size-pad-1} y={cy-4} fontSize={9} fill="#94A3B8" textAnchor="end" fontFamily="monospace">Z</text>
      <text x={cx+4} y={pad+9} fontSize={9} fill="#94A3B8" fontFamily="monospace">Y</text>
    </svg>
  );
}

function MiniPreview({ type, dims }: { type: SectionType; dims: Record<string, number> }) {
  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
         style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle2)' }}>
      <SectionPreview type={type} dims={dims} size={36} />
    </div>
  );
}

function DimBadges({ type, dims }: { type: SectionType; dims: Record<string, number> }) {
  const items: string[] = [];
  if (type === 'rectangle')      items.push(`${dims.b} \u00d7 ${dims.h} mm`);
  else if (type === 'h-section') items.push(`H${dims.H}`,`B${dims.B}`,`tw${dims.tw}`,`tf${dims.tf}`);
  else if (type === 'circle')    items.push(`\u00f8${dims.D} mm`);
  else if (type === 'pipe')      items.push(`\u00f8${dims.D}`,`t${dims.t}`);
  else if (type === 'box')       items.push(`${dims.B}\u00d7${dims.H}`,`t${dims.t}`);
  return (
    <div className="flex flex-wrap justify-center gap-1 mt-2">
      {items.map(it => (
        <span key={it} className="font-mono text-[9px] px-1.5 py-0.5 rounded-md"
              style={{ background: 'var(--bg-subtle)', color: 'var(--accent-indigo)', border: '1px solid var(--border-subtle2)' }}>{it}</span>
      ))}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function SectionModal({ secType, dims, computedI, matSel, onClose, onSecChange, onDim, onMatChange }: {
  secType: SectionType; dims: Record<string, number>; computedI: number;
  matSel: MaterialSelection;
  onClose: () => void; onSecChange: (t: SectionType) => void;
  onDim: (k: string, v: number) => void; onMatChange: (s: MaterialSelection) => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const defs = DIM_DEFS[secType];
  const two  = defs.length > 2;
  const inp  = 'field font-mono text-sm';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,8,18,0.65)', backdropFilter: 'blur(8px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[820px] rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'var(--bg-card)',
          backdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid var(--border)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 8px 32px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-[0_4px_12px_rgba(139,92,246,0.35)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Section &amp; Material Properties</p>
              <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>단면 재원 &amp; 재료 특성 / Cross-Section &amp; Material</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--divider)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-red)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--divider)'; }}
          >&times;</button>
        </div>

        {/* Body — 3 column layout */}
        <div className="flex min-h-0" style={{ maxHeight: '76vh' }}>

          {/* Col 1: Section Preview */}
          <div className="w-48 flex-shrink-0 flex flex-col items-center px-4 pt-5 pb-4 overflow-y-auto" style={{ background: 'var(--bg-subtle)', borderRight: '1px solid var(--divider)' }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-3 self-start" style={{ color: 'var(--text-muted)' }}>Section</p>
            <div className="rounded-2xl p-1 shadow-sm" style={{ border: '1px solid var(--border-subtle2)', background: 'var(--bg-input)' }}>
              <SectionPreview type={secType} dims={dims} size={148} />
            </div>
            <DimBadges type={secType} dims={dims} />
            <div className="mt-4 w-full rounded-xl p-3 text-center" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle2)' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-indigo)' }}>I&#x2093; (mm&#x2074;)</p>
              <p className="font-mono text-sm font-bold mt-1 leading-snug" style={{ color: 'var(--accent-indigo)' }}>{fmtI(computedI)}</p>
            </div>
            <div className="mt-2 w-full rounded-xl p-2.5 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>E (MPa)</p>
              <p className="font-mono text-sm font-bold mt-0.5" style={{ color: 'var(--text-secondary)' }}>{matSel.props.E.toLocaleString()}</p>
            </div>
          </div>

          {/* Col 2: Section Shape + Dims */}
          <div className="w-56 flex-shrink-0 px-5 pt-5 pb-5 overflow-y-auto" style={{ borderRight: '1px solid var(--divider)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Section Shape</p>
            <select className={inp + ' cursor-pointer mb-4 appearance-none'} value={secType} onChange={e => onSecChange(e.target.value as SectionType)}>
              <option value="rectangle">Rectangle</option>
              <option value="h-section">H-Section (I-Beam)</option>
              <option value="circle">Solid Circle</option>
              <option value="pipe">Pipe (Hollow Circle)</option>
              <option value="box">Box Section (Hollow Rect.)</option>
            </select>
            <div className="h-px mb-4" style={{ background: 'var(--divider)' }} />
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>Dimensions</p>
            <div className={`grid gap-3 ${two ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {defs.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <input type="number" min={0.1} step="any" className={inp} value={dims[key] ?? 1} onChange={e => onDim(key, parseFloat(e.target.value) || 0.1)} />
                </div>
              ))}
            </div>
          </div>

          {/* Col 3: Material (cascading) */}
          <div className="flex-1 px-5 pt-5 pb-5 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Material Data</p>
            <MaterialPropertyPanel
              onChange={onMatChange}
              initialMatType={matSel.matType}
              initialStandard={matSel.standard}
              initialGrade={matSel.grade}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4" style={{ borderTop: '1px solid var(--divider)', background: 'var(--bg-subtle)' }}>
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Sidebar compact card ──────────────────────────────────────────────────────

const DEFAULT_MAT_SEL: MaterialSelection = {
  matType:  'steel',
  standard: 'KS (KS22)',
  grade:    'SS275',
  props:    { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
};

export default function SectionInput() {
  const { setE, setI } = useBeamStore();

  const [open,    setOpen]    = useState(false);
  const [secType, setSecType] = useState<SectionType>('h-section');
  const [dims,    setDims]    = useState<Record<string, number>>({ ...DEFAULT_DIMS['h-section'] });
  const [matSel,  setMatSel]  = useState<MaterialSelection>(DEFAULT_MAT_SEL);

  const computedI = useMemo(() => calcI(secType, dims), [secType, dims]);

  useEffect(() => { setI(computedI); }, [computedI, setI]);
  useEffect(() => { setE(matSel.props.E); }, [matSel.props.E, setE]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setE(DEFAULT_MAT_SEL.props.E); }, []);

  const handleSecChange = useCallback((t: SectionType) => {
    setSecType(t);
    setDims({ ...DEFAULT_DIMS[t] });
  }, []);
  const handleDim = useCallback((key: string, val: number) => {
    setDims(prev => ({ ...prev, [key]: Math.max(val, 0.1) }));
  }, []);

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        {/* Info row */}
        <div className="flex items-center gap-3 px-3 pt-3 pb-2.5">
          <MiniPreview type={secType} dims={dims} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{SEC_LABELS[secType]}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {matSel.grade} &nbsp;&middot;&nbsp; E = {matSel.props.E.toLocaleString()} MPa
            </p>
          </div>
        </div>
        {/* I strip */}
        <div className="flex items-center justify-between px-3 py-2" style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-subtle2)', borderBottom: '1px solid var(--border-subtle2)' }}>
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-indigo)' }}>I&#x2093;</span>
          <span className="font-mono text-xs font-bold" style={{ color: 'var(--accent-indigo)' }}>{fmtI(computedI)}</span>
        </div>
        {/* Edit button */}
        <button onClick={() => setOpen(true)} className="w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-200"
                style={{ color: 'var(--accent-indigo)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
          Edit Section...
        </button>
      </div>

      {open && (
        <SectionModal
          secType={secType} dims={dims} computedI={computedI} matSel={matSel}
          onClose={() => setOpen(false)} onSecChange={handleSecChange}
          onDim={handleDim} onMatChange={setMatSel}
        />
      )}
    </>
  );
}