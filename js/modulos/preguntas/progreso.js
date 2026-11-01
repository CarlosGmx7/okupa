// Qué preguntas ya salieron y dónde quedó cada sesión guiada.
// Se mantiene en memoria y se guarda cuando el navegador lo permite.

const CLAVE_VISTAS = 'okupa:preguntas:vistas';
const CLAVE_SESIONES = 'okupa:preguntas:sesiones';

export function crearProgreso(alm) {
  let vistas = new Set(alm.leer(CLAVE_VISTAS, []));
  let sesiones = { ...alm.leer(CLAVE_SESIONES, {}) };
  const guardarVistas = () => alm.escribir(CLAVE_VISTAS, [...vistas]);
  const guardarSesiones = () => alm.escribir(CLAVE_SESIONES, sesiones);

  return {
    marcarVista(id) {
      if (vistas.has(id)) return;
      vistas.add(id);
      guardarVistas();
    },
    vistas() {
      return new Set(vistas);
    },
    reiniciarVistas(ids) {
      if (ids) ids.forEach((id) => vistas.delete(id));
      else vistas = new Set();
      guardarVistas();
    },
    avance(idSesion) {
      return sesiones[idSesion] ? { ...sesiones[idSesion] } : null;
    },
    guardarAvance(idSesion, { bloque, indice }) {
      sesiones[idSesion] = { bloque, indice };
      guardarSesiones();
    },
    terminarSesion(idSesion) {
      delete sesiones[idSesion];
      guardarSesiones();
    },
    reiniciar() {
      vistas = new Set();
      sesiones = {};
      alm.borrar(CLAVE_VISTAS);
      alm.borrar(CLAVE_SESIONES);
    },
  };
}

// Primera posición desde `avance` (incluida) cuya pregunta todavía existe.
export function posicionValida(sesion, avance, idsExistentes) {
  let { bloque, indice } = avance || { bloque: 0, indice: 0 };
  const bloques = sesion.bloques || [];
  while (bloque < bloques.length) {
    const preguntas = bloques[bloque].preguntas || [];
    while (indice < preguntas.length) {
      if (idsExistentes.has(preguntas[indice])) return { bloque, indice };
      indice++;
    }
    bloque++;
    indice = 0;
  }
  return null;
}
