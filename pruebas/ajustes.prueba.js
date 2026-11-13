import { prueba, igual } from './corredor.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { AJUSTES_DEFECTO, leerAjustes, cambiarAjuste, alCambiarAjustes } from '../js/nucleo/ajustes.js';

prueba('ajustes: sin nada guardado da los valores por defecto', () => {
  igual(leerAjustes(almacenEnMemoria()), { tema: 'vino', sonidos: true, vibracion: true });
});

prueba('ajustes: datos dañados vuelven al defecto', () => {
  for (const malo of [null, [], 'x', { tema: 'rojo', sonidos: 'si' }]) {
    const a = almacenEnMemoria();
    a.escribir('okupa:ajustes', malo);
    igual(leerAjustes(a), AJUSTES_DEFECTO, JSON.stringify(malo));
  }
});

prueba('ajustes: conserva los campos válidos', () => {
  const a = almacenEnMemoria();
  a.escribir('okupa:ajustes', { tema: 'grafito', sonidos: 7 });
  igual(leerAjustes(a), { tema: 'grafito', sonidos: true, vibracion: true });
});

prueba('ajustes: cambiarAjuste guarda y avisa', () => {
  const a = almacenEnMemoria();
  let recibido = null;
  const quitar = alCambiarAjustes((x) => { recibido = x; });
  cambiarAjuste(a, 'tema', 'grafito');
  quitar();
  igual(a.leer('okupa:ajustes').tema, 'grafito');
  igual(recibido?.tema, 'grafito');
});

prueba('ajustes: cambiarAjuste ignora valores inválidos', () => {
  const a = almacenEnMemoria();
  cambiarAjuste(a, 'tema', 'rojo');
  cambiarAjuste(a, 'nada', 1);
  cambiarAjuste(a, 'sonidos', 'no');
  igual(leerAjustes(a), AJUSTES_DEFECTO);
});
