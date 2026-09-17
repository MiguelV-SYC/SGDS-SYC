\set ON_ERROR_STOP on
BEGIN;

-- Cada corrida de la prueba E2E de la cadena consume el lote (lo avanza a Infoconsumo), así que
-- este script SIEMPRE crea uno nuevo, listo para volver a vincular — pensado para correrse antes
-- de cada ejecución de tests/e2e/cadena-gotrace-infoconsumo.spec.ts.
INSERT INTO solicitudes (proyecto_id, empresa_id, tipo_solicitud_id, estado, usuario_asignado_id, fecha_creacion)
SELECT
  (SELECT id FROM proyectos WHERE nombre = 'Gotrace'),
  (SELECT id FROM empresas WHERE nit = '900999888'),
  (SELECT id FROM tipos_solicitud WHERE nombre = 'Registro de trazabilidad de lote' AND proyecto_id = (SELECT id FROM proyectos WHERE nombre = 'Gotrace')),
  'Aprobada',
  (SELECT id FROM usuarios WHERE email = 'e2e.comfenalco@sgds.test'),
  now();

INSERT INTO lotes_gotrace (solicitud_id, producto, numero_lote, fecha_produccion, unidades_lote, modo_generacion_uid)
SELECT currval(pg_get_serial_sequence('solicitudes','id')), 'Ron Santander E2E', 'LOTE-E2E-' || to_char(now(), 'YYYYMMDDHH24MISS'), now(), 500, 'Archivo';

COMMIT;
