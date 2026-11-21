// Bandeja de avisos: el celular deja una nota corta de lo que hizo y el servidor (GitHub Actions) la
// manda como notificación a los demás del grupo. Nunca debe estorbar a la acción principal.

const ARMAR = {
  diario: ({ fecha, lugar }) => `diario_${fecha}_${lugar}`,
  trivia: ({ idPartida }) => `trivia_${idPartida}`,
  probable: ({ idSala }) => `probable_${idSala}`,
  mapa: ({ idLugar, lugar, clase }) => `mapa_${idLugar}_${lugar}_${clase}`,
  // Para el anfitrión: la otra persona entró a su juego.
  'trivia-acepto': ({ idSala }) => `acepto_${idSala}`,
  'probable-acepto': ({ idSala }) => `acepto_${idSala}`,
};

// Id fijo por evento: si ya existe, las reglas no dejan crearlo otra vez (no se avisa dos veces).
export function idAviso(tipo, datos) {
  return ARMAR[tipo] ? ARMAR[tipo](datos || {}) : null;
}

// Avisos de juego: no pueden esperar al siguiente turno del servidor, así que se despierta al relevo.
const DE_JUEGO = new Set(['trivia', 'probable', 'trivia-acepto', 'probable-acepto']);
let despertar = null;

// La app lo arma al arrancar con la URL de nube-config.js; null lo apaga (pruebas y local).
export function usarRelevo(fn) {
  despertar = typeof fn === 'function' ? fn : null;
}

// Pedido simple sin cuerpo: no necesita leer la respuesta ni pasar por la consulta previa del navegador.
export function relevoDesde(url, buscar = (...a) => globalThis.fetch(...a)) {
  return url ? () => buscar(url, { method: 'POST', mode: 'no-cors', keepalive: true }) : null;
}

// Nunca espera ni lanza: si el relevo falla, el servidor manda el aviso en su siguiente turno.
function despertarRelevo() {
  try {
    Promise.resolve(despertar()).catch((e) => console.warn('Okupa: el relevo no respondió', e));
  } catch (e) {
    console.warn('Okupa: el relevo no respondió', e);
  }
}

export async function avisar(nube, pareja, tipo, id) {
  try {
    if (!nube || !pareja?.codigo || !id) return false;
    await nube.escribir(`parejas/${pareja.codigo}/avisos/${id}`, { tipo, de: pareja.lugar, creado: nube.horaServidor() });
    if (despertar && DE_JUEGO.has(tipo)) despertarRelevo();
    return true;
  } catch (e) {
    console.warn('Okupa: no se pudo dejar el aviso', e);
    return false;
  }
}
