// Copia de seguridad desde Ajustes: guardar todo lo de Okupa en un archivo y recuperarlo.
// Lo que es de este celular (pareja, avisos, bienvenida) lo filtra almacen.js.
import { el } from './ui.js';
import { exportarRespaldo, importarRespaldo, validarRespaldo } from './almacen.js';

const dos = (n) => String(n).padStart(2, '0');
export const nombreCopia = (fecha = new Date()) =>
  `okupa-copia-${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}.json`;

// Cada módulo puede revisar el contenido de sus claves con `validadoresRespaldo`.
export function validadoresDe(modulos = []) {
  return Object.assign({}, ...modulos.map((m) => m?.validadoresRespaldo || {}));
}

export function descargarCopia(almacen) {
  const blob = new Blob([JSON.stringify(exportarRespaldo(almacen), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: nombreCopia() });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Hoja para elegir un archivo de copia y decidir si reemplaza o se combina con lo que hay.
// `alTerminar()` se llama al cerrar después de recuperar bien (la app se recarga para verlo).
export function abrirHojaRecuperar(almacen, validadores = {}, alTerminar = () => {}) {
  const mensaje = el('p', { clase: 'campo-ayuda', role: 'status' }, 'Escoge un archivo de copia de Okupa.');
  const acciones = el('div', { clase: 'hoja-acciones' });
  const archivo = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  const elegir = el('button', { clase: 'boton', type: 'button', onclick: () => archivo.click() }, 'Elegir archivo');
  const cerrar = () => { hoja.remove(); document.removeEventListener('keydown', alTeclear); };
  const alTeclear = (e) => { if (e.key === 'Escape') cerrar(); };

  const aplicar = (copia, modo) => {
    const r = importarRespaldo(almacen, copia, modo, validadores);
    if (!r.ok) { mensaje.textContent = r.error; acciones.replaceChildren(elegir); return; }
    mensaje.textContent = modo === 'reemplazar' ? 'Listo: se cargó la copia.' : 'Listo: se combinó la copia con lo que tenían.';
    acciones.replaceChildren(el('button', {
      clase: 'boton boton-principal', type: 'button', onclick: () => { cerrar(); alTerminar(); },
    }, 'Listo'));
  };

  archivo.addEventListener('change', async () => {
    const f = archivo.files?.[0];
    if (!f) return;
    let copia;
    try { copia = JSON.parse(await f.text()); } catch {
      mensaje.textContent = 'Ese archivo no se pudo leer. ¿Es una copia de Okupa?';
      acciones.replaceChildren(elegir);
      return;
    }
    const problema = validarRespaldo(copia, validadores);
    if (problema) { mensaje.textContent = problema; acciones.replaceChildren(elegir); return; }
    mensaje.textContent = '¿Qué hacemos con lo que ya tienen en este celular? Su pareja enlazada se queda como está.';
    acciones.replaceChildren(
      el('button', { clase: 'boton boton-principal', type: 'button', onclick: () => aplicar(copia, 'reemplazar') }, 'Reemplazar todo'),
      el('button', { clase: 'boton', type: 'button', onclick: () => aplicar(copia, 'combinar') }, 'Combinar'));
  });
  acciones.append(elegir);

  const hoja = el('div', { clase: 'hoja-fondo', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Recuperar copia',
    onclick: (e) => { if (e.target === hoja) cerrar(); } },
  el('div', { clase: 'hoja' },
    el('h2', {}, 'Recuperar copia'),
    mensaje,
    archivo,
    acciones,
    el('div', { clase: 'hoja-acciones' },
      el('button', { clase: 'boton-texto', type: 'button', onclick: cerrar }, 'Cancelar'))));
  document.addEventListener('keydown', alTeclear);
  document.body.append(hoja);
  return hoja;
}
