using SGDS.Application.Helpers;
using SGDS.Domain.Entities;

namespace SGDS.Application.Tests;

public class ReglasComfenalcoTests
{
    // SmmlvVigente actual en ReglasComfenalco = 1.423.500
    [Theory]
    [InlineData(1_000_000, "A")]   // menos de 2 SMMLV
    [InlineData(2_847_000, "A")]   // exactamente 2 SMMLV -> límite inclusive en "A"
    [InlineData(2_847_001, "B")]   // un peso más -> pasa a "B"
    [InlineData(5_694_000, "B")]   // exactamente 4 SMMLV -> límite inclusive en "B"
    [InlineData(5_694_001, "C")]   // un peso más -> pasa a "C"
    public void CalcularCategoriaCarne_ClasificaPorSmmlv(decimal ingresos, string categoriaEsperada)
    {
        Assert.Equal(categoriaEsperada, ReglasComfenalco.CalcularCategoriaCarne(ingresos));
    }

    [Fact]
    public void Validar_CarneVirtual_EstadoInactivo_Bloquea()
    {
        var datos = new Dictionary<string, string> { ["estadoAfiliacion"] = "Inactivo" };

        var error = ReglasComfenalco.Validar("Carné virtual", datos);

        Assert.Contains("ACTIVO", error);
    }

    [Fact]
    public void Validar_CarneVirtual_EstadoActivo_NoBloquea()
    {
        var datos = new Dictionary<string, string> { ["estadoAfiliacion"] = "Activo" };

        Assert.Null(ReglasComfenalco.Validar("Carné virtual", datos));
    }

    [Theory]
    [InlineData("Dependiente", 11, true)]    // por debajo del mínimo -> bloquea
    [InlineData("Dependiente", 12, false)]   // justo el mínimo -> pasa
    [InlineData("Independiente", 23, true)]
    [InlineData("Independiente", 24, false)]
    public void Validar_SubsidioDesempleo_MinimoDeMesesSegunTipoTrabajador(string tipoTrabajador, int meses, bool debeBloquear)
    {
        var datos = new Dictionary<string, string>
        {
            ["tipoTrabajador"] = tipoTrabajador,
            ["mesesAportados"] = meses.ToString(),
        };

        var error = ReglasComfenalco.Validar("Subsidio de desempleo", datos);

        Assert.Equal(debeBloquear, error != null);
    }

    [Fact]
    public void Validar_SubsidioVivienda_TechoDe4Smmlv()
    {
        // 4 * 1.423.500 = 5.694.000 — un peso más ya bloquea
        var datos = new Dictionary<string, string> { ["ingresosGrupoFamiliar"] = "5694001" };

        Assert.NotNull(ReglasComfenalco.Validar("Subsidio de vivienda", datos));
    }

    [Fact]
    public void Validar_Creditos_CuotaSuperaMitadDelSalario_Bloquea()
    {
        var datos = new Dictionary<string, string>
        {
            ["salarioNeto"] = "2000000",
            ["cuotaMensualSolicitada"] = "1000001", // supera el 50% exacto por $1
        };

        Assert.NotNull(ReglasComfenalco.Validar("Créditos", datos));
    }

    [Fact]
    public void Validar_Creditos_LibranzaSinConvenioActivo_Bloquea()
    {
        var datos = new Dictionary<string, string>
        {
            ["modalidadCredito"] = "Libranza",
            ["aportesAlDiaComfenalco"] = "Sí",
            ["convenioLibranzaActivo"] = "No",
        };

        Assert.NotNull(ReglasComfenalco.Validar("Créditos", datos));
    }

    [Fact]
    public void Validar_TipoSinReglas_NoBloquea()
    {
        Assert.Null(ReglasComfenalco.Validar("Protección al cesante", new Dictionary<string, string>()));
    }
}

public class CalculadoraBaseGravableVehiculoTests
{
    [Theory]
    [InlineData(2001, 10000)]
    [InlineData(2002, 11000)]
    [InlineData(2010, 19000)]
    [InlineData(2024, 33000)]
    [InlineData(2025, 34000)]
    [InlineData(1990, 10000)]
    [InlineData(2026, 34000)]

    public void ObtenerValorPorAnio_DebeRetornarValorCorrespondiente(
        int anio,
        decimal esperado)
    {
        // Arrange
        var fila = new BaseGravableVehiculo
        {
            Valor2001OAnterior = 10000,
            Valor2002 = 11000,
            Valor2010 = 19000,
            Valor2024 = 33000,
            Valor2025 = 34000
        };

        // Act
        var resultado = CalculadoraBaseGravableVehiculo
            .ObtenerValorPorAnio(fila, anio);

        // Assert
        Assert.Equal(esperado, resultado);
    }

    private static readonly BaseGravableVehiculo FilaCalcular = new()
    {
        Valor2001OAnterior = 10000,
        Valor2002 = 11000,
        Valor2010 = 19000,
        // Valor2015 queda sin diligenciar a propósito -> null
        Valor2024 = 33000,
        Valor2025 = 34000,
    };

    [Fact]
    public void Calcular_ColumnaDelAnioSinDiligenciar_NoSoportado()
    {
        var resultado = CalculadoraBaseGravableVehiculo.Calcular(
            FilaCalcular, anioModelo: 2015, blindado: false, esClasicoAntiguo: false, new ConfiguracionBaseGravableVehiculo());

        Assert.False(resultado.Soportado);
        Assert.Contains("no tiene un valor de base gravable", resultado.MotivoNoSoportado);
    }

    [Fact]
    public void Calcular_VehiculoNoEncontrado_NoSoportado()
    {
        var resultado = CalculadoraBaseGravableVehiculo.Calcular(
            fila: null, anioModelo: 2020, blindado: false, esClasicoAntiguo: false, new ConfiguracionBaseGravableVehiculo());

        Assert.False(resultado.Soportado);
        Assert.Contains("No se encontró el vehículo", resultado.MotivoNoSoportado);
    }

    [Fact]
    public void Calcular_ClasicoAntiguo_SinTarifaConfigurada_NoSoportado()
    {
        // TarifaBaseClasicoAntiguo queda null a propósito -> el sistema no debe inventarla
        var resultado = CalculadoraBaseGravableVehiculo.Calcular(
            FilaCalcular, anioModelo: 1985, blindado: false, esClasicoAntiguo: true, new ConfiguracionBaseGravableVehiculo());

        Assert.False(resultado.Soportado);
        Assert.True(resultado.AplicaClasicoAntiguo);
    }

    [Fact]
    public void Calcular_ClasicoAntiguo_ConTarifaYBlindaje_AplicaAmbos()
    {
        var config = new ConfiguracionBaseGravableVehiculo { TarifaBaseClasicoAntiguo = 20000, RecargoBlindaje = 0.10m };

        var resultado = CalculadoraBaseGravableVehiculo.Calcular(FilaCalcular, 1985, blindado: true, esClasicoAntiguo: true, config);

        Assert.True(resultado.Soportado);
        Assert.Equal(20000, resultado.ValorTabla);
        Assert.Equal(22000, resultado.ValorAjustado); // 20000 * 1.10
        Assert.True(resultado.AplicaBlindaje);
        Assert.True(resultado.AplicaClasicoAntiguo);
    }

    [Fact]
    public void Calcular_VehiculoNormal_ConBlindaje_UsaRecargoDeConfig()
    {
        // RecargoBlindaje distinto del valor por defecto (0.10) -> confirma que no está hardcodeado
        var config = new ConfiguracionBaseGravableVehiculo { RecargoBlindaje = 0.15m };

        var resultado = CalculadoraBaseGravableVehiculo.Calcular(FilaCalcular, 2010, blindado: true, esClasicoAntiguo: false, config);

        Assert.True(resultado.Soportado);
        Assert.Equal(19000, resultado.ValorTabla);
        Assert.Equal(21850, resultado.ValorAjustado); // 19000 * 1.15
        Assert.False(resultado.AplicaClasicoAntiguo);
    }

    [Fact]
    public void Calcular_VehiculoNormal_SinBlindaje_ValorAjustadoIgualAlDeTabla()
    {
        var resultado = CalculadoraBaseGravableVehiculo.Calcular(
            FilaCalcular, anioModelo: 2024, blindado: false, esClasicoAntiguo: false, new ConfiguracionBaseGravableVehiculo());

        Assert.Equal(resultado.ValorTabla, resultado.ValorAjustado);
        Assert.False(resultado.AplicaBlindaje);
    }
}

public class GeografiaColombiaTests
{
    [Fact]
    public void ObtenerCapital_DepartamentoValido_DevuelveCoordenada()
    {
        var capital = GeografiaColombia.ObtenerCapital("Santander");

        Assert.NotNull(capital);
        Assert.Equal(7.1193, capital.Lat, precision: 3);
        Assert.Equal(-73.1227, capital.Lng, precision: 3);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("Departamento Inexistente")]
    public void ObtenerCapital_DesconocidoONulo_DevuelveNull(string? departamento) =>
        Assert.Null(GeografiaColombia.ObtenerCapital(departamento));

    [Fact]
    public void DistanciaAproximadaKm_MismoDepartamento_EsCero()
    {
        var distancia = GeografiaColombia.DistanciaAproximadaKm("Santander", "Santander");
        Assert.NotNull(distancia);
        Assert.Equal(0, distancia.Value, precision: 6);
    }

    [Fact]
    public void DistanciaAproximadaKm_BogotaYCundinamarca_CompartenCoordenada_EsCero()
    {
        // Ambas apuntan a la misma coordenada en el diccionario — no es un bug, es la fuente de datos
        var distancia = GeografiaColombia.DistanciaAproximadaKm("Bogotá D.C.", "Cundinamarca");
        Assert.NotNull(distancia);
        Assert.Equal(0, distancia.Value, precision: 6);
    }

    [Fact]
    public void DistanciaAproximadaKm_DepartamentoInexistente_DevuelveNull() =>
        Assert.Null(GeografiaColombia.DistanciaAproximadaKm("Santander", "No Existe"));

    [Fact]
    public void DistanciaKmEntre_BogotaAMedellin_AproximadamenteCorrecta()
    {
        // ~245km en línea recta — margen amplio por ser una aproximación esférica
        var km = GeografiaColombia.DistanciaKmEntre(4.7110, -74.0721, 6.2442, -75.5812);
        Assert.InRange(km, 230, 260);
    }
}
