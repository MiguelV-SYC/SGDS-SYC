using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SGDS.Api.Controllers;
using SGDS.Application.DTOs;
using SGDS.Application.Helpers;
using SGDS.Domain.Entities;

namespace SGDS.Api.Tests;

// Regla: un operador puro ya no navega la bandeja completa del proyecto — solo ve sus propios
// casos asignados. Admin SYC y Gerencial conservan visibilidad total (ver GetListadoSolicitudes).
public class ListadoRestringidoTests
{
    private static SolicitudesController NuevoController(SGDS.Infrastructure.Data.SgdsDbContext contexto) =>
        new(contexto, almacenamiento: null!, Options.Create(new ConfiguracionEstampillas()));

    private static async Task<(SGDS.Infrastructure.Data.SgdsDbContext Contexto, Proyecto Proyecto, Solicitud DeOperador1, Solicitud DeOperador2)> SembrarDosSolicitudes()
    {
        var contexto = ControllerTestHelpers.NuevoContexto();
        var proyecto = new Proyecto { Nombre = "Comfenalco", Codigo = "COMF" };
        var tipo = new TipoSolicitud { Nombre = "Carné virtual", Proyecto = proyecto };
        contexto.AddRange(proyecto, tipo);
        await contexto.SaveChangesAsync();

        var deOperador1 = new Solicitud { ProyectoId = proyecto.Id, TipoSolicitudId = tipo.Id, Estado = "Radicada", UsuarioAsignadoId = 1 };
        var deOperador2 = new Solicitud { ProyectoId = proyecto.Id, TipoSolicitudId = tipo.Id, Estado = "Radicada", UsuarioAsignadoId = 2 };
        contexto.Solicitudes.AddRange(deOperador1, deOperador2);
        await contexto.SaveChangesAsync();

        return (contexto, proyecto, deOperador1, deOperador2);
    }

    private static List<SolicitudResponseDto> ExtraerDatos(IActionResult resultado)
    {
        var ok = Assert.IsType<OkObjectResult>(resultado);
        var dto = Assert.IsType<ListadoSolicitudesResponseDto>(ok.Value);
        return dto.Pagina.Datos;
    }

    [Fact]
    public async Task Operador_SoloVeSusPropiasSolicitudes()
    {
        var (contexto, proyecto, deOperador1, deOperador2) = await SembrarDosSolicitudes();
        using var _ = contexto;

        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 1, esAdminSyc: false, proyectosPermitidos: proyecto.Id);

        var datos = ExtraerDatos(await controller.GetListadoSolicitudes(proyecto.Id, null, null, null, 1, 20));

        var id = Assert.Single(datos).Id;
        Assert.Equal(deOperador1.Id, id);
        Assert.DoesNotContain(datos, s => s.Id == deOperador2.Id);
    }

    [Fact]
    public async Task AdminSyc_VeTodasLasSolicitudesDelProyecto()
    {
        var (contexto, proyecto, deOperador1, deOperador2) = await SembrarDosSolicitudes();
        using var _ = contexto;

        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 99, esAdminSyc: true);

        var datos = ExtraerDatos(await controller.GetListadoSolicitudes(proyecto.Id, null, null, null, 1, 20));

        Assert.Equal(2, datos.Count);
        Assert.Contains(datos, s => s.Id == deOperador1.Id);
        Assert.Contains(datos, s => s.Id == deOperador2.Id);
    }
}
