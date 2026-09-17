import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import {
  getCarneVirtual,
  obtenerCarneVirtualBarcodeBlobUrl,
  descargarCarneVirtualPdf,
  type CarneVirtualResponseDto,
} from '../services/solicitudService';

export default function CarneVirtualPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [carne, setCarne] = useState<CarneVirtualResponseDto | null>(null);
  const [barcodeUrl, setBarcodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getCarneVirtual(Number(id))
      .then(setCarne)
      .catch((err) => setError(err?.response?.data?.mensaje ?? 'No se pudo cargar el carné virtual.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let barcode: string | null = null;
    obtenerCarneVirtualBarcodeBlobUrl(Number(id)).then((b) => { barcode = b; setBarcodeUrl(b); }).catch(() => {});
    return () => { if (barcode) window.URL.revokeObjectURL(barcode); };
  }, [id]);

  async function handleExportar() {
    if (!id || !carne) return;
    setExportando(true);
    try {
      await descargarCarneVirtualPdf(Number(id), `Carne_Virtual_${carne.numero}.pdf`);
    } catch {
      alert('No se pudo generar el PDF del carné.');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div
      className="flex min-h-screen bg-paper"
      style={{ '--color-accento': '#047857', '--color-accento-claro': '#d1fae5' } as React.CSSProperties}
    >
      <Sidebar active="solicitudes" />

      <main className="flex-1 px-4 md:px-[38px] py-7 pt-16 md:pt-7 overflow-y-auto">
        <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-3.5">
          <Link to={id ? `/solicitudes/${id}` : '/solicitudes'} className="hover:text-ink-600">
            {carne ? `#${carne.numero}` : 'Solicitud'}
          </Link>
          <span>/</span>
          <span className="text-ink-900 font-semibold">Carné virtual</span>
        </div>

        {loading ? (
          <div className="text-center text-sm text-ink-400 py-10">Cargando...</div>
        ) : error || !carne ? (
          <div className="max-w-[680px] bg-white border border-line rounded-[14px] p-5">
            <p className="text-[13px] text-red-600 mb-3">{error ?? 'No se pudo cargar el carné virtual.'}</p>
            <button onClick={() => navigate(`/solicitudes/${id}`)} className="text-[12.5px] text-blue-600 font-medium">
              ← Volver a la solicitud
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6 max-w-[900px]">
              <div>
                <h1 className="font-display text-[19px] font-semibold text-ink-900">Carné virtual — {carne.afiliadoNombre}</h1>
                <p className="text-ink-600 text-[12.5px] mt-[2px]">
                  Válido mientras el afiliado permanezca ACTIVO en aportes ante Comfenalco Santander
                </p>
              </div>
              <button
                onClick={handleExportar}
                disabled={exportando}
                className="flex items-center gap-1.5 bg-[var(--color-accento)] text-white rounded-[9px] px-4 py-2 text-[12.5px] font-semibold disabled:opacity-60 shrink-0"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" className="w-[13px] h-[13px] stroke-white">
                  <path d="M12 3v13M6 10l6 6 6-6" /><path d="M5 21h14" />
                </svg>
                {exportando ? 'Generando...' : 'Descargar PDF'}
              </button>
            </div>

            <div className="flex gap-8 items-start flex-wrap">
              {/* Carné virtual — colores Comfenalco, logo, categoría y código de barras real */}
              <div className="w-[320px] shrink-0 bg-white rounded-[16px] shadow-[0_18px_40px_-16px_rgba(15,26,46,0.35)] overflow-hidden">
                <div className="bg-[#047857] px-4 py-3.5 flex items-center gap-2.5">
                  <img src="/logo-comfenalco.png" alt="Comfenalco Santander" className="w-9 h-9 object-contain rounded bg-white p-0.5" />
                  <div className="flex-1">
                    <div className="text-white font-display font-bold text-[13px] leading-tight">COMFENALCO</div>
                    <div className="text-[#d1fae5] text-[9.5px] leading-tight">Santander · Se preocupa por ti</div>
                  </div>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-full">Cat. {carne.categoria}</span>
                </div>

                <div className="p-4">
                  <div className="text-[9px] uppercase tracking-wide text-ink-400 font-semibold">Afiliado</div>
                  <div className="text-[15px] font-bold text-ink-900 leading-tight mt-0.5">{carne.afiliadoNombre}</div>
                  <div className="text-[11px] text-ink-600 mt-0.5">{carne.afiliadoDocumento}</div>

                  <div className="grid grid-cols-2 gap-3 mt-3.5">
                    <div>
                      <div className="text-[9px] uppercase tracking-wide text-ink-400 font-semibold">Estado</div>
                      <div className="text-[12px] font-semibold text-[#047857] mt-0.5">{carne.estadoAfiliacion}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wide text-ink-400 font-semibold">Expedición</div>
                      <div className="text-[12px] font-semibold text-ink-900 mt-0.5">
                        {new Date(carne.fechaExpedicion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div className="h-px my-3.5" style={{ background: 'repeating-linear-gradient(90deg,#e4e9f2 0 4px,transparent 4px 7px)' }} />

                  {barcodeUrl ? (
                    <img src={barcodeUrl} alt="Código de barras" className="w-full h-9 object-contain" />
                  ) : (
                    <div className="w-full h-9 bg-paper rounded animate-pulse" />
                  )}
                  <div className="text-center text-[9px] font-mono tracking-widest text-ink-900 mt-1">{carne.numero}</div>
                </div>

                <div className="bg-ink-900 text-white text-[9px] font-bold tracking-wide text-center py-1.5">
                  DOCUMENTO VÁLIDO SOLO CON AFILIACIÓN ACTIVA
                </div>
              </div>

              <div className="flex-1 min-w-[320px] flex flex-col gap-5">
                <div className="bg-white border border-line rounded-[14px] p-5">
                  <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-3.5">Categorización (RN-CV-002)</h3>
                  <p className="text-[12px] text-ink-600 leading-relaxed">
                    Ingresos mensuales: <b className="text-ink-900">
                      {carne.ingresosMensuales.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                    </b> — Categoría <b className="text-ink-900">{carne.categoria}</b>{' '}
                    ({carne.categoria === 'A' ? 'hasta 2 SMMLV' : carne.categoria === 'B' ? 'entre 2 y 4 SMMLV' : 'más de 4 SMMLV'}).
                  </p>
                </div>

                <div className="bg-white border border-line rounded-[14px] p-5">
                  <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-3.5">Grupo familiar (RN-CV-003)</h3>
                  {carne.grupoFamiliar.length === 0 ? (
                    <p className="text-[12px] text-ink-400">Sin beneficiarios registrados.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {carne.grupoFamiliar.map((b, i) => (
                        <div key={i} className="flex items-center justify-between bg-paper border border-line rounded-lg px-3.5 py-2.5">
                          <div>
                            <div className="text-[12.5px] font-semibold text-ink-900">{b.nombreCompleto}</div>
                            <div className="text-[11px] text-ink-400">{b.parentesco} · {b.numeroDocumento}</div>
                          </div>
                          <span className="text-[11px] font-bold text-[#047857] bg-[#d1fae5] px-2 py-0.5 rounded-full">Cat. {b.categoria}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
