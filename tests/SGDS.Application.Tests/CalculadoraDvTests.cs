using SGDS.Application.Helpers;

namespace SGDS.Application.Tests;

public class CalculadoraDvTests
{
    [Theory]
    [InlineData("900123456", "8")]      // vector de referencia, 9 dígitos reales
    [InlineData("900.123.456", "8")]    // puntuación no debe cambiar el resultado
    [InlineData("0", "0")]              // residuo == 0
    [InlineData("4", "1")]              // residuo == 1 (caso especial: NO es 11-1)
    [InlineData("8", "9")]              // residuo == 2 -> 11-2
    [InlineData("9000000000000000", "0")] // 16 dígitos: el "9" inicial cae fuera de los 15 pesos y se ignora
    public void Calcular_DevuelveDigitoCorrecto(string nit, string esperado)
    {
        var resultado = CalculadoraDv.Calcular(nit);
        Assert.Equal(esperado, resultado);
    }

    [Fact]
    public void Calcular_SinDigitos_DevuelveVacio()
    {
        Assert.Equal("", CalculadoraDv.Calcular("ABC-sin-numeros"));
    }
}
