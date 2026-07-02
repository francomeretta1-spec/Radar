import { nivelColor, type NivelRiesgo } from "@/lib/risk";

export function RiskBadge({ nivel, label }: { nivel: NivelRiesgo; label: string }) {
  const c = nivelColor(nivel);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{ color: c.fg, background: c.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: c.fg }}
      />
      {label}
    </span>
  );
}
