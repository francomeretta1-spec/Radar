import { RadarSweep } from "@/components/radar-sweep";

export function ScanningLoader({ cuit }: { cuit: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <RadarSweep size={180} />
      <div className="text-center">
        <p className="font-display text-(--fg) font-medium">Escaneando {cuit}</p>
        <p className="text-sm text-(--fg-muted) mt-1">
          Consultando BCRA y ARCA en simultáneo…
        </p>
      </div>
    </div>
  );
}
