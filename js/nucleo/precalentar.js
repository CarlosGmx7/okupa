// Si los celulares ya están enlazados, adelanta en segundo plano lo que tarda al entrar a
// Trivia o Diario: descargar Firebase, iniciar sesión y cargar las preguntas de cada módulo.
import { miPareja } from './pareja.js';

export async function precalentar(ctx) {
  const pareja = ctx.almacen && miPareja(ctx.almacen);
  if (!pareja) return;
  // Leer la pareja abre la conexión con la base de datos, que es lo más lento la primera vez.
  const tareas = [Promise.resolve().then(() => ctx.nube()).then((nube) => nube?.leer?.(`parejas/${pareja.codigo}`))];
  for (const m of ctx.modulos || []) {
    tareas.push(Promise.resolve().then(() => m.precalentar?.(ctx)));
  }
  await Promise.allSettled(tareas);
}
