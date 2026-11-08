import { prueba, igual, verdadero } from './corredor.js';
import { cargarTrivia, elegirPartida, marcarVistas, TEMAS_BANCO } from '../js/modulos/trivia/banco.js';
import { semilla } from './matematicas.prueba.js';

const { vocabulario } = await cargarTrivia();
const PREFIJO = { arte: 'art', historia: 'his', ciencia: 'cie', deportes: 'dep', canserbero: 'can', lana: 'lan' };

// Bancos chicos de prueba: `n` preguntas V/F por tema.
function bancosDe(n, { lana = n } = {}) {
  return Object.fromEntries(TEMAS_BANCO.map((tema) => [tema, Array.from({ length: tema === 'lana' ? lana : n }, (_, i) => ({
    id: `${PREFIJO[tema]}-${String(i + 1).padStart(3, '0')}`, tema, tipo: 'vf', texto: `${tema} ${i + 1}`, respuesta: i % 2 === 0, dato: 'd', ref: 'r',
  }))]));
}
const porTema = (preguntas) => preguntas.reduce((m, p) => ({ ...m, [p.tema]: (m[p.tema] || 0) + 1 }), {});

prueba('selección: 10 preguntas sin repetir, ≤ 2 por tema y todos los temas de banco', () => {
  for (let s = 1; s <= 40; s++) {
    const partida = elegirPartida({ bancos: bancosDe(5), vocabulario, rnd: semilla(s) });
    igual(partida.length, 10);
    igual(new Set(partida.map((p) => p.id)).size, 10, `semilla ${s}: ids repetidos`);
    const conteo = porTema(partida);
    verdadero(Object.values(conteo).every((n) => n <= 2), `semilla ${s}: ${JSON.stringify(conteo)}`);
    for (const tema of [...TEMAS_BANCO, 'matematicas', 'ingles']) verdadero(conteo[tema] >= 1, `semilla ${s}: falta ${tema}`);
  }
});

// Bancos con `n` normales y `n` fáciles por tema.
function bancosMixtos(n) {
  const b = bancosDe(2 * n);
  for (const lista of Object.values(b)) lista.forEach((p, i) => { if (i % 2) p.nivel = 'facil'; });
  return b;
}

prueba('selección: cada partida trae 7 fáciles y 3 normales', () => {
  for (let s = 1; s <= 30; s++) {
    const partida = elegirPartida({ bancos: bancosMixtos(5), vocabulario, rnd: semilla(s) });
    igual(partida.length, 10);
    const faciles = partida.filter((p) => p.nivel === 'facil');
    igual([faciles.length, partida.filter((p) => p.nivel === 'normal').length], [7, 3], `semilla ${s}`);
    const banco = bancosMixtos(5);
    for (const p of partida.filter((x) => x.tema !== 'matematicas' && x.tema !== 'ingles')) {
      const original = banco[p.tema].find((x) => x.id === p.id);
      igual(original.nivel === 'facil' ? 'facil' : 'normal', p.nivel, `${p.id} quedó con el nivel equivocado`);
    }
  }
});

prueba('selección: si un tema no tiene fáciles, usa las que hay', () => {
  const partida = elegirPartida({ bancos: bancosDe(5), vocabulario, rnd: semilla(3) });
  igual(partida.length, 10);
  igual(new Set(partida.map((p) => p.id)).size, 10);
});

prueba('selección: prefiere las que no han salido', () => {
  const bancos = bancosDe(3);
  const vistas = Object.fromEntries(TEMAS_BANCO.map((t) => [t, [`${PREFIJO[t]}-001`, `${PREFIJO[t]}-002`]]));
  const partida = elegirPartida({ bancos, vocabulario, vistas, rnd: semilla(9) });
  for (const t of TEMAS_BANCO) verdadero(partida.some((p) => p.id === `${PREFIJO[t]}-003`), `${t}: no salió la nueva`);
});

prueba('selección: con el banco agotado vuelven primero las falladas y luego las más antiguas', () => {
  const bancos = bancosDe(3);
  const vistas = { arte: ['art-001', 'art-002', 'art-003'] };
  for (let s = 1; s <= 15; s++) {
    const arte = elegirPartida({ bancos, vocabulario, vistas, fallidas: ['art-003'], rnd: semilla(s) }).filter((p) => p.tema === 'arte').map((p) => p.id);
    verdadero(arte.includes('art-003'), `semilla ${s}: no volvió la fallada (${arte})`);
    verdadero(arte.every((id) => ['art-003', 'art-001'].includes(id)), `semilla ${s}: ${arte}`);
  }
  for (let s = 1; s <= 15; s++) {
    const arte = elegirPartida({ bancos, vocabulario, vistas, rnd: semilla(s) }).filter((p) => p.tema === 'arte').map((p) => p.id);
    verdadero(arte.includes('art-001') && arte.every((id) => ['art-001', 'art-002'].includes(id)), `semilla ${s}: ${arte}`);
  }
});

prueba('selección: un tema con una sola pregunta no se repite dentro de la partida', () => {
  for (let s = 1; s <= 40; s++) {
    const partida = elegirPartida({ bancos: bancosDe(5, { lana: 1 }), vocabulario, rnd: semilla(s) });
    igual(partida.length, 10);
    igual(new Set(partida.map((p) => p.id)).size, 10, `semilla ${s}`);
  }
});

prueba('selección: marcarVistas guarda lo nuevo al final, inglés por entrada y nada de matemáticas', () => {
  const antes = { arte: ['art-001', 'art-002'] };
  const despues = marcarVistas(antes, [
    { id: 'art-001', tema: 'arte' }, { id: 'his-004', tema: 'historia' },
    { id: 'en-0007-es_en', tema: 'ingles', entrada: 'en-0007' }, { id: 'mat-raiz-144', tema: 'matematicas' },
  ]);
  igual(despues, { arte: ['art-002', 'art-001'], historia: ['his-004'], ingles: ['en-0007'] });
  igual(antes, { arte: ['art-001', 'art-002'] }, 'no muta');
});
