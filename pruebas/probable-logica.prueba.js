import { prueba, igual, verdadero } from './corredor.js';
import {
  TEMAS, LARGOS, MAX_PROPIAS, validarFrase, elegirFrases, marcarVistas,
  opcionesVoto, votaronTodos, reveladas, coincidieron, resumen,
} from '../js/modulos/probable/logica.js';

// Generador determinista (LCG)
const semilla = (s) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const frases = (n) => Array.from({ length: n }, (_, i) => ({ id: `f${i}`, texto: `frase ${i}` }));

prueba('probable: constantes', () => {
  igual(TEMAS.map((t) => t.id), ['divertidas', 'romanticas', 'picantes', 'futuro', 'costumbres', 'nuestras']);
  igual(TEMAS.map((t) => t.nombre), ['Divertidas', 'Románticas', 'Picantes', 'Futuro', 'Costumbres', 'Nuestras frases']);
  igual(TEMAS.map((t) => t.icono), ['☺', '♡', '❦', '✧', '⌂', '✎']);
  igual(LARGOS, [5, 10, 20]);
  igual(MAX_PROPIAS, 200);
});

prueba('probable: validarFrase', () => {
  igual(validarFrase('hola'), 'Escribe la frase (mínimo 5 caracteres).');
  igual(validarFrase('     '), 'Escribe la frase (mínimo 5 caracteres).');
  igual(validarFrase('a'.repeat(121)), 'Máximo 120 caracteres.');
  igual(validarFrase('a'.repeat(120)), null);
  igual(validarFrase('  se ríe en un velorio '), null);
});

prueba('probable: elegirFrases prioriza no vistas y completa con vistas', () => {
  const tema = frases(10);
  const vistas = tema.slice(0, 7).map((f) => f.id);
  const r = elegirFrases(tema, vistas, 5, semilla(3));
  igual(r.length, 5);
  igual(new Set(r.map((f) => f.id)).size, 5);
  const ids = r.map((f) => f.id);
  for (const id of ['f7', 'f8', 'f9']) verdadero(ids.includes(id), `falta ${id}`);
  igual(ids.filter((id) => vistas.includes(id)).length, 2);
});

prueba('probable: elegirFrases con pocas frases o ninguna', () => {
  igual(elegirFrases(frases(3), [], 10, semilla(1)).length, 3);
  igual(elegirFrases([], [], 10, semilla(1)), []);
  const r = elegirFrases(frases(8), [], 5, semilla(9));
  igual(new Set(r.map((f) => f.id)).size, 5);
});

prueba('probable: marcarVistas', () => {
  igual(marcarVistas(['x'], ['y'], ['x', 'y', 'z']), ['x', 'y']);
  igual(marcarVistas(['x', 'y'], ['z'], ['x', 'y', 'z']), []);
  igual(marcarVistas(['x'], ['x'], ['x', 'y']), ['x']);
});

prueba('probable: opcionesVoto', () => {
  igual(opcionesVoto({ a: 'Carlos', b: 'Sofi' }, 'a').map((o) => o.texto), ['Carlos', 'Sofi', 'Los dos']);
  igual(opcionesVoto({ a: 'Carlos', b: null }, 'a').map((o) => o.texto), ['Carlos', 'Tu pareja', 'Los dos']);
  igual(opcionesVoto({ a: null, b: 'Sofi' }, 'a').map((o) => o.texto), ['Yo', 'Sofi', 'Los dos']);
  igual(opcionesVoto({ a: 'Carlos', b: 'Sofi' }, 'a').map((o) => o.valor), ['a', 'b', 'todos']);
});

prueba('probable: votaronTodos y reveladas', () => {
  const sala = { frases: frases(5), votaron: { 0: { a: true, b: true }, 1: { a: true } } };
  verdadero(votaronTodos(sala, 0));
  verdadero(!votaronTodos(sala, 1));
  verdadero(!votaronTodos(sala, 2));
  verdadero(!votaronTodos({}, 0));
  igual(reveladas(sala, ['a', 'b']), 1);
  igual(reveladas({ frases: frases(5) }, ['a', 'b']), 0);
});

prueba('probable: coincidieron', () => {
  verdadero(coincidieron({ a: 'a', b: 'a' }));
  verdadero(coincidieron({ a: 'todos', b: 'todos' }));
  verdadero(!coincidieron({ a: 'a', b: 'todos' }));
  verdadero(!coincidieron({ a: 'a' }));
});

prueba('probable: resumen', () => {
  igual(
    resumen([{ a: 'a', b: 'a' }, { a: 'todos', b: 'b' }], ['a', 'b']),
    { total: 2, coincidencias: 1, elegido: { a: 2, b: 2 } },
  );
});
