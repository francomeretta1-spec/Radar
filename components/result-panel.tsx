"use client";

import { usePDF } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import type { ConsultaCompleta } from "@/lib/api/types";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/risk-badge";
import { DeudaEvolucionChart } from "@/components/charts/deuda-evolucion-chart";
import { InformeIA } from "@/components/informe-ia";
import { EntidadesBarChart } from "@/components/charts/entidades-bar-chart";
import { InformeRadarPDF } from "@/components/pdf/informe-pdf";
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
  evolucionMensual,
  resumenPorTipoRechazo,
  resumenTotalCheques,
  resumenPorBancoDetallado,
  formatoMiles,
  formatoCuit,
  formatoPeriodo,
} from "@/lib/risk";
import { EvolucionPorBanco } from "@/components/charts/evolucion-por-banco";

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&ordm;/g, "º")
    .replace(/&amp;/g, "&");
}

function formatoMonedaAR(monto: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);
}

export function ResultPanel({ data }: { data: ConsultaCompleta }) {
  const { bcra, arca, arcaError, padron13, apoc, cuit } = data;

  const [pdfInstance] = usePDF({ document: <InformeRadarPDF data={data} /> });

  // Entidades "actuales" consolidadas: para cada entidad, su último
  // período informado. No todas las entidades reportan el mismo mes (ver
  // consolidarEntidadesActuales), así que NO alcanza con tomar el período
  // más reciente de la lista y listo — eso descarta entidades enteras.
  const entidadesActuales = bcra.deudasActuales
    ? consolidarEntidadesActuales(bcra.deudasActuales.periodos)
    : [];
  const periodoMasReciente = bcra.deudasActuales
    ? [...bcra.deudasActuales.periodos].sort((a, b) => b.periodo.localeCompare(a.periodo))[0]?.periodo
    : null;

  const situaciones = entidadesActuales.map((e) => e.situacion);
  const peorSituacion = situacionMasAlta(situaciones);
  const infoSituacion = SITUACIONES_BCRA[peorSituacion] ?? SITUACIONES_BCRA[1];

  const scoreRadar = calcularScoreRadar(entidadesActuales);
  const infoScoreRadar = scoreRadar
    ? SITUACIONES_BCRA[scoreRadar.redondeado] ?? SITUACIONES_BCRA[1]
    : null;

  const endeudamientoTotal = entidadesActuales.reduce((acc, e) => acc + e.monto, 0);

  // Entidades que determinan la peor situación. El BCRA toma la peor
  // calificación entre TODAS las entidades, sin importar el monto: una
  // deuda mínima en situación grave puede definir la situación general.
  // Si esa(s) entidad(es) representan menos del 1% del endeudamiento
  // total, lo aclaramos para que no se lea como un error del informe.
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

  const desdeInfo = bcra.deudasHistoricas
    ? situacionDesde(bcra.deudasHistoricas.periodos)
    : null;

  const antiguedad = calcularAntiguedad(padron13?.datos?.persona?.fechaContratoSocial);
  const fechaContratoSocial = formatoFecha(padron13?.datos?.persona?.fechaContratoSocial);
  const formaJuridica = padron13?.datos?.persona?.formaJuridica;
  const mesCierre = padron13?.datos?.persona?.mesCierre;

  const cantidadEntidades = entidadesActuales.length;
  const esApocrifo = apoc?.ok ? esApocrifoConfirmado(apoc) : false;

  // El estado de clave puede venir del padrón A5 (arca) o, si ese falló
  // (ej. CUIT limitada/cancelada, ver más abajo), del padrón A13.
  const estadoClave =
    arca?.datos?.datosGenerales?.estadoClave ?? padron13?.datos?.persona?.estadoClave;

  // Cuando ARCA limita o cancela un CUIT (ej. incluido en la Base de
  // Contribuyentes NO Confiable, RG AFIP 3832/16), el padrón A5 no
  // devuelve `datosGenerales` sino este bloque con el motivo — es una
  // alerta grave que hay que mostrar, no ocultar detrás de un "—".
  const errorConstancia = arca?.datos?.errorConstancia?.error;

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

  const resumenTipoRechazo = bcra.chequesRechazados
    ? resumenPorTipoRechazo(bcra.chequesRechazados.causales)
    : null;
  const resumenTotal = bcra.chequesRechazados
    ? resumenTotalCheques(bcra.chequesRechazados.causales)
    : null;
  const resumenBancos = bcra.chequesRechazados
    ? resumenPorBancoDetallado(bcra.chequesRechazados.causales)
    : [];

  return (
    <div className="space-y-6">
      {/* Header del informe */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-(--border)">
        <div>
          <p className="text-sm uppercase tracking-wider text-(--radar) font-semibold mb-1">
            Informe individual
          </p>
          <h2 className="font-display text-2xl font-semibold text-(--fg)">
            {denominacion}
          </h2>
          <p className="text-sm text-(--fg-muted) mt-0.5 font-display">
            CUIT {formatoCuit(cuit)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {scoreRadar && infoScoreRadar ? (
            <RiskBadge nivel={infoScoreRadar.nivel} label={`Score Radar · ${scoreRadar.label}`} />
          ) : (
            <RiskBadge nivel={infoSituacion.nivel} label={`${peorSituacion} · ${infoSituacion.label}`} />
          )}
          <a
            href={pdfInstance.url ?? undefined}
            download={`radar-informe-${cuit}.pdf`}
            aria-disabled={pdfInstance.loading || !pdfInstance.url}
            className="flex items-center gap-1.5 text-sm text-(--fg-muted) hover:text-(--radar) transition-colors disabled:opacity-40"
            onClick={(e) => {
              if (pdfInstance.loading || !pdfInstance.url) e.preventDefault();
            }}
          >
            <Download size={15} />
            {pdfInstance.loading ? "Preparando PDF…" : "Descargar informe PDF"}
          </a>
        </div>
      </div>

      <InformeIA data={data} />

      {/* Alerta grave: CUIT limitada o cancelada por ARCA. Se muestra
          arriba de todo porque es más relevante que cualquier otro dato
          del informe — un CUIT en la Base de Contribuyentes NO Confiable
          invalida buena parte del resto del análisis. */}
      {errorConstancia && errorConstancia.length > 0 && (
        <div className="rounded-lg border border-(--danger) bg-(--danger-bg) px-4 py-3">
          <p className="text-sm font-semibold text-(--danger) mb-1">
            ⚠ CUIT limitada o cancelada por ARCA
          </p>
          {errorConstancia.map((msg, i) => (
            <p key={i} className="text-xs text-(--danger)">
              {msg}
            </p>
          ))}
        </div>
      )}

      {/* Resumen ejecutivo — Situación + Score primero, luego ARCA, luego el resto de BCRA */}
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-4">
          <Card eyebrow="BCRA · Situación oficial" className="!p-4">
            <p
              className="font-display text-xl font-semibold break-words leading-tight"
              style={{ color: `var(--${infoSituacion.nivel})` }}
            >
              {peorSituacion} · {infoSituacion.corto}
            </p>
            {notaSituacionMarginal ? (
              <p className="text-[11px] text-(--warn) mt-1 leading-snug">
                ⚠ {notaSituacionMarginal}
              </p>
            ) : (
              <p className="text-xs text-(--fg-muted) mt-1">Última calificación, peor entidad</p>
            )}
          </Card>
          <Card eyebrow="Radar · Score propio" className="!p-4">
            {scoreRadar && infoScoreRadar ? (
              <p
                className="font-display text-xl font-semibold break-words leading-tight"
                style={{ color: `var(--${infoScoreRadar.nivel})` }}
              >
                {scoreRadar.label}
              </p>
            ) : (
              <p className="font-display text-xl font-semibold text-(--fg-muted)">—</p>
            )}
            <p className="text-xs text-(--fg-muted) mt-1">Promedio ponderado por monto</p>
            <p className="text-[11px] text-(--fg-faint) mt-2 leading-snug">
              Cálculo propio (no oficial) que pondera por monto adeudado para evitar que
              deudas mínimas dominen el resultado. La situación oficial del BCRA sigue
              siendo la que corresponde reportar ante terceros.
            </p>
          </Card>
        </div>

        {desdeInfo && (
          <p className="text-xs text-(--fg-muted)">
            Permanece en esta situación de forma ininterrumpida desde{" "}
            <span className="text-(--fg)">{desdeInfo.desde}</span>{" "}
            (dentro de los últimos 24 meses disponibles).
            {antiguedad && (
              <>
                {" "}· {formaJuridica ? formaJuridica + ", " : ""}con {antiguedad} de antigüedad.
              </>
            )}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Card eyebrow="ARCA · Estado de clave" className="!p-4">
            <p
              className="font-display text-2xl font-semibold"
              style={{
                color:
                  estadoClave === "ACTIVO"
                    ? "var(--ok)"
                    : estadoClave
                    ? "var(--danger)"
                    : "var(--fg)",
              }}
            >
              {estadoClave ?? "—"}
            </p>
            <p className="text-xs text-(--fg-muted) mt-1">Padrón de contribuyentes</p>
          </Card>
          <Card eyebrow="ARCA · Apócrifos" className="!p-4">
            {apoc?.ok ? (
              <>
                <p
                  className="font-display text-2xl font-semibold"
                  style={{ color: esApocrifo ? "var(--danger)" : "var(--ok)" }}
                >
                  {esApocrifo ? "Sí" : "No"}
                </p>
                <p className="text-xs text-(--fg-muted) mt-1">
                  {esApocrifo ? "Figura publicado como apócrifo" : "Sin antecedentes"}
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl font-semibold text-(--fg-muted)">—</p>
                <p className="text-xs text-(--fg-muted) mt-1">Sin verificar</p>
              </>
            )}
          </Card>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card eyebrow="BCRA · Endeudamiento total" className="!p-4">
            <p className="font-display text-xl font-semibold text-(--fg) break-words leading-tight">
              {entidadesActuales.length > 0 ? formatoMiles(endeudamientoTotal) : "Sin datos"}
            </p>
            <p className="text-xs text-(--fg-muted) mt-1">
              Sistema financiero, último período informado por cada entidad informado
            </p>
          </Card>
          <Card eyebrow="BCRA · Entidades" className="!p-4">
            <p className="font-display text-2xl font-semibold text-(--fg)">
              {cantidadEntidades}
            </p>
            <p className="text-xs text-(--fg-muted) mt-1">
              Bancos / financieras con deuda vigente
            </p>
          </Card>
          <Card eyebrow="BCRA · Cheques rechazados" className="!p-4">
            <p
              className="font-display text-2xl font-semibold"
              style={{ color: cantidadChequesRechazados > 0 ? "var(--danger)" : "var(--fg)" }}
            >
              {cantidadChequesRechazados}
            </p>
            <p className="text-xs text-(--fg-muted) mt-1">Registrados en BCRA</p>
          </Card>
        </div>
      </div>


      {/* Datos ARCA */}
      <Card eyebrow="ARCA" title="Datos fiscales">
        {arca?.ok && arca.datos?.datosGenerales ? (
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <p className="text-(--fg-faint) text-xs mb-0.5">Estado de clave</p>
              <p className="text-(--fg) font-medium">
                {arca.datos.datosGenerales?.estadoClave ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-(--fg-faint) text-xs mb-0.5">Tipo de persona</p>
              <p className="text-(--fg) font-medium">
                {formaJuridica
                  ? formaJuridica
                  : arca.datos.datosGenerales?.tipoPersona === "FISICA"
                  ? "Persona física"
                  : arca.datos.datosGenerales?.tipoPersona === "JURIDICA"
                  ? "Persona jurídica"
                  : "—"}
              </p>
            </div>
            {antiguedad && (
              <div>
                <p className="text-(--fg-faint) text-xs mb-0.5">Antigüedad</p>
                <p className="text-(--fg) font-medium">{antiguedad}</p>
              </div>
            )}
            {fechaContratoSocial && (
              <div>
                <p className="text-(--fg-faint) text-xs mb-0.5">Fecha de contrato social</p>
                <p className="text-(--fg) font-medium">{fechaContratoSocial}</p>
              </div>
            )}
            {mesCierre && (
              <div>
                <p className="text-(--fg-faint) text-xs mb-0.5">Cierre de ejercicio</p>
                <p className="text-(--fg) font-medium">
                  Mes {mesCierre.padStart(2, "0")}
                </p>
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="text-(--fg-faint) text-xs mb-0.5">Domicilio fiscal</p>
              <p className="text-(--fg) font-medium">
                {arca.datos.datosGenerales?.domicilioFiscal
                  ? decodeHtmlEntities(
                      `${arca.datos.datosGenerales.domicilioFiscal.direccion ?? ""}, ${
                        arca.datos.datosGenerales.domicilioFiscal.localidad ?? ""
                      } (${arca.datos.datosGenerales.domicilioFiscal.codPostal ?? ""}), ${
                        arca.datos.datosGenerales.domicilioFiscal.descripcionProvincia ?? ""
                      }`
                    )
                  : "—"}
              </p>
            </div>
            {arca.datos.datosMonotributo?.categoriaMonotributo && (
              <div>
                <p className="text-(--fg-faint) text-xs mb-0.5">Monotributo</p>
                <p className="text-(--fg) font-medium">
                  Categoría {arca.datos.datosMonotributo.categoriaMonotributo.descripcionCategoria}
                </p>
              </div>
            )}
            {arca.datos.datosRegimenGeneral?.actividad && arca.datos.datosRegimenGeneral.actividad.length > 0 && (() => {
              const actividades = arca.datos.datosRegimenGeneral.actividad;
              const principal = actividadPrincipal(actividades);
              const secundarias = actividadesSecundarias(actividades);
              if (!principal) return null;
              return (
                <div className="sm:col-span-2">
                  <p className="text-(--fg-faint) text-xs mb-0.5">Actividad principal</p>
                  <p className="text-(--fg) font-medium">
                    {principal.idActividad} · {decodeHtmlEntities(principal.descripcionActividad)}
                  </p>
                  {secundarias.length > 0 && (
                    <div className="mt-2">
                      <p className="text-(--fg-faint) text-xs mb-1.5">
                        Actividades secundarias ({secundarias.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {secundarias.map((a, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded bg-(--surface-raised) text-(--fg-muted)"
                          >
                            {a.idActividad} · {decodeHtmlEntities(a.descripcionActividad)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            {arca.datos.datosRegimenGeneral?.impuesto &&
              arca.datos.datosRegimenGeneral.impuesto.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-(--fg-faint) text-xs mb-1.5">
                    Impuestos activos ({arca.datos.datosRegimenGeneral.impuesto.filter((i) => i.estadoImpuesto === "AC").length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {arca.datos.datosRegimenGeneral.impuesto
                      .filter((i) => i.estadoImpuesto === "AC")
                      .map((i, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded bg-(--surface-raised) text-(--fg-muted)"
                        >
                          {decodeHtmlEntities(i.descripcionImpuesto)}
                        </span>
                      ))}
                  </div>
                </div>
              )}
          </div>
        ) : errorConstancia && errorConstancia.length > 0 ? (
          <p className="text-sm text-(--danger)">
            ARCA no devuelve datos fiscales normales para este CUIT: está limitado o cancelado
            (ver alerta arriba). Los datos de antigüedad, forma jurídica y cierre de ejercicio
            que se muestran en este informe provienen del padrón A13, que sí respondió.
          </p>
        ) : (
          <p className="text-sm text-(--fg-muted)">
            No se pudieron obtener datos de ARCA{arcaError ? `: ${arcaError}` : "."}
          </p>
        )}
      </Card>

      {/* Verificación de Apócrifos */}
      <Card eyebrow="ARCA" title="Verificación de apócrifos">
        {apoc?.ok ? (
          <div>
            <div className="flex items-start gap-3">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={
                  esApocrifo
                    ? { color: "var(--danger)", backgroundColor: "var(--danger-bg)" }
                    : { color: "var(--ok)", backgroundColor: "var(--ok-bg)" }
                }
              >
                {esApocrifo ? "⚠ Publicado como apócrifo" : "✓ Sin antecedentes de apócrifos"}
              </span>
              {esApocrifo && (
                <div className="text-xs text-(--fg-muted)">
                  {apoc.fechaCondicion && <p>Condición detectada: {apoc.fechaCondicion}</p>}
                  {apoc.fechaPublicacion && <p>Publicado: {apoc.fechaPublicacion}</p>}
                  {apoc.detalle && <p>{apoc.detalle}</p>}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-(--fg-muted)">No se pudo verificar la base de apócrifos.</p>
        )}
      </Card>

      {/* Detalle por entidad — después de ARCA, ya con el panorama fiscal completo */}
      {entidadesActuales.length > 0 && (
        <Card eyebrow="BCRA" title="Detalle por entidad">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-(--fg-faint) text-xs uppercase tracking-wide">
                  <th className="font-medium pb-2 pr-4">Entidad</th>
                  <th className="font-medium pb-2 pr-4">Período</th>
                  <th className="font-medium pb-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {[...entidadesActuales]
                  .sort((a, b) => b.monto - a.monto)
                  .map((e, i) => {
                    const info = SITUACIONES_BCRA[e.situacion] ?? SITUACIONES_BCRA[1];
                    return (
                      <tr key={i} className="border-t border-(--border-soft)">
                        <td className="py-2.5 pr-4 text-(--fg)">{e.entidad}</td>
                        <td className="py-2.5 pr-4 text-(--fg-muted) font-display">
                          {formatoPeriodo(e.periodo)}
                          {periodoMasReciente && e.periodo !== periodoMasReciente && (
                            <span className="text-(--warn)" title="Esta entidad todavía no informó el período más reciente">
                              {" "}*
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          <RiskBadge nivel={info.nivel} label={situacionConCodigo(e.situacion)} />
                        </td>
                        <td className="py-2.5 text-right text-(--fg) font-display">
                          {formatoMiles(e.monto)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {entidadesActuales.some((e) => periodoMasReciente && e.periodo !== periodoMasReciente) && (
            <p className="text-[11px] text-(--fg-faint) mt-2">
              * Entidad con el último período disponible distinto al resto (todavía no informó {periodoMasReciente ? formatoPeriodo(periodoMasReciente) : "el último período"}). Se muestra igual con su dato más reciente.
            </p>
          )}
        </Card>
      )}

      {entidadesActuales.length > 0 && (
        <Card eyebrow="BCRA" title="Distribución de deuda por entidad">
          <EntidadesBarChart entidades={entidadesActuales} />
        </Card>
      )}

      {/* Gráficos */}
      {bcra.deudasHistoricas && bcra.deudasHistoricas.periodos.length > 0 && (
        <Card eyebrow="BCRA · Central de Deudores" title="Detalle mensual del endeudamiento (24 meses)">
          <div className="overflow-x-auto -mx-5 px-5 max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-(--fg-faint) text-xs uppercase tracking-wide">
                  <th className="font-medium pb-2 pr-4">Período</th>
                  <th className="font-medium pb-2 text-right">Monto total</th>
                </tr>
              </thead>
              <tbody>
                {[...evolucionMensual(bcra.deudasHistoricas.periodos)]
                  .sort((a, b) => b.periodo.localeCompare(a.periodo))
                  .map((p, i) => (
                    <tr key={i} className="border-t border-(--border-soft)">
                      <td className="py-2 pr-4 text-(--fg-muted) font-display">
                        {formatoPeriodo(p.periodo)}
                      </td>
                      <td className="py-2 text-right text-(--fg) font-display">
                        {formatoMiles(p.monto)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {bcra.deudasHistoricas && bcra.deudasHistoricas.periodos.length > 0 && (
        <Card eyebrow="BCRA · Central de Deudores" title="Evolución del endeudamiento (24 meses)">
          <DeudaEvolucionChart data={bcra.deudasHistoricas} />
          <p className="text-[11px] text-(--fg-faint) mt-2">
            La situación oficial de cada mes toma la peor calificación entre todas las
            entidades, sin importar el monto. Puede no reflejar el riesgo real del
            endeudamiento total — para eso usá el Score Radar.
          </p>
        </Card>
      )}

      {bcra.deudasHistoricas && bcra.deudasHistoricas.periodos.length > 0 && (
        <Card eyebrow="BCRA · Central de Deudores" title="Evolución por banco (24 meses)">
          <EvolucionPorBanco data={bcra.deudasHistoricas} />
        </Card>
      )}

      {/* Cheques rechazados detalle */}
      <Card eyebrow="BCRA" title="Cheques rechazados">
        {cantidadChequesRechazados === 0 ? (
          <p className="text-sm text-(--fg-muted)">No registra cheques rechazados.</p>
        ) : (
          <div className="space-y-4">
            {bcra.chequesRechazados?.causales.map((c, i) => (
              <div key={i}>
                <p className="text-(--danger) font-medium text-sm mb-2">{c.causal}</p>
                {c.entidades.map((e, j) => (
                  <div key={j} className="mb-3">
                    <p className="text-xs text-(--fg-muted) font-medium mb-1">
                      Entidad N° {e.entidad}
                    </p>
                    <div className="overflow-x-auto -mx-5 px-5 mb-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-(--fg-faint) text-xs uppercase tracking-wide">
                            <th className="font-medium pb-1.5 pr-4">N° Cheque</th>
                            <th className="font-medium pb-1.5 pr-4">Causal</th>
                            <th className="font-medium pb-1.5 pr-4">Fecha rechazo</th>
                            <th className="font-medium pb-1.5 pr-4">Fecha pago cheque</th>
                            <th className="font-medium pb-1.5 pr-4">Fecha pago multa</th>
                            <th className="font-medium pb-1.5 pr-4">Estado multa</th>
                            <th className="font-medium pb-1.5 pr-4">Revisión</th>
                            <th className="font-medium pb-1.5 pr-4">Proceso judicial</th>
                            <th className="font-medium pb-1.5 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e.detalle.map((d, k) => (
                            <tr key={k} className="border-t border-(--border-soft)">
                              <td className="py-2 pr-4 text-(--fg) font-display">{d.nroCheque}</td>
                              <td className="py-2 pr-4 text-(--fg-muted)">{c.causal}</td>
                              <td className="py-2 pr-4 text-(--fg-muted)">{formatoFecha(d.fechaRechazo) ?? d.fechaRechazo}</td>
                              <td className="py-2 pr-4 text-(--fg-muted)">{formatoFecha(d.fechaPago ?? undefined) ?? "Sin pagar"}</td>
                              <td className="py-2 pr-4 text-(--fg-muted)">{formatoFecha(d.fechaPagoMulta ?? undefined) ?? "Sin pagar"}</td>
                              <td className="py-2 pr-4 text-(--fg-muted)">{d.estadoMulta || "—"}</td>
                              <td className="py-2 pr-4 text-(--fg-muted)">{d.enRevision ? "Sí" : "No"}</td>
                              <td className="py-2 pr-4 text-(--fg-muted)">{d.procesoJud ? "Sí" : "No"}</td>
                              <td className="py-2 text-right text-(--fg) font-display">
                                {new Intl.NumberFormat("es-AR", {
                                  style: "currency",
                                  currency: "ARS",
                                }).format(d.monto)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Resúmenes de cheques rechazados, replicando la estructura que
          muestra la consulta oficial del BCRA: desglosados por tipo de
          rechazo (sin fondos / defectos formales / a la registración),
          totales con cheques abonados, y lo mismo abierto por banco. */}
      {cantidadChequesRechazados > 0 && bcra.chequesRechazados && resumenTipoRechazo && resumenTotal && (
        <>
          <Card eyebrow="BCRA" title="Resumen de cheques rechazados en cuentas de personas jurídicas">
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-(--fg-faint) text-xs uppercase tracking-wide">
                    <th className="font-medium pb-1.5 pr-4" colSpan={2}>Rechazos sin fondos</th>
                    <th className="font-medium pb-1.5 pr-4" colSpan={2}>Rechazos defectos formales</th>
                    <th className="font-medium pb-1.5 pr-4" colSpan={2}>Rechazos a la registración</th>
                    {resumenTipoRechazo.otros.cantidad > 0 && (
                      <th className="font-medium pb-1.5" colSpan={2}>Otros rechazos</th>
                    )}
                  </tr>
                  <tr className="text-left text-(--fg-faint) text-xs uppercase tracking-wide">
                    <th className="font-medium pb-1.5 pr-2">Cantidad</th>
                    <th className="font-medium pb-1.5 pr-4">Monto</th>
                    <th className="font-medium pb-1.5 pr-2">Cantidad</th>
                    <th className="font-medium pb-1.5 pr-4">Monto</th>
                    <th className="font-medium pb-1.5 pr-2">Cantidad</th>
                    <th className="font-medium pb-1.5 pr-4">Monto</th>
                    {resumenTipoRechazo.otros.cantidad > 0 && (
                      <>
                        <th className="font-medium pb-1.5 pr-2">Cantidad</th>
                        <th className="font-medium pb-1.5">Monto</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-(--border-soft)">
                    <td className="py-2 pr-2 text-(--fg) font-display">{resumenTipoRechazo.sinFondos.cantidad}</td>
                    <td className="py-2 pr-4 text-(--fg) font-display">
                      {formatoMonedaAR(resumenTipoRechazo.sinFondos.monto)}
                    </td>
                    <td className="py-2 pr-2 text-(--fg) font-display">{resumenTipoRechazo.defectosFormales.cantidad}</td>
                    <td className="py-2 pr-4 text-(--fg) font-display">
                      {formatoMonedaAR(resumenTipoRechazo.defectosFormales.monto)}
                    </td>
                    <td className="py-2 pr-2 text-(--fg) font-display">{resumenTipoRechazo.aLaRegistracion.cantidad}</td>
                    <td className="py-2 pr-4 text-(--fg) font-display">
                      {formatoMonedaAR(resumenTipoRechazo.aLaRegistracion.monto)}
                    </td>
                    {resumenTipoRechazo.otros.cantidad > 0 && (
                      <>
                        <td className="py-2 pr-2 text-(--fg) font-display">{resumenTipoRechazo.otros.cantidad}</td>
                        <td className="py-2 text-(--fg) font-display">
                          {formatoMonedaAR(resumenTipoRechazo.otros.monto)}
                        </td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card eyebrow="BCRA" title="Resumen total de cheques rechazados en cuentas de personas jurídicas">
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-(--fg-faint) text-xs uppercase tracking-wide">
                    <th className="font-medium pb-1.5 pr-4"></th>
                    <th className="font-medium pb-1.5 pr-4 text-right">Cantidad</th>
                    <th className="font-medium pb-1.5 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-(--border-soft)">
                    <td className="py-2 pr-4 text-(--fg)">Total cheques rechazados</td>
                    <td className="py-2 pr-4 text-right text-(--fg) font-display">{resumenTotal.totalCantidad}</td>
                    <td className="py-2 text-right text-(--fg) font-display">
                      {formatoMonedaAR(resumenTotal.totalMonto)}
                    </td>
                  </tr>
                  <tr className="border-t border-(--border-soft)">
                    <td className="py-2 pr-4 text-(--fg)">Total cheques abonados</td>
                    <td className="py-2 pr-4 text-right text-(--fg) font-display">{resumenTotal.abonadosCantidad}</td>
                    <td className="py-2 text-right text-(--fg) font-display">
                      {formatoMonedaAR(resumenTotal.abonadosMonto)}
                    </td>
                  </tr>
                  <tr className="border-t border-(--border-soft)">
                    <td className="py-2 pr-4 text-(--fg)">Porcentaje de cheques abonados</td>
                    <td className="py-2 pr-4 text-right text-(--fg) font-display">
                      {resumenTotal.porcentajeCantidad.toFixed(1)}%
                    </td>
                    <td className="py-2 text-right text-(--fg) font-display">
                      {resumenTotal.porcentajeMonto.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card eyebrow="BCRA" title="Resumen por banco">
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-(--fg-faint) text-xs uppercase tracking-wide">
                    <th className="font-medium pb-1.5 pr-4">Entidad</th>
                    <th className="font-medium pb-1.5 pr-4" colSpan={2}>Rechazos sin fondos</th>
                    <th className="font-medium pb-1.5 pr-4" colSpan={2}>Rechazos defectos formales</th>
                    <th className="font-medium pb-1.5 pr-4" colSpan={2}>Rechazos a la registración</th>
                    <th className="font-medium pb-1.5" colSpan={2}>Cheques abonados</th>
                  </tr>
                  <tr className="text-left text-(--fg-faint) text-xs uppercase tracking-wide">
                    <th className="font-medium pb-1.5 pr-4"></th>
                    <th className="font-medium pb-1.5 pr-2">Cant.</th>
                    <th className="font-medium pb-1.5 pr-4">Monto</th>
                    <th className="font-medium pb-1.5 pr-2">Cant.</th>
                    <th className="font-medium pb-1.5 pr-4">Monto</th>
                    <th className="font-medium pb-1.5 pr-2">Cant.</th>
                    <th className="font-medium pb-1.5 pr-4">Monto</th>
                    <th className="font-medium pb-1.5 pr-2">Cant.</th>
                    <th className="font-medium pb-1.5">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenBancos.map((r, i) => (
                    <tr key={i} className="border-t border-(--border-soft)">
                      <td className="py-2 pr-4 text-(--fg)">Entidad N° {r.entidad}</td>
                      <td className="py-2 pr-2 text-(--fg-muted) font-display">{r.sinFondos.cantidad}</td>
                      <td className="py-2 pr-4 text-(--fg) font-display">{formatoMonedaAR(r.sinFondos.monto)}</td>
                      <td className="py-2 pr-2 text-(--fg-muted) font-display">{r.defectosFormales.cantidad}</td>
                      <td className="py-2 pr-4 text-(--fg) font-display">
                        {formatoMonedaAR(r.defectosFormales.monto)}
                      </td>
                      <td className="py-2 pr-2 text-(--fg-muted) font-display">{r.aLaRegistracion.cantidad}</td>
                      <td className="py-2 pr-4 text-(--fg) font-display">
                        {formatoMonedaAR(r.aLaRegistracion.monto)}
                      </td>
                      <td className="py-2 pr-2 text-(--fg-muted) font-display">{r.abonados.cantidad}</td>
                      <td className="py-2 text-(--fg) font-display">{formatoMonedaAR(r.abonados.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-(--fg-faint) mt-2">
              El código de entidad es el que informa el BCRA; para mostrar la razón social del
              banco hace falta cruzarlo contra el nomenclador oficial de entidades.
            </p>
          </Card>
        </>
      )}

      {bcra.errores.length > 0 && (
        <p className="text-xs text-(--fg-faint)">
          Avisos: {bcra.errores.join(" · ")}
        </p>
      )}
    </div>
  );
}
