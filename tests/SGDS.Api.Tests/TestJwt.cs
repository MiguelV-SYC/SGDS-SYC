using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace SGDS.Api.Tests;

// Clave de firma exclusiva para las pruebas HTTP (SgdsWebApplicationFactory la inyecta como
// Jwt:Key del entorno "Testing") — nunca la clave real de desarrollo, para no acoplar estas
// pruebas a un secreto que vive fuera del repo.
public static class TestJwt
{
    public const string Key = "PruebaDeIntegracionHttp-ClaveDeFirmaSoloParaTests-NoUsarEnProduccion";
    public const string Issuer = "SGDS.Api";
    public const string Audience = "SGDS.Frontend";

    public static string Generar(
        int usuarioId, bool esAdminSyc = false, bool esGerencial = false,
        int[]? proyectosPermitidos = null, DateTime? expira = null, string? claveDeFirma = null)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuarioId.ToString()),
            new("esAdminSyc", esAdminSyc.ToString()),
            new("esGerencial", esGerencial.ToString()),
        };
        claims.AddRange((proyectosPermitidos ?? []).Select(p => new Claim("proyecto", $"{p}:Operador")));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(claveDeFirma ?? Key));
        var credenciales = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            Issuer, Audience, claims,
            expires: expira ?? DateTime.UtcNow.AddHours(1),
            signingCredentials: credenciales);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
