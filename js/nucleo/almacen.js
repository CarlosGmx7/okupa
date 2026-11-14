// Acceso seguro a localStorage: si el navegador lo bloquea o está lleno,
// la app sigue funcionando sin recordar.

const PREFIJO = 'okupa:';
const LISTAS_POR_ID = ['preguntas', 'categorias', 'sesiones'];

function storagePorDefecto() {
  try { return globalThis.localStorage; } catch { return null; }
}

export function crearAlmacen(storage = storagePorDefecto()) {
  return {
    leer(clave, defecto = null) {
      try {
        const crudo = storage.getItem(clave);
        return crudo === null ? defecto : JSON.parse(crudo);
      } catch {
        return defecto;
      }
    },
    escribir(clave, valor) {
      try {
        storage.setItem(clave, JSON.stringify(valor));
        return true;
      } catch {
        return false;
      }
    },
    borrar(clave) {
      try { storage.removeItem(clave); } catch { /* sin almacenamiento */ }
    },
    disponible() {
      try {
        const k = `${PREFIJO}__prueba`;
        storage.setItem(k, '1');
        storage.removeItem(k);
        return true;
      } catch {
        return false;
      }
    },
    claves(prefijo = PREFIJO) {
      try {
        const lista = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith(prefijo)) lista.push(k);
        }
        return lista;
      } catch {
        return [];
      }
    },
  };
}

export const almacen = crearAlmacen();

// Lo que es de este celular no viaja en la copia: el lugar en la pareja (importarlo en otro celular
// le quitaría el lugar al de verdad), el registro de avisos y la marca de la bienvenida.
const PREFIJOS_DEL_CELULAR = ['okupa:pareja', 'okupa:dispositivo', 'okupa:notificaciones', 'okupa:bienvenida'];
export const esDeEsteCelular = (clave) => PREFIJOS_DEL_CELULAR.some((p) => clave === p || clave.startsWith(`${p}:`));

export function exportarRespaldo(alm, prefijo = PREFIJO) {
  const datos = {};
  for (const clave of alm.claves(prefijo)) if (!esDeEsteCelular(clave)) datos[clave] = alm.leer(clave);
  return { app: 'okupa', version: 1, fecha: new Date().toISOString(), datos };
}

function esObjeto(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// Devuelve el problema de una copia de seguridad, o null si se puede importar.
// `validadores` (clave → fn(valor) → boolean) los aporta cada módulo para revisar su contenido.
export function validarRespaldo(respaldo, validadores = {}) {
  if (!esObjeto(respaldo) || respaldo.app !== 'okupa') return 'Este archivo no es una copia de Okupa.';
  if (respaldo.version !== 1) return 'Esta copia es de una versión de Okupa que esta app no reconoce.';
  if (!esObjeto(respaldo.datos)) return 'La copia está incompleta o dañada.';
  for (const [clave, valor] of Object.entries(respaldo.datos)) {
    if (!clave.startsWith(PREFIJO)) return 'La copia trae datos que no son de Okupa.';
    if (validadores[clave] && !validadores[clave](valor)) return 'La copia está incompleta o dañada.';
  }
  return null;
}

function unirPorId(local = [], importado = []) {
  const mapa = new Map();
  for (const x of local) mapa.set(x?.id, x);
  for (const x of importado) mapa.set(x?.id, x);
  return [...mapa.values()];
}

function combinarValor(local, importado) {
  if (!esObjeto(local) || !esObjeto(importado)) return importado;
  const resultado = { ...local, ...importado };
  for (const lista of LISTAS_POR_ID) {
    if (Array.isArray(local[lista]) || Array.isArray(importado[lista])) {
      resultado[lista] = unirPorId(local[lista], importado[lista]);
    }
  }
  if (Array.isArray(local.ocultas) || Array.isArray(importado.ocultas)) {
    resultado.ocultas = [...new Set([...(local.ocultas || []), ...(importado.ocultas || [])])];
  }
  return resultado;
}

export function importarRespaldo(alm, respaldo, modo = 'reemplazar', validadores = {}) {
  const error = validarRespaldo(respaldo, validadores);
  if (error) return { ok: false, error };
  const anterior = exportarRespaldo(alm).datos;
  const borrarLoCopiable = () => {
    for (const clave of alm.claves(PREFIJO)) if (!esDeEsteCelular(clave)) alm.borrar(clave);
  };
  const restaurar = () => {
    borrarLoCopiable();
    for (const [clave, valor] of Object.entries(anterior)) alm.escribir(clave, valor);
  };
  if (modo === 'reemplazar') borrarLoCopiable();
  for (const [clave, valor] of Object.entries(respaldo.datos)) {
    if (esDeEsteCelular(clave)) continue;
    const final = modo === 'combinar' ? combinarValor(alm.leer(clave), valor) : valor;
    if (!alm.escribir(clave, final)) {
      restaurar();
      return { ok: false, error: 'No se pudo guardar la copia (¿el celular no tiene espacio?). Sus datos quedaron como estaban.' };
    }
  }
  return { ok: true };
}
