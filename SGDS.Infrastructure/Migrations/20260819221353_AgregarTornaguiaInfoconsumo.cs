using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SGDS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AgregarTornaguiaInfoconsumo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tornaguias_infoconsumo",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    solicitud_id = table.Column<int>(type: "integer", nullable: false),
                    categoria_producto = table.Column<string>(type: "text", nullable: false),
                    grados_alcoholimetricos = table.Column<decimal>(type: "numeric", nullable: true),
                    unidades_fisicas = table.Column<int>(type: "integer", nullable: false),
                    pvp_certificado = table.Column<decimal>(type: "numeric", nullable: false),
                    departamento_origen = table.Column<string>(type: "text", nullable: false),
                    municipio_origen = table.Column<string>(type: "text", nullable: false),
                    departamento_destino = table.Column<string>(type: "text", nullable: false),
                    municipio_destino = table.Column<string>(type: "text", nullable: false),
                    empresa_transportadora = table.Column<string>(type: "text", nullable: false),
                    nit_transportador = table.Column<string>(type: "text", nullable: true),
                    placa_vehiculo = table.Column<string>(type: "text", nullable: false),
                    conductor = table.Column<string>(type: "text", nullable: true),
                    cedula_conductor = table.Column<string>(type: "text", nullable: true),
                    tipo_vehiculo = table.Column<string>(type: "text", nullable: true),
                    observaciones = table.Column<string>(type: "text", nullable: true),
                    fecha_expedicion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fecha_vigencia_limite = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fecha_legalizacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_tornaguias_infoconsumo", x => x.id);
                    table.ForeignKey(
                        name: "fk_tornaguias_infoconsumo_solicitudes_solicitud_id",
                        column: x => x.solicitud_id,
                        principalTable: "solicitudes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // proyecto_id=8 (Infoconsumo) — igual que en SeedTiposSolicitudEstampillas, se crea
            // de forma defensiva/idempotente porque ninguna migración lo crea todavía; en las
            // bases existentes ya existía a mano y esta migración no se vuelve a ejecutar ahí.
            migrationBuilder.Sql(@"
                INSERT INTO proyectos (id, nombre, codigo, activo)
                SELECT 8, 'Infoconsumo', 'INFOCONSUMO', true
                WHERE NOT EXISTS (SELECT 1 FROM proyectos WHERE id = 8);
                SELECT setval('proyectos_id_seq', (SELECT MAX(id) FROM proyectos));
            ");

            migrationBuilder.Sql(@"
                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id) SELECT 20, true, 'Movilización', 8 WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 20);
                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id) SELECT 21, true, 'Reenvío', 8 WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 21);
                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id) SELECT 22, true, 'Tránsito', 8 WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 22);
                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id) SELECT 23, true, 'Tránsito local', 8 WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 23);
                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id) SELECT 24, true, 'Tránsito declarado', 8 WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 24);
                SELECT setval('tipos_solicitud_id_seq', (SELECT MAX(id) FROM tipos_solicitud));
            ");

            migrationBuilder.CreateIndex(
                name: "ix_tornaguias_infoconsumo_placa_vehiculo_nit_transportador",
                table: "tornaguias_infoconsumo",
                columns: new[] { "placa_vehiculo", "nit_transportador" });

            migrationBuilder.CreateIndex(
                name: "ix_tornaguias_infoconsumo_solicitud_id",
                table: "tornaguias_infoconsumo",
                column: "solicitud_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tornaguias_infoconsumo");

            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 21);

            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 22);

            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 23);

            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 24);
        }
    }
}
