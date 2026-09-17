using Microsoft.EntityFrameworkCore;
using SGDS.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Text;
using SGDS.Application.Interfaces;
using SGDS.Application.Helpers;
using SGDS.Infrastructure.Services;
using QuestPDF.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddControllers();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Ingresa el token JWT así: Bearer {tu token}"
    });

    options.AddSecurityRequirement(document => new()
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});

builder.Services.AddDbContext<SgdsDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("SgdsConnection"))
           .UseSnakeCaseNamingConvention());

builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();

//acá se trabaja JWT
var jwtKey = builder.Configuration["Jwt:Key"]!;
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.Configure<ConfiguracionEstampillas>(builder.Configuration.GetSection("Estampillas"));
builder.Services.Configure<ConfiguracionImpuestoConsumo>(builder.Configuration.GetSection("ImpuestoConsumo"));
builder.Services.Configure<ConfiguracionBaseGravableVehiculo>(builder.Configuration.GetSection("BaseGravableVehiculo"));

//adición de esta variable para enrutamiento para el almacenamiento de documentos.
var rutaAlmacenamiento = Path.Combine(builder.Environment.ContentRootPath, "Almacenamiento");
builder.Services.AddSingleton<IAlmacenamientoService>(new AlmacenamientoLocalService(rutaAlmacenamiento));

// SGDS Intelligence — proveedor de IA. Hoy Groq (capa gratuita, límites más predecibles que
// Gemini) mientras no haya créditos de Anthropic; para cambiar de proveedor, esta es la única
// línea a tocar — ningún otro archivo depende del proveedor concreto (RNF-IA-05).
builder.Services.AddScoped<IIAService, GroqAIService>();

// Distancia real por carretera (Infoconsumo — tornaguías). Servidor demo público de OSRM.
builder.Services.AddScoped<IServicioEnrutamiento, OsrmServicioEnrutamiento>();

// Municipios de Colombia con coordenadas reales (dataset DIVIPOLA-DANE, ver Assets/geo) —
// dato estático, se carga una sola vez en memoria (Singleton).
var rutaMunicipios = Path.Combine(builder.Environment.ContentRootPath, "Assets", "geo", "municipios-colombia.json");
builder.Services.AddSingleton<IServicioGeografia>(new GeografiaService(rutaMunicipios));

// Geocodificación de direcciones libres en vivo (Nominatim/OSM, servidor demo público).
builder.Services.AddScoped<IServicioGeocodificacion, NominatimServicioGeocodificacion>();

QuestPDF.Settings.License = LicenseType.Community;

var app = builder.Build();

// Aplica automáticamente cualquier migración pendiente de EF Core al arrancar la API — salvo en
// pruebas de integración HTTP (WebApplicationFactory, entorno "Testing"), donde el DbContext se
// reemplaza por un proveedor en memoria que no soporta migraciones relacionales.
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<SgdsDbContext>().Database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI (options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "SGDS API v1");   
    });
}



app.UseHttpsRedirection();
app.UseAuthentication();
app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();
app.Run();

// Necesario para que WebApplicationFactory<Program> (pruebas de integración HTTP) pueda
// referenciar este ensamblado — el Program autogenerado por top-level statements es internal.
public partial class Program { }
