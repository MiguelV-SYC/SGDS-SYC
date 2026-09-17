import { useState } from 'react';
import { TASA_IBC_VIGENTE_EA, TASA_USURA_VIGENTE_EA, calcularCuotaCredito, type DatosCreditos } from '../../config/comfenalcoConfig';

const inputClase = 'w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none focus:border-blue-500';
const labelClase = 'block text-xs font-semibold text-ink-900 mb-1.5';

function moneda(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

interface Props {
  value: DatosCreditos;
  onChange: (siguiente: DatosCreditos) => void;
}

export default function FormularioCreditos({ value, onChange }: Props) {
  function set<K extends keyof DatosCreditos>(clave: K, v: DatosCreditos[K]) {
    onChange({ ...value, [clave]: v });
  }

  const [montoSimulado, setMontoSimulado] = useState('');
  const [plazoMeses, setPlazoMeses] = useState('36');
  const [tasaEA, setTasaEA] = useState(String(TASA_IBC_VIGENTE_EA * 100));

  const monto = Number(montoSimulado) || 0;
  const plazo = Number(plazoMeses) || 0;
  const tasa = (Number(tasaEA) || 0) / 100;
  const tasaSuperaUsura = tasa > TASA_USURA_VIGENTE_EA;
  const resultado = monto > 0 && plazo > 0 && !tasaSuperaUsura ? calcularCuotaCredito(monto, plazo, tasa) : null;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClase}>Modalidad del crédito</label>
          <select value={value.modalidadCredito} onChange={(e) => set('modalidadCredito', e.target.value as DatosCreditos['modalidadCredito'])} className={inputClase}>
            <option value="Libranza">Libranza</option>
            <option value="Ordinario">Ordinario</option>
          </select>
        </div>
        <div>
          <label className={labelClase}>Salario neto (después de descuentos de ley)</label>
          <input type="number" value={value.salarioNeto} onChange={(e) => set('salarioNeto', e.target.value)} placeholder="$ 0" className={inputClase} />
        </div>
      </div>

      <div>
        <label className={labelClase}>Cuota mensual solicitada</label>
        <input type="number" value={value.cuotaMensualSolicitada} onChange={(e) => set('cuotaMensualSolicitada', e.target.value)} placeholder="$ 0" className={inputClase} />
        {Number(value.salarioNeto) > 0 && Number(value.cuotaMensualSolicitada) > Number(value.salarioNeto) * 0.5 && (
          <p className="text-[11px] text-red-600 mt-1.5">Supera el 50% del salario neto — no cumple RN-CRE-001.</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClase}>¿Usa Cuota Monetaria como respaldo?</label>
          <select value={value.usaCuotaMonetaria} onChange={(e) => set('usaCuotaMonetaria', e.target.value as DatosCreditos['usaCuotaMonetaria'])} className={inputClase}>
            <option value="No">No</option>
            <option value="Sí">Sí</option>
          </select>
        </div>
        <div>
          <label className={labelClase}>Aportes al día (4%) — libranza</label>
          <select value={value.aportesAlDiaComfenalco} onChange={(e) => set('aportesAlDiaComfenalco', e.target.value as DatosCreditos['aportesAlDiaComfenalco'])} className={inputClase}>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
          </select>
        </div>
        <div>
          <label className={labelClase}>Convenio de libranza activo</label>
          <select value={value.convenioLibranzaActivo} onChange={(e) => set('convenioLibranzaActivo', e.target.value as DatosCreditos['convenioLibranzaActivo'])} className={inputClase}>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
          </select>
        </div>
      </div>

      <div className="border border-line rounded-[12px] p-4 bg-paper">
        <h4 className="text-[12.5px] font-semibold text-ink-900 mb-1">Simulador de crédito</h4>
        <p className="text-[11px] text-ink-400 mb-3">
          Tasa prellenada con el Interés Bancario Corriente certificado por la Superfinanciera para consumo/ordinario
          ({(TASA_IBC_VIGENTE_EA * 100).toFixed(2)}% E.A.) — techo legal (usura): {(TASA_USURA_VIGENTE_EA * 100).toFixed(2)}% E.A.
        </p>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className={labelClase}>Monto a solicitar</label>
            <input type="number" value={montoSimulado} onChange={(e) => setMontoSimulado(e.target.value)} placeholder="$ 0" className={inputClase} />
          </div>
          <div>
            <label className={labelClase}>Plazo (meses)</label>
            <input type="number" value={plazoMeses} onChange={(e) => setPlazoMeses(e.target.value)} className={inputClase} />
          </div>
          <div>
            <label className={labelClase}>Tasa E.A. (%)</label>
            <input type="number" step="0.01" value={tasaEA} onChange={(e) => setTasaEA(e.target.value)} className={inputClase} />
          </div>
        </div>

        {tasaSuperaUsura && (
          <p className="text-[11.5px] text-red-600">La tasa ingresada supera la tasa de usura vigente — no es una tasa legal.</p>
        )}

        {resultado && (
          <div className="flex items-center gap-6 bg-white border border-line rounded-[9px] px-4 py-3">
            <div>
              <div className="text-[9.5px] uppercase tracking-wide text-ink-400 font-semibold">Cuota mensual</div>
              <div className="text-[16px] font-bold text-ink-900">{moneda(resultado.cuota)}</div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-wide text-ink-400 font-semibold">Total intereses</div>
              <div className="text-[13px] font-semibold text-ink-600">{moneda(resultado.totalIntereses)}</div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-wide text-ink-400 font-semibold">Total a pagar</div>
              <div className="text-[13px] font-semibold text-ink-600">{moneda(resultado.totalPagado)}</div>
            </div>
            <button
              type="button"
              onClick={() => set('cuotaMensualSolicitada', String(Math.round(resultado.cuota)))}
              className="ml-auto text-[11.5px] font-semibold text-blue-600"
            >
              Usar esta cuota
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
