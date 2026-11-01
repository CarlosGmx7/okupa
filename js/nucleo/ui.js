// Componentes de interfaz compartidos por todos los módulos.

export function el(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (nombre === 'clase') nodo.className = valor;
    else if (nombre.startsWith('on') && typeof valor === 'function') nodo.addEventListener(nombre.slice(2), valor);
    else if (valor === true) nodo.setAttribute(nombre, '');
    else nodo.setAttribute(nombre, valor);
  }
  agregarHijos(nodo, hijos);
  return nodo;
}

export function movimientoReducido() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// Cambia de pantalla con View Transitions si el navegador lo permite.
export async function transicion(fn) {
  if (!document.startViewTransition || movimientoReducido() || document.hidden) {
    await fn();
    return;
  }
  const t = document.startViewTransition(fn);
  try { await t.updateCallbackDone; } catch { /* la pantalla igual se pinta */ }
}

function agregarHijos(nodo, hijos) {
  for (const hijo of hijos) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    if (Array.isArray(hijo)) agregarHijos(nodo, hijo);
    else if (hijo instanceof Node) nodo.append(hijo);
    else nodo.append(document.createTextNode(String(hijo)));
  }
}
