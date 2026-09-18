import { useState, useEffect, useMemo, type FormEvent } from 'react';
import Sidebar from '../components/layout/Sidebar';
import {
  getUsuarios,
  getSolicitudesPendientes,
  crearUsuario,
  actualizarUsuario,
  actualizarProyectosUsuario,
  type UsuarioResponseDto,
  type SolicitudAccesoResponseDto,
} from '../services/usuarioService';
import { getProyectosActivos, type ProyectoResponseDto } from '../services/proyectoService';
import { getRoles, type RolDto } from '../services/rolService';
import { useNavigate } from 'react-router-dom';
import Paginador from '../components/shared/Paginador';

interface FilaUsuario {
  key: string;
  usuarioId?: number;
  nombreCompleto: string;
  email: string;
  rolLabel: string;
  rolTipo: 'operador' | 'admin' | 'sinAsignar';
  proyectosLabel: string[];
  estado: 'Activo' | 'Inactivo' | 'Pendiente';
}

const POR_PAGINA = 6;

export default function GestionUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioResponseDto[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudAccesoResponseDto[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [proyectoFiltro, setProyectoFiltro] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [pagina, setPagina] = useState(1);

  const [modalAbierto, setModalAbierto] = useState<'crear' | 'editar' | null>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioResponseDto | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const [roles, setRoles] = useState<RolDto[]>([]);
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formActivo, setFormActivo] = useState(true);
  const [asignaciones, setAsignaciones] = useState<{ proyectoId: number; rolId: number }[]>([]);

  async function cargarDatos() {
    setLoading(true);
    try {
      const [u, s, p, r] = await Promise.all([
        getUsuarios(),
        getSolicitudesPendientes(),
        getProyectosActivos(),
        getRoles(),
      ]);
      setUsuarios(u);
      setSolicitudes(s);
      setProyectos(p);
      setRoles(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const filas: FilaUsuario[] = useMemo(() => {
    const filasUsuarios: FilaUsuario[] = usuarios.map((u) => {
      const rolesUnicos = Array.from(new Set(u.proyectos.map((p) => p.rolNombre)));
      return {
        key: `u-${u.id}`,
        usuarioId: u.id,
        nombreCompleto: u.nombreCompleto,
        email: u.email,
        rolLabel: u.esAdminSyc
          ? 'Administrador SYC'
          : rolesUnicos.length > 0
          ? rolesUnicos.join(' / ')
          : 'Sin asignar',
        rolTipo: u.esAdminSyc ? 'admin' : rolesUnicos.length > 0 ? 'operador' : 'sinAsignar',
        proyectosLabel: u.esAdminSyc
          ? ['Todos']
          : u.proyectos.length > 0
          ? u.proyectos.map((p) => p.proyectoNombre)
          : ['—'],
        estado: u.activo ? 'Activo' : 'Inactivo',
      };
    });

    const filasSolicitudes: FilaUsuario[] = solicitudes.map((s) => ({
      key: `s-${s.id}`,
      nombreCompleto: s.nombreCompleto,
      email: s.email,
      rolLabel: 'Sin asignar',
      rolTipo: 'sinAsignar',
      proyectosLabel: ['—'],
      estado: 'Pendiente',
    }));

    return [...filasSolicitudes, ...filasUsuarios];
  }, [usuarios, solicitudes]);

  const filasFiltradas = useMemo(() => {
    return filas.filter((f) => {
      const coincideBusqueda =
        !busqueda ||
        f.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
        f.email.toLowerCase().includes(busqueda.toLowerCase());
      const coincideProyecto =
        !proyectoFiltro ||
        f.proyectosLabel.includes(proyectoFiltro) ||
        (proyectoFiltro && f.proyectosLabel.includes('Todos'));
      const coincideEstado = !estadoFiltro || f.estado === estadoFiltro;
      return coincideBusqueda && coincideProyecto && coincideEstado;
    });
  }, [filas, busqueda, proyectoFiltro, estadoFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / POR_PAGINA));
  const filasPagina = filasFiltradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const inicio = filasFiltradas.length === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const fin = Math.min(pagina * POR_PAGINA, filasFiltradas.length);
  const navigate = useNavigate();

  function abrirCrear() {
    setUsuarioEditando(null);
    setFormNombre('');
    setFormEmail('');
    setFormPassword('');
    setFormActivo(true);
    setAsignaciones([]);
    setErrorModal(null);
    setModalAbierto('crear');
  }

  function abrirEditar(usuarioId: number) {
    const u = usuarios.find((x) => x.id === usuarioId);
    if (!u) return;
    setUsuarioEditando(u);
    setFormNombre(u.nombreCompleto);
    setFormEmail(u.email);
    setFormActivo(u.activo);
    setAsignaciones(
      u.proyectos.map((p) => {
        const rol = roles.find((r) => r.nombre === p.rolNombre);
        return { proyectoId: p.proyectoId, rolId: rol?.id ?? roles[0]?.id ?? 0 };
      })
    );
    setErrorModal(null);
    setModalAbierto('editar');
  }

  function agregarAsignacion() {
    if (proyectos.length === 0 || roles.length === 0) return;
    setAsignaciones((prev) => [...prev, { proyectoId: proyectos[0].id, rolId: roles[0].id }]);
  }

  function actualizarAsignacion(index: number, campo: 'proyectoId' | 'rolId', valor: number) {
    setAsignaciones((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [campo]: valor } : a))
    );
  }

  function quitarAsignacion(index: number) {
    setAsignaciones((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitModal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    setErrorModal(null);
    try {
      if (modalAbierto === 'crear') {
        await crearUsuario({
          nombreCompleto: formNombre,
          email: formEmail,
          password: formPassword,
          proyectos: asignaciones,
        });
      } else if (modalAbierto === 'editar' && usuarioEditando) {
        await actualizarUsuario(usuarioEditando.id, {
          nombreCompleto: formNombre,
          email: formEmail,
          activo: formActivo,
        });
        await actualizarProyectosUsuario(usuarioEditando.id, { proyectos: asignaciones });
      }
      setModalAbierto(null);
      await cargarDatos();
    } catch (err: any) {
      setErrorModal(err?.response?.data?.mensaje ?? 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar active="usuarios" />

      <main className="flex-1 px-4 md:px-[38px] py-7 pt-16 md:pt-7 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-[19px] font-semibold text-ink-900">Usuarios</h1>
            <p className="text-ink-600 text-[12.5px] mt-[3px]">
              Gestión de accesos, proyectos y roles de toda la plataforma
            </p>
          </div>
          <button
            onClick={abrirCrear}
            className="flex items-center gap-[7px] bg-[#0d9488] text-white rounded-[10px] px-4 py-[10px] text-[13px] font-semibold shadow-[0_8px_18px_-6px_rgba(13,148,136,0.5)]"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" className="w-[15px] h-[15px] stroke-white">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo usuario
          </button>
        </div>

        {solicitudes.length > 0 && (
          <div className="flex items-center gap-2.5 bg-[#fdf3e7] border border-[#f4dfb8] rounded-xl px-4 py-3 mb-[18px]">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[18px] h-[18px] stroke-[#96631a] shrink-0">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
            </svg>
            <p className="text-[12.5px] text-[#7a5111] flex-1">
              <b className="font-bold">{solicitudes.length} solicitudes de acceso</b> están esperando tu aprobación.
            </p>
           <button
              onClick={() => navigate('/usuarios/aprobacion')}
              className="text-xs font-bold text-[#96631a] underline"
            >
              Revisar ahora →
          </button>
          </div>
        )}

        <div className="flex items-center gap-2.5 bg-white border border-line rounded-xl px-3.5 py-3 mb-[18px] flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-paper border border-line rounded-[9px] px-3 py-2">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-[15px] h-[15px] stroke-ink-400 shrink-0">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
            </svg>
            <input
              placeholder="Buscar por nombre o correo..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              className="border-none outline-none bg-transparent text-[12.5px] w-full font-body"
            />
          </div>
          <div className="w-px h-[22px] bg-line" />
          <select
            value={proyectoFiltro}
            onChange={(e) => {
              setProyectoFiltro(e.target.value);
              setPagina(1);
            }}
            className="bg-paper border border-line rounded-[9px] px-3 py-2 text-xs text-ink-600 font-medium outline-none"
          >
            <option value="">Proyecto</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>
          <select
            value={estadoFiltro}
            onChange={(e) => {
              setEstadoFiltro(e.target.value);
              setPagina(1);
            }}
            className="bg-paper border border-line rounded-[9px] px-3 py-2 text-xs text-ink-600 font-medium outline-none"
          >
            <option value="">Estado</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Pendiente">Pendiente</option>
          </select>
        </div>

        <div className="bg-white border border-line rounded-[14px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-[14px] border-b border-line">
            <span className="text-[12.5px] text-ink-600">
              Mostrando <b className="text-ink-900">{inicio}–{fin}</b> de <b className="text-ink-900">{filasFiltradas.length}</b> usuarios
            </span>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-ink-400">Cargando usuarios...</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Usuario', 'Rol', 'Proyectos asignados', 'Estado', ''].map((h, i) => (
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
                {filasPagina.map((f) => (
                  <tr key={f.key} className="group hover:bg-paper transition-colors">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-paper px-5 py-[13px] text-[13px] border-b border-line font-semibold text-ink-900">
                      {f.nombreCompleto}
                      <div className="text-[11px] text-ink-400 font-normal">{f.email}</div>
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      <span
                        className={`text-[10.5px] font-semibold px-[9px] py-[3px] rounded-[10px] ${
                          f.rolTipo === 'admin'
                            ? 'text-[#7c3aed] bg-[#f2ecff]'
                            : f.rolTipo === 'operador'
                            ? 'text-blue-600 bg-blue-100'
                            : 'text-ink-400 bg-paper'
                        }`}
                      >
                        {f.rolLabel}
                      </span>
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      <div className="flex gap-1 flex-wrap">
                        {f.proyectosLabel.map((p) => (
                          <span
                            key={p}
                            className="text-[10.5px] font-semibold text-ink-600 bg-paper border border-line px-2 py-[3px] rounded-[10px]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-[10px] py-[5px] rounded-full ${
                          f.estado === 'Activo'
                            ? 'text-[#0d9488] bg-[#e3f7f4]'
                            : f.estado === 'Pendiente'
                            ? 'text-[#d97706] bg-[#fdf3e7]'
                            : 'text-ink-600 bg-[#f1f5f9]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            f.estado === 'Activo'
                              ? 'bg-[#0d9488]'
                              : f.estado === 'Pendiente'
                              ? 'bg-[#d97706]'
                              : 'bg-ink-600'
                          }`}
                        />
                        {f.estado}
                      </span>
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      {f.usuarioId && (
                        <button
                          onClick={() => abrirEditar(f.usuarioId!)}
                          className="w-7 h-7 rounded-[7px] bg-paper border border-line flex items-center justify-center"
                        >
                          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[13px] h-[13px] stroke-ink-600">
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filasPagina.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-400">
                      No se encontraron usuarios con estos filtros.
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

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-7 w-full max-w-[380px]">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
              {modalAbierto === 'crear' ? 'Nuevo usuario' : 'Editar usuario'}
            </h2>
            <form onSubmit={handleSubmitModal} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1.5">Nombre completo</label>
                <input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1.5">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none focus:border-blue-500"
                />
              </div>

              {modalAbierto === 'crear' && (
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1.5">Contraseña temporal</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    className="w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {modalAbierto === 'editar' && (
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1.5">Estado</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormActivo(true)}
                      className={`flex-1 py-2.5 rounded-[9px] text-sm font-semibold border-[1.5px] ${
                        formActivo ? 'bg-[#e3f7f4] border-[#0d9488] text-[#0d9488]' : 'border-line text-ink-400'
                      }`}
                    >
                      Activo
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormActivo(false)}
                      className={`flex-1 py-2.5 rounded-[9px] text-sm font-semibold border-[1.5px] ${
                        !formActivo ? 'bg-red-50 border-red-400 text-red-600' : 'border-line text-ink-400'
                      }`}
                    >
                      Inactivo
                    </button>
                  </div>
                </div>
              )}

              {/* Proyectos y roles — visible en crear Y editar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-ink-900">
                    Proyectos y roles <span className="font-normal text-ink-400">(opcional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={agregarAsignacion}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    + Agregar
                  </button>
                </div>

                {asignaciones.length === 0 && (
                  <p className="text-[11.5px] text-ink-400">
                    Sin asignar — el usuario quedará sin proyecto hasta que se le asigne uno.
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  {asignaciones.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <select
                        value={a.proyectoId}
                        onChange={(e) => actualizarAsignacion(i, 'proyectoId', Number(e.target.value))}
                        className="flex-1 py-2 px-2.5 border-[1.5px] border-line rounded-[8px] text-xs outline-none"
                      >
                        {proyectos.map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                      <select
                        value={a.rolId}
                        onChange={(e) => actualizarAsignacion(i, 'rolId', Number(e.target.value))}
                        className="flex-1 py-2 px-2.5 border-[1.5px] border-line rounded-[8px] text-xs outline-none"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => quitarAsignacion(i)}
                        className="w-7 h-7 shrink-0 rounded-[7px] bg-red-50 border border-red-200 flex items-center justify-center text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {errorModal && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {errorModal}
                </div>
              )}

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(null)}
                  className="flex-1 py-2.5 rounded-[9px] border border-line text-ink-600 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-2.5 rounded-[9px] bg-[#0d9488] text-white text-sm font-semibold disabled:opacity-60"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}