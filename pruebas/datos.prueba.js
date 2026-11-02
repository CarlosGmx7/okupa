import { prueba, igual, verdadero } from './corredor.js';
import { unir, filtrar, preguntaDelDia, fechaLocalISO, validarContenido } from '../js/modulos/preguntas/datos.js';

const categorias = [{ id: 'fidelidad', nombre: 'Fidelidad' }, { id: 'celos', nombre: 'Celos' }];
const fuentes = [{ id: 'perel', nombre: 'Perel' }, { id: 'nuestra', nombre: 'Nuestra' }];
const preguntas = [
  { id: 'fid-001', categoria: 'fidelidad', formato: 'abierta', profundidad: 1, texto: 'a', fuente: 'perel' },
  { id: 'fid-002', categoria: 'fidelidad', formato: 'dilema', profundidad: 3, texto: 'b', fuente: 'perel' },
  { id: 'cel-001', categoria: 'celos', formato: 'corta', subtipo: 'si_no', opciones: ['Sí', 'No'], profundidad: 2, texto: 'c', fuente: 'perel' },
];
const sesiones = [{ id: 's', nombre: 'S', bloques: [{ nombre: 'I', preguntas: ['fid-001', 'cel-001'] }] }];
const incluido = { categorias, fuentes, preguntas, sesiones };

prueba('datos: unir añade propias con fuente nuestra y quita ocultas', () => {
  const r = unir(incluido, {
    preguntas: [{ id: 'n-1', categoria: 'celos', formato: 'abierta', profundidad: 1, texto: 'propia' }],
    categorias: [{ id: 'n-cat', nombre: 'Nuestra cat' }],
    sesiones: [],
    ocultas: ['fid-002'],
  });
  igual(r.preguntas.map((p) => p.id), ['fid-001', 'cel-001', 'n-1']);
  igual(r.preguntas.find((p) => p.id === 'n-1').fuente, 'nuestra');
  igual(r.categorias.map((c) => c.id), ['fidelidad', 'celos', 'n-cat']);
  igual(incluido.preguntas.length, 3, 'no muta el incluido');
});

prueba('datos: unir sin propio devuelve lo incluido', () => {
  igual(unir(incluido).preguntas.length, 3);
});

prueba('datos: filtrar por categoría, intensidad y excluidas', () => {
  igual(filtrar(preguntas, { categoria: 'fidelidad' }).map((p) => p.id), ['fid-001', 'fid-002']);
  igual(filtrar(preguntas, { profundidadMax: 2 }).map((p) => p.id), ['fid-001', 'cel-001']);
  igual(filtrar(preguntas, { excluir: new Set(['fid-001']), categoria: 'fidelidad' }).map((p) => p.id), ['fid-002']);
});

prueba('datos: filtrar que deja vacío devuelve lista vacía', () => {
  igual(filtrar(preguntas, { categoria: 'celos', profundidadMax: 1 }), []);
});

prueba('datos: pregunta del día es estable y nunca intensa ni propia', () => {
  const lista = [...preguntas, { id: 'n-9', categoria: 'celos', formato: 'abierta', profundidad: 1, texto: 'x', fuente: 'nuestra' }];
  const a = preguntaDelDia(lista, '2026-11-01');
  const b = preguntaDelDia([...lista].reverse(), '2026-11-01');
  igual(a.id, b.id, 'mismo resultado sin importar el orden');
  for (let d = 1; d <= 28; d++) {
    const p = preguntaDelDia(lista, `2026-02-${String(d).padStart(2, '0')}`);
    verdadero(p.profundidad <= 2 && !p.id.startsWith('n-'), `día ${d}: ${p.id}`);
  }
  igual(preguntaDelDia([], '2026-11-01'), null);
});

prueba('datos: pregunta del día no cambia por lo que otro celular oculte, y salta la oculta', () => {
  const lista = ['a', 'b', 'c', 'd', 'e', 'f'].map((l) => ({ id: `cel-00${l}`, categoria: 'celos', formato: 'abierta', profundidad: 1, texto: l, fuente: 'perel' }));
  const fecha = '2026-11-01';
  const elegida = preguntaDelDia(lista, fecha);
  const otra = lista.find((q) => q.id !== elegida.id);
  igual(preguntaDelDia(lista, fecha, new Set([otra.id])).id, elegida.id, 'ocultar otra no la cambia');
  const i = lista.indexOf(elegida);
  igual(preguntaDelDia(lista, fecha, new Set([elegida.id])).id, lista[(i + 1) % lista.length].id, 'pasa a la siguiente');
  igual(preguntaDelDia(lista, fecha, new Set(lista.map((q) => q.id))), null, 'todas ocultas');
});

prueba('datos: fechaLocalISO formatea en hora local', () => {
  igual(fechaLocalISO(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
});

prueba('datos: validarContenido acepta contenido válido', () => {
  igual(validarContenido(incluido), []);
});

prueba('datos: validarContenido detecta errores', () => {
  const malo = {
    categorias, fuentes,
    preguntas: [
      ...preguntas,
      { ...preguntas[0] },
      { id: 'x-1', categoria: 'nada', formato: 'abierta', profundidad: 1, texto: 'z', fuente: 'perel' },
      { id: 'x-2', categoria: 'celos', formato: 'corta', subtipo: 'si_no', profundidad: 1, texto: 'z', fuente: 'perel' },
      { id: 'x-3', categoria: 'celos', formato: 'raro', profundidad: 4, texto: ' ', fuente: 'nadie' },
    ],
    sesiones: [{ id: 's2', nombre: 'S', bloques: [{ nombre: 'I', preguntas: ['no-existe'] }] }],
  };
  const errores = validarContenido(malo).join('\n');
  for (const pista of ['fid-001', 'x-1', 'x-2', 'x-3', 'no-existe']) {
    verdadero(errores.includes(pista), `falta error sobre ${pista}:\n${errores}`);
  }
});
