using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGDS.Application.DTOs;
using SGDS.Domain.Entities;
using SGDS.Infrastructure.Data;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SGDS.Api.Pdf;

namespace SGDS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PasivosLaboralesController : ControllerBase
{
    private readonly SgdsDbContext _context;

    private static readonly string[] InstrumentosPensional = { "CuotaParte", "BonoPensionalB", "BonoPensionalT", "CalculoActuarial" };
    private static readonly string[] InstrumentosLaboral = { "DemandaSentencia", "CesantiasRetroactivas", "SueldosRemanentes" };
    private const string TipoGestionPensional = "Gestión de pasivo pensional";
    private const string TipoGestionLaboral = "Gestión de pasivo laboral";
    private const string TipoConsultaExpediente = "Consulta de expediente digital";

    public PasivosLaboralesController(SgdsDbContext context)
    {
        _context = context;
    }

    // ===== Creación y edición =====

    // POST: api/PasivosLaborales/solicitudes
    [HttpPost("solicitudes")]
    public async Task<IActionResult> CrearSolicitud(CrearSolicitudPasivosLaboralesDto dto)
    {
        var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
        var proyectosPermitidos = User.FindAll("proyecto")
            .Select(c => int.Parse(c.Value.Split(':')[0]))
            .ToList();

        if (!esAdminSyc && !proyectosPermitidos.Contains(dto.ProyectoId))
        {
            return BadRequest(new { mensaje = "No tienes acceso al proyecto indicado." });
        }

        var empresaExiste = await _context.Empresas.AnyAsync(e => e.Id == dto.EmpresaId);
        if (!empresaExiste)
            return BadRequest(new { mensaje = "La entidad territorial no existe." });

        var tipo = await _context.TiposSolicitudes.FindAsync(dto.TipoSolicitudId);
        if (tipo == null)
            return BadRequest(new { mensaje = "El tipo de solicitud no es válido." });

        var errorInstrumento = ValidarInstrumento(tipo.Nombre, dto.Instrumento);
        if (errorInstrumento != null)
            return BadRequest(new { mensaje = errorInstrumento });

        var errorColpensiones = await ValidarSolicitudColpensionesAsync(dto.SolicitudColpensionesId);
        if (errorColpensiones != null)
            return BadRequest(new { mensaje = errorColpensiones });

        var nuevaSolicitud = new Solicitud
        {
            EmpresaId = dto.EmpresaId,
            ProyectoId = dto.ProyectoId,
            TipoSolicitudId = dto.TipoSolicitudId,
            Estado = "Radicada",
            FechaCreacion = DateTime.UtcNow,
            UsuarioAsignadoId = esAdminSyc ? null : int.Parse(User.FindFirst("sub")!.Value),
            InstrumentoPasivoLaboral = new InstrumentoPasivoLaboral
            {
                Instrumento = dto.Instrumento,
                ServidorNombre = dto.ServidorNombre,
                ServidorDocumento = dto.ServidorDocumento,
                RegimenPensional = dto.RegimenPensional,
                TiempoLaboradoMeses = dto.TiempoLaboradoMeses,
                TiempoTotalAportesMeses = dto.TiempoTotalAportesMeses,
                ValorMesadaPensional = dto.ValorMesadaPensional,
                Observaciones = dto.Observaciones,
                SolicitudColpensionesId = dto.SolicitudColpensionesId,
            },
        };

        _context.Solicitudes.Add(nuevaSolicitud);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetInstrumento), new { id = nuevaSolicitud.Id }, new { nuevaSolicitud.Id });
    }

    // PUT: api/PasivosLaborales/solicitudes/5
    [HttpPut("solicitudes/{id}")]
    public async Task<IActionResult> ActualizarSolicitud(int id, ActualizarSolicitudPasivosLaboralesDto dto)
    {
        var (error, solicitud) = await ObtenerSolicitudPasivosLaboralesAsync(id);
        if (error != null) return error;

        var errorInstrumento = ValidarInstrumento(solicitud!.TipoSolicitud?.Nombre ?? string.Empty, dto.Instrumento);
        if (errorInstrumento != null)
            return BadRequest(new { mensaje = errorInstrumento });

        var i = solicitud.InstrumentoPasivoLaboral!;
        i.Instrumento = dto.Instrumento;
        i.ServidorNombre = dto.ServidorNombre;
        i.ServidorDocumento = dto.ServidorDocumento;
        i.RegimenPensional = dto.RegimenPensional;
        i.TiempoLaboradoMeses = dto.TiempoLaboradoMeses;
        i.TiempoTotalAportesMeses = dto.TiempoTotalAportesMeses;
        i.ValorMesadaPensional = dto.ValorMesadaPensional;
        i.Observaciones = dto.Observaciones;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ===== Instrumento =====

    // GET: api/PasivosLaborales/solicitudes/5/instrumento
    [HttpGet("solicitudes/{id}/instrumento")]
    public async Task<IActionResult> GetInstrumento(int id)
    {
        var (error, solicitud) = await ObtenerSolicitudPasivosLaboralesAsync(id);
        return error ?? Ok(ConstruirInstrumentoDto(solicitud!));
    }

    // ===== Liquidación de cuota parte pensional =====

    // GET: api/PasivosLaborales/solicitudes/5/liquidacion
    [HttpGet("solicitudes/{id}/liquidacion")]
    public async Task<IActionResult> GetLiquidacion(int id)
    {
        var (error, solicitud) = await ObtenerSolicitudPasivosLaboralesAsync(id);
        return error ?? Ok(ConstruirLiquidacionDto(solicitud!));
    }

    // GET: api/PasivosLaborales/solicitudes/5/liquidacion-pdf
    [HttpGet("solicitudes/{id}/liquidacion-pdf")]
    public async Task<IActionResult> GetLiquidacionPdf(int id)
    {
        var (error, solicitud) = await ObtenerSolicitudPasivosLaboralesAsync(id);
        if (error != null) return error;

        var dto = ConstruirLiquidacionDto(solicitud!);
        var qrBytes = DisenoPdfSgds.GenerarQrPng($"SGDS-PASIVOSLABORALES|{dto.Referencia}|{dto.EmpresaNit}|{dto.ValorMensualACargo?.ToString("0") ?? "NA"}");
        var pdfBytes = GenerarLiquidacionPdf(dto, qrBytes);
        return File(pdfBytes, "application/pdf", $"Liquidacion_{dto.Referencia}.pdf");
    }

    // GET: api/PasivosLaborales/solicitudes/5/liquidacion-qr.png
    [HttpGet("solicitudes/{id}/liquidacion-qr.png")]
    public async Task<IActionResult> GetLiquidacionQr(int id)
    {
        var (error, solicitud) = await ObtenerSolicitudPasivosLaboralesAsync(id);
        if (error != null) return error;

        var dto = ConstruirLiquidacionDto(solicitud!);
        var qrBytes = DisenoPdfSgds.GenerarQrPng($"SGDS-PASIVOSLABORALES|{dto.Referencia}|{dto.EmpresaNit}|{dto.ValorMensualACargo?.ToString("0") ?? "NA"}");
        return File(qrBytes, "image/png");
    }

    // ===== Búsqueda de solicitudes de pensión en Colpensiones (puente opcional) =====
    // RN, Fase 1 "Disparador": un ciudadano radica su pensión en Colpensiones y esa solicitud
    // es la que detona el trámite de concurrencia de tiempos públicos en Pasivos Laborales.

    // GET: api/PasivosLaborales/colpensiones-disponibles?buscar=
    [HttpGet("colpensiones-disponibles")]
    public async Task<IActionResult> GetColpensionesDisponibles([FromQuery] string? buscar)
    {
        var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
        var proyectosPermitidos = User.FindAll("proyecto")
            .Select(c => int.Parse(c.Value.Split(':')[0]))
            .ToList();

        var query = _context.Solicitudes
            .Include(s => s.Proyecto)
            .Include(s => s.TipoSolicitud)
            .Include(s => s.Ciudadano)
            .Where(s => s.Proyecto != null && s.Proyecto.Nombre == "Colpensiones"
                     && s.TipoSolicitud != null && (s.TipoSolicitud.Nombre == "Pensión de vejez" || s.TipoSolicitud.Nombre == "Pensión de invalidez"));

        if (!esAdminSyc)
            query = query.Where(s => s.ProyectoId != null && proyectosPermitidos.Contains(s.ProyectoId.Value));

        var solicitudes = await query.OrderByDescending(s => s.FechaCreacion).Take(200).ToListAsync();

        var resultado = solicitudes
            .Select(s => new SolicitudColpensionesDisponibleDto
            {
                Id = s.Id,
                Numero = s.Proyecto != null ? $"{s.Proyecto.Codigo}-{s.Id:0000}" : s.Id.ToString(),
                TipoSolicitudNombre = s.TipoSolicitud?.Nombre ?? string.Empty,
                Estado = s.Estado,
                CiudadanoNombre = s.Ciudadano?.NombreCompleto,
                CiudadanoDocumento = s.Ciudadano?.NumeroDocumento,
                FechaCreacion = s.FechaCreacion,
            })
            .Where(d => string.IsNullOrWhiteSpace(buscar)
                     || d.Numero.Contains(buscar, StringComparison.OrdinalIgnoreCase)
                     || (d.CiudadanoNombre != null && d.CiudadanoNombre.Contains(buscar, StringComparison.OrdinalIgnoreCase))
                     || (d.CiudadanoDocumento != null && d.CiudadanoDocumento.Contains(buscar, StringComparison.OrdinalIgnoreCase)))
            .ToList();

        return Ok(resultado);
    }

    // ===== Helpers =====

    private static string? ValidarInstrumento(string tipoTramite, string? instrumento)
    {
        if (tipoTramite == TipoConsultaExpediente)
            return null; // flujo de solo lectura — no exige instrumento

        if (string.IsNullOrWhiteSpace(instrumento))
            return "Selecciona el instrumento a tramitar.";

        if (tipoTramite == TipoGestionPensional && !InstrumentosPensional.Contains(instrumento))
            return "El instrumento seleccionado no corresponde a una gestión de pasivo pensional.";

        if (tipoTramite == TipoGestionLaboral && !InstrumentosLaboral.Contains(instrumento))
            return "El instrumento seleccionado no corresponde a una gestión de pasivo laboral.";

        return null;
    }

    private async Task<string?> ValidarSolicitudColpensionesAsync(int? solicitudColpensionesId)
    {
        if (!solicitudColpensionesId.HasValue)
            return null;

        var existe = await _context.Solicitudes
            .Include(s => s.Proyecto)
            .Include(s => s.TipoSolicitud)
            .AnyAsync(s => s.Id == solicitudColpensionesId.Value
                        && s.Proyecto != null && s.Proyecto.Nombre == "Colpensiones"
                        && s.TipoSolicitud != null && (s.TipoSolicitud.Nombre == "Pensión de vejez" || s.TipoSolicitud.Nombre == "Pensión de invalidez"));

        return existe ? null : "La solicitud de pensión de Colpensiones referenciada no existe.";
    }

    private async Task<(IActionResult? Error, Solicitud? Solicitud)> ObtenerSolicitudPasivosLaboralesAsync(int id)
    {
        var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
        var proyectosPermitidos = User.FindAll("proyecto")
            .Select(c => int.Parse(c.Value.Split(':')[0]))
            .ToList();

        var solicitud = await _context.Solicitudes
            .Include(s => s.Empresa)
            .Include(s => s.Proyecto)
            .Include(s => s.TipoSolicitud)
            .Include(s => s.UsuarioAsignado)
            .Include(s => s.InstrumentoPasivoLaboral!).ThenInclude(i => i.SolicitudColpensiones!).ThenInclude(sc => sc.Proyecto)
            .Include(s => s.InstrumentoPasivoLaboral!).ThenInclude(i => i.SolicitudColpensiones!).ThenInclude(sc => sc.Ciudadano)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (solicitud == null || solicitud.InstrumentoPasivoLaboral == null)
            return (NotFound(), null);

        if (!esAdminSyc && (solicitud.ProyectoId == null || !proyectosPermitidos.Contains(solicitud.ProyectoId.Value)))
            return (NotFound(), null);

        return (null, solicitud);
    }

    private static InstrumentoPasivoResponseDto ConstruirInstrumentoDto(Solicitud s)
    {
        var i = s.InstrumentoPasivoLaboral!;
        var numero = s.Proyecto != null ? $"{s.Proyecto.Codigo}-{s.Id:0000}" : s.Id.ToString();
        var solicitudColpensionesNumero = i.SolicitudColpensiones?.Proyecto != null
            ? $"{i.SolicitudColpensiones.Proyecto.Codigo}-{i.SolicitudColpensiones.Id:0000}"
            : null;

        return new InstrumentoPasivoResponseDto
        {
            SolicitudId = s.Id,
            Numero = numero,
            Estado = s.Estado,
            TipoSolicitudNombre = s.TipoSolicitud?.Nombre ?? string.Empty,
            EmpresaId = s.EmpresaId ?? 0,
            EmpresaRazonSocial = s.Empresa?.RazonSocial ?? string.Empty,
            EmpresaNit = s.Empresa?.Nit ?? string.Empty,
            Instrumento = i.Instrumento,
            ServidorNombre = i.ServidorNombre,
            ServidorDocumento = i.ServidorDocumento,
            RegimenPensional = i.RegimenPensional,
            TiempoLaboradoMeses = i.TiempoLaboradoMeses,
            TiempoTotalAportesMeses = i.TiempoTotalAportesMeses,
            ValorMesadaPensional = i.ValorMesadaPensional,
            Observaciones = i.Observaciones,
            SolicitudColpensionesId = i.SolicitudColpensionesId,
            SolicitudColpensionesNumero = solicitudColpensionesNumero,
            SolicitudColpensionesCiudadanoNombre = i.SolicitudColpensiones?.Ciudadano?.NombreCompleto,
            FechaCreacion = s.FechaCreacion,
        };
    }

    private static string PrefijoInstrumento(string? instrumento) => instrumento switch
    {
        "CuotaParte" => "CP",
        "BonoPensionalB" => "BPB",
        "BonoPensionalT" => "BPT",
        "CalculoActuarial" => "CA",
        "DemandaSentencia" => "DS",
        "CesantiasRetroactivas" => "CR",
        "SueldosRemanentes" => "SR",
        _ => "PL",
    };

    private static LiquidacionCuotaParteResponseDto ConstruirLiquidacionDto(Solicitud s)
    {
        var i = s.InstrumentoPasivoLaboral!;
        var numero = s.Proyecto != null ? $"{s.Proyecto.Codigo}-{s.Id:0000}" : s.Id.ToString();
        var referencia = $"{PrefijoInstrumento(i.Instrumento)}-{s.FechaCreacion.Year}-{s.Id:000000}";

        var dto = new LiquidacionCuotaParteResponseDto
        {
            SolicitudId = s.Id,
            Numero = numero,
            Referencia = referencia,
            Instrumento = i.Instrumento ?? string.Empty,
            EmpresaRazonSocial = s.Empresa?.RazonSocial ?? string.Empty,
            EmpresaNit = s.Empresa?.Nit ?? string.Empty,
            ServidorNombre = i.ServidorNombre,
            ServidorDocumento = i.ServidorDocumento,
            RegimenPensional = i.RegimenPensional,
            TiempoLaboradoMeses = i.TiempoLaboradoMeses,
            TiempoTotalAportesMeses = i.TiempoTotalAportesMeses,
            ValorMesadaPensional = i.ValorMesadaPensional,
            OperadorNombre = s.UsuarioAsignado?.NombreCompleto,
            FechaGeneracion = DateTime.UtcNow,
        };

        if (i.Instrumento != "CuotaParte")
        {
            dto.Soportado = false;
            dto.MotivoNoSoportado = "La liquidación automática de porcentaje de concurrencia solo aplica al instrumento Cuota parte pensional. Los demás instrumentos (bonos pensionales, cálculo actuarial, pasivo laboral) se gestionan por fuera de este cálculo.";
            return dto;
        }

        if (i.TiempoLaboradoMeses is null or <= 0 || i.TiempoTotalAportesMeses is null or <= 0 || i.ValorMesadaPensional is null or <= 0)
        {
            dto.Soportado = false;
            dto.MotivoNoSoportado = "Faltan datos para liquidar: tiempo laborado, tiempo total de aportes y valor de la mesada pensional deben estar diligenciados y ser mayores que cero.";
            return dto;
        }

        if (i.TiempoLaboradoMeses > i.TiempoTotalAportesMeses)
        {
            dto.Soportado = false;
            dto.MotivoNoSoportado = "El tiempo laborado en la entidad no puede ser mayor que el tiempo total de aportes del servidor.";
            return dto;
        }

        dto.Soportado = true;
        dto.PorcentajeConcurrencia = Math.Round((decimal)i.TiempoLaboradoMeses.Value / i.TiempoTotalAportesMeses.Value * 100m, 1);
        dto.ValorMensualACargo = Math.Round(i.ValorMesadaPensional.Value * i.TiempoLaboradoMeses.Value / i.TiempoTotalAportesMeses.Value, 0);
        return dto;
    }

    private static byte[] GenerarLiquidacionPdf(LiquidacionCuotaParteResponseDto dto, byte[] qrBytes)
    {
        string Meses(int? m) => m.HasValue ? $"{m.Value / 12} años, {m.Value % 12} meses ({m.Value} meses)" : "—";
        string Moneda(decimal? v) => v.HasValue ? v.Value.ToString("C0", new System.Globalization.CultureInfo("es-CO")) : "—";

        var documento = Document.Create(contenedor =>
        {
            contenedor.Page(pagina =>
            {
                pagina.Size(PageSizes.A4);
                pagina.Margin(0);
                pagina.DefaultTextStyle(x => x.FontSize(10));

                pagina.Header().Element(h => DisenoPdfSgds.Encabezado(h, "Pasivos Laborales · Cuota parte pensional", "Liquidación de cuota parte", dto.Referencia));

                pagina.Content().Padding(24).Column(col =>
                {
                    DisenoPdfSgds.SeccionTabla(col, "Entidad concurrente",
                        ("Razón social", dto.EmpresaRazonSocial),
                        ("NIT", dto.EmpresaNit));

                    DisenoPdfSgds.SeccionTabla(col, "Servidor / Pensionado",
                        ("Nombre", dto.ServidorNombre ?? "—"),
                        ("Documento", dto.ServidorDocumento ?? "—"),
                        ("Régimen pensional", dto.RegimenPensional ?? "—"));

                    if (!dto.Soportado)
                    {
                        col.Item().PaddingTop(10).Background("#fdeaea").Padding(8)
                            .Text(dto.MotivoNoSoportado ?? "Liquidación no soportada para este instrumento.").FontColor(Colors.Red.Medium).Bold();
                    }
                    else
                    {
                        DisenoPdfSgds.SeccionTabla(col, "Cálculo de la cuota parte",
                            ("Tiempo laborado en la entidad", Meses(dto.TiempoLaboradoMeses)),
                            ("Tiempo total de aportes", Meses(dto.TiempoTotalAportesMeses)),
                            ("Valor de la mesada pensional", Moneda(dto.ValorMesadaPensional)),
                            ("% de concurrencia", $"{dto.TiempoLaboradoMeses} / {dto.TiempoTotalAportesMeses} = {dto.PorcentajeConcurrencia:0.0}%"));

                        DisenoPdfSgds.ValorDestacado(col, "Valor mensual a cargo de la entidad", Moneda(dto.ValorMensualACargo));
                        col.Item().PaddingTop(6).Text("Pago mensual mientras subsista la pensión — se recalcula ante cambios en la mesada o novedades del régimen.")
                            .FontSize(8.5f).Italic().FontColor(DisenoPdfSgds.Ink600);
                    }

                    DisenoPdfSgds.BloqueQr(col, qrBytes, dto.Referencia);
                });

                pagina.Footer().PaddingHorizontal(24).PaddingBottom(16).Element(f => DisenoPdfSgds.PiePagina(f,
                    "Liquidación de referencia — sujeta a revisión por la entidad pensional concurrente."));
            });
        });

        return documento.GeneratePdf();
    }
}
