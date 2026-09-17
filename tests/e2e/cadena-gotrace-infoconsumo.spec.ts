import { test, expect } from '@playwright/test';
import { loginComoOperador } from './helpers/auth';

// Flujo: vincular un lote de GoTrace ya Aprobado desde el wizard de Infoconsumo y confirmar que
// la solicitud resultante conserva el MISMO número de caso (mismo Id, solo cambia el prefijo del
// proyecto) — la regla central del rediseño "un caso, un SolicitudId" de esta sesión.
//
// Prerrequisitos de datos: correr tests/e2e/fixtures/reset-gotrace-lote.sql ANTES de cada
// corrida — la prueba consume el lote (lo avanza a Infoconsumo), así que no es reutilizable
// entre corridas. El script crea siempre un lote nuevo para la misma empresa fija de prueba:
//   - Usuario e2e.comfenalco@sgds.test (id 21).
//   - Empresa "E2E Licorera de Prueba S.A.S" (NIT 900999888).
// El número real del lote (GOTRACE-00XX) se lee de la UI, nunca se asume fijo.
const PROYECTO_GOTRACE_ID = 9;
const PROYECTO_INFOCONSUMO_ID = 8;
const USUARIO_E2E_ID = 21;
const NIT_EMPRESA_E2E = '900999888';

// Esta prueba consume un fixture único en la BD (el lote se avanza a Infoconsumo y deja de
// estar disponible) — si corre en varios navegadores/proyectos a la vez, compiten por el mismo
// lote y solo uno gana. Se restringe a chromium para evitar esa condición de carrera; correr los
// otros navegadores manualmente con --project=firefox tras resembrar el fixture si hace falta.
test.skip(({ browserName }) => browserName !== 'chromium', 'Evita condición de carrera por el fixture compartido — ver comentario arriba.');

test.beforeEach(async ({ page }) => {
  await loginComoOperador(page, {
    usuarioId: USUARIO_E2E_ID,
    email: 'e2e.comfenalco@sgds.test',
    nombreCompleto: 'E2E Test Operador',
    // Necesita Gotrace para que el lote aparezca en la búsqueda (todavía pertenece a ese
    // proyecto en este punto) e Infoconsumo para poder radicar ahí.
    proyectos: [PROYECTO_GOTRACE_ID, PROYECTO_INFOCONSUMO_ID],
  });
});

test('vincular un lote de GoTrace avanza la MISMA solicitud a Infoconsumo', async ({ page }) => {
  await page.goto(`/solicitudes/nueva?proyectoId=${PROYECTO_INFOCONSUMO_ID}`);

  // 1. Tipo de solicitud — mismo departamento origen/destino => "Tránsito local"
  await page.locator('label:has-text("Departamento de origen") + select').selectOption('Santander');
  await page.getByRole('button', { name: 'Ej: Zipaquirá' }).click();
  await page.getByPlaceholder('Filtrar municipios...').fill('Bucaramanga');
  await page.getByRole('button', { name: 'Bucaramanga', exact: true }).click();

  await page.locator('label:has-text("Departamento de destino") + select').selectOption('Santander');
  await page.getByRole('button', { name: 'Ej: Bucaramanga' }).click();
  await page.getByPlaceholder('Filtrar municipios...').fill('Floridablanca');
  await page.getByRole('button', { name: 'Floridablanca', exact: true }).click();

  await page.getByRole('button', { name: 'Tránsito local', exact: true }).click();

  // 2. Empresa productora — vincular el lote de GoTrace en vez de buscar la empresa a mano.
  // Se busca por NIT (estable entre corridas) y se lee el número real del resultado, en vez de
  // asumir un id fijo — cada corrida de reset-gotrace-lote.sql crea una solicitud nueva.
  await page.getByText('¿Esta empresa ya traza sus lotes en GoTrace?').click();
  await page.getByPlaceholder('Ej: GOTRACE-0012').fill(NIT_EMPRESA_E2E);
  const resultadoLote = page.getByText(/E2E Licorera de Prueba/);

  // Falla rápido y con un mensaje claro si el fixture ya se consumió, en vez de esperar el
  // timeout completo de la prueba y mostrar un error genérico de "elemento no encontrado".
  await expect(
    resultadoLote,
    'No apareció ningún lote Aprobado para la empresa E2E — corre tests/e2e/fixtures/reset-gotrace-lote.sql antes de esta prueba (cada corrida consume el lote).',
  ).toBeVisible({ timeout: 10_000 });

  const textoResultado = await resultadoLote.locator('xpath=..').textContent();
  const numeroGoTrace = textoResultado?.match(/GOTRACE-\d{4}/)?.[0];
  expect(numeroGoTrace).toBeTruthy();
  await resultadoLote.click();

  // 3. Producto gravado — el lote no tenía catálogo de GoTrace, así que categoría/subcategoría
  // quedan en blanco a propósito (ver clasificacionSinReconocer) y se eligen a mano.
  // Nota: las etiquetas de este formulario no usan <label for=...> (no hay id en los campos),
  // así que getByLabel no las asocia — se navega por hermano adyacente, igual que arriba.
  // text-is() en vez de has-text(): "Subcategoría..." contiene "Categoría..." como substring.
  await page.locator('label:text-is("Categoría del producto") + select').selectOption('Licores, Vinos, Aperitivos y Similares');
  await page.locator('label:text-is("Subcategoría del producto") + select').selectOption('Licores Destilados Nacionales');
  await page.locator('label:has-text("Grados alcoholimétricos") + input').fill('35');
  await page.locator('label:has-text("PVP certificado DANE") + input').fill('50000');

  // 4. Movilización
  await page.locator('label:has-text("Placa del vehículo") + input').fill('ABC123');

  await page.getByRole('button', { name: 'Radicar solicitud' }).click();
  await page.waitForURL(/\/solicitudes\/\d+$/);

  // Mismo sufijo numérico que el lote original — la prueba central: sigue siendo la MISMA solicitud.
  const numeroFinal = `INFOCONSUMO-${numeroGoTrace!.split('-')[1]}`;
  await expect(page.getByRole('heading', { name: new RegExp(`#${numeroFinal}`) })).toBeVisible();
  await expect(page.getByText('Infoconsumo', { exact: true }).first()).toBeVisible();
});
