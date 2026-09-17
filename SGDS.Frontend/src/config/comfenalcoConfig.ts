// RN-CV-002 (categorización automática por SMMLV) — mismo valor que SmmlvVigente en
// SolicitudesController.cs; actualizar ambos cada enero según el decreto del Gobierno Nacional.
export const SMMLV_VIGENTE = 1_423_500;

export function calcularCategoriaCarne(ingresosMensuales: number): 'A' | 'B' | 'C' {
  const smmlv = ingresosMensuales / SMMLV_VIGENTE;
  if (smmlv <= 2) return 'A';
  if (smmlv <= 4) return 'B';
  return 'C';
}

export interface BeneficiarioCarne {
  nombreCompleto: string;
  numeroDocumento: string;
  parentesco: string;
  ingresosMensuales: string;
}

export interface DatosCarneVirtual {
  estadoAfiliacion: 'Activo' | 'Inactivo' | 'Suspendido';
  ingresosMensuales: string;
  grupoFamiliar: BeneficiarioCarne[];
}

export const DATOS_CARNE_VACIOS: DatosCarneVirtual = {
  estadoAfiliacion: 'Activo',
  ingresosMensuales: '',
  grupoFamiliar: [],
};

export function construirDatosAdicionalesCarneVirtual(datos: DatosCarneVirtual): Record<string, unknown> {
  return {
    estadoAfiliacion: datos.estadoAfiliacion,
    ingresosMensuales: datos.ingresosMensuales,
    grupoFamiliar: datos.grupoFamiliar.map((b) => ({
      nombreCompleto: b.nombreCompleto,
      numeroDocumento: b.numeroDocumento,
      parentesco: b.parentesco,
      ingresosMensuales: Number(b.ingresosMensuales) || 0,
    })),
  };
}

// ===== Subsidio de desempleo (RN-SD-001) — meses de aportes por selección, no por texto libre =====

export const MESES_NOMBRE = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Años dentro de la ventana de la regla (últimos 3 años + el actual).
export function aniosAportes(hoy = new Date()): number[] {
  return [hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2, hoy.getFullYear() - 3];
}

export interface DatosSubsidioDesempleo {
  tipoTrabajador: 'Dependiente' | 'Independiente';
  mesesSeleccionados: string[];
  ultimaCajaAfiliacion: 'Comfenalco Santander' | 'Otra caja';
  fechaUltimoBeneficioCesante: string;
}

export const DATOS_SUBSIDIO_DESEMPLEO_VACIOS: DatosSubsidioDesempleo = {
  tipoTrabajador: 'Dependiente',
  mesesSeleccionados: [],
  ultimaCajaAfiliacion: 'Comfenalco Santander',
  fechaUltimoBeneficioCesante: '',
};

export function construirDatosAdicionalesSubsidioDesempleo(datos: DatosSubsidioDesempleo): Record<string, unknown> {
  return {
    tipoTrabajador: datos.tipoTrabajador,
    mesesAportados: datos.mesesSeleccionados.length,
    ultimaCajaAfiliacion: datos.ultimaCajaAfiliacion,
    fechaUltimoBeneficioCesante: datos.fechaUltimoBeneficioCesante || undefined,
  };
}

// ===== Créditos (RN-CRE) — simulador con tasas certificadas por la Superfinanciera =====

// Interés Bancario Corriente y tasa de usura, modalidad consumo y ordinario — Resolución 1260 de
// 2026 (vigente septiembre 2026, https://www.superfinanciera.gov.co). Se recertifican cada mes:
// actualizar estos dos valores cuando cambien.
export const TASA_IBC_VIGENTE_EA = 0.1949;
export const TASA_USURA_VIGENTE_EA = 0.2924;

// Sistema de cuota fija (francés): convierte la tasa efectiva anual a mensual y amortiza a plazo fijo.
export function calcularCuotaCredito(monto: number, plazoMeses: number, tasaEA: number) {
  const tasaMensual = Math.pow(1 + tasaEA, 1 / 12) - 1;
  const cuota = tasaMensual === 0
    ? monto / plazoMeses
    : (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazoMeses));
  const totalPagado = cuota * plazoMeses;
  return { cuota, totalPagado, totalIntereses: totalPagado - monto };
}

export interface DatosCreditos {
  modalidadCredito: 'Libranza' | 'Ordinario';
  salarioNeto: string;
  cuotaMensualSolicitada: string;
  usaCuotaMonetaria: 'Sí' | 'No';
  aportesAlDiaComfenalco: 'Sí' | 'No';
  convenioLibranzaActivo: 'Sí' | 'No';
}

export const DATOS_CREDITOS_VACIOS: DatosCreditos = {
  modalidadCredito: 'Libranza',
  salarioNeto: '',
  cuotaMensualSolicitada: '',
  usaCuotaMonetaria: 'No',
  aportesAlDiaComfenalco: 'Sí',
  convenioLibranzaActivo: 'Sí',
};

export function construirDatosAdicionalesCreditos(datos: DatosCreditos): Record<string, unknown> {
  return {
    modalidadCredito: datos.modalidadCredito,
    salarioNeto: datos.salarioNeto,
    cuotaMensualSolicitada: datos.cuotaMensualSolicitada,
    usaCuotaMonetaria: datos.usaCuotaMonetaria,
    aportesAlDiaComfenalco: datos.aportesAlDiaComfenalco,
    convenioLibranzaActivo: datos.convenioLibranzaActivo,
  };
}
