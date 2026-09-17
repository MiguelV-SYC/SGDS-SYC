using QRCoder;
using QuestPDF.Elements;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ZXing;
using ZXing.Windows.Compatibility;

namespace SGDS.Api.Pdf;

// Sistema de diseño compartido por todos los PDFs generados con QuestPDF (tornaguías,
// preliquidaciones, certificados, etc.) — mismos tokens de color y tipografía que
// SGDS.Frontend/src/index.css (@theme), para que los documentos se sientan parte del mismo
// sistema visual que la app. Antes de esto, cada controller estilizaba su PDF por su cuenta
// (o no lo estilizaba en absoluto) y duplicaba su propia generación de QR/código de barras.
public static class DisenoPdfSgds
{
    public const string Navy950 = "#0a1730";
    public const string Navy900 = "#0d1f42";
    public const string Navy800 = "#122a58";
    public const string Blue600 = "#2f6fed";
    public const string Blue500 = "#4d8bff";
    public const string Ink900 = "#0f1a2e";
    public const string Ink600 = "#5b6b85";
    public const string Ink400 = "#94a3b8";
    public const string Paper = "#f7f9fc";
    public const string Line = "#e4e9f2";

    private static readonly Lazy<byte[]> _logoSgds = new(() =>
        File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Assets", "logo-sgds.png")));

    private static readonly Lazy<byte[]> _escudoSantander = new(() =>
        File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Assets", "escudo-santander.png")));

    private static readonly Lazy<byte[]> _logoComfenalco = new(() =>
        File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Assets", "logo-comfenalco.png")));

    public static byte[] LogoSgds => _logoSgds.Value;
    public static byte[] EscudoSantander => _escudoSantander.Value;
    public static byte[] LogoComfenalco => _logoComfenalco.Value;

    // ===== QR / código de barras (antes duplicado en cada controller) =====
    public static byte[] GenerarQrPng(string contenido)
    {
        using var generador = new QRCodeGenerator();
        using var datosQr = generador.CreateQrCode(contenido, QRCodeGenerator.ECCLevel.Q);
        var pngQr = new PngByteQRCode(datosQr);
        return pngQr.GetGraphic(20);
    }

    // Requiere System.Drawing (Windows) para el renderizado a Bitmap.
    public static byte[] GenerarBarcodePng(string contenido)
    {
        var escritor = new BarcodeWriter
        {
            Format = BarcodeFormat.CODE_128,
            Options = new ZXing.Common.EncodingOptions { Width = 360, Height = 90, Margin = 5, PureBarcode = false },
        };
        using var bitmap = escritor.Write(contenido);
        using var stream = new MemoryStream();
        bitmap.Save(stream, System.Drawing.Imaging.ImageFormat.Png);
        return stream.ToArray();
    }

    // ===== Encabezado institucional (degradado navy → azul + logo SGDS + escudo opcional) =====
    public static void Encabezado(IContainer contenedor, string modulo, string tituloDocumento, string numero, byte[]? escudo = null)
    {
        contenedor.BackgroundLinearGradient(120, [Navy950, Navy800, Blue600]).Padding(20).Row(row =>
        {
            row.AutoItem().Width(34).Height(34).Image(LogoSgds).FitArea();
            row.ConstantItem(12);
            row.RelativeItem().Column(col =>
            {
                col.Item().Text("SGDS").FontSize(9).Bold().FontColor(Colors.White).LetterSpacing(0.12f);
                col.Item().Text(modulo).FontSize(8).FontColor(Blue500);
                col.Item().PaddingTop(6).Text(tituloDocumento).FontSize(15).Bold().FontColor(Colors.White);
                col.Item().Text($"N.° {numero}").FontSize(9).FontColor(Colors.Grey.Lighten2);
            });
            if (escudo != null)
            {
                row.ConstantItem(50).Height(50).Image(escudo).FitArea();
            }
        });
    }

    public static void PiePagina(IContainer contenedor, string notaLegal)
    {
        contenedor.Column(col =>
        {
            col.Item().LineHorizontal(0.75f).LineColor(Line);
            col.Item().PaddingTop(6).Row(row =>
            {
                row.RelativeItem().Text(notaLegal).FontSize(7).Italic().FontColor(Ink400);
                row.AutoItem().Text(t =>
                {
                    t.Span("Generado el ").FontSize(7.5f).FontColor(Ink400);
                    t.Span(DateTime.Now.ToString("yyyy-MM-dd HH:mm")).FontSize(7.5f).Bold().FontColor(Ink600);
                });
            });
        });
    }

    // ===== Bloque de tabla de sección (título azul + tabla con zebra) =====
    public static void SeccionTabla(ColumnDescriptor col, string titulo, params (string etiqueta, string valor)[] filas)
    {
        col.Item().PaddingTop(12).Text(titulo).FontSize(10.5f).Bold().FontColor(Blue600);
        col.Item().PaddingTop(4).Table(t =>
        {
            t.ColumnsDefinition(c => { c.RelativeColumn(2); c.RelativeColumn(3); });
            for (var i = 0; i < filas.Length; i++)
            {
                var (etiqueta, valor) = filas[i];
                var fondo = i % 2 == 0 ? "#FFFFFF" : Paper;
                t.Cell().Background(fondo).BorderBottom(0.5f).BorderColor(Line).Padding(6).Text(etiqueta).FontSize(9).FontColor(Ink600);
                t.Cell().Background(fondo).BorderBottom(0.5f).BorderColor(Line).Padding(6).Text(valor).FontSize(9.5f).Bold().FontColor(Ink900);
            }
        });
    }

    // ===== Tabla genérica con encabezado navy y filas con zebra — para tablas de más de 2 columnas =====
    public static void TablaEncabezado(TableDescriptor t, params string[] titulos)
    {
        t.Header(h =>
        {
            foreach (var titulo in titulos)
                h.Cell().Background(Navy900).Padding(6).Text(titulo).FontColor(Colors.White).FontSize(8.5f).Bold();
        });
    }

    public static void ValorDestacado(ColumnDescriptor col, string etiqueta, string valor)
    {
        col.Item().PaddingTop(14).Background(Navy900).Padding(14).Row(row =>
        {
            row.RelativeItem().AlignMiddle().Text(etiqueta).FontSize(10).FontColor(Colors.Grey.Lighten2);
            row.AutoItem().Text(valor).FontSize(18).Bold().FontColor(Colors.White);
        });
    }

    public static void BloqueQr(ColumnDescriptor col, byte[] qr, string codigo, string? nota = null)
    {
        col.Item().PaddingTop(16).Row(row =>
        {
            row.ConstantItem(85).Image(qr);
            row.RelativeItem().PaddingLeft(14).AlignMiddle().Column(c =>
            {
                c.Item().Text("Verificable en SGDS").FontSize(9).Bold().FontColor(Ink900);
                c.Item().Text(codigo).FontSize(9).FontColor(Ink600);
                if (nota != null) c.Item().PaddingTop(4).Text(nota).FontSize(7.5f).Italic().FontColor(Ink400);
            });
        });
    }
}
