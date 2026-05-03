import { useMemo } from 'react';
import { useBeamStore } from '../store';
import { useTheme } from '../hooks/useTheme';
import type { Support, DistributedLoad, PointLoad } from '../types';

// ─── Layout constants ─────────────────────────────────────────────────────────
const PAD_X   = 60;   // horizontal margin (px)
const PAD_Y   = 60;   // vertical margin   (px)
const H_BEAM  = 6;    // beam rect height  (px)
const SVG_H   = 260;
const BEAM_Y  = SVG_H / 2;   // y-centre of beam axis

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSvgX(x: number, length: number, width: number) {
  return PAD_X + (x / length) * (width - 2 * PAD_X);
}

// ── Support symbols ───────────────────────────────────────────────────────────

function SupportSymbol({
  cx, cy, type, accentColor, mutedColor, bgColor,
}: { cx: number; cy: number; type: Support['type']; accentColor: string; mutedColor: string; bgColor: string }) {
  const r   = 10;
  const tri = `M${cx},${cy + H_BEAM / 2} l${r},${r * 1.6} l${-r * 2},0 Z`;

  if (type === 'free') {
    return (
      <g>
        <circle cx={cx} cy={cy} r={5}
                fill={bgColor} stroke={mutedColor} strokeWidth={1.8} strokeDasharray="3 2" />
      </g>
    );
  }

  if (type === 'fixed') {
    return (
      <g>
        <line x1={cx} y1={cy - 14} x2={cx} y2={cy + 14} stroke={accentColor} strokeWidth={3} />
        {[-10, -4, 2, 8].map((dy) => (
          <line
            key={dy}
            x1={cx} y1={cy + dy}
            x2={cx - 12} y2={cy + dy + 6}
            stroke={accentColor} strokeWidth={1.5} opacity={0.5}
          />
        ))}
      </g>
    );
  }

  return (
    <g>
      <path d={tri}  fill="none" stroke={accentColor} strokeWidth={1.8} />
      <line x1={cx - r - 4} y1={cy + H_BEAM / 2 + r * 1.6 + 3}
            x2={cx + r + 4} y2={cy + H_BEAM / 2 + r * 1.6 + 3}
            stroke={accentColor} strokeWidth={1.5} />
      {type === 'roller' && (
        <>
          <circle cx={cx - r / 2} cy={cy + H_BEAM / 2 + r * 1.6 + 7} r={3}
                  fill="none" stroke={accentColor} strokeWidth={1.4} />
          <circle cx={cx + r / 2} cy={cy + H_BEAM / 2 + r * 1.6 + 7} r={3}
                  fill="none" stroke={accentColor} strokeWidth={1.4} />
        </>
      )}
      <line {...{ x1: cx - r - 4, y1: cy + H_BEAM / 2 + r * 1.6 + (type === 'roller' ? 14 : 6),
                  x2: cx + r + 4, y2: cy + H_BEAM / 2 + r * 1.6 + (type === 'roller' ? 14 : 6) }}
            stroke={mutedColor} strokeWidth={1.5} opacity={0.8} />
    </g>
  );
}

// ── Arrow for point load ──────────────────────────────────────────────────────

function LoadArrow({ cx, beamY, fy }: { cx: number; beamY: number; fy: number }) {
  const arrowLen = 38;
  const down     = fy < 0;
  const y1       = down ? beamY - arrowLen : beamY + arrowLen;
  const y2       = beamY;
  const headDir  = down ? 1 : -1;
  const col      = '#EF4444';
  const arrowPts = `${cx},${y2} ${cx - 5},${y2 - 10 * headDir} ${cx + 5},${y2 - 10 * headDir}`;

  return (
    <g>
      <line x1={cx} y1={y1} x2={cx} y2={y2 - 10 * headDir}
            stroke={col} strokeWidth={2} />
      <polygon points={arrowPts} fill={col} />
      <text x={cx + 7} y={y1 + (down ? 12 : -2)}
            fill={col} fontSize={11} fontFamily="monospace">
        {Math.abs(fy)} kN
      </text>
    </g>
  );
}

// ── Distributed load ──────────────────────────────────────────────────────────

function DistArrows({
  x1, x2, wy1, wy2,
}: { x1: number; x2: number; wy1: number; wy2: number }) {
  const col      = '#10B981';
  const ticks    = 7;
  const maxLen   = 30;
  const down     = (wy1 + wy2) / 2 < 0;
  const hd       = down ? 1 : -1;
  const maxW     = Math.max(Math.abs(wy1), Math.abs(wy2));
  const toLen    = (w: number) => maxW > 0 ? (Math.abs(w) / maxW) * maxLen : maxLen;

  const pts: { x: number; len: number }[] = [];
  for (let i = 0; i <= ticks; i++) {
    const t   = i / ticks;
    const xi  = x1 + t * (x2 - x1);
    const wi  = wy1 + t * (wy2 - wy1);
    pts.push({ x: xi, len: toLen(wi) });
  }

  // Outline polyline (top of the load block)
  const topLine = pts.map(({ x, len }) => `${x},${BEAM_Y - hd * len}`).join(' ');

  return (
    <g>
      <polyline points={topLine} fill="none" stroke={col} strokeWidth={1.5} opacity={0.6} />
      {pts.map(({ x, len }, i) => {
        const y1s = BEAM_Y - hd * len;
        const y2s = BEAM_Y;
        const arrow = `${x},${y2s} ${x - 4},${y2s - 8 * hd} ${x + 4},${y2s - 8 * hd}`;
        return (
          <g key={i}>
            <line x1={x} y1={y1s} x2={x} y2={y2s - 8 * hd}
                  stroke={col} strokeWidth={1.2} opacity={0.7} />
            <polygon points={arrow} fill={col} opacity={0.7} />
          </g>
        );
      })}
    </g>
  );
}

// ── Deformed shape overlay ────────────────────────────────────────────────────

function DeformedShape({
  diagram, length, svgWidth, scale,
}: {
  diagram: { x: number; delta: number }[];
  length: number;
  svgWidth: number;
  scale: number;
}) {
  if (!diagram.length) return null;
  const pts = diagram.map(({ x, delta }) => {
    const sx = toSvgX(x, length, svgWidth);
    const sy = BEAM_Y - delta * scale;
    return `${sx},${sy}`;
  });
  return (
    <polyline
      points={pts.join(' ')}
      fill="none"
      stroke="#F59E0B"
      strokeWidth={2}
      strokeDasharray="6 3"
      opacity={0.85}
    />
  );
}

// ── Reaction labels ───────────────────────────────────────────────────────────

function ReactionLabels({
  reactions, supports, length, svgWidth,
}: {
  reactions: Record<string, { Fy: number; Mz: number }>;
  supports: Support[];
  length: number;
  svgWidth: number;
}) {
  return (
    <>
      {supports.map((s) => {
        const r   = reactions[String(s.x)];
        if (!r) return null;
        const cx  = toSvgX(s.x, length, svgWidth);
        const col = '#10B981';
        return (
          <g key={s.id}>
            {Math.abs(r.Fy) > 0.01 && (
              <text x={cx} y={BEAM_Y + 56} textAnchor="middle"
                    fill={col} fontSize={10} fontFamily="monospace">
                R = {r.Fy.toFixed(2)} kN
              </text>
            )}
            {Math.abs(r.Mz) > 0.01 && (
              <text x={cx} y={BEAM_Y + 68} textAnchor="middle"
                    fill={col} fontSize={10} fontFamily="monospace">
                M = {r.Mz.toFixed(2)} kN·m
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BeamCanvas({ svgWidth = 700 }: { svgWidth?: number }) {
  const { length, supports, loads, result, diagram } = useBeamStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  // Theme-aware color tokens for SVG (CSS vars don't work as SVG attributes)
  const C = {
    grid:        dark ? 'rgba(37,52,78,0.70)'   : '#E2E8F0',
    beamFill:    dark ? 'rgba(99,102,241,0.10)'  : '#EEF2FF',
    beamStroke:  dark ? '#818CF8'                : '#6366F1',
    accent:      dark ? '#818CF8'                : '#6366F1',
    accentMuted: dark ? 'rgba(129,140,248,0.35)' : '#C7D2FE',
    tickText:    dark ? '#475569'                : '#64748B',
    freeFill:    dark ? '#0D1526'                : 'white',
    freeMuted:   dark ? '#374866'                : '#94A3B8',
  };

  // Scale factor for deformed shape so max deflection ≈ 30 px
  const scale = useMemo(() => {
    if (!diagram.length) return 1;
    const maxAbs = Math.max(...diagram.map((d) => Math.abs(d.delta)));
    return maxAbs > 1e-9 ? 30 / maxAbs : 1;
  }, [diagram]);

  const bx1 = toSvgX(0,      length, svgWidth);
  const bx2 = toSvgX(length, length, svgWidth);

  return (
    <div
      className="rounded-2xl overflow-hidden select-none"
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Title bar */}
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--divider)' }}>
        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-indigo)' }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Beam Model
        </span>
        {result && (
          <span className="ml-auto text-xs font-mono font-semibold" style={{ color: 'var(--accent-amber)' }}>
            δ<sub>max</sub> = {result.min_deflection.toFixed(4)} m
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        style={{ height: 'auto', minHeight: 180 }}
      >
        {/* Grid lines */}
        {Array.from({ length: 11 }, (_, i) => {
          const gx = toSvgX((i / 10) * length, length, svgWidth);
          return (
            <line key={i} x1={gx} y1={PAD_Y / 2} x2={gx} y2={SVG_H - PAD_Y / 2}
                  stroke={C.grid} strokeWidth={1} />
          );
        })}

        {/* Beam axis */}
        <rect
          x={bx1} y={BEAM_Y - H_BEAM / 2}
          width={bx2 - bx1} height={H_BEAM}
          rx={2}
          fill={C.beamFill} stroke={C.beamStroke} strokeWidth={1.8}
        />

        {/* Deformed shape */}
        <DeformedShape
          diagram={diagram}
          length={length}
          svgWidth={svgWidth}
          scale={scale}
        />

        {/* Distributed loads (draw before point loads) */}
        {loads
          .filter((l): l is DistributedLoad => l.type === 'distributed' || l.type === 'varying')
          .map((l) => {
            const wy1 = l.type === 'varying' ? (l.wy_start ?? l.wy) : l.wy;
            const wy2 = l.type === 'varying' ? (l.wy_end   ?? l.wy) : l.wy;
            return (
              <DistArrows
                key={l.id}
                x1={toSvgX(l.start_x, length, svgWidth)}
                x2={toSvgX(l.end_x,   length, svgWidth)}
                wy1={wy1}
                wy2={wy2}
              />
            );
          })}

        {/* Point loads */}
        {loads
          .filter((l): l is PointLoad => l.type === 'point')
          .map((l) => (
            <LoadArrow
              key={l.id}
              cx={toSvgX(l.x, length, svgWidth)}
              beamY={BEAM_Y}
              fy={l.fy}
            />
          ))}

        {/* Supports */}
        {supports.map((s) => (
          <SupportSymbol
            key={s.id}
            cx={toSvgX(s.x, length, svgWidth)}
            cy={BEAM_Y}
            type={s.type}
            accentColor={C.accent}
            mutedColor={C.accentMuted}
            bgColor={C.freeFill}
          />
        ))}

        {/* Reaction labels */}
        {result && (
          <ReactionLabels
            reactions={result.reactions}
            supports={supports}
            length={length}
            svgWidth={svgWidth}
          />
        )}

        {/* x-axis ticks */}
        {Array.from({ length: 6 }, (_, i) => {
          const xVal = (i / 5) * length;
          const gx   = toSvgX(xVal, length, svgWidth);
          return (
            <text key={i} x={gx} y={SVG_H - 8}
                  textAnchor="middle" fill={C.tickText} fontSize={10} fontFamily="monospace">
              {xVal.toFixed(1)}m
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-[var(--border)] flex gap-5 text-[10px] text-[var(--text-secondary)]">
        <span><span className="inline-block w-3 h-0.5 bg-[var(--accent-cyan)] mr-1 align-middle" />Beam</span>
        <span><span className="inline-block w-3 h-0.5 bg-[#FF5252] mr-1 align-middle" />Point Load</span>
        <span><span className="inline-block w-3 h-0.5 bg-[var(--accent-green)] mr-1 align-middle" />Dist. Load</span>
        <span><span className="inline-block w-3 h-0.5 bg-[var(--accent-yellow)] mr-1 align-middle border-dashed border-b" />Deflection</span>
      </div>
    </div>
  );
}
