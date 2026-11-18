// Aviso «hay una APK nueva» (v24): detección de la app instalada, lectura de data/apk.json y la franja.
import { prueba, igual, verdadero } from './corredor.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { detectarApk, leerUltimaApk, debeAvisar, montarAvisoApk } from '../js/nucleo/apk.js';
import { pantallaInicio } from '../js/nucleo/inicio.js';
import { pantallaAjustes } from '../js/nucleo/pantalla-ajustes.js';
import { cambiarAjuste } from '../js/nucleo/ajustes.js';

const REFERRER = 'android-app://io.github.carlosgmx7.okupa/';
const URL_APK = 'https://github.com/CarlosGmx7/okupa/releases/latest';
const sesionFalsa = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, m };
};
const ultima = (versionCode, version = `1.0.${versionCode}`) => ({ versionCode, version, url: URL_APK });
const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 1000) {
  for (let t = 0; t < ms && !cond(); t += 20) await esperar(20);
  verdadero(cond(), 'no llegó a tiempo');
}

prueba('apk: el referrer de la app instalada es la versión 1', () => {
  igual(detectarApk({ referrer: REFERRER, url: 'https://x.github.io/okupa/', sesion: sesionFalsa() }), { enApk: true, versionCode: 1 });
});

prueba('apk: ?apk=3 es la versión 3, con o sin referrer', () => {
  igual(detectarApk({ referrer: '', url: 'https://x.github.io/okupa/?apk=3', sesion: sesionFalsa() }), { enApk: true, versionCode: 3 });
  igual(detectarApk({ referrer: REFERRER, url: 'https://x.github.io/okupa/?apk=3', sesion: sesionFalsa() }), { enApk: true, versionCode: 3 });
});

prueba('apk: en Chrome (sin referrer ni ?apk) no es la app', () => {
  igual(detectarApk({ referrer: '', url: 'https://x.github.io/okupa/', sesion: sesionFalsa() }), { enApk: false, versionCode: null });
  igual(detectarApk({ referrer: 'https://www.google.com/', url: 'https://x.github.io/okupa/?apk=abc', sesion: sesionFalsa() }), { enApk: false, versionCode: null });
  igual(detectarApk({ referrer: 'android-app://com.otra.app/', url: 'https://x.github.io/okupa/?apk=0', sesion: sesionFalsa() }), { enApk: false, versionCode: null });
});

prueba('apk: la segunda llamada sin referrer devuelve lo guardado en la sesión', () => {
  const sesion = sesionFalsa();
  detectarApk({ referrer: REFERRER, url: 'https://x.github.io/okupa/', sesion });
  verdadero(sesion.m.has('okupa:apk'), 'debe guardar en okupa:apk');
  igual(detectarApk({ referrer: '', url: 'https://x.github.io/okupa/#/trivia', sesion }), { enApk: true, versionCode: 1 });
});

prueba('apk: sin sesión usable no falla', () => {
  igual(detectarApk({ referrer: REFERRER, url: 'https://x.github.io/okupa/', sesion: null }), { enApk: true, versionCode: 1 });
  const rota = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
  igual(detectarApk({ referrer: '', url: 'https://x.github.io/okupa/', sesion: rota }), { enApk: false, versionCode: null });
});

prueba('apk: leerUltimaApk lee el JSON sin usar la caché', async () => {
  let opciones = null;
  const r = await leerUltimaApk(async (url, o) => { opciones = o; return new Response(JSON.stringify(ultima(2, '1.1.0'))); });
  igual(r, ultima(2, '1.1.0'));
  igual(opciones?.cache, 'no-store');
});

prueba('apk: leerUltimaApk da null si falla la red, el JSON está roto o los datos no sirven', async () => {
  igual(await leerUltimaApk(async () => { throw new TypeError('sin red'); }), null);
  igual(await leerUltimaApk(async () => new Response('{no es json')), null);
  igual(await leerUltimaApk(async () => new Response('', { status: 404 })), null);
  igual(await leerUltimaApk(async () => new Response(JSON.stringify({ versionCode: 'x', version: '1', url: URL_APK }))), null);
  igual(await leerUltimaApk(async () => new Response(JSON.stringify({ versionCode: 2, version: '1', url: 'javascript:alert(1)' }))), null);
});

prueba('apk: data/apk.json real tiene la versión 1 y la dirección de Releases', async () => {
  const r = await leerUltimaApk((u, o) => fetch(u, o));
  igual(r, { versionCode: 1, version: '1.0.0', url: URL_APK });
});

prueba('apk: debeAvisar solo en la app, con una versión mayor y no descartada', () => {
  const dentro = { enApk: true, versionCode: 1 };
  igual(debeAvisar(dentro, ultima(2), null), true);
  igual(debeAvisar(dentro, ultima(1), null), false);
  igual(debeAvisar(dentro, ultima(2), 2), false);
  igual(debeAvisar(dentro, ultima(3), 2), true);
  igual(debeAvisar({ enApk: false, versionCode: null }, ultima(9), null), false);
  igual(debeAvisar(dentro, null, null), false);
});

prueba('apk: instalada 1 y última 2 muestra la franja con Descargar y Ahora no', async () => {
  const div = document.createElement('div');
  const almacen = almacenEnMemoria();
  montarAvisoApk(div, { almacen }, { detectado: { enApk: true, versionCode: 1 }, leer: async () => ultima(2) });
  await hasta(() => div.querySelector('.franja-apk'));
  verdadero(div.textContent.includes('Hay una versión nueva de la app'), div.textContent);
  const a = [...div.querySelectorAll('a')].find((x) => x.textContent === 'Descargar');
  verdadero(a, 'falta Descargar');
  igual([a.getAttribute('href'), a.getAttribute('target'), a.getAttribute('rel')], [URL_APK, '_blank', 'noopener']);
  verdadero([...div.querySelectorAll('button')].some((b) => b.textContent === 'Ahora no'), 'falta Ahora no');
});

prueba('apk: Ahora no la quita y no vuelve con la última 2, pero sí con la 3', async () => {
  const almacen = almacenEnMemoria();
  const div = document.createElement('div');
  montarAvisoApk(div, { almacen }, { detectado: { enApk: true, versionCode: 1 }, leer: async () => ultima(2) });
  await hasta(() => div.querySelector('.franja-apk'));
  [...div.querySelectorAll('button')].find((b) => b.textContent === 'Ahora no').click();
  igual(div.children.length, 0);
  igual(almacen.leer('okupa:apk:descartada'), 2);

  const otra = document.createElement('div');
  montarAvisoApk(otra, { almacen }, { detectado: { enApk: true, versionCode: 1 }, leer: async () => ultima(2) });
  await esperar(60);
  igual(otra.children.length, 0);

  const nueva = document.createElement('div');
  montarAvisoApk(nueva, { almacen }, { detectado: { enApk: true, versionCode: 1 }, leer: async () => ultima(3) });
  await hasta(() => nueva.querySelector('.franja-apk'));
});

prueba('apk: instalada igual a la última no muestra nada', async () => {
  const div = document.createElement('div');
  montarAvisoApk(div, { almacen: almacenEnMemoria() }, { detectado: { enApk: true, versionCode: 2 }, leer: async () => ultima(2) });
  await esperar(60);
  igual(div.children.length, 0);
});

prueba('apk: en Chrome nunca hay franja ni se pide apk.json', async () => {
  let pedidos = 0;
  const div = document.createElement('div');
  montarAvisoApk(div, { almacen: almacenEnMemoria() }, { detectado: { enApk: false, versionCode: null }, leer: async () => { pedidos++; return ultima(9); } });
  await esperar(60);
  igual([div.children.length, pedidos], [0, 0]);
});

prueba('apk: sin internet o con apk.json roto no sale franja ni error', async () => {
  for (const leer of [async () => null, async () => { throw new Error('sin red'); }]) {
    const div = document.createElement('div');
    montarAvisoApk(div, { almacen: almacenEnMemoria() }, { detectado: { enApk: true, versionCode: 1 }, leer });
    await esperar(60);
    igual(div.children.length, 0);
  }
});

prueba('apk: dos montajes seguidos piden apk.json una sola vez; un fallo no se guarda', async () => {
  let pedidos = 0;
  const leer = async () => { pedidos++; return ultima(2); };
  const montar = async () => {
    const div = document.createElement('div');
    montarAvisoApk(div, { almacen: almacenEnMemoria() }, { detectado: { enApk: true, versionCode: 1 }, leer });
    await hasta(() => div.querySelector('.franja-apk'));
  };
  await montar();
  await montar();
  igual(pedidos, 1);
  // Si falló (null), el siguiente montaje vuelve a intentar y puede lograrlo.
  let intentos = 0;
  const flojo = async () => (++intentos === 1 ? null : ultima(2));
  const a = document.createElement('div');
  montarAvisoApk(a, { almacen: almacenEnMemoria() }, { detectado: { enApk: true, versionCode: 1 }, leer: flojo });
  await esperar(60);
  igual(a.children.length, 0);
  const b = document.createElement('div');
  montarAvisoApk(b, { almacen: almacenEnMemoria() }, { detectado: { enApk: true, versionCode: 1 }, leer: flojo });
  await hasta(() => b.querySelector('.franja-apk'));
  igual(intentos, 2);
});

prueba('apk: el inicio lleva la franja arriba en las tres interfaces', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (u, o) => (String(u).includes('data/apk.json') ? new Response(JSON.stringify(ultima(2))) : original(u, o));
  try {
    for (const interfaz of ['moderna', 'simple', 'clasica']) {
      const almacen = almacenEnMemoria();
      cambiarAjuste(almacen, 'inicio', interfaz);
      const div = document.createElement('div');
      document.body.append(div);
      pantallaInicio(div, {}, { modulos: [], almacen, ir() {}, refrescar() {}, apk: { enApk: true, versionCode: 1 } });
      await hasta(() => div.querySelector('.franja-apk'));
      const franja = div.querySelector('.franja-apk');
      const cabecera = div.querySelector('.inicio-cabecera');
      verdadero(cabecera.compareDocumentPosition(franja) & Node.DOCUMENT_POSITION_FOLLOWING, `${interfaz}: la franja va después de la cabecera`);
      const resto = div.querySelector('.inicio-tarjetas');
      verdadero(franja.compareDocumentPosition(resto) & Node.DOCUMENT_POSITION_FOLLOWING, `${interfaz}: la franja va antes de las tarjetas`);
      // La franja de solicitudes (celular nuevo) va por encima de la de la APK.
      const [deSolicitudes, deApk] = div.querySelectorAll('.inicio-solicitudes');
      verdadero(deApk?.contains(franja) && !deSolicitudes.contains(franja), `${interfaz}: la franja de la APK va debajo de la de solicitudes`);
      verdadero(deSolicitudes.compareDocumentPosition(deApk) & Node.DOCUMENT_POSITION_FOLLOWING, `${interfaz}: solicitudes antes que la APK`);
      div.remove();
    }
  } finally { globalThis.fetch = original; }
});

prueba('apk: Ajustes muestra «App instalada: versión 1» solo en la app', () => {
  const pintar = (apk) => {
    const div = document.createElement('div');
    pantallaAjustes(div, {}, { almacen: almacenEnMemoria(), modulos: [], ir() {}, refrescar() {}, puedeVibrar: true, apk });
    return div.textContent;
  };
  verdadero(pintar({ enApk: true, versionCode: 1 }).includes('App instalada: versión 1'), 'debe mostrarla en la app');
  verdadero(!pintar({ enApk: false, versionCode: null }).includes('App instalada'), 'no en Chrome');
  verdadero(!pintar(undefined).includes('App instalada'), 'no sin detección');
});
