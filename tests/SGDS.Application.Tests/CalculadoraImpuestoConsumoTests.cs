using SGDS.Application.Helpers;

namespace SGDS.Application.Tests;

public class CalculadoraImpuestoConsumoTests
{
    [Fact]
    public void Validar_UnidadesNegativas_Lanza()
    {
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaLicores, CalculadoraImpuestoConsumo.SubLicoresDestiladosNacionales,
            UnidadesFisicas: -1, GradosAlcoholimetricos: 40, PvpCertificado: 1000,
            PesoGramos: null, ValorAduana: null, GravamenesArancelarios: null,
            DepartamentoDestino: "Santander", TipoTramite: "Movilización");

        Assert.Throws<ArgumentException>(() => CalculadoraImpuestoConsumo.Validar(entrada));
    }

    [Fact]
    public void Licores_DestiladosNacionales_CalculaEspecificoYAdValorem()
    {
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaLicores, CalculadoraImpuestoConsumo.SubLicoresDestiladosNacionales,
            UnidadesFisicas: 10, GradosAlcoholimetricos: 40, PvpCertificado: 50_000,
            PesoGramos: null, ValorAduana: null, GravamenesArancelarios: null,
            DepartamentoDestino: "Santander", TipoTramite: "Movilización");

        var r = CalculadoraImpuestoConsumo.Calcular(entrada, new ConfiguracionImpuestoConsumo());

        Assert.Equal(144_000m, r.ComponenteEspecifico);  // 40 grados * $360 * (7.500cc / 750cc)
        Assert.Equal(125_000m, r.ComponenteAdValorem);   // 10 * 50.000 * 25%
        Assert.Equal(269_000m, r.TotalAPagar);
        Assert.False(r.AplicaExcepcionSanAndres);
        Assert.False(r.EsSoloInformativo);
    }

    [Fact]
    public void Licores_SanAndres_UsaTarifaEspecialDe57()
    {
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaLicores, CalculadoraImpuestoConsumo.SubLicoresDestiladosNacionales,
            UnidadesFisicas: 10, GradosAlcoholimetricos: 40, PvpCertificado: 50_000,
            PesoGramos: null, ValorAduana: null, GravamenesArancelarios: null,
            DepartamentoDestino: CalculadoraImpuestoConsumo.DepartamentoSanAndres, TipoTramite: "Movilización");

        var r = CalculadoraImpuestoConsumo.Calcular(entrada, new ConfiguracionImpuestoConsumo());

        Assert.True(r.AplicaExcepcionSanAndres);
        Assert.Equal(22_800m, r.ComponenteEspecifico); // 40 * $57 * 10 (el ad valorem no cambia)
        Assert.Equal(147_800m, r.TotalAPagar);
    }

    [Fact]
    public void Vinos_UsaTarifaYAdValoremDeVinos()
    {
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaLicores, CalculadoraImpuestoConsumo.SubVinos,
            UnidadesFisicas: 10, GradosAlcoholimetricos: 12, PvpCertificado: 30_000,
            PesoGramos: null, ValorAduana: null, GravamenesArancelarios: null,
            DepartamentoDestino: "Santander", TipoTramite: "Movilización");

        var r = CalculadoraImpuestoConsumo.Calcular(entrada, new ConfiguracionImpuestoConsumo());

        Assert.Equal(29_160m, r.ComponenteEspecifico); // 12 * $243 * 10
        Assert.Equal(60_000m, r.ComponenteAdValorem);  // 10 * 30.000 * 20%
    }

    [Fact]
    public void Cervezas_Nacionales_PorcentualSobrePvp()
    {
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaCervezas, CalculadoraImpuestoConsumo.SubCervezasNacionales,
            UnidadesFisicas: 100, GradosAlcoholimetricos: null, PvpCertificado: 2_000,
            PesoGramos: null, ValorAduana: null, GravamenesArancelarios: null,
            DepartamentoDestino: "Santander", TipoTramite: "Movilización");

        var r = CalculadoraImpuestoConsumo.Calcular(entrada, new ConfiguracionImpuestoConsumo());

        Assert.Equal(96_000m, r.TotalAPagar); // 100 * 2.000 * 48%
    }

    [Fact]
    public void Cervezas_Importadas_SinValorAduana_NoSoportado()
    {
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaCervezas, CalculadoraImpuestoConsumo.SubCervezasImportadas,
            UnidadesFisicas: 100, GradosAlcoholimetricos: null, PvpCertificado: 2_000,
            PesoGramos: null, ValorAduana: null, GravamenesArancelarios: null,
            DepartamentoDestino: "Santander", TipoTramite: "Movilización");

        var r = CalculadoraImpuestoConsumo.Calcular(entrada, new ConfiguracionImpuestoConsumo());

        Assert.False(r.Soportado);
    }

    [Fact]
    public void Cervezas_Importadas_BaseIncluyeMargenDel30Porciento()
    {
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaCervezas, CalculadoraImpuestoConsumo.SubCervezasImportadas,
            UnidadesFisicas: 100, GradosAlcoholimetricos: null, PvpCertificado: 0,
            PesoGramos: null, ValorAduana: 1_000_000, GravamenesArancelarios: 200_000,
            DepartamentoDestino: "Santander", TipoTramite: "Movilización");

        var r = CalculadoraImpuestoConsumo.Calcular(entrada, new ConfiguracionImpuestoConsumo());

        // (1.000.000 + 200.000) * 1.30 * 48% = 748.800
        Assert.Equal(748_800m, r.TotalAPagar);
    }

    [Fact]
    public void Cigarrillos_SinTarifaConfigurada_NoSoportado_NoInventaValor()
    {
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaCigarrillos, CalculadoraImpuestoConsumo.SubCigarrillosNacionales,
            UnidadesFisicas: 100, GradosAlcoholimetricos: null, PvpCertificado: 8_000,
            PesoGramos: null, ValorAduana: null, GravamenesArancelarios: null,
            DepartamentoDestino: "Santander", TipoTramite: "Movilización");

        var r = CalculadoraImpuestoConsumo.Calcular(entrada, new ConfiguracionImpuestoConsumo());

        Assert.False(r.Soportado); // prohibido usar los valores del Decreto 1474/2025 (inexequible)
    }

    [Fact]
    public void Cigarrillos_ConTarifaConfigurada_CalculaEspecificoYAdValorem()
    {
        var config = new ConfiguracionImpuestoConsumo { TarifaEspecificaCigarrillos = 5_000 };
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaCigarrillos, CalculadoraImpuestoConsumo.SubCigarrillosNacionales,
            UnidadesFisicas: 100, GradosAlcoholimetricos: null, PvpCertificado: 8_000,
            PesoGramos: null, ValorAduana: null, GravamenesArancelarios: null,
            DepartamentoDestino: "Santander", TipoTramite: "Movilización");

        var r = CalculadoraImpuestoConsumo.Calcular(entrada, config);

        Assert.Equal(500_000m, r.ComponenteEspecifico); // 5.000 * 100 cajetillas
        Assert.Equal(80_000m, r.ComponenteAdValorem);   // 100 * 8.000 * 10%
        Assert.Equal(580_000m, r.TotalAPagar);
    }

    [Fact]
    public void Picadura_UsaTarifaPorGramo()
    {
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaCigarrillos, CalculadoraImpuestoConsumo.SubPicadura,
            UnidadesFisicas: 0, GradosAlcoholimetricos: null, PvpCertificado: 20,
            PesoGramos: 500, ValorAduana: null, GravamenesArancelarios: null,
            DepartamentoDestino: "Santander", TipoTramite: "Movilización");

        var r = CalculadoraImpuestoConsumo.Calcular(entrada, new ConfiguracionImpuestoConsumo());

        Assert.Equal(177_000m, r.ComponenteEspecifico); // 500g * $354/g (tarifa certificada 2026)
        Assert.Equal(178_000m, r.TotalAPagar);
    }

    [Fact]
    public void Picadura_SinPeso_NoSoportado()
    {
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaCigarrillos, CalculadoraImpuestoConsumo.SubPicadura,
            UnidadesFisicas: 0, GradosAlcoholimetricos: null, PvpCertificado: 20,
            PesoGramos: null, ValorAduana: null, GravamenesArancelarios: null,
            DepartamentoDestino: "Santander", TipoTramite: "Movilización");

        Assert.False(CalculadoraImpuestoConsumo.Calcular(entrada, new ConfiguracionImpuestoConsumo()).Soportado);
    }

    [Fact]
    public void Vapeo_SiempreNoSoportado_PorSentenciaC079de2026()
    {
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaCigarrillos, CalculadoraImpuestoConsumo.SubVapeo,
            UnidadesFisicas: 10, GradosAlcoholimetricos: null, PvpCertificado: 30_000,
            PesoGramos: null, ValorAduana: null, GravamenesArancelarios: null,
            DepartamentoDestino: "Santander", TipoTramite: "Movilización");

        var r = CalculadoraImpuestoConsumo.Calcular(entrada, new ConfiguracionImpuestoConsumo());

        Assert.False(r.Soportado);
        Assert.Contains("C-079", r.MotivoNoSoportado);
    }

    [Theory]
    [InlineData("Tránsito")]
    [InlineData("Tránsito local")]
    [InlineData("Tránsito declarado")]
    public void TramitesDeTransito_SonSoloInformativos_TotalAPagarEsCero(string tipoTramite)
    {
        var entrada = new CalculadoraImpuestoConsumo.Entrada(
            CalculadoraImpuestoConsumo.CategoriaLicores, CalculadoraImpuestoConsumo.SubLicoresDestiladosNacionales,
            UnidadesFisicas: 10, GradosAlcoholimetricos: 40, PvpCertificado: 50_000,
            PesoGramos: null, ValorAduana: null, GravamenesArancelarios: null,
            DepartamentoDestino: "Santander", TipoTramite: tipoTramite);

        var r = CalculadoraImpuestoConsumo.Calcular(entrada, new ConfiguracionImpuestoConsumo());

        Assert.True(r.EsSoloInformativo);
        Assert.Equal(0m, r.TotalAPagar);
        Assert.Equal(269_000m, r.ImpuestoInformativo); // el valor informativo se conserva, solo el cobro se anula
    }
}
