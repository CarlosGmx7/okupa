// Enlace de los dos celulares como pareja con un código de 6 caracteres.
// Lugar 'a' = quien crea la pareja, 'b' = quien se une. Máximo dos.

const CLAVE = 'okupa:pareja:actual';
const LUGARES = ['a', 'b'];
const MAX_NOMBRE = 30;
const INTENTOS_CODIGO = 5;
const SUBCOLECCIONES = ['perfiles', 'partidas', 'estado', 'dias', 'ubicaciones', 'fechas'];
export const PARTES_RESPUESTA = ['gustos_a', 'gustos_b', 'ingles_a', 'ingles_b'];

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

// Acepta el código suelto ("k7p q2m") o pegado dentro del mensaje compartido ("…el código K7P-Q2M").
export function normalizarCodigo(texto) {
  if (typeof texto !== 'string') return null;
  const mayusculas = texto.toUpperCase();
  const limpio = mayusculas.replace(/[\s-]/g, '');
  if (REGEX_CODIGO.test(limpio)) return limpio;
  const enMensaje = mayusculas.match(/(?:^|[^A-Z0-9])([A-HJKMNP-Z2-9]{3})-([A-HJKMNP-Z2-9]{3})(?![A-Z0-9])/);
  return enMensaje ? enMensaje[1] + enMensaje[2] : null;
}

export function limpiarNombre(texto) {
  const limpio = typeof texto === 'string' ? texto.trim() : '';
  return limpio && limpio.length <= MAX_NOMBRE ? limpio : null;
}

export function miPareja(almacen) {
  const p = almacen.leer(CLAVE, null);
  return p && normalizarCodigo(p.codigo) === p.codigo && LUGARES.includes(p.lugar) ? { codigo: p.codigo, lugar: p.lugar } : null;
}

// Avisa al resto de la app (p. ej. las notificaciones) que este celular se enlazó o salió de la pareja.
const anunciar = (enlazada) => {
  try { globalThis.dispatchEvent?.(new CustomEvent('okupa:pareja', { detail: { enlazada } })); } catch { /* sin eventos */ }
};

const recordar = (almacen, codigo, lugar) => {
  almacen.escribir(CLAVE, { codigo, lugar });
  anunciar(true);
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
    const perder = (motivo) => {
      if (!activo) return;
      activo = false;
      cancelar();
      salir(almacen);
      alPerder(motivo);
    };
    cancelar = nube.escuchar(ruta(pareja.codigo), (doc) => {
      if (!activo) return;
      if (doc) {
        if (doc.lugares?.[pareja.lugar] !== uid) perder('reclamado');
        return;
      }
      // Sin red, Firestore avisa "no existe" desde su caché: solo se cree si el servidor lo confirma.
      nube.leer(ruta(pareja.codigo)).then((confirmado) => { if (!confirmado) perder('borrada'); }, () => {});
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
  anunciar(false);
}

const idsTarjetasBase = async () => {
  const { cargarTarjetas } = await import('../modulos/match/logica.js');
  return (await cargarTarjetas()).map((t) => t.id);
};

// Borra en tandas para no esperar uno por uno (pueden ser cientos).
async function borrarRutas(nube, rutas, tanda = 40) {
  for (let i = 0; i < rutas.length; i += tanda) {
    await Promise.all(rutas.slice(i, i + tanda).map((r) => nube.borrar(r)));
  }
}

// Lugares del mapa con sus fotos y las dos versiones (las versiones no se listan: nombre fijo).
async function borrarLugares(nube, base) {
  for (const { id } of await nube.listar(`${base}/lugares`)) {
    const fotos = await nube.listar(`${base}/lugares/${id}/fotos`);
    await borrarRutas(nube, [
      ...fotos.map((f) => `${base}/lugares/${id}/fotos/${f.id}`),
      ...LUGARES.map((l) => `${base}/lugares/${id}/versiones/${l}`),
    ]);
    await nube.borrar(`${base}/lugares/${id}`);
  }
}

// Match: los votos del otro no se pueden leer ni listar, así que se borran a ciegas probando cada
// tarjeta (las del mazo y las propias de la pareja). Las reglas lo permiten sin revelar nada.
async function borrarMatch(nube, base, cargarIdsTarjetas) {
  const propias = (await nube.listar(`${base}/match_tarjetas`)).map((t) => t.id);
  const misVotos = Object.keys((await nube.leer(`${base}/match_privado/a`).catch(() => null))?.votos || {})
    .concat(Object.keys((await nube.leer(`${base}/match_privado/b`).catch(() => null))?.votos || {}));
  const ids = [...new Set([...(await cargarIdsTarjetas()), ...propias, ...misVotos])];
  await borrarRutas(nube, ids.flatMap((id) => LUGARES.map((l) => `${base}/match_si/${id}_${l}`)));
  const matches = (await nube.listar(`${base}/match_matches`)).map((m) => `${base}/match_matches/${m.id}`);
  await borrarRutas(nube, [
    ...matches,
    ...propias.map((id) => `${base}/match_tarjetas/${id}`),
    ...LUGARES.map((l) => `${base}/match_privado/${l}`),
  ]);
}

// Borra para los dos todo lo que la pareja tiene en la nube. Los avisos pendientes no se pueden
// leer desde el celular: el servidor descarta los de parejas que ya no existen.
export async function borrarTodo(nube, almacen, { cargarIdsTarjetas = idsTarjetasBase } = {}) {
  const pareja = miPareja(almacen);
  if (!pareja) throw new ErrorPareja('sin-pareja');
  const base = ruta(pareja.codigo);
  // Primero lo que necesita que la pareja exista (las reglas miran quién es miembro).
  await borrarLugares(nube, base);
  await borrarMatch(nube, base, cargarIdsTarjetas);
  for (const sub of SUBCOLECCIONES) {
    for (const { id } of await nube.listar(`${base}/${sub}`)) {
      // Las respuestas no se pueden listar (protegen lo del otro): se borran por su nombre fijo.
      if (sub === 'dias') {
        for (const parte of PARTES_RESPUESTA) await nube.borrar(`${base}/dias/${id}/respuestas/${parte}`);
      }
      await nube.borrar(`${base}/${sub}/${id}`);
    }
  }
  await nube.borrar(base);
  salir(almacen);
}
