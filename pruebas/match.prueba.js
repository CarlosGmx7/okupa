import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { esMatch, crearMatch, planDeLaSemana, semanaISO, validarTarjeta, cargarTarjetas, MAZOS } from '../js/modulos/match/logica.js';

const parejaDe = (lugar) => ({ codigo: 'ABC234', lugar, nombres: { a: 'Carlos', b: 'Yuli' } });
const dos = () => {
  const mundo = crearMundoFalso();
  return { mundo, a: crearMatch(mundo.nube('u1'), parejaDe('a')), b: crearMatch(mundo.nube('u2'), parejaDe('b')) };
};

prueba('match: sí+sí y sí+solo-si-quieres hacen match; el resto no', () => {
  igual(esMatch('si', 'si'), true);
  igual(esMatch('si', 'quizas'), true);
  igual(esMatch('quizas', 'si'), true);
  igual(esMatch('quizas', 'quizas'), false);
  igual(esMatch('si', 'no'), false);
  igual(esMatch('si', undefined), false);
});

prueba('match: si los dos dicen que sí, el segundo descubre el match y ambos lo ven', async () => {
  const { a, b } = dos();
  igual((await a.votar('mat-001', 'si')).match, false);
  igual((await b.votar('mat-001', 'quizas')).match, true);
  igual((await a.listarMatches()).map((m) => [m.id, m.hecho]), [['mat-001', false]]);
  igual((await b.listarMatches()).map((m) => m.id), ['mat-001']);
});

prueba('match: un "no" no deja rastro que el otro pueda leer', async () => {
  const { mundo, a, b } = dos();
  await a.votar('mat-002', 'no');
  igual(await mundo.nube('u2').leer('parejas/ABC234/match_si/mat-002_a'), null);
  igual((await b.votar('mat-002', 'si')).match, false);
  igual(await b.listarMatches(), []);
});

prueba('match: lo que vota cada uno se guarda aparte y sirve para saber qué falta', async () => {
  const { a, b } = dos();
  await a.votar('mat-001', 'si');
  await a.votar('mat-002', 'no');
  igual(await a.misVotos(), { 'mat-001': 'si', 'mat-002': 'no' });
  igual(await b.misVotos(), {});
  const tarjetas = ['mat-001', 'mat-002', 'mat-003'].map((id) => ({ id, mazo: 'citas', texto: id }));
  igual((await a.pendientes(tarjetas)).map((t) => t.id), ['mat-003']);
});

prueba('match: marcar "¡Lo hicimos!" lo saca del plan de la semana', async () => {
  const { a, b } = dos();
  await a.votar('mat-001', 'si'); await b.votar('mat-001', 'si');
  await a.votar('mat-002', 'si'); await b.votar('mat-002', 'si');
  await a.marcarHecho('mat-001', true);
  const matches = await b.listarMatches();
  igual(matches.find((m) => m.id === 'mat-001').hecho, true);
  for (let d = 1; d <= 28; d++) igual(planDeLaSemana(matches, `2026-02-${String(d).padStart(2, '0')}`), 'mat-002');
});

prueba('match: el plan es el mismo toda la semana y para los dos', () => {
  const matches = ['mat-004', 'mat-001', 'mat-009', 'mat-020'].map((id) => ({ id, hecho: false }));
  const lunes = planDeLaSemana(matches, '2026-11-09');
  for (const dia of ['2026-11-10', '2026-11-12', '2026-11-15']) igual(planDeLaSemana(matches, dia), lunes, dia);
  igual(planDeLaSemana([...matches].reverse(), '2026-11-11'), lunes);
  igual(planDeLaSemana([], '2026-11-11'), null);
});

prueba('match: semanaISO', () => {
  igual(semanaISO('2026-11-09'), '2026-W46');
  igual(semanaISO('2026-11-15'), '2026-W46');
  igual(semanaISO('2027-01-01'), '2026-W53');
});

prueba('match: tarjetas propias, sin autor, con sí automático de quien la crea', async () => {
  const { mundo, a, b } = dos();
  const r = await a.crearTarjeta({ mazo: 'retos', texto: '  Bailar salsa en la sala a medianoche  ' });
  verdadero(r.ok, r.error);
  const propias = await b.tarjetasPropias();
  igual(propias.map((t) => [t.mazo, t.texto]), [['retos', 'Bailar salsa en la sala a medianoche']]);
  igual(Object.keys(propias[0]).sort(), ['creadaMs', 'id', 'mazo', 'propia', 'texto']);
  igual((await a.misVotos())[r.id], 'si');
  igual((await b.votar(r.id, 'si')).match, true);
  verdadero(await mundo.nube('u1').leer(`parejas/ABC234/match_matches/${r.id}`));
});

prueba('match: validarTarjeta revisa mazo y largo', () => {
  igual(validarTarjeta({ mazo: 'citas', texto: 'Picnic en el parque' }), null);
  verdadero(typeof validarTarjeta({ mazo: 'nada', texto: 'Picnic en el parque' }) === 'string');
  verdadero(typeof validarTarjeta({ mazo: 'citas', texto: 'ab' }) === 'string');
  verdadero(typeof validarTarjeta({ mazo: 'citas', texto: 'x'.repeat(141) }) === 'string');
});

prueba('match: contenido incluido con ≥ 20 tarjetas por mazo, ids únicos y válidas', async () => {
  const tarjetas = await cargarTarjetas();
  verdadero(tarjetas.length >= 140, `${tarjetas.length}`);
  igual(new Set(tarjetas.map((t) => t.id)).size, tarjetas.length);
  for (const m of MAZOS) verdadero(tarjetas.filter((t) => t.mazo === m.id).length >= 20, m.id);
  for (const t of tarjetas) {
    igual(validarTarjeta(t), null, t.id);
    verdadero(/^mat-\d{3}$/.test(t.id), t.id);
  }
});
