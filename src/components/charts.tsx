/* Zero-dependency SVG charts — theme aware via CSS variables. */
import React, { useId } from 'react';
import { fmtMoney, fmtNum, toNum } from '../lib/format';

export interface ChartPoint {
  label: string;
  value: number;
  color?: string;
}

const PALETTE = ['#0B1F3A', '#D4AF37', '#12805c', '#175cd3', '#d92d20', '#7c3aed', '#0e7490', '#b54708', '#4d7c0f', '#be185d'];

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function BarChart({ data, height = 220, money = false }: { data: ChartPoint[]; height?: number; money?: boolean }) {
  const max = Math.max(1, ...data.map((d) => Math.abs(toNum(d.value))));
  const W = 640;
  const H = height;
  const padL = 8;
  const padB = 30;
  const bw = data.length ? (W - padL * 2) / data.length : 0;
  const accent = cssVar('--gold', '#D4AF37');
  const text = cssVar('--muted', '#667085');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const h = (Math.abs(toNum(d.value)) / max) * (H - padB - 14);
        const x = padL + i * bw + bw * 0.18;
        const w = bw * 0.64;
        return (
          <g key={i}>
            <rect x={x} y={H - padB - h} width={w} height={h} rx={5} fill={d.color || (i % 2 ? accent : cssVar('--navy-3', '#1d3a66'))}>
              <title>{`${d.label}: ${money ? fmtMoney(d.value) : fmtNum(d.value)}`}</title>
            </rect>
            <text x={x + w / 2} y={H - 10} textAnchor="middle" fontSize={11} fill={text}>
              {d.label.length > 9 ? d.label.slice(0, 8) + '…' : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({ data, height = 220, money = false }: { data: ChartPoint[]; height?: number; money?: boolean }) {
  const gid = useId();
  const W = 640;
  const H = height;
  const padL = 10;
  const padB = 30;
  const padT = 14;
  const max = Math.max(1, ...data.map((d) => toNum(d.value)));
  const min = Math.min(0, ...data.map((d) => toNum(d.value)));
  const span = max - min || 1;
  const step = data.length > 1 ? (W - padL * 2) / (data.length - 1) : 0;
  const pts = data.map((d, i) => {
    const x = padL + i * step;
    const y = padT + (1 - (toNum(d.value) - min) / span) * (H - padB - padT);
    return { x, y, d };
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${(padL + (data.length - 1) * step).toFixed(1)},${H - padB} L${padL},${H - padB} Z`;
  const stroke = cssVar('--gold', '#D4AF37');
  const text = cssVar('--muted', '#667085');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Line chart">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={padL} x2={W - padL} y1={padT + f * (H - padB - padT)} y2={padT + f * (H - padB - padT)} stroke={cssVar('--border', '#e3e9f2')} strokeDasharray="4 4" />
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill={cssVar('--surface', '#fff')} stroke={stroke} strokeWidth={2}>
            <title>{`${p.d.label}: ${money ? fmtMoney(p.d.value) : fmtNum(p.d.value)}`}</title>
          </circle>
          {(i % Math.ceil(pts.length / 8) === 0 || pts.length <= 8) && (
            <text x={p.x} y={H - 10} textAnchor="middle" fontSize={11} fill={text}>
              {p.d.label.length > 9 ? p.d.label.slice(0, 8) + '…' : p.d.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function DonutChart({ data, size = 200, money = false }: { data: ChartPoint[]; size?: number; money?: boolean }) {
  const total = data.reduce((s, d) => s + Math.abs(toNum(d.value)), 0) || 1;
  const R = 80;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const text = cssVar('--text', '#172033');
  const muted = cssVar('--muted', '#667085');
  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Donut chart">
        <circle cx={100} cy={100} r={R} fill="none" stroke={cssVar('--surface-2', '#eef2f7')} strokeWidth={26} />
        {data.map((d, i) => {
          const frac = Math.abs(toNum(d.value)) / total;
          const dash = frac * C;
          const off = -acc * C;
          acc += frac;
          return (
            <circle key={i} cx={100} cy={100} r={R} fill="none"
              stroke={d.color || PALETTE[i % PALETTE.length]} strokeWidth={26}
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off}
              transform="rotate(-90 100 100)" strokeLinecap="butt">
              <title>{`${d.label}: ${money ? fmtMoney(d.value) : fmtNum(d.value)}`}</title>
            </circle>
          );
        })}
        <text x={100} y={96} textAnchor="middle" fontSize={20} fontWeight={800} fill={text}>
          {money ? fmtMoney(total, 0) : fmtNum(total, 0)}
        </text>
        <text x={100} y={116} textAnchor="middle" fontSize={12} fill={muted}>Total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5 }}>
        {data.slice(0, 8).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: d.color || PALETTE[i % PALETTE.length], flex: '0 0 12px' }} />
            <span style={{ fontWeight: 600 }}>{d.label}</span>
            <span className="muted num" style={{ marginLeft: 'auto' }}>{money ? fmtMoney(d.value) : fmtNum(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
