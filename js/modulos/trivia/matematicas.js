// Preguntas de matemáticas generadas al momento: nunca se repiten y la respuesta la calcula el código.
// Cada plantilla elige números que dan resultados enteros y propone errores típicos como distractores.

export const formatearNumero = (n) => n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
const pesos = (n) => `$${formatearNumero(n)}`;
const entero = (rnd, min, max) => min + Math.floor(rnd() * (max - min + 1));
const elegir = (rnd, lista) => lista[Math.floor(rnd() * lista.length)];

export const PLANTILLAS_MATE = [
  {
    id: 'porcentaje',
    generar(rnd) {
      const p = elegir(rnd, [5, 10, 15, 20, 25, 30, 40, 60, 75]);
      const n = 20 * entero(rnd, 2, 30);
      const valor = (p * n) / 100;
      return { params: { p, n }, valor, texto: `¿Cuánto es el ${p} % de ${formatearNumero(n)}?`,
        dato: `${p} % de ${formatearNumero(n)} = ${formatearNumero(n)} × ${p} ÷ 100 = ${formatearNumero(valor)}.`,
        errores: [n - valor, (p * n) / 10, valor + p, valor * 2] };
    },
  },
  {
    id: 'descuento',
    generar(rnd) {
      const precio = 10000 * entero(rnd, 3, 30);
      const p = elegir(rnd, [10, 15, 20, 25, 30, 40, 50]);
      const rebaja = (precio * p) / 100;
      const valor = precio - rebaja;
      return { params: { precio, p }, valor, texto: `Un par de tenis cuesta ${pesos(precio)} y tiene ${p} % de descuento. ¿Cuánto pagas?`,
        dato: `El descuento es ${pesos(rebaja)}; ${pesos(precio)} − ${pesos(rebaja)} = ${pesos(valor)}.`,
        errores: [rebaja, precio + rebaja, precio - p * 1000, valor - 1000], formato: pesos };
    },
  },
  {
    id: 'regla3',
    generar(rnd) {
      const a = entero(rnd, 2, 6);
      const unidad = 500 * entero(rnd, 2, 18);
      const b = a * unidad;
      let c = entero(rnd, 2, 12);
      if (c === a) c += 1;
      const cosa = elegir(rnd, ['empanadas', 'cafés', 'arepas', 'pasajes de bus', 'helados']);
      const valor = unidad * c;
      return { params: { a, b, c, cosa }, valor, texto: `Si ${a} ${cosa} cuestan ${pesos(b)}, ¿cuánto cuestan ${c}?`,
        dato: `Cada una cuesta ${pesos(b)} ÷ ${a} = ${pesos(unidad)}; por ${c}: ${pesos(valor)}.`,
        errores: [b * c, valor + unidad, valor - unidad, b + unidad * (c - a + 1)], formato: pesos };
    },
  },
  {
    id: 'ecuacion',
    generar(rnd) {
      const a = entero(rnd, 2, 9);
      const x = entero(rnd, 2, 20);
      const b = entero(rnd, 1, 30);
      const c = a * x + b;
      return { params: { a, b, c }, valor: x, texto: `Si ${a}x + ${b} = ${c}, ¿cuánto vale x?`,
        dato: `${a}x = ${c} − ${b} = ${c - b}, así que x = ${c - b} ÷ ${a} = ${x}.`,
        errores: [(c + b) / a, c - b, x + 1, x - 1, Math.round(c / a)] };
    },
  },
  {
    id: 'potencia',
    generar(rnd) {
      const exp = elegir(rnd, [2, 3, 4]);
      const base = exp === 2 ? entero(rnd, 11, 25) : exp === 3 ? entero(rnd, 3, 12) : entero(rnd, 2, 7);
      const valor = base ** exp;
      return { params: { base, exp }, valor, texto: `¿Cuánto es ${base} elevado a la ${exp}?`,
        dato: `${base}${['', '', '²', '³', '⁴'][exp]} = ${Array(exp).fill(base).join(' × ')} = ${formatearNumero(valor)}.`,
        errores: [base * exp, base ** (exp - 1), valor + base, valor - base] };
    },
  },
  {
    id: 'raiz',
    generar(rnd) {
      const n = entero(rnd, 11, 30);
      const cuadrado = n * n;
      return { params: { cuadrado }, valor: n, texto: `¿Cuál es la raíz cuadrada de ${formatearNumero(cuadrado)}?`,
        dato: `${n} × ${n} = ${formatearNumero(cuadrado)}.`,
        errores: [n + 1, n - 1, n + 2, Math.round(cuadrado / 2)] };
    },
  },
  {
    id: 'probabilidad',
    generar(rnd) {
      const total = elegir(rnd, [4, 5, 10, 20, 25]);
      const r = entero(rnd, 1, total - 1);
      const a = total - r;
      const valor = (100 * r) / total;
      return { params: { r, a }, valor, texto: `En una bolsa hay ${r} bolas rojas y ${a} azules. Si sacas una al azar, ¿qué probabilidad hay (en %) de que sea roja?`,
        dato: `Son ${r} rojas de ${total} bolas: ${r} ÷ ${total} = ${valor} %.`,
        errores: [100 - valor, r * 10, valor + 10, valor - 5], formato: (v) => `${formatearNumero(v)} %` };
    },
  },
  {
    id: 'combinatoria',
    generar(rnd) {
      const n = entero(rnd, 5, 30);
      const valor = (n * (n - 1)) / 2;
      return { params: { n }, valor, texto: `En un grupo de ${n} personas cada una le da la mano una vez a cada una de las demás. ¿Cuántos apretones de mano hay?`,
        dato: `Cada pareja se saluda una vez: ${n} × ${n - 1} ÷ 2 = ${formatearNumero(valor)}.`,
        errores: [n * (n - 1), (n * (n + 1)) / 2, n * n, valor - n] };
    },
  },
  {
    id: 'sucesion',
    generar(rnd) {
      const tipo = rnd() < 0.6 ? 'aritmetica' : 'geometrica';
      let terminos;
      let valor;
      if (tipo === 'aritmetica') {
        const a = entero(rnd, 1, 30);
        const d = entero(rnd, 2, 15);
        terminos = [0, 1, 2, 3].map((k) => a + k * d);
        valor = a + 4 * d;
      } else {
        const a = entero(rnd, 1, 5);
        const q = entero(rnd, 2, 4);
        terminos = [0, 1, 2, 3].map((k) => a * q ** k);
        valor = a * q ** 4;
      }
      const ultimo = terminos[3];
      const paso = terminos[1] - terminos[0];
      return { params: { tipo, terminos }, valor, texto: `¿Qué número sigue? ${terminos.map(formatearNumero).join(', ')}, …`,
        dato: tipo === 'aritmetica' ? `Cada término suma ${paso}: ${ultimo} + ${paso} = ${valor}.` : `Cada término se multiplica por ${terminos[1] / terminos[0]}: ${ultimo} × ${terminos[1] / terminos[0]} = ${formatearNumero(valor)}.`,
        errores: [ultimo + paso, valor + 1, valor - 1, ultimo * 2, valor + paso] };
    },
  },
  {
    id: 'area',
    generar(rnd) {
      const figura = elegir(rnd, ['rectangulo', 'triangulo', 'circulo']);
      if (figura === 'circulo') {
        const r = elegir(rnd, [10, 20, 30]);
        const valor = Math.round(3.14 * r * r);
        return { params: { figura, r }, valor, texto: `¿Cuál es el área de un círculo de radio ${r} cm? (usa π ≈ 3,14)`,
          dato: `Área = π × r² = 3,14 × ${r * r} = ${formatearNumero(valor)} cm².`,
          errores: [Math.round(2 * 3.14 * r), Math.round(3.14 * r), Math.round(3.14 * 4 * r * r), r * r], formato: (v) => `${formatearNumero(v)} cm²` };
      }
      const b = entero(rnd, 3, 30);
      let h = entero(rnd, 3, 30);
      if (figura === 'triangulo' && (b * h) % 2) h += 1;
      const valor = figura === 'rectangulo' ? b * h : (b * h) / 2;
      const nombre = figura === 'rectangulo' ? 'un rectángulo' : 'un triángulo';
      return { params: { figura, b, h }, valor, texto: `¿Cuál es el área de ${nombre} de base ${b} cm y altura ${h} cm?`,
        dato: figura === 'rectangulo' ? `Área = base × altura = ${b} × ${h} = ${formatearNumero(valor)} cm².` : `Área = base × altura ÷ 2 = ${b} × ${h} ÷ 2 = ${formatearNumero(valor)} cm².`,
        errores: figura === 'rectangulo' ? [2 * (b + h), (b * h) / 2, b + h] : [b * h, b + h, (b + h) * 2], formato: (v) => `${formatearNumero(v)} cm²` };
    },
  },
  {
    id: 'unidades',
    generar(rnd) {
      if (rnd() < 0.5) {
        const v = 18 * entero(rnd, 1, 10);
        const valor = v / 3.6;
        return { params: { tipo: 'kmh', v }, valor, texto: `Un carro va a ${v} km/h. ¿A cuántos metros por segundo va?`,
          dato: `Para pasar de km/h a m/s se divide por 3,6: ${v} ÷ 3,6 = ${valor} m/s.`,
          errores: [Math.round(v * 3.6), Math.round(v / 3), v / 2, valor + 5], formato: (x) => `${formatearNumero(x)} m/s` };
      }
      const v = entero(rnd, 2, 9);
      const valor = v * 3600;
      return { params: { tipo: 'horas', v }, valor, texto: `¿Cuántos segundos hay en ${v} horas?`,
        dato: `Una hora tiene 60 × 60 = 3.600 segundos; ${v} × 3.600 = ${formatearNumero(valor)}.`,
        errores: [v * 60, v * 360, v * 6000, valor + 600] };
    },
  },
];

function barajar(lista, rnd) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Tres distractores enteros positivos, distintos entre sí y de la respuesta: errores típicos primero.
function distractores(valor, errores, rnd) {
  const salto = Math.max(1, Math.round(valor * 0.1));
  const cercanos = [1, 2, 3, 4, 5, 6].flatMap((k) => [valor + k * salto, valor - k * salto]);
  const elegidos = [];
  for (const v of [...barajar(errores, rnd), ...cercanos]) {
    if (Number.isInteger(v) && v > 0 && v !== valor && !elegidos.includes(v)) elegidos.push(v);
    if (elegidos.length === 3) break;
  }
  return elegidos;
}

export function generarMatematica(rnd = Math.random, plantilla = elegir(rnd, PLANTILLAS_MATE)) {
  const g = plantilla.generar(rnd);
  const formato = g.formato || formatearNumero;
  const valores = barajar([g.valor, ...distractores(g.valor, g.errores, rnd)], rnd);
  return {
    id: `mat-${plantilla.id}-${Object.values(g.params).flat().join('_')}`,
    tema: 'matematicas',
    tipo: 'opciones',
    texto: g.texto,
    opciones: valores.map(formato),
    respuesta: valores.indexOf(g.valor),
    dato: g.dato,
    params: g.params,
  };
}
