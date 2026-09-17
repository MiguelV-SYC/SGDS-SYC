using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SGDS.Api.Controllers;
using SGDS.Application.DTOs;
using SGDS.Application.Helpers;
using SGDS.Domain.Entities;

namespace SGDS.Api.Tests;

// La autorización de SGDS se hace a mano leyendo claims en cada controller (ver CLAUDE.md — no
// hay [Authorize(Roles=...)]). Es exactamente el patrón donde un desarrollador olvida el chequeo
// en un endpoint nuevo y queda un hueco: un operador con acceso a Comfenalco no debería poder
// leer, editar, cambiar de estado ni reasignar una solicitud de un proyecto donde no tiene claim,
// sin importar qué id le pases en la URL.
//
// Límite conocido de este archivo: como se prueba llamando al controller directo (sin pasar por
// el pipeline HTTP real), esto NO cubre "¿qué pasa si no mando token en absoluto?" — eso requiere
// un WebApplicationFactory con un HttpClient real, que es una capa más pesada. Ver nota al final.
public class AutorizacionCrossProyectoTests
{
    private static SolicitudesController NuevoController(SGDS.Infrastructure.Data.SgdsDbContext contexto) =>
        new(contexto, almacenamiento: null!, Options.Create(new ConfiguracionEstampillas()));

    private static async Task<(SGDS.Infrastructure.Data.SgdsDbContext Contexto, Proyecto ProyectoPropio, Solicitud SolicitudAjena)> SembrarSolicitudEnOtroProyecto()
    {
        var contexto = ControllerTestHelpers.NuevoContexto();
        var proyectoPropio = new Proyecto { Nombre = "Comfenalco", Codigo = "COMF" };
        var proyectoAjeno = new Proyecto { Nombre = "Infoconsumo", Codigo = "INFO" };
        var tipoAjeno = new TipoSolicitud { Nombre = "Movilización", Proyecto = proyectoAjeno };
        contexto.AddRange(proyectoPropio, proyectoAjeno, tipoAjeno);
        await contexto.SaveChangesAsync();

        var solicitudAjena = new Solicitud { ProyectoId = proyectoAjeno.Id, TipoSolicitudId = tipoAjeno.Id, Estado = "Radicada", UsuarioAsignadoId = 5 };
        contexto.Solicitudes.Add(solicitudAjena);
        await contexto.SaveChangesAsync();

        // El operador solo tiene claim del proyecto propio (Comfenalco) — nunca del ajeno
        // (Infoconsumo), sin importar que conozca el id real de la solicitud.
        return (contexto, proyectoPropio, solicitudAjena);
    }

    [Fact]
    public async Task GetSolicitud_DeOtroProyecto_DevuelveNotFound()
    {
        var (contexto, proyectoPropio, solicitudAjena) = await SembrarSolicitudEnOtroProyecto();
        using var _ = contexto;
        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 1, esAdminSyc: false, proyectosPermitidos: proyectoPropio.Id);

        var resultado = await controller.GetSolicitud(solicitudAjena.Id);

        Assert.IsType<NotFoundResult>(resultado);
    }

    [Fact]
    public async Task CambiarEstado_DeOtroProyecto_DevuelveNotFound_YNoModificaNada()
    {
        var (contexto, proyectoPropio, solicitudAjena) = await SembrarSolicitudEnOtroProyecto();
        using var _ = contexto;
        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 1, esAdminSyc: false, proyectosPermitidos: proyectoPropio.Id);

        var resultado = await controller.CambiarEstado(solicitudAjena.Id, new CambiarEstadoDto { NuevoEstado = "Aprobada" });

        Assert.IsType<NotFoundResult>(resultado);
        var solicitudSinTocar = await contexto.Solicitudes.FindAsync(solicitudAjena.Id);
        Assert.Equal("Radicada", solicitudSinTocar!.Estado); // sigue como se sembró, nadie la tocó
        Assert.Empty(contexto.HistorialEstados.Where(h => h.SolicitudId == solicitudAjena.Id));
    }

    [Fact]
    public async Task ActualizarSolicitud_DeOtroProyecto_DevuelveNotFound_YNoModificaNada()
    {
        var (contexto, proyectoPropio, solicitudAjena) = await SembrarSolicitudEnOtroProyecto();
        using var _ = contexto;
        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 1, esAdminSyc: false, proyectosPermitidos: proyectoPropio.Id);

        var resultado = await controller.ActualizarSolicitud(solicitudAjena.Id, new ActualizarSolicitudDto { DatosAdicionales = "{\"hackeado\":true}" });

        Assert.IsType<NotFoundResult>(resultado);
        var solicitudSinTocar = await contexto.Solicitudes.FindAsync(solicitudAjena.Id);
        Assert.Null(solicitudSinTocar!.DatosAdicionales);
    }

    [Fact]
    public async Task AsignarUsuario_LlamanteDeOtroProyecto_DevuelveNotFound()
    {
        var (contexto, proyectoPropio, solicitudAjena) = await SembrarSolicitudEnOtroProyecto();
        using var _ = contexto;
        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 1, esAdminSyc: false, proyectosPermitidos: proyectoPropio.Id);

        var resultado = await controller.AsignarUsuario(solicitudAjena.Id, new AsignarUsuarioDto { UsuarioId = 1 });

        Assert.IsType<NotFoundResult>(resultado);
    }

    [Fact]
    public async Task AsignarUsuario_ConAccesoAlProyecto_PeroDestinoFueraDelProyecto_DevuelveBadRequest()
    {
        // Este caso es distinto al anterior: el que llama SÍ pertenece al proyecto de la
        // solicitud (Comfenalco), pero intenta asignarla a un usuario que NO pertenece a ese
        // proyecto — el hueco real que se cerró esta sesión en AsignarUsuario.
        using var contexto = ControllerTestHelpers.NuevoContexto();
        var proyecto = new Proyecto { Nombre = "Comfenalco", Codigo = "COMF" };
        var tipo = new TipoSolicitud { Nombre = "Carné virtual", Proyecto = proyecto };
        contexto.AddRange(proyecto, tipo);
        await contexto.SaveChangesAsync();

        var solicitud = new Solicitud { ProyectoId = proyecto.Id, TipoSolicitudId = tipo.Id, Estado = "Radicada", UsuarioAsignadoId = 1 };
        var usuarioActivoSinProyecto = new Usuario { NombreCompleto = "Sin Acceso", Email = "sinacceso@test.com", PasswordHash = "x", Activo = true };
        contexto.AddRange(solicitud, usuarioActivoSinProyecto);
        await contexto.SaveChangesAsync();

        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 1, esAdminSyc: false, proyectosPermitidos: proyecto.Id);

        var resultado = await controller.AsignarUsuario(solicitud.Id, new AsignarUsuarioDto { UsuarioId = usuarioActivoSinProyecto.Id });

        var badRequest = Assert.IsType<BadRequestObjectResult>(resultado);
        var mensaje = (string)badRequest.Value!.GetType().GetProperty("mensaje")!.GetValue(badRequest.Value)!;
        Assert.Contains("no pertenece al proyecto", mensaje);
        Assert.Equal(1, (await contexto.Solicitudes.FindAsync(solicitud.Id))!.UsuarioAsignadoId); // sin cambios
    }

    [Fact]
    public async Task CrearSolicitud_SinAccesoAlProyecto_DevuelveBadRequest_YNoCreaNada()
    {
        using var contexto = ControllerTestHelpers.NuevoContexto();
        var proyectoPropio = new Proyecto { Nombre = "Comfenalco", Codigo = "COMF" };
        var proyectoAjeno = new Proyecto { Nombre = "Infoconsumo", Codigo = "INFO" };
        var tipoAjeno = new TipoSolicitud { Nombre = "Movilización", Proyecto = proyectoAjeno };
        var ciudadano = new Ciudadano { TipoDocumento = "CC", NumeroDocumento = "1", NombreCompleto = "Intruso" };
        contexto.AddRange(proyectoPropio, proyectoAjeno, tipoAjeno, ciudadano);
        await contexto.SaveChangesAsync();

        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 1, esAdminSyc: false, proyectosPermitidos: proyectoPropio.Id);

        var resultado = await controller.CrearSolicitud(new CrearSolicitudDto
        {
            CiudadanoId = ciudadano.Id,
            ProyectoId = proyectoAjeno.Id, // intenta radicar en un proyecto ajeno vía el body del request
            TipoSolicitudId = tipoAjeno.Id,
            DatosAdicionales = "{}",
        });

        Assert.IsType<BadRequestObjectResult>(resultado);
        Assert.Empty(contexto.Solicitudes);
    }

    [Fact]
    public async Task AdminSyc_SiPuedeAccederAUnaSolicitudDeCualquierProyecto()
    {
        // Control negativo del propio control negativo: si esto también fallara, el problema
        // sería del test, no de la regla (Admin SYC sí debe poder, por diseño).
        var (contexto, _, solicitudAjena) = await SembrarSolicitudEnOtroProyecto();
        using var _ = contexto;
        var controller = NuevoController(contexto);
        controller.AsignarUsuario(usuarioId: 99, esAdminSyc: true);

        var resultado = await controller.GetSolicitud(solicitudAjena.Id);

        Assert.IsType<OkObjectResult>(resultado);
    }
}

// Nota para el siguiente paso, si se quiere cerrar el hueco de cobertura mencionado arriba: para
// probar "sin token" o "token con firma inválida" hace falta un WebApplicationFactory<Program> +
// HttpClient real (golpea el pipeline HTTP completo, incluyendo el middleware de autenticación
// JWT) en vez de instanciar el controller a mano como se hace aquí.
