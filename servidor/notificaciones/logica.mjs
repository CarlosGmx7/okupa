// Lógica pura de las notificaciones (sin Firebase): franjas, destinatarios, textos y vencimiento.

const QUINCE_MIN = 15 * 60 * 1000;
const MAX_FRANJAS = 8; // 2 h hacia atrás si GitHub se retrasa
const VIGENCIA_MS = { trivia: 30 * 60 * 1000 };
const VIGENCIA_GENERAL_MS = 24 * 60 * 60 * 1000;

const FORMATO_BOGOTA = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
export const fechaBogota = (fecha) => FORMATO_BOGOTA.format(fecha);

// Fecha 'YYYY-MM-DD' de un instante en la zona horaria dada.
export const fechaEnZona = (fecha, zona) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);

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
  mapa: (n) => ({ titulo: `${n} agregó algo al mapa`, texto: 'Entra a verlo.', ruta: '#/mapa' }),
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
    if (datos.lugar === aviso.de || datos.avisos?.[aviso.tipo] === false) continue;
    enviar.push({ id, token: datos.token });
  }
  return { enviar, invalidos };
}

export function quiereRecordatorio(dispositivo, hoy, yaRespondio) {
  return dispositivo?.avisos?.recordatorio !== false && dispositivo?.ultimoRecordatorio !== hoy && !yaRespondio;
}
