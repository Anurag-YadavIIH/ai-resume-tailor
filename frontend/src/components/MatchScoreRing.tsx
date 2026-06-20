interface Props {
  score: number;
  size?: number;
}

/**
 * The workbench's signature element: a thread-wound dial showing fit after tailoring.
 * Color shifts from thread-red (weak) through amber to green (strong).
 */
export default function MatchScoreRing({ score, size = 84 }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  const color =
    clamped >= 75 ? "#1E9E6A" : clamped >= 50 ? "#C9821E" : "#E0603D";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E7E9F0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease, stroke 400ms" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-xl font-semibold leading-none text-ink">
          {clamped}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted">
          match
        </span>
      </div>
    </div>
  );
}
