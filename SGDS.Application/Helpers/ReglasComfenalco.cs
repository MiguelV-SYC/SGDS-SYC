namespace SGDS.Application.Helpers;

// Reglas de negocio de Comfenalco (Reglas_de_Negocio.MD/REGLAS_DE_NEGOCIO_COMFENALCO.md), aisladas
// del controller para que se puedan probar directo con xUnit — mismo patrón que CalculadoraEstampillas
// e CalculadoraImpuestoConsumo. RN-SV-004 y RN-PC-002/003 quedan fuera: dependen de sistemas externos
// que este proyecto no integra.
public static class ReglasComfenalco
{
    public const decimal SmmlvVigente = 1_423_500m; // Ajustar cada enero según el decreto del Gobierno Nacional.

    // RN-CV-002: categorización automática por ingresos en SMMLV.
    public static string CalcularCategoriaCarne(decimal ingresosMensuales)
    {
        var smmlv = ingresosMensuales / SmmlvVigente;
        if (smmlv <= 2) return "A";
        if (smmlv <= 4) return "B";
        return "C";
    }

    // Validaciones de radicación según el tipo de trámite. Devuelve el mensaje de bloqueo, o null si pasa.
    public static string? Validar(string tipoNombre, IReadOnlyDictionary<string, string> datos)
    {
        decimal Num(string clave) => decimal.TryParse(datos.GetValueOrDefault(clave), out var v) ? v : 0m;

        switch (tipoNombre)
        {
            case "Carné virtual":
                // RN-CV-001: solo se expide el carné si el afiliado está ACTIVO en aportes.
                if (datos.GetValueOrDefault("estadoAfiliacion") is { } estado && estado != "Activo")
                    return "Solo se puede expedir el carné si el afiliado está ACTIVO en aportes.";
                break;

            case "Subsidio de vivienda":
                // RN-SV-001: techo de 4 SMMLV en los ingresos del grupo familiar postulante.
                if (Num("ingresosGrupoFamiliar") > SmmlvVigente * 4)
                    return "Los ingresos del grupo familiar superan 4 SMMLV — no es posible radicar el subsidio de vivienda.";
                // RN-SV-002: declaración jurada de no propietario, obligatoria para vivienda nueva.
                if (datos.GetValueOrDefault("declaracionNoPropietario") == "No")
                    return "Se requiere la declaración jurada de no propietario de vivienda para radicar.";
                break;

            case "Subsidio de desempleo":
                // RN-SD-001: mínimo de aportes en los últimos 3 años (12 meses dependiente, 24 independiente).
                var minimoMeses = datos.GetValueOrDefault("tipoTrabajador") == "Independiente" ? 24 : 12;
                if (Num("mesesAportados") < minimoMeses)
                    return $"El postulante no cumple el mínimo de {minimoMeses} meses de aportes en los últimos 3 años.";
                // RN-SD-002: la última Caja de afiliación debe ser Comfenalco Santander.
                if (datos.GetValueOrDefault("ultimaCajaAfiliacion") == "Otra caja")
                    return "La última Caja de afiliación no fue Comfenalco Santander — el trámite debe redirigirse a la Caja correspondiente.";
                // RN-SD-003: no haber recibido el beneficio en los últimos 3 años.
                if (DateTime.TryParse(datos.GetValueOrDefault("fechaUltimoBeneficioCesante"), out var fechaUltimo)
                    && fechaUltimo > DateTime.UtcNow.AddYears(-3))
                    return "El postulante ya recibió el beneficio del Mecanismo de Protección al Cesante en los últimos 3 años.";
                break;

            case "Créditos":
                // RN-CRE-001: la cuota de libranza no puede superar el 50% del salario neto.
                if (Num("salarioNeto") > 0 && Num("cuotaMensualSolicitada") > Num("salarioNeto") * 0.5m)
                    return "La cuota mensual solicitada supera el 50% del salario neto — ajusta el monto del crédito.";
                // RN-CRE-003: para libranza, la empresa debe estar al día en aportes y con convenio activo.
                if (datos.GetValueOrDefault("modalidadCredito") == "Libranza"
                    && (datos.GetValueOrDefault("aportesAlDiaComfenalco") == "No" || datos.GetValueOrDefault("convenioLibranzaActivo") == "No"))
                    return "Para crédito de libranza, la empresa debe estar al día en aportes y tener convenio de libranza activo con la Caja.";
                break;
        }

        return null;
    }
}
