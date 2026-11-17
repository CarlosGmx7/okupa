// Cambio de celular con aprobación (v22): la lógica de pareja.js con la nube falsa.
// u1 = Carlos (lugar a), u2 = Sofi (lugar b), u3 = el celular nuevo.
import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import {
  ESPERA_SOLICITUD_MS, FRENO_RECHAZO_MS, estadoSolicitud, pedirLugar, miSolicitud, completarEntrada,
  entrarVencida, cancelarSolicitud, solicitudesDe, aprobarSolicitud, rechazarSolicitud,
  crearPareja, unirse, miPareja,
} from '../js/nucleo/pareja.js';

const DIA = 86400000;
const HORA = 3600000;
const CLAVE = 'okupa:solicitud';

async function rechaza(promesa, codigo) {
  try { await promesa; } catch (e) {
    verdadero(e.codigo === codigo, `se esperaba "${codigo}" y llegó "${e.codigo}" (${e.message})`);
    return e;
  }
  throw new Error(`se esperaba el error "${codigo}"`);
}

async function parejaCompleta() {
  const mundo = crearMundoFalso();
  const alm1 = almacenEnMemoria();
  const alm2 = almacenEnMemoria();
  const alm3 = almacenEnMemoria();
  const { codigo } = await crearPareja(mundo.nube('u1'), alm1, { nombre: 'Carlos' });
  await unirse(mundo.nube('u2'), alm2, { codigo, nombre: 'Sofi' });
  const rutaSol = (lugar) => `parejas/${codigo}/solicitudes/${lugar}`;
  return { mundo, codigo, alm1, alm2, alm3, rutaSol };
}

prueba('solicitudes: las esperas son 7 días y 24 horas', () => {
  igual([ESPERA_SOLICITUD_MS, FRENO_RECHAZO_MS], [7 * DIA, 24 * HORA]);
});

prueba('solicitudes: estadoSolicitud da sus cinco resultados', () => {
  const doc = { lugares: { a: 'u1', b: 'u2' } };
  const sol = { uid: 'u3', creada: 1000 };
  igual(estadoSolicitud(sol, doc, 'a', 'u3', 1000 + DIA), 'pendiente');
  igual(estadoSolicitud(sol, doc, 'a', 'u3', 1000 + 7 * DIA - 1), 'pendiente');
  igual(estadoSolicitud(sol, doc, 'a', 'u3', 1000 + 7 * DIA), 'vencida', 'exactamente 7 días ya vence');
  igual(estadoSolicitud({ ...sol, rechazada: 2000 }, doc, 'a', 'u3', 1000 + 8 * DIA), 'rechazada');
  igual(estadoSolicitud(null, doc, 'a', 'u3', 5000), 'borrada');
  igual(estadoSolicitud({ uid: 'u9', creada: 1000 }, doc, 'a', 'u3', 5000), 'borrada', 'la de otro uid no es la mía');
  igual(estadoSolicitud(sol, { lugares: { a: 'u3', b: 'u2' } }, 'a', 'u3', 5000), 'aprobada');
  igual(estadoSolicitud(null, { lugares: { a: 'u3', b: 'u2' } }, 'a', 'u3', 5000), 'aprobada', 'aprobada aunque ya no haya solicitud');
});

prueba('solicitudes: estadoSolicitud entiende las fechas de Firestore y una fecha aún sin confirmar', () => {
  const doc = { lugares: { a: 'u1', b: 'u2' } };
  const marca = (ms) => ({ toMillis: () => ms });
  igual(estadoSolicitud({ uid: 'u3', creada: marca(1000) }, doc, 'a', 'u3', 1000 + 7 * DIA), 'vencida');
  igual(estadoSolicitud({ uid: 'u3', creada: marca(1000) }, doc, 'a', 'u3', 1000 + DIA), 'pendiente');
  igual(estadoSolicitud({ uid: 'u3', creada: null }, doc, 'a', 'u3', 9e15), 'pendiente', 'sin fecha no se da por vencida');
});

prueba('solicitudes: pedirLugar crea la solicitud, guarda la clave local y no saca al celular viejo', async () => {
  const { mundo, codigo, alm1, alm3, rutaSol } = await parejaCompleta();
  const antes = Date.now();
  const pedida = await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  const sol = await mundo.nube('u3').leer(rutaSol('a'));
  igual(Object.keys(sol).sort(), ['creada', 'uid']);
  igual(sol.uid, 'u3');
  verdadero(sol.creada >= antes && sol.creada <= Date.now(), 'creada es la hora del servidor');
  igual(pedida, { codigo, lugar: 'a', entraMs: sol.creada + 7 * DIA });
  igual(alm3.leer(CLAVE, null), { codigo, lugar: 'a' });
  igual(miPareja(alm3), null, 'el celular nuevo todavía no es miembro');
  igual((await mundo.nube('u1').leer(`parejas/${codigo}`)).lugares, { a: 'u1', b: 'u2' });
  igual(miPareja(alm1), { codigo, lugar: 'a' });
});

prueba('solicitudes: pedirLugar acepta el código con guion y rechaza lugar o código malos', async () => {
  const { mundo, codigo, alm3 } = await parejaCompleta();
  await rechaza(pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'c' }), 'no-existe');
  await rechaza(pedirLugar(mundo.nube('u3'), alm3, { codigo: '222222', lugar: 'a' }), 'no-existe');
  igual(alm3.leer(CLAVE, null), null);
  const pedida = await pedirLugar(mundo.nube('u3'), alm3, { codigo: `${codigo.slice(0, 3)}-${codigo.slice(3)}`.toLowerCase(), lugar: 'b' });
  igual([pedida.codigo, pedida.lugar], [codigo, 'b']);
});

prueba('solicitudes: pedir sobre una solicitud ajena lanza solicitud-ajena', async () => {
  const { mundo, codigo, alm3, rutaSol } = await parejaCompleta();
  await pedirLugar(mundo.nube('u9'), almacenEnMemoria(), { codigo, lugar: 'a' });
  await rechaza(pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' }), 'solicitud-ajena');
  igual((await mundo.nube('u3').leer(rutaSol('a'))).uid, 'u9', 'no pisó la del otro');
  igual(alm3.leer(CLAVE, null), null);
});

prueba('solicitudes: si las reglas niegan leer o crear, también es solicitud-ajena', async () => {
  const { mundo, codigo, alm3 } = await parejaCompleta();
  const { ErrorNube } = await import('../js/nucleo/nube.js');
  const nube = mundo.nube('u3');
  const sinLeer = { ...nube, leer: async (r) => { if (r.includes('/solicitudes/')) throw new ErrorNube('permiso'); return nube.leer(r); } };
  await rechaza(pedirLugar(sinLeer, alm3, { codigo, lugar: 'a' }), 'solicitud-ajena');
  const sinCrear = { ...nube, escribir: async () => { throw new ErrorNube('permiso'); } };
  await rechaza(pedirLugar(sinCrear, alm3, { codigo, lugar: 'a' }), 'solicitud-ajena');
  igual(alm3.leer(CLAVE, null), null);
});

prueba('solicitudes: pedir dos veces desde el mismo celular conserva la fecha', async () => {
  const { mundo, codigo, alm3 } = await parejaCompleta();
  const una = await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  await new Promise((r) => setTimeout(r, 5));
  igual(await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' }), una);
});

prueba('solicitudes: sin clave local miSolicitud es null y no toca la nube (Review Focus 1)', async () => {
  const { mundo, alm1, alm2 } = await parejaCompleta();
  const nube = mundo.nube('u1');
  let llamadas = 0;
  const espia = { ...nube, iniciar: async () => { llamadas++; return nube.iniciar(); }, leer: async (r) => { llamadas++; return nube.leer(r); } };
  igual(await miSolicitud(espia, alm1), null);
  igual(llamadas, 0);
  igual(await solicitudesDe(mundo.nube('u1'), miPareja(alm1)), []);
  igual(await solicitudesDe(mundo.nube('u2'), miPareja(alm2)), []);
});

prueba('solicitudes: miSolicitud pendiente trae nombre, estado y cuándo entra', async () => {
  const { mundo, codigo, alm3 } = await parejaCompleta();
  const { entraMs } = await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  igual(await miSolicitud(mundo.nube('u3'), alm3), { codigo, lugar: 'a', nombre: 'Carlos', estado: 'pendiente', entraMs, reintentoMs: null });
  igual((await miSolicitud(mundo.nube('u3'), alm3, entraMs)).estado, 'vencida');
});

prueba('solicitudes: aprobar desde el celular viejo, con el nuevo cerrado, y completar la entrada (Review Focus 5)', async () => {
  const { mundo, codigo, alm1, alm2, alm3, rutaSol } = await parejaCompleta();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  // El celular nuevo está cerrado: solo actúa el viejo.
  await aprobarSolicitud(mundo.nube('u1'), alm1, 'a');
  igual((await mundo.nube('u2').leer(`parejas/${codigo}`)).lugares, { a: 'u3', b: 'u2' });
  igual(miPareja(alm1), null, 'el celular viejo queda por fuera');
  igual(miPareja(alm3), null, 'el nuevo aún no ha abierto la app');
  // El nuevo abre la app.
  igual((await miSolicitud(mundo.nube('u3'), alm3)).estado, 'aprobada');
  igual(await completarEntrada(mundo.nube('u3'), alm3), { codigo, lugar: 'a' });
  igual(miPareja(alm3), { codigo, lugar: 'a' });
  igual(await mundo.nube('u3').leer(rutaSol('a')), null, 'borra la solicitud');
  igual(alm3.leer(CLAVE, null), null, 'borra la clave local');
  igual(await miSolicitud(mundo.nube('u3'), alm3), null);
  igual((await mundo.nube('u2').leer(`parejas/${codigo}`)).nombres, { a: 'Carlos', b: 'Sofi' }, 'el nombre no cambia');
  igual(miPareja(alm2), { codigo, lugar: 'b' });
});

prueba('solicitudes: solo aprueba el celular de ese mismo lugar', async () => {
  const { mundo, codigo, alm1, alm2, alm3 } = await parejaCompleta();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  await rechaza(aprobarSolicitud(mundo.nube('u2'), alm2, 'a'), 'no-es-tu-lugar');
  await rechaza(aprobarSolicitud(mundo.nube('u9'), almacenEnMemoria(), 'a'), 'sin-pareja');
  await rechaza(aprobarSolicitud(mundo.nube('u2'), alm2, 'b'), 'sin-solicitud');
  igual((await mundo.nube('u1').leer(`parejas/${codigo}`)).lugares, { a: 'u1', b: 'u2' });
  igual(miPareja(alm1), { codigo, lugar: 'a' });
  igual(miPareja(alm2), { codigo, lugar: 'b' });
});

prueba('solicitudes: no se aprueba una rechazada, y completarEntrada sin aprobación falla', async () => {
  const { mundo, codigo, alm1, alm2, alm3 } = await parejaCompleta();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  await rechaza(completarEntrada(mundo.nube('u3'), alm3), 'sin-aprobar');
  igual(miPareja(alm3), null);
  await rechazarSolicitud(mundo.nube('u2'), miPareja(alm2), 'a');
  await rechaza(aprobarSolicitud(mundo.nube('u1'), alm1, 'a'), 'sin-solicitud');
  igual(miPareja(alm1), { codigo, lugar: 'a' });
});

prueba('solicitudes: rechazar deja el estado rechazada con reintento a las 24 h', async () => {
  const { mundo, codigo, alm2, alm3, rutaSol } = await parejaCompleta();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  await rechazarSolicitud(mundo.nube('u2'), miPareja(alm2), 'a');
  const sol = await mundo.nube('u2').leer(rutaSol('a'));
  igual(sol.uid, 'u3');
  const mia = await miSolicitud(mundo.nube('u3'), alm3);
  igual([mia.estado, mia.reintentoMs], ['rechazada', sol.rechazada + 24 * HORA]);
});

prueba('solicitudes: tras un rechazo, volver a pedir antes de 24 h no cambia nada; después crea una nueva', async () => {
  const { mundo, codigo, alm2, alm3, rutaSol } = await parejaCompleta();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  await rechazarSolicitud(mundo.nube('u2'), miPareja(alm2), 'a');
  const rechazada = await mundo.nube('u3').leer(rutaSol('a'));
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  igual(await mundo.nube('u3').leer(rutaSol('a')), rechazada, 'sigue rechazada');
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a', ahoraMs: rechazada.rechazada + 24 * HORA });
  const nueva = await mundo.nube('u3').leer(rutaSol('a'));
  igual(Object.keys(nueva).sort(), ['creada', 'uid'], 'solicitud nueva, sin rechazo');
  igual((await miSolicitud(mundo.nube('u3'), alm3)).estado, 'pendiente');
});

prueba('solicitudes: cancelarSolicitud borra el documento y la clave', async () => {
  const { mundo, codigo, alm3, rutaSol } = await parejaCompleta();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  await cancelarSolicitud(mundo.nube('u3'), alm3);
  igual(await mundo.nube('u3').leer(rutaSol('a')), null);
  igual(alm3.leer(CLAVE, null), null);
  await cancelarSolicitud(mundo.nube('u3'), alm3); // sin solicitud no falla
});

prueba('solicitudes: cancelar una que las reglas no dejan borrar olvida la clave; sin red no', async () => {
  const { mundo, codigo, alm3, rutaSol } = await parejaCompleta();
  const { ErrorNube } = await import('../js/nucleo/nube.js');
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  mundo.desconectar();
  await rechaza(cancelarSolicitud(mundo.nube('u3'), alm3), 'sin-conexion');
  igual(alm3.leer(CLAVE, null), { codigo, lugar: 'a' }, 'sin red la solicitud sigue apuntada');
  mundo.reconectar();
  const nube = mundo.nube('u3');
  await cancelarSolicitud({ ...nube, borrar: async () => { throw new ErrorNube('permiso'); } }, alm3);
  igual(alm3.leer(CLAVE, null), null);
  verdadero(await nube.leer(rutaSol('a')), 'el documento sigue (freno de 24 h)');
});

prueba('solicitudes: si un miembro borra la solicitud, miSolicitud da borrada', async () => {
  const { mundo, codigo, alm3, rutaSol } = await parejaCompleta();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  await mundo.nube('u1').borrar(rutaSol('a'));
  const mia = await miSolicitud(mundo.nube('u3'), alm3);
  igual([mia.estado, mia.entraMs, mia.reintentoMs, mia.nombre], ['borrada', null, null, 'Carlos']);
});

prueba('solicitudes: si borraron la pareja entera, miSolicitud da borrada', async () => {
  const { mundo, codigo, alm3, rutaSol } = await parejaCompleta();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  await mundo.nube('u1').borrar(rutaSol('a'));
  await mundo.nube('u1').borrar(`parejas/${codigo}`);
  igual((await miSolicitud(mundo.nube('u3'), alm3)).estado, 'borrada');
});

prueba('solicitudes: entrarVencida toma el lugar, recuerda la pareja y limpia', async () => {
  const { mundo, codigo, alm3, rutaSol } = await parejaCompleta();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  await mundo.nube('u3').escribir(rutaSol('a'), { uid: 'u3', creada: Date.now() - 8 * DIA });
  igual((await miSolicitud(mundo.nube('u3'), alm3)).estado, 'vencida');
  igual(await entrarVencida(mundo.nube('u3'), alm3), { codigo, lugar: 'a' });
  const doc = await mundo.nube('u2').leer(`parejas/${codigo}`);
  igual([doc.lugares, doc.nombres], [{ a: 'u3', b: 'u2' }, { a: 'Carlos', b: 'Sofi' }]);
  igual(miPareja(alm3), { codigo, lugar: 'a' });
  igual(await mundo.nube('u3').leer(rutaSol('a')), null);
  igual(alm3.leer(CLAVE, null), null);
});

prueba('solicitudes: entrarVencida y completarEntrada sin solicitud apuntada dan sin-solicitud', async () => {
  const { mundo } = await parejaCompleta();
  await rechaza(entrarVencida(mundo.nube('u3'), almacenEnMemoria()), 'sin-solicitud');
  await rechaza(completarEntrada(mundo.nube('u3'), almacenEnMemoria()), 'sin-solicitud');
});

prueba('solicitudes: solicitudesDe marca mia solo en el lugar propio y omite las rechazadas', async () => {
  const { mundo, codigo, alm1, alm2, alm3 } = await parejaCompleta();
  const { entraMs } = await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  igual(await solicitudesDe(mundo.nube('u1'), miPareja(alm1)), [{ lugar: 'a', mia: true, entraMs, nombre: 'Carlos' }]);
  igual(await solicitudesDe(mundo.nube('u2'), miPareja(alm2)), [{ lugar: 'a', mia: false, entraMs, nombre: 'Carlos' }]);
  await rechazarSolicitud(mundo.nube('u2'), miPareja(alm2), 'a');
  igual(await solicitudesDe(mundo.nube('u1'), miPareja(alm1)), []);
});

prueba('solicitudes: solicitudesDe no muestra una ya aprobada que quedó sin borrar', async () => {
  const { mundo, codigo, alm1, alm2, alm3 } = await parejaCompleta();
  await pedirLugar(mundo.nube('u3'), alm3, { codigo, lugar: 'a' });
  await aprobarSolicitud(mundo.nube('u1'), alm1, 'a');
  igual(await solicitudesDe(mundo.nube('u2'), miPareja(alm2)), []);
});
