// Entrar a una sala desde la notificación de invitación: une a quien la toca y dice si hay partida a la cual ir.
import { sigueEsperando } from './esperando.js';

// `leer()` devuelve la sala (o null) y `unirse()` true si esta llamada la pasó de esperando a jugando.
// Con `caduca`, una sala que lleva esperando más de 30 min ya no cuenta (Probable la cierra así).
// Devuelve 'jugar' o 'ya-no'; si la nube falla, rechaza.
export async function entrarASala({ leer, unirse, yo, caduca = false, ahora = Date.now() }) {
  const sala = await leer();
  if (sala?.estado === 'jugando') return 'jugar';
  if (sala?.estado !== 'esperando') return 'ya-no';
  if (caduca && !sigueEsperando(sala, ahora)) return 'ya-no';
  if (sala.anfitrion === yo) return 'jugar';
  if (await unirse()) return 'jugar';
  // Otro toque (o la app abierta) pudo unirse primero; o la cancelaron justo ahora.
  return (await leer())?.estado === 'jugando' ? 'jugar' : 'ya-no';
}
