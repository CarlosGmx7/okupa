// Enlace de los dos celulares como pareja con un código de 6 caracteres.
// Lugar 'a' = quien crea la pareja, 'b' = quien se une. Máximo dos.

const CLAVE = 'okupa:pareja:actual';
const LUGARES = ['a', 'b'];
const MAX_NOMBRE = 30;
const INTENTOS_CODIGO = 5;
const SUBCOLECCIONES = ['perfiles', 'partidas', 'estado', 'dias', 'ubicaciones', 'fechas', 'capsulas'];
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

// Código de la pareja cuyo lugar este celular acaba de entregar al aprobar (para avisar 'entregado').
let entregado = null;

const recordar = (almacen, codigo, lugar) => {
  entregado = null;
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

// ── Cambio de celular con aprobación ────────────────────────────────────────────────────────────
// El celular nuevo deja una solicitud en parejas/{codigo}/solicitudes/{lugar}. La aprueba el celular
// que hoy tiene ese lugar; sin él, el nuevo entra a los 7 días si nadie la rechazó. Quién puede hacer
// cada cosa lo deciden las reglas de Firestore: aquí solo se lee y se escribe.

const CLAVE_SOLICITUD = 'okupa:solicitud';
export const ESPERA_SOLICITUD_MS = 7 * 86400000;
export const FRENO_RECHAZO_MS = 86400000;

const rutaSolicitud = (codigo, lugar) => `${ruta(codigo)}/solicitudes/${lugar}`;
// Las fechas llegan como Timestamp de Firestore o como número (nube falsa); null si aún no hay.
const aMs = (v) => {
  const ms = v?.toMillis?.() ?? v;
  return typeof ms === 'number' ? ms : null;
};
const esPermiso = (e) => e?.codigo === 'permiso';

export function solicitudApuntada(almacen) {
  const s = almacen.leer(CLAVE_SOLICITUD, null);
  return s && normalizarCodigo(s.codigo) === s.codigo && LUGARES.includes(s.lugar) ? { codigo: s.codigo, lugar: s.lugar } : null;
}
function exigirApuntada(almacen) {
  const apuntada = solicitudApuntada(almacen);
  if (!apuntada) throw new ErrorPareja('sin-solicitud');
  return apuntada;
}

// 'aprobada' | 'pendiente' | 'vencida' | 'rechazada' | 'borrada', vista desde el celular `uid` que pidió `lugar`.
export function estadoSolicitud(solicitud, parejaDoc, lugar, uid, ahoraMs) {
  if (parejaDoc?.lugares?.[lugar] === uid) return 'aprobada';
  if (!solicitud || solicitud.uid !== uid) return 'borrada';
  if (solicitud.rechazada != null) return 'rechazada';
  const creada = aMs(solicitud.creada);
  return creada !== null && ahoraMs >= creada + ESPERA_SOLICITUD_MS ? 'vencida' : 'pendiente';
}

// Deja la solicitud para entrar a un lugar ocupado y la apunta en este celular para retomar la espera.
// Si ya hay una mía se conserva (con su fecha); una rechazada solo se renueva pasado el freno.
export async function pedirLugar(nube, almacen, { codigo, lugar, ahoraMs = Date.now() }) {
  const limpio = exigirCodigo(codigo);
  if (!LUGARES.includes(lugar)) throw new ErrorPareja('no-existe');
  const { uid } = await nube.iniciar();
  if (!(await nube.leer(ruta(limpio)))) throw new ErrorPareja('no-existe');
  const r = rutaSolicitud(limpio, lugar);
  const ajena = (e) => { if (esPermiso(e)) throw new ErrorPareja('solicitud-ajena'); throw e; };
  let actual = await nube.leer(r).catch(ajena);
  if (actual && actual.uid !== uid) throw new ErrorPareja('solicitud-ajena');
  const rechazada = aMs(actual?.rechazada);
  if (actual && rechazada !== null && ahoraMs >= rechazada + FRENO_RECHAZO_MS) {
    await nube.borrar(r);
    actual = null;
  }
  if (!actual) {
    await nube.escribir(r, { uid, creada: nube.horaServidor() }).catch(ajena);
    actual = await nube.leer(r);
  }
  almacen.escribir(CLAVE_SOLICITUD, { codigo: limpio, lugar });
  return { codigo: limpio, lugar, entraMs: (aMs(actual?.creada) ?? ahoraMs) + ESPERA_SOLICITUD_MS };
}

// La solicitud que este celular dejó, con su estado al día. null si no dejó ninguna (no toca la nube).
export async function miSolicitud(nube, almacen, ahoraMs = Date.now()) {
  const apuntada = solicitudApuntada(almacen);
  if (!apuntada) return null;
  const { codigo, lugar } = apuntada;
  const { uid } = await nube.iniciar();
  const parejaDoc = await nube.leer(ruta(codigo));
  // Si ahora hay una de otro celular, las reglas no dejan leerla: para este es como si no existiera.
  const solicitud = await nube.leer(rutaSolicitud(codigo, lugar)).catch((e) => { if (esPermiso(e)) return null; throw e; });
  const estado = estadoSolicitud(solicitud, parejaDoc, lugar, uid, ahoraMs);
  const propia = solicitud?.uid === uid ? solicitud : null;
  const creada = aMs(propia?.creada);
  const rechazada = aMs(propia?.rechazada);
  return {
    codigo, lugar,
    nombre: parejaDoc?.nombres?.[lugar] ?? null,
    estado,
    entraMs: creada === null ? null : creada + ESPERA_SOLICITUD_MS,
    reintentoMs: rechazada === null ? null : rechazada + FRENO_RECHAZO_MS,
  };
}

// El lugar ya es de este celular (lo aprobaron o tomó la vencida): queda enlazado y limpia la solicitud.
export async function completarEntrada(nube, almacen) {
  const { codigo, lugar } = exigirApuntada(almacen);
  const { uid } = await nube.iniciar();
  const parejaDoc = await nube.leer(ruta(codigo));
  if (parejaDoc?.lugares?.[lugar] !== uid) throw new ErrorPareja('sin-aprobar');
  // Si no se logra borrar (sin red), el servidor limpia después las solicitudes ya cumplidas.
  await nube.borrar(rutaSolicitud(codigo, lugar)).catch(() => {});
  almacen.borrar(CLAVE_SOLICITUD);
  return recordar(almacen, codigo, lugar);
}

// Pasados los 7 días sin rechazo, el celular nuevo toma el lugar. Las reglas comprueban la fecha.
export async function entrarVencida(nube, almacen) {
  const { codigo, lugar } = exigirApuntada(almacen);
  const { uid } = await nube.iniciar();
  await nube.transaccion(async (tx) => {
    const doc = await tx.leer(ruta(codigo));
    if (!doc) throw new ErrorPareja('no-existe');
    if (doc.lugares?.[lugar] !== uid) tx.escribir(ruta(codigo), { lugares: { [lugar]: uid } }, { combinar: true });
  });
  return completarEntrada(nube, almacen);
}

// Deja de esperar. Si las reglas no dejan borrarla (rechazada hace menos de 24 h, o ya no existe),
// igual se olvida en este celular; sin conexión no, para poder reintentar.
export async function cancelarSolicitud(nube, almacen) {
  const apuntada = solicitudApuntada(almacen);
  if (!apuntada) return;
  await nube.borrar(rutaSolicitud(apuntada.codigo, apuntada.lugar)).catch((e) => { if (!esPermiso(e)) throw e; });
  almacen.borrar(CLAVE_SOLICITUD);
}

// Para los miembros: las solicitudes pendientes de su pareja. `mia` = piden mi propio lugar.
export async function solicitudesDe(nube, pareja, ahoraMs = Date.now()) {
  if (!pareja) return [];
  const [parejaDoc, ...solicitudes] = await Promise.all([
    nube.leer(ruta(pareja.codigo)),
    ...LUGARES.map((l) => nube.leer(rutaSolicitud(pareja.codigo, l))),
  ]);
  return LUGARES.flatMap((lugar, i) => {
    const s = solicitudes[i];
    if (!s || s.rechazada != null || s.uid === parejaDoc?.lugares?.[lugar]) return [];
    return [{
      lugar,
      mia: lugar === pareja.lugar,
      entraMs: (aMs(s.creada) ?? ahoraMs) + ESPERA_SOLICITUD_MS,
      nombre: parejaDoc?.nombres?.[lugar] ?? null,
    }];
  });
}

// Solo el celular que tiene el lugar lo entrega al que lo pidió. Después este celular queda por fuera.
export async function aprobarSolicitud(nube, almacen, lugar) {
  const pareja = miPareja(almacen);
  if (!pareja) throw new ErrorPareja('sin-pareja');
  if (lugar !== pareja.lugar) throw new ErrorPareja('no-es-tu-lugar');
  const solicitud = await nube.leer(rutaSolicitud(pareja.codigo, lugar));
  if (!solicitud || solicitud.rechazada != null || typeof solicitud.uid !== 'string') throw new ErrorPareja('sin-solicitud');
  // Se marca antes de escribir: al cambiar el lugar, la escucha de este celular ya debe saber que fue entregado.
  entregado = pareja.codigo;
  try {
    await nube.escribir(ruta(pareja.codigo), { lugares: { [lugar]: solicitud.uid } }, { combinar: true });
  } catch (e) {
    entregado = null;
    throw e;
  }
  salir(almacen);
}

// Cualquiera de los dos miembros rechaza: el celular nuevo no entra y debe esperar 24 h para volver a pedir.
export async function rechazarSolicitud(nube, pareja, lugar) {
  if (!pareja) throw new ErrorPareja('sin-pareja');
  if (!LUGARES.includes(lugar)) throw new ErrorPareja('no-existe');
  await nube.escribir(rutaSolicitud(pareja.codigo, lugar), { rechazada: nube.horaServidor() }, { combinar: true });
}

// Avisa una sola vez si este celular pierde su lugar ('entregado' si él mismo lo aprobó, 'reclamado' si
// otro celular entró por los 7 días) o la pareja se borra ('borrada').
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
      if (motivo === 'reclamado' && entregado === pareja.codigo) motivo = 'entregado';
      entregado = null;
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

// Las reglas solo dejan borrar una sala cerrada y sus votos mientras la sala exista: primero se
// cierra, luego van los votos y al final la sala. Después, las frases propias.
async function borrarProbable(nube, base) {
  for (const { id, datos } of await nube.listar(`${base}/probable`)) {
    if (datos?.estado !== 'terminada' && datos?.estado !== 'cancelada') {
      try {
        await nube.escribir(`${base}/probable/${id}`, { estado: 'cancelada' }, { combinar: true });
      } catch (e) {
        // Si justo terminó la sala, las reglas rechazan el cambio: ya está cerrada y se sigue borrando.
        const fresca = await nube.leer(`${base}/probable/${id}`);
        if (fresca && fresca.estado !== 'terminada' && fresca.estado !== 'cancelada') throw e;
      }
    }
    const total = datos?.frases?.length || 0;
    const votos = [];
    for (let i = 0; i < total; i++) for (const l of LUGARES) votos.push(`${base}/probable/${id}/votos/${i}_${l}`);
    await borrarRutas(nube, votos);
    await nube.borrar(`${base}/probable/${id}`);
  }
  for (const { id } of await nube.listar(`${base}/probable_frases`)) await nube.borrar(`${base}/probable_frases/${id}`);
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
  await borrarProbable(nube, base);
  for (const sub of SUBCOLECCIONES) {
    for (const { id } of await nube.listar(`${base}/${sub}`)) {
      // Las respuestas no se pueden listar (protegen lo del otro): se borran por su nombre fijo.
      if (sub === 'dias') {
        for (const parte of PARTES_RESPUESTA) await nube.borrar(`${base}/dias/${id}/respuestas/${parte}`);
      }
      // El texto de cada carta va aparte y debe borrarse antes que sus metadatos.
      if (sub === 'capsulas') await nube.borrar(`${base}/capsulas/${id}/contenido/texto`);
      await nube.borrar(`${base}/${sub}/${id}`);
    }
  }
  await nube.borrar(base);
  salir(almacen);
}
