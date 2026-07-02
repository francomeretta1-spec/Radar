export type SituacionBCRA = {
  periodo: string;
  entidades: {
    entidad: string;
    situacion: number;
    monto: number;
    diasAtrasoPago?: number;
  }[];
};

export type DeudasActuales = {
  identificacion: string;
  denominacion: string;
  periodos: SituacionBCRA[];
};

export type DeudasHistoricas = {
  identificacion: string;
  denominacion: string;
  periodos: SituacionBCRA[];
};

export type ChequeRechazado = {
  causal: string;
  entidades: {
    entidad: number;
    detalle: {
      nroCheque: number;
      fechaRechazo: string;
      monto: number;
      fechaPago: string | null;
      fechaPagoMulta: string | null;
      estadoMulta: string;
      enRevision: boolean;
      procesoJud: boolean;
    }[];
  }[];
};

export type ChequesRechazados = {
  identificacion: string;
  denominacion: string;
  causales: ChequeRechazado[];
};

export type ArcaDatos = {
  ok: boolean;
  cuit: string;
  datos?: {
    // Cuando el CUIT está limitado/cancelado por ARCA (ej. incluido en la
    // Base de Contribuyentes NO Confiable, RG AFIP 3832/16), el padrón A5
    // no devuelve `datosGenerales` sino este bloque con el motivo. Es una
    // alerta grave para el análisis crediticio y hay que mostrarla, no
    // descartarla en silencio.
    errorConstancia?: {
      error?: string[];
      idPersona?: string;
    };
    datosGenerales?: {
      razonSocial?: string;
      nombre?: string;
      apellido?: string;
      tipoPersona?: string;
      estadoClave?: string;
      domicilioFiscal?: {
        direccion?: string;
        localidad?: string;
        descripcionProvincia?: string;
        codPostal?: string;
      };
    };
    datosRegimenGeneral?: {
      actividad?: { descripcionActividad: string; idActividad: string; orden?: number | string }[];
      impuesto?: { descripcionImpuesto: string; estadoImpuesto: string }[];
    };
    datosMonotributo?: {
      actividad?: { descripcionActividad: string };
      categoriaMonotributo?: { descripcionCategoria: string };
    };
  };
  error?: string;
};

// Padrón Alcance 13 ("Mi Categoría") — datos complementarios: antigüedad,
// forma jurídica, cierre de ejercicio. No trae categoría de Monotributo
// salvo que el sujeto sea persona física/monotributista.
export type Padron13Datos = {
  ok: boolean;
  alcance: string;
  cuit: string;
  datos?: {
    persona?: {
      estadoClave?: string;
      fechaContratoSocial?: string;
      formaJuridica?: string;
      mesCierre?: string;
      periodoActividadPrincipal?: string;
      descripcionActividadPrincipal?: string;
      categoriaMonotributo?: string;
    };
  };
  error?: string;
};

// Base de Apócrifos (WSAPOC) — verifica si el CUIT figura publicado por
// ARCA como apócrifo (alerta grave para el análisis crediticio).
export type ApocDatos = {
  ok: boolean;
  cuit: string;
  esApocrifo: boolean;
  codigo?: string;
  descripcion?: string;
  fechaCondicion?: string | null;
  fechaPublicacion?: string | null;
  detalle?: string | null;
  error?: string;
  raw?: unknown;
};

export type ConsultaCompleta = {
  cuit: string;
  bcra: {
    deudasActuales: DeudasActuales | null;
    deudasHistoricas: DeudasHistoricas | null;
    chequesRechazados: ChequesRechazados | null;
    errores: string[];
  };
  arca: ArcaDatos | null;
  arcaError: string | null;
  padron13: Padron13Datos | null;
  padron13Error: string | null;
  apoc: ApocDatos | null;
  apocError: string | null;
};

