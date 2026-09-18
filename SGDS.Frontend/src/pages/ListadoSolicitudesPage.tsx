import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import {
  getSolicitudesListado,
  getTiposSolicitudPorProyecto,
  type SolicitudResponseDto,
  type ConteoEstadoDto,
  type TipoSolicitudDto,
} from '../services/solicitudService';
import { getProyectosActivos, getProyectosAdmin, type ProyectoResponseDto } from '../services/proyectoService';
import { getColorProyecto } from '../config/colorPorProyecto';
import Paginador from '../components/shared/Paginador';

const POR_PAGINA = 8;

const ESTADO_STYLE: Record<string, string> = {
  Radicada: 'bg-[#f1f5f9] text-[#64748b]',
  'En revisión': 'bg-blue-100 text-blue-600',
  Pendiente: 'bg-[#fdf3e7] text-[#d97706]',
  'Requiere información': 'bg-[#f2ecff] text-[#7c3aed]',
  Aprobada: 'bg-[var(--color-accento-claro)] text-[var(--color-accento)]',
  Rechazada: 'bg-[#fdeaea] text-[#dc2626]',
  Finalizada: 'bg-[var(--color-accento-claro)] text-[var(--color-accento)]',
  Generada: 'bg-[#f1f5f9] text-[#64748b]',
  Pagada: 'bg-blue-100 text-blue-600',
  Entregada: 'bg-[var(--color-accento-claro)] text-[var(--color-accento)]',
  Anulada: 'bg-[#fdeaea] text-[#dc2626]',
  Agendado: 'bg-[#f1f5f9] text-[#64748b]',
  'En atención': 'bg-blue-100 text-blue-600',
  Atendido: 'bg-[var(--color-accento-claro)] text-[var(--color-accento)]',
  'No asistió': 'bg-[#fdeaea] text-[#dc2626]',
  Elaborada: 'bg-[#f1f5f9] text-[#64748b]',
  Expedida: 'bg-blue-100 text-blue-600',
  Legalizada: 'bg-[var(--color-accento-claro)] text-[var(--color-accento)]',
  Vencida: 'bg-[#fdeaea] text-[#dc2626]',
};

function formatearFecha(iso?: string) {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ListadoSolicitudesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const esAdmin = Boolean(user?.esAdminSyc);

  const proyectoIdUrl = searchParams.get('proyectoId');
  const [proyectoFiltro, setProyectoFiltro] = useState(proyectoIdUrl ?? '');

useEffect(() => {
  setProyectoFiltro(proyectoIdUrl ?? '');
}, [proyectoIdUrl]);
  const proyectoId = proyectoFiltro ? Number(proyectoFiltro) : undefined;

  const [proyecto, setProyecto] = useState<ProyectoResponseDto | null>(null);
  const [proyectosDisponibles, setProyectosDisponibles] = useState<ProyectoResponseDto[]>([]);
  const [tipos, setTipos] = useState<TipoSolicitudDto[]>([]);

  const [solicitudes, setSolicitudes] = useState<SolicitudResponseDto[]>([]);
  const [conteos, setConteos] = useState<ConteoEstadoDto[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [pagina, setPagina] = useState(1);

  // Operador nunca puede quitar el filtro de proyecto: si no viene en la URL, no hay nada que ver.
  const sinProyectoRequerido = !esAdmin && !proyectoId;

  useEffect(() => {
    const cargarProyectos = esAdmin ? getProyectosAdmin : getProyectosActivos;
    cargarProyectos().then(setProyectosDisponibles);
  }, [esAdmin]);

  useEffect(() => {
    if (!proyectoId) {
      setProyecto(null);
      setTipos([]);
      return;
    }
    getProyectosActivos().then((lista) => setProyecto(lista.find((p) => Number(p.id) === proyectoId) ?? null));
    getTiposSolicitudPorProyecto(proyectoId).then(setTipos);
  }, [proyectoId]);

  useEffect(() => {
    if (sinProyectoRequerido) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => {
      getSolicitudesListado({
        proyectoId,
        buscar: busqueda || undefined,
        estado: estadoFiltro || undefined,
        tipoSolicitudId: tipoFiltro ? Number(tipoFiltro) : undefined,
        pagina,
        tamanoPagina: POR_PAGINA,
      })
        .then((res) => {
          setSolicitudes(res.pagina.datos);
          setTotalRegistros(res.pagina.totalRegistros);
          setTotalPaginas(res.pagina.totalPaginas);
          setConteos(res.conteosPorEstado);
        })
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timeout);
  }, [proyectoId, busqueda, estadoFiltro, tipoFiltro, pagina, sinProyectoRequerido]);

  const totalTodas = conteos.reduce((sum, c) => sum + c.total, 0);
  const inicio = totalRegistros === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const fin = Math.min(pagina * POR_PAGINA, totalRegistros);
  const color = getColorProyecto(proyecto?.nombre);

  if (sinProyectoRequerido) {
    return (
      <div className="flex min-h-screen bg-paper">
        <Sidebar active="solicitudes" />
        <main className="flex-1 flex items-center justify-center text-sm text-ink-600">
          Selecciona un proyecto en "Mis proyectos" para ver sus solicitudes.
        </main>
      </div>
    );
  }

  if (proyectoId && !proyecto) {
    return (
      <div className="flex min-h-screen bg-paper">
        <Sidebar active="solicitudes" />
        <main className="flex-1 flex items-center justify-center text-sm text-ink-400">Cargando...</main>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen bg-paper"
      style={{ '--color-accento': color.primario, '--color-accento-claro': color.primarioClaro } as React.CSSProperties}
    >
      <Sidebar active="solicitudes" />

      <main className="flex-1 px-4 md:px-[38px] py-7 pt-16 md:pt-7 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="font-display text-[19px] font-semibold text-ink-900">
              Solicitudes{proyecto ? ` — ${proyecto.nombre}` : esAdmin ? ' — Todos los proyectos' : ''}
            </h1>
            <p className="text-ink-600 text-[12.5px] mt-[3px]">
              {totalTodas} solicitudes {proyecto ? 'registradas en este proyecto' : 'en total'}
            </p>
          </div>
          {proyectoId && (
            <div className="flex items-center flex-wrap gap-2.5">
              {proyecto?.nombre === 'IUVA' && (
                <button
                  onClick={() => navigate(`/vehiculos?proyectoId=${proyectoId}`)}
                  className="flex items-center gap-[7px] bg-white border border-line text-ink-600 rounded-[10px] px-4 py-[10px] text-[13px] font-semibold hover:bg-paper"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[15px] h-[15px] stroke-ink-600">
                    <rect x="3" y="10" width="16" height="7" rx="1.5" /><path d="M6 10l1.5-4h6L15 10" />
                    <circle cx="6.5" cy="17.5" r="1.6" /><circle cx="14.5" cy="17.5" r="1.6" />
                  </svg>
                  Vehículos
                </button>
              )}
              <button
                onClick={() => navigate(`/solicitudes/nueva?proyectoId=${proyectoId}`)}
                className="flex items-center gap-[7px] bg-[var(--color-accento)] text-white rounded-[10px] px-4 py-[10px] text-[13px] font-semibold shadow-[0_8px_18px_-6px_var(--color-accento)]"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" className="w-[15px] h-[15px] stroke-white">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Nueva solicitud
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 bg-white border border-line rounded-xl px-3.5 py-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-paper border border-line rounded-[9px] px-3 py-2">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-[15px] h-[15px] stroke-ink-400 shrink-0">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
            </svg>
            <input
              placeholder="Buscar por ID, afiliado, documento..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
              className="border-none outline-none bg-transparent text-[12.5px] w-full font-body"
            />
          </div>

          {esAdmin && (
            <select
              value={proyectoFiltro}
              onChange={(e) => { setProyectoFiltro(e.target.value); setTipoFiltro(''); setEstadoFiltro(''); setPagina(1); }}
              className="bg-paper border border-line rounded-[9px] px-3 py-2 text-xs text-ink-600 font-medium outline-none"
            >
              <option value="">Todos los proyectos</option>
              {proyectosDisponibles.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          )}

          {proyectoId && (
            <select
              value={tipoFiltro}
              onChange={(e) => { setTipoFiltro(e.target.value); setPagina(1); }}
              className="bg-paper border border-line rounded-[9px] px-3 py-2 text-xs text-ink-600 font-medium outline-none"
            >
              <option value="">Tipo de solicitud</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          )}

          <select disabled className="bg-paper border border-line rounded-[9px] px-3 py-2 text-xs text-ink-400 font-medium outline-none opacity-60">
            <option>Operador asignado</option>
          </select>
          <select disabled className="bg-paper border border-line rounded-[9px] px-3 py-2 text-xs text-ink-400 font-medium outline-none opacity-60">
            <option>Fecha</option>
          </select>
          {(busqueda || tipoFiltro || estadoFiltro) && (
            <button
              onClick={() => { setBusqueda(''); setTipoFiltro(''); setEstadoFiltro(''); setPagina(1); }}
              className="text-xs text-blue-600 font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => { setEstadoFiltro(''); setPagina(1); }}
            className={`text-xs font-semibold px-3.5 py-2 rounded-full ${
              estadoFiltro === '' ? 'bg-[#0f172a] text-white' : 'bg-white border border-line text-ink-600'
            }`}
          >
            Todas · {totalTodas}
          </button>
          {conteos.map((c) => (
            <button
              key={c.estado}
              onClick={() => { setEstadoFiltro(c.estado); setPagina(1); }}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full ${
                estadoFiltro === c.estado ? 'bg-[#0f172a] text-white' : `border border-line ${ESTADO_STYLE[c.estado] ?? 'bg-white text-ink-600'}`
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {c.estado} · {c.total}
            </button>
          ))}
        </div>

        <div className="bg-white border border-line rounded-[14px] overflow-hidden">
          <div className="px-5 py-[14px] border-b border-line">
            <span className="text-[12.5px] text-ink-600">
              Mostrando <b className="text-ink-900">{inicio}–{fin}</b> de <b className="text-ink-900">{totalRegistros}</b> solicitudes
            </span>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-ink-400">Cargando solicitudes...</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['ID', 'Tipo de solicitud', ...(proyecto ? [] : ['Proyecto']), 'Afiliado', 'Estado', 'Fecha', 'Operador', ''].map((h, i) => (
                    <th key={h} className={`text-left text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold px-5 py-[10px] border-b border-line whitespace-nowrap ${i === 0 ? 'sticky left-0 z-10 bg-white' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/solicitudes/${s.id}`)}
                    className="group cursor-pointer hover:bg-paper transition-colors"
                  >
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-paper px-5 py-[13px] text-[12px] border-b border-line text-ink-400 font-semibold whitespace-nowrap">#{s.numero}</td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">{s.tipoSolicitudNombre}</td>
                    {!proyecto && (
                      <td className="px-5 py-[13px] text-[13px] border-b border-line text-ink-600">{s.proyectoNombre}</td>
                    )}
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      <div className="font-semibold text-ink-900">{s.ciudadanoNombre ?? s.empresaNombre}</div>
                      <div className="text-[11px] text-ink-400">{s.ciudadanoDocumento ?? s.empresaNit ?? ''}</div>
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-[10px] py-[5px] rounded-full ${ESTADO_STYLE[s.estado] ?? 'bg-paper text-ink-600'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">{formatearFecha(s.fechaCreacion)}</td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      {s.usuarioAsignadoNombre ?? <span className="text-ink-400 italic">Sin asignar</span>}
                    </td>
                    <td className="px-5 py-[13px] border-b border-line">
                      <div className="w-6 h-6 rounded-full bg-paper flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-3 h-3 stroke-ink-400">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))}
                {solicitudes.length === 0 && (
                  <tr>
                    <td colSpan={proyecto ? 7 : 8} className="px-5 py-10 text-center text-sm text-ink-400">
                      No se encontraron solicitudes con estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}

          <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
        </div>
      </main>
    </div>
  );
}