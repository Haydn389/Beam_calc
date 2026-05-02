import { useBeamStore } from '../store';
import type { Support, SupportType, PointLoad, DistributedLoad } from '../types';
import SectionInput from './SectionInput';

// ?? Design tokens ?????????????????????????????????????????????????????????????

const labelCls =
  'block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-widest';
const inputCls =
  'w-full bg-white/80 border border-slate-200/60 rounded-xl px-3 py-2 ' +
  'text-sm text-slate-800 placeholder-slate-300 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 ' +
  'transition-all duration-200 shadow-sm hover:border-slate-300/80';
const selectCls = inputCls + ' cursor-pointer';
const btnRemove =
  'ml-2 flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs bg-red-50 text-red-400 ' +
  'border border-red-100 hover:bg-red-100 hover:text-red-500 ' +
  'transition-all duration-200 font-medium';

// ?? NumInput ??????????????????????????????????????????????????????????????????

function NumInput({
  label, value, onChange, step = 'any', min,
}: {
  label: string; value: number; onChange: (v: number) => void;
  step?: string | number; min?: number;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        className={inputCls}
        value={value}
        step={step}
        min={min}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

// ?? Section ???????????????????????????????????????????????????????????????????

function Section({ title, color = '#6366F1', children }: {
  title: string; color?: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-[3px] h-3.5 rounded-full" style={{ background: color }} />
        <h3
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ?? SupportRow ????????????????????????????????????????????????????????????????

function SupportRow({ sup }: { sup: Support }) {
  const { updateSupport, removeSupport } = useBeamStore();
  return (
    <div className="flex gap-2 items-end mb-2.5">
      <div className="flex-1">
        <NumInput label="x (m)" value={sup.x}
          onChange={(v) => updateSupport(sup.id, { x: v })} />
      </div>
      <div className="flex-1">
        <label className={labelCls}>Type</label>
        <select
          className={selectCls}
          value={sup.type}
          onChange={(e) => updateSupport(sup.id, { type: e.target.value as SupportType })}
        >
          <option value="pinned">Pinned</option>
          <option value="roller">Roller</option>
          <option value="fixed">Fixed</option>
          <option value="free">Free</option>
        </select>
      </div>
      <button className={btnRemove} onClick={() => removeSupport(sup.id)}>&times;</button>
    </div>
  );
}

// ?? PointLoadRow ??????????????????????????????????????????????????????????????

function PointLoadRow({ load }: { load: PointLoad }) {
  const { updateLoad, removeLoad } = useBeamStore();
  return (
    <div className="
      rounded-2xl border border-blue-100/80 bg-blue-50/40 p-3.5 mb-2.5
      shadow-[0_2px_12px_rgba(59,130,246,0.06)]
      hover:shadow-[0_4px_20px_rgba(59,130,246,0.12)]
      hover:-translate-y-0.5 transition-all duration-200
    ">
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
            Point Load
          </span>
        </div>
        <button className={btnRemove} onClick={() => removeLoad(load.id)}>&times;</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumInput label="x (m)"     value={load.x}  onChange={(v) => updateLoad(load.id, { x: v })} />
        <NumInput label="Fy (kN)"   value={load.fy} onChange={(v) => updateLoad(load.id, { fy: v })} />
        <NumInput label="Mz (kN&middot;m)" value={load.mz} onChange={(v) => updateLoad(load.id, { mz: v })} />
      </div>
    </div>
  );
}

// ?? DistLoadRow ???????????????????????????????????????????????????????????????

function DistLoadRow({ load }: { load: DistributedLoad }) {
  const { updateLoad, removeLoad } = useBeamStore();
  const isVarying = load.type === 'varying';
  return (
    <div className="
      rounded-2xl border border-emerald-100/80 bg-emerald-50/40 p-3.5 mb-2.5
      shadow-[0_2px_12px_rgba(16,185,129,0.06)]
      hover:shadow-[0_4px_20px_rgba(16,185,129,0.12)]
      hover:-translate-y-0.5 transition-all duration-200
    ">
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            {isVarying ? 'Varying Load' : 'Distributed Load'}
          </span>
        </div>
        <button className={btnRemove} onClick={() => removeLoad(load.id)}>&times;</button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <NumInput label="Start x (m)" value={load.start_x}
          onChange={(v) => updateLoad(load.id, { start_x: v })} />
        <NumInput label="End x (m)" value={load.end_x}
          onChange={(v) => updateLoad(load.id, { end_x: v })} />
      </div>
      {isVarying ? (
        <div className="grid grid-cols-2 gap-2">
          <NumInput label="wy start (kN/m)" value={load.wy_start ?? load.wy}
            onChange={(v) => updateLoad(load.id, { wy_start: v })} />
          <NumInput label="wy end (kN/m)" value={load.wy_end ?? load.wy}
            onChange={(v) => updateLoad(load.id, { wy_end: v })} />
        </div>
      ) : (
        <NumInput label="wy (kN/m)" value={load.wy}
          onChange={(v) => updateLoad(load.id, { wy: v })} />
      )}
    </div>
  );
}

// ?? Main panel ????????????????????????????????????????????????????????????????

export default function InputPanel() {
  const {
    length, setLength,
    supports, loads, addSupport, addLoad,
    solve, loading, error,
  } = useBeamStore();

  return (
    <aside
      className="
        w-80 min-w-[280px] h-full overflow-y-auto flex flex-col
        border-r border-white/60
        px-5 py-6
      "
      style={{
        background: 'rgba(255,255,255,0.60)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: '4px 0 32px rgba(99,102,241,0.06)',
      }}
    >
      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500
                          flex items-center justify-center shadow-[0_4px_12px_rgba(99,102,241,0.35)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                 strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <line x1="5" y1="6"  x2="5"  y2="18" />
              <line x1="19" y1="6" x2="19" y2="18" />
            </svg>
          </div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">
            Beam Calculator
          </h1>
        </div>
        <p className="text-[11px] text-slate-400 ml-9">
          Direct Stiffness Method 쨌 FEM
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent mb-5" />

      {/* Beam Properties */}
      <Section title="Beam Properties" color="#6366F1">
        <div className="bg-indigo-50/50 rounded-2xl p-3 border border-indigo-100/60">
          <NumInput label="Length (m)" value={length} onChange={setLength} min={0.01} />
        </div>
      </Section>

      {/* Section & Material */}
      <Section title="Section &amp; Material" color="#8B5CF6">
        <SectionInput />
      </Section>

      {/* Supports */}
      <Section title="Supports" color="#6366F1">
        {supports.map((s) => <SupportRow key={s.id} sup={s} />)}
        <button
          className="
            w-full py-2 rounded-xl text-xs font-semibold
            text-indigo-500 border border-indigo-200/80 bg-indigo-50/60
            hover:bg-indigo-100/80 hover:border-indigo-300
            transition-all duration-200
          "
          onClick={() => addSupport({ x: 0, type: 'pinned' })}
        >
          + Add Support
        </button>
      </Section>

      {/* Loads */}
      <Section title="Loads" color="#3B82F6">
        {loads.map((l) =>
          l.type === 'point'
            ? <PointLoadRow  key={l.id} load={l as PointLoad} />
            : <DistLoadRow   key={l.id} load={l as DistributedLoad} />
        )}
        <div className="flex gap-1.5 mt-1">
          <button
            className="flex-1 py-2 rounded-xl text-[11px] font-semibold
                       text-blue-500 border border-blue-200/80 bg-blue-50/60
                       hover:bg-blue-100/80 hover:border-blue-300
                       transition-all duration-200"
            onClick={() => addLoad({ type: 'point', x: length / 2, fy: -10, mz: 0 })}
          >
            + Point
          </button>
          <button
            className="flex-1 py-2 rounded-xl text-[11px] font-semibold
                       text-emerald-600 border border-emerald-200/80 bg-emerald-50/60
                       hover:bg-emerald-100/80 hover:border-emerald-300
                       transition-all duration-200"
            onClick={() => addLoad({ type: 'distributed', start_x: 0, end_x: length, wy: -5 })}
          >
            + Dist.
          </button>
          <button
            className="flex-1 py-2 rounded-xl text-[11px] font-semibold
                       text-amber-600 border border-amber-200/80 bg-amber-50/60
                       hover:bg-amber-100/80 hover:border-amber-300
                       transition-all duration-200"
            onClick={() => addLoad({ type: 'varying', start_x: 0, end_x: length, wy: -5, wy_start: -5, wy_end: 0 })}
          >
            + Varying
          </button>
        </div>
      </Section>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200/60
                        text-xs text-red-500 shadow-sm">
          {error}
        </div>
      )}

      {/* Analyse button */}
      <button
        onClick={() => void solve()}
        disabled={loading}
        className="
          mt-auto py-3.5 rounded-2xl font-semibold text-sm tracking-wide text-white
          bg-gradient-to-r from-indigo-500 to-blue-500
          shadow-[0_4px_20px_rgba(99,102,241,0.35)]
          hover:shadow-[0_8px_32px_rgba(99,102,241,0.50)]
          hover:-translate-y-0.5
          disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0
          transition-all duration-300
        "
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Analysing…
          </span>
        ) : 'Analyse Beam'}
      </button>
    </aside>
  );
}
