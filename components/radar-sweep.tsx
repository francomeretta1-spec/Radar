"use client";

export function RadarSweep({ size = 420 }: { size?: number }) {
  const center = size / 2;
  const radius = size / 2 - 2;

  const rings = [0.25, 0.5, 0.75, 1].map((f) => radius * f);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="sweepGradient" cx="0%" cy="0%" r="100%">
            <stop offset="0%" stopColor="var(--radar)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--radar)" stopOpacity="0" />
          </radialGradient>
          <clipPath id="radarClip">
            <circle cx={center} cy={center} r={radius} />
          </clipPath>
        </defs>

        {rings.map((r, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="var(--radar-dim)"
            strokeOpacity={0.35}
            strokeWidth={1}
          />
        ))}

        <line
          x1={center}
          y1={2}
          x2={center}
          y2={size - 2}
          stroke="var(--radar-dim)"
          strokeOpacity={0.2}
        />
        <line
          x1={2}
          y1={center}
          x2={size - 2}
          y2={center}
          stroke="var(--radar-dim)"
          strokeOpacity={0.2}
        />

        <g clipPath="url(#radarClip)">
          <g
            style={{
              transformOrigin: `${center}px ${center}px`,
              animation: "radar-sweep 4s linear infinite",
            }}
          >
            <path
              d={`M ${center} ${center} L ${center} ${center - radius} A ${radius} ${radius} 0 0 1 ${
                center + radius * Math.sin((Math.PI * 70) / 180)
              } ${center - radius * Math.cos((Math.PI * 70) / 180)} Z`}
              fill="url(#sweepGradient)"
            />
          </g>
        </g>

        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--radar-dim)" strokeWidth={1.5} />

        {/* Puntos detectados, fijos, decoran el radar */}
        <circle cx={center + radius * 0.4} cy={center - radius * 0.2} r={3} fill="var(--radar)">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx={center - radius * 0.55} cy={center + radius * 0.35} r={2.5} fill="var(--radar)">
          <animate attributeName="opacity" values="1;0.2;1" dur="3.1s" repeatCount="indefinite" />
        </circle>
        <circle cx={center - radius * 0.2} cy={center - radius * 0.6} r={2} fill="var(--radar)">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2.8s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
