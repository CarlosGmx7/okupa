// Lógica pura de «¿Quién es más probable?». Sin DOM ni Firebase.

export const TEMAS = [
  { id: 'divertidas', nombre: 'Divertidas', icono: '☺' },
  { id: 'romanticas', nombre: 'Románticas', icono: '♡' },
  { id: 'picantes', nombre: 'Picantes', icono: '❦' },
  { id: 'futuro', nombre: 'Futuro', icono: '✧' },
  { id: 'costumbres', nombre: 'Costumbres', icono: '⌂' },
  { id: 'nuestras', nombre: 'Nuestras frases', icono: '✎' },
];

export const LARGOS = [5, 10, 20];
export const MAX_PROPIAS = 200;

const MIN_TEXTO = 5;
const MAX_TEXTO = 120;

export function validarFrase(texto) {
  const t = typeof texto === 'string' ? texto.trim() : '';
  if (t.length < MIN_TEXTO) return 'Escribe la frase (mínimo 5 caracteres).';
  if (t.length > MAX_TEXTO) return 'Máximo 120 caracteres.';
  return null;
}

function barajar(lista, rnd) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rnd() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function elegirFrases(delTema, vistas, largo, rnd = Math.random) {
  const vistasSet = new Set(vistas || []);
  const unicas = [];
  const ya = new Set();
  for (const f of delTema || []) {
    if (!f || ya.has(f.id)) continue;
    ya.add(f.id);
    unicas.push(f);
  }
  const n = Math.min(largo, unicas.length);
  const nuevas = barajar(unicas.filter((f) => !vistasSet.has(f.id)), rnd);
  const viejas = barajar(unicas.filter((f) => vistasSet.has(f.id)), rnd);
  return [...nuevas, ...viejas].slice(0, n);
}

export function marcarVistas(vistas, ids, idsDelTema) {
  const union = [...new Set([...(vistas || []), ...(ids || [])])];
  const tema = idsDelTema || [];
  if (tema.length > 0 && tema.every((id) => union.includes(id))) return [];
  return union;
}

export function opcionesVoto(nombres, yo) {
  const texto = (lugar) => nombres?.[lugar] || (lugar === yo ? 'Yo' : 'Tu pareja');
  return [
    { valor: 'a', texto: texto('a') },
    { valor: 'b', texto: texto('b') },
    { valor: 'todos', texto: 'Los dos' },
  ];
}

export function votaronTodos(sala, indice, lugares = ['a', 'b']) {
  const v = sala?.votaron?.[indice];
  return !!v && lugares.every((l) => v[l] === true);
}

export function reveladas(sala, lugares = ['a', 'b']) {
  const total = sala?.frases?.length || 0;
  let n = 0;
  for (let i = 0; i < total; i++) if (votaronTodos(sala, i, lugares)) n++;
  return n;
}

export function coincidieron(votos) {
  const v = Object.values(votos || {});
  return v.length >= 2 && v.every((x) => x === v[0]);
}

export function resumen(votosPorFrase, lugares) {
  const elegido = Object.fromEntries(lugares.map((l) => [l, 0]));
  let coincidencias = 0;
  for (const votos of votosPorFrase) {
    if (coincidieron(votos)) coincidencias++;
    // Votos iguales en una frase cuentan una sola vez (si coinciden, es una elección).
    for (const voto of new Set(Object.values(votos || {}))) {
      if (voto === 'todos') for (const l of lugares) elegido[l]++;
      else if (voto in elegido) elegido[voto]++;
    }
  }
  return { total: votosPorFrase.length, coincidencias, elegido };
}
