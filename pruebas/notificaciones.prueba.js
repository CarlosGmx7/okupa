import { prueba, igual, verdadero } from './corredor.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearMundoFalso } from './nube-falsa.js';
import { salir } from '../js/nucleo/pareja.js';
import {
  PREF_DEFECTO, leerPreferencias, guardarPreferencias, franjaUTC, soporteNotificaciones,
  crearNotificaciones, datosDeNotificacion, conectarConPareja,
} from '../js/nucleo/notificaciones.js';

const ENLAZADA = { codigo: 'K7PQ2M', lugar: 'a' };

function preparar({ pareja = ENLAZADA, permiso = 'granted', token = 'tok-1', soporte = 'ok', clave = 'VAPID' } = {}) {
  const almacen = almacenEnMemoria();
  if (pareja) almacen.escribir('okupa:pareja:actual', pareja);
  const mundo = crearMundoFalso();
  const estado = { token, pedidos: 0, borrados: 0 };
  const n = crearNotificaciones({
    almacen,
    nube: async () => mundo.nube('u1'),
    obtenerToken: async () => estado.token,
    borrarToken: async () => { estado.borrados++; },
    pedirPermiso: async () => { estado.pedidos++; return permiso; },
    permisoActual: () => permiso,
    zona: () => 'America/Bogota',
    soporte: () => soporte,
    claveVapid: clave,
  });
  const registros = () => [...mundo.datos.keys()].filter((r) => r.startsWith('dispositivos/'));
  const registro = () => mundo.datos.get(registros()[0])?.valor;
  return { almacen, mundo, estado, n, registros, registro };
}

prueba('notificaciones: preferencias por defecto y dañadas', () => {
  const a = almacenEnMemoria();
  igual(leerPreferencias(a), PREF_DEFECTO);
  igual(PREF_DEFECTO.hora, '20:00');
  a.escribir('okupa:notificaciones', { activas: 'si', avisos: { diario: false, mapa: 3 }, hora: '25:00' });
  igual(leerPreferencias(a), { ...PREF_DEFECTO, avisos: { ...PREF_DEFECTO.avisos, diario: false } });
  igual(guardarPreferencias(a, { hora: '21:30', avisos: { trivia: false } }).avisos, { diario: false, trivia: false, mapa: true, recordatorio: true });
});

prueba('notificaciones: franjaUTC', () => {
  const d = new Date('2026-11-13T12:00:00Z');
  igual(franjaUTC('20:00', 'America/Bogota', d), '01:00');
  igual(franjaUTC('20:10', 'America/Bogota', d), '01:00');
  igual(franjaUTC('23:50', 'America/Bogota', d), '04:45');
  igual(franjaUTC('08:00', 'UTC', d), '08:00');
});

prueba('notificaciones: soporte del navegador', () => {
  igual(soporteNotificaciones({}), 'sin-soporte');
  const base = { Notification: { permission: 'default' }, PushManager: function () {}, navigator: { serviceWorker: {} } };
  igual(soporteNotificaciones(base), 'ok');
  igual(soporteNotificaciones({ ...base, Notification: { permission: 'denied' } }), 'denegado');
});

prueba('notificaciones: activar sin pareja, sin permiso, sin soporte o sin clave no registra nada', async () => {
  for (const [opciones, motivo] of [[{ pareja: null }, 'sin-pareja'], [{ permiso: 'denied' }, 'denegado'],
    [{ soporte: 'sin-soporte' }, 'sin-soporte'], [{ clave: null }, 'sin-config']]) {
    const p = preparar(opciones);
    igual(await p.n.activar(), { ok: false, motivo }, motivo);
    igual(p.registros(), [], motivo);
    igual(leerPreferencias(p.almacen).activas, false, motivo);
  }
});

prueba('notificaciones: activar registra el celular completo', async () => {
  const p = preparar();
  igual(await p.n.activar(), { ok: true });
  igual(p.estado.pedidos, 1);
  const r = p.registro();
  igual({ ...r, actualizado: typeof r.actualizado }, {
    uid: 'u1', pareja: 'K7PQ2M', lugar: 'a', token: 'tok-1', avisos: PREF_DEFECTO.avisos,
    hora: '20:00', zona: 'America/Bogota', franja: '01:00', actualizado: 'number',
  });
  igual(leerPreferencias(p.almacen).activas, true);
});

prueba('notificaciones: cambiar la hora o un aviso actualiza el registro', async () => {
  const p = preparar();
  await p.n.activar();
  await p.n.cambiar({ hora: '21:30', avisos: { mapa: false } });
  igual([p.registro().hora, p.registro().franja, p.registro().avisos.mapa], ['21:30', '02:30', false]);
});

prueba('notificaciones: refrescar solo escribe si cambió el token', async () => {
  const p = preparar();
  await p.n.activar();
  const ruta = p.registros()[0];
  const version = () => p.mundo.datos.get(ruta).version;
  const antes = version();
  igual(await p.n.refrescar(), false);
  igual(version(), antes);
  p.estado.token = 'tok-2';
  igual(await p.n.refrescar(), true);
  igual(p.registro().token, 'tok-2');
});

prueba('notificaciones: desactivar borra el registro y el token', async () => {
  const p = preparar();
  await p.n.activar();
  await p.n.desactivar();
  igual(p.registros(), []);
  igual([leerPreferencias(p.almacen).activas, p.estado.borrados], [false, 1]);
});

prueba('notificaciones: al salir de la pareja se olvida el registro y al volver se registra', async () => {
  const p = preparar();
  await p.n.activar();
  const desconectar = conectarConPareja(p.n);
  salir(p.almacen);
  await new Promise((r) => setTimeout(r, 0));
  igual(p.registros(), []);
  igual(leerPreferencias(p.almacen).activas, true, 'la preferencia se conserva');
  p.almacen.escribir('okupa:pareja:actual', ENLAZADA);
  globalThis.dispatchEvent(new CustomEvent('okupa:pareja', { detail: { enlazada: true } }));
  await new Promise((r) => setTimeout(r, 0));
  igual(p.registros().length, 1);
  desconectar();
});

prueba('notificaciones: datos del push para mostrar', () => {
  igual(datosDeNotificacion({ data: { titulo: 'A', texto: 'B', ruta: '#/diario', tipo: 'diario' } }), {
    titulo: 'A',
    opciones: { body: 'B', tag: 'diario', icon: 'iconos/icono-192.png', badge: 'iconos/favicon-48.png', data: { ruta: '#/diario' } },
  });
  igual(datosDeNotificacion({ data: { titulo: 'A', ruta: 'https://otro.com' } }).opciones.data.ruta, '#/');
  igual(datosDeNotificacion(null), null);
  igual(datosDeNotificacion({ data: {} }), null);
});

prueba('sw: maneja push y notificationclick con la misma función', async () => {
  const sw = await (await fetch('sw.js', { cache: 'no-store' })).text();
  verdadero(sw.includes("addEventListener('push'") && sw.includes("addEventListener('notificationclick'"));
  verdadero(sw.includes('function datosDeNotificacion('), 'falta la copia de datosDeNotificacion en sw.js');
});
