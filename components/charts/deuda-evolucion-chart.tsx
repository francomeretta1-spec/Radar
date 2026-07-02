"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DeudasHistoricas } from "@/lib/api/types";
import { formatoMiles } from "@/lib/risk";

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function periodoALabel(periodo: string) {
  const mes = parseInt(periodo.slice(4, 6), 10);
  const anio = periodo.slice(2, 4);
  return `${MESES[mes - 1]} '${anio}`;
}

export function DeudaEvolucionChart({ data }: { data: DeudasHistoricas }) {
  const puntos = [...data.periodos]
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .map((p) => ({
      periodo: periodoALabel(p.periodo),
      total: p.entidades.reduce((acc, e) => acc + e.monto, 0),
    }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={puntos} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
          width={0}
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
          formatter={((value: unknown) => [
            formatoMiles(Number(Array.isArray(value) ? value[0] : value) || 0),
            "Endeudamiento",
          ]) as never}
        />
        <Bar dataKey="total" fill="var(--radar)" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
