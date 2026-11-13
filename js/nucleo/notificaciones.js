// Notificaciones de este celular: preferencias, registro en dispositivos/{id} (token FCM, hora del
// recordatorio en UTC) y su ciclo de vida con la pareja. El envío lo hace el servidor (GitHub Actions).
import { miPareja } from './pareja.js';
import { CLAVE_VAPID } from './nube-config.js';
import { obtenerNube, VERSION_FIREBASE } from './nube.js';

const CLAVE = 'okupa:notificaciones';
const CLAVE_ID = 'okupa:dispositivo';
const CLAVE_PENDIENTE = 'okupa:dispositivo:borrar';
const TIPOS = ['diario', 'trivia', 'mapa', 'recordatorio'];
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const PREF_DEFECTO = Object.freeze({
  activas: false,
  avisos: Object.freeze({ diario: true, trivia: true, mapa: true, recordatorio: true }),
  hora: '20:00',
});

const esMapa = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Siempre completas: lo dañado vuelve al defecto campo por campo. `registro` guarda lo último enviado.
export function leerPreferencias(almacen) {
  const g = almacen?.leer(CLAVE, null);
  const f = esMapa(g) ? g : {};
  const avisos = { ...PREF_DEFECTO.avisos };
  if (esMapa(f.avisos)) for (const t of TIPOS) if (typeof f.avisos[t] === 'boolean') avisos[t] = f.avisos[t];
  return {
    activas: typeof f.activas === 'boolean' ? f.activas : PREF_DEFECTO.activas,
    avisos,
    hora: REGEX_HORA.test(f.hora) ? f.hora : PREF_DEFECTO.hora,
  };
}

const leerRegistroLocal = (almacen) => {
  const g = almacen?.leer(CLAVE, null);
  return esMapa(g?.registro) ? g.registro : null;
};

export function guardarPreferencias(almacen, cambios = {}, registro) {
  const antes = leerPreferencias(almacen);
  const nuevas = {
    ...antes,
    ...(typeof cambios.activas === 'boolean' ? { activas: cambios.activas } : {}),
    ...(REGEX_HORA.test(cambios.hora) ? { hora: cambios.hora } : {}),
    avisos: { ...antes.avisos },
  };
  if (esMapa(cambios.avisos)) for (const t of TIPOS) if (typeof cambios.avisos[t] === 'boolean') nuevas.avisos[t] = cambios.avisos[t];
  const reg = registro === undefined ? leerRegistroLocal(almacen) : registro;
  almacen.escribir(CLAVE, { ...nuevas, ...(reg ? { registro: reg } : {}) });
  return nuevas;
}

// Hora local "HH:MM" en `zona` → hora UTC redondeada hacia abajo a 15 min (como la busca el servidor).
export function franjaUTC(hora, zona, ahora = new Date()) {
  const [h, m] = hora.split(':').map(Number);
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(ahora).map((p) => [p.type, p.value]));
  const localComoUTC = Date.UTC(+partes.year, +partes.month - 1, +partes.day, +partes.hour, +partes.minute);
  const desfase = Math.round((localComoUTC - ahora.getTime()) / 60000);
  const minutos = (((h * 60 + m - desfase) % 1440) + 1440) % 1440;
  const redondo = Math.floor(minutos / 15) * 15;
  return `${String(Math.floor(redondo / 60)).padStart(2, '0')}:${String(redondo % 60).padStart(2, '0')}`;
}

export function soporteNotificaciones(entorno = globalThis) {
  if (!entorno?.Notification || !entorno.PushManager || !entorno.navigator?.serviceWorker) return 'sin-soporte';
  return entorno.Notification.permission === 'denied' ? 'denegado' : 'ok';
}

// Qué mostrar de un push de FCM ({ data: { titulo, texto, ruta, tipo } }). Copia idéntica en sw.js.
export function datosDeNotificacion(payload) {
  const d = payload?.data;
  if (!d || typeof d.titulo !== 'string' || !d.titulo) return null;
  const ruta = typeof d.ruta === 'string' && d.ruta.startsWith('#/') ? d.ruta : '#/';
  return {
    titulo: d.titulo,
    opciones: { body: String(d.texto || ''), tag: String(d.tipo || 'okupa'), icon: 'iconos/icono-192.png', badge: 'iconos/favicon-48.png', data: { ruta } },
  };
}

// Lo que se muestra siempre: Chrome castiga los push que no muestran nada. Copia idéntica en sw.js.
export function notificacionDePush(payload) {
  return datosDeNotificacion(payload) || {
    titulo: 'Okupa',
    opciones: { body: 'Tienes novedades en Okupa.', tag: 'okupa', icon: 'iconos/icono-192.png', badge: 'iconos/favicon-48.png', data: { ruta: '#/' } },
  };
}

// Si el service worker no pudo llevar la ventana a la ruta del aviso, se la pide a la app con un mensaje.
export function escucharRutasDelServiceWorker(sw, irA) {
  const oyente = (e) => {
    const ruta = e.data?.okupaRuta;
    if (typeof ruta === 'string' && ruta.startsWith('#/')) irA(ruta);
  };
  sw?.addEventListener?.('message', oyente);
  return () => sw?.removeEventListener?.('message', oyente);
}

const zonaDelCelular =() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';

export function crearNotificaciones({
  almacen, nube, obtenerToken, borrarToken = async () => {}, pedirPermiso,
  zona = zonaDelCelular, soporte = () => soporteNotificaciones(), claveVapid = CLAVE_VAPID,
  permisoActual = () => globalThis.Notification?.permission,
}) {
  const idDispositivo = () => {
    let id = almacen.leer(CLAVE_ID, null);
    if (typeof id !== 'string' || !/^[a-z0-9-]{8,60}$/.test(id)) {
      id = `d-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      almacen.escribir(CLAVE_ID, id);
    }
    return id;
  };
  const ruta = () => `dispositivos/${idDispositivo()}`;

  // Escribe el registro completo (merge: no toca ultimoRecordatorio, que es del servidor).
  async function registrar(token) {
    const pareja = miPareja(almacen);
    if (!pareja) return false;
    const prefs = leerPreferencias(almacen);
    const n = await nube();
    const { uid } = await n.iniciar();
    const z = zona();
    const datos = {
      uid, pareja: pareja.codigo, lugar: pareja.lugar, token, avisos: prefs.avisos,
      hora: prefs.hora, zona: z, franja: franjaUTC(prefs.hora, z),
    };
    await n.escribir(ruta(), { ...datos, actualizado: n.horaServidor() }, { combinar: true });
    guardarPreferencias(almacen, {}, {
      token, pareja: datos.pareja, lugar: datos.lugar, franja: datos.franja, zona: z, hora: datos.hora, avisos: datos.avisos,
    });
    return true;
  }

  async function activar() {
    if (!claveVapid) return { ok: false, motivo: 'sin-config' };
    const s = soporte();
    if (s !== 'ok') return { ok: false, motivo: s };
    if (!miPareja(almacen)) return { ok: false, motivo: 'sin-pareja' };
    // El permiso se pide primero, todavía dentro del toque del interruptor.
    const permiso = await pedirPermiso();
    if (permiso === 'denied') return { ok: false, motivo: 'denegado' };
    if (permiso !== 'granted') return { ok: false, motivo: 'sin-permiso' }; // cerró el aviso sin elegir
    try {
      const token = await obtenerToken();
      if (!token) throw new Error('sin-token');
      guardarPreferencias(almacen, { activas: true });
      await registrar(token);
      return { ok: true };
    } catch (e) {
      console.warn('Okupa: no se pudieron activar las notificaciones', e);
      guardarPreferencias(almacen, { activas: false });
      return { ok: false, motivo: 'sin-conexion' };
    }
  }

  // Si no hay red, el borrado queda pendiente y se reintenta en refrescar(): un celular que salió de la
  // pareja no debe seguir recibiendo avisos (en la nube su uid sigue siendo el del lugar).
  async function borrarRegistro() {
    const id = idDispositivo();
    guardarPreferencias(almacen, {}, null);
    try {
      const n = await nube();
      await n.borrar(`dispositivos/${id}`);
      almacen.borrar(CLAVE_PENDIENTE);
    } catch (e) {
      console.warn('Okupa: no se pudo borrar el registro de notificaciones; se reintentará', e);
      almacen.escribir(CLAVE_PENDIENTE, id);
    }
  }

  async function reintentarPendiente() {
    const id = almacen.leer(CLAVE_PENDIENTE, null);
    if (typeof id !== 'string') return;
    try {
      const n = await nube();
      await n.borrar(`dispositivos/${id}`);
      almacen.borrar(CLAVE_PENDIENTE);
    } catch { /* sigue pendiente */ }
  }

  async function desactivar() {
    guardarPreferencias(almacen, { activas: false });
    await borrarRegistro();
    try { await borrarToken(); } catch { /* sin token */ }
    return { ok: true };
  }

  async function cambiar(cambios) {
    const prefs = guardarPreferencias(almacen, cambios);
    const local = leerRegistroLocal(almacen);
    if (!prefs.activas || !local?.token) return prefs;
    try { await registrar(local.token); } catch (e) { console.warn('Okupa: no se pudo guardar el cambio de notificaciones', e); }
    return prefs;
  }

  // Al abrir la app o al enlazarse: renueva token, franja o pareja si cambiaron. Nunca lanza.
  async function refrescar() {
    try {
      await reintentarPendiente();
      const prefs = leerPreferencias(almacen);
      const pareja = miPareja(almacen);
      if (!prefs.activas || !pareja || !claveVapid || soporte() !== 'ok') return false;
      // Sin permiso concedido no se pide el token: Firebase intentaría pedir permiso fuera de un toque.
      if (permisoActual() !== 'granted') return false;
      const token = await obtenerToken();
      if (!token) return false;
      const local = leerRegistroLocal(almacen);
      const z = zona();
      const igual = local && local.token === token && local.pareja === pareja.codigo && local.lugar === pareja.lugar
        && local.zona === z && local.franja === franjaUTC(prefs.hora, z) && local.hora === prefs.hora
        && TIPOS.every((t) => local.avisos?.[t] === prefs.avisos[t]);
      if (igual) return false;
      return await registrar(token);
    } catch (e) {
      console.warn('Okupa: no se pudo refrescar el registro de notificaciones', e);
      return false;
    }
  }

  // Al salir de la pareja: deja de recibir, pero recuerda la preferencia para cuando se vuelva a enlazar.
  const olvidar = () => borrarRegistro();

  return { activar, desactivar, cambiar, refrescar, olvidar };
}

// La instancia real: Firebase Messaging desde gstatic, con el service worker de Okupa (sw.js).
export function notificacionesDeLaApp(almacen) {
  const mensajeria = async () => {
    const app = await (await obtenerNube()).appFirebase();
    const m = await import(`https://www.gstatic.com/firebasejs/${VERSION_FIREBASE}/firebase-messaging.js`);
    return { m, messaging: m.getMessaging(app) };
  };
  return crearNotificaciones({
    almacen,
    nube: obtenerNube,
    obtenerToken: async () => {
      const { m, messaging } = await mensajeria();
      return m.getToken(messaging, { vapidKey: CLAVE_VAPID, serviceWorkerRegistration: await navigator.serviceWorker.ready });
    },
    borrarToken: async () => {
      const { m, messaging } = await mensajeria();
      await m.deleteToken(messaging);
    },
    pedirPermiso: () => globalThis.Notification.requestPermission(),
  });
}

// Une el registro al ciclo de la pareja (pareja.js avisa con el evento 'okupa:pareja').
export function conectarConPareja(notificaciones) {
  const oyente = (e) => {
    if (e.detail?.enlazada) notificaciones.refrescar();
    else notificaciones.olvidar();
  };
  globalThis.addEventListener?.('okupa:pareja', oyente);
  return () => globalThis.removeEventListener?.('okupa:pareja', oyente);
}
