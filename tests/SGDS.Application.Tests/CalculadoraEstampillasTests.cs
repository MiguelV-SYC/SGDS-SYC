using SGDS.Application.Helpers;

namespace SGDS.Application.Tests;

public class CalculadoraEstampillasTests
{
    private static CalculadoraEstampillas.Entrada Entrada(
        decimal valorContratoBruto, string tipoEntidad, string tipoContrato,
        string regimen = CalculadoraEstampillas.RegimenDeclaranteRenta,
        string fuente = CalculadoraEstampillas.FuenteRecursosPropios,
        string municipio = "Bucaramanga") =>
        new(valorContratoBruto, IncluyeIva: false, TarifaIva: 0, tipoEntidad, regimen, tipoContrato, fuente, municipio);

    [Fact]
    public void Validar_ValorNegativo_Lanza() =>
        Assert.Throws<ArgumentException>(() => CalculadoraEstampillas.Validar(Entrada(-1, CalculadoraEstampillas.TipoEntidadGobernacion, CalculadoraEstampillas.TipoContratoObra)));

    [Theory]
    [InlineData("", CalculadoraEstampillas.TipoContratoObra)]
    [InlineData(CalculadoraEstampillas.TipoEntidadGobernacion, "")]
    public void Validar_CamposObligatoriosVacios_Lanza(string tipoEntidad, string tipoContrato) =>
        Assert.Throws<ArgumentException>(() => CalculadoraEstampillas.Validar(Entrada(1000, tipoEntidad, tipoContrato)));

    [Fact]
    public void BaseGravable_ConIvaIncluido_LoDescuenta()
    {
        var entrada = new CalculadoraEstampillas.Entrada(
            119_000_000, IncluyeIva: true, TarifaIva: 0.19m,
            CalculadoraEstampillas.TipoEntidadGobernacion, CalculadoraEstampillas.RegimenDeclaranteRenta,
            CalculadoraEstampillas.TipoContratoObra, CalculadoraEstampillas.FuenteRecursosPropios, "Bucaramanga");

        var resultado = CalculadoraEstampillas.Calcular(entrada, new ConfiguracionEstampillas());

        Assert.Equal(100_000_000m, resultado.BaseGravable); // 119.000.000 / 1.19
    }

    [Fact]
    public void ProHospital_GobernacionRecursosPropios_Aplica2Porciento()
    {
        var resultado = CalculadoraEstampillas.Calcular(
            Entrada(100_000_000, CalculadoraEstampillas.TipoEntidadGobernacion, CalculadoraEstampillas.TipoContratoObra),
            new ConfiguracionEstampillas());

        var item = resultado.Items.Single(i => i.Nombre == "Pro-Hospital");
        Assert.True(item.Aplica);
        Assert.Equal(2_000_000m, item.Valor);
    }

    [Fact]
    public void ProHospital_ExcluidoPorFalloConsejoDeEstado()
    {
        var resultado = CalculadoraEstampillas.Calcular(
            Entrada(100_000_000, CalculadoraEstampillas.TipoEntidadGobernacion, CalculadoraEstampillas.TipoContratoSaludAsistencial,
                fuente: CalculadoraEstampillas.FuenteSgsssAsistencial),
            new ConfiguracionEstampillas());

        var item = resultado.Items.Single(i => i.Nombre == "Pro-Hospital");
        Assert.False(item.Aplica);
        Assert.Contains("Consejo de Estado", item.Motivo);
    }

    [Fact]
    public void ProUis_DebajoDelMinimoExento_NoAplica()
    {
        // 3 SMMLV con el default (1.300.000) = 3.900.000 — este contrato queda por debajo
        var resultado = CalculadoraEstampillas.Calcular(
            Entrada(3_000_000, CalculadoraEstampillas.TipoEntidadGobernacion, CalculadoraEstampillas.TipoContratoObra),
            new ConfiguracionEstampillas());

        var item = resultado.Items.Single(i => i.Nombre == "Pro-UIS");
        Assert.False(item.Aplica);
        Assert.Contains("mínimo exento", item.Motivo);
    }

    [Theory]
    [InlineData(CalculadoraEstampillas.RegimenDeclaranteRenta, 2_500_000)]
    [InlineData(CalculadoraEstampillas.RegimenNoDeclaranteRenta, 3_500_000)]
    public void ProUis_TarifaSegunRegimen_YDistribucionSumaElTotal(string regimen, decimal valorEsperado)
    {
        var resultado = CalculadoraEstampillas.Calcular(
            Entrada(100_000_000, CalculadoraEstampillas.TipoEntidadGobernacion, CalculadoraEstampillas.TipoContratoObra, regimen: regimen),
            new ConfiguracionEstampillas());

        var item = resultado.Items.Single(i => i.Nombre == "Pro-UIS");
        Assert.Equal(valorEsperado, item.Valor);
        Assert.Equal(item.Valor, item.Distribucion!["UIS"] + item.Distribucion["UTS"] + item.Distribucion["Unipaz"]);
    }

    [Theory]
    [InlineData(CalculadoraEstampillas.TipoEntidadGobernacion, null, 0.02)]
    [InlineData(CalculadoraEstampillas.TipoEntidadAlcaldiaMunicipal, null, 0.01)]     // municipio sin tarifa configurada -> 1% por defecto
    public void ProCultura_TarifaSegunEntidad(string tipoEntidad, string? _, decimal tarifaEsperada)
    {
        var resultado = CalculadoraEstampillas.Calcular(
            Entrada(100_000_000, tipoEntidad, CalculadoraEstampillas.TipoContratoObra), new ConfiguracionEstampillas());

        var item = resultado.Items.Single(i => i.Nombre == "Pro-Cultura");
        Assert.Equal(tarifaEsperada, item.Tarifa);
    }

    [Fact]
    public void ProCultura_MunicipioConTarifaPropia_LaUsaEnLugarDelDefault()
    {
        var config = new ConfiguracionEstampillas { TarifaCulturaPorMunicipio = { ["Barrancabermeja"] = 0.015m } };

        var resultado = CalculadoraEstampillas.Calcular(
            Entrada(100_000_000, CalculadoraEstampillas.TipoEntidadAlcaldiaMunicipal, CalculadoraEstampillas.TipoContratoObra, municipio: "Barrancabermeja"),
            config);

        Assert.Equal(0.015m, resultado.Items.Single(i => i.Nombre == "Pro-Cultura").Tarifa);
    }

    [Fact]
    public void ProDeporte_Gobernacion_NoAplicaPorLey2023de2020()
    {
        var resultado = CalculadoraEstampillas.Calcular(
            Entrada(100_000_000, CalculadoraEstampillas.TipoEntidadGobernacion, CalculadoraEstampillas.TipoContratoObra), new ConfiguracionEstampillas());

        Assert.False(resultado.Items.Single(i => i.Nombre == "Pro-Deporte y Recreación").Aplica);
    }

    [Fact]
    public void Redondeo_Peso_RedondeaAlPesoMasCercano_AwayFromZero()
    {
        // 4.975 * 2% = 99.5 exacto -> away-from-zero redondea a 100, no a 99
        var resultado = CalculadoraEstampillas.Calcular(
            Entrada(4_975, CalculadoraEstampillas.TipoEntidadGobernacion, CalculadoraEstampillas.TipoContratoObra), new ConfiguracionEstampillas());

        Assert.Equal(100m, resultado.Items.Single(i => i.Nombre == "Pro-Hospital").Valor);
    }

    [Fact]
    public void Redondeo_Centena_RedondeaAlCentenarMasCercano()
    {
        // 61.727.500 * 2% = 1.234.550 -> /100 = 12.345,5 -> away-from-zero = 12.346 -> *100 = 1.234.600
        var config = new ConfiguracionEstampillas { ModoRedondeo = ModoRedondeoEstampillas.Centena };

        var resultado = CalculadoraEstampillas.Calcular(
            Entrada(61_727_500, CalculadoraEstampillas.TipoEntidadGobernacion, CalculadoraEstampillas.TipoContratoObra), config);

        Assert.Equal(1_234_600m, resultado.Items.Single(i => i.Nombre == "Pro-Hospital").Valor);
    }

    [Fact]
    public void Total_SumaSoloLosItemsQueAplican_SinRecargoDeSistematizacion()
    {
        // Alcaldía Municipal: solo aplican Pro-Cultura, Pro-Adulto Mayor y Pro-Deporte de los 7 ítems
        var resultado = CalculadoraEstampillas.Calcular(
            Entrada(50_000_000, CalculadoraEstampillas.TipoEntidadAlcaldiaMunicipal, CalculadoraEstampillas.TipoContratoPrestacionServicios,
                fuente: CalculadoraEstampillas.FuenteOtros, municipio: "Piedecuesta"),
            new ConfiguracionEstampillas());

        Assert.Equal(3, resultado.Items.Count(i => i.Aplica));
        Assert.Equal(2_250_000m, resultado.Total); // 500.000 (cultura) + 1.000.000 (adulto mayor) + 750.000 (deporte)

        // REGLA DE ORO — regresión: el total nunca es mayor a la suma lineal (nada de +10% de "sistematización")
        Assert.Equal(resultado.Items.Where(i => i.Aplica).Sum(i => i.Valor), resultado.Total);
    }
}
