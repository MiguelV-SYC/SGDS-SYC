export interface CampoConfig {
  key: string;
  label: string;
  tipo: 'texto' | 'numero' | 'select' | 'fecha';
  opciones?: string[];
  placeholder?: string;
}

export const CAMPOS_POR_TIPO: Record<string, CampoConfig[]> = {
  // Comfenalco — ver Reglas_de_Negocio.MD/REGLAS_DE_NEGOCIO_COMFENALCO.md. Carné virtual usa su
  // propio formulario dedicado (FormularioCarneVirtual) por el grupo familiar dinámico y la
  // categorización en vivo — no pasa por CAMPOS_POR_TIPO.
  'Subsidio de vivienda': [
    { key: 'tipoVivienda', label: 'Tipo de vivienda', tipo: 'select', opciones: ['VIS (Vivienda de Interés Social)', 'No VIS'] },
    { key: 'valorSolicitado', label: 'Valor solicitado', tipo: 'numero', placeholder: '$ 0' },
    { key: 'ciudad', label: 'Ciudad', tipo: 'texto' },
    // RN-SV-001: techo de 4 SMMLV en los ingresos del grupo familiar — validado en el backend.
    { key: 'ingresosGrupoFamiliar', label: 'Ingresos mensuales del grupo familiar', tipo: 'numero', placeholder: '$ 0' },
    // RN-SV-002: declaración jurada de no propietario (modalidad vivienda nueva).
    { key: 'declaracionNoPropietario', label: '¿Declara bajo juramento que ningún miembro del hogar es propietario de vivienda?', tipo: 'select', opciones: ['Sí', 'No'] },
    // RN-SV-003: carta de preaprobación de crédito hipotecario, vigencia máxima 90 días.
    { key: 'fechaCartaPreaprobacion', label: 'Fecha de la carta de preaprobación de crédito (vigencia 90 días)', tipo: 'fecha' },
  ],
  'Protección al cesante': [
    // RN-PC-001: inscripción en el Servicio Público de Empleo, requisito para pasar a Aprobada.
    { key: 'inscripcionSpe', label: '¿Inscrito al 100% en el SPE de Comfenalco Santander?', tipo: 'select', opciones: ['Sí', 'No'] },
    { key: 'ultimoSalarioDevengado', label: 'Último salario devengado', tipo: 'numero', placeholder: '$ 0' },
  ],
  // 'Subsidio de desempleo' y 'Créditos' tienen formulario dedicado (FormularioSubsidioDesempleo,
  // FormularioCreditos) — el primero por el selector de meses cliqueables, el segundo por el
  // simulador de cuota — no pasan por CAMPOS_POR_TIPO.
  'Afiliación - Vinculación': [
    { key: 'fechaAfiliacionSolicitada', label: 'Fecha de afiliación solicitada', tipo: 'fecha' },
    { key: 'observaciones', label: 'Observaciones', tipo: 'texto' },
  ],
  'Afiliación - Traslado de fondo de pensiones': [
    {
      key: 'fondoOrigen',
      label: 'Fondo de origen',
      tipo: 'select',
      opciones: ['Porvenir', 'Protección', 'Colfondos', 'Skandia']
    },
    {
      key: 'fondoDestino',
      label: 'Fondo destino',
      tipo: 'select',
      opciones: ['Colpensiones']
    },
    { key: 'fechaTraslado', label: 'Fecha de traslado', tipo: 'fecha' },
    { key: 'observaciones', label: 'Observaciones', tipo: 'texto' },
  ],
  // IUVA ("Causación de impuesto vehicular") no usa esta configuración genérica: tiene un
  // formulario dedicado en NuevaSolicitudPage.tsx (pasos "Vehículo", "Características del
  // vehículo" y "Base gravable") porque necesita checkboxes, campos condicionales y el
  // cálculo del impuesto — cosas que CampoConfig no modela.
};

// Fallback cuando el tipo de solicitud no tiene campos configurados todavía
export const CAMPO_FALLBACK: CampoConfig = {
  key: 'observaciones',
  label: 'Información adicional relevante para el trámite',
  tipo: 'texto',
};