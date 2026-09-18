interface Props {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
  acento?: string;
}

const BOTON = 'w-7 h-7 rounded-lg border flex items-center justify-center text-xs';
const BOTON_NEUTRO = `${BOTON} border-line bg-white text-ink-600`;

export default function Paginador({ pagina, totalPaginas, onCambiar, acento = 'var(--color-accento)' }: Readonly<Props>) {
  const inicio = Math.max(0, pagina - 3);
  const numeros = Array.from({ length: totalPaginas }, (_, i) => i + 1).slice(inicio, inicio + 5);

  return (
    <div className="flex items-center justify-between px-5 py-[14px] border-t border-line">
      <span className="text-xs text-ink-600">Página {pagina} de {totalPaginas}</span>
      <div className="flex gap-1.5">
        <button
          onClick={() => onCambiar(Math.max(1, pagina - 1))}
          disabled={pagina === 1}
          className={`${BOTON_NEUTRO} disabled:opacity-40`}
        >
          ‹
        </button>
        {numeros.map((n) => (
          <button
            key={n}
            onClick={() => onCambiar(n)}
            className={n === pagina ? `${BOTON} text-white font-semibold` : BOTON_NEUTRO}
            style={n === pagina ? { backgroundColor: acento, borderColor: acento } : undefined}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onCambiar(Math.min(totalPaginas, pagina + 1))}
          disabled={pagina === totalPaginas}
          className={`${BOTON_NEUTRO} disabled:opacity-40`}
        >
          ›
        </button>
      </div>
    </div>
  );
}
