using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SGDS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CrearModuloSycTrace : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "estampillas_fisicas",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    solicitud_id = table.Column<int>(type: "integer", nullable: false),
                    solicitud_estampillas_id = table.Column<int>(type: "integer", nullable: false),
                    categoria_producto = table.Column<string>(type: "text", nullable: false),
                    nombre_producto = table.Column<string>(type: "text", nullable: false),
                    marca = table.Column<string>(type: "text", nullable: true),
                    grado_alcoholimetrico = table.Column<decimal>(type: "numeric", nullable: true),
                    contenido_neto_cc = table.Column<int>(type: "integer", nullable: true),
                    unidades_por_cajetilla = table.Column<int>(type: "integer", nullable: true),
                    registro_invima = table.Column<string>(type: "text", nullable: false),
                    lote_produccion = table.Column<string>(type: "text", nullable: false),
                    origen_producto = table.Column<string>(type: "text", nullable: false),
                    numero_tornaguia = table.Column<string>(type: "text", nullable: true),
                    numero_declaracion_importacion = table.Column<string>(type: "text", nullable: true),
                    registro_introduccion = table.Column<string>(type: "text", nullable: true),
                    prefijo = table.Column<string>(type: "text", nullable: false),
                    cantidad_estampillas = table.Column<int>(type: "integer", nullable: false),
                    codigo_inicial = table.Column<int>(type: "integer", nullable: false),
                    codigo_final = table.Column<int>(type: "integer", nullable: false),
                    fecha_pago = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fecha_entrega = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    motivo_anulacion = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_estampillas_fisicas", x => x.id);
                    table.ForeignKey(
                        name: "fk_estampillas_fisicas_solicitudes_solicitud_estampillas_id",
                        column: x => x.solicitud_estampillas_id,
                        principalTable: "solicitudes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_estampillas_fisicas_solicitudes_solicitud_id",
                        column: x => x.solicitud_id,
                        principalTable: "solicitudes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // proyecto_id=7 (SYCTrace) — defensivo/idempotente por la misma razón que en
            // SeedTiposSolicitudEstampillas (ninguna migración crea el Proyecto todavía).
            migrationBuilder.Sql(@"
                INSERT INTO proyectos (id, nombre, codigo, activo)
                SELECT 7, 'SYCTrace', 'SYCTRACE', true
                WHERE NOT EXISTS (SELECT 1 FROM proyectos WHERE id = 7);
                SELECT setval('proyectos_id_seq', (SELECT MAX(id) FROM proyectos));
            ");

            migrationBuilder.Sql(@"
                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id)
                SELECT 25, true, 'Expedición de estampilla', 7
                WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 25);
            ");

            // InsertData usa un id explícito y no avanza la secuencia de identidad de Postgres —
            // se sincroniza manualmente para que los próximos INSERT no colisionen.
            migrationBuilder.Sql("SELECT setval('tipos_solicitud_id_seq', (SELECT MAX(id) FROM tipos_solicitud));");

            migrationBuilder.CreateIndex(
                name: "ix_estampillas_fisicas_solicitud_estampillas_id",
                table: "estampillas_fisicas",
                column: "solicitud_estampillas_id");

            migrationBuilder.CreateIndex(
                name: "ix_estampillas_fisicas_solicitud_id",
                table: "estampillas_fisicas",
                column: "solicitud_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "estampillas_fisicas");

            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 25);
        }
    }
}
