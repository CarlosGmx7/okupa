// Lógica pura de las notificaciones (sin Firebase): franjas, destinatarios, textos y vencimiento.

const QUINCE_MIN = 15 * 60 * 1000;
const MAX_FRANJAS = 8; // 2 h hacia atrás si GitHub se retrasa
const VIGENCIA_MS = { trivia: 30 * 60 * 1000, probable: 30 * 60 * 1000, 'trivia-acepto': 30 * 60 * 1000, 'probable-acepto': 30 * 60 * 1000 };
// Avisos que comparten el interruptor de otro tipo.
const PREFERENCIA = { probable: 'trivia', 'trivia-acepto': 'trivia', 'probable-acepto': 'trivia' };
const VIGENCIA_GENERAL_MS = 24 * 60 * 60 * 1000;

const FORMATO_BOGOTA = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
export const fechaBogota = (fecha) => FORMATO_BOGOTA.format(fecha);

// Fecha 'YYYY-MM-DD' de un instante en la zona horaria dada; una zona inválida cae en Bogotá (nunca lanza).
export function fechaEnZona(fecha, zona) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
  } catch {
    return fechaBogota(fecha);
  }
}

const inicioFranja = (ms) => Math.floor(ms / QUINCE_MIN) * QUINCE_MIN;
const comoFranja = (ms) => new Date(ms).toISOString().slice(11, 16);
export const franjaDe = (fecha) => comoFranja(inicioFranja(fecha.getTime()));

// Instante de la franja 'HH:MM' (UTC) más reciente que no pasa de `ahora`.
export function momentoDeFranja(franja, ahora) {
  const [h, m] = franja.split(':').map(Number);
  const dia = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate(), h, m);
  return new Date(dia > ahora.getTime() ? dia - 24 * 60 * 60 * 1000 : dia);
}

// Franjas posteriores a la última procesada, hasta la actual inclusive.
export function franjasPendientes(ultima, ahora) {
  const actual = inicioFranja(ahora.getTime());
  const desde = ultima ? inicioFranja(Date.parse(ultima)) + QUINCE_MIN : actual;
  const inicio = Math.max(desde, actual - (MAX_FRANJAS - 1) * QUINCE_MIN);
  const franjas = [];
  for (let t = inicio; t <= actual; t += QUINCE_MIN) franjas.push(comoFranja(t));
  return { franjas, nuevaUltima: new Date(actual).toISOString() };
}

const TEXTOS = {
  diario: (n) => ({ titulo: `${n} respondió el Diario`, texto: 'Entra a ver qué respondieron.', ruta: '#/diario' }),
  trivia: (n) => ({ titulo: `${n} te invitó a la Trivia`, texto: 'Te está esperando para jugar.', ruta: '#/trivia' }),
  probable: (n) => ({ titulo: `${n} te invita a jugar ¿Quién es más probable? 🤔`, texto: 'Te está esperando para jugar.', ruta: '#/probable' }),
  'trivia-acepto': (n) => ({ titulo: 'Okupa', texto: `${n} aceptó tu juego. ¡Entra ya!`, ruta: '#/trivia' }),
  'probable-acepto': (n) => ({ titulo: 'Okupa', texto: `${n} aceptó tu juego. ¡Entra ya!`, ruta: '#/probable' }),
  mapa: (n) => ({ titulo: `${n} agregó algo al mapa`, texto: 'Entra a verlo.', ruta: '#/mapa' }),
  solicitud: (n) => ({ titulo: 'Okupa', texto: `Alguien pide entrar como ${n} desde otro celular. Si no eres tú, recházalo.`, ruta: '#/' }),
  // Para el celular de la pareja (no el que tiene ese lugar): no dice «como yo».
  'solicitud-pareja': (n) => ({ titulo: 'Okupa', texto: `${n} pidió entrar desde otro celular. Si no fue ${n}, recházalo.`, ruta: '#/' }),
  'solicitud-recordatorio': (n) => ({ titulo: 'Okupa', texto: `Mañana un celular nuevo entra como ${n} si nadie lo rechaza.`, ruta: '#/' }),
  recordatorio: () => ({ titulo: '¿Ya respondiste el Diario?', texto: 'Te falta tu parte de hoy.', ruta: '#/diario' }),
};
export function textoDe(tipo, nombre) {
  return TEXTOS[tipo] ? TEXTOS[tipo](nombre || 'Tu pareja') : null;
}

export function vencido(tipo, creadoMs, ahoraMs) {
  return ahoraMs - creadoMs > (VIGENCIA_MS[tipo] ?? VIGENCIA_GENERAL_MS);
}

// El registro solo vale si su uid sigue siendo el dueño de ese lugar en la pareja.
export const registroVigente = (datos, parejaDoc) => Boolean(datos?.lugar) && parejaDoc?.lugares?.[datos.lugar] === datos.uid;

export function destinatarios(dispositivos, parejaDoc, aviso) {
  const enviar = [];
  const invalidos = [];
  for (const { id, datos } of dispositivos) {
    if (!registroVigente(datos, parejaDoc)) { invalidos.push(id); continue; }
    if (datos.lugar === aviso.de || datos.avisos?.[PREFERENCIA[aviso.tipo] ?? aviso.tipo] === false) continue;
    enviar.push({ id, token: datos.token });
  }
  return { enviar, invalidos };
}

// Miembros actuales de la pareja con registro vigente: sin mirar los interruptores (es un aviso de seguridad).
export function miembrosDe(dispositivos, parejaDoc) {
  const enviar = [];
  const invalidos = [];
  for (const { id, datos } of dispositivos) {
    if (registroVigente(datos, parejaDoc)) enviar.push({ id, token: datos.token, lugar: datos.lugar });
    else invalidos.push(id);
  }
  return { enviar, invalidos };
}

const DIA_MS = 24 * 60 * 60 * 1000;
const RECORDAR_DIA = 6;
// Una rechazada se limpia pasado el freno de 24 h (con margen): hasta entonces el celular nuevo no puede volver a pedir.
const LIMPIAR_RECHAZADA_MS = 25 * 60 * 60 * 1000;
const aMs = (v) => v?.toMillis?.() ?? v ?? null;

// Qué hacer con una solicitud de celular nuevo (`lugar` es el id del documento): 'avisar' | 'recordar' | 'borrar' | null.
export function accionSolicitud(solicitud, parejaDoc, lugar, ahoraMs) {
  if (!parejaDoc || parejaDoc.lugares?.[lugar] === solicitud.uid) return 'borrar';
  const rechazada = aMs(solicitud.rechazada);
  if (rechazada !== null) return ahoraMs - rechazada > LIMPIAR_RECHAZADA_MS ? 'borrar' : null;
  if (!solicitud.avisada) return 'avisar';
  const creada = aMs(solicitud.creada);
  if (!solicitud.recordada && creada !== null && ahoraMs - creada >= RECORDAR_DIA * DIA_MS) return 'recordar';
  return null;
}

export function quiereRecordatorio(dispositivo, hoy, yaRespondio) {
  return dispositivo?.avisos?.recordatorio !== false && dispositivo?.ultimoRecordatorio !== hoy && !yaRespondio;
}
