using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SGDS.Domain.Entities;
using SGDS.Infrastructure.Data;

namespace SGDS.Api.Tests;

// Complementa AutorizacionCrossProyectoTests (que instancia el controller directo y por lo tanto
// nunca pasa por el middleware de autenticación). Aquí sí se golpea el pipeline HTTP completo de
// SGDS.Api, así que estas son las únicas pruebas del repo que responden: ¿qué pasa si no mando
// token? ¿Y si la firma no es válida? ¿Y si ya expiró?
public class AutenticacionHttpTests
{
    private static async Task<(Proyecto Proyecto, Solicitud Solicitud)> SembrarSolicitudAsync(SgdsWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var contexto = scope.ServiceProvider.GetRequiredService<SgdsDbContext>();

        var proyecto = new Proyecto { Nombre = "Comfenalco", Codigo = "COMF" };
        var tipo = new TipoSolicitud { Nombre = "Carné virtual", Proyecto = proyecto };
        contexto.AddRange(proyecto, tipo);
        await contexto.SaveChangesAsync();

        var solicitud = new Solicitud { ProyectoId = proyecto.Id, TipoSolicitudId = tipo.Id, Estado = "Radicada" };
        contexto.Solicitudes.Add(solicitud);
        await contexto.SaveChangesAsync();

        return (proyecto, solicitud);
    }

    [Fact]
    public async Task GetSolicitud_SinToken_Devuelve401()
    {
        await using var factory = new SgdsWebApplicationFactory();
        var (_, solicitud) = await SembrarSolicitudAsync(factory);
        using var client = factory.CreateClient();

        var respuesta = await client.GetAsync($"/api/Solicitudes/{solicitud.Id}");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task GetSolicitud_ConTokenFirmadoConOtraClave_Devuelve401()
    {
        await using var factory = new SgdsWebApplicationFactory();
        var (proyecto, solicitud) = await SembrarSolicitudAsync(factory);
        using var client = factory.CreateClient();

        var tokenFalso = TestJwt.Generar(usuarioId: 1, proyectosPermitidos: [proyecto.Id], claveDeFirma: "otra-clave-que-no-es-la-configurada-en-el-servidor");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenFalso);

        var respuesta = await client.GetAsync($"/api/Solicitudes/{solicitud.Id}");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task GetSolicitud_ConTokenExpirado_Devuelve401()
    {
        await using var factory = new SgdsWebApplicationFactory();
        var (proyecto, solicitud) = await SembrarSolicitudAsync(factory);
        using var client = factory.CreateClient();

        var tokenExpirado = TestJwt.Generar(usuarioId: 1, proyectosPermitidos: [proyecto.Id], expira: DateTime.UtcNow.AddMinutes(-5));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenExpirado);

        var respuesta = await client.GetAsync($"/api/Solicitudes/{solicitud.Id}");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task GetSolicitud_TokenValidoConAccesoAlProyecto_Devuelve200()
    {
        await using var factory = new SgdsWebApplicationFactory();
        var (proyecto, solicitud) = await SembrarSolicitudAsync(factory);
        using var client = factory.CreateClient();

        var token = TestJwt.Generar(usuarioId: 1, proyectosPermitidos: [proyecto.Id]);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var respuesta = await client.GetAsync($"/api/Solicitudes/{solicitud.Id}");

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
    }

    [Fact]
    public async Task GetSolicitud_TokenValidoSinAccesoAlProyecto_Devuelve404()
    {
        await using var factory = new SgdsWebApplicationFactory();
        var (proyecto, solicitud) = await SembrarSolicitudAsync(factory);
        using var client = factory.CreateClient();

        // Token válido y bien firmado, pero sin el claim "proyecto" de la solicitud pedida —
        // mismo caso que AutorizacionCrossProyectoTests, ahora confirmado de punta a punta por HTTP.
        var token = TestJwt.Generar(usuarioId: 1, proyectosPermitidos: [proyecto.Id + 999]);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var respuesta = await client.GetAsync($"/api/Solicitudes/{solicitud.Id}");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task CrearSolicitud_SinToken_Devuelve401_YNoCreaNada()
    {
        await using var factory = new SgdsWebApplicationFactory();
        using var client = factory.CreateClient();

        var respuesta = await client.PostAsJsonAsync("/api/Solicitudes", new { proyectoId = 1, tipoSolicitudId = 1, ciudadanoId = 1 });

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);

        using var scope = factory.Services.CreateScope();
        var contexto = scope.ServiceProvider.GetRequiredService<SgdsDbContext>();
        Assert.Empty(contexto.Solicitudes);
    }
}
