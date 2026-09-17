namespace SGDS.Application.DTOs;

public class SolicitudResponseDto
{
    public int Id { get; set; }
    public int? CiudadanoId { get; set; }
    public string? CiudadanoNombre { get; set; }
    public int? EmpresaId { get; set; }
    public string? EmpresaNombre { get; set; }
    public int? UsuarioAsignadoId { get; set; }
    public string? UsuarioAsignadoNombre { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string Numero { get; set; } = string.Empty;
    public string? TipoSolicitudNombre { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaCierre { get; set; }
    public DateTime FechaUltimoCambioEstado { get; set; }
    public string? CiudadanoDocumento { get; set; }
    public string? EmpresaNit { get; set; }
    public string? ProyectoNombre { get; set; }
}

public class CrearSolicitudDto
{
    public int? CiudadanoId { get; set; }
    public int? EmpresaId { get; set; }
    public int? ProyectoId { get; set; }
    public int? TipoSolicitudId { get; set; }
    public int? VehiculoId { get; set; }
    public string? DatosAdicionales { get; set; }
}

public class CambiarEstadoDto
{
    public string NuevoEstado { get; set; } = string.Empty;
}

public class AsignarUsuarioDto
{
    public int UsuarioId { get; set; }
}

public class ConteoProyectoDto
{
    public int ProyectoId { get; set; }
    public string ProyectoNombre { get; set; } = string.Empty;
    public int TotalAsignadas { get; set; }
}

public class IndicadoresOperadorDto
{
    public int AsignadasAMi { get; set; }
    public int VenceHoy { get; set; }
    public int RequierenMiRespuesta { get; set; }
    public int CompletadasEstaSemana { get; set; }
}

public class SolicitudColaDto
{
    public int SolicitudId { get; set; }
    public string Numero { get; set; } = string.Empty;
    public string? TipoSolicitud { get; set; }
    public string? CiudadanoNombre { get; set; }
    public string? CiudadanoDocumento { get; set; }
    public string Estado { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
}
public class ConteoEstadoDto
{
    public string Estado { get; set; } = string.Empty;
    public int Total { get; set; }
}

public class ListadoSolicitudesResponseDto
{
    public PaginacionResponseDto<SolicitudResponseDto> Pagina { get; set; } = new();
    public List<ConteoEstadoDto> ConteosPorEstado { get; set; } = new();
}

public class HistorialEstadoDto
{
    public string? EstadoAnterior { get; set; }
    public string EstadoNuevo { get; set; } = string.Empty;
    public DateTime FechaCambio { get; set; }
    public string? UsuarioNombre { get; set; }
}

public class SolicitudDetalleResponseDto
{
    public int Id { get; set; }
    public string Numero { get; set; } = string.Empty;
    public int? CiudadanoId { get; set; }
    public string? CiudadanoNombre { get; set; }
    public int? EmpresaId { get; set; }
    public string? EmpresaNombre { get; set; }
    public int? UsuarioAsignadoId { get; set; }
    public string? UsuarioAsignadoNombre { get; set; }
    public string? ProyectoNombre { get; set; }
    public int? ProyectoId { get; set; }
    public int? TipoSolicitudId { get; set; }
    public string? TipoSolicitudNombre { get; set; }
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaCierre { get; set; }
    public List<HistorialEstadoDto> HistorialEstados { get; set; } = new();
    public List<DocumentoResponseDto> Documentos { get; set; } = new();
    public string? CiudadanoDocumento { get; set; }
    public string? EmpresaNit { get; set; }
    public string? DatosAdicionales { get; set; }
    public int? VehiculoId { get; set; }
    public string? VehiculoPlaca { get; set; }
    public string? VehiculoMarca { get; set; }
    public string? VehiculoLinea { get; set; }
    public int? VehiculoModelo { get; set; }
}