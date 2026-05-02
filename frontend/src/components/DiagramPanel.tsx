import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useBeamStore } from '../store';

// ─── Shared chart style ───────────────────────────────────────────────────────

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.92)',
  border:     '1px solid rgba(226,232,240,0.8)',
  borderRadius: 12,
  fontSize:   11,
  color:      '#0F172A',
  boxShadow:  '0 4px 20px rgba(0,0,0,0.08)',
  backdropFilter: 'blur(12px)',
};

const AXIS_STYLE = { fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' };

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active, payload, label, unit, color,
}: {
  active?:  boolean;
  payload?: { value: number }[];
  label?:   number;
  unit:     string;
  color:    string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <p className="text-slate-400 mb-1 text-[10px]">x = {Number(label).toFixed(3)} m</p>
      <p style={{ color }} className="font-mono font-bold">
        {Number(payload[0].value).toFixed(4)} {unit}
      </p>
    </div>
  );
}

// ─── Single diagram card ──────────────────────────────────────────────────────

function DiagramCard({
  title, dataKey, color, unit, gradientId,
}: {
  title:      string;
  dataKey:    string;
  color:      string;
  unit:       string;
  gradientId: string;
}) {
  const diagram = useBeamStore((s) => s.diagram);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300
                 hover:shadow-[0_16px_48px_rgba(0,0,0,0.07)] hover:-translate-y-0.5"
      style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.70)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
      }}
    >
      {/* Title */}
      <div className="px-4 py-2.5 border-b border-slate-100/80 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {title}
        </span>
      </div>

      {/* Chart */}
      <div className="px-1 py-3">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={diagram} margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#F1F5F9" vertical={false} />
            <ReferenceLine y={0} stroke="#CBD5E1" />

            <XAxis
              dataKey="x"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={AXIS_STYLE}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <YAxis
              tick={AXIS_STYLE}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) =>
                Math.abs(v) >= 1000
                  ? `${(v / 1000).toFixed(1)}k`
                  : v.toFixed(2)
              }
            />
            <Tooltip
              content={<CustomTooltip unit={unit} color={color} />}
              cursor={{ stroke: '#C7D2FE', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar() {
  const result = useBeamStore((s) => s.result);
  if (!result) return null;

  const items = [
    { label: 'V max',   value: result.max_shear.toFixed(3),      unit: 'kN',   color: '#3B82F6'  },
    { label: 'M max',   value: result.max_moment.toFixed(3),     unit: 'kN·m', color: '#8B5CF6'  },
    { label: 'δ max ↑', value: result.max_deflection.toFixed(5), unit: 'm',    color: '#F59E0B'  },
    { label: 'δ max ↓', value: result.min_deflection.toFixed(5), unit: 'm',    color: '#F59E0B'  },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl px-4 py-3 transition-all duration-200
                     hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
          style={{
            background: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.70)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          }}
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            {item.label}
          </p>
          <p className="font-mono text-lg font-bold leading-none" style={{ color: item.color }}>
            {item.value}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{item.unit}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Reactions table ──────────────────────────────────────────────────────────

function ReactionsTable() {
  const result   = useBeamStore((s) => s.result);
  const supports = useBeamStore((s) => s.supports);
  if (!result) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.70)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
      }}
    >
      <div className="px-4 py-2.5 border-b border-slate-100/80">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Support Reactions
        </span>
      </div>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-slate-100/80">
            <th className="text-left px-4 py-2.5 text-slate-400 font-semibold">Support</th>
            <th className="text-right px-4 py-2.5 text-slate-400 font-semibold">Type</th>
            <th className="text-right px-4 py-2.5 font-semibold" style={{color:'#10B981'}}>Fy (kN)</th>
            <th className="text-right px-4 py-2.5 font-semibold" style={{color:'#F59E0B'}}>Mz (kN·m)</th>
          </tr>
        </thead>
        <tbody>
          {supports.map((s) => {
            const r = result.reactions[String(s.x)];
            return (
              <tr key={s.id} className="border-b border-slate-50/80 hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-2.5 text-slate-700">x = {s.x} m</td>
                <td className="px-4 py-2.5 text-right text-slate-400 capitalize">{s.type}</td>
                <td className="px-4 py-2.5 text-right font-semibold" style={{color:'#10B981'}}>
                  {r ? r.Fy.toFixed(4) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold" style={{color:'#F59E0B'}}>
                  {r && Math.abs(r.Mz) > 1e-6 ? r.Mz.toFixed(4) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DiagramPanel() {
  const result = useBeamStore((s) => s.result);

  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4"
             style={{boxShadow:'0 4px 16px rgba(99,102,241,0.12)'}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366F1"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-500">No results yet</p>
        <p className="text-xs text-slate-400 mt-1">
          Set up your beam and click{' '}
          <span className="text-indigo-500 font-semibold">Analyse Beam</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pb-6">
      <SummaryBar />

      <DiagramCard
        title="Shear Force Diagram (SFD)"
        dataKey="V"
        color="#3B82F6"
        unit="kN"
        gradientId="gradV"
      />
      <DiagramCard
        title="Bending Moment Diagram (BMD)"
        dataKey="M"
        color="#8B5CF6"
        unit="kN·m"
        gradientId="gradM"
      />
      <DiagramCard
        title="Deflection Diagram"
        dataKey="delta"
        color="#F59E0B"
        unit="m"
        gradientId="gradD"
      />

      <ReactionsTable />
    </div>
  );
}
