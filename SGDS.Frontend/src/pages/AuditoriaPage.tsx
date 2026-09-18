import { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import {
  getAuditoriaListado,
  getAuditoriaModulos,
  exportarAuditoria,
  type AuditoriaResponseDto,
} from '../services/auditoriaService';
import { getProyectosAdmin, type ProyectoResponseDto } from '../services/proyectoService';
import Paginador from '../components/shared/Paginador';

const POR_PAGINA = 8;

// Mapeo visual: el backend manda el nombre singular de la entidad C#,
// el mockup lo muestra en plural, coincidiendo con los nombres del sidebar.
const MODULO_PLURAL: Record<string, string> = {
  Solicitud: 'Solicitudes',
  Usuario: 'Usuarios',
  Ciudadano: 'Ciudadanos',
  Empresa: 'Empresas',
  Documento: 'Documentos',
  Proyecto: 'Proyectos',
  TipoSolicitud: 'Tipos de solicitud',
};

const ACCION_COLOR: Record<string, string> = {
  Creó: 'text-[#0d9488]',
  Editó: 'text-blue-600',
  Cambió: 'text-blue-600',
  Aprobó: 'text-[#0d9488]',
  Subió: 'text-[#0d9488]',
  Inactivó: 'text-red-600',
  Rechazó: 'text-red-600',
  Eliminó: 'text-red-600',
};

function colorAccion(accion: string) {
  const primeraPalabra = accion.split(' ')[0];
  return ACCION_COLOR[primeraPalabra] ?? 'text-ink-600';
}

function bgAccion(accion: string) {
  const color = colorAccion(accion);
  if (color.includes('0d9488')) return 'bg-[#e3f7f4]';
  if (color.includes('blue')) return 'bg-blue-100';
  if (color.includes('red')) return 'bg-red-50';
  return 'bg-paper';
}

function formatearFechaHora(iso: string) {
  const fecha = new Date(iso);
  if (isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AuditoriaPage() {
  const [registros, setRegistros] = useState<AuditoriaResponseDto[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);

  const [proyectos, setProyectos] = useState<ProyectoResponseDto[]>([]);
  const [modulos, setModulos] = useState<string[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [proyectoFiltro, setProyectoFiltro] = useState('');
  const [moduloFiltro, setModuloFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    getProyectosAdmin().then(setProyectos);
    getAuditoriaModulos().then(setModulos);
  }, []);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      getAuditoriaListado({
        buscar: busqueda || undefined,
        proyectoId: proyectoFiltro ? Number(proyectoFiltro) : undefined,
        modulo: moduloFiltro || undefined,
        pagina,
        tamanoPagina: POR_PAGINA,
      })
        .then((res) => {
          setRegistros(res.pagina.datos);
          setTotalRegistros(res.pagina.totalRegistros);
          setTotalPaginas(res.pagina.totalPaginas);
        })
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timeout);
  }, [busqueda, proyectoFiltro, moduloFiltro, pagina]);

  async function handleExportar() {
    setExportando(true);
    try {
      await exportarAuditoria({
        buscar: busqueda || undefined,
        proyectoId: proyectoFiltro ? Number(proyectoFiltro) : undefined,
        modulo: moduloFiltro || undefined,
      });
    } finally {
      setExportando(false);
    }
  }

  const inicio = totalRegistros === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const fin = Math.min(pagina * POR_PAGINA, totalRegistros);

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar active="auditoria" />

      <main className="flex-1 px-4 md:px-[38px] py-7 pt-16 md:pt-7 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-[19px] font-semibold text-ink-900">Auditoría</h1>
            <p className="text-ink-600 text-[12.5px] mt-[3px]">Bitácora de toda operación de escritura en la plataforma</p>
          </div>
          <button
            onClick={handleExportar}
            disabled={exportando}
            className="flex items-center gap-[7px] bg-white border border-line text-ink-900 rounded-[10px] px-4 py-[10px] text-[13px] font-semibold disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-[15px] h-[15px] stroke-ink-600">
              <path d="M12 3v13M6 10l6 6 6-6" /><path d="M5 21h14" />
            </svg>
            {exportando ? 'Exportando...' : 'Exportar'}
          </button>
        </div>

        <div className="flex items-center gap-2.5 bg-white border border-line rounded-xl px-3.5 py-3 mb-[18px] flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-paper border border-line rounded-[9px] px-3 py-2">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-[15px] h-[15px] stroke-ink-400 shrink-0">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
            </svg>
            <input
              placeholder="Buscar por usuario o acción..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
              className="border-none outline-none bg-transparent text-[12.5px] w-full font-body"
            />
          </div>
          <select
            value={proyectoFiltro}
            onChange={(e) => { setProyectoFiltro(e.target.value); setPagina(1); }}
            className="bg-paper border border-line rounded-[9px] px-3 py-2 text-xs text-ink-600 font-medium outline-none"
          >
            <option value="">Proyecto</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <select
            value={moduloFiltro}
            onChange={(e) => { setModuloFiltro(e.target.value); setPagina(1); }}
            className="bg-paper border border-line rounded-[9px] px-3 py-2 text-xs text-ink-600 font-medium outline-none"
          >
            <option value="">Módulo</option>
            {modulos.map((m) => (
              <option key={m} value={m}>{MODULO_PLURAL[m] ?? m}</option>
            ))}
          </select>
          <select disabled title="Filtro de fecha pendiente de confirmar con backend" className="bg-paper border border-line rounded-[9px] px-3 py-2 text-xs text-ink-400 font-medium outline-none opacity-60">
            <option>Fecha</option>
          </select>
        </div>

        <div className="bg-white border border-line rounded-[14px] overflow-hidden">
          <div className="px-5 py-[14px] border-b border-line">
            <span className="text-[12.5px] text-ink-600">
              Mostrando <b className="text-ink-900">{inicio}–{fin}</b> de <b className="text-ink-900">{totalRegistros.toLocaleString('es-CO')}</b> registros
            </span>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-ink-400">Cargando auditoría...</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Usuario', 'Acción', 'Módulo', 'Proyecto', 'Fecha', 'IP'].map((h, i) => (
                    <th key={h} className={`text-left text-[10.5px] uppercase tracking-wide text-ink-400 font-semibold px-5 py-[10px] border-b border-line whitespace-nowrap ${i === 0 ? 'sticky left-0 z-10 bg-white' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className="group hover:bg-paper transition-colors">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-paper px-5 py-[13px] text-[13px] border-b border-line font-semibold text-ink-900 whitespace-nowrap">
                      {r.usuarioNombre}
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      <span className={`inline-flex text-[11.5px] font-semibold px-[10px] py-[4px] rounded-full ${bgAccion(r.accion)} ${colorAccion(r.accion)}`}>
                        {r.accion}
                      </span>
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line text-ink-600">
                      {MODULO_PLURAL[r.modulo] ?? r.modulo}
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line text-ink-600">
                      {r.proyectoNombre ?? '—'}
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line text-ink-600">
                      {formatearFechaHora(r.fechaHora)}
                    </td>
                    <td className="px-5 py-[13px] text-[12px] border-b border-line text-ink-400 font-mono">
                      {r.direccionIp}
                    </td>
                  </tr>
                ))}
                {registros.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-400">
                      No se encontraron registros con estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}

          <Paginador pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} acento="#0d9488" />
        </div>
      </main>
    </div>
  );
}