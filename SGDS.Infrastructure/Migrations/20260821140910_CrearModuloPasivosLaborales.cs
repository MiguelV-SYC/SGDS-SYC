using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SGDS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CrearModuloPasivosLaborales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "instrumentos_pasivo_laboral",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    solicitud_id = table.Column<int>(type: "integer", nullable: false),
                    instrumento = table.Column<string>(type: "text", nullable: true),
                    servidor_nombre = table.Column<string>(type: "text", nullable: true),
                    servidor_documento = table.Column<string>(type: "text", nullable: true),
                    regimen_pensional = table.Column<string>(type: "text", nullable: true),
                    tiempo_laborado_meses = table.Column<int>(type: "integer", nullable: true),
                    tiempo_total_aportes_meses = table.Column<int>(type: "integer", nullable: true),
                    valor_mesada_pensional = table.Column<decimal>(type: "numeric", nullable: true),
                    observaciones = table.Column<string>(type: "text", nullable: true),
                    solicitud_colpensiones_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_instrumentos_pasivo_laboral", x => x.id);
                    table.ForeignKey(
                        name: "fk_instrumentos_pasivo_laboral_solicitudes_solicitud_colpensio",
                        column: x => x.solicitud_colpensiones_id,
                        principalTable: "solicitudes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_instrumentos_pasivo_laboral_solicitudes_solicitud_id",
                        column: x => x.solicitud_id,
                        principalTable: "solicitudes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // proyecto_id=6 (Pasivos Laborales) — defensivo/idempotente, mismo motivo que en las
            // demás migraciones de "Crear módulo X". Se crea directo con codigo='PL' (el destino
            // final del UPDATE de más abajo), así que ese UPDATE simplemente no encuentra nada
            // que cambiar en una base nueva.
            migrationBuilder.Sql(@"
                INSERT INTO proyectos (id, nombre, codigo, activo)
                SELECT 6, 'Pasivos Laborales', 'PL', true
                WHERE NOT EXISTS (SELECT 1 FROM proyectos WHERE id = 6);
                SELECT setval('proyectos_id_seq', (SELECT MAX(id) FROM proyectos));
            ");

            migrationBuilder.Sql(@"
                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id) SELECT 27, true, 'Gestión de pasivo pensional', 6 WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 27);
                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id) SELECT 28, true, 'Gestión de pasivo laboral', 6 WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 28);
                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id) SELECT 29, true, 'Consulta de expediente digital', 6 WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 29);
            ");

            migrationBuilder.CreateIndex(
                name: "ix_instrumentos_pasivo_laboral_solicitud_colpensiones_id",
                table: "instrumentos_pasivo_laboral",
                column: "solicitud_colpensiones_id");

            migrationBuilder.CreateIndex(
                name: "ix_instrumentos_pasivo_laboral_solicitud_id",
                table: "instrumentos_pasivo_laboral",
                column: "solicitud_id",
                unique: true);

            migrationBuilder.Sql("SELECT setval('tipos_solicitud_id_seq', (SELECT MAX(id) FROM tipos_solicitud));");

            // El proyecto ya existía con codigo='PASIVOS_LABORALES' (sin solicitudes radicadas
            // todavía) — se acorta a 'PL' para que la numeración de solicitudes (Codigo-0000)
            // coincida con los mockups (#PL-0097).
            migrationBuilder.Sql("UPDATE proyectos SET codigo = 'PL' WHERE id = 6 AND nombre = 'Pasivos Laborales' AND codigo = 'PASIVOS_LABORALES';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE proyectos SET codigo = 'PASIVOS_LABORALES' WHERE id = 6 AND nombre = 'Pasivos Laborales' AND codigo = 'PL';");

            migrationBuilder.DropTable(
                name: "instrumentos_pasivo_laboral");

            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 27);

            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 28);

            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 29);
        }
    }
}
