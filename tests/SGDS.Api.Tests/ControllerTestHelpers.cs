using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGDS.Infrastructure.Data;

namespace SGDS.Api.Tests;

// Mismos helpers que reutiliza cada prueba de integración: una BD en memoria aislada por prueba
// (nombre único por Guid) y un ClaimsPrincipal fabricado igual al que emite AuthController al
// hacer login — los controllers de SGDS.Api leen los claims a mano (ver CLAUDE.md), no con
// [Authorize(Roles=...)], así que probarlos significa simular exactamente esos claims.
public static class ControllerTestHelpers
{
    public static SgdsDbContext NuevoContexto()
    {
        var opciones = new DbContextOptionsBuilder<SgdsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new SgdsDbContext(opciones);
    }

    public static void AsignarUsuario(this ControllerBase controller, int usuarioId, bool esAdminSyc = false, bool esGerencial = false, params int[] proyectosPermitidos)
    {
        var claims = new List<Claim>
        {
            new("sub", usuarioId.ToString()),
            new("esAdminSyc", esAdminSyc ? "True" : "False"),
            new("esGerencial", esGerencial ? "True" : "False"),
        };
        claims.AddRange(proyectosPermitidos.Select(p => new Claim("proyecto", $"{p}:Operador")));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")),
            },
        };
    }
}
