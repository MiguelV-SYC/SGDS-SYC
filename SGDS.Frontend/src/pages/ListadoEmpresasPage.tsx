import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { getEmpresas, type EmpresaResponseDto } from '../services/empresaService';
import { getProyectosActivos, type ProyectoResponseDto } from '../services/proyectoService';
import { useColorProyectoActivo } from '../hooks/useColorProyectoActivo';
import FiltroListado from '../components/shared/FiltroListado';
import Paginador from '../components/shared/Paginador';

const POR_PAGINA = 6;

export default function ListadoEmpresasPage() {
  const navigate = useNavigate();

  const [empresas, setEmpresas] = useState<EmpresaResponseDto[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [proyectos, setProyectos] = useState<ProyectoResponseDto[]>([]);
  const [proyectoFiltro, setProyectoFiltro] = useState<string>('');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    getProyectosActivos().then(setProyectos);
  }, []);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      getEmpresas({
        buscar: busqueda || undefined,
        proyectoId: proyectoFiltro ? Number(proyectoFiltro) : undefined,
        pagina,
        tamanoPagina: POR_PAGINA,
      })
        .then((res) => {
          setEmpresas(res.datos);
          setTotalRegistros(res.totalRegistros);
          setTotalPaginas(res.totalPaginas);
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(timeout);
  }, [busqueda, proyectoFiltro, pagina]);

  const inicio = totalRegistros === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const fin = Math.min(pagina * POR_PAGINA, totalRegistros);
  const color = useColorProyectoActivo();

  return (
    <div
      className="flex min-h-screen bg-paper"
      style={{ '--color-accento': color.primario, '--color-accento-claro': color.primarioClaro } as React.CSSProperties}
    >
      <Sidebar active="empresas" />

      <main className="flex-1 px-4 md:px-[38px] py-7 pt-16 md:pt-7 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-[19px] font-semibold text-ink-900 flex items-center">
              Empresas
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-[3px] rounded-[10px] ml-2">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-2.5 h-2.5 stroke-blue-600">
                  <circle cx="12" cy="12" r="9" />
                </svg>
                Entidad global
              </span>
            </h1>
            <p className="text-ink-600 text-[12.5px] mt-[3px]">
              Personas jurídicas registradas — visibles a través de sus solicitudes en tus proyectos asignados
            </p>
          </div>
          <button
            onClick={() => navigate('/empresas/nueva')}
            className="flex items-center gap-[7px] bg-[var(--color-accento)] text-white rounded-[10px] px-4 py-[10px] text-[13px] font-semibold shadow-[0_8px_18px_-6px_var(--color-accento)]"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" className="w-[15px] h-[15px] stroke-white">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva empresa
          </button>
        </div>

        <FiltroListado
          busqueda={busqueda}
          onBusqueda={(v) => { setBusqueda(v); setPagina(1); }}
          placeholder="Buscar por razón social o NIT..."
          proyectos={proyectos}
          proyectoFiltro={proyectoFiltro}
          onProyectoFiltro={(v) => { setProyectoFiltro(v); setPagina(1); }}
        />

        <div className="bg-white border border-line rounded-[14px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-[14px] border-b border-line">
            <span className="text-[12.5px] text-ink-600">
              Mostrando <b className="text-ink-900">{inicio}–{fin}</b> de <b className="text-ink-900">{totalRegistros}</b> empresas
            </span>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-ink-400">Cargando empresas...</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Razón social', 'NIT', 'Proyectos con actividad', 'Solicitudes', ''].map((h, i) => (
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
                {empresas.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/empresas/${e.id}`)}
                    className="group cursor-pointer hover:bg-paper transition-colors"
                  >
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-paper px-5 py-[13px] text-[13px] border-b border-line font-semibold text-ink-900 whitespace-nowrap">
                      {e.razonSocial}
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line text-ink-400 text-[11px]">
                      {e.nit}-{e.digitoVerificacion}
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      <div className="flex gap-1 flex-wrap">
                        {e.proyectosConActividad.map((p) => (
                          <span
                            key={p}
                            className="text-[10.5px] font-semibold text-ink-600 bg-paper border border-line px-2 py-[3px] rounded-[10px]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">{e.totalSolicitudes}</td>
                    <td className="px-5 py-[13px] text-[13px] border-b border-line">
                      <div className="w-6 h-6 rounded-full bg-paper flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-3 h-3 stroke-ink-400">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))}
                {empresas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-400">
                      No se encontraron empresas con estos filtros.
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