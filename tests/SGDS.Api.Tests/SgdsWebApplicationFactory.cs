using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SGDS.Infrastructure.Data;

namespace SGDS.Api.Tests;

// Levanta la app completa (pipeline HTTP real, incluido el middleware de autenticación JWT) para
// probar lo que las pruebas de controller-directo NO pueden ver: qué pasa sin token, con un
// token con firma inválida o expirado. Cada instancia usa su propia base en memoria (nombre
// único) — no comparte estado entre pruebas ni toca la base de datos real.
public class SgdsWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _nombreBaseDatos = Guid.NewGuid().ToString();

    public SgdsWebApplicationFactory()
    {
        // Program.cs lee builder.Configuration["Jwt:Key"] en una variable ANTES de builder.Build()
        // — las sobrescrituras que hace WebApplicationFactory vía ConfigureAppConfiguration solo
        // se aplican DURANTE Build(), así que llegan tarde para esa línea concreta. Las variables
        // de entorno sí se cargan desde el arranque de WebApplication.CreateBuilder, por eso se
        // usan aquí en vez de AddInMemoryCollection.
        Environment.SetEnvironmentVariable("Jwt__Key", TestJwt.Key);
        Environment.SetEnvironmentVariable("Jwt__Issuer", TestJwt.Issuer);
        Environment.SetEnvironmentVariable("Jwt__Audience", TestJwt.Audience);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // "Testing" evita que Program.cs corra Database.Migrate() (el proveedor en memoria no
        // soporta migraciones relacionales) — ver el guard agregado en Program.cs.
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // AddDbContext (Npgsql, en Program.cs) registra su configuración en varios
            // descriptores genéricos cerrados sobre SgdsDbContext, no solo en
            // DbContextOptions<SgdsDbContext> — quitar solo ese deja restos de Npgsql activos y
            // EF Core se queja de "dos proveedores registrados". Se quitan todos los que cierran
            // sobre SgdsDbContext antes de volver a registrar con el proveedor en memoria.
            var descriptoresDelContexto = services
                .Where(d => d.ServiceType == typeof(SgdsDbContext)
                         || (d.ServiceType.IsGenericType && d.ServiceType.GetGenericArguments().Contains(typeof(SgdsDbContext))))
                .ToList();
            foreach (var descriptor in descriptoresDelContexto) services.Remove(descriptor);

            services.AddDbContext<SgdsDbContext>(options => options.UseInMemoryDatabase(_nombreBaseDatos));
        });
    }
}
