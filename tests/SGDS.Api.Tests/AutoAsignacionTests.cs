using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SGDS.Api.Controllers;
using SGDS.Application.DTOs;
using SGDS.Application.Helpers;
using SGDS.Domain.Entities;

namespace SGDS.Api.Tests;

// Regla: el operador que radica una solicitud queda dueño del caso de una vez — ya no existe un
// paso aparte de "Tomar caso" (ver el análisis de la sesión donde se eliminó la bandeja global).
public class AutoAsignacionTests
{
    private static SolicitudesController NuevoController(SGDS.Infrastructure.Data.SgdsDbContext contexto) =>
        new(contexto, almacenamiento: null!, Options.Create(new ConfiguracionEstampillas()));

    [Fact]
    public async Task CrearSolicitud_ComoOperador_QuedaAutoAsignadaAlMismoOperador()
    {
        using var contexto = ControllerTestHelpers.NuevoContexto();
        var proyecto = new Proyecto { Nombre = "Comfenalco", Codigo = "COMF" };
        var tipo = new TipoSolicitud { Nombre = "Carné virtual", Proyecto = proyecto };
        var ciudadano = new Ciudadano { TipoDocumento = "CC", NumeroDocumento = "123", NombreCompleto = "Ana Pérez" };
        contexto.AddRange(proyecto, tipo, ciudadano);
        await contexto.SaveChangesAsync();

        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 42, esAdminSyc: false, proyectosPermitidos: proyecto.Id);

        var resultado = await controller.CrearSolicitud(new CrearSolicitudDto
        {
            CiudadanoId = ciudadano.Id,
            ProyectoId = proyecto.Id,
            TipoSolicitudId = tipo.Id,
            DatosAdicionales = "{}",
        });

        var creada = Assert.IsType<CreatedAtActionResult>(resultado);
        var id = (int)creada.Value!.GetType().GetProperty("Id")!.GetValue(creada.Value)!;

        var solicitud = await contexto.Solicitudes.FindAsync(id);
        Assert.Equal(42, solicitud!.UsuarioAsignadoId);
    }

    [Fact]
    public async Task CrearSolicitud_ComoAdminSyc_QuedaSinAsignar()
    {
        using var contexto = ControllerTestHelpers.NuevoContexto();
        var proyecto = new Proyecto { Nombre = "Comfenalco", Codigo = "COMF" };
        var tipo = new TipoSolicitud { Nombre = "Carné virtual", Proyecto = proyecto };
        var ciudadano = new Ciudadano { TipoDocumento = "CC", NumeroDocumento = "123", NombreCompleto = "Ana Pérez" };
        contexto.AddRange(proyecto, tipo, ciudadano);
        await contexto.SaveChangesAsync();

        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 1, esAdminSyc: true);

        var resultado = await controller.CrearSolicitud(new CrearSolicitudDto
        {
            CiudadanoId = ciudadano.Id,
            ProyectoId = proyecto.Id,
            TipoSolicitudId = tipo.Id,
            DatosAdicionales = "{}",
        });

        var creada = Assert.IsType<CreatedAtActionResult>(resultado);
        var id = (int)creada.Value!.GetType().GetProperty("Id")!.GetValue(creada.Value)!;

        var solicitud = await contexto.Solicitudes.FindAsync(id);
        Assert.Null(solicitud!.UsuarioAsignadoId);
    }
}
