import { create } from 'zustand';
import type { Support, Load, PointLoad, DistributedLoad, AnalyzeResponse, DiagramPoint } from './types';
import { analyzeBeam } from './api';

// ── nanoid shim (zustand doesn't bundle it; use crypto.randomUUID fallback) ──
function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

interface BeamState {
  // Beam parameters
  length:  number;
  E:       number;
  I:       number;

  // Collections
  supports: Support[];
  loads:    Load[];

  // Results
  result:   AnalyzeResponse | null;
  diagram:  DiagramPoint[];
  loading:  boolean;
  error:    string | null;

  // Actions — parameters
  setLength:  (v: number) => void;
  setE:       (v: number) => void;
  setI:       (v: number) => void;

  // Actions — supports
  addSupport:    (s: Omit<Support, 'id'>) => void;
  updateSupport: (id: string, patch: Partial<Omit<Support, 'id'>>) => void;
  removeSupport: (id: string) => void;

  // Actions — loads
  addLoad:    (l: Omit<PointLoad, 'id'> | Omit<DistributedLoad, 'id'>) => void;
  updateLoad: (id: string, patch: Partial<Load>) => void;
  removeLoad: (id: string) => void;

  // Actions — solve
  solve: () => Promise<void>;
  clearResult: () => void;
}

export const useBeamStore = create<BeamState>((set, get) => ({
  // ── Defaults: simply-supported 10 m steel beam ──
  length:   10,
  E:        200000,     // MPa (= kN/m² × 10⁻³, consistent with kN/m loading)
  I:        1.5e8,      // mm⁴  (IPE 300-ish)

  supports: [
    { id: uid(), x: 0,  type: 'pinned' },
    { id: uid(), x: 10, type: 'roller' },
  ],
  loads: [
    { id: uid(), type: 'point', x: 5, fy: -50, mz: 0 },
  ],

  result:  null,
  diagram: [],
  loading: false,
  error:   null,

  // ── Parameters ────────────────────────────────────────────────────────────
  setLength: (v) => set({ length: v }),
  setE:      (v) => set({ E: v }),
  setI:      (v) => set({ I: v }),

  // ── Supports ──────────────────────────────────────────────────────────────
  addSupport: (s) =>
    set((st) => ({ supports: [...st.supports, { ...s, id: uid() }] })),

  updateSupport: (id, patch) =>
    set((st) => ({
      supports: st.supports.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),

  removeSupport: (id) =>
    set((st) => ({ supports: st.supports.filter((s) => s.id !== id) })),

  // ── Loads ─────────────────────────────────────────────────────────────────
  addLoad: (l) =>
    set((st) => ({ loads: [...st.loads, { ...l, id: uid() } as Load] })),

  updateLoad: (id, patch) =>
    set((st) => ({
      loads: st.loads.map((l) => (l.id === id ? ({ ...l, ...patch } as Load) : l)),
    })),

  removeLoad: (id) =>
    set((st) => ({ loads: st.loads.filter((l) => l.id !== id) })),

  // ── Solve ─────────────────────────────────────────────────────────────────
  solve: async () => {
    const { length, E, I, supports, loads } = get();
    set({ loading: true, error: null });

    try {
      const res = await analyzeBeam({
        length,
        E,
        I,
        supports: supports.map(({ id: _id, ...s }) => s),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        loads: loads.map(({ id: _id, ...l }) => l as Omit<Load, 'id'>),
      });

      // Build diagram points (sub-sample to ≤ 1000 pts for chart perf)
      const step = Math.max(1, Math.floor(res.x.length / 1000));
      const pts: DiagramPoint[] = [];
      for (let i = 0; i < res.x.length; i += step) {
        pts.push({ x: res.x[i], V: res.V[i], M: res.M[i], delta: res.delta[i] });
      }
      // Always include last point
      const last = res.x.length - 1;
      if (pts[pts.length - 1].x !== res.x[last]) {
        pts.push({ x: res.x[last], V: res.V[last], M: res.M[last], delta: res.delta[last] });
      }

      set({ result: res, diagram: pts, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  clearResult: () => set({ result: null, diagram: [] }),
}));
