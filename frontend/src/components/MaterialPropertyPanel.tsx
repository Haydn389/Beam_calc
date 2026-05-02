import { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// DATA LAYER — 기준별 강종/강도 DB + 물성치
// ═══════════════════════════════════════════════════════════════════════════════

type MatType = 'steel' | 'concrete';
type StandardKey = string;
type GradeKey    = string;

interface MatProps {
  E:       number;   // 탄성계수 MPa
  nu:      number;   // 포아송비
  rho:     number;   // 단위중량 kN/m³
  alpha:   number;   // 열팽창계수 1/°C  ×10⁻⁵
}

// ── Grade DB ──────────────────────────────────────────────────────────────────

const GRADE_DB: Record<MatType, Record<StandardKey, Record<GradeKey, MatProps>>> = {
  steel: {
    'KS (KS22)': {
      SS235:   { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
      SS275:   { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
      SS315:   { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
      SS410:   { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
      SS450:   { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
      SM275:   { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
      SM355:   { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
      SM420:   { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
      SM460:   { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
      SHN275:  { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
      SHN355:  { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
      SHN420:  { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
      HSM500:  { E: 205000, nu: 0.30, rho: 76.98, alpha: 1.20 },
    },
    'ASTM (AISC)': {
      'A36':        { E: 200000, nu: 0.30, rho: 77.01, alpha: 1.17 },
      'A572 Gr.42': { E: 200000, nu: 0.30, rho: 77.01, alpha: 1.17 },
      'A572 Gr.50': { E: 200000, nu: 0.30, rho: 77.01, alpha: 1.17 },
      'A572 Gr.60': { E: 200000, nu: 0.30, rho: 77.01, alpha: 1.17 },
      'A572 Gr.65': { E: 200000, nu: 0.30, rho: 77.01, alpha: 1.17 },
      'A992':       { E: 200000, nu: 0.30, rho: 77.01, alpha: 1.17 },
      'A500 Gr.B':  { E: 200000, nu: 0.30, rho: 77.01, alpha: 1.17 },
      'A500 Gr.C':  { E: 200000, nu: 0.30, rho: 77.01, alpha: 1.17 },
    },
    'EN (Eurocode 3)': {
      'S235': { E: 210000, nu: 0.30, rho: 78.50, alpha: 1.20 },
      'S275': { E: 210000, nu: 0.30, rho: 78.50, alpha: 1.20 },
      'S355': { E: 210000, nu: 0.30, rho: 78.50, alpha: 1.20 },
      'S420': { E: 210000, nu: 0.30, rho: 78.50, alpha: 1.20 },
      'S460': { E: 210000, nu: 0.30, rho: 78.50, alpha: 1.20 },
      'S690': { E: 210000, nu: 0.30, rho: 78.50, alpha: 1.20 },
    },
  },
  concrete: {
    'KS (KDS)': {
      C21: { E: 21000, nu: 0.167, rho: 23.54, alpha: 1.00 },
      C24: { E: 23000, nu: 0.167, rho: 23.54, alpha: 1.00 },
      C27: { E: 26000, nu: 0.167, rho: 23.54, alpha: 1.00 },
      C30: { E: 27000, nu: 0.167, rho: 23.54, alpha: 1.00 },
      C35: { E: 29000, nu: 0.167, rho: 23.54, alpha: 1.00 },
      C40: { E: 31000, nu: 0.167, rho: 23.54, alpha: 1.00 },
      C50: { E: 35000, nu: 0.167, rho: 23.54, alpha: 1.00 },
      C60: { E: 38000, nu: 0.167, rho: 23.54, alpha: 1.00 },
    },
    'ASTM (ACI)': {
      '3000 psi (21 MPa)': { E: 21500, nu: 0.18, rho: 23.54, alpha: 0.99 },
      '4000 psi (28 MPa)': { E: 24800, nu: 0.18, rho: 23.54, alpha: 0.99 },
      '5000 psi (34 MPa)': { E: 27700, nu: 0.18, rho: 23.54, alpha: 0.99 },
      '6000 psi (41 MPa)': { E: 30300, nu: 0.18, rho: 23.54, alpha: 0.99 },
      '8000 psi (55 MPa)': { E: 35000, nu: 0.18, rho: 23.54, alpha: 0.99 },
    },
    'EN (Eurocode 2)': {
      C16: { E: 29000, nu: 0.20, rho: 25.00, alpha: 1.00 },
      C20: { E: 30000, nu: 0.20, rho: 25.00, alpha: 1.00 },
      C25: { E: 31000, nu: 0.20, rho: 25.00, alpha: 1.00 },
      C30: { E: 33000, nu: 0.20, rho: 25.00, alpha: 1.00 },
      C35: { E: 34000, nu: 0.20, rho: 25.00, alpha: 1.00 },
      C40: { E: 35000, nu: 0.20, rho: 25.00, alpha: 1.00 },
      C45: { E: 36000, nu: 0.20, rho: 25.00, alpha: 1.00 },
      C50: { E: 37000, nu: 0.20, rho: 25.00, alpha: 1.00 },
    },
  },
};

const STANDARDS: Record<MatType, StandardKey[]> = {
  steel:    ['KS (KS22)', 'ASTM (AISC)', 'EN (Eurocode 3)'],
  concrete: ['KS (KDS)',  'ASTM (ACI)',  'EN (Eurocode 2)'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function fmtNum(v: number, dec = 0) {
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ── Material thumbnail SVG ────────────────────────────────────────────────────

function MatThumb({ type }: { type: MatType }) {
  if (type === 'steel') return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      {/* H-beam 3D-ish */}
      <defs>
        <linearGradient id="sg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c7d2fe" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id="sg2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      {/* top flange */}
      <rect x="8"  y="12" width="56" height="10" rx="1" fill="url(#sg1)" />
      {/* web */}
      <rect x="30" y="22" width="12" height="24" fill="url(#sg2)" />
      {/* bottom flange */}
      <rect x="8"  y="46" width="56" height="10" rx="1" fill="url(#sg1)" />
      {/* right side shading */}
      <polygon points="64,12 72,6 72,40 64,46" fill="rgba(99,102,241,0.25)" />
      <polygon points="64,46 72,40 72,52 64,56" fill="rgba(99,102,241,0.20)" />
    </svg>
  );
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      {/* Concrete block */}
      <defs>
        <linearGradient id="cg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="cg2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      {/* front face */}
      <rect x="8" y="18" width="48" height="36" rx="2" fill="url(#cg1)" />
      {/* top face */}
      <polygon points="8,18 56,18 64,10 16,10" fill="url(#cg2)" />
      {/* right face */}
      <polygon points="56,18 64,10 64,46 56,54" fill="rgba(100,116,139,0.45)" />
      {/* rebar dots */}
      {[[20,32],[32,32],[44,32],[20,44],[32,44],[44,44]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r={2.5} fill="rgba(99,102,241,0.60)" />
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface MaterialSelection {
  matType:  MatType;
  standard: StandardKey;
  grade:    GradeKey;
  props:    MatProps;
}

interface Props {
  onChange: (sel: MaterialSelection) => void;
  initialMatType?:  MatType;
  initialStandard?: StandardKey;
  initialGrade?:    GradeKey;
}

const selCls =
  'field w-full appearance-none cursor-pointer font-medium';

const labelCls = 'block text-[10px] font-bold uppercase tracking-widest mb-1.5 text-[var(--text-muted)]';

export default function MaterialPropertyPanel({
  onChange,
  initialMatType  = 'steel',
  initialStandard = 'KS (KS22)',
  initialGrade    = 'SS275',
}: Props) {
  const [matType,  setMatType]  = useState<MatType>(initialMatType);
  const [standard, setStandard] = useState<StandardKey>(initialStandard);
  const [grade,    setGrade]    = useState<GradeKey>(initialGrade);

  const standards = STANDARDS[matType];
  const grades    = Object.keys(GRADE_DB[matType][standard] ?? {});
  const props     = GRADE_DB[matType]?.[standard]?.[grade] ?? null;

  // Cascade resets
  const handleMatType = (m: MatType) => {
    setMatType(m);
    const newStd   = STANDARDS[m][0];
    const newGrade = Object.keys(GRADE_DB[m][newStd])[0];
    setStandard(newStd);
    setGrade(newGrade);
  };

  const handleStandard = (s: StandardKey) => {
    setStandard(s);
    const newGrade = Object.keys(GRADE_DB[matType][s])[0];
    setGrade(newGrade);
  };

  // Notify parent
  useEffect(() => {
    if (props) onChange({ matType, standard, grade, props });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matType, standard, grade]);

  return (
    <div className="flex gap-4 min-h-0">

      {/* ── Left: Form ─────────────────────────────────────────────────────── */}
      <div className="flex-1 space-y-4 min-w-0">

        {/* Depth 1 — Material Type */}
        <div>
          <p className={labelCls}>Material Type</p>
          <div className="grid grid-cols-2 gap-2">
            {(['steel', 'concrete'] as MatType[]).map(m => (
              <button key={m} onClick={() => handleMatType(m)}
                style={matType === m ? {
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--accent-indigo)',
                  color: 'var(--accent-indigo)',
                } : {
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-input)',
                  color: 'var(--text-secondary)',
                }}
                className="py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-[1.02]"
              >
                {m === 'steel' ? 'Steel' : 'Concrete'}
              </button>
            ))}
          </div>
        </div>

        {/* Depth 2 — Standard */}
        <div>
          <p className={labelCls}>Standard</p>
          <div className="relative">
            <select className={selCls} value={standard} onChange={e => handleStandard(e.target.value)}>
              {standards.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>
        </div>

        {/* Depth 3 — Grade / DB */}
        <div>
          <p className={labelCls}>Grade / DB</p>
          <div className="relative">
            <select className={selCls} value={grade} onChange={e => setGrade(e.target.value)}>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* ── Right: Visual + Properties ────────────────────────────────────── */}
      <div className="w-44 flex-shrink-0 flex flex-col gap-3">

        {/* Thumbnail card */}
        <div
          className="rounded-2xl flex items-center justify-center py-3"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <MatThumb type={matType} />
        </div>

        {/* Properties card */}
        {props ? (
          <div
            className="rounded-2xl px-3.5 py-3 flex-1 space-y-2"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-card)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              Properties
            </p>
            {[
              { label: 'E (MPa)',      value: fmtNum(props.E) },
              { label: '\u03bd',       value: props.nu.toString() },
              { label: '\u03b3 (kN/m\u00b3)', value: fmtNum(props.rho, 2) },
              { label: '\u03b1 (\u00d710\u207b\u2075/\u00b0C)', value: props.alpha.toFixed(2) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg"
                      style={{ color: 'var(--text-primary)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle2)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl flex items-center justify-center py-6 text-[10px]"
               style={{ border: '1px dashed var(--divider)', color: 'var(--text-muted)' }}>
            Select grade
          </div>
        )}
      </div>
    </div>
  );
}