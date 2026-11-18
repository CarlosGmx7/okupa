// Aviso «hay una APK nueva»: solo en la app instalada (la APK de Android, que es una TWA).
// La APK no se actualiza sola: se detecta que se está dentro de ella, se compara con data/apk.json
// (siempre de la red) y, si hay una versión mayor, se ofrece descargarla desde Releases.
import { el } from './ui.js';

const PAQUETE = 'android-app://io.github.carlosgmx7.okupa';
const CLAVE_SESION = 'okupa:apk';
const CLAVE_DESCARTADA = 'okupa:apk:descartada';
const NO_ES_APK = { enApk: false, versionCode: null };

const entero = (v) => (Number.isInteger(v) && v > 0 ? v : null);

// Dentro de la TWA, el primer arranque trae `document.referrer` = android-app://<paquete>/ (la versión 1,
// que no tiene `?apk`); las siguientes pueden traer `?apk=N` en la dirección de inicio. El referrer solo
// existe en la primera carga, así que el resultado se guarda en la sesión para las llamadas siguientes.
export function detectarApk({ referrer = '', url = '', sesion = null } = {}) {
  let versionCode = null;
  try {
    const n = new URL(url, 'https://okupa.invalid/').searchParams.get('apk');
    if (n && /^\d+$/.test(n)) versionCode = entero(Number(n));
  } catch { /* dirección rara: se ignora */ }
  if (versionCode === null && String(referrer).startsWith(PAQUETE)) versionCode = 1;
  if (versionCode !== null) {
    const hallado = { enApk: true, versionCode };
    try { sesion?.setItem(CLAVE_SESION, JSON.stringify(hallado)); } catch { /* sin sesión */ }
    return hallado;
  }
  try {
    const guardado = JSON.parse(sesion?.getItem(CLAVE_SESION) ?? 'null');
    if (guardado?.enApk === true && entero(guardado.versionCode)) return { enApk: true, versionCode: guardado.versionCode };
  } catch { /* sin sesión o dato roto */ }
  return { ...NO_ES_APK };
}

// Lee la última versión publicada. Cualquier problema (sin internet, JSON roto, datos raros) da null.
export async function leerUltimaApk(fetchFn = (...a) => globalThis.fetch(...a)) {
  try {
    const r = await fetchFn('data/apk.json', { cache: 'no-store' });
    if (!r.ok) return null;
    const d = await r.json();
    const versionCode = entero(d?.versionCode);
    if (versionCode === null || typeof d.version !== 'string' || typeof d.url !== 'string') return null;
    if (!d.url.startsWith('https://')) return null;
    return { versionCode, version: d.version, url: d.url };
  } catch {
    return null;
  }
}

export function debeAvisar(instalada, ultima, descartada) {
  return Boolean(instalada?.enApk && ultima && Number.isInteger(ultima.versionCode)
    && ultima.versionCode > instalada.versionCode && ultima.versionCode !== descartada);
}

// Franja arriba del inicio. Sin la app, sin internet o con apk.json roto no pinta nada ni avisa de errores.
export function montarAvisoApk(contenedor, ctx, { detectado = ctx?.apk, leer = leerUltimaApk } = {}) {
  if (!detectado?.enApk) return;
  (async () => {
    try {
      const ultima = await leer();
      const descartada = ctx.almacen?.leer(CLAVE_DESCARTADA, null) ?? null;
      if (!debeAvisar(detectado, ultima, descartada)) return;
      const franja = el('div', { clase: 'franja-solicitud franja-apk', role: 'group', 'aria-label': 'Versión nueva de la app' },
        el('p', { clase: 'franja-solicitud-texto' }, 'Hay una versión nueva de la app'),
        el('div', { clase: 'franja-solicitud-acciones' },
          el('a', { clase: 'boton boton-principal', href: ultima.url, target: '_blank', rel: 'noopener' }, 'Descargar'),
          el('button', {
            clase: 'boton', type: 'button',
            onclick: () => { ctx.almacen?.escribir(CLAVE_DESCARTADA, ultima.versionCode); franja.remove(); },
          }, 'Ahora no')));
      contenedor.replaceChildren(franja);
    } catch { /* sin aviso */ }
  })();
}
