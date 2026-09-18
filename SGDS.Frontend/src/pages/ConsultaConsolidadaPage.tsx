import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { getConsultaConsolidada, type ConsultaConsolidadaResponseDto } from '../services/libroTotalService';
import { getColorProyecto } from '../config/colorPorProyecto';

const ESTADO_STYLE: Record<string, string> = {
  Radicada: 'bg-[#f1f5f9] text-[#64748b]', Agendado: 'bg-[#f1f5f9] text-[#64748b]', Elaborada: 'bg-[#f1f5f9] text-[#64748b]', Generada: 'bg-[#f1f5f9] text-[#64748b]',
  'En revisión': 'bg-blue-100 text-blue-600', 'En atención': 'bg-blue-100 text-blue-600', Expedida: 'bg-blue-100 text-blue-600',
  Pendiente: 'bg-[#fdf3e7] text-[#d97706]',
  'Requiere información': 'bg-[#f2ecff] text-[#7c3aed]',
  Aprobada: 'bg-[#e3f7f4] text-[#0d9488]', Atendido: 'bg-[#e3f7f4] text-[#0d9488]',
  Pagada: 'bg-[#e3f7f4] text-[#0d9488]', Legalizada: 'bg-[#e3f7f4] text-[#0d9488]', Finalizada: 'bg-[#e3f7f4] text-[#0d9488]', Entregada: 'bg-[#e3f7f4] text-[#0d9488]',
  Rechazada: 'bg-[#fdeaea] text-[#dc2626]', Anulada: 'bg-[#fdeaea] text-[#dc2626]', 'No asistió': 'bg-[#fdeaea] text-[#dc2626]', Vencida: 'bg-[#fdeaea] text-[#dc2626]',
};

export default function ConsultaConsolidadaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [documento, setDocumento] = useState(searchParams.get('documento') ?? '');
  const [resultado, setResultado] = useState<ConsultaConsolidadaResponseDto | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const color = getColorProyecto('Libro Total');

  async function handleBuscar() {
    if (!documento.trim()) return;
    setBuscando(true);
    setError(null);
    setResultado(null);
    try {
      const data = await getConsultaConsolidada(documento.trim());
      setResultado(data);
    } catch (err: any) {
      setError(err?.response?.data?.mensaje ?? 'No se pudo consultar el ciudadano.');
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div
      className="flex min-h-screen bg-paper"
      style={{ '--color-accento': color.primario, '--color-accento-claro': color.primarioClaro } as React.CSSProperties}
    >
      <Sidebar active="solicitudes" />

      <main className="flex-1 px-4 md:px-[38px] py-7 pt-16 md:pt-7 overflow-y-auto">
        <h1 className="font-display text-[19px] font-semibold text-ink-900 mb-1">Consulta consolidada</h1>
        <p className="text-ink-600 text-[12.5px] mb-6">Un solo lugar para ver todos los trámites de un ciudadano en los proyectos SYC.</p>

        <div className="bg-white border border-line rounded-[14px] p-6 mb-5 max-w-[640px]">
          <h3 className="font-display text-[14.5px] font-semibold text-ink-900 mb-1">Buscar ciudadano</h3>
          <p className="text-[12.5px] text-ink-600 mb-4">
            Ingresa el número de documento para consultar su estado en todos los proyectos donde tenga actividad.
          </p>
          <div className="flex gap-2.5">
            <input
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              placeholder="Ej: 91234567"
              className="flex-1 py-3 px-4 border-[1.5px] border-line rounded-[10px] text-[14px] outline-none focus:border-[var(--color-accento)]"
            />
            <button
              onClick={handleBuscar}
              disabled={buscando || !documento.trim()}
              className="flex items-center gap-2 bg-[var(--color-accento)] text-white rounded-[10px] px-5 text-[13.5px] font-semibold disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-4 h-4 stroke-white"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              {buscando ? 'Consultando...' : 'Consultar'}
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-[640px] text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-5">{error}</div>
        )}

        {resultado && (
          <div className="max-w-[640px] flex flex-col gap-4">
            <div className="flex items-center gap-3.5 bg-white border border-line rounded-[14px] px-5 py-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-accento-claro)] text-[var(--color-accento)] flex items-center justify-center font-bold text-[15px] shrink-0">
                {resultado.ciudadanoNombre.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-display text-[15.5px] font-semibold text-ink-900">{resultado.ciudadanoNombre}</div>
                <div className="text-[12px] text-ink-600">
                  CC {resultado.ciudadanoDocumento}{resultado.ciudadanoCiudad ? ` · ${resultado.ciudadanoCiudad}` : ''}
                </div>
              </div>
              <div className="flex gap-2">
                <span className="bg-[var(--color-accento-claro)] text-[var(--color-accento)] text-[11px] font-bold px-3 py-1.5 rounded-full">
                  {resultado.totalTramitesActivos} trámites activos
                </span>
                <span className="bg-[var(--color-accento-claro)] text-[var(--color-accento)] text-[11px] font-bold px-3 py-1.5 rounded-full">
                  {resultado.totalProyectos} proyectos
                </span>
              </div>
            </div>

            {resultado.proyectos.map((p) => {
              const colorProyecto = getColorProyecto(p.proyectoNombre);
              return (
                <div key={p.proyectoId} className="bg-white border border-line rounded-[14px] overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-line">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: colorProyecto.primario }}>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-4 h-4 stroke-white">
                        <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 12h8" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[13.5px] font-bold text-ink-900">{p.proyectoNombre}</div>
                      {p.solicitudes.length === 0 && <div className="text-[11px] text-ink-600">Sin actividad registrada</div>}
                    </div>
                  </div>
                  {p.solicitudes.length === 0 ? (
                    <p className="px-5 py-4 text-[12px] text-ink-400 italic">Este ciudadano no tiene trámites en {p.proyectoNombre}</p>
                  ) : (
                    <div className="px-5 py-1">
                      {p.solicitudes.map((s) => (
                        <button
                          type="button"
                          key={s.solicitudId}
                          onClick={() => navigate(`/solicitudes/${s.solicitudId}`)}
                          className="w-full text-left flex items-center justify-between gap-3 py-2.5 border-b border-paper last:border-b-0 text-[12.5px] cursor-pointer hover:text-[var(--color-accento)]"
                        >
                          <span className="text-ink-400 font-semibold text-[11.5px] shrink-0">#{s.numero}</span>
                          <span className="flex-1">{s.descripcion}</span>
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-[10px] py-[4px] rounded-full shrink-0 ${ESTADO_STYLE[s.estado] ?? 'bg-paper text-ink-600'}`}>
                            {s.estado}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => navigate(`/librototal/estado-cuenta?documento=${encodeURIComponent(resultado.ciudadanoDocumento)}`)}
              className="self-start flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-4 py-2.5 text-[13px] font-semibold hover:bg-paper"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[15px] h-[15px] stroke-ink-600">
                <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h1M8 12h1M8 16h1M12 8h4M12 12h4M12 16h4" />
              </svg>
              Generar estado de cuenta
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
