// Configuración del proyecto de Firebase (ver «Conectar Firebase» en el LEEME).
// No es secreta: lo que protege los datos son las reglas de firebase/firestore.rules.
export const CONFIG_FIREBASE = {
  apiKey: 'AIzaSyA5xFf08rHrr2hY2Y1FI-lugV2MYOMvaqY',
  authDomain: 'okupa-abbdc.firebaseapp.com',
  projectId: 'okupa-abbdc',
  storageBucket: 'okupa-abbdc.firebasestorage.app',
  messagingSenderId: '722802434498',
  appId: '1:722802434498:web:15693d1c16eef583f3b65b',
};

// Solo para probar en el computador con los emuladores (firebase/: npm run emuladores):
// { auth: 'http://127.0.0.1:9099', firestore: { host: '127.0.0.1', puerto: 8085 } }
export const EMULADORES = null;

// Clave pública de notificaciones web (Firebase → Configuración → Cloud Messaging → Certificados web push).
// No es secreta. Mientras sea null, Ajustes dice que las notificaciones aún no están configuradas.
export const CLAVE_VAPID = null;
