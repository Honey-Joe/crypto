/** Line-chart marker with a surface-coloured ring so it stays legible where lines cross. */
export default function MarkerShape({ shape, cx, cy, color, ring, size = 4.5 }) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  const common = { fill: color, stroke: ring, strokeWidth: 2 };
  if (shape === 'square') return <rect x={cx - size} y={cy - size} width={size * 2} height={size * 2} rx={1} {...common} />;
  if (shape === 'diamond') {
    const d = size * 1.3;
    return <path d={`M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`} {...common} />;
  }
  return <circle cx={cx} cy={cy} r={size} {...common} />;
}
