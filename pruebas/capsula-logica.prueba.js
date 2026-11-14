import { prueba, igual } from './corredor.js';
import { MAX_CARTAS, MAX_TEXTO, MAX_DIAS, diasHasta, estaAbierta, avisosCapsulas, unirAvisos, detalleInicio } from '../js/modulos/capsula/logica.js';

const c = (id, de, abreEl) => ({ id, de, abreEl, abreMs: 0, creadaMs: 0 });
const N = { a: 'Carlos', b: 'Yuli' };

prueba('capsula: constantes', () => {
  igual([MAX_CARTAS, MAX_TEXTO, MAX_DIAS], [50, 2000, 3652]);
});
prueba('capsula: diasHasta y estaAbierta', () => {
  igual(diasHasta('2027-01-01', '2026-12-31'), 1);
  igual(diasHasta('2026-12-31', '2026-12-31'), 0);
  igual(diasHasta('2026-12-30', '2026-12-31'), -1);
  igual(estaAbierta(c('c-aaaa', 'a', '2026-12-31'), '2026-12-31'), true);
  igual(estaAbierta(c('c-aaaa', 'a', '2027-01-01'), '2026-12-31'), false);
});
prueba('capsula: avisos solo al que no la escribió y solo el día exacto', () => {
  const cartas = [c('c-aaaa', 'a', '2026-12-31'), c('c-bbbb', 'b', '2026-12-31'), c('c-cccc', 'a', '2027-01-01')];
  igual(avisosCapsulas(cartas, '2026-12-31', 'b', N), ['Hoy puedes abrir la carta de Carlos 💌']);
  igual(avisosCapsulas(cartas, '2026-12-31', 'a', N), ['Hoy puedes abrir la carta de Yuli 💌']);
  igual(avisosCapsulas(cartas, '2026-12-30', 'b', N), []);
});
prueba('capsula: aviso sin nombre dice de tu pareja', () => {
  igual(avisosCapsulas([c('c-aaaa', 'a', '2026-12-31')], '2026-12-31', 'b', {}), ['Hoy puedes abrir la carta de tu pareja 💌']);
});
prueba('capsula: unirAvisos', () => {
  igual(unirAvisos(null, []), null);
  igual(unirAvisos({ titulo: 'X', texto: 'Y' }, []), { titulo: 'X', texto: 'Y', ruta: '#/fechas' });
  igual(
    unirAvisos({ titulo: 'Hoy es el cumpleaños de Yuli 🎂', texto: 'Entra a ver sus fechas.' }, ['Hoy puedes abrir la carta de Carlos 💌']),
    { titulo: 'Hoy puedes abrir la carta de Carlos 💌', texto: 'Hoy es el cumpleaños de Yuli 🎂', ruta: '#/capsula' },
  );
  igual(unirAvisos(null, ['A', 'B']), { titulo: 'A', texto: 'B', ruta: '#/capsula' });
  igual(unirAvisos(null, ['A']), { titulo: 'A', texto: 'Entra a leerla.', ruta: '#/capsula' });
});
prueba('capsula: detalleInicio', () => {
  const hoy = '2026-12-31';
  igual(detalleInicio([c('c-aaaa', 'a', hoy)], 'b', hoy), 'Tienes una carta para abrir');
  igual(detalleInicio([c('c-aaaa', 'a', '2027-01-01')], 'b', hoy), 'Próxima carta mañana');
  igual(detalleInicio([c('c-aaaa', 'a', '2027-01-10'), c('c-bbbb', 'a', '2027-01-05')], 'b', hoy), 'Próxima carta en 5 días');
  igual(detalleInicio([c('c-aaaa', 'b', hoy)], 'b', hoy), 'Escríbanse una carta');
  igual(detalleInicio([], 'b', hoy), 'Escríbanse una carta');
});
