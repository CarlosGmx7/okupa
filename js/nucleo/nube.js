// Única puerta a internet de Okupa (Firebase). Lo demás de la app no depende de ella:
// el SDK se descarga solo cuando una sección en línea lo pide.
import { CONFIG_FIREBASE, EMULADORES } from './nube-config.js';

export const VERSION_FIREBASE = '13.1.0';
const ESPERA_MAXIMA_MS = 10000;

// codigo: 'sin-config' | 'sin-conexion' | 'permiso' | 'desconocido'
export class ErrorNube extends Error {
  constructor(codigo, mensaje = codigo) {
    super(mensaje);
    this.name = 'ErrorNube';
    this.codigo = codigo;
  }
}

const SIN_CONEXION = ['unavailable', 'deadline-exceeded', 'auth/network-request-failed', 'auth/timeout'];

// Traduce errores de Firebase; los demás (p. ej. ErrorPareja lanzado en una transacción) pasan tal cual.
function traducir(e) {
  if (e instanceof ErrorNube || typeof e?.code !== 'string') return e;
  if (e.code === 'permission-denied') return new ErrorNube('permiso', e.message);
  if (SIN_CONEXION.includes(e.code)) return new ErrorNube('sin-conexion', e.message);
  return new ErrorNube('desconocido', e.message);
}

async function cargarSdkDefecto() {
  const base = `https://www.gstatic.com/firebasejs/${VERSION_FIREBASE}`;
  try {
    const [app, auth, fs] = await Promise.all([
      import(`${base}/firebase-app.js`), import(`${base}/firebase-auth.js`), import(`${base}/firebase-firestore.js`),
    ]);
    return { app, auth, fs };
  } catch (e) {
    throw new ErrorNube('sin-conexion', `No se pudo descargar Firebase: ${e.message}`);
  }
}

function conTiempoLimite(promesa) {
  let reloj;
  const limite = new Promise((_, rechazar) => {
    reloj = setTimeout(() => rechazar(new ErrorNube('sin-conexion', 'Firebase no respondió a tiempo')), ESPERA_MAXIMA_MS);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(reloj));
}

export function crearNube({ config, emuladores = null, nombreApp = '[DEFAULT]', cargarSdk = cargarSdkDefecto } = {}) {
  let preparado = null;
  let sdk = null;

  const preparar = () => (preparado ??= (async () => {
    if (!config) throw new ErrorNube('sin-config');
    sdk = await cargarSdk();
    const app = sdk.app.getApps().find((a) => a.name === nombreApp) || sdk.app.initializeApp(config, nombreApp);
    const auth = sdk.auth.getAuth(app);
    const db = sdk.fs.getFirestore(app);
    if (emuladores) {
      sdk.auth.connectAuthEmulator(auth, emuladores.auth, { disableWarnings: true });
      sdk.fs.connectFirestoreEmulator(db, emuladores.firestore.host, emuladores.firestore.puerto);
    }
    return { auth, db, app };
  })().catch((e) => { preparado = null; throw e; }));

  async function iniciar() {
    try {
      const { auth } = await preparar();
      await conTiempoLimite(auth.authStateReady());
      if (!auth.currentUser) await conTiempoLimite(sdk.auth.signInAnonymously(auth));
      return { uid: auth.currentUser.uid };
    } catch (e) { throw traducir(e); }
  }

  // Asegura sesión y ejecuta `fn(db)` traduciendo los errores.
  async function conDb(fn) {
    await iniciar();
    const { db } = await preparar();
    try { return await fn(db, sdk.fs); } catch (e) { throw traducir(e); }
  }
  const datosDe = (foto) => (foto.exists() ? foto.data() : null);

  return {
    iniciar,
    leer: (ruta) => conDb(async (db, fs) => datosDe(await fs.getDoc(fs.doc(db, ruta)))),
    escribir: (ruta, datos, { combinar = false } = {}) => conDb((db, fs) => fs.setDoc(fs.doc(db, ruta), datos, { merge: combinar })),
    borrar: (ruta) => conDb((db, fs) => fs.deleteDoc(fs.doc(db, ruta))),
    listar: (coleccion) => conDb(async (db, fs) =>
      (await fs.getDocs(fs.collection(db, coleccion))).docs.map((d) => ({ id: d.id, datos: d.data() }))),
    transaccion: (fn) => conDb((db, fs) => fs.runTransaction(db, (t) => fn({
      leer: async (ruta) => datosDe(await t.get(fs.doc(db, ruta))),
      escribir: (ruta, datos, { combinar = false } = {}) => { t.set(fs.doc(db, ruta), datos, { merge: combinar }); },
    }))),
    escuchar(ruta, fn) {
      let cancelar = null;
      let activo = true;
      conDb((db, fs) => {
        if (!activo) return;
        cancelar = fs.onSnapshot(fs.doc(db, ruta), (foto) => {
          // Sin red, un documento que no está en la caché llega como "no existe": no es cierto, se ignora.
          if (foto.metadata.fromCache && !foto.exists()) return;
          fn(datosDe(foto));
        }, (e) => console.warn('Okupa: escucha cortada', traducir(e)));
      }).catch((e) => console.warn('Okupa: no se pudo escuchar', e));
      return () => { activo = false; cancelar?.(); };
    },
    horaServidor: () => (sdk ? sdk.fs.serverTimestamp() : Date.now()),
    // La app de Firebase, para servicios que no pasan por aquí (las notificaciones).
    async appFirebase() {
      await iniciar();
      return (await preparar()).app;
    },
  };
}

let unica = null;

// La nube de la app, con la configuración de nube-config.js. Rechaza con ErrorNube si no se puede.
export async function obtenerNube() {
  if (!CONFIG_FIREBASE) throw new ErrorNube('sin-config');
  unica ??= crearNube({ config: CONFIG_FIREBASE, emuladores: EMULADORES });
  await unica.iniciar();
  return unica;
}
