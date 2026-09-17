namespace SGDS.Application.DTOs;

public class BeneficiarioCarneDto
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string NumeroDocumento { get; set; } = string.Empty;
    public string Parentesco { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
}

public class CarneVirtualResponseDto
{
    public int SolicitudId { get; set; }
    public string Numero { get; set; } = string.Empty;
    public string AfiliadoNombre { get; set; } = string.Empty;
    public string AfiliadoDocumento { get; set; } = string.Empty;
    public string EstadoAfiliacion { get; set; } = string.Empty;
    public decimal IngresosMensuales { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public List<BeneficiarioCarneDto> GrupoFamiliar { get; set; } = new();
    public DateTime FechaExpedicion { get; set; }
}
