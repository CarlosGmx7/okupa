// Bandeja de avisos: el celular deja una nota corta de lo que hizo y el servidor (GitHub Actions) la
// manda como notificación a los demás del grupo. Nunca debe estorbar a la acción principal.

const ARMAR = {
  diario: ({ fecha, lugar }) => `diario_${fecha}_${lugar}`,
  trivia: ({ idPartida }) => `trivia_${idPartida}`,
  mapa: ({ idLugar, lugar, clase }) => `mapa_${idLugar}_${lugar}_${clase}`,
};

// Id fijo por evento: si ya existe, las reglas no dejan crearlo otra vez (no se avisa dos veces).
export function idAviso(tipo, datos) {
  return ARMAR[tipo] ? ARMAR[tipo](datos || {}) : null;
}

export async function avisar(nube, pareja, tipo, id) {
  try {
    if (!nube || !pareja?.codigo || !id) return false;
    await nube.escribir(`parejas/${pareja.codigo}/avisos/${id}`, { tipo, de: pareja.lugar, creado: nube.horaServidor() });
    return true;
  } catch (e) {
    console.warn('Okupa: no se pudo dejar el aviso', e);
    return false;
  }
}
