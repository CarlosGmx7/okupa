// Cápsula del tiempo: cartas con fecha de apertura. Los metadatos viven en
// parejas/{c}/capsulas/{id} y el texto aparte, en capsulas/{id}/contenido/texto (las reglas
// solo dejan leerlo cuando la carta ya abrió). La copia local guarda solo metadatos.

import { hoyLocal } from '../fechas/datos.js';
import { MAX_CARTAS, MAX_TEXTO, MAX_DIAS, diasHasta } from './logica.js';

export { hoyLocal };
export const CLAVE_COPIA = 'okupa:capsulas';

const REGEX_DIA = /^\d{4}-\d{2}-\d{2}$/;
const ERROR_TEXTO = `Escribe la carta (máximo ${MAX_TEXTO.toLocaleString('es-CO')} caracteres).`;
const ruta = (pareja) => `parejas/${pareja.codigo}/capsulas`;

function diaValido(texto) {
  if (typeof texto !== 'string' || !REGEX_DIA.test(texto)) return false;
  const [a, m, d] = texto.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

// Medianoche local del día 'YYYY-MM-DD'.
export function abreMsDe(abreEl) {
  const [a, m, d] = abreEl.split('-').map(Number);
  return new Date(a, m - 1, d).getTime();
}

export function validarCarta({ abreEl, texto }, hoy) {
  if (!diaValido(abreEl) || diasHasta(abreEl, hoy) < 1) return 'Escoge una fecha desde mañana.';
  if (diasHasta(abreEl, hoy) > MAX_DIAS) return 'La fecha no puede pasar de 10 años.';
  const t = typeof texto === 'string' ? texto.trim() : '';
  if (t.length < 1 || t.length > MAX_TEXTO) return ERROR_TEXTO;
  return null;
}

export async function listarCartas(nube, pareja) {
  const filas = await nube.listar(ruta(pareja));
  return filas.map(({ id, datos }) => ({
    id, de: datos.de, abreEl: datos.abreEl, abreMs: datos.abreMs, creadaMs: datos.creadaMs,
  }));
}

export async function crearCarta(nube, pareja, { abreEl, texto }, hoy = hoyLocal(), ahora = Date.now()) {
  const error = validarCarta({ abreEl, texto }, hoy);
  if (error) return { ok: false, error };
  const base = ruta(pareja);
  if ((await nube.listar(base)).length >= MAX_CARTAS) {
    return { ok: false, error: `Ya tienen ${MAX_CARTAS} cartas. Borren alguna para escribir otra.` };
  }
  const id = `c-${ahora.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  // Primero los metadatos: las reglas exigen que existan para aceptar el texto.
  await nube.escribir(`${base}/${id}`, { de: pareja.lugar, abreEl, abreMs: abreMsDe(abreEl), creadaMs: ahora });
  await nube.escribir(`${base}/${id}/contenido/texto`, { texto: texto.trim() });
  return { ok: true, id };
}

// null solo si no existe; si la carta aún no abre, el error de permiso sube a quien llama.
export async function leerTexto(nube, pareja, id) {
  const doc = await nube.leer(`${ruta(pareja)}/${id}/contenido/texto`);
  return doc && typeof doc.texto === 'string' ? doc.texto : null;
}

// Las reglas piden que el texto ya no exista antes de borrar los metadatos.
export async function borrarCarta(nube, pareja, id) {
  await nube.borrar(`${ruta(pareja)}/${id}/contenido/texto`);
  await nube.borrar(`${ruta(pareja)}/${id}`);
}

// La copia se ata al código de la pareja para no mostrar cartas de una pareja anterior.
export function guardarCopia(almacen, cartas, codigo) {
  almacen.escribir(CLAVE_COPIA, { codigo, cartas });
}

export function leerCopia(almacen, codigo) {
  const c = almacen.leer(CLAVE_COPIA, null);
  if (!c || !codigo || c.codigo !== codigo || !Array.isArray(c.cartas)) return null;
  return c.cartas;
}

export async function refrescarCopia(nube, pareja, almacen) {
  const cartas = await listarCartas(nube, pareja);
  guardarCopia(almacen, cartas, pareja.codigo);
  return cartas;
}
