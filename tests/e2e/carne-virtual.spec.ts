import { test, expect } from '@playwright/test';
import { loginComoOperador } from './helpers/auth';

// Flujo: login (bypass de reCAPTCHA vía JWT inyectado) -> nueva solicitud de Carné virtual en
// Comfenalco -> radicar -> previsualización con código de barras y categoría calculada.
//
// Prerrequisitos de datos (ver Reglas_de_Negocio.MD, sección E2E, o correr el seed una vez):
//   - Usuario e2e.comfenalco@sgds.test (id 21) con rol Operador en Comfenalco (proyecto 1).
//   - Ciudadano con documento 999888777 ("E2E Test Ciudadano").
const PROYECTO_COMFENALCO_ID = 1;
const USUARIO_E2E_ID = 21;

test.beforeEach(async ({ page }) => {
  await loginComoOperador(page, {
    usuarioId: USUARIO_E2E_ID,
    email: 'e2e.comfenalco@sgds.test',
    nombreCompleto: 'E2E Test Operador',
    proyectos: [PROYECTO_COMFENALCO_ID],
  });
});

test('radicar Carné virtual y ver la previsualización con código de barras', async ({ page }) => {
  // Diagnóstico: el frontend traga el error de esta petición con .catch(() => {}), así que sin
  // esto no hay forma de ver por qué la imagen nunca aparece — se imprime al log de la corrida.
  page.on('response', async (response) => {
    if (response.url().includes('carne-virtual-barcode') && !response.ok()) {
      console.log(`[barcode] ${response.status()} ${response.url()}`);
      console.log(await response.text().catch(() => '(sin cuerpo)'));
    }
  });

  await page.goto(`/solicitudes/nueva?proyectoId=${PROYECTO_COMFENALCO_ID}`);

  // 1. Tipo de solicitud
  await page.getByRole('button', { name: 'Carné virtual', exact: true }).click();

  // 2. Afiliado — buscar y seleccionar el ciudadano sembrado
  await page.getByPlaceholder('1098765432').fill('999888777');
  await page.getByRole('button', { name: /E2E Test Ciudadano/ }).click();

  // 3. Carné virtual — estado ya nace en "Activo" (RN-CV-001), solo falta el ingreso
  await page.getByPlaceholder('$ 0').fill('3000000');
  await expect(page.getByText(/Categoría [ABC]/)).toBeVisible();

  await page.getByRole('button', { name: 'Radicar solicitud' }).click();

  // Redirige al detalle de la solicitud recién creada
  await page.waitForURL(/\/solicitudes\/\d+$/);

  await page.getByRole('button', { name: 'Carné virtual' }).click();
  await page.waitForURL(/\/solicitudes\/\d+\/carne-virtual$/);

  await expect(page.getByRole('heading', { name: /Carné virtual — E2E Test Ciudadano/ })).toBeVisible();
  await expect(page.getByText(/Categoría [ABC] \(/)).toBeVisible();
  await expect(page.getByAltText('Código de barras')).toBeVisible();
});
