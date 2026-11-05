// Enlace de los dos celulares como pareja con un código de 6 caracteres.
// Lugar 'a' = quien crea la pareja, 'b' = quien se une. Máximo dos.

const CLAVE = 'okupa:pareja:actual';
const LUGARES = ['a', 'b'];
const MAX_NOMBRE = 30;
const INTENTOS_CODIGO = 5;
const SUBCOLECCIONES = ['perfiles', 'partidas', 'estado', 'dias'];

// Sin I, L, O, 0 ni 1 para que no se confundan al dictarlo.
export const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REGEX_CODIGO = /^[A-HJKMNP-Z2-9]{6}$/;

// codigo: 'no-existe' | 'llena' | 'nombre' | 'sin-pareja'
export class ErrorPareja extends Error {
  constructor(codigo, mensaje = codigo) {
    super(mensaje);
    this.name = 'ErrorPareja';
    this.codigo = codigo;
  }
}

export function generarCodigo(rnd = Math.random) {
  let codigo = '';
  for (let i = 0; i < 6; i++) codigo += ALFABETO[Math.min(ALFABETO.length - 1, Math.floor(rnd() * ALFABETO.length))];
  return codigo;
}

export const formatearCodigo = (codigo) => `${codigo.slice(0, 3)}-${codigo.slice(3)}`;

export function normalizarCodigo(texto) {
  if (typeof texto !== 'string') return null;
  const limpio = texto.toUpperCase().replace(/[\s-]/g, '');
  return REGEX_CODIGO.test(limpio) ? limpio : null;
}

export function limpiarNombre(texto) {
  const limpio = typeof texto === 'string' ? texto.trim() : '';
  return limpio && limpio.length <= MAX_NOMBRE ? limpio : null;
}

export function miPareja(almacen) {
  const p = almacen.leer(CLAVE, null);
  return p && normalizarCodigo(p.codigo) === p.codigo && LUGARES.includes(p.lugar) ? { codigo: p.codigo, lugar: p.lugar } : null;
}

const recordar = (almacen, codigo, lugar) => {
  almacen.escribir(CLAVE, { codigo, lugar });
  return { codigo, lugar };
};
const ruta = (codigo) => `parejas/${codigo}`;

function exigirNombre(nombre) {
  const limpio = limpiarNombre(nombre);
  if (!limpio) throw new ErrorPareja('nombre', `Escribe tu nombre (máximo ${MAX_NOMBRE} letras).`);
  return limpio;
}
function exigirCodigo(codigo) {
  const limpio = normalizarCodigo(codigo);
  if (!limpio) throw new ErrorPareja('no-existe');
  return limpio;
}

export async function crearPareja(nube, almacen, { nombre, rnd = Math.random }) {
  const limpio = exigirNombre(nombre);
  const { uid } = await nube.iniciar();
  for (let i = 0; i < INTENTOS_CODIGO; i++) {
    const codigo = generarCodigo(rnd);
    const creada = await nube.transaccion(async (tx) => {
      if (await tx.leer(ruta(codigo))) return false;
      tx.escribir(ruta(codigo), {
        lugares: { a: uid, b: null },
        nombres: { a: limpio, b: null },
        creada: nube.horaServidor(),
      });
      return true;
    });
    if (creada) return recordar(almacen, codigo, 'a');
  }
  throw new ErrorPareja('llena', 'No se pudo generar un código libre. Intenta de nuevo.');
}

export async function unirse(nube, almacen, { codigo, nombre }) {
  const limpioCodigo = exigirCodigo(codigo);
  const limpioNombre = exigirNombre(nombre);
  const { uid } = await nube.iniciar();
  const lugar = await nube.transaccion(async (tx) => {
    const doc = await tx.leer(ruta(limpioCodigo));
    if (!doc) throw new ErrorPareja('no-existe');
    const propio = LUGARES.find((l) => doc.lugares?.[l] === uid);
    if (propio) return propio;
    if (doc.lugares?.b) throw new ErrorPareja('llena');
    tx.escribir(ruta(limpioCodigo), { lugares: { b: uid }, nombres: { b: limpioNombre } }, { combinar: true });
    return 'b';
  });
  return recordar(almacen, limpioCodigo, lugar);
}

export async function lugaresDe(nube, codigo) {
  const doc = await nube.leer(ruta(exigirCodigo(codigo)));
  if (!doc) throw new ErrorPareja('no-existe');
  return {
    nombres: { a: doc.nombres?.a ?? null, b: doc.nombres?.b ?? null },
    ocupados: { a: Boolean(doc.lugares?.a), b: Boolean(doc.lugares?.b) },
  };
}

// Toma un lugar ocupado (p. ej. al cambiar de celular). El celular anterior queda fuera.
export async function reclamar(nube, almacen, { codigo, lugar }) {
  const limpio = exigirCodigo(codigo);
  if (!LUGARES.includes(lugar)) throw new ErrorPareja('no-existe');
  const { uid } = await nube.iniciar();
  await nube.transaccion(async (tx) => {
    if (!(await tx.leer(ruta(limpio)))) throw new ErrorPareja('no-existe');
    tx.escribir(ruta(limpio), { lugares: { [lugar]: uid } }, { combinar: true });
  });
  return recordar(almacen, limpio, lugar);
}

// Avisa una sola vez si este celular pierde su lugar ('reclamado') o la pareja se borra ('borrada').
export function vigilarLugar(nube, almacen, alPerder) {
  const pareja = miPareja(almacen);
  if (!pareja) return () => {};
  let activo = true;
  let cancelar = () => {};
  nube.iniciar().then(({ uid }) => {
    if (!activo) return;
    cancelar = nube.escuchar(ruta(pareja.codigo), (doc) => {
      if (!activo) return;
      const motivo = !doc ? 'borrada' : doc.lugares?.[pareja.lugar] !== uid ? 'reclamado' : null;
      if (!motivo) return;
      activo = false;
      cancelar();
      salir(almacen);
      alPerder(motivo);
    });
  }).catch(() => {});
  return () => { activo = false; cancelar(); };
}

export async function cambiarNombre(nube, almacen, nombre) {
  const pareja = miPareja(almacen);
  if (!pareja) throw new ErrorPareja('sin-pareja');
  const limpio = exigirNombre(nombre);
  await nube.escribir(ruta(pareja.codigo), { nombres: { [pareja.lugar]: limpio } }, { combinar: true });
}

export function salir(almacen) {
  almacen.borrar(CLAVE);
}

// Borra para los dos todo lo que la pareja tiene en la nube.
export async function borrarTodo(nube, almacen) {
  const pareja = miPareja(almacen);
  if (!pareja) throw new ErrorPareja('sin-pareja');
  const base = ruta(pareja.codigo);
  for (const sub of SUBCOLECCIONES) {
    for (const { id } of await nube.listar(`${base}/${sub}`)) {
      if (sub === 'dias') {
        for (const r of await nube.listar(`${base}/dias/${id}/respuestas`)) await nube.borrar(`${base}/dias/${id}/respuestas/${r.id}`);
      }
      await nube.borrar(`${base}/${sub}/${id}`);
    }
  }
  await nube.borrar(base);
  salir(almacen);
}
