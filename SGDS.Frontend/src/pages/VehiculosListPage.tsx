import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { getVehiculos, type VehiculoResponseDto } from '../services/vehiculoService';
import { useColorProyectoActivo } from '../hooks/useColorProyectoActivo';
import Paginador from '../components/shared/Paginador';

const POR_PAGINA = 6;

export default function VehiculosListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const proyectoIdParam = searchParams.get('proyectoId');
  const proyectoId = proyectoIdParam ? Number(proyectoIdParam) : undefined;

  const [vehiculos, setVehiculos] = useState<VehiculoResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    setLoading(true);
    getVehiculos({ proyectoId })
      .then(setVehiculos)
      .finally(() => setLoading(false));
  }, [proyectoId]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda]);

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return vehiculos;
    return vehiculos.filter((v) => {
      const propietario = v.ciudadanoNombre ?? v.empresaNombre ?? '';
      return v.placa.toLowerCase().includes(termino) || propietario.toLowerCase().includes(termino);
    });
  }, [vehiculos, busqueda]);

  const totalRegistros = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = totalRegistros === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1;
  const fin = Math.min(paginaActual * POR_PAGINA, totalRegistros);
  const enPagina = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const color = useColorProyectoActivo();

  return (
    <div
      className="flex min-h-screen bg-paper"
      style={{ '--color-accento': color.primario, '--color-accento-claro': color.primarioClaro } as React.CSSProperties}
    >
      <Sidebar active="solicitudes" />

      <main className="flex-1 px-4 md:px-[38px] py-7 pt-16 md:pt-7 overflow-y-auto">
        <button
          onClick={() => navigate(proyectoId ? `/solicitudes?proyectoId=${proyectoId}` : '/dashboard')}
          className="flex items-center gap-1.5 text-[12.5px] text-ink-600 font-medium mb-4 hover:text-ink-900"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-3.5 h-3.5 stroke-current">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver a solicitudes
        </button>

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-[19px] font-semibold text-ink-900">Vehículos</h1>
            <p className="text-ink-600 text-[12.5px] mt-[3px]">
              Registro de vehículos por placa — cada uno agrupa su historial de causaciones
            </p>
          </div>
          <button
            onClick={() => navigate(`/vehiculos/nuevo${proyectoId ? `?proyectoId=${proyectoId}` : ''}`)}
            className="flex items-center gap-[7px] bg-[var(--color-accento)] text-white rounded-[10px] px-4 py-[10px] text-[13px] font-semibold shadow-[0_8px_18px_-6px_var(--color-accento)]"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" className="w-[15px] h-[15px] stroke-white">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo vehículo
          </button>
        </div>

        <div className="flex items-center gap-2.5 bg-white border border-line rounded-xl px-3.5 py-3 mb-[18px] flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-paper border border-line rounded-[9px] px-3 py-2">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-[15px] h-[15px] stroke-ink-400 shrink-0">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
            </svg>
            <input
              placeholder="Buscar por placa o propietario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border-none outline-none bg-transparent text-[12.5px] w-full font-body"
            />
          </div>
        </div>

        <div className="bg-white border border-line rounded-[14px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-[14px] border-b border-line">
            <span className="text-[12.5px] text-ink-600">
              Mostrando <b className="text-ink-900">{inicio}–{fin}</b> de{' '}
              <b className="text-ink-900">{totalRegistros}</b> vehículos
            </span>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-ink-400">Cargando vehículos...</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Placa', 'Marca / Línea', 'Modelo', 'Propietario', ''].map((h, i) => (
                    <th
                      key={h}
                      className={`text-left text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold px-5 py-[10px] border-b border-line whitespace-nowrap ${i === 0 ? 'sticky left-0 z-10 bg-white' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enPagina.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/vehiculos/${v.id}${proyectoId ? `?proyectoId=${proyectoId}` : ''}`)}
                    className="group cursor-pointer hover:bg-paper transition-colors"
                  >
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-paper px-5 py-[13px] text-[13px] border-b border-line font-semibold text-ink-900 whitespace-nowrap">
                      <span className="inline-block bg-paper border border-line rounded-[6px] px-2 py-[3px] font-mono text-[12px] tracking-wide">
                        {v.placa}
                      </span>
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      {[v.marca, v.linea].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">{v.modelo ?? '—'}</td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      <div className="font-semibold text-ink-900">{v.ciudadanoNombre ?? v.empresaNombre ?? '—'}</div>
                      <div className="text-[11px] text-ink-400">{v.ciudadanoDocumento ?? v.empresaNit ?? ''}</div>
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      <div className="w-6 h-6 rounded-full bg-paper flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-3 h-3 stroke-ink-400">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))}
                {enPagina.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-400">
                      No se encontraron vehículos con estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}

          <Paginador pagina={paginaActual} totalPaginas={totalPaginas} onCambiar={setPagina} />
        </div>
      </main>
    </div>
  );
}
