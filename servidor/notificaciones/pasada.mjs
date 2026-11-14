// Una pasada de notificaciones: vacía la bandeja de avisos, manda los recordatorios del Diario y los avisos de fechas.
// `db` es Firestore de firebase-admin; `mandar(mensajes)` envía y responde [{ ok, codigo }] en orden.
import { fechaBogota, fechaEnZona, momentoDeFranja, franjasPendientes, textoDe, vencido, destinatarios, quiereRecordatorio, registroVigente } from './logica.mjs';
import { notificacionDelDia } from '../../js/modulos/fechas/calendario.js';

const MAX_NOTAS = 500;
// Solo errores que dicen que el token ya no sirve. 'invalid-argument' no: puede ser un error del mensaje
// y borraría los registros de todos.
const TOKEN_INVALIDO = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

export async function pasada({ db, mandar, ahora = new Date() }) {
  const resumen = { enviados: 0, descartados: 0, invalidos: 0, fechas: 0 };
  const parejas = new Map();
  const dispositivos = new Map();
  const fechasDe = new Map();

  const leerPareja = async (codigo) => {
    if (!parejas.has(codigo)) {
      const foto = await db.doc(`parejas/${codigo}`).get();
      parejas.set(codigo, foto.exists ? foto.data() : null);
    }
    return parejas.get(codigo);
  };
  const leerFechas = async (codigo) => {
    if (!fechasDe.has(codigo)) {
      const fotos = await db.collection(`parejas/${codigo}/fechas`).get();
      fechasDe.set(codigo, fotos.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    return fechasDe.get(codigo);
  };
  const dispositivosDe = async (codigo) => {
    if (!dispositivos.has(codigo)) {
      const fotos = await db.collection('dispositivos').where('pareja', '==', codigo).get();
      dispositivos.set(codigo, fotos.docs.map((d) => ({ id: d.id, datos: d.data() })));
    }
    return dispositivos.get(codigo);
  };
  const olvidar = async (id) => {
    await db.doc(`dispositivos/${id}`).delete();
    for (const [codigo, lista] of dispositivos) dispositivos.set(codigo, lista.filter((d) => d.id !== id));
    resumen.invalidos++;
  };
  // Devuelve cuántos llegaron.
  const enviarA = async (lista, contenido) => {
    if (!lista.length) return 0;
    const respuestas = await mandar(lista.map(({ token }) => ({ token, data: contenido })));
    let llegaron = 0;
    for (const [i, r] of respuestas.entries()) {
      if (r.ok) { llegaron++; continue; }
      if (TOKEN_INVALIDO.has(r.codigo)) await olvidar(lista[i].id);
      else console.warn(`No se pudo enviar a ${lista[i].id}: ${r.codigo}`);
    }
    resumen.enviados += llegaron;
    return llegaron;
  };

  // 1. Bandeja de avisos de todas las parejas.
  const notas = await db.collectionGroup('avisos').limit(MAX_NOTAS).get();
  for (const n of notas.docs) {
    const codigo = n.ref.parent.parent?.id;
    const aviso = n.data();
    const creadoMs = aviso.creado?.toMillis?.() ?? 0;
    const pareja = codigo ? await leerPareja(codigo) : null;
    if (!pareja || !textoDe(aviso.tipo) || vencido(aviso.tipo, creadoMs, ahora.getTime())) {
      await n.ref.delete();
      resumen.descartados++;
      continue;
    }
    const { enviar, invalidos } = destinatarios(await dispositivosDe(codigo), pareja, aviso);
    for (const id of invalidos) await olvidar(id);
    await enviarA(enviar, { ...textoDe(aviso.tipo, pareja.nombres?.[aviso.de]), tipo: aviso.tipo });
    await n.ref.delete();
  }

  // 2. Recordatorios del Diario de las franjas que tocan (y las que GitHub se saltó).
  const estado = db.doc('sistema/notificaciones');
  const { franjas, nuevaUltima } = franjasPendientes((await estado.get()).data()?.ultimaFranja ?? null, ahora);
  const hoy = fechaBogota(ahora);
  for (const franja of franjas) {
    const fotos = await db.collection('dispositivos').where('franja', '==', franja).get();
    for (const d of fotos.docs) {
      const datos = d.data();
      if (!quiereRecordatorio(datos, hoy, false)) continue;
      if (!registroVigente(datos, await leerPareja(datos.pareja))) { await olvidar(d.id); continue; }
      const respondio = (await db.doc(`parejas/${datos.pareja}/dias/${hoy}/respuestas/gustos_${datos.lugar}`).get()).exists;
      if (respondio) continue;
      const llegaron = await enviarA([{ id: d.id, token: datos.token }], { ...textoDe('recordatorio'), tipo: 'recordatorio' });
      if (llegaron) await d.ref.update({ ultimoRecordatorio: hoy });
    }
  }
  // 3. Avisos de fechas (cumpleaños, aniversarios, hitos) de las mismas franjas.
  for (const franja of franjas) {
    const fotos = await db.collection('dispositivos').where('franjaFechas', '==', franja).get();
    for (const d of fotos.docs) {
      const datos = d.data();
      if (datos.avisos?.fechas === false) continue;
      const diaLocal = fechaEnZona(momentoDeFranja(franja, ahora), datos.zona || 'America/Bogota');
      if (datos.ultimoFechas === diaLocal) continue;
      const parejaDoc = await leerPareja(datos.pareja);
      if (!registroVigente(datos, parejaDoc)) { await olvidar(d.id); continue; }
      const aviso = notificacionDelDia(await leerFechas(datos.pareja), diaLocal, datos.lugar, parejaDoc.nombres);
      if (!aviso) continue;
      const llegaron = await enviarA([{ id: d.id, token: datos.token }], { ...aviso, ruta: '#/fechas', tipo: 'fechas' });
      if (llegaron) { await d.ref.update({ ultimoFechas: diaLocal }); resumen.fechas += llegaron; }
    }
  }
  await estado.set({ ultimaFranja: nuevaUltima }, { merge: true });
  return resumen;
}
