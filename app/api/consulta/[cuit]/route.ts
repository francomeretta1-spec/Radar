import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ConsultaCompleta,
  DeudasActuales,
  DeudasHistoricas,
  ChequesRechazados,
  ArcaDatos,
  Padron13Datos,
  ApocDatos,
} from "@/lib/api/types";

const BCRA_BASE = process.env.BCRA_API_URL || "https://api.bcra.gob.ar";
const ARCANUM_URL = process.env.ARCANUM_URL;
const ARCANUM_API_KEY = process.env.ARCANUM_API_KEY;
const ARCANUM_CUIT = process.env.ARCANUM_CUIT;

function limpiarCuit(raw: string) {
  return raw.replace(/[^0-9]/g, "");
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    const body = await res.json();
    if (!res.ok) {
      const msg = body?.errorMessages?.join(", ") || body?.error || `Error ${res.status}`;
      return { data: null, error: msg };
    }
    return { data: body, error: null };
  } catch {
    return { data: null, error: "No se pudo conectar con el servicio." };
  }
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function pickDate(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findFirstRecordByKey(root: unknown, wantedKeys: string[], depth = 0): Record<string, unknown> | undefined {
  if (depth > 8 || !isRecord(root)) return undefined;

  for (const key of wantedKeys) {
    const value = root[key];
    if (isRecord(value)) return value;
  }

  for (const value of Object.values(root)) {
    const found = findFirstRecordByKey(value, wantedKeys, depth + 1);
    if (found) return found;
  }

  return undefined;
}

function findPublicacionesApoc(root: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 8 || root === null || root === undefined) return [];

  if (Array.isArray(root)) {
    return root.flatMap((item) => findPublicacionesApoc(item, depth + 1));
  }

  if (!isRecord(root)) return [];

  const direct =
    root.PublicacionAPOC ??
    root.publicacionAPOC ??
    root.publicacionesAPOC ??
    root.publicacionesApoc;

  if (direct) {
    return toArray(direct).filter(isRecord);
  }

  const looksLikePublication =
    "Cuit" in root ||
    "CUIT" in root ||
    "cuit" in root ||
    "FechaCondicion" in root ||
    "fechaCondicion" in root ||
    "FechaPublicacion" in root ||
    "fechaPublicacion" in root;

  if (looksLikePublication) return [root];

  for (const value of Object.values(root)) {
    const found = findPublicacionesApoc(value, depth + 1);
    if (found.length > 0) return found;
  }

  return [];
}

function normalizarApoc(raw: unknown, cuit: string): ApocDatos | null {
  if (!raw || typeof raw !== "object") return null;

  const root = raw as Record<string, unknown>;

  // Formato ya normalizado por Arcanum: { ok, cuit, esApocrifo, ... }
  if ("esApocrifo" in root || "fechaCondicion" in root || "fechaPublicacion" in root) {
    const fechaCondicion = pickDate(root.fechaCondicion, root.FechaCondicion);
    const fechaPublicacion = pickDate(root.fechaPublicacion, root.FechaPublicacion);
    return {
      ok: root.ok !== false,
      cuit: pickString(root.cuit, root.CUIT, root.Cuit) ?? cuit,
      esApocrifo: Boolean(root.esApocrifo) || !!fechaCondicion || !!fechaPublicacion,
      codigo: pickString(root.codigo, root.Codigo),
      descripcion: pickString(root.descripcion, root.Descripcion),
      fechaCondicion,
      fechaPublicacion,
      detalle: pickString(root.detalle, root.Detalle) ?? null,
      raw,
    };
  }

  const wsResult =
    findFirstRecordByKey(root, [
      "GetPublicacionAPOCResult",
      "getPublicacionAPOCResult",
      "GetPublicacionAPOCResponse",
      "getPublicacionAPOCResponse",
      "GetAllResult",
      "getAllResult",
    ]) ?? root;

  const publicaciones = findPublicacionesApoc(wsResult);
  const publicacion = publicaciones[0];

  const fechaCondicion = pickDate(publicacion?.FechaCondicion, publicacion?.fechaCondicion);
  const fechaPublicacion = pickDate(publicacion?.FechaPublicacion, publicacion?.fechaPublicacion);

  return {
    ok: true,
    cuit: pickString(publicacion?.Cuit, publicacion?.CUIT, publicacion?.cuit) ?? cuit,
    esApocrifo: publicaciones.length > 0 || !!fechaCondicion || !!fechaPublicacion,
    codigo: pickString(wsResult.codigo, wsResult.Codigo, root.codigo, root.Codigo),
    descripcion: pickString(
      wsResult.descripcion,
      wsResult.Descripcion,
      root.descripcion,
      root.Descripcion,
      publicacion?.Descripcion,
      publicacion?.descripcion
    ),
    fechaCondicion,
    fechaPublicacion,
    detalle: pickString(publicacion?.Descripcion, publicacion?.descripcion) ?? null,
    raw,
  };
}

function arcaTieneAlertaApocONoConfiable(arca: ArcaDatos | null): string | null {
  const mensajes = arca?.datos?.errorConstancia?.error;
  if (!mensajes || mensajes.length === 0) return null;

  const texto = mensajes.join(" | ");
  const normalizado = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const esAlertaGrave =
    normalizado.includes("apocrif") ||
    normalizado.includes("no confiable") ||
    normalizado.includes("rg afip 3832") ||
    normalizado.includes("cuit limitada") ||
    normalizado.includes("cuit cancelada");

  return esAlertaGrave ? texto : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cuit: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { cuit: rawCuit } = await params;
  const cuit = limpiarCuit(rawCuit);

  if (cuit.length !== 11) {
    return NextResponse.json(
      { error: "El CUIT debe tener 11 dígitos." },
      { status: 400 }
    );
  }

  const erroresBcra: string[] = [];

  const [actuales, historicas, cheques] = await Promise.all([
    fetchJson<{ status: number; results: DeudasActuales }>(
      `${BCRA_BASE}/CentralDeDeudores/v1.0/Deudas/${cuit}`
    ),
    fetchJson<{ status: number; results: DeudasHistoricas }>(
      `${BCRA_BASE}/CentralDeDeudores/v1.0/Deudas/Historicas/${cuit}`
    ),
    fetchJson<{ status: number; results: ChequesRechazados }>(
      `${BCRA_BASE}/CentralDeDeudores/v1.0/Deudas/ChequesRechazados/${cuit}`
    ),
  ]);

  if (actuales.error) erroresBcra.push(`Deudas actuales: ${actuales.error}`);
  if (historicas.error) erroresBcra.push(`Histórico: ${historicas.error}`);
  if (cheques.error) erroresBcra.push(`Cheques rechazados: ${cheques.error}`);

  let arca: ArcaDatos | null = null;
  let arcaError: string | null = null;
  let padron13: Padron13Datos | null = null;
  let padron13Error: string | null = null;
  let apoc: ApocDatos | null = null;
  let apocError: string | null = null;

  if (ARCANUM_URL && ARCANUM_API_KEY && ARCANUM_CUIT) {
    const headers = { "X-API-Key": ARCANUM_API_KEY };

    const [arcaResult, padron13Result, apocResult] = await Promise.all([
      fetchJson<ArcaDatos>(
        `${ARCANUM_URL}/api/padron/a5/${cuit}?cuit=${ARCANUM_CUIT}`,
        { headers }
      ),
      fetchJson<Padron13Datos>(
        `${ARCANUM_URL}/api/padron/a13/${cuit}?cuit=${ARCANUM_CUIT}`,
        { headers }
      ),
      fetchJson<unknown>(
        `${ARCANUM_URL}/api/apoc/${cuit}?cuit=${ARCANUM_CUIT}`,
        { headers }
      ),
    ]);

    if (arcaResult.data) {
      arca = arcaResult.data;
    } else {
      arcaError = arcaResult.error;
    }

    if (padron13Result.data) {
      padron13 = padron13Result.data;
    } else {
      padron13Error = padron13Result.error;
    }

    if (apocResult.data) {
      apoc = normalizarApoc(apocResult.data, cuit);
      if (!apoc) apocError = "ARCA respondió, pero no se pudo interpretar la base de apócrifos.";
    } else {
      apocError = apocResult.error;
    }

    // Fallback clave: hay CUIT que el padrón A5 informa como "CUIT LIMITADA",
    // "Base Contribuyentes NO Confiable" o RG AFIP 3832/16. En la práctica
    // el usuario lo interpreta como antecedente apócrifo/no confiable aunque
    // el endpoint WSAPOC pueda no traer PublicacionAPOC. No debemos mostrar
    // "sin antecedentes" si ARCA ya devolvió esa alerta grave.
    const alertaArcaApoc = arcaTieneAlertaApocONoConfiable(arca);
    if (alertaArcaApoc && !apoc?.esApocrifo) {
      apoc = {
        ok: true,
        cuit,
        esApocrifo: true,
        descripcion: "CUIT limitada/cancelada o incluida en base no confiable según ARCA",
        fechaCondicion: null,
        fechaPublicacion: null,
        detalle: alertaArcaApoc,
        raw: apoc?.raw,
      };
      apocError = null;
    }
  } else {
    arcaError = "Arcanum no está configurado.";
    padron13Error = arcaError;
    apocError = arcaError;
  }

  const respuesta: ConsultaCompleta = {
    cuit,
    bcra: {
      deudasActuales: actuales.data?.results ?? null,
      deudasHistoricas: historicas.data?.results ?? null,
      chequesRechazados: cheques.data?.results ?? null,
      errores: erroresBcra,
    },
    arca,
    arcaError,
    padron13,
    padron13Error,
    apoc,
    apocError,
  };

  return NextResponse.json(respuesta);
}
