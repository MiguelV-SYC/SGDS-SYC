\set ON_ERROR_STOP on
BEGIN;

-- Datos de catálogo mínimos que en desarrollo se crearon a mano desde el panel de Admin (no
-- existen como seed de EF Core) — sin esto, una base de CI recién migrada no tiene ni siquiera
-- los Proyectos/TiposSolicitud que los controllers buscan por nombre.
INSERT INTO proyectos (nombre, codigo, activo)
SELECT v.nombre, v.codigo, true
FROM (VALUES ('Comfenalco', 'COMFENALCO'), ('Infoconsumo', 'INFOCONSUMO'), ('Gotrace', 'GOTRACE')) AS v(nombre, codigo)
WHERE NOT EXISTS (SELECT 1 FROM proyectos p WHERE p.nombre = v.nombre);

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
INSERT INTO usuarios (nombre_completo, email, password_hash, activo, fecha_creacion)
SELECT 'E2E Test Operador', 'e2e.comfenalco@sgds.test', '$2a$11$0VnRjxqYiBDVSXksyzWwjOOpoTVl.SnjQWs0pGC5X2iW3EIzErTuK', true, now()
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'e2e.comfenalco@sgds.test');

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
