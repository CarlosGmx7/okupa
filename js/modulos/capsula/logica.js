// Lógica pura de la «Cápsula del tiempo»: sin navegador ni Firebase, para que
// la use tanto la app como el servidor de notificaciones (Node 20).
// Las fechas son texto 'YYYY-MM-DD' y la aritmética es en UTC.

export const MAX_CARTAS = 50;
export const MAX_TEXTO = 2000;
export const MAX_DIAS = 3652;

const DIA_MS = 86400000;
const aMs = (dia) => { const [a, m, d] = dia.split('-').map(Number); return Date.UTC(a, m - 1, d); };

// 0 = hoy, negativo = ya pasó.
export function diasHasta(abreEl, hoy) {
  return Math.round((aMs(abreEl) - aMs(hoy)) / DIA_MS);
}

export function estaAbierta(carta, hoy) {
  return carta.abreEl <= hoy;
}

// Avisos solo para quien NO escribió la carta y solo el día en que abre.
export function avisosCapsulas(cartas, hoy, lugar, nombres) {
  return (cartas || [])
    .filter((c) => c.de !== lugar && c.abreEl === hoy)
    .map((c) => `Hoy puedes abrir la carta de ${(nombres && nombres[c.de]) || 'tu pareja'} 💌`);
}

export function unirAvisos(base, extras) {
  if (!extras || !extras.length) return base ? { titulo: base.titulo, texto: base.texto, ruta: '#/fechas' } : null;
  const resto = [...extras.slice(1), ...(base ? [base.titulo] : [])];
  return { titulo: extras[0], texto: resto.join(' · ') || 'Entra a leerla.', ruta: '#/capsula' };
}

export function detalleInicio(cartas, lugar, hoy) {
  const del_otro = (cartas || []).filter((c) => c.de !== lugar);
  if (del_otro.some((c) => c.abreEl === hoy)) return 'Tienes una carta para abrir';
  const cerradas = del_otro.filter((c) => c.abreEl > hoy).sort((x, y) => (x.abreEl < y.abreEl ? -1 : 1));
  if (!cerradas.length) return 'Escríbanse una carta';
  const n = diasHasta(cerradas[0].abreEl, hoy);
  return n === 1 ? 'Próxima carta mañana' : `Próxima carta en ${n} días`;
}
