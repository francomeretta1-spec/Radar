"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ChevronDown } from "lucide-react";
import type { DeudasHistoricas } from "@/lib/api/types";
import {
  entidadesPorBanco,
  formatoMiles,
  formatoMilesCorto,
  formatoPeriodo,
  situacionConCodigo,
  SITUACIONES_BCRA,
} from "@/lib/risk";
import { RiskBadge } from "@/components/ui/risk-badge";

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function periodoALabel(periodo: string) {
  const mes = parseInt(periodo.slice(4, 6), 10);
  const anio = periodo.slice(2, 4);
  return `${MESES[mes - 1]} '${anio}`;
}

// Misma paleta que la torta de distribución, para que un banco se vea
// siempre del mismo color en los distintos gráficos del informe.
const COLORES = [
  "#1d4ed8",
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#0ea5e9",
  "#38bdf8",
  "#7dd3fc",
];
const COLOR_OTROS = "#94a3b8";

// Mostrar las 24 entidades a la vez (como hace la consulta web del BCRA,
// una tabla por banco) sería ilegible en un gráfico. Agrupamos las
// principales por monto más reciente y el resto queda en "Otros".
const MAX_BANCOS_GRAFICO = 6;

/**
 * Evolución de la deuda de los últimos 24 meses desglosada por banco —
 * igual que la consulta oficial del BCRA, que muestra una tabla de 24
 * meses por cada entidad informante. Acá lo resumimos en un gráfico
 * apilado (los bancos más relevantes) y dejamos el detalle completo,
 * banco por banco, en una lista desplegable debajo.
 */
export function EvolucionPorBanco({ data }: { data: DeudasHistoricas }) {
  const series = useMemo(() => entidadesPorBanco(data.periodos), [data]);
  const [abierto, setAbierto] = useState<string | null>(null);

  if (series.length === 0) return null;

  // `series` viene ordenada por monto actual descendente; para el
  // gráfico la mostramos de menor a mayor (leyenda y apilado), que se
  // lee más claro: el bloque más grande queda arriba de todo, como
  // remate visual de la barra.
  const principales = [...series.slice(0, MAX_BANCOS_GRAFICO)].reverse();
  const resto = series.slice(MAX_BANCOS_GRAFICO);
  const nombresGrafico = principales.map((s) => s.entidad);
  const hayOtros = resto.length > 0;

  const periodosOrdenados = [...data.periodos]
    .map((p) => p.periodo)
    .sort((a, b) => a.localeCompare(b));

  const puntosGrafico = periodosOrdenados.map((periodo) => {
    const fila: Record<string, number | string> = { periodo: periodoALabel(periodo) };
    for (const s of principales) {
      const punto = s.puntos.find((p) => p.periodo === periodo);
      fila[s.entidad] = punto?.monto ?? 0;
    }
    if (hayOtros) {
      fila["Otros"] = resto.reduce((acc, s) => {
        const punto = s.puntos.find((p) => p.periodo === periodo);
        return acc + (punto?.monto ?? 0);
      }, 0);
    }
    return fila;
  });

  return (
    <div className="space-y-5">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={puntosGrafico} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="periodo"
            tick={{ fill: "var(--fg-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--fg-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={(v) => formatoMilesCorto(Number(v) || 0)}
          />
          <Tooltip
            cursor={{ fill: "var(--radar-glow)" }}
            contentStyle={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--fg)" }}
            itemSorter={(item) => -(Number(item.value) || 0)}
            formatter={((value: unknown) => formatoMiles(Number(value) || 0)) as never}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--fg-muted)" }} iconType="circle" iconSize={8} />
          {hayOtros && (
            <Bar dataKey="Otros" stackId="deuda" fill={COLOR_OTROS} maxBarSize={28} />
          )}
          {nombresGrafico.map((nombre, i) => (
            <Bar
              key={nombre}
              dataKey={nombre}
              stackId="deuda"
              fill={COLORES[i % COLORES.length]}
              maxBarSize={28}
              radius={i === nombresGrafico.length - 1 ? [3, 3, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Detalle banco por banco, como la tabla de 24 meses que muestra
          la consulta oficial del BCRA para cada entidad informante. */}
      <div className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-wider text-(--fg-faint) font-medium">
          Detalle por entidad (24 meses)
        </p>
        {series.map((s) => {
          const estaAbierto = abierto === s.entidad;
          return (
            <div key={s.entidad} className="border border-(--border-soft) rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setAbierto(estaAbierto ? null : s.entidad)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-(--surface-raised) transition-colors"
              >
                <span className="text-sm text-(--fg) font-medium truncate">{s.entidad}</span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-(--fg-muted) font-display">
                    {formatoMiles(s.montoActual)}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`text-(--fg-faint) transition-transform ${estaAbierto ? "rotate-180" : ""}`}
                  />
                </span>
              </button>
              {estaAbierto && (
                <div className="overflow-x-auto px-3 pb-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-(--fg-faint) text-xs uppercase tracking-wide">
                        <th className="font-medium pb-1.5 pr-4">Período</th>
                        <th className="font-medium pb-1.5 pr-4">Situación</th>
                        <th className="font-medium pb-1.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...s.puntos]
                        .sort((a, b) => b.periodo.localeCompare(a.periodo))
                        .map((p, i) => {
                          const info = SITUACIONES_BCRA[p.situacion] ?? SITUACIONES_BCRA[1];
                          return (
                            <tr key={i} className="border-t border-(--border-soft)">
                              <td className="py-2 pr-4 text-(--fg-muted) font-display">
                                {formatoPeriodo(p.periodo)}
                              </td>
                              <td className="py-2 pr-4">
                                <RiskBadge nivel={info.nivel} label={situacionConCodigo(p.situacion)} />
                              </td>
                              <td className="py-2 text-right text-(--fg) font-display">
                                {formatoMiles(p.monto)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
