import type { ProyectoResponseDto } from '../../services/proyectoService';

interface Props {
  busqueda: string;
  onBusqueda: (valor: string) => void;
  placeholder: string;
  proyectos: ProyectoResponseDto[];
  proyectoFiltro: string;
  onProyectoFiltro: (valor: string) => void;
}

export default function FiltroListado({ busqueda, onBusqueda, placeholder, proyectos, proyectoFiltro, onProyectoFiltro }: Readonly<Props>) {
  return (
    <div className="flex items-center gap-2.5 bg-white border border-line rounded-xl px-3.5 py-3 mb-[18px] flex-wrap">
      <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-paper border border-line rounded-[9px] px-3 py-2">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-[15px] h-[15px] stroke-ink-400 shrink-0">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
        </svg>
        <input
          placeholder={placeholder}
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          className="border-none outline-none bg-transparent text-[12.5px] w-full font-body"
        />
      </div>
      <div className="w-px h-[22px] bg-line" />
      <select
        value={proyectoFiltro}
        onChange={(e) => onProyectoFiltro(e.target.value)}
        className="bg-paper border border-line rounded-[9px] px-3 py-2 text-xs text-ink-600 font-medium outline-none"
      >
        <option value="">Proyecto con actividad</option>
        {proyectos.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
    </div>
  );
}
