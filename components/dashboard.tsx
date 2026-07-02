"use client";

import { useState } from "react";
import { CuitSearch } from "@/components/cuit-search";
import { ScanningLoader } from "@/components/scanning-loader";
import { ResultPanel } from "@/components/result-panel";
import { RadarSweep } from "@/components/radar-sweep";
import type { ConsultaCompleta } from "@/lib/api/types";
import { formatoCuit } from "@/lib/risk";

type Estado =
  | { tipo: "idle" }
  | { tipo: "loading"; cuit: string }
  | { tipo: "error"; mensaje: string }
  | { tipo: "ok"; data: ConsultaCompleta };

export function Dashboard() {
  const [estado, setEstado] = useState<Estado>({ tipo: "idle" });

  async function handleSearch(cuit: string) {
    setEstado({ tipo: "loading", cuit: formatoCuit(cuit) });

    try {
      const res = await fetch(`/api/consulta/${cuit}`);
      const body = await res.json();

      if (!res.ok) {
        setEstado({ tipo: "error", mensaje: body.error || "Ocurrió un error al consultar." });
        return;
      }

      setEstado({ tipo: "ok", data: body });
    } catch {
      setEstado({ tipo: "error", mensaje: "No se pudo completar la consulta. Probá de nuevo." });
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-(--radar) mb-1">
          Consultar CUIT
        </h1>
        <p className="text-sm text-(--fg-muted)">
          Situación crediticia en BCRA y datos fiscales en ARCA, en una sola consulta.
        </p>
      </div>

      <CuitSearch onSearch={handleSearch} loading={estado.tipo === "loading"} />

      <div className="mt-10">
        {estado.tipo === "idle" && (
          <div className="flex flex-col items-center justify-center py-16 opacity-60">
            <RadarSweep size={140} />
            <p className="text-sm text-(--fg-muted) mt-6">
              Ingresá un CUIT para empezar el escaneo.
            </p>
          </div>
        )}

        {estado.tipo === "loading" && <ScanningLoader cuit={estado.cuit} />}

        {estado.tipo === "error" && (
          <div className="rounded-lg border border-(--danger) bg-(--danger-bg) px-4 py-3">
            <p className="text-sm text-(--danger)">{estado.mensaje}</p>
          </div>
        )}

        {estado.tipo === "ok" && <ResultPanel data={estado.data} />}
      </div>
    </div>
  );
}
