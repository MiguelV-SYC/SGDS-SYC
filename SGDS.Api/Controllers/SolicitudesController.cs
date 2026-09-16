using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGDS.Application.DTOs;
using SGDS.Domain.Entities;
using SGDS.Infrastructure.Data;
using SGDS.Application.Interfaces;
using SGDS.Application.Helpers;
using Microsoft.Extensions.Options;
using System.Text.Json;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SGDS.Api.Pdf;

namespace SGDS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SolicitudesController : ControllerBase
{
    private readonly SgdsDbContext _context;
private readonly IAlmacenamientoService _almacenamiento;
private readonly ConfiguracionEstampillas _configEstampillas;

public SolicitudesController(SgdsDbContext context, IAlmacenamientoService almacenamiento, IOptions<ConfiguracionEstampillas> configEstampillas)
{
    _context = context;
    _almacenamiento = almacenamiento;
    _configEstampillas = configEstampillas.Value;
}

    // GET: api/Solicitudes
[HttpGet]
public async Task<IActionResult> GetSolicitudes([FromQuery] int? ciudadanoId, [FromQuery] int? empresaId, [FromQuery] int? vehiculoId)
{
    var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
    var proyectosClaims = User.FindAll("proyecto").Select(c => c.Value.Split(':')[0]).ToList();
    var proyectosPermitidos = proyectosClaims.Select(int.Parse).ToList();

    var query = _context.Solicitudes
        .Include(s => s.Ciudadano)
        .Include(s => s.Empresa)
        .Include(s => s.UsuarioAsignado)
        .Include(s => s.Proyecto)
        .Include(s => s.TipoSolicitud)
        .AsQueryable();

    if (!esAdminSyc)
    {
        query = query.Where(s => s.ProyectoId != null && proyectosPermitidos.Contains(s.ProyectoId.Value));
    }

    if (ciudadanoId.HasValue)
    {
        query = query.Where(s => s.CiudadanoId == ciudadanoId.Value);
    }

    if (empresaId.HasValue)
    {
        query = query.Where(s => s.EmpresaId == empresaId.Value);
    }

    if (vehiculoId.HasValue)
    {
        query = query.Where(s => s.VehiculoId == vehiculoId.Value);
    }

    var solicitudes = await query
        .Select(s => new SolicitudResponseDto
        {
            Id = s.Id,
            Numero = s.Proyecto != null ? s.Proyecto.Codigo + "-" + s.Id.ToString("0000") : s.Id.ToString(),
            CiudadanoId = s.CiudadanoId,
            CiudadanoNombre = s.Ciudadano != null ? s.Ciudadano.NombreCompleto : null,
            CiudadanoDocumento = s.Ciudadano != null ? s.Ciudadano.TipoDocumento + " " + s.Ciudadano.NumeroDocumento : null,
            EmpresaId = s.EmpresaId,
            EmpresaNombre = s.Empresa != null ? s.Empresa.RazonSocial : null,
            EmpresaNit = s.Empresa != null ? s.Empresa.Nit : null,
            UsuarioAsignadoId = s.UsuarioAsignadoId,
            UsuarioAsignadoNombre = s.UsuarioAsignado != null ? s.UsuarioAsignado.NombreCompleto : null,
            TipoSolicitudNombre = s.TipoSolicitud != null ? s.TipoSolicitud.Nombre : null,
            Estado = s.Estado,
            FechaCreacion = s.FechaCreacion,
            FechaCierre = s.FechaCierre
        })
        .ToListAsync();

    return Ok(solicitudes);
}
// GET: api/Solicitudes/5
[HttpGet("{id}")]
public async Task<IActionResult> GetSolicitud(int id)
{
    var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
    var proyectosPermitidos = User.FindAll("proyecto")
        .Select(c => int.Parse(c.Value.Split(':')[0]))
        .ToList();

    var solicitud = await _context.Solicitudes
        .Include(s => s.Ciudadano)
        .Include(s => s.Empresa)
        .Include(s => s.UsuarioAsignado)
        .Include(s => s.Proyecto)
        .Include(s => s.TipoSolicitud)
        .Include(s => s.Vehiculo)
        .Include(s => s.HistorialEstados)
            .ThenInclude(h => h.Usuario)
        .Include(s => s.Documentos)
        .FirstOrDefaultAsync(s => s.Id == id);

    if (solicitud == null)
        return NotFound();

    if (!esAdminSyc && (solicitud.ProyectoId == null || !proyectosPermitidos.Contains(solicitud.ProyectoId.Value)))
    {
        return NotFound();
    }

    var dto = new SolicitudDetalleResponseDto
    {
        Id = solicitud.Id,
        Numero = solicitud.Proyecto != null ? $"{solicitud.Proyecto.Codigo}-{solicitud.Id:0000}" : solicitud.Id.ToString(),
        CiudadanoId = solicitud.CiudadanoId,
        CiudadanoNombre = solicitud.Ciudadano?.NombreCompleto,
        CiudadanoDocumento = solicitud.Ciudadano != null ? $"{solicitud.Ciudadano.TipoDocumento} {solicitud.Ciudadano.NumeroDocumento}" : null,
        EmpresaId = solicitud.EmpresaId,
        EmpresaNombre = solicitud.Empresa?.RazonSocial,
        EmpresaNit = solicitud.Empresa?.Nit,
        DatosAdicionales = solicitud.DatosAdicionales,
        UsuarioAsignadoId = solicitud.UsuarioAsignadoId,
        UsuarioAsignadoNombre = solicitud.UsuarioAsignado?.NombreCompleto,
        ProyectoNombre = solicitud.Proyecto?.Nombre,
        ProyectoId = solicitud.ProyectoId,
        TipoSolicitudId = solicitud.TipoSolicitudId,
        TipoSolicitudNombre = solicitud.TipoSolicitud?.Nombre,
        Estado = solicitud.Estado,
        FechaCreacion = solicitud.FechaCreacion,
        FechaCierre = solicitud.FechaCierre,
        VehiculoId = solicitud.VehiculoId,
        VehiculoPlaca = solicitud.Vehiculo?.Placa,
        VehiculoMarca = solicitud.Vehiculo?.Marca,
        VehiculoLinea = solicitud.Vehiculo?.Linea,
        VehiculoModelo = solicitud.Vehiculo?.Modelo,
        HistorialEstados = solicitud.HistorialEstados
            .OrderByDescending(h => h.FechaCambio)
            .Select(h => new HistorialEstadoDto
            {
                EstadoAnterior = h.EstadoAnterior,
                EstadoNuevo = h.EstadoNuevo,
                FechaCambio = h.FechaCambio,
                UsuarioNombre = h.Usuario?.NombreCompleto
                
            }).ToList(),
        Documentos = solicitud.Documentos.Select(d => new DocumentoResponseDto
        {
            Id = d.Id,
            NombreArchivo = d.NombreArchivo,
            SolicitudNumero = solicitud.Proyecto != null ? $"{solicitud.Proyecto.Codigo}-{solicitud.Id:0000}" : solicitud.Id.ToString(),
            Fecha = d.FechaCarga
        }).ToList()
    };

    return Ok(dto);
}
//inicio: metodos para el home-operador
    [HttpGet("mis-conteos-por-proyecto")]
public async Task<IActionResult> GetMisConteosPorProyecto()
{
    var usuarioId = int.Parse(User.FindFirst("sub")!.Value);

    var misProyectos = await _context.UsuarioProyectos
        .Where(up => up.UsuarioId == usuarioId)
        .Include(up => up.Proyecto)
        .Select(up => new { up.ProyectoId, up.Proyecto.Nombre })
        .Distinct()
        .ToListAsync();

    var conteos = new List<ConteoProyectoDto>();

    foreach (var proyecto in misProyectos)
    {
        var total = await _context.Solicitudes.CountAsync(s =>
            s.ProyectoId == proyecto.ProyectoId && s.UsuarioAsignadoId == usuarioId && s.FechaCierre == null);

        conteos.Add(new ConteoProyectoDto
        {
            ProyectoId = proyecto.ProyectoId,
            ProyectoNombre = proyecto.Nombre,
            TotalAsignadas = total
        });
    }

    return Ok(conteos);
}

    [HttpGet("mis-indicadores")]
    public async Task<IActionResult> GetMisIndicadores()
    {
        var usuarioId = int.Parse(User.FindFirst("sub")!.Value);
        var hoy = DateTime.UtcNow.Date;
        var inicioSemana = hoy.AddDays(-(int)hoy.DayOfWeek);
        var misSolicitudes = _context.Solicitudes.Where(s => s.UsuarioAsignadoId == usuarioId);
        
        var indicadores = new IndicadoresOperadorDto
        {
            AsignadasAMi = await misSolicitudes.CountAsync(s => s.FechaCierre == null),
            VenceHoy = await misSolicitudes.CountAsync(s =>
                s.FechaCierre == null && s.FechaLimite != null && s.FechaLimite.Value.Date == hoy),
            RequierenMiRespuesta = await misSolicitudes.CountAsync(s =>
                s.Estado == "Requiere información" || s.Estado == "Pendiente" ),
            CompletadasEstaSemana = await misSolicitudes.CountAsync(s =>
                s.FechaCierre != null && s.FechaCierre.Value >= inicioSemana)
        };

        return Ok(indicadores);
    }

    [HttpGet("necesitan-atencion")]
    public async Task<IActionResult> GetNecesitanAtencion([FromQuery] int limite = 5)
    {
    var usuarioId = int.Parse(User.FindFirst("sub")!.Value);
    var hoy = DateTime.UtcNow.Date;

    var requierenAccion = await _context.Solicitudes
        .Include(s => s.Proyecto)
        .Include(s => s.TipoSolicitud)
        .Include(s => s.Ciudadano)
        .Where(s => s.FechaCierre == null && s.UsuarioAsignadoId == usuarioId
            && (s.Estado == "Requiere información" || s.Estado == "Pendiente"))
        .ToListAsync();

    var ordenados = requierenAccion
        .Select(s => MapearAtencion(s, hoy))
        .OrderBy(i => i.Urgencia == "vence_hoy" ? 0 : i.Urgencia == "vence_manana" ? 1 : 2)
        .Take(limite)
        .ToList();

    return Ok(ordenados);
}

private SolicitudAtencionDto MapearAtencion(Solicitud s, DateTime hoy)
{
    var urgencia = "normal";
    if (s.FechaLimite.HasValue)
    {
        if (s.FechaLimite.Value.Date == hoy) urgencia = "vence_hoy";
        else if (s.FechaLimite.Value.Date == hoy.AddDays(1)) urgencia = "vence_manana";
    }

    return new SolicitudAtencionDto
    {
        SolicitudId = s.Id,
        Numero = s.Proyecto != null ? $"{s.Proyecto.Codigo}-{s.Id:0000}" : s.Id.ToString(),
        TipoSolicitud = s.TipoSolicitud?.Nombre,
        CiudadanoNombre = s.Ciudadano?.NombreCompleto,
        ProyectoNombre = s.Proyecto?.Nombre ?? string.Empty,
        EstadoDescripcion = s.Estado,
        Urgencia = urgencia,
    };
}

    [HttpGet("mi-cola")]
    public async Task<IActionResult> GetMiCola([FromQuery] int? proyectoId, [FromQuery] string filtro = "todas")
    {
        var usuarioId = int.Parse(User.FindFirst("sub")!.Value);

        var query = _context.Solicitudes
            .Include(s => s.Proyecto)
            .Include(s => s.TipoSolicitud)
            .Include(s => s.Ciudadano)
            .Where(s => s.UsuarioAsignadoId == usuarioId)
            .AsQueryable();

        if (proyectoId.HasValue)
        {
            query = query.Where(s => s.ProyectoId == proyectoId.Value);
        }

        query = filtro switch
        {
            "en_revision" => query.Where(s => s.Estado == "En revisión"),
            "pendientes" => query.Where(s => s.Estado == "Pendiente"),
            _ => query
        };

        var solicitudes = await query
            .OrderByDescending(s => s.FechaCreacion)
            .ToListAsync();

        var resultado = solicitudes.Select(s => new SolicitudColaDto
        {
            SolicitudId = s.Id,
            Numero = s.Proyecto != null ? $"{s.Proyecto.Codigo}-{s.Id:0000}" : s.Id.ToString(),
            TipoSolicitud = s.TipoSolicitud?.Nombre,
            CiudadanoNombre = s.Ciudadano?.NombreCompleto,
            CiudadanoDocumento = s.Ciudadano != null ? $"{s.Ciudadano.TipoDocumento} {s.Ciudadano.NumeroDocumento}" : null,
            Estado = s.Estado,
            Fecha = s.FechaCreacion
        }).ToList();

        return Ok(resultado);
    }
//Fin metodos get home-operador

// inicio ger: api/Solicitudes/listado
[HttpGet("listado")]
public async Task<IActionResult> GetListadoSolicitudes(
    [FromQuery] int? proyectoId,
    [FromQuery] string? buscar,
    [FromQuery] string? estado,
    [FromQuery] int? tipoSolicitudId,
    [FromQuery] int pagina = 1,
    [FromQuery] int tamanoPagina = 20)
{
    var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
    // Gerencial ve los 9 proyectos activos en modo solo lectura, igual que un admin, para
    // este listado — las acciones de escritura de cada solicitud siguen bloqueadas porque
    // Gerencial no tiene claims "proyecto" propios.
    var esGerencial = User.FindFirst("esGerencial")?.Value == "True";
    var tieneVisibilidadGlobal = esAdminSyc || esGerencial;
    var proyectosPermitidos = User.FindAll("proyecto")
        .Select(c => int.Parse(c.Value.Split(':')[0]))
        .ToList();

    if (!tieneVisibilidadGlobal && !proyectoId.HasValue)
    {
        return BadRequest(new { mensaje = "Debe especificar un proyecto" });
    }

    var queryBase = _context.Solicitudes
        .Include(s => s.Ciudadano)
        .Include(s => s.Empresa)
        .Include(s => s.UsuarioAsignado)
        .Include(s => s.Proyecto)
        .Include(s => s.TipoSolicitud)
        .AsQueryable();

    if (!tieneVisibilidadGlobal)
    {
        // Un operador puro ya no navega una bandeja compartida del proyecto — solo ve los
        // casos que tiene asignados a él mismo (ver "eliminar Tomar caso" en el análisis).
        var usuarioActualId = int.Parse(User.FindFirst("sub")!.Value);
        queryBase = queryBase.Where(s => s.ProyectoId != null && proyectosPermitidos.Contains(s.ProyectoId.Value)
            && s.UsuarioAsignadoId == usuarioActualId);
    }

    if (proyectoId.HasValue)
    {
        queryBase = queryBase.Where(s => s.ProyectoId == proyectoId.Value);
    }

    if (tipoSolicitudId.HasValue)
    {
        queryBase = queryBase.Where(s => s.TipoSolicitudId == tipoSolicitudId.Value);
    }

    if (!string.IsNullOrWhiteSpace(buscar))
    {
        queryBase = queryBase.Where(s =>
            (s.Ciudadano != null && s.Ciudadano.NombreCompleto.Contains(buscar)) ||
            (s.Empresa != null && s.Empresa.RazonSocial.Contains(buscar)) ||
            s.Id.ToString().Contains(buscar));
    }

    var conteosPorEstado = await queryBase
        .GroupBy(s => s.Estado)
        .Select(g => new ConteoEstadoDto { Estado = g.Key, Total = g.Count() })
        .ToListAsync();

    var query = queryBase;
    if (!string.IsNullOrWhiteSpace(estado))
    {
        query = query.Where(s => s.Estado == estado);
    }

    var totalRegistros = await query.CountAsync();
    var totalPaginas = (int)Math.Ceiling(totalRegistros / (double)tamanoPagina);

    var solicitudes = await query
        .OrderByDescending(s => s.FechaCreacion)
        .Skip((pagina - 1) * tamanoPagina)
        .Take(tamanoPagina)
        .Select(s => new SolicitudResponseDto
        {
            Id = s.Id,
            Numero = s.Proyecto != null ? s.Proyecto.Codigo + "-" + s.Id.ToString("0000") : s.Id.ToString(),
            ProyectoNombre = s.Proyecto != null ? s.Proyecto.Nombre : null,
            CiudadanoId = s.CiudadanoId,
            CiudadanoNombre = s.Ciudadano != null ? s.Ciudadano.NombreCompleto : null,
            EmpresaId = s.EmpresaId,
            EmpresaNombre = s.Empresa != null ? s.Empresa.RazonSocial : null,
            UsuarioAsignadoId = s.UsuarioAsignadoId,
            UsuarioAsignadoNombre = s.UsuarioAsignado != null ? s.UsuarioAsignado.NombreCompleto : null,
            TipoSolicitudNombre = s.TipoSolicitud != null ? s.TipoSolicitud.Nombre : null,
            Estado = s.Estado,
            FechaCreacion = s.FechaCreacion,
            FechaCierre = s.FechaCierre,
            FechaUltimoCambioEstado = s.HistorialEstados.Any()
                ? s.HistorialEstados.Max(h => h.FechaCambio)
                : s.FechaCreacion
        })
        .ToListAsync();

    var respuesta = new ListadoSolicitudesResponseDto
    {
        Pagina = new PaginacionResponseDto<SolicitudResponseDto>
        {
            Datos = solicitudes,
            TotalRegistros = totalRegistros,
            PaginaActual = pagina,
            TotalPaginas = totalPaginas
        },
        ConteosPorEstado = conteosPorEstado
    };

    return Ok(respuesta);
}
    // POST: api/Solicitudes
    [HttpPost]
    public async Task<IActionResult> CrearSolicitud(CrearSolicitudDto dto)
    {
        if (dto.CiudadanoId == null && dto.EmpresaId == null)
        {
            return BadRequest(new { mensaje = "Debe indicar un Ciudadano o una Empresa" });
        }

        var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
        var proyectosPermitidos = User.FindAll("proyecto")
            .Select(c => int.Parse(c.Value.Split(':')[0]))
            .ToList();

        if (!esAdminSyc && (dto.ProyectoId == null || !proyectosPermitidos.Contains(dto.ProyectoId.Value)))
        {
            return BadRequest(new { mensaje = "No tienes acceso al proyecto indicado." });
        }

        var nuevaSolicitud = new Solicitud
        {
            CiudadanoId = dto.CiudadanoId,
            EmpresaId = dto.EmpresaId,
            ProyectoId = dto.ProyectoId,
            TipoSolicitudId = dto.TipoSolicitudId,
            VehiculoId = dto.VehiculoId,
            DatosAdicionales = dto.DatosAdicionales,
            Estado = "Radicada",
            FechaCreacion = DateTime.UtcNow,
            // El operador que radica queda dueño del caso de una vez — ya no hace falta un paso
            // aparte de "Tomar caso" (un admin puede reasignarlo después si hace falta).
            UsuarioAsignadoId = esAdminSyc ? null : int.Parse(User.FindFirst("sub")!.Value),
        };

        _context.Solicitudes.Add(nuevaSolicitud);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSolicitud), new { id = nuevaSolicitud.Id }, new { nuevaSolicitud.Id });
    }

    // PUT: api/Solicitudes/5
    [HttpPut("{id}")]
    public async Task<IActionResult> ActualizarSolicitud(int id, ActualizarSolicitudDto dto)
    {
        var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
        var proyectosPermitidos = User.FindAll("proyecto")
            .Select(c => int.Parse(c.Value.Split(':')[0]))
            .ToList();

        var solicitud = await _context.Solicitudes.FindAsync(id);

        if (solicitud == null)
            return NotFound();

        if (!esAdminSyc && (solicitud.ProyectoId == null || !proyectosPermitidos.Contains(solicitud.ProyectoId.Value)))
            return NotFound();

        if (dto.TipoSolicitudId.HasValue)
        {
            solicitud.TipoSolicitudId = dto.TipoSolicitudId.Value;
        }
        solicitud.DatosAdicionales = dto.DatosAdicionales;

        await _context.SaveChangesAsync();

        return NoContent();
    }

//Inicio metodo post para cargue de documentos
    [HttpPost("{id}/documentos")]
public async Task<IActionResult> SubirDocumento(int id, IFormFile archivo)
{
    var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
    var proyectosPermitidos = User.FindAll("proyecto")
        .Select(c => int.Parse(c.Value.Split(':')[0]))
        .ToList();

    var solicitud = await _context.Solicitudes
        .Include(s => s.Proyecto)
        .FirstOrDefaultAsync(s => s.Id == id);

    if (solicitud == null)
        return NotFound();

    if (!esAdminSyc && (solicitud.ProyectoId == null || !proyectosPermitidos.Contains(solicitud.ProyectoId.Value)))
    {
        return NotFound();
    }

    if (archivo == null || archivo.Length == 0)
    {
        return BadRequest(new { mensaje = "Debe adjuntar un archivo" });
    }

    using var stream = archivo.OpenReadStream();
    var rutaGuardada = await _almacenamiento.GuardarArchivoAsync(stream, archivo.FileName, $"solicitudes/{id}");

    var nuevoDocumento = new Documento
    {
        SolicitudId = id,
        NombreArchivo = archivo.FileName,
        RutaArchivo = rutaGuardada,
        TamanoBytes = archivo.Length,
        TipoArchivo = archivo.ContentType,
        FechaCarga = DateTime.UtcNow
    };

    _context.Documentos.Add(nuevoDocumento);
    await _context.SaveChangesAsync();

    var respuesta = new DocumentoResponseDto
    {
        Id = nuevoDocumento.Id,
        NombreArchivo = nuevoDocumento.NombreArchivo,
        SolicitudNumero = solicitud.Proyecto != null ? $"{solicitud.Proyecto.Codigo}-{solicitud.Id:0000}" : solicitud.Id.ToString(),
        Fecha = nuevoDocumento.FechaCarga,
        TamanoBytes = nuevoDocumento.TamanoBytes,
        TipoArchivo = nuevoDocumento.TipoArchivo
    };

    return Ok(respuesta);
}

// fin

// PUT: api/Solicitudes/5/cambiar-estado
    [HttpPut("{id}/cambiar-estado")]
    public async Task<IActionResult> CambiarEstado(int id, CambiarEstadoDto dto)
    {
        var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
        var proyectosPermitidos = User.FindAll("proyecto")
            .Select(c => int.Parse(c.Value.Split(':')[0]))
            .ToList();

        var solicitud = await _context.Solicitudes.FindAsync(id);

        if (solicitud == null)
            return NotFound();

        if (!esAdminSyc && (solicitud.ProyectoId == null || !proyectosPermitidos.Contains(solicitud.ProyectoId.Value)))
            return NotFound();

        var estadoAnterior = solicitud.Estado;
        solicitud.Estado = dto.NuevoEstado;

        var estadosFinales = new[] { "Aprobada", "Rechazada", "Finalizada" };
        if (estadosFinales.Contains(dto.NuevoEstado))
        {
            solicitud.FechaCierre = DateTime.UtcNow;
        }

        var historial = new HistorialEstado
        {
            SolicitudId = solicitud.Id,
            EstadoAnterior = estadoAnterior,
            EstadoNuevo = dto.NuevoEstado,
            FechaCambio = DateTime.UtcNow
        };

        _context.HistorialEstados.Add(historial);
        await _context.SaveChangesAsync();

        return NoContent();
    }

// PUT: api/Solicitudes/5/asignar-usuario
    [HttpPut("{id}/asignar-usuario")]
    public async Task<IActionResult> AsignarUsuario(int id, AsignarUsuarioDto dto)
    {
        var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
        var proyectosPermitidos = User.FindAll("proyecto")
            .Select(c => int.Parse(c.Value.Split(':')[0]))
            .ToList();

        var solicitud = await _context.Solicitudes.FindAsync(id);

        if (solicitud == null)
            return NotFound();

        if (!esAdminSyc && (solicitud.ProyectoId == null || !proyectosPermitidos.Contains(solicitud.ProyectoId.Value)))
            return NotFound();

        var usuarioExiste = await _context.Usuarios.AnyAsync(u => u.Id == dto.UsuarioId && u.Activo);

        if (!usuarioExiste)
            return BadRequest(new { mensaje = "El usuario no existe o no está activo" });

        // El destino debe pertenecer al proyecto de la solicitud — si no, se podría "asignar"
        // un caso a alguien sin acceso a ese proyecto.
        var perteneceAlProyecto = await _context.UsuarioProyectos
            .AnyAsync(up => up.UsuarioId == dto.UsuarioId && up.ProyectoId == solicitud.ProyectoId);

        if (!perteneceAlProyecto)
            return BadRequest(new { mensaje = "El usuario no pertenece al proyecto de esta solicitud." });

        solicitud.UsuarioAsignadoId = dto.UsuarioId;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/Solicitudes/5/preliquidacion-pdf
    [HttpGet("{id}/preliquidacion-pdf")]
    public async Task<IActionResult> GetPreliquidacionPdf(int id)
    {
        var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
        var proyectosPermitidos = User.FindAll("proyecto")
            .Select(c => int.Parse(c.Value.Split(':')[0]))
            .ToList();

        var solicitud = await _context.Solicitudes
            .Include(s => s.Ciudadano)
            .Include(s => s.Empresa)
            .Include(s => s.Proyecto)
            .Include(s => s.Vehiculo)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (solicitud == null)
            return NotFound();

        if (!esAdminSyc && (solicitud.ProyectoId == null || !proyectosPermitidos.Contains(solicitud.ProyectoId.Value)))
            return NotFound();

        if (solicitud.Vehiculo == null)
            return BadRequest(new { mensaje = "Esta solicitud no tiene un vehículo asociado" });

        var datos = LeerDatosAdicionales(solicitud.DatosAdicionales);

        var avaluo = decimal.TryParse(datos.GetValueOrDefault("baseGravable"), out var av) ? av : 0m;
        var antiguoClasico = datos.GetValueOrDefault("antiguoClasico") == "Sí";

        var (baseGravable, tarifa, impuesto) = CalcularImpuestoVehicular(avaluo, antiguoClasico);

        var fechaInicio = solicitud.FechaCreacion;
        var fechaLimiteOportuno = fechaInicio.AddDays(15);
        var fechaLimiteExtraordinario = fechaInicio.AddDays(30);
        var totalExtraordinario = Math.Round(impuesto * 1.05m, 0);

        var numero = solicitud.Proyecto != null ? $"{solicitud.Proyecto.Codigo}-{solicitud.Id:0000}" : solicitud.Id.ToString();
        var propietarioNombre = solicitud.Ciudadano?.NombreCompleto ?? solicitud.Empresa?.RazonSocial ?? "—";
        var propietarioDocumento = solicitud.Ciudadano != null
            ? $"{solicitud.Ciudadano.TipoDocumento} {solicitud.Ciudadano.NumeroDocumento}"
            : solicitud.Empresa?.Nit ?? "—";

        var qrBytes = DisenoPdfSgds.GenerarQrPng(ContenidoQrPreliquidacion(numero, solicitud.Vehiculo.Placa, Math.Round(impuesto, 0), fechaLimiteOportuno));

        var pdfBytes = GenerarPreliquidacionPdf(
            numero, solicitud.Vehiculo, propietarioNombre, propietarioDocumento, datos,
            avaluo, baseGravable, tarifa, Math.Round(impuesto, 0), totalExtraordinario,
            fechaInicio, fechaLimiteOportuno, fechaLimiteExtraordinario, qrBytes);

        return File(pdfBytes, "application/pdf", $"Preliquidacion_{numero}.pdf");
    }

    // GET: api/Solicitudes/5/preliquidacion-qr.png
    [HttpGet("{id}/preliquidacion-qr.png")]
    public async Task<IActionResult> GetPreliquidacionQr(int id)
    {
        var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
        var proyectosPermitidos = User.FindAll("proyecto")
            .Select(c => int.Parse(c.Value.Split(':')[0]))
            .ToList();

        var solicitud = await _context.Solicitudes
            .Include(s => s.Proyecto)
            .Include(s => s.Vehiculo)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (solicitud == null)
            return NotFound();

        if (!esAdminSyc && (solicitud.ProyectoId == null || !proyectosPermitidos.Contains(solicitud.ProyectoId.Value)))
            return NotFound();

        if (solicitud.Vehiculo == null)
            return BadRequest(new { mensaje = "Esta solicitud no tiene un vehículo asociado" });

        var datos = LeerDatosAdicionales(solicitud.DatosAdicionales);
        var avaluo = decimal.TryParse(datos.GetValueOrDefault("baseGravable"), out var av) ? av : 0m;
        var antiguoClasico = datos.GetValueOrDefault("antiguoClasico") == "Sí";
        var (_, _, impuesto) = CalcularImpuestoVehicular(avaluo, antiguoClasico);

        var numero = solicitud.Proyecto != null ? $"{solicitud.Proyecto.Codigo}-{solicitud.Id:0000}" : solicitud.Id.ToString();
        var fechaLimiteOportuno = solicitud.FechaCreacion.AddDays(15);

        var qrBytes = DisenoPdfSgds.GenerarQrPng(ContenidoQrPreliquidacion(numero, solicitud.Vehiculo.Placa, Math.Round(impuesto, 0), fechaLimiteOportuno));

        return File(qrBytes, "image/png");
    }

    private static Dictionary<string, string> LeerDatosAdicionales(string? datosAdicionales)
    {
        var datos = new Dictionary<string, string>();
        if (!string.IsNullOrWhiteSpace(datosAdicionales))
        {
            try
            {
                using var doc = JsonDocument.Parse(datosAdicionales);
                foreach (var prop in doc.RootElement.EnumerateObject())
                {
                    datos[prop.Name] = prop.Value.ValueKind == JsonValueKind.String ? (prop.Value.GetString() ?? "") : prop.Value.ToString();
                }
            }
            catch (JsonException) { }
        }
        return datos;
    }

    private static string ContenidoQrPreliquidacion(string numero, string placa, decimal valorAPagar, DateTime fechaLimite) =>
        $"SGDS-IUVA|{numero}|Placa:{placa}|Valor:{valorAPagar:0}|Vence:{fechaLimite:yyyy-MM-dd}";

    // El +10% de blindaje ya viene incluido en "baseGravable" cuando aplica (lo calcula
    // CalculadoraBaseGravableVehiculo al radicar) — no se vuelve a aplicar aquí para no
    // contarlo dos veces. El descuento de antiguo/clásico sí sigue aplicándose aquí porque el
    // motor de base gravable no lo resuelve todavía (tarifa/base fija sin configurar).
    private static (decimal baseGravable, decimal tarifa, decimal impuesto) CalcularImpuestoVehicular(decimal avaluo, bool antiguoClasico)
    {
        var baseGravable = avaluo;
        if (antiguoClasico) baseGravable *= 0.5m;

        decimal tarifa;
        if (baseGravable <= 57_349_000m) tarifa = 0.015m;
        else if (baseGravable <= 129_032_000m) tarifa = 0.025m;
        else tarifa = 0.035m;

        var impuesto = baseGravable * tarifa;
        return (baseGravable, tarifa, impuesto);
    }

    private byte[] GenerarPreliquidacionPdf(
        string numero, Vehiculo vehiculo, string propietarioNombre, string propietarioDocumento,
        Dictionary<string, string> datos, decimal avaluo, decimal baseGravable, decimal tarifa, decimal impuesto,
        decimal totalExtraordinario, DateTime fechaInicio, DateTime fechaLimiteOportuno, DateTime fechaLimiteExtraordinario,
        byte[] qrBytes)
    {
        string Moneda(decimal v) => v.ToString("C0", new System.Globalization.CultureInfo("es-CO"));

        var documento = Document.Create(contenedor =>
        {
            contenedor.Page(pagina =>
            {
                pagina.Size(PageSizes.A4);
                pagina.Margin(0);
                pagina.DefaultTextStyle(x => x.FontSize(10));

                pagina.Header().Element(h => DisenoPdfSgds.Encabezado(h, "IUVA · Impuesto Vehicular", "Preliquidación", numero, DisenoPdfSgds.EscudoSantander));

                pagina.Content().Padding(24).Column(col =>
                {
                    DisenoPdfSgds.SeccionTabla(col, "Vehículo",
                        ("Placa", vehiculo.Placa),
                        ("Marca / Línea", $"{vehiculo.Marca} {vehiculo.Linea}".Trim()),
                        ("Modelo", vehiculo.Modelo?.ToString() ?? "—"),
                        ("Número de chasis", vehiculo.NumeroChasis ?? "—"),
                        ("Tipo de vehículo", datos.GetValueOrDefault("tipoVehiculo", "—")),
                        ("Subtipo", datos.GetValueOrDefault("subtipo", "—")),
                        ("Cilindraje", datos.GetValueOrDefault("cilindraje", "—")),
                        ("Municipio de matrícula", datos.GetValueOrDefault("municipioMatricula", "—")),
                        ("Departamento de matrícula", datos.GetValueOrDefault("departamentoMatricula", "—")));

                    DisenoPdfSgds.SeccionTabla(col, "Propietario",
                        ("Nombre", propietarioNombre),
                        ("Documento", propietarioDocumento));

                    DisenoPdfSgds.SeccionTabla(col, "Base gravable",
                        ("Base gravable (tabla Mintransporte o valor de compra)", Moneda(avaluo)),
                        ("¿Antiguo o clásico?", datos.GetValueOrDefault("antiguoClasico", "No")),
                        ("¿Blindado?", datos.GetValueOrDefault("blindado", "No") == "Sí" ? "Sí (ya incluido arriba)" : "No"),
                        ("Base gravable ajustada", Moneda(baseGravable)),
                        ("Tarifa aplicada", $"{tarifa * 100:0.0}%"),
                        ("Valor del impuesto", Moneda(impuesto)));

                    col.Item().PaddingTop(12).Text("Fechas y valores de pago").FontSize(10.5f).Bold().FontColor(DisenoPdfSgds.Blue600);
                    col.Item().PaddingTop(4).Table(t =>
                    {
                        t.ColumnsDefinition(c => { c.RelativeColumn(2); c.RelativeColumn(2); c.RelativeColumn(2); });
                        DisenoPdfSgds.TablaEncabezado(t, "Concepto", "Fecha límite", "Valor a pagar");
                        (string, string, string)[] filas =
                        [
                            ("Pago oportuno", fechaLimiteOportuno.ToString("dd/MM/yyyy"), Moneda(impuesto)),
                            ("Pago extraordinario (+5% recargo)", fechaLimiteExtraordinario.ToString("dd/MM/yyyy"), Moneda(totalExtraordinario)),
                        ];
                        for (var i = 0; i < filas.Length; i++)
                        {
                            var (concepto, fecha, valor) = filas[i];
                            var fondo = i % 2 == 0 ? "#FFFFFF" : DisenoPdfSgds.Paper;
                            t.Cell().Background(fondo).BorderBottom(0.5f).BorderColor(DisenoPdfSgds.Line).Padding(6).Text(concepto).FontSize(9);
                            t.Cell().Background(fondo).BorderBottom(0.5f).BorderColor(DisenoPdfSgds.Line).Padding(6).Text(fecha).FontSize(9);
                            t.Cell().Background(fondo).BorderBottom(0.5f).BorderColor(DisenoPdfSgds.Line).Padding(6).Text(valor).FontSize(9);
                        }
                    });

                    DisenoPdfSgds.BloqueQr(col, qrBytes, numero);

                    col.Item().PaddingTop(10).Text("Bancos habilitados: Davivienda, BBVA, Bancolombia, Banco de Bogotá — también disponible por PSE (tarjeta débito/crédito, cuentas de ahorro).")
                        .FontSize(8.5f).FontColor(DisenoPdfSgds.Ink600);
                });

                pagina.Footer().PaddingHorizontal(24).PaddingBottom(16).Element(f => DisenoPdfSgds.PiePagina(f,
                    "Preliquidación sujeta a verificación por la Secretaría de Hacienda Departamental de Santander."));
            });
        });

        return documento.GeneratePdf();
    }

    // ===== Estampillas (Departamento de Santander) =====

    // GET: api/Solicitudes/5/preliquidacion-estampillas
    [HttpGet("{id}/preliquidacion-estampillas")]
    public async Task<IActionResult> GetPreliquidacionEstampillas(int id)
    {
        var (error, _, dto) = await CalcularLiquidacionEstampillasAsync(id);
        return error ?? Ok(dto);
    }

    // GET: api/Solicitudes/5/preliquidacion-estampillas-pdf
    [HttpGet("{id}/preliquidacion-estampillas-pdf")]
    public async Task<IActionResult> GetPreliquidacionEstampillasPdf(int id)
    {
        var (error, _, dto) = await CalcularLiquidacionEstampillasAsync(id);
        if (error != null) return error;

        var qrBytes = DisenoPdfSgds.GenerarQrPng(ContenidoQrEstampillas(dto!.Numero, dto.Total));
        var pdfBytes = GenerarEstampillasPdf(dto, qrBytes);
        return File(pdfBytes, "application/pdf", $"Liquidacion_Estampillas_{dto.Numero}.pdf");
    }

    // GET: api/Solicitudes/5/preliquidacion-estampillas-qr.png
    [HttpGet("{id}/preliquidacion-estampillas-qr.png")]
    public async Task<IActionResult> GetPreliquidacionEstampillasQr(int id)
    {
        var (error, _, dto) = await CalcularLiquidacionEstampillasAsync(id);
        if (error != null) return error;

        var qrBytes = DisenoPdfSgds.GenerarQrPng(ContenidoQrEstampillas(dto!.Numero, dto.Total));
        return File(qrBytes, "image/png");
    }

    private async Task<(IActionResult? Error, Solicitud? Solicitud, LiquidacionEstampillasResponseDto? Dto)> CalcularLiquidacionEstampillasAsync(int id)
    {
        var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
        var proyectosPermitidos = User.FindAll("proyecto")
            .Select(c => int.Parse(c.Value.Split(':')[0]))
            .ToList();

        var solicitud = await _context.Solicitudes
            .Include(s => s.Ciudadano)
            .Include(s => s.Empresa)
            .Include(s => s.Proyecto)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (solicitud == null)
            return (NotFound(), null, null);

        if (!esAdminSyc && (solicitud.ProyectoId == null || !proyectosPermitidos.Contains(solicitud.ProyectoId.Value)))
            return (NotFound(), null, null);

        var datos = LeerDatosAdicionales(solicitud.DatosAdicionales);
        decimal LeerNumero(string clave) => decimal.TryParse(datos.GetValueOrDefault(clave), out var v) ? v : 0m;

        var entrada = new CalculadoraEstampillas.Entrada(
            ValorContratoBruto: LeerNumero("valorContratoBruto"),
            IncluyeIva: datos.GetValueOrDefault("incluyeIva") == "Sí",
            TarifaIva: LeerNumero("tarifaIva"),
            TipoEntidad: datos.GetValueOrDefault("tipoEntidad", string.Empty),
            RegimenContratista: datos.GetValueOrDefault("regimenContratista", string.Empty),
            TipoContrato: datos.GetValueOrDefault("tipoContrato", string.Empty),
            FuenteRecursos: datos.GetValueOrDefault("fuenteRecursos", string.Empty),
            Municipio: datos.GetValueOrDefault("municipio", string.Empty)
        );

        CalculadoraEstampillas.Resultado resultado;
        try
        {
            resultado = CalculadoraEstampillas.Calcular(entrada, _configEstampillas);
        }
        catch (ArgumentException ex)
        {
            return (BadRequest(new { mensaje = ex.Message }), null, null);
        }

        var numero = solicitud.Proyecto != null ? $"{solicitud.Proyecto.Codigo}-{solicitud.Id:0000}" : solicitud.Id.ToString();

        var dto = new LiquidacionEstampillasResponseDto
        {
            Numero = numero,
            ContribuyenteNombre = solicitud.Ciudadano?.NombreCompleto ?? solicitud.Empresa?.RazonSocial ?? "—",
            ContribuyenteDocumento = solicitud.Ciudadano != null
                ? $"{solicitud.Ciudadano.TipoDocumento} {solicitud.Ciudadano.NumeroDocumento}"
                : solicitud.Empresa?.Nit ?? "—",
            HechoGenerador = datos.GetValueOrDefault("hechoGenerador"),
            ObjetoContrato = datos.GetValueOrDefault("objetoContrato"),
            FechaSuscripcion = datos.GetValueOrDefault("fechaSuscripcion"),
            ValorContrato = entrada.ValorContratoBruto,
            BaseGravable = resultado.BaseGravable,
            Items = resultado.Items.Select(i => new EstampillaItemResponseDto
            {
                Nombre = i.Nombre,
                Aplica = i.Aplica,
                Tarifa = i.Tarifa,
                BaseGravable = i.BaseGravable,
                Valor = i.Valor,
                Motivo = i.Motivo,
                Distribucion = i.Distribucion
            }).ToList(),
            Total = resultado.Total
        };

        return (null, solicitud, dto);
    }

    private static string ContenidoQrEstampillas(string numero, decimal total) =>
        $"SGDS-ESTAMPILLAS|{numero}|Total:{total:0}";

    private byte[] GenerarEstampillasPdf(LiquidacionEstampillasResponseDto dto, byte[] qrBytes)
    {
        string Moneda(decimal v) => v.ToString("C0", new System.Globalization.CultureInfo("es-CO"));

        var documento = Document.Create(contenedor =>
        {
            contenedor.Page(pagina =>
            {
                pagina.Size(PageSizes.A4);
                pagina.Margin(0);
                pagina.DefaultTextStyle(x => x.FontSize(10));

                pagina.Header().Element(h => DisenoPdfSgds.Encabezado(h, "Estampillas Departamentales", "Preliquidación", dto.Numero, DisenoPdfSgds.EscudoSantander));

                pagina.Content().Padding(24).Column(col =>
                {
                    DisenoPdfSgds.SeccionTabla(col, "Contribuyente",
                        ("Nombre / Razón social", dto.ContribuyenteNombre),
                        ("Documento / NIT", dto.ContribuyenteDocumento));

                    DisenoPdfSgds.SeccionTabla(col, "Contrato",
                        ("Hecho generador", dto.HechoGenerador ?? "—"),
                        ("Objeto", dto.ObjetoContrato ?? "—"),
                        ("Fecha de suscripción", dto.FechaSuscripcion ?? "—"),
                        ("Valor del contrato", Moneda(dto.ValorContrato)),
                        ("Base gravable", Moneda(dto.BaseGravable)));

                    col.Item().PaddingTop(12).Text("Estampillas aplicables").FontSize(10.5f).Bold().FontColor(DisenoPdfSgds.Blue600);
                    col.Item().PaddingTop(4).Table(t =>
                    {
                        t.ColumnsDefinition(c => { c.RelativeColumn(3); c.RelativeColumn(); c.RelativeColumn(2); });
                        DisenoPdfSgds.TablaEncabezado(t, "Estampilla", "Tarifa", "Valor");
                        var itemsAplican = dto.Items.Where(i => i.Aplica).ToList();
                        for (var i = 0; i < itemsAplican.Count; i++)
                        {
                            var item = itemsAplican[i];
                            var fondo = i % 2 == 0 ? "#FFFFFF" : DisenoPdfSgds.Paper;
                            t.Cell().Background(fondo).BorderBottom(0.5f).BorderColor(DisenoPdfSgds.Line).Padding(6).Text(item.Nombre).FontSize(9);
                            t.Cell().Background(fondo).BorderBottom(0.5f).BorderColor(DisenoPdfSgds.Line).Padding(6).Text($"{item.Tarifa * 100:0.0}%").FontSize(9);
                            t.Cell().Background(fondo).BorderBottom(0.5f).BorderColor(DisenoPdfSgds.Line).Padding(6).Text(Moneda(item.Valor)).FontSize(9);
                        }
                    });

                    DisenoPdfSgds.ValorDestacado(col, "Total a pagar", Moneda(dto.Total));

                    DisenoPdfSgds.BloqueQr(col, qrBytes, dto.Numero);

                    col.Item().PaddingTop(10).Text("Bancos habilitados: Davivienda, BBVA, Bancolombia, Banco de Bogotá — también disponible por PSE (tarjeta débito/crédito, cuentas de ahorro).")
                        .FontSize(8.5f).FontColor(DisenoPdfSgds.Ink600);
                    col.Item().PaddingTop(6).Text("Tarifas de referencia — deben validarse contra el Estatuto de Rentas del Departamento de Santander vigente. No se aplica ningún recargo adicional sobre el total (Ordenanza 012/2005 anulada judicialmente).")
                        .FontSize(8).Italic().FontColor(DisenoPdfSgds.Ink400);
                });

                pagina.Footer().PaddingHorizontal(24).PaddingBottom(16).Element(f => DisenoPdfSgds.PiePagina(f,
                    "Preliquidación informativa — no constituye recibo de pago oficial."));
            });
        });

        return documento.GeneratePdf();
    }

}

