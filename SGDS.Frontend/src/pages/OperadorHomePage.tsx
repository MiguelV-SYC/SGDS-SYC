import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import { useNavigate } from 'react-router-dom';
import {
  getMisIndicadores,
  getNecesitanAtencion,
  getMiCola,
  type IndicadoresOperadorDto,
  type NecesitaAtencionDto,
  type ColaTrabajoDto,
} from '../services/solicitudService';

const URGENCIA_STYLE: Record<string, { borde: string; texto: string; label: string }> = {
  vence_hoy: { borde: 'border-red-500', texto: 'text-red-600', label: 'Vence hoy' },
  vence_manana: { borde: 'border-amber-500', texto: 'text-amber-600', label: 'Vence mañana' },
  normal: { borde: 'border-ink-400', texto: 'text-ink-600', label: '' },
};

const ESTADO_STYLE: Record<string, string> = {
  Radicada: 'bg-[#f1f5f9] text-[#64748b]',
  'En revisión': 'bg-blue-100 text-blue-600',
  Pendiente: 'bg-[#fdf3e7] text-[#d97706]',
  'Requiere información': 'bg-[#f2ecff] text-[#7c3aed]',
  Aprobada: 'bg-[#e3f7f4] text-[#0d9488]',
  Rechazada: 'bg-[#fdeaea] text-[#dc2626]',
};

export default function OperadorHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const primerNombre = user?.nombreCompleto?.split(' ')[0] ?? '';

  const [indicadores, setIndicadores] = useState<IndicadoresOperadorDto | null>(null);
  const [atencion, setAtencion] = useState<NecesitaAtencionDto[]>([]);
  const [cola, setCola] = useState<ColaTrabajoDto[]>([]);
  const [filtroCola, setFiltroCola] = useState<'todas' | 'en_revision' | 'pendientes'>('todas');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMisIndicadores(), getNecesitanAtencion(5)]).then(([i, a]) => {
      setIndicadores(i);
      setAtencion(a);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    getMiCola({ filtro: filtroCola }).then(setCola);
  }, [filtroCola]);

  const fechaHoy = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar active="inicio" />

      <main className="flex-1 px-4 md:px-[38px] py-7 pt-16 md:pt-7 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">Hola, {primerNombre}</h1>
            <p className="text-ink-600 text-[13.5px] mt-[3px]">
              Esto es lo que tienes pendiente hoy en tus proyectos.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-line rounded-[10px] px-4 py-[9px]">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-4 h-4 stroke-ink-600">
              <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
            <span className="text-[12.5px] font-medium text-ink-900 capitalize">{fechaHoy}</span>
          </div>
        </div>

        {loading || !indicadores ? (
          <div className="text-center text-sm text-ink-400 py-10">Cargando...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="font-display text-2xl font-bold text-ink-900">{indicadores.asignadasAMi}</div>
                <div className="text-[11.5px] text-ink-600 mt-1">Asignadas a mí</div>
              </div>
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="font-display text-2xl font-bold text-red-600">{indicadores.vencenHoy}</div>
                <div className="text-[11.5px] text-ink-600 mt-1">Vencen hoy</div>
              </div>
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="font-display text-2xl font-bold text-ink-900">{indicadores.requierenMiRespuesta}</div>
                <div className="text-[11.5px] text-ink-600 mt-1">Requieren mi respuesta</div>
              </div>
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="font-display text-2xl font-bold text-[#0d9488]">{indicadores.completadasEstaSemana}</div>
                <div className="text-[11.5px] text-ink-600 mt-1">Completadas esta semana</div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3.5">
              <h2 className="font-display text-[15px] font-semibold text-ink-900">Necesitan tu atención</h2>
              {atencion.length > 0 && (
                <button onClick={() => navigate('/solicitudes')} className="text-[12.5px] font-semibold text-blue-600">
                  Ver todas
                </button>
              )}
            </div>

            {atencion.length === 0 ? (
              <div className="bg-white border border-line rounded-2xl px-6 py-8 text-center mb-8">
                <p className="text-sm text-ink-600">No tienes casos urgentes por atender ahora mismo.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 mb-8">
                {atencion.map((a) => {
                  const estilo = URGENCIA_STYLE[a.urgencia];
                  return (
                    <div
                      key={a.solicitudId}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-white border border-line border-l-[3px] ${estilo.borde} rounded-xl px-5 py-3.5`}
                    >
                      <div>
                        <div className="text-[13.5px] font-semibold text-ink-900">
                          #{a.numero} · {a.tipoSolicitud} — {a.ciudadanoNombre}
                        </div>
                        <div className="text-[12px] text-ink-600 mt-0.5">
                          {a.proyectoNombre} · {a.estadoDescripcion}
                        </div>
                      </div>
                      <div className="flex items-center gap-3.5">
                        {estilo.label && (
                          <span className={`text-[12px] font-semibold ${estilo.texto}`}>{estilo.label}</span>
                        )}
                        <button
                          onClick={() => navigate(`/solicitudes/${a.solicitudId}`)}
                          className="bg-ink-900 text-white text-[11.5px] sm:text-[12.5px] font-semibold rounded-[9px] px-3 py-1.5 sm:px-4 sm:py-2"
                        >
                          Revisar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-white border border-line rounded-2xl overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-5 py-4 border-b border-line">
                <h3 className="font-display text-[14px] font-semibold text-ink-900">
                  Tu cola de trabajo
                </h3>
                <div className="flex gap-1 bg-paper rounded-lg p-1 self-start">
                  {(['todas', 'en_revision', 'pendientes'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFiltroCola(f)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-md ${
                        filtroCola === f ? 'bg-blue-100 text-blue-600' : 'text-ink-600'
                      }`}
                    >
                      {f === 'todas' ? 'Todas' : f === 'en_revision' ? 'En revisión' : 'Pendientes'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['ID', 'Tipo', 'Afiliado', 'Estado', 'Fecha'].map((h, i) => (
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
                  {cola.map((s) => (
                    <tr key={s.solicitudId} className="group hover:bg-paper transition-colors cursor-pointer">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-paper px-5 py-[13px] text-[12px] text-ink-400 font-semibold border-b border-line whitespace-nowrap">
                        #{s.numero}
                      </td>
                      <td className="px-5 py-[13px] text-[13px] border-b border-line">{s.tipoSolicitud}</td>
                      <td className="px-5 py-[13px] text-[13px] border-b border-line">
                        <div className="font-semibold text-ink-900">{s.ciudadanoNombre}</div>
                        <div className="text-[11px] text-ink-400">{s.ciudadanoDocumento}</div>
                      </td>
                      <td className="px-5 py-[13px] text-[13px] border-b border-line">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-[10px] py-[4px] rounded-full ${
                            ESTADO_STYLE[s.estado] ?? 'bg-paper text-ink-600'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {s.estado}
                        </span>
                      </td>
                      <td className="px-5 py-[13px] text-[13px] text-ink-600 border-b border-line">
                        {new Date(s.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                  {cola.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-400">
                        No hay solicitudes en esta vista.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}