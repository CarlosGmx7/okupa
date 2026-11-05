import { prueba, igual, verdadero } from './corredor.js';
import { PLANTILLAS_MATE, generarMatematica, formatearNumero } from '../js/modulos/trivia/matematicas.js';
import { problemaDePreguntaTrivia } from '../js/modulos/trivia/banco.js';

// Generador pseudoaleatorio con semilla (LCG de 32 bits) para pruebas repetibles.
export function semilla(s = 1) {
  let x = s >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32; };
}

// Cálculo independiente de la respuesta a partir de los parámetros de cada plantilla.
const CALCULO = {
  porcentaje: ({ p, n }) => (p * n) / 100,
  descuento: ({ precio, p }) => precio - (precio * p) / 100,
  regla3: ({ a, b, c }) => (b / a) * c,
  ecuacion: ({ a, b, c }) => (c - b) / a,
  potencia: ({ base, exp }) => base ** exp,
  raiz: ({ cuadrado }) => Math.sqrt(cuadrado),
  probabilidad: ({ r, a }) => (100 * r) / (r + a),
  combinatoria: ({ n }) => (n * (n - 1)) / 2,
  sucesion: ({ terminos, tipo }) => {
    const [t0, t1] = terminos;
    const ultimo = terminos[terminos.length - 1];
    return tipo === 'aritmetica' ? ultimo + (t1 - t0) : ultimo * (t1 / t0);
  },
  area: ({ figura, b, h, r }) => (figura === 'rectangulo' ? b * h : figura === 'triangulo' ? (b * h) / 2 : Math.round(3.14 * r * r)),
  unidades: ({ tipo, v }) => (tipo === 'kmh' ? v / 3.6 : v * 3600),
};
const TEMAS = new Set(['matematicas']);
// El número de una opción, sin unidades ni separadores ("$1.250" → 1250, "25 %" → 25, "314 cm²" → 314).
const numero = (texto) => Number(texto.replace(/cm²|m\/s|[^\d]/g, ''));

prueba('matemáticas: hay plantilla para cada tipo acordado', () => {
  igual(PLANTILLAS_MATE.map((p) => p.id).sort(), Object.keys(CALCULO).sort());
});

prueba('matemáticas: cada plantilla genera 300 preguntas válidas y correctas', () => {
  for (const plantilla of PLANTILLAS_MATE) {
    const rnd = semilla(plantilla.id.length * 97);
    for (let i = 0; i < 300; i++) {
      const p = generarMatematica(rnd, plantilla);
      const problema = problemaDePreguntaTrivia(p, TEMAS);
      verdadero(!problema, `${plantilla.id}: ${problema} en ${JSON.stringify(p)}`);
      verdadero(p.id.startsWith(`mat-${plantilla.id}-`), p.id);
      const esperado = CALCULO[plantilla.id](p.params);
      verdadero(Number.isInteger(esperado) && esperado > 0, `${plantilla.id}: resultado ${esperado} no es entero positivo (${JSON.stringify(p.params)})`);
      const correcta = p.opciones[p.respuesta];
      verdadero(correcta.includes(formatearNumero(esperado)) && numero(correcta) === esperado, `${plantilla.id}: "${correcta}" ≠ ${esperado} ${JSON.stringify(p.params)}`);
      verdadero(p.opciones.every((o) => !o.includes('-') && numero(o) > 0), `${plantilla.id}: opción no positiva ${p.opciones}`);
      igual(new Set(p.opciones.map(numero)).size, 4, `${plantilla.id}: números repetidos ${p.opciones}`);
    }
  }
});

prueba('matemáticas: la respuesta no cae siempre en la misma posición', () => {
  const rnd = semilla(42);
  const conteo = [0, 0, 0, 0];
  for (let i = 0; i < 400; i++) conteo[generarMatematica(rnd).respuesta]++;
  verdadero(conteo.every((n) => n >= 50), JSON.stringify(conteo));
});

prueba('matemáticas: formatearNumero usa separador de miles colombiano', () => {
  igual(formatearNumero(1256), '1.256');
  igual(formatearNumero(45), '45');
});
