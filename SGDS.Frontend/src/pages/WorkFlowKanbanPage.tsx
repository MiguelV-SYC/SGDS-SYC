import { useState, useEffect, type DragEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { alPresionarEnterOEspacio } from '../utils/teclado';
import {
  getSolicitudesListado,
  cambiarEstado,
  type SolicitudResponseDto,
} from '../services/solicitudService';
import { getProyectosActivos, getProyectosAdmin, type ProyectoResponseDto } from '../services/proyectoService';
import SelectorProyecto from '../components/shared/SelectorProyecto';
import { getColorProyecto } from '../config/colorPorProyecto';
import { getKanbanInfoconsumo, type TarjetaKanbanInfoconsumoDto } from '../services/infoconsumoService';
import { getKanbanLibroTotal, getSedes, type TarjetaKanbanTurnoDto, type SedeResponseDto } from '../services/libroTotalService';

// Infoconsumo reemplaza el workflow genérico de 7 estados por su propio ciclo de vida
// (sección 3 de las reglas de negocio) — se muestra en un tablero aparte, sin arrastrar
// tarjetas: los cambios de estado exigen las validaciones de /expedir y /legalizar.
const COLUMNAS_INFOCONSUMO = [
  { estado: 'Elaborada', dot: 'bg-[#64748b]' },
  { estado: 'Expedida', dot: 'bg-blue-600' },
  { estado: 'Legalizada', dot: 'bg-[var(--color-accento)]' },
  { estado: 'Vencida', dot: 'bg-[#dc2626]' },
];

// SYCTrace reemplaza el workflow genérico por el ciclo de vida de la estampilla física
// (RN-04) — igual que Infoconsumo, se muestra en tablero de solo lectura sin arrastrar
// tarjetas: los cambios de estado exigen las validaciones de /confirmar-pago, /entregar y /anular.
const COLUMNAS_SYCTRACE = [
  { estado: 'Generada', dot: 'bg-[#64748b]' },
  { estado: 'Pagada', dot: 'bg-blue-600' },
  { estado: 'Entregada', dot: 'bg-[var(--color-accento)]' },
  { estado: 'Anulada', dot: 'bg-[#dc2626]' },
];

// Libro Total sustituye el workflow genérico por el tablero de Turnos de una sede (RN:
// "en vez de un Kanban de solicitudes, el operador ve una lista priorizada de personas
// esperando en su sede actual") — tablero de solo lectura, las transiciones de estado
// exigen las validaciones de /llamar, /finalizar y /marcar-no-asistio.
const COLUMNAS_LIBROTOTAL = [
  { estado: 'Agendado', dot: 'bg-[#64748b]' },
  { estado: 'En atención', dot: 'bg-blue-600' },
  { estado: 'Atendido', dot: 'bg-[var(--color-accento)]' },
  { estado: 'No asistió', dot: 'bg-[#dc2626]' },
];

const COLUMNAS = [
  { estado: 'Radicada', dot: 'bg-[#64748b]' },
  { estado: 'En revisión', dot: 'bg-blue-600' },
  { estado: 'Pendiente', dot: 'bg-[#d97706]' },
  { estado: 'Requiere información', dot: 'bg-[#7c3aed]' },
  { estado: 'Aprobada', dot: 'bg-[var(--color-accento)]' },
  { estado: 'Rechazada', dot: 'bg-[#dc2626]' },
  { estado: 'Finalizada', dot: 'bg-[var(--color-accento)]' },
];

const TERMINALES = ['Aprobada', 'Rechazada', 'Finalizada'];

const OPCIONES_TIEMPO = [
  { valor: 'hoy', label: 'Hoy', dias: 0 },
  { valor: '7d', label: 'Últimos 7 días', dias: 7 },
  { valor: '15d', label: 'Últimos 15 días', dias: 15 },
  { valor: '1m', label: 'Último mes', dias: 30 },
  { valor: 'todas', label: 'Ver todas', dias: null as number | null },
];

function dentroDelRango(iso: string, dias: number | null) {
  if (dias === null) return true;
  if (dias === 0) {
    const fecha = new Date(iso);
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  }
  return Date.now() - new Date(iso).getTime() <= dias * 86400000;
}

function diasDesde(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return dias <= 0 ? 'Hoy' : `Hace ${dias} día${dias === 1 ? '' : 's'}`;
}

export default function WorkflowKanbanPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const proyectoId = Number(searchParams.get('proyectoId'));
  const [proyectosDisponibles, setProyectosDisponibles] = useState<ProyectoResponseDto[]>([]);

  useEffect(() => {
    getProyectosAdmin().then(setProyectosDisponibles);
  }, []);

  const [proyecto, setProyecto] = useState<ProyectoResponseDto | null>(null);
  const [columnas, setColumnas] = useState<Record<string, SolicitudResponseDto[]>>({});
  const [totales, setTotales] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tarjetaArrastrada, setTarjetaArrastrada] = useState<SolicitudResponseDto | null>(null);
  const [columnaSobre, setColumnaSobre] = useState<string | null>(null);

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroTiempo, setFiltroTiempo] = useState('7d');

  const [tarjetasInfoconsumo, setTarjetasInfoconsumo] = useState<Record<string, TarjetaKanbanInfoconsumoDto[]>>({});
  const [filtroTipoInfoconsumo, setFiltroTipoInfoconsumo] = useState('');

  const [sedesLibroTotal, setSedesLibroTotal] = useState<SedeResponseDto[]>([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState<number | null>(null);
  const [tarjetasLibroTotal, setTarjetasLibroTotal] = useState<Record<string, TarjetaKanbanTurnoDto[]>>({});

  async function cargar(cols: typeof COLUMNAS = COLUMNAS) {
    if (!proyectoId) return;
    setLoading(true);
    const resultados = await Promise.all(
      cols.map((c) =>
        getSolicitudesListado({ proyectoId, estado: c.estado, pagina: 1, tamanoPagina: 20 })
      )
    );
    const nuevasColumnas: Record<string, SolicitudResponseDto[]> = {};
    const nuevosTotales: Record<string, number> = {};
    cols.forEach((c, i) => {
      nuevasColumnas[c.estado] = resultados[i].pagina.datos;
      nuevosTotales[c.estado] = resultados[i].pagina.totalRegistros;
    });
    setColumnas(nuevasColumnas);
    setTotales(nuevosTotales);
    setLoading(false);
  }

  async function cargarInfoconsumo() {
    if (!proyectoId) return;
    setLoading(true);
    const tarjetas = await getKanbanInfoconsumo(proyectoId);
    const nuevasColumnas: Record<string, TarjetaKanbanInfoconsumoDto[]> = {};
    COLUMNAS_INFOCONSUMO.forEach((c) => {
      nuevasColumnas[c.estado] = tarjetas.filter((t) => t.estado === c.estado);
    });
    setTarjetasInfoconsumo(nuevasColumnas);
    setLoading(false);
  }

  async function cargarLibroTotal(sedeId: number) {
    setLoading(true);
    const tarjetas = await getKanbanLibroTotal(sedeId);
    const nuevasColumnas: Record<string, TarjetaKanbanTurnoDto[]> = {};
    COLUMNAS_LIBROTOTAL.forEach((c) => {
      nuevasColumnas[c.estado] = tarjetas.filter((t) => t.estado === c.estado);
    });
    setTarjetasLibroTotal(nuevasColumnas);
    setLoading(false);
  }

  useEffect(() => {
    if (!proyectoId) return;
    getProyectosActivos().then((lista) => {
      const p = lista.find((x) => x.id === proyectoId) ?? null;
      setProyecto(p);
      if (p?.nombre === 'Infoconsumo') {
        cargarInfoconsumo();
      } else if (p?.nombre === 'SYCTrace') {
        cargar(COLUMNAS_SYCTRACE);
      } else if (p?.nombre === 'Libro Total') {
        getSedes().then((sedes) => {
          setSedesLibroTotal(sedes);
          const sedeIdUrl = Number(searchParams.get('sedeId'));
          const sedeInicial = sedes.find((s) => s.id === sedeIdUrl)?.id ?? sedes[0]?.id ?? null;
          setSedeSeleccionada(sedeInicial);
          if (sedeInicial) cargarLibroTotal(sedeInicial);
          else setLoading(false);
        });
      } else {
        cargar();
      }
    });
  }, [proyectoId]);

  function handleDragStart(s: SolicitudResponseDto) {
    setTarjetaArrastrada(s);
  }

  function handleDrop(estadoDestino: string) {
    if (!tarjetaArrastrada || tarjetaArrastrada.estado === estadoDestino) {
      setColumnaSobre(null);
      return;
    }
    const s = tarjetaArrastrada;
    setColumnaSobre(null);
    setTarjetaArrastrada(null);

    // Movimiento optimista: la tarjeta cambia de columna de inmediato en pantalla
    setColumnas((prev) => ({
      ...prev,
      [s.estado]: prev[s.estado].filter((x) => x.id !== s.id),
      [estadoDestino]: [{ ...s, estado: estadoDestino }, ...prev[estadoDestino]],
    }));
    setTotales((prev) => ({
      ...prev,
      [s.estado]: prev[s.estado] - 1,
      [estadoDestino]: prev[estadoDestino] + 1,
    }));

    cambiarEstado(s.id, estadoDestino).catch((err) => {
      alert(err?.response?.data?.mensaje ?? 'No se pudo cambiar el estado. Se revierte el cambio.');
      cargar(); // si falla en el backend, recarga desde cero para deshacer el optimismo
    });
  }

  if (!proyectoId) {
  return (
    <div className="flex h-screen bg-paper">
      <Sidebar active="workflow" />
      <main className="flex-1 overflow-y-auto">
        <SelectorProyecto
          titulo="Elige un proyecto"
          descripcion="Selecciona el proyecto cuyo workflow quieres ver."
          proyectos={proyectosDisponibles}
          onElegir={(id) => navigate(`/workflow?proyectoId=${id}`)}
        />
      </main>
    </div>
  );
}

  if (!proyecto) {
  return (
    <div className="flex h-screen bg-paper">
      <Sidebar active="workflow" />
      <main className="flex-1 flex items-center justify-center text-sm text-ink-400">Cargando...</main>
    </div>
  );
}

  const esInfoconsumo = proyecto?.nombre === 'Infoconsumo';
  const esSycTrace = proyecto?.nombre === 'SYCTrace';
  const esLibroTotal = proyecto?.nombre === 'Libro Total';
  const nombreSedeSeleccionada = sedesLibroTotal.find((s) => s.id === sedeSeleccionada)?.nombre ?? '';

  const tiposDisponibles = [
    ...new Set(
      Object.values(columnas)
        .flat()
        .map((s) => s.tipoSolicitudNombre)
        .filter(Boolean)
    ),
  ] as string[];

  const tiposDisponiblesInfoconsumo = [
    ...new Set(
      Object.values(tarjetasInfoconsumo)
        .flat()
        .map((t) => t.tipoTramite)
        .filter(Boolean)
    ),
  ] as string[];

  const color = getColorProyecto(proyecto?.nombre);

  return (
    <div
      className="flex min-h-screen bg-paper"
      style={{ '--color-accento': color.primario, '--color-accento-claro': color.primarioClaro } as React.CSSProperties}
    >
      <Sidebar active="workflow" />

      <main className="flex-1 px-4 md:px-[38px] py-7 pt-16 md:pt-7 overflow-y-auto overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="font-display text-[19px] font-semibold text-ink-900">
              {esLibroTotal ? `Turnos — Sede ${nombreSedeSeleccionada}` : `Workflow — ${proyecto?.nombre ?? '...'}`}
            </h1>
            <p className="text-ink-600 text-[12.5px] mt-[3px]">
              {esInfoconsumo
                ? 'Solo lectura — usa "Tornaguía" en cada solicitud para expedir/legalizar'
                : esSycTrace
                  ? 'Solo lectura — usa "Estampilla" en cada solicitud para confirmar pago/entregar/anular'
                  : esLibroTotal
                    ? 'Solo lectura — usa "Llamar turno"/"Finalizar atención" en cada turno; fila del día de hoy'
                    : 'Arrastra una tarjeta para cambiar su estado'}
            </p>
          </div>
          <div className="flex bg-white border border-line rounded-[10px] p-1">
            <button
              onClick={() => navigate(`/solicitudes?proyectoId=${proyectoId}`)}
              className="px-4 py-1.5 rounded-[7px] text-[12.5px] font-semibold text-ink-600"
            >
              Lista
            </button>
            <button className="px-4 py-1.5 rounded-[7px] text-[12.5px] font-semibold bg-[#0f172a] text-white">
              Kanban
            </button>
          </div>
        </div>

        {esLibroTotal && (
          <div className="flex items-center gap-2.5 mb-4">
            <select
              value={sedeSeleccionada ?? ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSedeSeleccionada(id);
                cargarLibroTotal(id);
              }}
              className="bg-white border border-line rounded-[9px] px-3 py-2 text-xs text-ink-600 font-medium outline-none"
            >
              {sedesLibroTotal.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        )}

        {esInfoconsumo ? (
          <div className="flex items-center gap-2.5 mb-4">
            <select
              value={filtroTipoInfoconsumo}
              onChange={(e) => setFiltroTipoInfoconsumo(e.target.value)}
              className="bg-white border border-line rounded-[9px] px-3 py-2 text-xs text-ink-600 font-medium outline-none"
            >
              <option value="">Todos los tipos de trámite</option>
              {tiposDisponiblesInfoconsumo.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        ) : esSycTrace ? (
          <div className="flex items-center gap-2.5 mb-4">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-white border border-line rounded-[9px] px-3 py-2 text-xs text-ink-600 font-medium outline-none"
            >
              <option value="">Todos los tipos</option>
              {tiposDisponibles.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        ) : esLibroTotal ? null : (
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-white border border-line rounded-[9px] px-3 py-2 text-xs text-ink-600 font-medium outline-none"
            >
              <option value="">Todos los tipos</option>
              {tiposDisponibles.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={filtroTiempo}
              onChange={(e) => setFiltroTiempo(e.target.value)}
              className="bg-white border border-line rounded-[9px] px-3 py-2 text-xs text-ink-600 font-medium outline-none"
              title="Aplica solo a Aprobada, Rechazada y Finalizada"
            >
              {OPCIONES_TIEMPO.map((o) => (
                <option key={o.valor} value={o.valor}>{o.label}</option>
              ))}
            </select>
            <span className="w-full sm:w-auto text-[11px] text-ink-400">
              El filtro de tiempo solo aplica a las columnas Aprobada, Rechazada y Finalizada
            </span>
          </div>
        )}

        {loading ? (
          <div className="text-center text-sm text-ink-400 py-10">Cargando workflow...</div>
        ) : esInfoconsumo ? (
          <div className="flex flex-col md:flex-row gap-3.5 md:min-w-max pb-4">
            {COLUMNAS_INFOCONSUMO.map((c) => {
              let tarjetas = tarjetasInfoconsumo[c.estado] ?? [];
              if (filtroTipoInfoconsumo) {
                tarjetas = tarjetas.filter((t) => t.tipoTramite === filtroTipoInfoconsumo);
              }
              return (
                <div key={c.estado} className="w-full md:w-[290px] shrink-0 rounded-2xl p-3 bg-[#eef2f7]">
                  <div className="flex items-center gap-2 px-1.5 py-1 mb-2.5">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className="text-[13.5px] font-semibold text-ink-900 flex-1">{c.estado}</span>
                    <span className="text-[11px] font-bold text-ink-600 bg-white rounded-full px-2 py-[2px]">
                      {tarjetas.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto overflow-x-auto">
                    {tarjetas.map((t) => (
                      <div
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/solicitudes/${t.id}`)}
                        onKeyDown={alPresionarEnterOEspacio(() => navigate(`/solicitudes/${t.id}`))}
                        className="bg-white rounded-xl p-3.5 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="text-[11px] text-ink-400 font-semibold mb-1">#{t.numero}</div>
                        <div className="text-[13px] font-semibold text-ink-900 mb-0.5">{t.tipoTramite}</div>
                        <div className="text-[12px] text-ink-600 mb-2.5">{t.empresaNombre}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-ink-300 text-xs">—</span>
                          <span className="text-[11px] text-ink-400">{diasDesde(t.fechaCreacion)}</span>
                        </div>
                      </div>
                    ))}
                    {tarjetas.length === 0 && (
                      <p className="text-[11.5px] text-ink-400 text-center py-4">Sin tornaguías en este estado.</p>
                    )}
                  </div>
                  {c.estado === 'Elaborada' && (
                    <button
                      onClick={() => navigate(`/solicitudes/nueva?proyectoId=${proyectoId}`)}
                      className="w-full mt-2.5 py-2.5 rounded-xl border-2 border-dashed border-line text-[12.5px] text-ink-400 font-medium"
                    >
                      + Nueva solicitud
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : esSycTrace ? (
          <div className="flex flex-col md:flex-row gap-3.5 md:min-w-max pb-4">
            {COLUMNAS_SYCTRACE.map((c) => {
              let tarjetas = columnas[c.estado] ?? [];
              if (filtroTipo) {
                tarjetas = tarjetas.filter((s) => s.tipoSolicitudNombre === filtroTipo);
              }
              return (
                <div key={c.estado} className="w-full md:w-[290px] shrink-0 rounded-2xl p-3 bg-[#eef2f7]">
                  <div className="flex items-center gap-2 px-1.5 py-1 mb-2.5">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className="text-[13.5px] font-semibold text-ink-900 flex-1">{c.estado}</span>
                    <span className="text-[11px] font-bold text-ink-600 bg-white rounded-full px-2 py-[2px]">
                      {totales[c.estado] ?? 0}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto overflow-x-auto">
                    {tarjetas.map((s) => (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/solicitudes/${s.id}`)}
                        onKeyDown={alPresionarEnterOEspacio(() => navigate(`/solicitudes/${s.id}`))}
                        className="bg-white rounded-xl p-3.5 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="text-[11px] text-ink-400 font-semibold mb-1">#{s.numero}</div>
                        <div className="text-[13px] font-semibold text-ink-900 mb-0.5">{s.tipoSolicitudNombre}</div>
                        <div className="text-[12px] text-ink-600 mb-2.5">{s.ciudadanoNombre ?? s.empresaNombre}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-ink-300 text-xs">—</span>
                          <span className="text-[11px] text-ink-400">{diasDesde(s.fechaCreacion)}</span>
                        </div>
                      </div>
                    ))}
                    {tarjetas.length === 0 && (
                      <p className="text-[11.5px] text-ink-400 text-center py-4">Sin expediciones en este estado.</p>
                    )}
                  </div>
                  {c.estado === 'Generada' && (
                    <button
                      onClick={() => navigate(`/solicitudes/nueva?proyectoId=${proyectoId}`)}
                      className="w-full mt-2.5 py-2.5 rounded-xl border-2 border-dashed border-line text-[12.5px] text-ink-400 font-medium"
                    >
                      + Nueva solicitud
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : esLibroTotal ? (
          <div className="flex flex-col md:flex-row gap-3.5 md:min-w-max pb-4">
            {COLUMNAS_LIBROTOTAL.map((c) => {
              const tarjetas = tarjetasLibroTotal[c.estado] ?? [];
              return (
                <div key={c.estado} className="w-full md:w-[250px] shrink-0 rounded-2xl p-3 bg-[#eef2f7]">
                  <div className="flex items-center gap-2 px-1.5 py-1 mb-2.5">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className="text-[13.5px] font-semibold text-ink-900 flex-1">{c.estado}</span>
                    <span className="text-[11px] font-bold text-ink-600 bg-white rounded-full px-2 py-[2px]">
                      {tarjetas.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto overflow-x-auto">
                    {tarjetas.map((t) => (
                      <div
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/solicitudes/${t.id}`)}
                        onKeyDown={alPresionarEnterOEspacio(() => navigate(`/solicitudes/${t.id}`))}
                        className="bg-white rounded-xl p-3.5 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="text-[10.5px] text-ink-400 font-semibold mb-1">Turno {t.numeroTurno}</div>
                        <div className="text-[12.5px] font-semibold text-ink-900 mb-0.5">{t.ciudadanoNombre}</div>
                        <div className="text-[11px] text-ink-600 mb-2.5">{t.motivo}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-ink-300 text-xs">—</span>
                          <span className="text-[10.5px] text-ink-400 font-semibold">
                            {new Date(t.fechaHoraCita).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                    {tarjetas.length === 0 && (
                      <p className="text-[11.5px] text-ink-400 text-center py-4">Sin turnos en este estado hoy.</p>
                    )}
                  </div>
                  {c.estado === 'Agendado' && (
                    <button
                      onClick={() => navigate(`/solicitudes/nueva?proyectoId=${proyectoId}`)}
                      className="w-full mt-2.5 py-2.5 rounded-xl border-2 border-dashed border-line text-[12.5px] text-ink-400 font-medium"
                    >
                      + Agendar turno
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-3.5 md:min-w-max pb-4">
            {COLUMNAS.map((c) => {
              let tarjetas = columnas[c.estado] ?? [];
              if (filtroTipo) {
                tarjetas = tarjetas.filter((s) => s.tipoSolicitudNombre === filtroTipo);
              }
              if (TERMINALES.includes(c.estado)) {
                const dias = OPCIONES_TIEMPO.find((o) => o.valor === filtroTiempo)?.dias ?? null;
                tarjetas = tarjetas.filter((s) => dentroDelRango(s.fechaUltimoCambioEstado, dias));
              }

              return (
                <div
                  key={c.estado}
                  onDragOver={(e: DragEvent) => { e.preventDefault(); setColumnaSobre(c.estado); }}
                  onDragLeave={() => setColumnaSobre((cur) => (cur === c.estado ? null : cur))}
                  onDrop={(e: DragEvent) => { e.preventDefault(); handleDrop(c.estado); }}
                  className={`w-full md:w-[290px] shrink-0 rounded-2xl p-3 ${
                    columnaSobre === c.estado ? 'bg-[var(--color-accento-claro)]' : 'bg-[#eef2f7]'
                  }`}
                >
                  <div className="flex items-center gap-2 px-1.5 py-1 mb-2.5">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className="text-[13.5px] font-semibold text-ink-900 flex-1">{c.estado}</span>
                    <span className="text-[11px] font-bold text-ink-600 bg-white rounded-full px-2 py-[2px]">
                      {totales[c.estado] ?? 0}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto overflow-x-auto">
                    {tarjetas.map((s) => (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={() => handleDragStart(s)}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/solicitudes/${s.id}`)}
                        onKeyDown={alPresionarEnterOEspacio(() => navigate(`/solicitudes/${s.id}`))}
                        className="bg-white rounded-xl p-3.5 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="text-[11px] text-ink-400 font-semibold mb-1">#{s.numero}</div>
                        <div className="text-[13px] font-semibold text-ink-900 mb-0.5">{s.tipoSolicitudNombre}</div>
                        <div className="text-[12px] text-ink-600 mb-2.5">{s.ciudadanoNombre ?? s.empresaNombre}</div>
                        <div className="flex items-center justify-between">
                          {s.usuarioAsignadoNombre ? (
                            <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                              {s.usuarioAsignadoNombre.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                            </div>
                          ) : (
                            <span className="text-ink-300 text-xs">—</span>
                          )}
                          <span className="text-[11px] text-ink-400">
                            {diasDesde(TERMINALES.includes(c.estado) ? s.fechaUltimoCambioEstado : s.fechaCreacion)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {c.estado === 'Radicada' && (
                    <button
                      onClick={() => navigate(`/solicitudes/nueva?proyectoId=${proyectoId}`)}
                      className="w-full mt-2.5 py-2.5 rounded-xl border-2 border-dashed border-line text-[12.5px] text-ink-400 font-medium"
                    >
                      + Nueva solicitud
                    </button>
                  )}

                  {TERMINALES.includes(c.estado) && (
                    <button
                      onClick={() => navigate(`/solicitudes?proyectoId=${proyectoId}`)}
                      className="w-full mt-2 py-2 text-[11.5px] text-blue-600 font-medium"
                    >
                      {OPCIONES_TIEMPO.find((o) => o.valor === filtroTiempo)?.label} · Ver todas en Listado →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}