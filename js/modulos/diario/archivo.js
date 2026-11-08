// Archivo del diario: los días ya revelados, con búsqueda y la opción de quitarlos de este celular.
// Quitar un día no lo borra de la nube: el otro celular lo sigue viendo.

export const claveOcultos = (codigo) => `okupa:diario:archivo-oculto:${codigo}`;

export const ocultosDe = (almacen, codigo) => new Set(almacen?.leer(claveOcultos(codigo), []) || []);

export function ocultarDia(almacen, codigo, fecha) {
  const ocultos = ocultosDe(almacen, codigo);
  ocultos.add(fecha);
  almacen.escribir(claveOcultos(codigo), [...ocultos]);
}

// Sin tildes y en minúscula, para que "niña" encuentre "NINA" y "tendriamos" encuentre "tendríamos".
const normalizar = (t) => (typeof t === 'string' ? t : '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// entradas: [{ fecha, preguntas: [{ texto, tema, coincidencia, a: { respuesta, comentario }, b: {…} }] }]
// fecha: 'AAAA-MM-DD' (ese día) o 'AAAA-MM' (ese mes).
export function filtrarArchivo(entradas, { palabra = '', tema = '', fecha = '', ocultos = new Set() } = {}) {
  const buscada = normalizar(palabra.trim());
  return entradas.filter((e) => !ocultos.has(e.fecha)
    && (!fecha || e.fecha.startsWith(fecha))
    && (!tema || e.preguntas.some((p) => p.tema === tema))
    && (!buscada || e.preguntas.some((p) => [p.texto, p.a?.respuesta, p.b?.respuesta, p.a?.comentario, p.b?.comentario]
      .some((t) => normalizar(t).includes(buscada)))));
}
