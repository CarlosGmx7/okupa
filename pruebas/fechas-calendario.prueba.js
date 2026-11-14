import { prueba, igual, verdadero } from './corredor.js';
import { diasJuntos, esHito, eventosDelDia, proximas, textoEvento, notificacionDelDia } from '../js/modulos/fechas/calendario.js';

const F = [
  { id: 'inicio', tipo: 'inicio', fecha: '2024-01-01' },
  { id: 'cumple_a', tipo: 'cumple', fecha: '1995-03-10', de: 'a' },
  { id: 'cumple_b', tipo: 'cumple', fecha: '1996-02-29', de: 'b' },
  { id: 'f-1', tipo: 'otra', fecha: '2024-06-15', nombre: 'Primer viaje' },
];
// Ojo: con inicio 2024-01-01, el 2026-03-10 es también el hito de 800 días.
const SIN_INICIO = F.filter((f) => f.tipo !== 'inicio');
const N = { a: 'Carlos', b: 'Yuli' };
prueba('calendario: diasJuntos cuenta el día de inicio como 1', () => {
  igual(diasJuntos('2024-01-01', '2024-01-01'), 1);
  igual(diasJuntos('2024-01-01', '2024-04-09'), 100);
  igual(diasJuntos('2024-01-02', '2024-01-01'), null);
  igual(diasJuntos(undefined, '2024-01-01'), null);
});
prueba('calendario: hitos 100..1000 y luego cada 500', () => {
  igual([100, 300, 1000, 1500, 2000].every(esHito), true);
  igual([99, 150, 1100, 1250].some(esHito), false);
});
prueba('calendario: cumple usa mes y día de cada año', () => {
  const ev = eventosDelDia(F, '2026-03-10');
  igual(ev.map((e) => e.clase), ['cumple', 'hito']);
  igual([ev[0].anios, ev[1].dias], [31, 800]);
});
prueba('calendario: 29 de febrero cae el 28 en año no bisiesto', () => {
  igual(eventosDelDia(F, '2026-02-28').map((e) => e.id), ['cumple_b']);
  igual(eventosDelDia(F, '2028-02-28').map((e) => e.id), []);
});
prueba('calendario: aniversario de años gana a la mensual', () => {
  igual(eventosDelDia(F, '2025-01-01').map((e) => [e.clase, e.anios]), [['aniversario', 1]]);
  igual(eventosDelDia(F, '2025-04-01').map((e) => [e.clase, e.meses]), [['mensual', 15]]);
});
prueba('calendario: mensual en día 31 cae el último del mes', () => {
  const f = [{ id: 'inicio', tipo: 'inicio', fecha: '2024-01-31' }];
  igual(eventosDelDia(f, '2024-02-29').map((e) => e.clase), ['mensual']);
});
prueba('calendario: hito y prioridad cuando coinciden', () => {
  // 2024-01-01 + 99 días = 2024-04-09 (hito 100)
  igual(eventosDelDia(F, '2024-04-09').map((e) => [e.clase, e.dias]), [['hito', 100]]);
});
prueba('calendario: textos', () => {
  const [c] = eventosDelDia(F, '2026-03-10');
  igual(textoEvento(c, N, 'hoy'), 'Hoy es el cumpleaños de Carlos 🎂');
  igual(textoEvento(c, N, 'semana'), 'En una semana: cumpleaños de Carlos');
  igual(textoEvento({ clase: 'aniversario', anios: 2 }, N, 'hoy'), 'Hoy cumplen 2 años juntos');
  igual(textoEvento({ clase: 'aniversario', anios: 1 }, N, 'semana'), 'En una semana cumplen 1 año juntos');
  igual(textoEvento({ clase: 'mensual', meses: 15 }, N, 'hoy'), 'Hoy cumplen 1 año y 3 meses');
  igual(textoEvento({ clase: 'mensual', meses: 1 }, N, 'hoy'), 'Hoy cumplen 1 mes');
  igual(textoEvento({ clase: 'hito', dias: 1000 }, N, 'hoy'), 'Hoy cumplen 1.000 días juntos');
  igual(textoEvento({ clase: 'otra', nombre: 'Primer viaje' }, N, 'semana'), 'En una semana: Primer viaje');
  igual(textoEvento({ clase: 'cumple', de: 'b' }, {}, 'hoy'), 'Hoy es el cumpleaños de tu pareja 🎂');
});
prueba('calendario: la semana antes del cumple no le llega al cumpleañero', () => {
  igual(notificacionDelDia(SIN_INICIO, '2026-03-03', 'a', N), null);
  igual(notificacionDelDia(SIN_INICIO, '2026-03-03', 'b', N), { titulo: 'En una semana: cumpleaños de Carlos', texto: 'Entra a ver sus fechas.' });
  igual(notificacionDelDia(SIN_INICIO, '2026-03-10', 'a', N).titulo, '¡Feliz cumpleaños! 🎂');
  igual(notificacionDelDia(SIN_INICIO, '2026-03-10', 'b', N).titulo, 'Hoy es el cumpleaños de Carlos 🎂');
  // Con inicio, a 'a' le llega solo el hito de la semana siguiente, no su propio cumple.
  igual(notificacionDelDia(F, '2026-03-03', 'a', N), { titulo: 'En una semana cumplen 800 días juntos', texto: 'Entra a ver sus fechas.' });
});
prueba('calendario: mensual no avisa una semana antes', () => {
  igual(notificacionDelDia(F, '2025-03-25', 'a', N), null); // 7 días antes de la mensual 2025-04-01
});
prueba('calendario: varias en una notificación, la más importante de título', () => {
  const f = [...SIN_INICIO, { id: 'f-2', tipo: 'otra', fecha: '2020-03-10', nombre: 'Día del gato' }];
  igual(notificacionDelDia(f, '2026-03-10', 'b', N), { titulo: 'Hoy es el cumpleaños de Carlos 🎂', texto: 'Hoy: Día del gato' });
  igual(notificacionDelDia([...f, F[0]], '2026-03-10', 'b', N).texto, 'Hoy: Día del gato · Hoy cumplen 800 días juntos');
});
prueba('calendario: aviso de 7 días cruza el año', () => {
  const f = [{ id: 'f-3', tipo: 'otra', fecha: '2019-01-02', nombre: 'Nos conocimos' }];
  igual(notificacionDelDia(f, '2026-12-26', 'a', N).titulo, 'En una semana: Nos conocimos');
});
prueba('calendario: notificacionDelDia sin fechas', () => {
  igual(notificacionDelDia([], '2026-03-10', 'a', {}), null);
});
prueba('calendario: proximas ordena por días que faltan', () => {
  const p = proximas(F, '2026-03-05');
  // cumple_a y el hito 800 caen el 10 (empate: gana la prioridad); la mensual, el 1 de abril.
  igual(p.slice(0, 3).map((e) => [e.id, e.clase, e.faltan]), [['cumple_a', 'cumple', 5], ['inicio', 'hito', 5], ['inicio', 'mensual', 27]]);
  verdadero(p.every((e, i) => i === 0 || p[i - 1].faltan <= e.faltan));
});

const OTRA_FIN = [{ id: 'f-9', tipo: 'otra', fecha: '2026-12-20', nombre: 'Fin de año' }];
prueba('calendario: una otra de este año cuenta en su propio año', () => {
  igual(eventosDelDia(OTRA_FIN, '2026-12-20').map((e) => [e.clase, e.nombre, e.anios]), [['otra', 'Fin de año', 0]]);
  igual(eventosDelDia(OTRA_FIN, '2027-12-20').map((e) => e.anios), [1]);
  igual(eventosDelDia(OTRA_FIN, '2025-12-20'), [], 'antes del año original no cuenta');
});
prueba('calendario: el día de nacimiento no es un cumpleaños', () => {
  const c = [{ id: 'cumple_a', tipo: 'cumple', fecha: '2000-05-05', de: 'a' }];
  igual(eventosDelDia(c, '2000-05-05'), []);
  igual(eventosDelDia(c, '2001-05-05').map((e) => e.anios), [1]);
});
prueba('calendario: proximas muestra la otra que cae más tarde este año', () => {
  const [p] = proximas(OTRA_FIN, '2026-11-13');
  igual([p.clase, p.dia, p.faltan], ['otra', '2026-12-20', 37]);
});
prueba('calendario: notificacionDelDia avisa de una otra de este año', () => {
  igual(notificacionDelDia(OTRA_FIN, '2026-12-13', 'a', N).titulo, 'En una semana: Fin de año');
  igual(notificacionDelDia(OTRA_FIN, '2026-12-20', 'a', N).titulo, 'Hoy: Fin de año');
});
prueba('calendario: proximas cruza el año', () => {
  const f = [{ id: 'f-8', tipo: 'otra', fecha: '2020-01-01', nombre: 'Año nuevo' }];
  igual(proximas(f, '2026-12-31').map((e) => [e.dia, e.faltan]), [['2027-01-01', 1]]);
  igual(proximas(f, '2027-01-01').map((e) => [e.dia, e.faltan]), [['2027-01-01', 0]]);
  igual(proximas(f, '2027-01-02').map((e) => [e.dia, e.faltan]), [['2028-01-01', 364]]);
});
prueba('calendario: proximas con cumple del 29 de febrero', () => {
  const c = [{ id: 'cumple_b', tipo: 'cumple', fecha: '1996-02-29', de: 'b' }];
  igual(proximas(c, '2026-11-13').map((e) => [e.dia, e.anios, e.faltan]), [['2027-02-28', 31, 107]]);
  igual(proximas(c, '2027-11-13').map((e) => [e.dia, e.anios]), [['2028-02-29', 32]]);
});
prueba('calendario: proximas con un hito mayor a 1000', () => {
  const f = [{ id: 'inicio', tipo: 'inicio', fecha: '2023-01-01' }];
  // 2026-01-05 es el día 1101: el siguiente hito es 1500.
  const h = proximas(f, '2026-01-05').find((e) => e.clase === 'hito');
  igual([h.dias, h.dia, h.faltan], [1500, '2027-02-08', 399]);
});
prueba('calendario: el día de su cumpleaños la persona recibe un saludo', () => {
  igual(notificacionDelDia(SIN_INICIO, '2026-03-10', 'a', N).titulo, '¡Feliz cumpleaños! 🎂');
  igual(notificacionDelDia(SIN_INICIO, '2026-03-10', 'b', N).titulo, 'Hoy es el cumpleaños de Carlos 🎂');
  igual(textoEvento({ clase: 'cumple', de: 'a' }, N, 'hoy', 'a'), '¡Feliz cumpleaños! 🎂');
});
