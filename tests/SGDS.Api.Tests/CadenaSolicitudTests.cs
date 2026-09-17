using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SGDS.Api.Controllers;
using SGDS.Application.DTOs;
using SGDS.Application.Helpers;
using SGDS.Domain.Entities;

namespace SGDS.Api.Tests;

// Regla central de la sesión donde se rediseñó el flujo GoTrace -> Infoconsumo -> SycTrace: una
// solicitud es un único caso de negocio y conserva el mismo Solicitud.Id durante todo su ciclo de
// vida. Vincular un lote de GoTrace a Infoconsumo debe AVANZAR la fila existente, no crear una
// solicitud nueva (ver InfoconsumoController.CrearSolicitud).
public class CadenaSolicitudTests
{
    private static InfoconsumoController NuevoController(SGDS.Infrastructure.Data.SgdsDbContext contexto) =>
        new(contexto,
            Options.Create(new ConfiguracionImpuestoConsumo()),
            almacenamiento: null!,
            enrutamiento: null!,
            geografia: null!);

    [Fact]
    public async Task VincularLoteGoTrace_AvanzaLaMismaSolicitud_NoCreaUnaNueva()
    {
        using var contexto = ControllerTestHelpers.NuevoContexto();

        var proyectoGoTrace = new Proyecto { Nombre = "Gotrace", Codigo = "GOTR" };
        var proyectoInfoconsumo = new Proyecto { Nombre = "Infoconsumo", Codigo = "INFO" };
        var tipoInfoconsumo = new TipoSolicitud { Nombre = "Movilización", Proyecto = proyectoInfoconsumo };
        var empresa = new Empresa { Nit = "900123456", RazonSocial = "Licorera de Santander" };
        contexto.AddRange(proyectoGoTrace, proyectoInfoconsumo, tipoInfoconsumo, empresa);
        await contexto.SaveChangesAsync();

        // El lote de GoTrace ya fue Aprobado — único requisito real de ValidarLoteGoTraceAsync
        // para poder heredarse hacia Infoconsumo.
        var loteGoTrace = new Solicitud
        {
            ProyectoId = proyectoGoTrace.Id,
            EmpresaId = empresa.Id,
            Estado = "Aprobada",
            UsuarioAsignadoId = 7,
        };
        contexto.Solicitudes.Add(loteGoTrace);
        await contexto.SaveChangesAsync();
        var idOriginal = loteGoTrace.Id;

        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 7, esAdminSyc: false, proyectosPermitidos: proyectoInfoconsumo.Id);

        var resultado = await controller.CrearSolicitud(new CrearSolicitudInfoconsumoDto
        {
            ProyectoId = proyectoInfoconsumo.Id,
            TipoSolicitudId = tipoInfoconsumo.Id,
            EmpresaId = empresa.Id,
            LoteGoTraceSolicitudId = idOriginal,
            CategoriaProducto = "Licores, Vinos, Aperitivos y Similares",
            SubcategoriaProducto = "Licores Destilados Nacionales",
            UnidadesFisicas = 100,
            PvpCertificado = 50_000,
            DepartamentoOrigen = "Santander",
            MunicipioOrigen = "Bucaramanga",
            DepartamentoDestino = "Cundinamarca",
            MunicipioDestino = "Bogotá D.C.",
            PlacaVehiculo = "ABC123",
        });

        var creada = Assert.IsType<CreatedAtActionResult>(resultado);
        var idDevuelto = (int)creada.Value!.GetType().GetProperty("Id")!.GetValue(creada.Value)!;

        // El Id devuelto por Infoconsumo debe ser EXACTAMENTE el mismo que el del lote de GoTrace.
        Assert.Equal(idOriginal, idDevuelto);
        Assert.Equal(1, await contexto.Solicitudes.CountAsync(s => true));

        var solicitud = await contexto.Solicitudes.FindAsync(idOriginal);
        Assert.Equal(proyectoInfoconsumo.Id, solicitud!.ProyectoId);
        Assert.Equal("Elaborada", solicitud.Estado);
        Assert.Equal(7, solicitud.UsuarioAsignadoId); // el dueño original del caso no cambia

        var historial = await contexto.HistorialEstados.Where(h => h.SolicitudId == idOriginal).ToListAsync();
        var ultimo = Assert.Single(historial);
        Assert.Equal("Aprobada", ultimo.EstadoAnterior);
        Assert.Equal("Elaborada", ultimo.EstadoNuevo);
    }

    [Fact]
    public async Task VincularLoteGoTrace_SiNoEstaAprobado_Rechaza()
    {
        using var contexto = ControllerTestHelpers.NuevoContexto();

        var proyectoGoTrace = new Proyecto { Nombre = "Gotrace", Codigo = "GOTR" };
        var proyectoInfoconsumo = new Proyecto { Nombre = "Infoconsumo", Codigo = "INFO" };
        var tipoInfoconsumo = new TipoSolicitud { Nombre = "Movilización", Proyecto = proyectoInfoconsumo };
        var empresa = new Empresa { Nit = "900123456", RazonSocial = "Licorera de Santander" };
        contexto.AddRange(proyectoGoTrace, proyectoInfoconsumo, tipoInfoconsumo, empresa);
        await contexto.SaveChangesAsync();

        var loteSinAprobar = new Solicitud { ProyectoId = proyectoGoTrace.Id, EmpresaId = empresa.Id, Estado = "Radicada" };
        contexto.Solicitudes.Add(loteSinAprobar);
        await contexto.SaveChangesAsync();

        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 7, esAdminSyc: false, proyectosPermitidos: proyectoInfoconsumo.Id);

        var resultado = await controller.CrearSolicitud(new CrearSolicitudInfoconsumoDto
        {
            ProyectoId = proyectoInfoconsumo.Id,
            TipoSolicitudId = tipoInfoconsumo.Id,
            EmpresaId = empresa.Id,
            LoteGoTraceSolicitudId = loteSinAprobar.Id,
            CategoriaProducto = "Licores, Vinos, Aperitivos y Similares",
            SubcategoriaProducto = "Licores Destilados Nacionales",
            UnidadesFisicas = 100,
            PvpCertificado = 50_000,
            DepartamentoOrigen = "Santander",
            MunicipioOrigen = "Bucaramanga",
            DepartamentoDestino = "Cundinamarca",
            MunicipioDestino = "Bogotá D.C.",
            PlacaVehiculo = "ABC123",
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(resultado);
        var mensaje = (string)badRequest.Value!.GetType().GetProperty("mensaje")!.GetValue(badRequest.Value)!;
        Assert.Contains("Aprobados", mensaje);
        Assert.Equal(1, await contexto.Solicitudes.CountAsync(s => true)); // no se creó nada
    }
}
