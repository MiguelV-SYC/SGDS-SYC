import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import {
  getSolicitudDetalle,
  cambiarEstado,
  asignarUsuario,
  type SolicitudDetalleResponseDto,
} from '../services/solicitudService';
import { getOperadoresPorProyecto, type OperadorProyectoDto } from '../services/proyectoService';
import { subirDocumento } from '../services/documentoService';
import { getColorProyecto } from '../config/colorPorProyecto';
import { getTornaguia, type TornaguiaResponseDto } from '../services/infoconsumoService';
import MapaRuta from '../components/infoconsumo/MapaRuta';
import { llamarTurno, finalizarTurno, marcarNoAsistio } from '../services/libroTotalService';

const ESTADOS = ['Radicada', 'En revisión', 'Pendiente', 'Requiere información', 'Aprobada', 'Rechazada', 'Finalizada'];

const ESTADO_STYLE: Record<string, string> = {
  Radicada: 'bg-[#f1f5f9] text-[#64748b]',
  'En revisión': 'bg-blue-100 text-blue-600',
  Pendiente: 'bg-[#fdf3e7] text-[#d97706]',
  'Requiere información': 'bg-[#f2ecff] text-[#7c3aed]',
  Aprobada: 'bg-[var(--color-accento-claro)] text-[var(--color-accento)]',
  Rechazada: 'bg-[#fdeaea] text-[#dc2626]',
  Finalizada: 'bg-[var(--color-accento-claro)] text-[var(--color-accento)]',
  Elaborada: 'bg-[#f1f5f9] text-[#64748b]',
  Expedida: 'bg-blue-100 text-blue-600',
  Legalizada: 'bg-[var(--color-accento-claro)] text-[var(--color-accento)]',
  Vencida: 'bg-[#fdeaea] text-[#dc2626]',
  Generada: 'bg-[#f1f5f9] text-[#64748b]',
  Pagada: 'bg-blue-100 text-blue-600',
  Entregada: 'bg-[var(--color-accento-claro)] text-[var(--color-accento)]',
  Anulada: 'bg-[#fdeaea] text-[#dc2626]',
  Agendado: 'bg-[#f1f5f9] text-[#64748b]',
  'En atención': 'bg-blue-100 text-blue-600',
  Atendido: 'bg-[var(--color-accento-claro)] text-[var(--color-accento)]',
  'No asistió': 'bg-[#fdeaea] text-[#dc2626]',
};

function formatearFechaHora(iso?: string) {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function diasDesde(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return dias <= 0 ? 'Hoy' : `${dias} día${dias === 1 ? '' : 's'} desde radicación`;
}

export default function DetalleSolicitudPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [solicitud, setSolicitud] = useState<SolicitudDetalleResponseDto | null>(null);
  const [loading, setLoading] = useState(true);

  const [datosAdicionales, setDatosAdicionales] = useState<Record<string, string> | null>(null);
  const [tornaguiaInfo, setTornaguiaInfo] = useState<TornaguiaResponseDto | null>(null);

  const [modalEstado, setModalEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [guardandoEstado, setGuardandoEstado] = useState(false);

  const [modalReasignar, setModalReasignar] = useState(false);
  const [operadores, setOperadores] = useState<OperadorProyectoDto[]>([]);
  const [operadorElegido, setOperadorElegido] = useState('');
  const [guardandoReasignar, setGuardandoReasignar] = useState(false);

  const [modalDocumento, setModalDocumento] = useState(false);
  const [archivoElegido, setArchivoElegido] = useState<File | null>(null);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);
  const [errorDocumento, setErrorDocumento] = useState<string | null>(null);

  const [procesandoTurno, setProcesandoTurno] = useState(false);
  const [modalTipificacion, setModalTipificacion] = useState(false);
  const [tipificacionTexto, setTipificacionTexto] = useState('');

  async function cargar() {
    if (!id) return;
    setLoading(true);
    const s = await getSolicitudDetalle(Number(id));
    setSolicitud(s);
    try {
      setDatosAdicionales(s.datosAdicionales ? JSON.parse(s.datosAdicionales) : null);
    } catch {
      setDatosAdicionales(null);
    }
    if (s.proyectoNombre === 'Infoconsumo') {
      getTornaguia(s.id).then(setTornaguiaInfo).catch(() => setTornaguiaInfo(null));
    }
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, [id]);

  async function handleCambiarEstado() {
    if (!solicitud || !nuevoEstado) return;
    setGuardandoEstado(true);
    try {
      await cambiarEstado(solicitud.id, nuevoEstado);
      setModalEstado(false);
      await cargar();
    } catch (err: any) {
      alert(err?.response?.data?.mensaje ?? 'No se pudo cambiar el estado.');
    } finally {
      setGuardandoEstado(false);
    }
  }

  async function abrirReasignar() {
    if (!solicitud) return;
    setModalReasignar(true);
    setOperadorElegido('');
    const proyId = (solicitud as any).proyectoId ?? null;
    if (proyId) {
      const ops = await getOperadoresPorProyecto(proyId);
      setOperadores(ops);
    }
  }

  async function handleReasignar() {
    if (!solicitud || !operadorElegido) return;
    setGuardandoReasignar(true);
    try {
      await asignarUsuario(solicitud.id, Number(operadorElegido));
      setModalReasignar(false);
      await cargar();
    } catch (err: any) {
      alert(err?.response?.data?.mensaje ?? 'No se pudo reasignar.');
    } finally {
      setGuardandoReasignar(false);
    }
  }

  async function handleLlamarTurno() {
    if (!solicitud) return;
    setProcesandoTurno(true);
    try {
      await llamarTurno(solicitud.id);
      await cargar();
    } catch (err: any) {
      alert(err?.response?.data?.mensaje ?? 'No se pudo llamar el turno.');
    } finally {
      setProcesandoTurno(false);
    }
  }

  async function handleFinalizarTurno() {
    if (!solicitud || !tipificacionTexto.trim()) return;
    setProcesandoTurno(true);
    try {
      await finalizarTurno(solicitud.id, tipificacionTexto.trim());
      setModalTipificacion(false);
      setTipificacionTexto('');
      await cargar();
    } catch (err: any) {
      alert(err?.response?.data?.mensaje ?? 'No se pudo finalizar el turno.');
    } finally {
      setProcesandoTurno(false);
    }
  }

  async function handleMarcarNoAsistio() {
    if (!solicitud) return;
    setProcesandoTurno(true);
    try {
      await marcarNoAsistio(solicitud.id);
      await cargar();
    } catch (err: any) {
      alert(err?.response?.data?.mensaje ?? 'No se pudo marcar el turno como No asistió.');
    } finally {
      setProcesandoTurno(false);
    }
  }

  async function handleSubirDocumento() {
    if (!solicitud || !archivoElegido) return;
    setSubiendoDocumento(true);
    setErrorDocumento(null);
    try {
      await subirDocumento(solicitud.id, archivoElegido);
      setModalDocumento(false);
      setArchivoElegido(null);
      await cargar();
    } catch (err: any) {
      setErrorDocumento(err?.response?.data?.mensaje ?? 'No se pudo subir el documento.');
    } finally {
      setSubiendoDocumento(false);
    }
  }

  if (loading || !solicitud) {
    return (
      <div className="flex min-h-screen bg-paper">
        <Sidebar active="solicitudes" />
        <main className="flex-1 flex items-center justify-center text-sm text-ink-400">Cargando solicitud...</main>
      </div>
    );
  }

  const color = getColorProyecto(solicitud.proyectoNombre);
  // Infoconsumo: el estado "Vencida" nunca se persiste (se deriva de la vigencia de la
  // tornaguía) — se muestra el efectivo que ya calcula el backend en getTornaguia.
  const estadoMostrado = solicitud.proyectoNombre === 'Infoconsumo' && tornaguiaInfo ? tornaguiaInfo.estado : solicitud.estado;

  return (
    <div
      className="flex min-h-screen bg-paper"
      style={{ '--color-accento': color.primario, '--color-accento-claro': color.primarioClaro } as React.CSSProperties}
    >
      <Sidebar active="solicitudes" />

      <main className="flex-1 px-4 md:px-[38px] py-7 pt-16 md:pt-7 overflow-y-auto">
        <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-3.5">
          <span className="text-ink-600">{solicitud.proyectoNombre}</span>
          <span>/</span>
          <button onClick={() => navigate(-1)} className="hover:underline">Solicitudes</button>
          <span>/</span>
          <span className="text-ink-900 font-semibold">#{solicitud.numero}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[var(--color-accento-claro)] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-5 h-5 stroke-[var(--color-accento)]">
                <path d="M6 3h9l5 5v13H6z" /><path d="M14 3v5h5" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-[19px] font-semibold text-ink-900">
                #{solicitud.numero} · {solicitud.tipoSolicitudNombre}
              </h1>
              <p className="text-ink-600 text-[12.5px] mt-[2px]">
                Radicada el {formatearFechaHora(solicitud.fechaCreacion)} · {solicitud.proyectoNombre}
              </p>
            </div>
          </div>
          {!user?.esGerencial && (
          <div className="flex flex-wrap gap-2.5">
            {solicitud.proyectoNombre === 'IUVA' && (
              <button
                onClick={() => navigate(`/solicitudes/${solicitud.id}/preliquidacion`)}
                className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                  <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h1M8 12h1M8 16h1M12 8h4M12 12h4M12 16h4" />
                </svg>
                Preliquidación
              </button>
            )}
            {solicitud.proyectoNombre === 'Estampillas' && (
              <>
                <button
                  onClick={() => navigate(`/solicitudes/${solicitud.id}/editar`)}
                  className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Editar solicitud
                </button>
                <button
                  onClick={() => navigate(`/solicitudes/${solicitud.id}/preliquidacion-estampillas`)}
                  className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                    <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h1M8 12h1M8 16h1M12 8h4M12 12h4M12 16h4" />
                  </svg>
                  Preliquidación
                </button>
              </>
            )}
            {solicitud.proyectoNombre === 'Infoconsumo' && (
              <>
                <button
                  onClick={() => navigate(`/solicitudes/${solicitud.id}/editar`)}
                  className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Editar solicitud
                </button>
                <button
                  onClick={() => navigate(`/solicitudes/${solicitud.id}/tornaguia`)}
                  className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                    <path d="M17 3l4 4-4 4M7 21l-4-4 4-4" /><path d="M21 7H9M3 17h12" />
                  </svg>
                  Tornaguía
                </button>
                <button
                  onClick={() => navigate(`/solicitudes/${solicitud.id}/liquidacion-impoconsumo`)}
                  className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                    <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h1M8 12h1M8 16h1M12 8h4M12 12h4M12 16h4" />
                  </svg>
                  Impto consumo
                </button>
              </>
            )}
            {solicitud.proyectoNombre === 'SYCTrace' && (
              <button
                onClick={() => navigate(`/solicitudes/${solicitud.id}/estampilla`)}
                className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                  <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 12l2.5 2.5L16 9" />
                </svg>
                Estampilla
              </button>
            )}
            {solicitud.proyectoNombre === 'Gotrace' && (
              <>
                <button
                  onClick={() => navigate(`/solicitudes/${solicitud.id}/editar`)}
                  className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Editar solicitud
                </button>
                <button
                  onClick={() => navigate(`/solicitudes/${solicitud.id}/certificado-trazabilidad`)}
                  className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                    <circle cx="6" cy="12" r="2" /><circle cx="18" cy="12" r="2" /><path d="M8 12h8" />
                  </svg>
                  Ver certificado de trazabilidad
                </button>
              </>
            )}
            {solicitud.proyectoNombre === 'Libro Total' && (
              <>
                {solicitud.estado === 'Agendado' && (
                  <button
                    onClick={handleLlamarTurno}
                    disabled={procesandoTurno}
                    className="flex items-center gap-1.5 bg-[var(--color-accento)] text-white rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold disabled:opacity-60"
                  >
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-white">
                      <circle cx="12" cy="12" r="9" /><path d="M8 12l2.5 2.5L16 9" />
                    </svg>
                    Llamar turno
                  </button>
                )}
                {solicitud.estado === 'Agendado' && (
                  <button
                    onClick={handleMarcarNoAsistio}
                    disabled={procesandoTurno}
                    className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper disabled:opacity-60"
                  >
                    No asistió
                  </button>
                )}
                {solicitud.estado === 'En atención' && (
                  <button
                    onClick={() => { setTipificacionTexto(''); setModalTipificacion(true); }}
                    className="flex items-center gap-1.5 bg-[var(--color-accento)] text-white rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold"
                  >
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-white">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    Finalizar atención
                  </button>
                )}
                <button
                  onClick={() => navigate(`/solicitudes/${solicitud.id}/estado-cuenta`)}
                  className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                    <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h1M8 12h1M8 16h1M12 8h4M12 12h4M12 16h4" />
                  </svg>
                  Consulta consolidada
                </button>
              </>
            )}
            {solicitud.proyectoNombre === 'Pasivos Laborales' && (
              <>
                <button
                  onClick={() => navigate(`/solicitudes/${solicitud.id}/editar`)}
                  className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Editar solicitud
                </button>
                <button
                  onClick={() => navigate(`/solicitudes/${solicitud.id}/liquidacion-pasivo-laboral`)}
                  className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-paper"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                    <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h1M8 12h1M8 16h1M12 8h4M12 12h4M12 16h4" />
                  </svg>
                  Ver liquidación
                </button>
              </>
            )}
            <button
              onClick={() => { setArchivoElegido(null); setErrorDocumento(null); setModalDocumento(true); }}
              className="flex items-center gap-1.5 bg-white border border-line text-ink-600 rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6" />
              </svg>
              Adjuntar documento
            </button>
            {solicitud.proyectoNombre !== 'Infoconsumo' && solicitud.proyectoNombre !== 'SYCTrace' && solicitud.proyectoNombre !== 'Libro Total' && (
              <button
                onClick={() => { setNuevoEstado(solicitud.estado); setModalEstado(true); }}
                className="flex items-center gap-1.5 bg-[var(--color-accento)] text-white rounded-[9px] px-4 py-2 text-[12.5px] font-semibold"
              >
                Cambiar estado
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" className="w-3 h-3 stroke-white">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
          </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-line rounded-[14px] p-5">
              <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">Información de la solicitud</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-1">Estado actual</div>
                  <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-[10px] py-[5px] rounded-full ${ESTADO_STYLE[estadoMostrado] ?? 'bg-paper text-ink-600'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {estadoMostrado}
                  </span>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-1">Tipo de solicitud</div>
                  <div className="text-[13.5px] font-semibold text-ink-900">{solicitud.tipoSolicitudNombre}</div>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-1">Afiliado</div>
                  <div className="text-[13.5px] font-semibold text-ink-900">{solicitud.ciudadanoNombre ?? solicitud.empresaNombre}</div>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-1">Documento</div>
                  <div className="text-[13.5px] font-semibold text-ink-900">{solicitud.ciudadanoDocumento ?? solicitud.empresaNit}</div>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-1">Vehículo asociado</div>
                  {solicitud.vehiculoId ? (
                    <button
                      onClick={() => navigate(`/vehiculos/${solicitud.vehiculoId}?proyectoId=${solicitud.proyectoId}`)}
                      className="text-[13.5px] font-semibold text-[var(--color-accento)] hover:underline text-left"
                    >
                      Placa {solicitud.vehiculoPlaca}
                      {[solicitud.vehiculoMarca, solicitud.vehiculoLinea].filter(Boolean).length > 0
                        ? ` — ${[solicitud.vehiculoMarca, solicitud.vehiculoLinea].filter(Boolean).join(' ')}`
                        : ''}
                      {solicitud.vehiculoModelo ? ` · ${solicitud.vehiculoModelo}` : ''}
                    </button>
                  ) : (
                    <div className="text-[13.5px] font-semibold text-ink-900">—</div>
                  )}
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-1">Fecha de radicación</div>
                  <div className="text-[13.5px] font-semibold text-ink-900">{formatearFechaHora(solicitud.fechaCreacion)}</div>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-1">Última actualización</div>
                  <div className="text-[13.5px] font-semibold text-ink-900">
                    {formatearFechaHora(solicitud.historialEstados[0]?.fechaCambio ?? solicitud.fechaCreacion)}
                  </div>
                </div>
              </div>

              {datosAdicionales && Object.keys(datosAdicionales).length > 0 && (
                <div className="mt-4 bg-paper rounded-[9px] px-4 py-3 text-[12.5px] text-ink-900 flex flex-wrap gap-x-5 gap-y-1.5">
                  {Object.entries(datosAdicionales).map(([k, v]) => (
                    <span key={k}><b className="capitalize">{k}:</b> {v || '—'}</span>
                  ))}
                </div>
              )}
            </div>

            {solicitud.proyectoNombre === 'Infoconsumo' && tornaguiaInfo?.latOrigen != null && tornaguiaInfo?.lngOrigen != null && tornaguiaInfo?.latDestino != null && tornaguiaInfo?.lngDestino != null && (
              <div className="bg-white border border-line rounded-[14px] p-5">
                <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">Ruta de movilización</h3>
                <MapaRuta
                  latOrigen={tornaguiaInfo.latOrigen}
                  lngOrigen={tornaguiaInfo.lngOrigen}
                  latDestino={tornaguiaInfo.latDestino}
                  lngDestino={tornaguiaInfo.lngDestino}
                  labelOrigen={tornaguiaInfo.direccionEspecificaOrigen || `${tornaguiaInfo.municipioOrigen}, ${tornaguiaInfo.departamentoOrigen}`}
                  labelDestino={tornaguiaInfo.direccionEspecificaDestino || `${tornaguiaInfo.municipioDestino}, ${tornaguiaInfo.departamentoDestino}`}
                  tipoTransporte={tornaguiaInfo.tipoTransporte}
                  color={color.primario}
                  alturaPx={260}
                />
                {tornaguiaInfo.distanciaAproximadaKm != null && (
                  <p className="text-[11px] text-ink-400 mt-2">
                    {tornaguiaInfo.distanciaEsPorCarretera
                      ? <>Distancia real por carretera: {tornaguiaInfo.distanciaAproximadaKm.toFixed(0)} km (calculada con OSRM).</>
                      : <>Distancia aproximada: {tornaguiaInfo.distanciaAproximadaKm.toFixed(0)} km (línea recta, no distancia vial real).</>}
                  </p>
                )}
              </div>
            )}

            <div className="bg-white border border-line rounded-[14px] p-5">
              <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">Historial de estados</h3>
              <div className="flex flex-col">
                {solicitud.historialEstados.length === 0 && (
                  <p className="text-xs text-ink-400">Sin cambios de estado registrados todavía.</p>
                )}
                {solicitud.historialEstados.map((h, i) => (
                  <div key={i} className="flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${i === 0 ? 'border-[var(--color-accento)] bg-[var(--color-accento-claro)]' : 'border-line bg-white'}`} />
                      {i < solicitud.historialEstados.length - 1 && <div className="w-px flex-1 bg-line" />}
                    </div>
                    <div className="pb-1">
                      <div className="text-[13.5px] font-semibold text-ink-900">{h.estadoNuevo}</div>
                      <div className="text-[11.5px] text-ink-400 mb-1">
                        {h.usuarioNombre ?? 'Sistema'} · {formatearFechaHora(h.fechaCambio)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-line rounded-[14px] p-5">
              <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">Documentos adjuntos</h3>
              {solicitud.documentos.length === 0 ? (
                <p className="text-xs text-ink-400 mb-3">Esta solicitud no tiene documentos adjuntos todavía.</p>
              ) : (
                <div className="flex flex-col gap-1.5 mb-3">
                  {solicitud.documentos.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 bg-paper border border-line rounded-[9px] px-3.5 py-2.5">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-4 h-4 stroke-ink-600 shrink-0">
                        <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6" />
                      </svg>
                      <div className="flex-1">
                        <div className="text-[13px] font-semibold text-ink-900">{d.nombreArchivo}</div>
                        <div className="text-[11px] text-ink-400">Subido {formatearFechaHora(d.fecha)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border border-dashed border-line rounded-xl px-4 py-6 text-center text-[12px] text-ink-400">
                Adjuntar documentos estará disponible en el módulo de Documentos.
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white border border-line rounded-[14px] p-4">
              <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-2.5">Operador asignado</div>
              {solicitud.usuarioAsignadoNombre ? (
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {solicitud.usuarioAsignadoNombre.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                  </div>
                  <div className="text-[13px] font-semibold text-ink-900">{solicitud.usuarioAsignadoNombre}</div>
                </div>
              ) : (
                <p className="text-xs text-ink-400 italic mb-2">Sin asignar</p>
              )}
              {(user?.esAdminSyc || user?.esGerencial) && (
                <button onClick={abrirReasignar} className="text-[12px] font-semibold text-blue-600">Reasignar</button>
              )}
            </div>

            <div className="bg-white border border-line rounded-[14px] p-4">
              <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-2">Ciudadano vinculado</div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {(solicitud.ciudadanoNombre ?? solicitud.empresaNombre ?? '').split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-ink-900">{solicitud.ciudadanoNombre ?? solicitud.empresaNombre}</div>
                  <div className="text-[11px] text-ink-400">{solicitud.ciudadanoDocumento ?? solicitud.empresaNit}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-line rounded-[14px] p-4">
              <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-1.5">Proyecto</div>
              <div className="text-[13px] font-semibold text-ink-900">{solicitud.proyectoNombre}</div>
            </div>

            <div className="bg-white border border-line rounded-[14px] p-4">
              <div className="text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold mb-1.5">Días en curso</div>
              <div className="text-[13px] font-semibold text-ink-900">{diasDesde(solicitud.fechaCreacion)}</div>
            </div>
          </div>
        </div>
      </main>

      {modalEstado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000] p-6">
          <div className="bg-white rounded-2xl p-7 w-full max-w-[380px]">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Cambiar estado</h2>
            <select
              value={nuevoEstado}
              onChange={(e) => setNuevoEstado(e.target.value)}
              className="w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none mb-5"
            >
              {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <div className="flex gap-2.5">
              <button onClick={() => setModalEstado(false)} className="flex-1 py-2.5 rounded-[9px] border border-line text-ink-600 text-sm font-medium">
                Cancelar
              </button>
              <button
                onClick={handleCambiarEstado}
                disabled={guardandoEstado}
                className="flex-1 py-2.5 rounded-[9px] bg-[var(--color-accento)] text-white text-sm font-semibold disabled:opacity-60"
              >
                {guardandoEstado ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalReasignar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000] p-6">
          <div className="bg-white rounded-2xl p-7 w-full max-w-[380px]">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Reasignar operador</h2>
            {operadores.length === 0 ? (
              <p className="text-xs text-ink-400 mb-5">No hay operadores disponibles para este proyecto.</p>
            ) : (
              <select
                value={operadorElegido}
                onChange={(e) => setOperadorElegido(e.target.value)}
                className="w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none mb-5"
              >
                <option value="">Selecciona un operador</option>
                {operadores.map((o) => (
                  <option key={o.usuarioId} value={o.usuarioId}>{o.nombreCompleto} — {o.rolNombre}</option>
                ))}
              </select>
            )}
            <div className="flex gap-2.5">
              <button onClick={() => setModalReasignar(false)} className="flex-1 py-2.5 rounded-[9px] border border-line text-ink-600 text-sm font-medium">
                Cancelar
              </button>
              <button
                onClick={handleReasignar}
                disabled={guardandoReasignar || !operadorElegido}
                className="flex-1 py-2.5 rounded-[9px] bg-[var(--color-accento)] text-white text-sm font-semibold disabled:opacity-60"
              >
                {guardandoReasignar ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalTipificacion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000] p-6">
          <div className="bg-white rounded-2xl p-7 w-full max-w-[380px]">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Tipificar y finalizar atención</h2>
            <label className="block text-xs font-semibold text-ink-900 mb-1.5">Tipificación de la atención</label>
            <textarea
              value={tipificacionTexto}
              onChange={(e) => setTipificacionTexto(e.target.value)}
              rows={3}
              placeholder="Ej: Trámite informativo de vehículos exitoso"
              className="w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none resize-none mb-5"
            />
            <div className="flex gap-2.5">
              <button onClick={() => setModalTipificacion(false)} className="flex-1 py-2.5 rounded-[9px] border border-line text-ink-600 text-sm font-medium">
                Cancelar
              </button>
              <button
                onClick={handleFinalizarTurno}
                disabled={procesandoTurno || !tipificacionTexto.trim()}
                className="flex-1 py-2.5 rounded-[9px] bg-[var(--color-accento)] text-white text-sm font-semibold disabled:opacity-60"
              >
                {procesandoTurno ? 'Guardando...' : 'Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalDocumento && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000] p-6">
          <div className="bg-white rounded-2xl p-7 w-full max-w-[380px]">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Adjuntar documento</h2>
            <input
              type="file"
              onChange={(e) => setArchivoElegido(e.target.files?.[0] ?? null)}
              className="w-full text-[13px] mb-5"
            />
            {errorDocumento && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {errorDocumento}
              </div>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={() => setModalDocumento(false)}
                className="flex-1 py-2.5 rounded-[9px] border border-line text-ink-600 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubirDocumento}
                disabled={subiendoDocumento || !archivoElegido}
                className="flex-1 py-2.5 rounded-[9px] bg-[var(--color-accento)] text-white text-sm font-semibold disabled:opacity-60"
              >
                {subiendoDocumento ? 'Subiendo...' : 'Subir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}