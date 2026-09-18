\set ON_ERROR_STOP on
BEGIN;

-- Datos de catálogo mínimos que en desarrollo se crearon a mano desde el panel de Admin (no
-- existen como seed de EF Core) — sin esto, una base de CI recién migrada no tiene ni siquiera
-- los Proyectos/TiposSolicitud que los controllers buscan por nombre.
--
-- Comfenalco se inserta con id=1 explícito (a diferencia de Infoconsumo/Gotrace, que ya existen
-- con id fijo desde las migraciones) porque los specs de tests/e2e tienen PROYECTO_COMFENALCO_ID
-- hardcodeado en 1 — igual que en la base de desarrollo, donde Comfenalco fue el primer proyecto
-- creado a mano. Sin el id explícito, en una base de CI recién migrada Comfenalco nace con el
-- siguiente id disponible (12, después de que las migraciones usan 6-11), y el wizard de
-- "/solicitudes/nueva?proyectoId=1" carga el proyecto equivocado.
INSERT INTO proyectos (id, nombre, codigo, activo)
SELECT 1, 'Comfenalco', 'COMFENALCO', true
WHERE NOT EXISTS (SELECT 1 FROM proyectos WHERE nombre = 'Comfenalco');

INSERT INTO proyectos (nombre, codigo, activo)
SELECT v.nombre, v.codigo, true
FROM (VALUES ('Infoconsumo', 'INFOCONSUMO'), ('Gotrace', 'GOTRACE')) AS v(nombre, codigo)
WHERE NOT EXISTS (SELECT 1 FROM proyectos p WHERE p.nombre = v.nombre);

SELECT setval('proyectos_id_seq', (SELECT MAX(id) FROM proyectos));

INSERT INTO tipos_solicitud (nombre, proyecto_id, activo)
SELECT v.nombre, (SELECT id FROM proyectos WHERE nombre = v.proyecto), true
FROM (VALUES
    ('Carné virtual', 'Comfenalco'),
    ('Movilización', 'Infoconsumo'),
    ('Tránsito local', 'Infoconsumo'),
    ('Registro de trazabilidad de lote', 'Gotrace')
) AS v(nombre, proyecto)
WHERE NOT EXISTS (
    SELECT 1 FROM tipos_solicitud t
    WHERE t.nombre = v.nombre AND t.proyecto_id = (SELECT id FROM proyectos WHERE nombre = v.proyecto)
);

-- Fixtures propios de los specs de tests/e2e (mismos datos que reset-gotrace-lote.sql, más el
-- usuario/ciudadano/empresa que ese script asume que ya existen en desarrollo).
--
-- id=21 explícito: los specs hardcodean USUARIO_E2E_ID=21 (igual que en desarrollo, donde este
-- usuario ya tiene ese id). Sin fijarlo, en una base de CI recién migrada sería la primera fila
-- de "usuarios" (id=1) — el mismatch rompe cualquier escritura que dependa de ese id, incluida
-- la auditoría automática (FK a usuarios), dejando el POST de "Radicar solicitud" fallando en
-- silencio y la navegación posterior sin ocurrir nunca.
INSERT INTO usuarios (id, nombre_completo, email, password_hash, activo, fecha_creacion)
SELECT 21, 'E2E Test Operador', 'e2e.comfenalco@sgds.test', '$2a$11$0VnRjxqYiBDVSXksyzWwjOOpoTVl.SnjQWs0pGC5X2iW3EIzErTuK', true, now()
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'e2e.comfenalco@sgds.test');

SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));

INSERT INTO ciudadanos (tipo_documento, numero_documento, nombre_completo, fecha_registro)
SELECT 'CC', '999888777', 'E2E Test Ciudadano', now()
WHERE NOT EXISTS (SELECT 1 FROM ciudadanos WHERE numero_documento = '999888777');

INSERT INTO empresas (nit, razon_social, fecha_registro)
SELECT '900999888', 'E2E Licorera de Prueba S.A.S', now()
WHERE NOT EXISTS (SELECT 1 FROM empresas WHERE nit = '900999888');

-- El lote de GoTrace SIEMPRE se crea nuevo (la prueba de la cadena lo consume al avanzarlo a
-- Infoconsumo) — en CI cada corrida parte de una base recién migrada, así que esto es seguro.
INSERT INTO solicitudes (proyecto_id, empresa_id, tipo_solicitud_id, estado, usuario_asignado_id, fecha_creacion)
SELECT
    (SELECT id FROM proyectos WHERE nombre = 'Gotrace'),
    (SELECT id FROM empresas WHERE nit = '900999888'),
    (SELECT id FROM tipos_solicitud WHERE nombre = 'Registro de trazabilidad de lote' AND proyecto_id = (SELECT id FROM proyectos WHERE nombre = 'Gotrace')),
    'Aprobada',
    (SELECT id FROM usuarios WHERE email = 'e2e.comfenalco@sgds.test'),
    now();

INSERT INTO lotes_gotrace (solicitud_id, producto, numero_lote, fecha_produccion, unidades_lote, modo_generacion_uid)
SELECT currval(pg_get_serial_sequence('solicitudes', 'id')), 'Ron Santander E2E', 'LOTE-E2E-CI-' || to_char(now(), 'YYYYMMDDHH24MISS'), now(), 500, 'Archivo';

COMMIT;
