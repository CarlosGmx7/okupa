import { prueba, igual, verdadero } from './corredor.js';
import { crearNube, cargarSdkDefecto, ErrorNube } from '../js/nucleo/nube.js';

// SDK falso: anota el orden de las llamadas.
function sdkFalso(llamadas) {
  const auth = { authStateReady: async () => {}, currentUser: { uid: 'u1' } };
  return {
    app: { getApps: () => [], initializeApp: () => { llamadas.push('initializeApp'); return { name: 'x' }; } },
    auth: { getAuth: () => { llamadas.push('getAuth'); return auth; }, connectAuthEmulator() { llamadas.push('connectAuthEmulator'); }, signInAnonymously: async () => {} },
    fs: { getFirestore: () => { llamadas.push('getFirestore'); return {}; }, connectFirestoreEmulator() {}, serverTimestamp: () => 'ts' },
    appCheck: {
      ReCaptchaEnterpriseProvider: class { constructor(clave) { this.clave = clave; } },
      initializeAppCheck: (app, opciones) => { llamadas.push({ appCheck: opciones }); },
    },
  };
}
const opcionesBase = (llamadas, extra = {}) => ({
  config: { projectId: 'p' }, anfitrion: 'carlosgmx7.github.io', global: {},
  cargarSdk: async () => sdkFalso(llamadas), ...extra,
});
const veces = (llamadas) => llamadas.filter((l) => typeof l === 'object').length;

prueba('nube: con clave y sin emuladores, App Check se inicia una vez y antes de getAuth y getFirestore', async () => {
  const llamadas = [];
  const nube = crearNube(opcionesBase(llamadas, { claveRecaptcha: 'CLAVE' }));
  await nube.iniciar();
  await nube.iniciar();
  igual(veces(llamadas), 1);
  const i = llamadas.findIndex((l) => typeof l === 'object');
  verdadero(i < llamadas.indexOf('getAuth') && i < llamadas.indexOf('getFirestore'), 'va antes de getAuth y getFirestore');
  verdadero(i > llamadas.indexOf('initializeApp'), 'va después de initializeApp');
  igual(llamadas[i].appCheck.isTokenAutoRefreshEnabled, true);
  igual(llamadas[i].appCheck.provider.clave, 'CLAVE');
});

prueba('nube: con emuladores no se inicia App Check', async () => {
  const llamadas = [];
  const emuladores = { auth: 'http://127.0.0.1:9099', firestore: { host: '127.0.0.1', puerto: 8085 } };
  await crearNube(opcionesBase(llamadas, { claveRecaptcha: 'CLAVE', emuladores })).iniciar();
  igual(veces(llamadas), 0);
});

prueba('nube: con claveRecaptcha null no se inicia App Check y la nube funciona', async () => {
  const llamadas = [];
  let pidioAppCheck = null;
  const nube = crearNube(opcionesBase(llamadas, {
    claveRecaptcha: null, cargarSdk: async (o) => { pidioAppCheck = o.conAppCheck; return sdkFalso(llamadas); },
  }));
  igual((await nube.iniciar()).uid, 'u1');
  igual(veces(llamadas), 0);
  igual(pidioAppCheck, false);
});

prueba('nube: en localhost y 127.0.0.1 se activa el token de depuración antes de App Check', async () => {
  for (const anfitrion of ['localhost', '127.0.0.1']) {
    const llamadas = [];
    const global = {};
    const o = opcionesBase(llamadas, { claveRecaptcha: 'CLAVE', anfitrion, global });
    const sdk = sdkFalso(llamadas);
    let vistoAlIniciar;
    sdk.appCheck.initializeAppCheck = () => { vistoAlIniciar = global.FIREBASE_APPCHECK_DEBUG_TOKEN; };
    await crearNube({ ...o, cargarSdk: async () => sdk }).iniciar();
    igual(vistoAlIniciar, true);
  }
});

prueba('nube: en el dominio real no se activa el token de depuración', async () => {
  const llamadas = [];
  const global = {};
  await crearNube(opcionesBase(llamadas, { claveRecaptcha: 'CLAVE', global })).iniciar();
  igual('FIREBASE_APPCHECK_DEBUG_TOKEN' in global, false);
});

prueba('nube: si no carga firebase-app-check.js, iniciar rechaza con sin-conexion', async () => {
  const importar = async (url) => {
    if (url.endsWith('firebase-app-check.js')) throw new Error('sin red');
    return {};
  };
  const nube = crearNube({
    config: { projectId: 'p' }, claveRecaptcha: 'CLAVE', anfitrion: 'carlosgmx7.github.io', global: {},
    cargarSdk: (o) => cargarSdkDefecto({ ...o, importar }),
  });
  let error = null;
  try { await nube.iniciar(); } catch (e) { error = e; }
  verdadero(error instanceof ErrorNube && error.codigo === 'sin-conexion', 'rechaza con ErrorNube sin-conexion');
});

prueba('nube: el cargador por defecto pide app-check solo cuando se necesita', async () => {
  const pedidos = [];
  const importar = async (url) => { pedidos.push(url.split('/').pop()); return {}; };
  await cargarSdkDefecto({ conAppCheck: false, importar });
  verdadero(!pedidos.includes('firebase-app-check.js'), 'sin App Check no lo descarga');
  pedidos.length = 0;
  const sdk = await cargarSdkDefecto({ conAppCheck: true, importar });
  verdadero(pedidos.includes('firebase-app-check.js') && sdk.appCheck, 'con App Check lo descarga');
});
