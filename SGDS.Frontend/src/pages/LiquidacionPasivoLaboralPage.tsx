import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import {
  getLiquidacion,
  descargarLiquidacionPdf,
  obtenerLiquidacionQrBlobUrl,
  type LiquidacionCuotaParteResponseDto,
} from '../services/pasivosLaboralesService';
import { etiquetaInstrumento } from '../config/pasivosLaboralesConfig';
import { getColorProyecto } from '../config/colorPorProyecto';

function formatearMoneda(valor?: number) {
  if (valor == null) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
}

function formatearMeses(meses?: number) {
  if (meses == null) return '—';
  return `${Math.floor(meses / 12)} años, ${meses % 12} meses (${meses} meses)`;
}

export default function LiquidacionPasivoLaboralPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [liquidacion, setLiquidacion] = useState<LiquidacionCuotaParteResponseDto | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getLiquidacion(Number(id))
      .then(setLiquidacion)
      .catch((err) => setError(err?.response?.data?.mensaje ?? 'No se pudo calcular la liquidación de esta solicitud.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let url: string | null = null;
    obtenerLiquidacionQrBlobUrl(Number(id))
      .then((u) => { url = u; setQrUrl(u); })
      .catch(() => {});
    return () => {
      if (url) window.URL.revokeObjectURL(url);
    };
  }, [id]);

  const color = getColorProyecto('Pasivos Laborales');

  async function handleExportar() {
    if (!id || !liquidacion) return;
    setExportando(true);
    try {
      await descargarLiquidacionPdf(Number(id), `Liquidacion_${liquidacion.referencia}.pdf`);
    } catch {
      alert('No se pudo generar el PDF de la liquidación.');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div
      className="flex min-h-screen bg-paper"
      style={{ '--color-accento': color.primario, '--color-accento-claro': color.primarioClaro } as React.CSSProperties}
    >
      <Sidebar active="solicitudes" />

      <main className="flex-1 px-4 md:px-[38px] py-7 pt-16 md:pt-7 overflow-y-auto">
        <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-3.5">
          <Link to={id ? `/solicitudes/${id}` : '/solicitudes'} className="hover:text-ink-600">
            {liquidacion ? `#${liquidacion.numero}` : 'Solicitud'}
          </Link>
          <span>/</span>
          <span className="text-ink-900 font-semibold">Liquidación</span>
        </div>

        {loading ? (
          <div className="text-center text-sm text-ink-400 py-10">Calculando liquidación...</div>
        ) : error || !liquidacion ? (
          <div className="max-w-[680px] bg-white border border-line rounded-[14px] p-5">
            <p className="text-[13px] text-red-600 mb-3">{error ?? 'No se pudo cargar la liquidación.'}</p>
            <button onClick={() => navigate(id ? `/solicitudes/${id}` : '/solicitudes')} className="text-[12.5px] text-blue-600 font-medium">
              ← Volver a la solicitud
            </button>
          </div>
        ) : (
          <div className="max-w-[680px] flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="font-display text-[19px] font-semibold text-ink-900">Liquidación de {etiquetaInstrumento(liquidacion.instrumento)}</h1>
                <p className="text-ink-600 text-[12.5px] mt-[2px]">
                  Secretaría de Hacienda Departamental — Unidad de Rentas · Referencia {liquidacion.referencia}
                </p>
              </div>
              <button
                onClick={handleExportar}
                disabled={exportando}
                className="flex items-center gap-1.5 bg-[var(--color-accento)] text-white rounded-[9px] px-4 py-2 text-[12.5px] font-semibold disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" className="w-[13px] h-[13px] stroke-white">
                  <path d="M12 3v13M6 10l6 6 6-6" /><path d="M5 21h14" />
                </svg>
                {exportando ? 'Generando...' : 'Descargar PDF'}
              </button>
            </div>

            {!liquidacion.soportado && (
              <div className="flex items-center gap-2.5 bg-fuchsia-50 border border-fuchsia-200 rounded-xl px-4 py-3">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-[18px] h-[18px] stroke-[var(--color-accento)] shrink-0">
                  <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
                </svg>
                <p className="text-[12.5px] text-fuchsia-900">{liquidacion.motivoNoSoportado}</p>
              </div>
            )}

            <div className="bg-white border border-line rounded-[14px] p-5">
              <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">Entidad concurrente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-1">Razón social</div>
                  <div className="text-[13.5px] font-semibold text-ink-900">{liquidacion.empresaRazonSocial}</div>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-1">NIT</div>
                  <div className="text-[13.5px] font-semibold text-ink-900">{liquidacion.empresaNit}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-line rounded-[14px] p-5">
              <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">Servidor / Pensionado</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                {[
                  ['Nombre', liquidacion.servidorNombre || '—'],
                  ['Documento', liquidacion.servidorDocumento || '—'],
                  ['Régimen pensional', liquidacion.regimenPensional || '—'],
                ].map(([lbl, val]) => (
                  <div key={lbl}>
                    <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-1">{lbl}</div>
                    <div className="text-[13.5px] font-semibold text-ink-900">{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {liquidacion.soportado && (
              <div className="bg-white border border-line rounded-[14px] overflow-hidden">
                <div className="px-5 py-[14px] border-b border-line">
                  <h3 className="font-display text-[13.5px] font-semibold text-ink-900">Cálculo de la cuota parte</h3>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">Concepto</th>
                      <th scope="col">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-5 py-3 text-[13px] font-semibold text-ink-900 border-b border-line">Tiempo laborado en la entidad</td>
                      <td className="px-5 py-3 text-[13px] text-right border-b border-line">{formatearMeses(liquidacion.tiempoLaboradoMeses)}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-[13px] font-semibold text-ink-900 border-b border-line">Tiempo total de aportes</td>
                      <td className="px-5 py-3 text-[13px] text-right border-b border-line">{formatearMeses(liquidacion.tiempoTotalAportesMeses)}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-[13px] font-semibold text-ink-900 border-b border-line">Valor de la mesada pensional</td>
                      <td className="px-5 py-3 text-[13px] text-right border-b border-line">{formatearMoneda(liquidacion.valorMesadaPensional)}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-[13px] font-semibold text-ink-900 border-b border-line">% de concurrencia</td>
                      <td className="px-5 py-3 text-[13px] text-right border-b border-line">
                        {liquidacion.tiempoLaboradoMeses} / {liquidacion.tiempoTotalAportesMeses} = {liquidacion.porcentajeConcurrencia}%
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
                <div className="flex flex-col gap-1 items-end px-5 py-4 border-t border-line bg-paper">
                  <span className="text-[13px] font-semibold text-ink-900">
                    Valor mensual a cargo de la entidad: <span className="font-display text-[17px] font-bold text-[var(--color-accento)]">{formatearMoneda(liquidacion.valorMensualACargo)}</span>
                  </span>
                </div>
                <p className="px-5 py-3 text-[11px] text-ink-600 border-t border-line">
                  Pago mensual mientras subsista la pensión — se recalcula ante cambios en la mesada o novedades del régimen.
                </p>
              </div>
            )}

            <div className="bg-white border border-line rounded-[14px] p-6 text-center">
              {qrUrl ? (
                <img src={qrUrl} alt="Código QR de referencia" className="w-[160px] h-[160px] mx-auto" />
              ) : (
                <div className="w-[160px] h-[160px] mx-auto bg-paper rounded-lg animate-pulse" />
              )}
              <p className="text-[11px] text-ink-400 mt-2 tracking-widest">{liquidacion.referencia}</p>
            </div>

            <p className="text-[11px] text-ink-400 leading-relaxed">
              El porcentaje de concurrencia se calcula dividiendo el tiempo laborado en la entidad sobre el tiempo total de
              aportes del servidor, aplicado al valor de la mesada pensional. Este valor puede consultarse y pagarse a través
              del Liquidador de Cuotas Partes Pensionales (PASIVOCOL) del FONPET cuando aplique.
            </p>

            <button
              onClick={() => navigate(`/solicitudes/${id}`)}
              className="self-start text-[12.5px] text-ink-600 font-medium hover:underline"
            >
              ← Volver a la solicitud
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
