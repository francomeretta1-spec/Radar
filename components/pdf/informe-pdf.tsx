import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ConsultaCompleta } from "@/lib/api/types";
import {
  SITUACIONES_BCRA,
  situacionMasAlta,
  situacionDesde,
  situacionConCodigo,
  calcularAntiguedad,
  formatoFecha,
  esApocrifoConfirmado,
  actividadPrincipal,
  actividadesSecundarias,
  calcularScoreRadar,
  consolidarEntidadesActuales,
  entidadesPorBanco,
  resumenPorTipoRechazo,
  resumenTotalCheques,
  resumenPorBancoDetallado,
  formatoMiles,
  formatoCuit,
  formatoPeriodo,
} from "@/lib/risk";

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&ordm;/g, "º")
    .replace(/&amp;/g, "&");
}

const COLOR = {
  ink: "#141c24",
  muted: "#5c6b7a",
  faint: "#8a9bac",
  border: "#dbe3ec",
  surface: "#eef3f9",
  radar: "#1d4ed8",
  ok: "#1f9c46",
  okBg: "#e8f6ec",
  warn: "#a8740a",
  warnBg: "#fdf3da",
  danger: "#c23434",
  dangerBg: "#fbe9e9",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: COLOR.ink,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  brand: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  brandSub: {
    fontSize: 8,
    color: COLOR.muted,
    marginTop: 2,
  },
  metaDate: {
    fontSize: 8,
    color: COLOR.muted,
    textAlign: "right",
  },
  headerCard: {
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 7.5,
    color: COLOR.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  h1: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  cuitLine: {
    fontSize: 9.5,
    color: COLOR.muted,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  desdeText: {
    fontSize: 8,
    color: COLOR.muted,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: 6,
    padding: 10,
    marginRight: 10,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  statLabel: {
    fontSize: 7,
    color: COLOR.muted,
    marginTop: 2,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    color: COLOR.radar,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: 6,
    padding: 12,
  },
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  field: {
    width: "50%",
    marginBottom: 8,
    paddingRight: 8,
  },
  fieldFull: {
    width: "100%",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 7.5,
    color: COLOR.faint,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
  },
  tag: {
    fontSize: 7.5,
    backgroundColor: COLOR.surface,
    color: COLOR.muted,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 3,
    marginRight: 4,
    marginBottom: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.border,
  },
  th: {
    fontSize: 7.5,
    color: COLOR.faint,
    textTransform: "uppercase",
  },
  td: {
    fontSize: 8.5,
  },
  colEntidad: { width: "35%" },
  colPeriodo: { width: "15%" },
  colSituacion: { width: "25%" },
  colMonto: { width: "25%", textAlign: "right" },
  colCheque: { width: "20%" },
  colFecha: { width: "25%" },
  colMulta: { width: "30%" },
  colMontoCheque: { width: "25%", textAlign: "right" },
  bar: {
    height: 14,
    flexDirection: "row",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  barLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    marginBottom: 3,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 3,
  },
  legendText: {
    fontSize: 7.5,
    color: COLOR.muted,
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    fontSize: 7,
    color: COLOR.faint,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: COLOR.border,
    paddingTop: 8,
  },
  warningBox: {
    fontSize: 7.5,
    color: COLOR.muted,
    marginTop: 4,
  },
  alertaBanner: {
    borderWidth: 1,
    borderColor: COLOR.danger,
    backgroundColor: COLOR.dangerBg,
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
});

const COLORES_ENTIDAD = [
  "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#0ea5e9", "#38bdf8", "#7dd3fc",
];
const COLOR_OTROS = "#94a3b8";
const MAX_SLICES_PDF = 7;

function nivelColorPdf(nivel: "ok" | "warn" | "danger") {
  return {
    ok: { fg: COLOR.ok, bg: COLOR.okBg },
    warn: { fg: COLOR.warn, bg: COLOR.warnBg },
    danger: { fg: COLOR.danger, bg: COLOR.dangerBg },
  }[nivel];
}

export function InformeRadarPDF({ data }: { data: ConsultaCompleta }) {
  const { bcra, arca, arcaError, padron13, apoc, cuit } = data;

  const antiguedad = calcularAntiguedad(padron13?.datos?.persona?.fechaContratoSocial);
  const fechaContratoSocial = formatoFecha(padron13?.datos?.persona?.fechaContratoSocial);
  const formaJuridica = padron13?.datos?.persona?.formaJuridica;
  const mesCierre = padron13?.datos?.persona?.mesCierre;

  const actividadesArca = arca?.datos?.datosRegimenGeneral?.actividad ?? [];
  const actividadPrincipalArca = actividadPrincipal(actividadesArca);
  const actividadesSecundariasArca = actividadesSecundarias(actividadesArca);

  const entidadesActuales = bcra.deudasActuales
    ? consolidarEntidadesActuales(bcra.deudasActuales.periodos)
    : [];
  const periodoMasReciente = bcra.deudasActuales
    ? [...bcra.deudasActuales.periodos].sort((a, b) => b.periodo.localeCompare(a.periodo))[0]?.periodo
    : null;

  const situaciones = entidadesActuales.map((e) => e.situacion);
  const peorSituacion = situacionMasAlta(situaciones);
  const infoSituacion = SITUACIONES_BCRA[peorSituacion] ?? SITUACIONES_BCRA[1];
  const colorSituacion = nivelColorPdf(infoSituacion.nivel);

  const scoreRadar = calcularScoreRadar(entidadesActuales);
  const infoScoreRadar = scoreRadar
    ? SITUACIONES_BCRA[scoreRadar.redondeado] ?? SITUACIONES_BCRA[1]
    : null;
  const colorScoreRadar = infoScoreRadar ? nivelColorPdf(infoScoreRadar.nivel) : null;

  const desdeInfo = bcra.deudasHistoricas
    ? situacionDesde(bcra.deudasHistoricas.periodos)
    : null;

  const endeudamientoTotal = entidadesActuales.reduce((acc, e) => acc + e.monto, 0);
  const cantidadEntidades = entidadesActuales.length;
  const esApocrifo = apoc?.ok ? esApocrifoConfirmado(apoc) : false;

  const estadoClave =
    arca?.datos?.datosGenerales?.estadoClave ?? padron13?.datos?.persona?.estadoClave;
  const errorConstancia = arca?.datos?.errorConstancia?.error;

  const entidadesPeorSituacion = entidadesActuales.filter((e) => e.situacion === peorSituacion);
  const montoPeorSituacion = entidadesPeorSituacion.reduce((acc, e) => acc + e.monto, 0);
  const situacionEsMarginal =
    peorSituacion > 1 &&
    endeudamientoTotal > 0 &&
    montoPeorSituacion / endeudamientoTotal < 0.01;
  const notaSituacionMarginal = situacionEsMarginal
    ? `Determinado por ${entidadesPeorSituacion
        .map((e) => e.entidad)
        .join(", ")} (${formatoMiles(montoPeorSituacion)} · ${(
        (montoPeorSituacion / endeudamientoTotal) *
        100
      ).toFixed(2)}% del total). El BCRA toma la peor situación entre todas las entidades, sin importar el monto.`
    : null;

  const denominacion =
    arca?.datos?.datosGenerales?.razonSocial ||
    [arca?.datos?.datosGenerales?.nombre, arca?.datos?.datosGenerales?.apellido]
      .filter(Boolean)
      .join(" ") ||
    bcra.deudasActuales?.denominacion ||
    "—";

  const cantidadChequesRechazados =
    bcra.chequesRechazados?.causales.reduce(
      (acc, c) => acc + c.entidades.reduce((a, e) => a + e.detalle.length, 0),
      0
    ) ?? 0;

  const resumenTipoRechazoPdf = bcra.chequesRechazados
    ? resumenPorTipoRechazo(bcra.chequesRechazados.causales)
    : null;
  const resumenTotalPdf = bcra.chequesRechazados
    ? resumenTotalCheques(bcra.chequesRechazados.causales)
    : null;
  const resumenBancosPdf = bcra.chequesRechazados
    ? resumenPorBancoDetallado(bcra.chequesRechazados.causales)
    : [];

  const entidadesOrdenadas = [...entidadesActuales].sort((a, b) => b.monto - a.monto);

  // Para el gráfico de distribución agrupamos las entidades menores en
  // "Otros": con muchas entidades la barra y la leyenda se vuelven
  // ilegibles (segmentos finísimos y texto superpuesto).
  const entidadesParaDistribucion =
    entidadesOrdenadas.length > MAX_SLICES_PDF + 1
      ? [
          ...entidadesOrdenadas.slice(0, MAX_SLICES_PDF),
          {
            entidad: `Otros (${entidadesOrdenadas.length - MAX_SLICES_PDF} entidades)`,
            situacion: 0,
            monto: entidadesOrdenadas
              .slice(MAX_SLICES_PDF)
              .reduce((acc, e) => acc + e.monto, 0),
          },
        ]
      : entidadesOrdenadas;

  const fechaGeneracion = new Date().toLocaleString("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <Document title={`Radar — Informe ${formatoCuit(cuit)}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brand}>Radar</Text>
            <Text style={styles.brandSub}>
              Situación fiscal y crediticia — BCRA / ARCA
            </Text>
          </View>
          <Text style={styles.metaDate}>Generado el {fechaGeneracion}</Text>
        </View>

        <View style={styles.headerCard}>
          <Text style={[styles.eyebrow, { color: COLOR.radar, fontSize: 9, fontFamily: "Helvetica-Bold" }]}>
            Informe individual
          </Text>
          <Text style={styles.h1}>{denominacion}</Text>
          <Text style={styles.cuitLine}>CUIT {formatoCuit(cuit)}</Text>
          <View style={styles.badgeRow}>
            {scoreRadar && infoScoreRadar && colorScoreRadar ? (
              <Text
                style={[
                  styles.badge,
                  { color: colorScoreRadar.fg, backgroundColor: colorScoreRadar.bg },
                ]}
              >
                Score Radar · {scoreRadar.label}
              </Text>
            ) : (
              <Text
                style={[
                  styles.badge,
                  { color: colorSituacion.fg, backgroundColor: colorSituacion.bg },
                ]}
              >
                {peorSituacion} · {infoSituacion.label}
              </Text>
            )}
          </View>
        </View>

        {errorConstancia && errorConstancia.length > 0 && (
          <View style={styles.alertaBanner}>
            <Text
              style={{
                fontSize: 9,
                fontFamily: "Helvetica-Bold",
                color: COLOR.danger,
                marginBottom: 3,
              }}
            >
              ⚠ CUIT limitada o cancelada por ARCA
            </Text>
            {errorConstancia.map((msg, i) => (
              <Text key={i} style={{ fontSize: 8, color: COLOR.danger }}>
                {msg}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.eyebrow}>BCRA · Situación oficial</Text>
            <Text style={[styles.statValue, { color: colorSituacion.fg }]}>
              {peorSituacion} · {infoSituacion.corto}
            </Text>
            {notaSituacionMarginal ? (
              <Text
                style={[
                  styles.statLabel,
                  { color: COLOR.warn, fontSize: 6.5, marginTop: 2, lineHeight: 1.3 },
                ]}
              >
                ⚠ {notaSituacionMarginal}
              </Text>
            ) : (
              <Text style={styles.statLabel}>Última calificación, peor entidad</Text>
            )}
          </View>
          <View style={[styles.statCard, { marginRight: 0 }]}>
            <Text style={styles.eyebrow}>Radar · Score propio</Text>
            <Text
              style={[
                styles.statValue,
                { color: colorScoreRadar ? colorScoreRadar.fg : COLOR.muted },
              ]}
            >
              {scoreRadar ? scoreRadar.label : "—"}
            </Text>
            <Text style={styles.statLabel}>Promedio ponderado por monto</Text>
            <Text style={[styles.statLabel, { fontSize: 6.5, marginTop: 4, lineHeight: 1.3 }]}>
              Cálculo propio (no oficial), pondera por monto adeudado para evitar que deudas
              mínimas dominen el resultado. La situación oficial del BCRA sigue siendo la que
              corresponde reportar ante terceros.
            </Text>
          </View>
        </View>

        {desdeInfo && (
          <View style={{ marginTop: -6, marginBottom: 12 }}>
            <Text style={styles.desdeText}>
              Permanece en esta situación de forma ininterrumpida desde {desdeInfo.desde}{" "}
              (dentro de los últimos 24 meses disponibles).
              {antiguedad
                ? ` · ${formaJuridica ? formaJuridica + ", " : ""}con ${antiguedad} de antigüedad.`
                : ""}
            </Text>
          </View>
        )}

        <View style={[styles.statsRow, { marginBottom: 10 }]}>
          <View style={styles.statCard}>
            <Text style={styles.eyebrow}>ARCA · Estado de clave</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color: estadoClave === "ACTIVO" ? COLOR.ok : estadoClave ? COLOR.danger : COLOR.ink,
                },
              ]}
            >
              {estadoClave ?? "—"}
            </Text>
            <Text style={styles.statLabel}>Padrón de contribuyentes</Text>
          </View>
          <View style={[styles.statCard, { marginRight: 0 }]}>
            <Text style={styles.eyebrow}>ARCA · Apócrifos</Text>
            <Text
              style={[
                styles.statValue,
                { color: apoc?.ok ? (esApocrifo ? COLOR.danger : COLOR.ok) : COLOR.muted },
              ]}
            >
              {apoc?.ok ? (esApocrifo ? "Sí" : "No") : "—"}
            </Text>
            <Text style={styles.statLabel}>
              {apoc?.ok ? (esApocrifo ? "Publicado" : "Sin antecedentes") : "Sin verificar"}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.eyebrow}>BCRA · Endeudamiento total</Text>
            <Text style={styles.statValue}>
              {entidadesActuales.length > 0 ? formatoMiles(endeudamientoTotal) : "Sin datos"}
            </Text>
            <Text style={styles.statLabel}>Sistema financiero, último período por entidad</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.eyebrow}>BCRA · Entidades</Text>
            <Text style={styles.statValue}>{cantidadEntidades}</Text>
            <Text style={styles.statLabel}>Con deuda vigente</Text>
          </View>
          <View style={[styles.statCard, { marginRight: 0 }]}>
            <Text style={styles.eyebrow}>BCRA · Cheques rechazados</Text>
            <Text
              style={[
                styles.statValue,
                { color: cantidadChequesRechazados > 0 ? COLOR.danger : COLOR.ink },
              ]}
            >
              {cantidadChequesRechazados}
            </Text>
            <Text style={styles.statLabel}>Registrados en BCRA</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARCA — Datos fiscales</Text>
          <View style={styles.sectionCard}>
            {arca?.ok && arca.datos?.datosGenerales ? (
              <>
                <View style={styles.fieldGrid}>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Estado de clave</Text>
                    <Text style={styles.fieldValue}>
                      {arca.datos.datosGenerales?.estadoClave ?? "—"}
                    </Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Tipo de persona</Text>
                    <Text style={styles.fieldValue}>
                      {formaJuridica
                        ? formaJuridica
                        : arca.datos.datosGenerales?.tipoPersona === "FISICA"
                        ? "Persona física"
                        : arca.datos.datosGenerales?.tipoPersona === "JURIDICA"
                        ? "Persona jurídica"
                        : "—"}
                    </Text>
                  </View>
                  {antiguedad && (
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Antigüedad</Text>
                      <Text style={styles.fieldValue}>{antiguedad}</Text>
                    </View>
                  )}
                  {fechaContratoSocial && (
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Fecha de contrato social</Text>
                      <Text style={styles.fieldValue}>{fechaContratoSocial}</Text>
                    </View>
                  )}
                  {mesCierre && (
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Cierre de ejercicio</Text>
                      <Text style={styles.fieldValue}>Mes {mesCierre.padStart(2, "0")}</Text>
                    </View>
                  )}
                  <View style={styles.fieldFull}>
                    <Text style={styles.fieldLabel}>Domicilio fiscal</Text>
                    <Text style={styles.fieldValue}>
                      {arca.datos.datosGenerales?.domicilioFiscal
                        ? decodeHtmlEntities(
                            `${arca.datos.datosGenerales.domicilioFiscal.direccion ?? ""}, ${
                              arca.datos.datosGenerales.domicilioFiscal.localidad ?? ""
                            } (${arca.datos.datosGenerales.domicilioFiscal.codPostal ?? ""}), ${
                              arca.datos.datosGenerales.domicilioFiscal.descripcionProvincia ?? ""
                            }`
                          )
                        : "—"}
                    </Text>
                  </View>
                  {arca.datos.datosMonotributo?.categoriaMonotributo && (
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Monotributo</Text>
                      <Text style={styles.fieldValue}>
                        Categoría {arca.datos.datosMonotributo.categoriaMonotributo.descripcionCategoria}
                      </Text>
                    </View>
                  )}
                  {actividadPrincipalArca && (
                    <View style={styles.fieldFull}>
                      <Text style={styles.fieldLabel}>Actividad principal</Text>
                      <Text style={styles.fieldValue}>
                        {actividadPrincipalArca.idActividad} ·{" "}
                        {decodeHtmlEntities(actividadPrincipalArca.descripcionActividad)}
                      </Text>
                      {actividadesSecundariasArca.length > 0 && (
                        <View style={{ marginTop: 4 }}>
                          <Text style={styles.fieldLabel}>
                            Actividades secundarias ({actividadesSecundariasArca.length})
                          </Text>
                          <View style={styles.tagRow}>
                            {actividadesSecundariasArca.map((a, idx) => (
                              <Text key={idx} style={styles.tag}>
                                {a.idActividad} · {decodeHtmlEntities(a.descripcionActividad)}
                              </Text>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                {arca.datos.datosRegimenGeneral?.impuesto &&
                  arca.datos.datosRegimenGeneral.impuesto.filter((i) => i.estadoImpuesto === "AC")
                    .length > 0 && (
                    <View>
                      <Text style={styles.fieldLabel}>
                        Impuestos activos (
                        {
                          arca.datos.datosRegimenGeneral.impuesto.filter(
                            (i) => i.estadoImpuesto === "AC"
                          ).length
                        }
                        )
                      </Text>
                      <View style={styles.tagRow}>
                        {arca.datos.datosRegimenGeneral.impuesto
                          .filter((i) => i.estadoImpuesto === "AC")
                          .map((i, idx) => (
                            <Text key={idx} style={styles.tag}>
                              {decodeHtmlEntities(i.descripcionImpuesto)}
                            </Text>
                          ))}
                      </View>
                    </View>
                  )}
              </>
            ) : errorConstancia && errorConstancia.length > 0 ? (
              <Text style={{ fontSize: 9, color: COLOR.danger }}>
                ARCA no devuelve datos fiscales normales para este CUIT: está limitado o
                cancelado (ver alerta al inicio del informe). Los datos de antigüedad, forma
                jurídica y cierre de ejercicio provienen del padrón A13, que sí respondió.
              </Text>
            ) : (
              <Text style={{ fontSize: 9, color: COLOR.muted }}>
                No se pudieron obtener datos de ARCA{arcaError ? `: ${arcaError}` : "."}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARCA — Verificación de apócrifos</Text>
          <View style={styles.sectionCard}>
            {apoc?.ok ? (
              <View>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <Text
                    style={[
                      styles.badge,
                      esApocrifo
                        ? { color: COLOR.danger, backgroundColor: COLOR.dangerBg }
                        : { color: COLOR.ok, backgroundColor: COLOR.okBg },
                    ]}
                  >
                    {esApocrifo ? "Publicado como apócrifo" : "Sin antecedentes de apócrifos"}
                  </Text>
                  {esApocrifo && (
                    <View style={{ marginLeft: 8 }}>
                      {apoc.fechaCondicion && (
                        <Text style={{ fontSize: 8, color: COLOR.muted }}>
                          Condición detectada: {apoc.fechaCondicion}
                        </Text>
                      )}
                      {apoc.fechaPublicacion && (
                        <Text style={{ fontSize: 8, color: COLOR.muted }}>
                          Publicado: {apoc.fechaPublicacion}
                        </Text>
                      )}
                      {apoc.detalle && (
                        <Text style={{ fontSize: 8, color: COLOR.muted }}>{apoc.detalle}</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 9, color: COLOR.muted }}>
                No se pudo verificar la base de apócrifos.
              </Text>
            )}
          </View>
        </View>

        {entidadesOrdenadas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BCRA — Detalle por entidad</Text>
            <View style={styles.sectionCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, styles.colEntidad]}>Entidad</Text>
                <Text style={[styles.th, styles.colPeriodo]}>Período</Text>
                <Text style={[styles.th, styles.colSituacion]}>Situación</Text>
                <Text style={[styles.th, styles.colMonto]}>Monto</Text>
              </View>
              <View>
                {entidadesOrdenadas.map((e, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.td, styles.colEntidad]}>{e.entidad}</Text>
                    <Text style={[styles.td, styles.colPeriodo]}>
                      {formatoPeriodo(e.periodo)}
                      {periodoMasReciente && e.periodo !== periodoMasReciente ? " *" : ""}
                    </Text>
                    <Text style={[styles.td, styles.colSituacion]}>
                      {situacionConCodigo(e.situacion)}
                    </Text>
                    <Text style={[styles.td, styles.colMonto]}>{formatoMiles(e.monto)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {entidadesOrdenadas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BCRA — Distribución de deuda por entidad</Text>
            <View style={styles.sectionCard}>
              <View style={styles.bar}>
                {entidadesParaDistribucion.map((e, i) => (
                  <View
                    key={i}
                    style={{
                      width: `${(e.monto / endeudamientoTotal) * 100}%`,
                      backgroundColor: e.entidad.startsWith("Otros")
                        ? COLOR_OTROS
                        : COLORES_ENTIDAD[i % COLORES_ENTIDAD.length],
                    }}
                  />
                ))}
              </View>
              <View style={styles.barLegendRow}>
                {entidadesParaDistribucion.map((e, i) => (
                  <View key={i} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        {
                          backgroundColor: e.entidad.startsWith("Otros")
                            ? COLOR_OTROS
                            : COLORES_ENTIDAD[i % COLORES_ENTIDAD.length],
                        },
                      ]}
                    />
                    <Text style={styles.legendText}>
                      {e.entidad} ({((e.monto / endeudamientoTotal) * 100).toFixed(0)}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>Radar — Trabajo Final Integrador, Diplomatura en IA Aplicada (FCE-UBA)</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>Radar</Text>
          <Text style={styles.metaDate}>CUIT {formatoCuit(cuit)}</Text>
        </View>

        {bcra.deudasHistoricas && bcra.deudasHistoricas.periodos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              BCRA — Evolución del endeudamiento (24 meses)
            </Text>
            <View style={styles.sectionCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { width: "45%" }]}>Período</Text>
                <Text style={[styles.th, { width: "55%", textAlign: "right" }]}>
                  Endeudamiento total
                </Text>
              </View>
              <View>
                {[...bcra.deudasHistoricas.periodos]
                  .sort((a, b) => b.periodo.localeCompare(a.periodo))
                  .map((p, i) => {
                    const total = p.entidades.reduce((acc, e) => acc + e.monto, 0);
                    const mes = p.periodo.slice(4, 6);
                    const anio = p.periodo.slice(0, 4);
                    return (
                      <View key={i} style={styles.tableRow}>
                        <Text style={[styles.td, { width: "45%" }]}>{`${mes}/${anio}`}</Text>
                        <Text style={[styles.td, { width: "55%", textAlign: "right" }]}>
                          {formatoMiles(total)}
                        </Text>
                      </View>
                    );
                  })}
              </View>
            </View>
          </View>
        )}

        {bcra.deudasHistoricas && bcra.deudasHistoricas.periodos.length > 0 && (() => {
          const seriesPdf = [...entidadesPorBanco(bcra.deudasHistoricas!.periodos).slice(0, 6)].reverse();
          const periodosPdf = [...bcra.deudasHistoricas!.periodos]
            .map((p) => p.periodo)
            .sort((a, b) => b.localeCompare(a));
          const colWidth = `${70 / Math.max(seriesPdf.length, 1)}%`;
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                BCRA — Evolución por banco (24 meses, principales entidades)
              </Text>
              <View style={styles.sectionCard}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.th, { width: "30%" }]}>Período</Text>
                  {seriesPdf.map((s) => (
                    <Text key={s.entidad} style={[styles.th, { width: colWidth, textAlign: "right" }]}>
                      {s.entidad.length > 18 ? `${s.entidad.slice(0, 18)}…` : s.entidad}
                    </Text>
                  ))}
                </View>
                <View>
                  {periodosPdf.map((periodo, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={[styles.td, { width: "30%" }]}>{formatoPeriodo(periodo)}</Text>
                      {seriesPdf.map((s) => {
                        const punto = s.puntos.find((p) => p.periodo === periodo);
                        return (
                          <Text
                            key={s.entidad}
                            style={[styles.td, { width: colWidth, textAlign: "right" }]}
                          >
                            {punto ? formatoMiles(punto.monto) : "—"}
                          </Text>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BCRA — Cheques rechazados</Text>
          <View style={styles.sectionCard}>
            {cantidadChequesRechazados === 0 ? (
              <Text style={{ fontSize: 9, color: COLOR.muted }}>
                No registra cheques rechazados.
              </Text>
            ) : (
              bcra.chequesRechazados?.causales.map((c, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Text
                    style={{
                      fontSize: 9,
                      fontFamily: "Helvetica-Bold",
                      color: COLOR.danger,
                      marginBottom: 4,
                    }}
                  >
                    {c.causal}
                  </Text>
                  {c.entidades.map((e, j) => (
                    <View key={j} style={{ marginBottom: 6 }}>
                      <Text
                        style={{ fontSize: 7.5, color: COLOR.muted, marginBottom: 2 }}
                      >
                        Entidad N° {e.entidad}
                      </Text>
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.th, { width: "9%" }]}>N° Cheque</Text>
                        <Text style={[styles.th, { width: "13%" }]}>Causal</Text>
                        <Text style={[styles.th, { width: "10%" }]}>F. rechazo</Text>
                        <Text style={[styles.th, { width: "10%" }]}>F. pago cheque</Text>
                        <Text style={[styles.th, { width: "10%" }]}>F. pago multa</Text>
                        <Text style={[styles.th, { width: "13%" }]}>Estado multa</Text>
                        <Text style={[styles.th, { width: "9%" }]}>Revisión</Text>
                        <Text style={[styles.th, { width: "11%" }]}>Proceso jud.</Text>
                        <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>Monto</Text>
                      </View>
                      {e.detalle.map((d, k) => (
                        <View key={k} style={styles.tableRow}>
                          <Text style={[styles.td, { width: "9%", fontSize: 7 }]}>{d.nroCheque}</Text>
                          <Text style={[styles.td, { width: "13%", fontSize: 7 }]}>{c.causal}</Text>
                          <Text style={[styles.td, { width: "10%", fontSize: 7 }]}>
                            {formatoFecha(d.fechaRechazo) ?? d.fechaRechazo}
                          </Text>
                          <Text style={[styles.td, { width: "10%", fontSize: 7 }]}>
                            {formatoFecha(d.fechaPago ?? undefined) ?? "Sin pagar"}
                          </Text>
                          <Text style={[styles.td, { width: "10%", fontSize: 7 }]}>
                            {formatoFecha(d.fechaPagoMulta ?? undefined) ?? "Sin pagar"}
                          </Text>
                          <Text style={[styles.td, { width: "13%", fontSize: 7 }]}>
                            {d.estadoMulta || "—"}
                          </Text>
                          <Text style={[styles.td, { width: "9%", fontSize: 7 }]}>
                            {d.enRevision ? "Sí" : "No"}
                          </Text>
                          <Text style={[styles.td, { width: "11%", fontSize: 7 }]}>
                            {d.procesoJud ? "Sí" : "No"}
                          </Text>
                          <Text style={[styles.td, { width: "15%", textAlign: "right", fontSize: 7 }]}>
                            {new Intl.NumberFormat("es-AR", {
                              style: "currency",
                              currency: "ARS",
                            }).format(d.monto)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        </View>

        {cantidadChequesRechazados > 0 && resumenTipoRechazoPdf && resumenTotalPdf && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                BCRA — Resumen de cheques rechazados en cuentas de personas jurídicas
              </Text>
              <View style={styles.sectionCard}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.th, { width: "16.5%" }]}>Sin fondos (cant.)</Text>
                  <Text style={[styles.th, { width: "16.5%" }]}>Sin fondos (monto)</Text>
                  <Text style={[styles.th, { width: "16.5%" }]}>Defectos form. (cant.)</Text>
                  <Text style={[styles.th, { width: "16.5%" }]}>Defectos form. (monto)</Text>
                  <Text style={[styles.th, { width: "16.5%" }]}>A la registr. (cant.)</Text>
                  <Text style={[styles.th, { width: "16.5%" }]}>A la registr. (monto)</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.td, { width: "16.5%" }]}>{resumenTipoRechazoPdf.sinFondos.cantidad}</Text>
                  <Text style={[styles.td, { width: "16.5%" }]}>
                    {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                      resumenTipoRechazoPdf.sinFondos.monto
                    )}
                  </Text>
                  <Text style={[styles.td, { width: "16.5%" }]}>
                    {resumenTipoRechazoPdf.defectosFormales.cantidad}
                  </Text>
                  <Text style={[styles.td, { width: "16.5%" }]}>
                    {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                      resumenTipoRechazoPdf.defectosFormales.monto
                    )}
                  </Text>
                  <Text style={[styles.td, { width: "16.5%" }]}>
                    {resumenTipoRechazoPdf.aLaRegistracion.cantidad}
                  </Text>
                  <Text style={[styles.td, { width: "16.5%" }]}>
                    {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                      resumenTipoRechazoPdf.aLaRegistracion.monto
                    )}
                  </Text>
                </View>
                {resumenTipoRechazoPdf.otros.cantidad > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={[styles.td, { width: "16.5%" }]}>Otros: {resumenTipoRechazoPdf.otros.cantidad}</Text>
                    <Text style={[styles.td, { width: "83.5%" }]}>
                      {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                        resumenTipoRechazoPdf.otros.monto
                      )}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                BCRA — Resumen total de cheques rechazados en cuentas de personas jurídicas
              </Text>
              <View style={styles.sectionCard}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.th, { width: "40%" }]}></Text>
                  <Text style={[styles.th, { width: "30%", textAlign: "right" }]}>Cantidad</Text>
                  <Text style={[styles.th, { width: "30%", textAlign: "right" }]}>Monto</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.td, { width: "40%" }]}>Total cheques rechazados</Text>
                  <Text style={[styles.td, { width: "30%", textAlign: "right" }]}>
                    {resumenTotalPdf.totalCantidad}
                  </Text>
                  <Text style={[styles.td, { width: "30%", textAlign: "right" }]}>
                    {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                      resumenTotalPdf.totalMonto
                    )}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.td, { width: "40%" }]}>Total cheques abonados</Text>
                  <Text style={[styles.td, { width: "30%", textAlign: "right" }]}>
                    {resumenTotalPdf.abonadosCantidad}
                  </Text>
                  <Text style={[styles.td, { width: "30%", textAlign: "right" }]}>
                    {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                      resumenTotalPdf.abonadosMonto
                    )}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.td, { width: "40%" }]}>Porcentaje de cheques abonados</Text>
                  <Text style={[styles.td, { width: "30%", textAlign: "right" }]}>
                    {resumenTotalPdf.porcentajeCantidad.toFixed(1)}%
                  </Text>
                  <Text style={[styles.td, { width: "30%", textAlign: "right" }]}>
                    {resumenTotalPdf.porcentajeMonto.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>BCRA — Resumen por banco</Text>
              <View style={styles.sectionCard}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.th, { width: "12%" }]}>Entidad</Text>
                  <Text style={[styles.th, { width: "11%" }]}>S/fondos cant.</Text>
                  <Text style={[styles.th, { width: "12%" }]}>S/fondos monto</Text>
                  <Text style={[styles.th, { width: "11%" }]}>Def.form. cant.</Text>
                  <Text style={[styles.th, { width: "12%" }]}>Def.form. monto</Text>
                  <Text style={[styles.th, { width: "11%" }]}>A registr. cant.</Text>
                  <Text style={[styles.th, { width: "12%" }]}>A registr. monto</Text>
                  <Text style={[styles.th, { width: "8%" }]}>Abon. cant.</Text>
                  <Text style={[styles.th, { width: "11%" }]}>Abon. monto</Text>
                </View>
                <View>
                  {resumenBancosPdf.map((r, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={[styles.td, { width: "12%", fontSize: 7 }]}>N° {r.entidad}</Text>
                      <Text style={[styles.td, { width: "11%", fontSize: 7 }]}>{r.sinFondos.cantidad}</Text>
                      <Text style={[styles.td, { width: "12%", fontSize: 6.5 }]}>
                        {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                          r.sinFondos.monto
                        )}
                      </Text>
                      <Text style={[styles.td, { width: "11%", fontSize: 7 }]}>{r.defectosFormales.cantidad}</Text>
                      <Text style={[styles.td, { width: "12%", fontSize: 6.5 }]}>
                        {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                          r.defectosFormales.monto
                        )}
                      </Text>
                      <Text style={[styles.td, { width: "11%", fontSize: 7 }]}>{r.aLaRegistracion.cantidad}</Text>
                      <Text style={[styles.td, { width: "12%", fontSize: 6.5 }]}>
                        {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                          r.aLaRegistracion.monto
                        )}
                      </Text>
                      <Text style={[styles.td, { width: "8%", fontSize: 7 }]}>{r.abonados.cantidad}</Text>
                      <Text style={[styles.td, { width: "11%", fontSize: 6.5 }]}>
                        {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                          r.abonados.monto
                        )}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={styles.warningBox}>
                El código de entidad es el que informa el BCRA; para mostrar la razón social del
                banco hace falta cruzarlo contra el nomenclador oficial de entidades.
              </Text>
            </View>
          </>
        )}

        <View style={{ marginTop: 8 }}>
          <Text style={styles.warningBox}>
            Información obtenida de la API pública del BCRA (Central de Deudores del
            Sistema Financiero) y del padrón de ARCA vía gateway propio. Este informe es
            de carácter orientativo y no implica juicio de valor sobre la solvencia del
            consultado. Verificar siempre contra las fuentes oficiales antes de tomar
            decisiones.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Radar — Trabajo Final Integrador, Diplomatura en IA Aplicada (FCE-UBA)</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
