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

const ERROR_AL_GUARDAR = 'No se pudo guardar (¿el celular no tiene espacio?). Intenten de nuevo o liberen espacio.';

export function crearPropio(alm, categoriasValidas = () => new Set()) {
  let datos = leerDatos(alm);
  // Aplica `cambio` y lo guarda. Si el celular no deja escribir, deshace el cambio y devuelve el error.
  // Si el navegador no guarda nada (modo privado), se trabaja en memoria: la pantalla ya lo advierte.
  const guardar = (cambio, resultado = {}) => {
    const anterior = datos;
    datos = { ...datos };
    cambio(datos);
    if (alm.escribir(CLAVE, datos) || !alm.disponible()) return { ok: true, ...resultado };
    datos = anterior;
    return { ok: false, error: ERROR_AL_GUARDAR };
  };
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
      return guardar((d) => { d.preguntas = reemplazar(d.preguntas, pregunta); }, { pregunta });
    },
    borrarPregunta(id) {
      return guardar((d) => {
        d.preguntas = d.preguntas.filter((p) => p.id !== id);
        d.ocultas = d.ocultas.filter((x) => x !== id);
        d.sesiones = d.sesiones.map((s) => ({
          ...s, bloques: s.bloques.map((b) => ({ ...b, preguntas: b.preguntas.filter((x) => x !== id) })),
        }));
      });
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
      return guardar((d) => { d.categorias = reemplazar(d.categorias, categoria); }, { categoria });
    },
    borrarCategoria(id) {
      if (datos.preguntas.some((p) => p.categoria === id)) {
        return { ok: false, error: 'Esta categoría tiene preguntas. Muévanlas o bórrenlas primero.' };
      }
      return guardar((d) => { d.categorias = d.categorias.filter((c) => c.id !== id); });
    },
    ocultar(id) {
      return guardar((d) => { if (!d.ocultas.includes(id)) d.ocultas = [...d.ocultas, id]; });
    },
    restaurar(id) {
      return guardar((d) => { d.ocultas = d.ocultas.filter((x) => x !== id); });
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
      return guardar((d) => { d.sesiones = reemplazar(d.sesiones, sesion); }, { sesion });
    },
    borrarSesion(id) {
      return guardar((d) => { d.sesiones = d.sesiones.filter((s) => s.id !== id); });
    },
  };
}
