// Si los celulares ya están enlazados, adelanta en segundo plano lo que tarda al entrar a
// Trivia o Diario: descargar Firebase, iniciar sesión y cargar las preguntas de cada módulo.
import { miPareja } from './pareja.js';

// Lo que dirían hoy las filas del inicio (los textos salen de copias que `precalentar` renueva).
function textosDelInicio(ctx) {
  return (ctx.modulos || []).map((m) => {
    try { return m.accesoJuntos?.detalle?.(ctx) ?? ''; } catch { return ''; }
  }).join('\u0001');
}
const enInicio = () => ['', '#', '#/'].includes(location.hash);

export async function precalentar(ctx) {
  const pareja = ctx.almacen && miPareja(ctx.almacen);
  if (!pareja) return;
  const antes = textosDelInicio(ctx);
  // Leer la pareja abre la conexión con la base de datos, que es lo más lento la primera vez.
  const tareas = [Promise.resolve().then(() => ctx.nube()).then((nube) => nube?.leer?.(`parejas/${pareja.codigo}`))];
  for (const m of ctx.modulos || []) {
    tareas.push(Promise.resolve().then(() => m.precalentar?.(ctx)));
  }
  await Promise.allSettled(tareas);
  // Si el inicio sigue abierto y sus textos cambiaron, se pinta una vez (refrescar no vuelve a precalentar).
  if (enInicio() && textosDelInicio(ctx) !== antes) {
    try { ctx.refrescar?.(); } catch { /* el inicio se actualizará en la próxima visita */ }
  }
}
