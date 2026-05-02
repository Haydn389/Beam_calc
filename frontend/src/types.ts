// ─── Domain Types ────────────────────────────────────────────────────────────

export type SupportType = 'fixed' | 'pinned' | 'roller' | 'free';
export type LoadType    = 'point' | 'distributed' | 'varying';

export interface Support {
  id:   string;
  x:    number;
  type: SupportType;
}

export interface PointLoad {
  id:   string;
  type: 'point';
  x:    number;
  fy:   number;   // kN  — negative = downward
  mz:   number;   // kN·m
}

export interface DistributedLoad {
  id:       string;
  type:     'distributed' | 'varying';
  start_x:  number;
  end_x:    number;
  wy:       number;        // uniform intensity  (kN/m)
  wy_start?: number;       // for 'varying'
  wy_end?:   number;       // for 'varying'
}

export type Load = PointLoad | DistributedLoad;

// ─── API Shapes ──────────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  length:     number;
  E:          number;
  I:          number;
  supports:   Omit<Support, 'id'>[];
  loads:      Omit<Load, 'id'>[];
  n_elements?: number;
}

export interface AnalyzeResponse {
  x:              number[];
  V:              number[];
  M:              number[];
  delta:          number[];
  reactions:      Record<string, { Fy: number; Mz: number }>;
  max_deflection: number;
  min_deflection: number;
  max_moment:     number;
  max_shear:      number;
}

// ─── Chart Point ─────────────────────────────────────────────────────────────

export interface DiagramPoint {
  x:     number;
  V:     number;
  M:     number;
  delta: number;
}
