"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, CartesianGrid } from "recharts";
import type { EntidadActual } from "@/lib/risk";
import { formatoMiles, formatoMilesCorto } from "@/lib/risk";

// Misma paleta que el resto de los gráficos del informe, para que un banco
// se vea siempre del mismo color en las distintas vistas.
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

// Con muchas entidades, una barra por cada una empieza a ser difícil de leer
// (etiquetas del eje Y muy apretadas). Mostramos las más relevantes por
// monto y agrupamos el resto en "Otros".
const MAX_BARRAS = 10;

function nombreCorto(nombre: string) {
  return nombre.length > 34 ? `${nombre.slice(0, 33)}…` : nombre;
}

// Recibe la lista ya consolidada (una entrada por entidad, con su último
// período informado cada una — ver consolidarEntidadesActuales) en vez de
// los `periodos` crudos, para no repetir el bug de tomar solo el período
// más reciente y perder entidades que reportaron un mes antes.
export function EntidadesBarChart({ entidades }: { entidades: EntidadActual[] }) {
  if (!entidades.length) return null;

  const ordenadas = entidades
    .map((e) => ({ name: e.entidad, value: e.monto }))
    .sort((a, b) => b.value - a.value);

  let puntos = ordenadas;
  if (ordenadas.length > MAX_BARRAS + 1) {
    const principales = ordenadas.slice(0, MAX_BARRAS);
    const resto = ordenadas.slice(MAX_BARRAS);
    const montoResto = resto.reduce((acc, e) => acc + e.value, 0);
    puntos = [
      ...principales,
      { name: `Otros (${resto.length} entidades)`, value: montoResto },
    ];
  }

  // El eje Y necesita más lugar cuanto más larga es la etiqueta más larga,
  // y la altura total crece con la cantidad de barras para que ninguna
  // quede angosta.
  const anchoEtiqueta = Math.min(
    220,
    Math.max(...puntos.map((p) => nombreCorto(p.name).length)) * 6 + 12
  );
  const alto = Math.max(240, puntos.length * 40 + 20);

  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={puntos} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          tickFormatter={(v) => formatoMilesCorto(Number(v))}
          tick={{ fontSize: 11, fill: "var(--fg-muted)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={anchoEtiqueta}
          tickFormatter={(v) => nombreCorto(String(v))}
          tick={{ fontSize: 11, fill: "var(--fg-muted)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--fg)" }}
          formatter={((value: unknown) => formatoMiles(Number(value) || 0)) as never}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={26}>
          {puntos.map((p, i) => (
            <Cell key={i} fill={p.name.startsWith("Otros") ? COLOR_OTROS : COLORES[i % COLORES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
