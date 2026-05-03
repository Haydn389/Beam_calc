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
  background: 'var(--bg-card)',
  border:     '1px solid var(--border)',
  borderRadius: 12,
  fontSize:   11,
  color:      'var(--text-primary)',
  boxShadow:  'var(--shadow-card)',
  backdropFilter: 'blur(16px)',
};

const AXIS_STYLE = { fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' };

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
      <p className="mb-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>x = {Number(label).toFixed(3)} m</p>
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
      className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Title */}
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--divider)' }}>
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {title}
        </span>
      </div>

      {/* Chart */}
      <div className="px-1 py-3">
        <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 180 : 160}>
          <AreaChart data={diagram} margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
            <ReferenceLine y={0} stroke="rgba(148,163,184,0.40)" />

            <XAxis
              dataKey="x"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={AXIS_STYLE}
              tickLine={false}
              axisLine={{ stroke: 'var(--divider)' }}
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
              cursor={{ stroke: 'var(--accent-indigo)', strokeWidth: 1, strokeOpacity: 0.4 }}
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
          className="rounded-2xl px-4 py-3 transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            {item.label}
          </p>
          <p className="font-mono text-lg font-bold leading-none" style={{ color: item.color }}>
            {item.value}
          </p>
          <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>{item.unit}</p>
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
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--divider)' }}>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Support Reactions
        </span>
      </div>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--divider)' }}>
            <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--text-muted)' }}>Support</th>
            <th className="text-right px-4 py-2.5 font-semibold" style={{ color: 'var(--text-muted)' }}>Type</th>
            <th className="text-right px-4 py-2.5 font-semibold" style={{color:'var(--accent-green)'}}>Fy (kN)</th>
            <th className="text-right px-4 py-2.5 font-semibold" style={{color:'var(--accent-amber)'}}>Mz (kN·m)</th>
          </tr>
        </thead>
        <tbody>
          {supports.map((s) => {
            const r = result.reactions[String(s.x)];
            return (
              <tr key={s.id} className="transition-colors hover:bg-[var(--bg-subtle)]"
                  style={{ borderBottom: '1px solid var(--divider)' }}>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>x = {s.x} m</td>
                <td className="px-4 py-2.5 text-right capitalize" style={{ color: 'var(--text-muted)' }}>{s.type}</td>
                <td className="px-4 py-2.5 text-right font-semibold" style={{color:'var(--accent-green)'}}>
                  {r ? r.Fy.toFixed(4) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold" style={{color:'var(--accent-amber)'}}>
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
      <div className="flex-1 flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-muted)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
             style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle2)', boxShadow: '0 4px 16px rgba(99,102,241,0.10)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No results yet</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Set up your beam and click{' '}
          <span className="font-semibold" style={{ color: 'var(--accent-indigo)' }}>Analyse Beam</span>
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
