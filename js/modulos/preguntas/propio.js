// Contenido creado por la pareja: preguntas, categorías y sesiones propias, y preguntas ocultas.
import { problemaDePregunta } from './datos.js';

const CLAVE = 'okupa:preguntas:propio';
const MAX_TEXTO = 500;
const MAX_OPCION = 80;
const MAX_NOMBRE = 60;

// Tiempo + contador (único en esta sesión) + azar (único entre celulares al combinar copias).
let contadorIds = 0;
function nuevoId() {
  contadorIds = (contadorIds + 1) % 1296;
  const azar = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
  return `n-${Date.now().toString(36)}${contadorIds.toString(36).padStart(2, '0')}${azar}`;
}

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const listaConIds = (v) => v === undefined || (Array.isArray(v) && v.every((x) => esObjeto(x) && typeof x.id === 'string'));
const listaDeTextos = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');

// Qué forma debe tener cada dato de este módulo dentro de una copia de seguridad.
export const VALIDADORES_RESPALDO = {
  'okupa:preguntas:propio': (v) => esObjeto(v) && listaConIds(v.preguntas) && listaConIds(v.categorias) &&
    listaConIds(v.sesiones) && (v.ocultas === undefined || listaDeTextos(v.ocultas)),
  'okupa:preguntas:vistas': listaDeTextos,
  'okupa:preguntas:sesiones': esObjeto,
  'okupa:preguntas:intensidad': (v) => [1, 2, 3].includes(v),
};

// Lee lo guardado tolerando datos dañados: lo que no sea una lista se toma como vacío.
function leerDatos(alm) {
  const crudo = alm.leer(CLAVE, {});
  const d = esObjeto(crudo) ? crudo : {};
  const lista = (v) => (Array.isArray(v) ? v.filter(esObjeto) : []);
  return {
    preguntas: lista(d.preguntas),
    categorias: lista(d.categorias),
    sesiones: lista(d.sesiones),
    ocultas: Array.isArray(d.ocultas) ? d.ocultas.filter((x) => typeof x === 'string') : [],
  };
}

function limpiar(texto) {
  return typeof texto === 'string' ? texto.trim() : '';
}

export function validarPreguntaPropia(p, categoriasValidas) {
  const texto = limpiar(p.texto);
  if (!texto) return 'Escriban la pregunta.';
  if (texto.length > MAX_TEXTO) return `La pregunta es muy larga (máximo ${MAX_TEXTO} caracteres).`;
  if (p.formato === 'corta') {
    const opciones = (p.opciones || []).map(limpiar);
    if (opciones.length !== 2 || opciones.some((o) => !o)) return 'Escriban las dos opciones.';
    if (opciones.some((o) => o.length > MAX_OPCION)) return `Cada opción puede tener máximo ${MAX_OPCION} caracteres.`;
  }
  const problema = problemaDePregunta({ ...p, texto, opciones: (p.opciones || []).map(limpiar) }, categoriasValidas);
  if (problema) return `Revisen la pregunta: ${problema}.`;
  return null;
}

export function crearPropio(alm, categoriasValidas = () => new Set()) {
  let datos = leerDatos(alm);
  const guardar = () => alm.escribir(CLAVE, datos);
  const reemplazar = (lista, item) => {
    const i = lista.findIndex((x) => x.id === item.id);
    return i < 0 ? [...lista, item] : lista.map((x, j) => (j === i ? item : x));
  };

  return {
    obtener() {
      return structuredClone(datos);
    },
    guardarPregunta(p) {
      const error = validarPreguntaPropia(p, categoriasValidas());
      if (error) return { ok: false, error };
      const pregunta = {
        id: p.id && p.id.startsWith('n-') ? p.id : nuevoId(),
        categoria: p.categoria,
        formato: p.formato,
        ...(p.formato === 'corta' ? { subtipo: p.subtipo, opciones: p.opciones.map(limpiar) } : {}),
        profundidad: p.profundidad,
        texto: limpiar(p.texto),
      };
      datos.preguntas = reemplazar(datos.preguntas, pregunta);
      guardar();
      return { ok: true, pregunta };
    },
    borrarPregunta(id) {
      datos.preguntas = datos.preguntas.filter((p) => p.id !== id);
      datos.sesiones = datos.sesiones.map((s) => ({
        ...s, bloques: s.bloques.map((b) => ({ ...b, preguntas: b.preguntas.filter((x) => x !== id) })),
      }));
      guardar();
    },
    guardarCategoria(c) {
      const nombre = limpiar(c.nombre);
      if (!nombre) return { ok: false, error: 'Pónganle un nombre a la categoría.' };
      if (nombre.length > MAX_NOMBRE) return { ok: false, error: `El nombre puede tener máximo ${MAX_NOMBRE} caracteres.` };
      const categoria = {
        id: c.id && c.id.startsWith('n-') ? c.id : nuevoId(),
        nombre,
        descripcion: limpiar(c.descripcion) || 'Categoría creada por ustedes',
        icono: limpiar(c.icono) || '♡',
        color: c.color || '#c9a45c',
      };
      datos.categorias = reemplazar(datos.categorias, categoria);
      guardar();
      return { ok: true, categoria };
    },
    borrarCategoria(id) {
      if (datos.preguntas.some((p) => p.categoria === id)) {
        return { ok: false, error: 'Esta categoría tiene preguntas. Muévanlas o bórrenlas primero.' };
      }
      datos.categorias = datos.categorias.filter((c) => c.id !== id);
      guardar();
      return { ok: true };
    },
    ocultar(id) {
      if (!datos.ocultas.includes(id)) datos.ocultas = [...datos.ocultas, id];
      guardar();
    },
    restaurar(id) {
      datos.ocultas = datos.ocultas.filter((x) => x !== id);
      guardar();
    },
    guardarSesion(s) {
      const nombre = limpiar(s.nombre);
      if (!nombre) return { ok: false, error: 'Pónganle un nombre a la sesión.' };
      if (nombre.length > MAX_NOMBRE) return { ok: false, error: `El nombre puede tener máximo ${MAX_NOMBRE} caracteres.` };
      if (!s.preguntas?.length) return { ok: false, error: 'Escojan al menos una pregunta.' };
      const sesion = {
        id: s.id && s.id.startsWith('n-') ? s.id : nuevoId(),
        nombre,
        descripcion: 'Sesión armada por ustedes.',
        bloques: [{ nombre, preguntas: [...s.preguntas] }],
      };
      datos.sesiones = reemplazar(datos.sesiones, sesion);
      guardar();
      return { ok: true, sesion };
    },
    borrarSesion(id) {
      datos.sesiones = datos.sesiones.filter((s) => s.id !== id);
      guardar();
    },
  };
}
