using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SGDS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SeedTiposSolicitudEstampillas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // proyecto_id=10 (Estampillas) tiene que existir antes de poder insertar estos tipos
            // de solicitud. En la base donde se generó esta migración ya existía (se había creado
            // a mano desde el panel de Admin), así que nunca falló ahí — pero una base 100% nueva
            // (CI, un colaborador que clona el repo) no lo trae, y el INSERT de abajo revienta por
            // la llave foránea. Ya que esta migración quedó registrada como aplicada en las bases
            // existentes (no se vuelve a ejecutar ahí), es seguro hacerla defensiva/idempotente
            // para que también funcione al migrar desde cero.
            migrationBuilder.Sql(@"
                INSERT INTO proyectos (id, nombre, codigo, activo)
                SELECT 10, 'Estampillas', 'ESTAMPILLAS', true
                WHERE NOT EXISTS (SELECT 1 FROM proyectos WHERE id = 10);
                SELECT setval('proyectos_id_seq', (SELECT MAX(id) FROM proyectos));
            ");

            migrationBuilder.Sql(@"
                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id)
                SELECT 16, true, 'Contrato', 10
                WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 16);

                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id)
                SELECT 17, true, 'Convenio', 10
                WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 17);

                INSERT INTO tipos_solicitud (id, activo, nombre, proyecto_id)
                SELECT 18, true, 'Acto sin cuantía', 10
                WHERE NOT EXISTS (SELECT 1 FROM tipos_solicitud WHERE id = 18);
            ");

            // InsertData usa IDs explícitos y no avanza la secuencia de identidad de Postgres —
            // se sincroniza manualmente para que los próximos INSERT (vía la API) no colisionen.
            migrationBuilder.Sql("SELECT setval('tipos_solicitud_id_seq', (SELECT MAX(id) FROM tipos_solicitud));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "tipos_solicitud",
                keyColumn: "id",
                keyValue: 18);
        }
    }
}
