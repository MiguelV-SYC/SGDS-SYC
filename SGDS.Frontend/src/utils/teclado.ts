import type { KeyboardEvent } from 'react';

// Para elementos no nativos (div/tr) que actúan como botón: los hace operables con Enter/Espacio.
export const alPresionarEnterOEspacio = (accion: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    accion();
  }
};
