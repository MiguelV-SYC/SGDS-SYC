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
public class GoTraceController : ControllerBase
{
    private readonly SgdsDbContext _context;

    // Cadena de custodia fija (RN-GT03) — mismo orden que el mockup del certificado.
    private static readonly string[] PuntosControlDisponibles = { "Fábrica", "Bodega", "Distribuidor", "Punto de venta" };

    public GoTraceController(SgdsDbContext context)
    {
        _context = context;
    }

    // ===== Creación y edición =====

    // POST: api/GoTrace/solicitudes
    [HttpPost("solicitudes")]
    public async Task<IActionResult> CrearSolicitud(CrearSolicitudGoTraceDto dto)
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
            return BadRequest(new { mensaje = "La empresa productora no existe." });

        var tipo = await _context.TiposSolicitudes.FindAsync(dto.TipoSolicitudId);
        if (tipo == null)
            return BadRequest(new { mensaje = "El tipo de solicitud no es válido." });

        var producto = await _context.Productos.FirstOrDefaultAsync(p => p.Id == dto.ProductoId && p.EmpresaId == dto.EmpresaId);
        if (producto == null)
            return BadRequest(new { mensaje = "El producto no existe en el catálogo de la empresa." });

        var errorLote = ValidarDatosLote(dto.UnidadesLote);
        if (errorLote != null) return BadRequest(new { mensaje = errorLote });

        var fechaUtc = DateTime.SpecifyKind(dto.FechaProduccion, DateTimeKind.Utc);
        var numeroLote = await GenerarNumeroLoteAsync(producto, fechaUtc);
        var (prefijoUid, cantidadUids, uidInicial, uidFinal) = ComponerUidsAutomaticos(dto.ModoGeneracionUid, producto, fechaUtc, dto.UnidadesLote);

        var nuevaSolicitud = new Solicitud
        {
            EmpresaId = dto.EmpresaId,
            ProyectoId = dto.ProyectoId,
            TipoSolicitudId = dto.TipoSolicitudId,
            Estado = "Radicada",
            FechaCreacion = DateTime.UtcNow,
            UsuarioAsignadoId = esAdminSyc ? null : int.Parse(User.FindFirst("sub")!.Value),
            LoteGoTrace = new LoteGoTrace
            {
                Producto = producto.Nombre,
                ProductoCatalogoId = producto.Id,
                NumeroLote = numeroLote,
                FechaProduccion = fechaUtc,
                UnidadesLote = dto.UnidadesLote,
                ModoGeneracionUid = dto.ModoGeneracionUid,
                PrefijoUid = prefijoUid,
                CantidadUids = cantidadUids,
                UidInicial = uidInicial,
                UidFinal = uidFinal,
                PuntosControl = ConstruirPuntosControl(dto.PuntosControlHabilitados),
            },
        };

        _context.Solicitudes.Add(nuevaSolicitud);
        await _context.SaveChangesAsync();

        _context.HistorialEstados.Add(new HistorialEstado
        {
            SolicitudId = nuevaSolicitud.Id,
            EstadoAnterior = null,
            EstadoNuevo = "Radicada",
            FechaCambio = DateTime.UtcNow,
        });
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCertificado), new { id = nuevaSolicitud.Id }, new { nuevaSolicitud.Id });
    }

    // PUT: api/GoTrace/solicitudes/5
    [HttpPut("solicitudes/{id}")]
    public async Task<IActionResult> ActualizarSolicitud(int id, ActualizarSolicitudGoTraceDto dto)
    {
        var (error, solicitud) = await ObtenerSolicitudGoTraceAsync(id);
        if (error != null) return error;

        var producto = await _context.Productos.FirstOrDefaultAsync(p => p.Id == dto.ProductoId && p.EmpresaId == solicitud!.EmpresaId);
        if (producto == null)
            return BadRequest(new { mensaje = "El producto no existe en el catálogo de la empresa." });

        var errorLote = ValidarDatosLote(dto.UnidadesLote);
        if (errorLote != null) return BadRequest(new { mensaje = errorLote });

        var lote = solicitud!.LoteGoTrace!;
        var fechaUtc = DateTime.SpecifyKind(dto.FechaProduccion, DateTimeKind.Utc);
        // El número de lote se asigna una sola vez al radicar y no se recalcula al editar —
        // ya pudo haberse impreso en etiquetas/documentos físicos.
        lote.Producto = producto.Nombre;
        lote.ProductoCatalogoId = producto.Id;
        lote.FechaProduccion = fechaUtc;
        lote.UnidadesLote = dto.UnidadesLote;

        if (lote.ModoGeneracionUid != dto.ModoGeneracionUid)
        {
            var (prefijoUid, cantidadUids, uidInicial, uidFinal) = ComponerUidsAutomaticos(dto.ModoGeneracionUid, producto, fechaUtc, dto.UnidadesLote);
            lote.ModoGeneracionUid = dto.ModoGeneracionUid;
            lote.PrefijoUid = prefijoUid;
            lote.CantidadUids = cantidadUids;
            lote.UidInicial = uidInicial;
            lote.UidFinal = uidFinal;
        }
        else if (dto.ModoGeneracionUid == "Automatico")
        {
            // Las unidades del lote pudieron cambiar — recomponer solo la cantidad/rango.
            lote.CantidadUids = dto.UnidadesLote;
            lote.UidFinal = CalcularUidFinal(lote.CantidadUids, lote.UidInicial);
        }

        foreach (var punto in lote.PuntosControl)
            punto.Habilitado = dto.PuntosControlHabilitados.Contains(punto.Nombre);

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/GoTrace/siguiente-numero-lote?productoId=5&fecha=2026-09-02
    [HttpGet("siguiente-numero-lote")]
    public async Task<IActionResult> GetSiguienteNumeroLote([FromQuery] int productoId, [FromQuery] DateTime fecha)
    {
        var producto = await _context.Productos.FindAsync(productoId);
        if (producto == null) return NotFound(new { mensaje = "El producto no existe." });

        var numeroLote = await GenerarNumeroLoteAsync(producto, DateTime.SpecifyKind(fecha, DateTimeKind.Utc));
        return Ok(new SiguienteNumeroLoteResponseDto { NumeroLote = numeroLote });
    }

    // ===== Cadena de custodia =====

    // PUT: api/GoTrace/solicitudes/5/puntos-control/8/confirmar
    [HttpPut("solicitudes/{id}/puntos-control/{puntoId}/confirmar")]
    public async Task<IActionResult> ConfirmarPuntoControl(int id, int puntoId)
    {
        var (error, solicitud) = await ObtenerSolicitudGoTraceAsync(id);
        if (error != null) return error;

        var punto = solicitud!.LoteGoTrace!.PuntosControl.FirstOrDefault(p => p.Id == puntoId);
        if (punto == null)
            return NotFound(new { mensaje = "El punto de control no existe para esta solicitud." });

        if (!punto.Habilitado)
            return BadRequest(new { mensaje = $"\"{punto.Nombre}\" no está habilitado en la cadena de custodia de este lote." });

        if (punto.Confirmado)
            return BadRequest(new { mensaje = $"\"{punto.Nombre}\" ya estaba confirmado." });

        punto.Confirmado = true;
        punto.FechaConfirmacion = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ===== Certificado de trazabilidad =====

    // GET: api/GoTrace/solicitudes/5/certificado
    [HttpGet("solicitudes/{id}/certificado")]
    public async Task<IActionResult> GetCertificado(int id)
    {
        var (error, solicitud) = await ObtenerSolicitudGoTraceAsync(id);
        return error ?? Ok(ConstruirCertificadoDto(solicitud!));
    }

    // GET: api/GoTrace/solicitudes/5/certificado-pdf
    [HttpGet("solicitudes/{id}/certificado-pdf")]
    public async Task<IActionResult> GetCertificadoPdf(int id)
    {
        var (error, solicitud) = await ObtenerSolicitudGoTraceAsync(id);
        if (error != null) return error;

        var dto = ConstruirCertificadoDto(solicitud!);
        var qrBytes = DisenoPdfSgds.GenerarQrPng(ContenidoQr(dto));
        var pdfBytes = GenerarCertificadoPdf(dto, qrBytes);
        return File(pdfBytes, "application/pdf", $"Certificado_Trazabilidad_{dto.NumeroLote}.pdf");
    }

    // GET: api/GoTrace/solicitudes/5/certificado-qr.png
    [HttpGet("solicitudes/{id}/certificado-qr.png")]
    public async Task<IActionResult> GetCertificadoQr(int id)
    {
        var (error, solicitud) = await ObtenerSolicitudGoTraceAsync(id);
        if (error != null) return error;

        var dto = ConstruirCertificadoDto(solicitud!);
        var qrBytes = DisenoPdfSgds.GenerarQrPng(ContenidoQr(dto));
        return File(qrBytes, "image/png");
    }

    // ===== Helpers =====

    private static string? ValidarDatosLote(int unidades)
    {
        if (unidades <= 0) return "Las unidades del lote deben ser mayores que cero.";
        return null;
    }

    private static int? CalcularUidFinal(int? cantidad, int? inicial) =>
        cantidad.HasValue && inicial.HasValue ? inicial.Value + cantidad.Value - 1 : null;

    // GT + Producto (abreviado) + fecha + consecutivo (Reglas_de_negocio_GoTrace.md, "Nueva
    // Solicitud" -> "Número de Lote"). El consecutivo cuenta los lotes ya radicados del mismo
    // producto en la misma fecha de producción — riesgo de colisión mínimo en el volumen de
    // un piloto, mismo tipo de compromiso que la numeración de Solicitud ({Codigo}-{Id:0000}).
    private async Task<string> GenerarNumeroLoteAsync(Producto producto, DateTime fechaProduccionUtc)
    {
        var consecutivo = await _context.LotesGoTrace
            .CountAsync(l => l.ProductoCatalogoId == producto.Id && l.FechaProduccion.Date == fechaProduccionUtc.Date);
        return $"GT-{AbreviarProducto(producto.Nombre)}-{fechaProduccionUtc:yyyyMMdd}-{consecutivo + 1:000}";
    }

    private static string AbreviarProducto(string nombre)
    {
        var soloLetrasYNumeros = new string(nombre.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        return soloLetrasYNumeros.Length > 6 ? soloLetrasYNumeros[..6] : soloLetrasYNumeros;
    }

    // Automatico: compone el rango de UIDs con el mismo esquema GT+Producto+fecha del número
    // de lote (RN-GT01) — un identificador por unidad producida. Archivo: los UIDs reales los
    // asigna el hardware de fábrica fuera de este piloto (ver comentario en LoteGoTrace), así
    // que solo se deja constancia de la cantidad esperada, sin modelar un rango.
    private static (string? Prefijo, int? Cantidad, int? Inicial, int? Final) ComponerUidsAutomaticos(
        string modo, Producto producto, DateTime fechaProduccionUtc, int unidadesLote)
    {
        if (modo != "Automatico") return (null, unidadesLote, null, null);

        var prefijo = $"GT-{AbreviarProducto(producto.Nombre)}-{fechaProduccionUtc:yyyyMMdd}";
        return (prefijo, unidadesLote, 1, CalcularUidFinal(unidadesLote, 1));
    }

    private static List<PuntoControlGoTrace> ConstruirPuntosControl(List<string> habilitados) =>
        PuntosControlDisponibles.Select((nombre, i) => new PuntoControlGoTrace
        {
            Nombre = nombre,
            Orden = i + 1,
            Habilitado = habilitados.Contains(nombre),
        }).ToList();

    private async Task<(IActionResult? Error, Solicitud? Solicitud)> ObtenerSolicitudGoTraceAsync(int id)
    {
        var esAdminSyc = User.FindFirst("esAdminSyc")?.Value == "True";
        var proyectosPermitidos = User.FindAll("proyecto")
            .Select(c => int.Parse(c.Value.Split(':')[0]))
            .ToList();

        var solicitud = await _context.Solicitudes
            .Include(s => s.Empresa)
            .Include(s => s.Proyecto)
            .Include(s => s.LoteGoTrace!).ThenInclude(l => l.PuntosControl)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (solicitud == null || solicitud.LoteGoTrace == null)
            return (NotFound(), null);

        if (!esAdminSyc && (solicitud.ProyectoId == null || !proyectosPermitidos.Contains(solicitud.ProyectoId.Value)))
            return (NotFound(), null);

        return (null, solicitud);
    }

    private static string ContenidoQr(CertificadoTrazabilidadResponseDto dto) =>
        $"SGDS-GOTRACE|{dto.Numero}|Lote:{dto.NumeroLote}|{dto.TotalPuntosConfirmados}/{dto.TotalPuntosHabilitados} puntos confirmados";

    private static CertificadoTrazabilidadResponseDto ConstruirCertificadoDto(Solicitud s)
    {
        var l = s.LoteGoTrace!;
        var numero = s.Proyecto != null ? $"{s.Proyecto.Codigo}-{s.Id:0000}" : s.Id.ToString();
        var puntos = l.PuntosControl.OrderBy(p => p.Orden)
            .Select(p => new PuntoControlResponseDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Orden = p.Orden,
                Habilitado = p.Habilitado,
                Confirmado = p.Confirmado,
                FechaConfirmacion = p.FechaConfirmacion,
            })
            .ToList();

        var habilitados = puntos.Where(p => p.Habilitado).ToList();
        var fechasConfirmacion = habilitados.Where(p => p.FechaConfirmacion.HasValue).Select(p => p.FechaConfirmacion!.Value).ToList();

        return new CertificadoTrazabilidadResponseDto
        {
            SolicitudId = s.Id,
            Numero = numero,
            Estado = s.Estado,
            EmpresaId = s.EmpresaId ?? 0,
            EmpresaRazonSocial = s.Empresa?.RazonSocial ?? string.Empty,
            EmpresaNit = s.Empresa?.Nit ?? string.Empty,
            Producto = l.Producto,
            ProductoCatalogoId = l.ProductoCatalogoId,
            NumeroLote = l.NumeroLote,
            FechaProduccion = l.FechaProduccion,
            UnidadesLote = l.UnidadesLote,
            // Lotes radicados antes de este campo existir quedaron con el valor vacío por
            // defecto de la migración — se muestran como "Automatico" (comportamiento real que
            // tenían: rango numérico simple, sin modo explícito).
            ModoGeneracionUid = string.IsNullOrEmpty(l.ModoGeneracionUid) ? "Automatico" : l.ModoGeneracionUid,
            PrefijoUid = l.PrefijoUid,
            CantidadUids = l.CantidadUids,
            UidInicial = l.UidInicial,
            UidFinal = l.UidFinal,
            RangoUidCompleto = l.PrefijoUid != null && l.UidInicial.HasValue && l.UidFinal.HasValue
                ? $"{l.PrefijoUid}-{l.UidInicial:00000} a {l.PrefijoUid}-{l.UidFinal:00000}"
                : null,
            PuntosControl = puntos,
            TotalPuntosHabilitados = habilitados.Count,
            TotalPuntosConfirmados = habilitados.Count(p => p.Confirmado),
            UltimaActualizacion = fechasConfirmacion.Count > 0 ? fechasConfirmacion.Max() : (DateTime?)null,
            FechaCreacion = s.FechaCreacion,
        };
    }

    private static byte[] GenerarCertificadoPdf(CertificadoTrazabilidadResponseDto dto, byte[] qrBytes)
    {
        var documento = Document.Create(contenedor =>
        {
            contenedor.Page(pagina =>
            {
                pagina.Size(PageSizes.A4);
                pagina.Margin(0);
                pagina.DefaultTextStyle(x => x.FontSize(10));

                pagina.Header().Element(h => DisenoPdfSgds.Encabezado(h, "GoTrace · Trazabilidad logística", "Certificado de trazabilidad", dto.NumeroLote));

                pagina.Content().Padding(24).Column(col =>
                {
                    var filasProducto = new List<(string, string)>
                    {
                        ("Producto", dto.Producto),
                        ("Unidades del lote", $"{dto.UnidadesLote:N0} botellas"),
                        ("Fecha de producción", dto.FechaProduccion.ToString("dd/MM/yyyy")),
                    };
                    if (dto.RangoUidCompleto != null)
                        filasProducto.Add(("Rango de UIDs", dto.RangoUidCompleto));
                    else if (dto.ModoGeneracionUid == "Archivo")
                        filasProducto.Add(("Identificadores", "Cargados por archivo desde fábrica"));
                    DisenoPdfSgds.SeccionTabla(col, "Producto", filasProducto.ToArray());

                    DisenoPdfSgds.SeccionTabla(col, "Empresa productora",
                        ("Razón social", dto.EmpresaRazonSocial),
                        ("NIT", dto.EmpresaNit));

                    col.Item().PaddingTop(12).Text("Cadena de custodia").FontSize(10.5f).Bold().FontColor(DisenoPdfSgds.Blue600);
                    col.Item().PaddingTop(4).Table(t =>
                    {
                        t.ColumnsDefinition(c => { c.RelativeColumn(3); c.RelativeColumn(2); c.RelativeColumn(2); });
                        DisenoPdfSgds.TablaEncabezado(t, "Punto de control", "Estado", "Fecha");
                        var habilitados = dto.PuntosControl.Where(p => p.Habilitado).ToList();
                        for (var i = 0; i < habilitados.Count; i++)
                        {
                            var p = habilitados[i];
                            var fondo = i % 2 == 0 ? "#FFFFFF" : DisenoPdfSgds.Paper;
                            t.Cell().Background(fondo).BorderBottom(0.5f).BorderColor(DisenoPdfSgds.Line).Padding(6).Text(p.Nombre).FontSize(9);
                            t.Cell().Background(fondo).BorderBottom(0.5f).BorderColor(DisenoPdfSgds.Line).Padding(6)
                                .Text(p.Confirmado ? "Confirmado" : "Pendiente").FontSize(9).Bold()
                                .FontColor(p.Confirmado ? "#16a34a" : DisenoPdfSgds.Ink400);
                            t.Cell().Background(fondo).BorderBottom(0.5f).BorderColor(DisenoPdfSgds.Line).Padding(6)
                                .Text(p.FechaConfirmacion.HasValue ? p.FechaConfirmacion.Value.ToString("dd/MM/yyyy HH:mm") : "—").FontSize(9).FontColor(DisenoPdfSgds.Ink600);
                        }
                    });

                    col.Item().PaddingTop(8).Text($"{dto.TotalPuntosConfirmados} de {dto.TotalPuntosHabilitados} puntos de control confirmados.")
                        .FontSize(9).Italic().FontColor(DisenoPdfSgds.Ink600);

                    DisenoPdfSgds.BloqueQr(col, qrBytes, dto.Numero);
                });

                pagina.Footer().PaddingHorizontal(24).PaddingBottom(16).Element(f => DisenoPdfSgds.PiePagina(f,
                    "Certificado de la empresa productora — distinto de la estampilla oficial que expide SYCTrace para el control departamental del impuesto al consumo."));
            });
        });

        return documento.GeneratePdf();
    }
}
