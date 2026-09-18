using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SGDS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CrearModuloGoTrace : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lotes_gotrace",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    solicitud_id = table.Column<int>(type: "integer", nullable: false),
                    producto = table.Column<string>(type: "text", nullable: false),
                    numero_lote = table.Column<string>(type: "text", nullable: false),
                    fecha_produccion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    unidades_lote = table.Column<int>(type: "integer", nullable: false),
                    prefijo_uid = table.Column<string>(type: "text", nullable: true),
                    cantidad_uids = table.Column<int>(type: "integer", nullable: true),
                    uid_inicial = table.Column<int>(type: "integer", nullable: true),
                    uid_final = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_lotes_gotrace", x => x.id);
                    table.ForeignKey(
                        name: "fk_lotes_gotrace_solicitudes_solicitud_id",
                        column: x => x.solicitud_id,
                        principalTable: "solicitudes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "puntos_control_gotrace",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    lote_go_trace_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    habilitado = table.Column<bool>(type: "boolean", nullable: false),
                    confirmado = table.Column<bool>(type: "boolean", nullable: false),
                    fecha_confirmacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_puntos_control_gotrace", x => x.id);
                    table.ForeignKey(
                        name: "fk_puntos_control_gotrace_lotes_gotrace_lote_go_trace_id",
                        column: x => x.lote_go_trace_id,
                        principalTable: "lotes_gotrace",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // proyecto_id=9 (Gotrace) — defensivo/idempotente, mismo motivo que en las demás
            // migraciones de "Crear módulo X" (ver SeedTiposSolicitudEstampillas).
            migrationBuilder.Sql(@"
                INSERT INTO proyectos (id, nombre, codigo, activo)
                SELECT 9, 'Gotrace', 'GOTRACE', true
                WHERE NOT EXISTS (SELECT 1 FROM proyectos WHERE id = 9);
                SELECT setval('proyectos_id_seq', (SELECT MAX(id) FROM proyectos));
            ");

            migrationBuilder.Sql(@"
                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id)
                SELECT 26, true, 'Registro de trazabilidad de lote', 9
                WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 26);
            ");

            // InsertData usa un id explícito y no avanza la secuencia de identidad de Postgres —
            // se sincroniza manualmente para que los próximos INSERT no colisionen.
            migrationBuilder.Sql("SELECT setval('tipos_solicitud_id_seq', (SELECT MAX(id) FROM tipos_solicitud));");

            migrationBuilder.CreateIndex(
                name: "ix_lotes_gotrace_solicitud_id",
                table: "lotes_gotrace",
                column: "solicitud_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_puntos_control_gotrace_lote_go_trace_id",
                table: "puntos_control_gotrace",
                column: "lote_go_trace_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "puntos_control_gotrace");

            migrationBuilder.DropTable(
                name: "lotes_gotrace");

            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 26);
        }
    }
}
