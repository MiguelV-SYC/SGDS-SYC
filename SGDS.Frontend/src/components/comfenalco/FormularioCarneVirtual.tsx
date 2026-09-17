import { calcularCategoriaCarne, type DatosCarneVirtual, type BeneficiarioCarne } from '../../config/comfenalcoConfig';

const inputClase = 'w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none focus:border-blue-500';
const labelClase = 'block text-xs font-semibold text-ink-900 mb-1.5';

const BENEFICIARIO_VACIO: BeneficiarioCarne = { nombreCompleto: '', numeroDocumento: '', parentesco: '', ingresosMensuales: '' };

interface Props {
  value: DatosCarneVirtual;
  onChange: (siguiente: DatosCarneVirtual) => void;
}

export default function FormularioCarneVirtual({ value, onChange }: Props) {
  function set<K extends keyof DatosCarneVirtual>(clave: K, v: DatosCarneVirtual[K]) {
    onChange({ ...value, [clave]: v });
  }

  function setBeneficiario(idx: number, campo: keyof BeneficiarioCarne, v: string) {
    const grupo = value.grupoFamiliar.map((b, i) => (i === idx ? { ...b, [campo]: v } : b));
    set('grupoFamiliar', grupo);
  }

  const categoria = value.ingresosMensuales ? calcularCategoriaCarne(Number(value.ingresosMensuales)) : null;

  return (
    <div className="flex flex-col gap-3.5">
      {/* RN-CV-001: sin integración real con el aplicativo de aportes, el operador registra el
          estado consultado — el backend bloquea la expedición si no es ACTIVO. */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClase}>Estado de afiliación (aportes)</label>
          <select value={value.estadoAfiliacion} onChange={(e) => set('estadoAfiliacion', e.target.value as DatosCarneVirtual['estadoAfiliacion'])} className={inputClase}>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Suspendido">Suspendido</option>
          </select>
          {value.estadoAfiliacion !== 'Activo' && (
            <p className="text-[11px] text-red-600 mt-1.5">Solo se expide el carné si el afiliado está ACTIVO.</p>
          )}
        </div>
        <div>
          <label className={labelClase}>Ingresos mensuales</label>
          <input
            type="number"
            value={value.ingresosMensuales}
            onChange={(e) => set('ingresosMensuales', e.target.value)}
            placeholder="$ 0"
            className={inputClase}
          />
        </div>
      </div>

      {categoria && (
        <div className="flex items-center gap-2.5 bg-[var(--color-accento-claro)] border border-[var(--color-accento)] rounded-xl px-4 py-3">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--color-accento)' }}>Categoría {categoria}</span>
          <span className="text-[11.5px] text-ink-600">
            {categoria === 'A' ? '— hasta 2 SMMLV' : categoria === 'B' ? '— entre 2 y 4 SMMLV' : '— más de 4 SMMLV'}
          </span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelClase}>Grupo familiar (beneficiarios activos)</label>
          <button
            type="button"
            onClick={() => set('grupoFamiliar', [...value.grupoFamiliar, { ...BENEFICIARIO_VACIO }])}
            className="text-[12px] font-semibold text-blue-600"
          >
            + Agregar beneficiario
          </button>
        </div>

        {value.grupoFamiliar.length === 0 && (
          <p className="text-[11.5px] text-ink-400">Sin beneficiarios agregados.</p>
        )}

        <div className="flex flex-col gap-2.5">
          {value.grupoFamiliar.map((b, idx) => (
            <div key={idx} className="grid grid-cols-[2fr_1.3fr_1.2fr_1fr_auto] gap-2 items-center bg-paper border border-line rounded-[9px] p-2.5">
              <input value={b.nombreCompleto} onChange={(e) => setBeneficiario(idx, 'nombreCompleto', e.target.value)} placeholder="Nombre completo" className={inputClase} />
              <input value={b.numeroDocumento} onChange={(e) => setBeneficiario(idx, 'numeroDocumento', e.target.value)} placeholder="Documento" className={inputClase} />
              <select value={b.parentesco} onChange={(e) => setBeneficiario(idx, 'parentesco', e.target.value)} className={inputClase}>
                <option value="">Parentesco</option>
                <option value="Cónyuge">Cónyuge</option>
                <option value="Hijo/a">Hijo/a</option>
                <option value="Padre/Madre">Padre/Madre</option>
              </select>
              <input type="number" value={b.ingresosMensuales} onChange={(e) => setBeneficiario(idx, 'ingresosMensuales', e.target.value)} placeholder="Ingresos" className={inputClase} />
              <button
                type="button"
                onClick={() => set('grupoFamiliar', value.grupoFamiliar.filter((_, i) => i !== idx))}
                className="text-[11.5px] font-semibold text-red-600 px-1"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
