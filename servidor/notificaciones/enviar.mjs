// Punto de entrada de GitHub Actions: inicia firebase-admin con la cuenta de servicio y corre una pasada.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { pasada } from './pasada.mjs';

const crudo = process.env.FIREBASE_CUENTA_SERVICIO;
if (!crudo) {
  // Aún no configurado: se sale sin error para que GitHub no mande correos de falla cada 15 min.
  console.log('Notificaciones aún no configuradas: falta el secreto FIREBASE_CUENTA_SERVICIO.');
  process.exit(0);
}

const app = initializeApp({ credential: cert(JSON.parse(crudo)) });
const mensajeria = getMessaging(app);

// Solo datos (sin "notification"): sw.js decide cómo mostrarlos. Urgencia alta para que lleguen ya.
async function mandar(mensajes) {
  const r = await mensajeria.sendEach(mensajes.map(({ token, data }) => ({
    token,
    data,
    webpush: { headers: { Urgency: 'high', TTL: String(24 * 60 * 60) } },
  })));
  return r.responses.map((x) => ({ ok: x.success, codigo: x.error?.code }));
}

const resumen = await pasada({ db: getFirestore(app), mandar });
console.log(`Notificaciones: ${JSON.stringify(resumen)}`);
