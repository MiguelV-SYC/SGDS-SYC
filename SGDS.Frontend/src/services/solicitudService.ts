import axios from "axios";

const API_URL = 'http://localhost:5158/api';

export interface ConteoProyectoDto { 
    proyectoId: number; 
    proyectoNombre: string; 
    totalAsignadas: number;
}

export interface IndicadoresOperadorDto {
    asignadasAMi: number;
    vencenHoy: number; 
    requierenMiRespuesta: number; 
    completadasEstaSemana: number; 
}

export interface ColaTrabajoDto {
    solicitudId: number;
    numero: string;
    tipoSolicitud: string; 
    ciudadanoNombre: string;
    ciudadanoDocumento: string;
    estado: string;
    fecha: string;
}

function authHeader() {
    const saved = localStorage.getItem('sgds_auth_user');
    const token = saved ? JSON.parse(saved).token : null;
    return { Authorization: `Bearer ${token}` };
}

export async function getMisConteosPorProyecto(): Promise<ConteoProyectoDto[]> {
    const { data } = await axios.get<ConteoProyectoDto[]>(
        `${API_URL}/Solicitudes/mis-conteos-por-proyecto`,
        { headers: authHeader() }
    );
    return data;
}

export async function getMisIndicadores(): Promise<IndicadoresOperadorDto> {
    const { data } = await axios.get<IndicadoresOperadorDto>(`${API_URL}/Solicitudes/mis-indicadores`, {
        headers: authHeader(),
    });
    return data;
}

export async function getMiCola(params: {
    proyectoId?: number;
    filtro?: 'todas' | 'en_revision' | 'pendientes';
    }): Promise<ColaTrabajoDto[]> {
        const { data } = await axios.get<ColaTrabajoDto[]>(`${API_URL}/Solicitudes/mi-cola`, {
            params,
            headers: authHeader(),
    });
    return data;
}

export async function asignarUsuarioSolicitud(solicitudId: number, usuarioId: number): Promise<void> {
    await axios.put(
        `${API_URL}/Solicitudes/${solicitudId}/asignar-usuario`,
        { usuarioId },
        { headers: authHeader() }
    );   
}

export interface SolicitudResponseDto {
  id: number;
  ciudadanoId?: number;
  ciudadanoNombre?: string;
  ciudadanoDocumento?: string;
  empresaId?: number;
  empresaNombre?: string;
  empresaNit?: string;
  usuarioAsignadoId?: number;
  usuarioAsignadoNombre?: string;
  estado: string;
  numero: string;
  tipoSolicitudNombre?: string;
  proyectoNombre?: string; // nuevo campo creado para funcionalidad del sidebar admin
  fechaCreacion: string;
  fechaCierre?: string;
  fechaUltimoCambioEstado: string;
}

export interface ConteoEstadoDto {
  estado: string;
  total: number;
}

export interface PaginacionResponseDto<T> {
  datos: T[];
  totalRegistros: number;
  paginaActual: number;
  totalPaginas: number;
}

export interface ListadoSolicitudesResponseDto {
  pagina: PaginacionResponseDto<SolicitudResponseDto>;
  conteosPorEstado: ConteoEstadoDto[];
}

export async function getSolicitudesListado(params: {
  proyectoId?: number;
  buscar?: string;
  estado?: string;
  tipoSolicitudId?: number;
  pagina?: number;
  tamanoPagina?: number;
}): Promise<ListadoSolicitudesResponseDto> {
  const { data } = await axios.get<ListadoSolicitudesResponseDto>(`${API_URL}/Solicitudes/listado`, {
    params,
    headers: authHeader(),
  });
  return data;
}

export interface HistorialEstadoDto {
  estadoAnterior?: string;
  estadoNuevo: string;
  fechaCambio: string;
  usuarioNombre?: string;
}

export interface DocumentoResponseDto {
  id: number;
  nombreArchivo: string;
  solicitudNumero: string;
  fecha: string;
}

export interface SolicitudDetalleResponseDto {
  id: number;
  numero: string;
  ciudadanoId?: number;
  ciudadanoNombre?: string;
  ciudadanoDocumento?: string;
  empresaId?: number;
  empresaNombre?: string;
  empresaNit?: string;
  usuarioAsignadoId?: number;
  usuarioAsignadoNombre?: string;
  proyectoNombre?: string;
  proyectoId?: number;
  tipoSolicitudId?: number;
  tipoSolicitudNombre?: string;
  estado: string;
  fechaCreacion: string;
  fechaCierre?: string;
  datosAdicionales?: string;
  historialEstados: HistorialEstadoDto[];
  documentos: DocumentoResponseDto[];
  vehiculoId?: number;
  vehiculoPlaca?: string;
  vehiculoMarca?: string;
  vehiculoLinea?: string;
  vehiculoModelo?: number;
}

export async function getSolicitudDetalle(id: number): Promise<SolicitudDetalleResponseDto> {
  const { data } = await axios.get<SolicitudDetalleResponseDto>(`${API_URL}/Solicitudes/${id}`, {
    headers: authHeader(),
  });
  return data;
}

export interface ActualizarSolicitudDto {
  tipoSolicitudId?: number;
  datosAdicionales?: string;
}

export async function actualizarSolicitud(id: number, dto: ActualizarSolicitudDto): Promise<void> {
  await axios.put(`${API_URL}/Solicitudes/${id}`, dto, { headers: authHeader() });
}

export interface EstampillaItemResponseDto {
  nombre: string;
  aplica: boolean;
  tarifa: number;
  baseGravable: number;
  valor: number;
  motivo?: string;
  distribucion?: Record<string, number>;
}

export interface LiquidacionEstampillasResponseDto {
  numero: string;
  contribuyenteNombre: string;
  contribuyenteDocumento: string;
  hechoGenerador?: string;
  objetoContrato?: string;
  fechaSuscripcion?: string;
  valorContrato: number;
  baseGravable: number;
  items: EstampillaItemResponseDto[];
  total: number;
}

export async function getLiquidacionEstampillas(id: number): Promise<LiquidacionEstampillasResponseDto> {
  const { data } = await axios.get<LiquidacionEstampillasResponseDto>(`${API_URL}/Solicitudes/${id}/preliquidacion-estampillas`, {
    headers: authHeader(),
  });
  return data;
}

export async function obtenerPreliquidacionEstampillasQrBlobUrl(id: number): Promise<string> {
  const response = await axios.get(`${API_URL}/Solicitudes/${id}/preliquidacion-estampillas-qr.png`, {
    headers: authHeader(),
    responseType: 'blob',
  });
  return window.URL.createObjectURL(new Blob([response.data]));
}

export async function descargarPreliquidacionEstampillasPdf(id: number, nombreArchivo: string): Promise<void> {
  const response = await axios.get(`${API_URL}/Solicitudes/${id}/preliquidacion-estampillas-pdf`, {
    headers: authHeader(),
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function obtenerPreliquidacionQrBlobUrl(id: number): Promise<string> {
  const response = await axios.get(`${API_URL}/Solicitudes/${id}/preliquidacion-qr.png`, {
    headers: authHeader(),
    responseType: 'blob',
  });
  return window.URL.createObjectURL(new Blob([response.data]));
}

export async function descargarPreliquidacionPdf(id: number, nombreArchivo: string): Promise<void> {
  const response = await axios.get(`${API_URL}/Solicitudes/${id}/preliquidacion-pdf`, {
    headers: authHeader(),
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export interface CrearSolicitudDto {
  ciudadanoId?: number;
  empresaId?: number;
  proyectoId: number;
  tipoSolicitudId: number;
  vehiculoId?: number;
  datosAdicionales?: string;
}

export async function crearSolicitud(dto: CrearSolicitudDto): Promise<{ id: number; numero: string }> {
  const { data } = await axios.post(`${API_URL}/Solicitudes`, dto, { headers: authHeader() });
  return data;
}

export async function cambiarEstado(id: number, nuevoEstado: string): Promise<void> {
  await axios.put(`${API_URL}/Solicitudes/${id}/cambiar-estado`, { nuevoEstado }, { headers: authHeader() });
}

export async function asignarUsuario(id: number, usuarioId: number): Promise<void> {
  await axios.put(`${API_URL}/Solicitudes/${id}/asignar-usuario`, { usuarioId }, { headers: authHeader() });
}

export interface TipoSolicitudDto {
  id: number;
  nombre: string;
  proyectoId: number;
}

export async function getTiposSolicitudPorProyecto(proyectoId: number): Promise<TipoSolicitudDto[]> {
  const { data } = await axios.get<TipoSolicitudDto[]>(`${API_URL}/TiposSolicitud`, {
    params: { proyectoId },
    headers: authHeader(),
  });
  return data;
}