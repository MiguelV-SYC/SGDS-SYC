import { useState } from 'react';
import { MESES_NOMBRE, aniosAportes, type DatosSubsidioDesempleo } from '../../config/comfenalcoConfig';

const inputClase = 'w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none focus:border-blue-500';
const labelClase = 'block text-xs font-semibold text-ink-900 mb-1.5';

const ANIOS = aniosAportes();

function etiquetaMes(clave: string) {
  const [anio, mes] = clave.split('-');
  return `${MESES_NOMBRE[Number(mes) - 1]} ${anio}`;
}

function SelectorAnioMes({ titulo, anio, mes, onAnio, onMes }: {
  titulo: string; anio: string; mes: string; onAnio: (v: string) => void; onMes: (v: string) => void;
}) {
  return (
    <div className="flex items-end gap-1.5">
      <div>
        <label className="block text-[10.5px] font-semibold text-ink-600 mb-1">{titulo} — Año</label>
        <select value={anio} onChange={(e) => onAnio(e.target.value)} className={inputClase}>
          {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10.5px] font-semibold text-ink-600 mb-1">Mes</label>
        <select value={mes} onChange={(e) => onMes(e.target.value)} className={inputClase}>
          {MESES_NOMBRE.map((nombre, i) => <option key={nombre} value={i + 1}>{nombre}</option>)}
        </select>
      </div>
    </div>
  );
}

interface Props {
  value: DatosSubsidioDesempleo;
  onChange: (siguiente: DatosSubsidioDesempleo) => void;
}

export default function FormularioSubsidioDesempleo({ value, onChange }: Props) {
  function set<K extends keyof DatosSubsidioDesempleo>(clave: K, v: DatosSubsidioDesempleo[K]) {
    onChange({ ...value, [clave]: v });
  }

  const [desdeAnio, setDesdeAnio] = useState(String(ANIOS[ANIOS.length - 1]));
  const [desdeMes, setDesdeMes] = useState('1');
  const [hastaAnio, setHastaAnio] = useState(String(ANIOS[0]));
  const [hastaMes, setHastaMes] = useState('1');

  // RN-SD-001 permite aportes continuos O discontinuos — cada periodo agregado suma sus meses a
  // la lista (sin duplicar), así que se pueden agregar varios rangos con vacíos entre ellos.
  function agregarPeriodo() {
    const inicio = Number(desdeAnio) * 12 + (Number(desdeMes) - 1);
    const fin = Number(hastaAnio) * 12 + (Number(hastaMes) - 1);
    if (fin < inicio) return;

    const nuevos: string[] = [];
    for (let m = inicio; m <= fin; m++) {
      const clave = `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`;
      if (!value.mesesSeleccionados.includes(clave) && !nuevos.includes(clave)) nuevos.push(clave);
    }
    set('mesesSeleccionados', [...value.mesesSeleccionados, ...nuevos].sort());
  }

  function quitarMes(clave: string) {
    set('mesesSeleccionados', value.mesesSeleccionados.filter((m) => m !== clave));
  }

  const minimoRequerido = value.tipoTrabajador === 'Independiente' ? 24 : 12;
  const cumple = value.mesesSeleccionados.length >= minimoRequerido;

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <label className={labelClase}>Tipo de trabajador</label>
        <select value={value.tipoTrabajador} onChange={(e) => set('tipoTrabajador', e.target.value as DatosSubsidioDesempleo['tipoTrabajador'])} className={inputClase}>
          <option value="Dependiente">Dependiente</option>
          <option value="Independiente">Independiente</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelClase}>Meses aportados en los últimos 3 años</label>
          <span className={`text-[11.5px] font-semibold ${cumple ? 'text-[#047857]' : 'text-red-600'}`}>
            {value.mesesSeleccionados.length} / {minimoRequerido} mínimo
          </span>
        </div>
        <p className="text-[11px] text-ink-400 mb-2">Marca el periodo de aportes (desde/hasta) y agrégalo — se puede repetir para periodos discontinuos.</p>

        <div className="flex items-end gap-2 mb-3 flex-wrap">
          <SelectorAnioMes titulo="Desde" anio={desdeAnio} mes={desdeMes} onAnio={setDesdeAnio} onMes={setDesdeMes} />
          <span className="text-[11.5px] text-ink-400 font-semibold pb-2.5">hasta</span>
          <SelectorAnioMes titulo="Hasta" anio={hastaAnio} mes={hastaMes} onAnio={setHastaAnio} onMes={setHastaMes} />

          <button
            type="button"
            onClick={agregarPeriodo}
            className="py-2.5 px-4 rounded-[9px] bg-[var(--color-accento)] text-white text-[12.5px] font-semibold shrink-0"
          >
            + Agregar periodo
          </button>
        </div>

        {value.mesesSeleccionados.length === 0 ? (
          <p className="text-[11.5px] text-ink-400">Sin meses agregados.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {value.mesesSeleccionados.map((clave) => (
              <span key={clave} className="flex items-center gap-1.5 bg-[var(--color-accento-claro)] text-[11.5px] font-semibold rounded-full pl-3 pr-1.5 py-1" style={{ color: 'var(--color-accento)' }}>
                {etiquetaMes(clave)}
                <button type="button" onClick={() => quitarMes(clave)} className="w-4 h-4 rounded-full hover:bg-black/10 leading-none">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClase}>Última Caja de afiliación</label>
          <select value={value.ultimaCajaAfiliacion} onChange={(e) => set('ultimaCajaAfiliacion', e.target.value as DatosSubsidioDesempleo['ultimaCajaAfiliacion'])} className={inputClase}>
            <option value="Comfenalco Santander">Comfenalco Santander</option>
            <option value="Otra caja">Otra caja</option>
          </select>
        </div>
        <div>
          <label className={labelClase}>Último beneficio de protección al cesante (si aplica)</label>
          <input type="date" value={value.fechaUltimoBeneficioCesante} onChange={(e) => set('fechaUltimoBeneficioCesante', e.target.value)} className={inputClase} />
        </div>
      </div>
    </div>
  );
}
