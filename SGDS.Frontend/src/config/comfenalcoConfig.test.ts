import { describe, it, expect } from 'vitest';
import { calcularCategoriaCarne, calcularCuotaCredito, aniosAportes } from './comfenalcoConfig';

describe('calcularCategoriaCarne', () => {
  // Mismos límites que ReglasComfenalco.CalcularCategoriaCarne en el backend (SmmlvVigente = 1.423.500)
  it.each([
    [1_000_000, 'A'],
    [2_847_000, 'A'],   // exactamente 2 SMMLV
    [2_847_001, 'B'],
    [5_694_000, 'B'],   // exactamente 4 SMMLV
    [5_694_001, 'C'],
  ])('%i ingresos -> categoría %s', (ingresos, esperado) => {
    expect(calcularCategoriaCarne(ingresos)).toBe(esperado);
  });
});

describe('calcularCuotaCredito', () => {
  it('caso de referencia: 10.000.000 a 12 meses al 20% E.A.', () => {
    const { cuota } = calcularCuotaCredito(10_000_000, 12, 0.20);
    // tasa mensual = 1.20^(1/12) - 1 ≈ 0.0153095; cuota ≈ 918.568,23 (verificado con Node, no a mano)
    expect(cuota).toBeCloseTo(918_568.23, 1);
  });

  it('tasa 0% usa división simple, no la fórmula francesa', () => {
    const { cuota } = calcularCuotaCredito(1_200_000, 12, 0);
    expect(cuota).toBe(100_000);
  });
});

describe('aniosAportes', () => {
  it('devuelve el año actual y los 3 anteriores', () => {
    expect(aniosAportes(new Date('2026-09-15'))).toEqual([2026, 2025, 2024, 2023]);
  });
});
