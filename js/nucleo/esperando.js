// «<nombre> te está esperando»: copia en este celular de la sala que el otro abrió en Trivia o en
// ¿Quién es más probable?, para pintarla bajo la fila del inicio sin esperar a la red.
export const CLAVE_ESPERANDO = 'okupa:esperando';
const JUEGOS = ['trivia', 'probable'];
// Igual que la vigencia del aviso: pasado este tiempo la sala ya no cuenta como «esperando».
export const VIGENCIA_ESPERA_MS = 30 * 60 * 1000;
const vigente = (creadaMs, ahora) => typeof creadaMs !== 'number' || ahora - creadaMs < VIGENCIA_ESPERA_MS;

// Una sala `esperando` creada hace menos de 30 minutos.
export const sigueEsperando = (sala, ahora = Date.now()) =>
  sala?.estado === 'esperando' && typeof sala.creadaMs === 'number' && ahora - sala.creadaMs < VIGENCIA_ESPERA_MS;

const esSala = (s) => s && typeof s === 'object' && typeof s.id === 'string' && typeof s.anfitrion === 'string';

// sala = { id, anfitrion, nombre }; null borra la de ese juego. Nunca lanza.
export function guardarEsperando(almacen, codigo, juego, sala) {
  try {
    if (!almacen || !codigo || !JUEGOS.includes(juego)) return;
    const previo = almacen.leer(CLAVE_ESPERANDO, null);
    const base = previo?.codigo === codigo ? previo : {};
    const siguiente = { codigo, trivia: base.trivia ?? null, probable: base.probable ?? null };
    siguiente[juego] = esSala(sala)
      ? { id: sala.id, anfitrion: sala.anfitrion, nombre: sala.nombre ?? null, creadaMs: typeof sala.creadaMs === 'number' ? sala.creadaMs : null }
      : null;
    almacen.escribir(CLAVE_ESPERANDO, siguiente);
  } catch { /* sin almacenamiento: el inicio simplemente no dice nada */ }
}

export function textoEsperando(almacen, pareja, juego, ahora = Date.now()) {
  try {
    const copia = almacen?.leer(CLAVE_ESPERANDO, null);
    if (!pareja || !copia || copia.codigo !== pareja.codigo) return null;
    const sala = copia[juego];
    if (!esSala(sala) || sala.anfitrion === pareja.lugar || !vigente(sala.creadaMs, ahora)) return null;
    return `${sala.nombre || 'Tu pareja'} te está esperando`;
  } catch { return null; }
}

// Para el `precalentar` de un juego: lee la sala abierta y el nombre de quien la abrió. Nunca lanza.
export async function refrescarEsperando(ctx, juego, pareja, leerSala) {
  try {
    const nube = await ctx.nube();
    const [sala, datos] = await Promise.all([leerSala(nube, pareja), nube.leer(`parejas/${pareja.codigo}`)]);
    const abierta = sigueEsperando(sala) && sala.anfitrion !== pareja.lugar;
    guardarEsperando(ctx.almacen, pareja.codigo, juego, abierta
      ? { id: sala.id, anfitrion: sala.anfitrion, nombre: datos?.nombres?.[sala.anfitrion] ?? null, creadaMs: sala.creadaMs }
      : null);
  } catch { /* sin conexión: queda lo último que se supo */ }
}
