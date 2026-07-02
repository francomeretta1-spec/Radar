export type NivelRiesgo = "ok" | "warn" | "danger";

export const SITUACIONES_BCRA: Record<
  number,
  { label: string; corto: string; nivel: NivelRiesgo }
> = {
  1: { label: "En situación normal", corto: "Normal", nivel: "ok" },
  2: { label: "Con seguimiento especial / riesgo bajo", corto: "Riesgo bajo", nivel: "warn" },
  3: { label: "Con problemas / riesgo medio", corto: "Riesgo medio", nivel: "warn" },
  4: { label: "Con alto riesgo de insolvencia", corto: "Riesgo alto", nivel: "danger" },
  5: { label: "Irrecuperable", corto: "Irrecuperable", nivel: "danger" },
  6: { label: "Irrecuperable por disposición técnica", corto: "Irrecup. técnica", nivel: "danger" },
};

/** Devuelve "1 · Normal" — el código numérico junto al label corto, tal
 * como lo identifica el BCRA. Útil para que el informe sea trazable contra
 * la fuente oficial sin perder la explicación en lenguaje claro. */
export function situacionConCodigo(situacion: number): string {
  const info = SITUACIONES_BCRA[situacion] ?? SITUACIONES_BCRA[1];
  return `${situacion} · ${info.corto}`;
}

/** Antigüedad legible a partir de una fecha ISO (ej. fechaContratoSocial
 * de ARCA). Devuelve algo como "45 años (desde 1981)". */
export function calcularAntiguedad(fechaIso?: string): string | null {
  if (!fechaIso) return null;
  const fecha = new Date(fechaIso);
  if (isNaN(fecha.getTime())) return null;
  // ARCA a veces devuelve fechas centinela muy antiguas (ej. 1901) cuando
  // no hay un dato real cargado; las descartamos.
  if (fecha.getFullYear() < 1910) return null;
  const anios = Math.floor(
    (Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
  return `${anios} ${anios === 1 ? "año" : "años"} (desde ${fecha.getFullYear()})`;
}

/** Formatea una fecha ISO como DD/MM/AAAA (día, mes y año), tal como se
 * pide para la fecha de contrato social. Reutiliza el mismo descarte de
 * fechas centinela que calcularAntiguedad. */
export function formatoFecha(fechaIso?: string): string | null {
  if (!fechaIso) return null;
  const fecha = new Date(fechaIso);
  if (isNaN(fecha.getTime())) return null;
  if (fecha.getFullYear() < 1910) return null;
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

export function nivelColor(nivel: NivelRiesgo) {
  return {
    ok: { fg: "var(--ok)", bg: "var(--ok-bg)" },
    warn: { fg: "var(--warn)", bg: "var(--warn-bg)" },
    danger: { fg: "var(--danger)", bg: "var(--danger-bg)" },
  }[nivel];
}

type ApocDatosParcial = {
  esApocrifo?: boolean;
  fechaCondicion?: string | null;
  fechaPublicacion?: string | null;
  raw?: unknown;
};

/**
 * Determina si un CUIT está confirmado en la base APOC de forma robusta,
 * sin depender ciegamente del booleano `esApocrifo` que arma la pasarela.
 *
 * BUG QUE CORRIGE: según el manual oficial del webservice WSAPOC, un CUIT
 * incluido en la base devuelve un registro `PublicacionAPOC` con
 * `FechaCondicion`/`FechaPublicacion` pobladas; si no está incluido, esos
 * campos no existen. `esApocrifo` es un booleano calculado aparte por la
 * pasarela (no lo devuelve así el webservice de ARCA) y puede quedar mal
 * calculado — un caso típico es el de conversión SOAP→XML→JSON: cuando
 * hay un único resultado, el nodo de resultados puede serializarse como
 * objeto individual en vez de array, y un chequeo tipo `resultados.length
 * > 0` no lo detecta. Por eso acá se refuerza la señal: si vinieron las
 * fechas de condición o publicación, se considera apócrifo aunque el
 * booleano diga lo contrario.
 */
export function esApocrifoConfirmado(apoc: ApocDatosParcial | null | undefined): boolean {
  if (!apoc) return false;
  if (apoc.esApocrifo || !!apoc.fechaCondicion || !!apoc.fechaPublicacion) return true;

  // Defensa adicional: si por algún cambio del gateway llega la respuesta
  // cruda del WSAPOC, detectar PublicacionAPOC aunque no esté normalizada.
  const raw = apoc.raw;
  if (!raw || typeof raw !== "object") return false;
  const root = raw as Record<string, unknown>;
  const wsResult =
    (root.GetPublicacionAPOCResult as Record<string, unknown> | undefined) ??
    (root.getPublicacionAPOCResult as Record<string, unknown> | undefined) ??
    root;
  const resultados = wsResult.resultados as Record<string, unknown> | undefined;
  const publicaciones =
    resultados?.PublicacionAPOC ??
    resultados?.publicacionAPOC ??
    wsResult.PublicacionAPOC ??
    wsResult.publicacionAPOC;

  return Array.isArray(publicaciones) ? publicaciones.length > 0 : !!publicaciones;
}

type ActividadArca = { descripcionActividad: string; idActividad: string; orden?: number | string };

/**
 * Devuelve la actividad marcada como principal según ARCA.
 *
 * BUG QUE CORRIGE (1): el padrón A5 no devuelve el array `actividad`
 * ordenado por importancia (suele venir ordenado por `idActividad`
 * ascendente). Cada actividad trae su propio campo `orden` (1: Principal,
 * 2, 3...: Secundaria) — hay que guiarse por ese campo, no por la
 * posición [0] del array.
 *
 * BUG QUE CORRIGE (2): `orden` puede venir como string ("1") en vez de
 * number según la fuente/gateway. Comparar con `=== 1` a secas falla
 * silenciosamente en ese caso y termina cayendo al fallback (la primera
 * del array), reproduciendo el bug (1) igual. Por eso se normaliza con
 * `Number(...)` antes de comparar.
 */
export function actividadPrincipal<T extends ActividadArca>(actividades: T[]): T | null {
  if (actividades.length === 0) return null;
  const principal = actividades.find((a) => Number(a.orden) === 1);
  return principal ?? actividades[0];
}

/** Resto de las actividades, ordenadas por su `orden` real (2, 3, 4...). */
export function actividadesSecundarias<T extends ActividadArca>(actividades: T[]): T[] {
  const principal = actividadPrincipal(actividades);
  return actividades
    .filter((a) => a !== principal)
    .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
}

export type ScoreRadar = {
  promedio: number; // ponderado por monto, sin redondear (ej. 1.34)
  redondeado: number; // 1-6, para buscar en SITUACIONES_BCRA
  label: string; // "1,3 · Normal" — con un decimal para mostrar matiz
};

/**
 * Score propio de Radar: promedio de las situaciones BCRA ponderado por el
 * monto adeudado a cada entidad. A diferencia del criterio oficial del BCRA
 * (que toma SIEMPRE la peor situación, sin importar el monto), esto evita
 * que una deuda mínima en situación grave domine el resultado cuando el
 * grueso del endeudamiento está en situación normal.
 */
export function calcularScoreRadar(
  entidades: { situacion: number; monto: number }[]
): ScoreRadar | null {
  const montoTotal = entidades.reduce((acc, e) => acc + e.monto, 0);
  if (entidades.length === 0 || montoTotal === 0) return null;

  const promedio =
    entidades.reduce((acc, e) => acc + e.situacion * e.monto, 0) / montoTotal;
  const redondeado = Math.min(6, Math.max(1, Math.round(promedio)));
  const info = SITUACIONES_BCRA[redondeado] ?? SITUACIONES_BCRA[1];

  return {
    promedio,
    redondeado,
    label: `${promedio.toFixed(1)} · ${info.corto}`,
  };
}

export function situacionMasAlta(situaciones: number[]): number {
  if (situaciones.length === 0) return 1;
  return Math.max(...situaciones);
}

export type SerieEntidad = {
  entidad: string;
  montoActual: number;
  puntos: { periodo: string; situacion: number; monto: number }[];
};

/**
 * Invierte el histórico de deudasHistoricas (que viene ordenado por
 * período, con la lista de entidades de cada período) en una serie por
 * entidad, igual a como lo muestra la consulta oficial del BCRA (una
 * tabla de 24 meses por cada banco/financiera).
 *
 * Devuelve las entidades ordenadas por monto más reciente descendente.
 */
export function entidadesPorBanco(
  periodos: { periodo: string; entidades: { entidad: string; situacion: number; monto: number }[] }[]
): SerieEntidad[] {
  const porEntidad = new Map<string, { periodo: string; situacion: number; monto: number }[]>();

  const ordenados = [...periodos].sort((a, b) => a.periodo.localeCompare(b.periodo));

  for (const p of ordenados) {
    for (const e of p.entidades) {
      const lista = porEntidad.get(e.entidad) ?? [];
      lista.push({ periodo: p.periodo, situacion: e.situacion, monto: e.monto });
      porEntidad.set(e.entidad, lista);
    }
  }

  const series: SerieEntidad[] = Array.from(porEntidad.entries()).map(([entidad, puntos]) => ({
    entidad,
    montoActual: puntos[puntos.length - 1]?.monto ?? 0,
    puntos,
  }));

  return series.sort((a, b) => b.montoActual - a.montoActual);
}

export type EntidadActual = {
  entidad: string;
  situacion: number;
  monto: number;
  periodo: string;
  diasAtrasoPago?: number;
};

/**
 * Consolida las "deudas actuales" en una sola lista por entidad.
 *
 * BUG QUE CORRIGE: la API de BCRA no siempre informa todas las entidades
 * en el mismo período dentro de `deudasActuales.periodos` — algunas
 * entidades pueden tener su último reporte un mes antes que el resto
 * (ej. un banco que todavía no cerró el período más reciente). Tomar solo
 * `periodos` ordenado y quedarse con el [0] descarta por completo a esas
 * entidades, subestimando el endeudamiento total, la cantidad de
 * entidades y la situación/score calculados.
 *
 * Acá tomamos, para cada entidad, su entrada más reciente entre TODOS los
 * períodos presentes en `deudasActuales` (no solo el período más nuevo
 * en términos absolutos), igual que lo hace la web oficial del BCRA.
 */
export function consolidarEntidadesActuales(
  periodos: {
    periodo: string;
    entidades: { entidad: string; situacion: number; monto: number; diasAtrasoPago?: number }[];
  }[]
): EntidadActual[] {
  const porEntidad = new Map<string, EntidadActual>();

  // Procesamos del período más viejo al más nuevo: así, si una entidad
  // aparece en más de un período, la entrada del período más reciente
  // queda escribiendo por encima (last write wins).
  const ordenados = [...periodos].sort((a, b) => a.periodo.localeCompare(b.periodo));

  for (const p of ordenados) {
    for (const e of p.entidades) {
      porEntidad.set(e.entidad, { ...e, periodo: p.periodo });
    }
  }

  return Array.from(porEntidad.values());
}

export function formatoMiles(monto: number) {
  // Los importes de BCRA vienen expresados en miles de pesos.
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(monto * 1000);
}

/** Versión abreviada de formatoMiles para ejes de gráfico, donde el
 * espacio horizontal es escaso (ej. "$1,2 M" en vez de "$1.234.000"). */
export function formatoMilesCorto(monto: number): string {
  const pesos = monto * 1000;
  const abs = Math.abs(pesos);
  if (abs >= 1_000_000_000) return `$${(pesos / 1_000_000_000).toFixed(1)} MM`;
  if (abs >= 1_000_000) return `$${(pesos / 1_000_000).toFixed(1)} M`;
  if (abs >= 1_000) return `$${(pesos / 1_000).toFixed(0)} mil`;
  return `$${pesos.toFixed(0)}`;
}

export type PuntoEvolucionMensual = {
  periodo: string;
  situacion: number;
  monto: number;
};

/**
 * Resume el histórico de 24 meses en un punto por período: la peor
 * situación de ese mes (mismo criterio que usa el BCRA para la situación
 * oficial) y el monto total adeudado al sistema financiero ese mes. Base
 * para la tabla de evolución del endeudamiento (previa al gráfico).
 */
export function evolucionMensual(
  periodos: { periodo: string; entidades: { situacion: number; monto: number }[] }[]
): PuntoEvolucionMensual[] {
  return [...periodos]
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .map((p) => ({
      periodo: p.periodo,
      situacion: situacionMasAlta(p.entidades.map((e) => e.situacion)),
      monto: p.entidades.reduce((acc, e) => acc + e.monto, 0),
    }));
}

export type ResumenTipoRechazo = { cantidad: number; monto: number };

function resumenVacio(): ResumenTipoRechazo {
  return { cantidad: 0, monto: 0 };
}

/** Clasifica un causal de rechazo en los tres tipos que usa el BCRA en su
 * propio resumen (sin fondos / defectos formales / a la registración).
 * Cualquier causal que no matchee ninguno cae en "otros" (no debería
 * pasar con los causales habituales, pero evita perder cheques si ARCA
 * agrega una causal nueva). */
function bucketCausal(causal: string): "sinFondos" | "defectosFormales" | "aLaRegistracion" | "otros" {
  const c = causal.toUpperCase();
  if (c.includes("SIN FONDOS")) return "sinFondos";
  if (c.includes("DEFECTO")) return "defectosFormales";
  if (c.includes("REGISTR")) return "aLaRegistracion";
  return "otros";
}

export type ResumenPorTipoRechazo = {
  sinFondos: ResumenTipoRechazo;
  defectosFormales: ResumenTipoRechazo;
  aLaRegistracion: ResumenTipoRechazo;
  otros: ResumenTipoRechazo;
};

type CausalConDetalle = {
  causal: string;
  entidades: { detalle: { monto: number }[] }[];
};

/** "Resumen de cheques rechazados en cuentas de personas jurídicas" tal
 * como lo muestra el BCRA: cantidad y monto agrupados por tipo de
 * rechazo, no por el texto exacto del causal (que puede variar). */
export function resumenPorTipoRechazo(causales: CausalConDetalle[]): ResumenPorTipoRechazo {
  const resumen: ResumenPorTipoRechazo = {
    sinFondos: resumenVacio(),
    defectosFormales: resumenVacio(),
    aLaRegistracion: resumenVacio(),
    otros: resumenVacio(),
  };
  for (const c of causales) {
    const bucket = bucketCausal(c.causal);
    const detalle = c.entidades.flatMap((e) => e.detalle);
    resumen[bucket].cantidad += detalle.length;
    resumen[bucket].monto += detalle.reduce((acc, d) => acc + d.monto, 0);
  }
  return resumen;
}

export type ResumenTotalCheques = {
  totalCantidad: number;
  totalMonto: number;
  abonadosCantidad: number;
  abonadosMonto: number;
  porcentajeCantidad: number;
  porcentajeMonto: number;
};

type CausalConPago = {
  entidades: { detalle: { monto: number; fechaPago: string | null }[] }[];
};

/** "Resumen total de cheques rechazados": total, cheques ya abonados
 * (fechaPago informada) y el porcentaje que representan, igual que la
 * tabla oficial del BCRA. */
export function resumenTotalCheques(causales: CausalConPago[]): ResumenTotalCheques {
  const detalle = causales.flatMap((c) => c.entidades.flatMap((e) => e.detalle));
  const totalCantidad = detalle.length;
  const totalMonto = detalle.reduce((acc, d) => acc + d.monto, 0);
  const abonados = detalle.filter((d) => !!d.fechaPago);
  const abonadosCantidad = abonados.length;
  const abonadosMonto = abonados.reduce((acc, d) => acc + d.monto, 0);
  return {
    totalCantidad,
    totalMonto,
    abonadosCantidad,
    abonadosMonto,
    porcentajeCantidad: totalCantidad > 0 ? (abonadosCantidad / totalCantidad) * 100 : 0,
    porcentajeMonto: totalMonto > 0 ? (abonadosMonto / totalMonto) * 100 : 0,
  };
}

export type ResumenBancoDetallado = {
  entidad: number;
  sinFondos: ResumenTipoRechazo;
  defectosFormales: ResumenTipoRechazo;
  aLaRegistracion: ResumenTipoRechazo;
  otros: ResumenTipoRechazo;
  abonados: ResumenTipoRechazo;
};

type CausalConEntidadYPago = {
  causal: string;
  entidades: { entidad: number; detalle: { monto: number; fechaPago: string | null }[] }[];
};

/** "Resumen por banco": mismo desglose por tipo de rechazo que el
 * resumen general, pero abierto por entidad — como en la tabla oficial
 * del BCRA. */
export function resumenPorBancoDetallado(causales: CausalConEntidadYPago[]): ResumenBancoDetallado[] {
  const porBanco = new Map<number, ResumenBancoDetallado>();

  for (const c of causales) {
    const bucket = bucketCausal(c.causal);
    for (const e of c.entidades) {
      const actual =
        porBanco.get(e.entidad) ??
        ({
          entidad: e.entidad,
          sinFondos: resumenVacio(),
          defectosFormales: resumenVacio(),
          aLaRegistracion: resumenVacio(),
          otros: resumenVacio(),
          abonados: resumenVacio(),
        } as ResumenBancoDetallado);

      actual[bucket].cantidad += e.detalle.length;
      actual[bucket].monto += e.detalle.reduce((acc, d) => acc + d.monto, 0);

      const abonados = e.detalle.filter((d) => !!d.fechaPago);
      actual.abonados.cantidad += abonados.length;
      actual.abonados.monto += abonados.reduce((acc, d) => acc + d.monto, 0);

      porBanco.set(e.entidad, actual);
    }
  }

  const montoTotal = (r: ResumenBancoDetallado) =>
    r.sinFondos.monto + r.defectosFormales.monto + r.aLaRegistracion.monto + r.otros.monto;

  return Array.from(porBanco.values()).sort((a, b) => montoTotal(b) - montoTotal(a));
}

/**
 * Arma un resumen en texto plano (no JSON crudo) de la consulta completa,
 * pensado como contexto para un modelo de lenguaje. Reutiliza exactamente
 * los mismos cálculos que usa la UI (consolidarEntidadesActuales,
 * situacionDesde, calcularScoreRadar, etc.) para que el informe de la IA
 * nunca contradiga lo que el usuario ve en pantalla.
 */
export function armarContextoParaIA(data: {
  cuit: string;
  bcra: {
    deudasActuales: { periodos: { periodo: string; entidades: { entidad: string; situacion: number; monto: number; diasAtrasoPago?: number }[] }[] } | null;
    deudasHistoricas: { periodos: { periodo: string; entidades: { entidad: string; situacion: number; monto: number }[] }[] } | null;
    chequesRechazados: {
      causales: {
        causal: string;
        entidades: { entidad: number; detalle: { monto: number; fechaPago: string | null }[] }[];
      }[];
    } | null;
    errores: string[];
  };
  arca: {
    ok: boolean;
    datos?: {
      errorConstancia?: { error?: string[] };
      datosGenerales?: {
        razonSocial?: string;
        nombre?: string;
        apellido?: string;
        tipoPersona?: string;
        estadoClave?: string;
        domicilioFiscal?: { localidad?: string; descripcionProvincia?: string };
      };
      datosRegimenGeneral?: {
        actividad?: { descripcionActividad: string; idActividad: string; orden?: number | string }[];
        impuesto?: { descripcionImpuesto: string; estadoImpuesto: string }[];
      };
      datosMonotributo?: { categoriaMonotributo?: { descripcionCategoria: string } };
    };
  } | null;
  padron13: {
    datos?: {
      persona?: { formaJuridica?: string; fechaContratoSocial?: string };
    };
  } | null;
  apoc: {
    ok: boolean;
    esApocrifo: boolean;
    fechaCondicion?: string | null;
    fechaPublicacion?: string | null;
  } | null;
}): string {
  const lineas: string[] = [];

  lineas.push(`CUIT consultado: ${formatoCuit(data.cuit)}`);

  const razonSocial = data.arca?.datos?.datosGenerales?.razonSocial;
  const nombreCompuesto = [data.arca?.datos?.datosGenerales?.nombre, data.arca?.datos?.datosGenerales?.apellido]
    .filter(Boolean)
    .join(" ");
  const nombre = razonSocial || nombreCompuesto;
  if (nombre) lineas.push(`Nombre/Razón social (ARCA): ${nombre}`);

  const errorConstancia = data.arca?.datos?.errorConstancia?.error;
  if (errorConstancia && errorConstancia.length > 0) {
    lineas.push(
      `ALERTA GRAVE: la constancia de ARCA para este CUIT está limitada/cancelada. Motivo: ${errorConstancia.join(", ")}`
    );
  }

  const estadoClave = data.arca?.datos?.datosGenerales?.estadoClave;
  if (estadoClave) lineas.push(`Estado de clave (ARCA): ${estadoClave}`);

  const tipoPersona = data.arca?.datos?.datosGenerales?.tipoPersona;
  if (tipoPersona) lineas.push(`Tipo de persona: ${tipoPersona}`);

  const formaJuridica = data.padron13?.datos?.persona?.formaJuridica;
  if (formaJuridica) lineas.push(`Forma jurídica: ${formaJuridica}`);

  const antiguedad = calcularAntiguedad(data.padron13?.datos?.persona?.fechaContratoSocial);
  if (antiguedad) lineas.push(`Antigüedad: ${antiguedad}`);

  const domicilio = data.arca?.datos?.datosGenerales?.domicilioFiscal;
  if (domicilio?.localidad || domicilio?.descripcionProvincia) {
    lineas.push(`Domicilio fiscal: ${[domicilio.localidad, domicilio.descripcionProvincia].filter(Boolean).join(", ")}`);
  }

  const actividades = data.arca?.datos?.datosRegimenGeneral?.actividad ?? [];
  if (actividades.length > 0) {
    const principal = actividadPrincipal(actividades);
    if (principal) lineas.push(`Actividad principal: ${principal.descripcionActividad}`);
    const secundarias = actividadesSecundarias(actividades);
    if (secundarias.length > 0) {
      lineas.push(`Actividades secundarias: ${secundarias.map((a) => a.descripcionActividad).join("; ")}`);
    }
  }

  const categoriaMonotributo = data.arca?.datos?.datosMonotributo?.categoriaMonotributo?.descripcionCategoria;
  if (categoriaMonotributo) lineas.push(`Categoría de Monotributo: ${categoriaMonotributo}`);

  const impuestos = data.arca?.datos?.datosRegimenGeneral?.impuesto ?? [];
  if (impuestos.length > 0) {
    lineas.push(`Impuestos inscriptos: ${impuestos.map((i) => `${i.descripcionImpuesto} (${i.estadoImpuesto})`).join("; ")}`);
  }

  lineas.push("");
  lineas.push("--- SITUACIÓN CREDITICIA (BCRA - Central de Deudores) ---");

  if (data.bcra.deudasActuales) {
    const entidadesActuales = consolidarEntidadesActuales(data.bcra.deudasActuales.periodos);
    const situaciones = entidadesActuales.map((e) => e.situacion);
    const peorSituacion = situacionMasAlta(situaciones);
    const montoTotal = entidadesActuales.reduce((acc, e) => acc + e.monto, 0);
    const score = calcularScoreRadar(entidadesActuales);

    lineas.push(`Situación oficial BCRA (peor entidad): ${situacionConCodigo(peorSituacion)}`);
    if (score) lineas.push(`Score propio ponderado por monto: ${score.label}`);
    lineas.push(`Deuda total informada al sistema financiero: ${formatoMiles(montoTotal)}`);
    lineas.push(`Cantidad de entidades con deuda vigente: ${entidadesActuales.length}`);

    const desde = situacionDesde(data.bcra.deudasActuales.periodos);
    if (desde) lineas.push(`Permanece en esta situación desde: ${desde.desde}`);

    lineas.push("Detalle por entidad (nombre, situación, monto en miles de $):");
    for (const e of entidadesActuales.sort((a, b) => b.monto - a.monto)) {
      lineas.push(`- ${e.entidad}: situación ${situacionConCodigo(e.situacion)}, ${formatoMiles(e.monto)}`);
    }
  } else {
    lineas.push("No hay datos de deudas actuales disponibles.");
  }

  if (data.bcra.deudasHistoricas) {
    const evolucion = evolucionMensual(data.bcra.deudasHistoricas.periodos).slice(-12);
    if (evolucion.length > 0) {
      lineas.push("");
      lineas.push("Evolución de los últimos meses (peor situación y monto total por mes):");
      for (const p of evolucion) {
        lineas.push(`- ${formatoPeriodo(p.periodo)}: situación ${situacionConCodigo(p.situacion)}, ${formatoMiles(p.monto)}`);
      }
    }
  }

  if (data.bcra.errores.length > 0) {
    lineas.push(`Nota: hubo errores parciales al consultar BCRA: ${data.bcra.errores.join(", ")}`);
  }

  lineas.push("");
  lineas.push("--- CHEQUES RECHAZADOS ---");
  if (data.bcra.chequesRechazados && data.bcra.chequesRechazados.causales.length > 0) {
    const resumen = resumenTotalCheques(data.bcra.chequesRechazados.causales);
    const porTipo = resumenPorTipoRechazo(data.bcra.chequesRechazados.causales);
    lineas.push(
      `Total: ${resumen.totalCantidad} cheques rechazados por ${formatoMiles(resumen.totalMonto)}, de los cuales ${resumen.abonadosCantidad} ya fueron abonados (${resumen.porcentajeMonto.toFixed(0)}% del monto).`
    );
    if (porTipo.sinFondos.cantidad > 0) lineas.push(`- Sin fondos: ${porTipo.sinFondos.cantidad} cheques, ${formatoMiles(porTipo.sinFondos.monto)}`);
    if (porTipo.defectosFormales.cantidad > 0) lineas.push(`- Defectos formales: ${porTipo.defectosFormales.cantidad} cheques, ${formatoMiles(porTipo.defectosFormales.monto)}`);
    if (porTipo.aLaRegistracion.cantidad > 0) lineas.push(`- A la registración: ${porTipo.aLaRegistracion.cantidad} cheques, ${formatoMiles(porTipo.aLaRegistracion.monto)}`);
  } else {
    lineas.push("Sin cheques rechazados registrados.");
  }

  lineas.push("");
  lineas.push("--- BASE DE APÓCRIFOS (ARCA) ---");
  if (data.apoc?.ok) {
    lineas.push(
      esApocrifoConfirmado(data.apoc)
        ? `ALERTA GRAVE: el CUIT figura publicado como apócrifo por ARCA (condición: ${data.apoc.fechaCondicion ?? "s/d"}, publicación: ${data.apoc.fechaPublicacion ?? "s/d"}).`
        : "Sin antecedentes de apócrifos."
    );
  } else {
    lineas.push("No se pudo verificar la base de apócrifos.");
  }

  return lineas.join("\n");
}


export function formatoPeriodo(periodo: string): string {
  if (!periodo || periodo.length < 6) return periodo;
  const anio = periodo.slice(0, 4);
  const mes = periodo.slice(4, 6);
  return `${mes}/${anio}`;
}

export function formatoCuit(cuit: string) {
  if (cuit.length !== 11) return cuit;
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
}

const MESES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * A partir del historico ordenado de periodos (mas reciente primero), calcula
 * desde que periodo el deudor esta de forma ininterrumpida en la situacion
 * actual (la peor situacion de cada periodo). Replica el texto que muestra
 * la web del BCRA: "permanece en Situación X desde: MM.AAAA".
 */
export function situacionDesde(
  periodos: { periodo: string; entidades: { situacion: number }[] }[]
): { situacion: number; desde: string } | null {
  if (periodos.length === 0) return null;

  const ordenados = [...periodos].sort((a, b) => b.periodo.localeCompare(a.periodo));
  const peorPorPeriodo = ordenados.map((p) => ({
    periodo: p.periodo,
    situacion: situacionMasAlta(p.entidades.map((e) => e.situacion)),
  }));

  const actual = peorPorPeriodo[0].situacion;
  let desde = peorPorPeriodo[0].periodo;

  for (const p of peorPorPeriodo) {
    if (p.situacion === actual) {
      desde = p.periodo;
    } else {
      break;
    }
  }

  const mes = parseInt(desde.slice(4, 6), 10);
  const anio = desde.slice(0, 4);

  return { situacion: actual, desde: `${MESES_LARGO[mes - 1]} de ${anio}` };
}
