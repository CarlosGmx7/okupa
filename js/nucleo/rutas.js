// Enrutador por hash y carga tolerante de módulos.

function partes(texto) {
  return texto.replace(/^#/, '').split('/').filter(Boolean);
}

export function resolverRuta(hash, tabla) {
  const segmentos = partes(hash || '');
  for (const [patron, handler] of Object.entries(tabla)) {
    const esperado = partes(patron);
    if (esperado.length !== segmentos.length) continue;
    const params = {};
    let coincide = true;
    for (let i = 0; i < esperado.length; i++) {
      if (esperado[i].startsWith(':')) {
        try { params[esperado[i].slice(1)] = decodeURIComponent(segmentos[i]); }
        catch { coincide = false; break; }
      } else if (esperado[i] !== segmentos[i]) {
        coincide = false;
        break;
      }
    }
    if (coincide) return { handler, params };
  }
  return null;
}

export async function cargarModulos(ids, importar = (id) => import(`../modulos/${id}/modulo.js`)) {
  const resultados = await Promise.all(ids.map(async (id) => {
    try {
      return (await importar(id)).default;
    } catch (e) {
      console.warn(`Okupa: no se pudo cargar el módulo "${id}"`, e);
      return null;
    }
  }));
  return resultados.filter(Boolean);
}
