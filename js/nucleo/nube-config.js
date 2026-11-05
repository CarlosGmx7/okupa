// Configuración del proyecto de Firebase (ver «Conectar Firebase» en el LEEME).
// No es secreta: lo que protege los datos son las reglas de firebase/firestore.rules.
// Mientras sea null, Trivia y Diario muestran "Falta configurar la conexión".
export const CONFIG_FIREBASE = null;

// Solo para probar en el computador con los emuladores (firebase/: npm run emuladores):
// { auth: 'http://127.0.0.1:9099', firestore: { host: '127.0.0.1', puerto: 8085 } }
export const EMULADORES = null;
