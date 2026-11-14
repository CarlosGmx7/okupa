// Lógica pura de «Fechas especiales»: sin navegador ni Firebase, para que la
// use tanto la app como el servidor de notificaciones (Node 20).
// Las fechas son siempre texto 'YYYY-MM-DD' y toda la aritmética es en UTC.

export const HITOS_HASTA = 1000;

const DIA_MS = 86400000;
// Menor número = más importante. Aniversario y cumple empatan.
const PRIORIDAD = { aniversario: 0, cumple: 0, otra: 1, hito: 2, mensual: 3 };

const partes = (dia) => dia.split('-').map(Number);
const dosDigitos = (n) => String(n).padStart(2, '0');
const armar = (a, m, d) => `${String(a).padStart(4, '0')}-${dosDigitos(m)}-${dosDigitos(d)}`;
const aMs = (dia) => { const [a, m, d] = partes(dia); return Date.UTC(a, m - 1, d); };
const diasDelMes = (a, m) => new Date(Date.UTC(a, m, 0)).getUTCDate();
// 29 de febrero en año no bisiesto → 28; día 31 en mes de 30 → último día del mes.
const diaAjustado = (a, m, d) => Math.min(d, diasDelMes(a, m));

export function sumarDias(dia, n) {
  const f = new Date(aMs(dia) + n * DIA_MS);
  return armar(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate());
}

const diferencia = (desde, hasta) => Math.round((aMs(hasta) - aMs(desde)) / DIA_MS);

// El día de «Empezamos» cuenta como día 1.
export function diasJuntos(inicio, hoy) {
  if (!inicio) return null;
  const n = diferencia(inicio, hoy) + 1;
  return n >= 1 ? n : null;
}

export function esHito(n) {
  if (!Number.isInteger(n) || n < 100) return false;
  return n <= HITOS_HASTA ? n % 100 === 0 : n % 500 === 0;
}

const siguienteHito = (desde) => {
  let h = Math.max(100, desde);
  while (!esHito(h)) h++;
  return h;
};

// Fechas que se repiten cada año (cumple, otra); el inicio aporta su aniversario aparte.
const esAnual = (f) => f.tipo === 'cumple' || f.tipo === 'otra';
// Primer año que cuenta: el día de nacimiento no es un cumpleaños; una «otra» sí cuenta en su propio año.
const primerAnio = (f, af) => (f.tipo === 'cumple' ? af + 1 : af);

function eventoAnual(f, dia, anios) {
  const e = { clase: f.tipo, id: f.id, dia, anios };
  if (f.tipo === 'cumple') e.de = f.de; else e.nombre = f.nombre;
  return e;
}

// Meses completos entre el inicio y el mes de `dia` si cae el día de la mensual; si no, null.
function mesesSiEsMensual(inicio, dia) {
  const [ai, mi, di] = partes(inicio);
  const [a, m, d] = partes(dia);
  const meses = (a - ai) * 12 + (m - mi);
  if (meses < 1 || d !== diaAjustado(a, m, di)) return null;
  return meses;
}

export function eventosDelDia(fechas, dia) {
  const [a, m, d] = partes(dia);
  const lista = [];
  for (const f of fechas || []) {
    if (f.tipo === 'inicio') {
      const meses = mesesSiEsMensual(f.fecha, dia);
      if (meses !== null) {
        // La mensual que coincide con el aniversario de años cuenta solo como aniversario.
        if (meses % 12 === 0) lista.push({ clase: 'aniversario', id: f.id, dia, anios: meses / 12 });
        else lista.push({ clase: 'mensual', id: f.id, dia, meses });
      }
      const n = diasJuntos(f.fecha, dia);
      if (n !== null && esHito(n)) lista.push({ clase: 'hito', id: f.id, dia, dias: n });
    } else if (esAnual(f)) {
      const [af, mf, df] = partes(f.fecha);
      if (a >= primerAnio(f, af) && m === mf && d === diaAjustado(a, mf, df)) lista.push(eventoAnual(f, dia, a - af));
    }
  }
  // sort es estable: a igual prioridad se conserva el orden de las fechas.
  return lista.sort((x, y) => PRIORIDAD[x.clase] - PRIORIDAD[y.clase]);
}

export function proximas(fechas, hoy, limite = 20) {
  const [ah] = partes(hoy);
  const lista = [];
  const agregar = (e) => lista.push({ ...e, faltan: diferencia(hoy, e.dia) });
  for (const f of fechas || []) {
    if (f.tipo === 'inicio') {
      const [ai, mi, di] = partes(f.fecha);
      // Próximo aniversario de años.
      for (let a = Math.max(ah, ai + 1); a <= Math.max(ah, ai + 1) + 1; a++) {
        const dia = armar(a, mi, diaAjustado(a, mi, di));
        if (dia >= hoy) { agregar({ clase: 'aniversario', id: f.id, dia, anios: a - ai }); break; }
      }
      // Próxima mensual (las que son aniversario de años no cuentan como mensual).
      const [, mh] = partes(hoy);
      const base = (ah - ai) * 12 + (mh - mi);
      for (let meses = Math.max(1, base); meses <= Math.max(1, base) + 13; meses++) {
        const indice = mi - 1 + meses;
        const a = ai + Math.floor(indice / 12);
        const mes = (indice % 12) + 1;
        const dia = armar(a, mes, diaAjustado(a, mes, di));
        if (dia >= hoy && meses % 12 !== 0) { agregar({ clase: 'mensual', id: f.id, dia, meses }); break; }
      }
      // Próximo hito de días juntos.
      const actual = diferencia(f.fecha, hoy) + 1;
      const h = siguienteHito(actual);
      agregar({ clase: 'hito', id: f.id, dia: sumarDias(f.fecha, h - 1), dias: h });
    } else if (esAnual(f)) {
      const [af, mf, df] = partes(f.fecha);
      const desde = Math.max(ah, primerAnio(f, af));
      for (let a = desde; a <= desde + 1; a++) {
        const dia = armar(a, mf, diaAjustado(a, mf, df));
        if (dia >= hoy) { agregar(eventoAnual(f, dia, a - af)); break; }
      }
    }
  }
  return lista
    .sort((x, y) => x.faltan - y.faltan || PRIORIDAD[x.clase] - PRIORIDAD[y.clase])
    .slice(0, limite);
}

export const miles = (n) => n.toLocaleString('es-CO');
export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export function duracionMeses(meses) {
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const partesTexto = [];
  if (anios) partesTexto.push(plural(anios, 'año', 'años'));
  if (resto) partesTexto.push(plural(resto, 'mes', 'meses'));
  return partesTexto.join(' y ');
}

export function textoEvento(e, nombres, cuando, lugar) {
  const nom = (nombres || {})[e.de] || 'tu pareja';
  const hoy = cuando === 'hoy';
  const cumplen = hoy ? 'Hoy cumplen' : 'En una semana cumplen';
  switch (e.clase) {
    case 'cumple':
      if (hoy && lugar && e.de === lugar) return '¡Feliz cumpleaños! 🎂';
      return hoy ? `Hoy es el cumpleaños de ${nom} 🎂` : `En una semana: cumpleaños de ${nom}`;
    case 'aniversario':
      return `${cumplen} ${plural(e.anios, 'año', 'años')} juntos`;
    case 'mensual':
      return `${cumplen} ${duracionMeses(e.meses)}`;
    case 'hito':
      return `${cumplen} ${miles(e.dias)} días juntos`;
    default:
      return `${hoy ? 'Hoy' : 'En una semana'}: ${e.nombre}`;
  }
}

// Una sola notificación por franja: todo lo de hoy y lo de dentro de 7 días
// (sin mensuales y sin el propio cumpleaños de quien recibe el aviso).
export function notificacionDelDia(fechas, hoy, lugar, nombres) {
  const items = [];
  for (const e of eventosDelDia(fechas, hoy)) items.push({ e, cuando: 'hoy', orden: 0 });
  for (const e of eventosDelDia(fechas, sumarDias(hoy, 7))) {
    if (e.clase === 'mensual') continue;
    if (e.clase === 'cumple' && e.de === lugar) continue;
    items.push({ e, cuando: 'semana', orden: 1 });
  }
  if (!items.length) return null;
  items.sort((x, y) => PRIORIDAD[x.e.clase] - PRIORIDAD[y.e.clase] || x.orden - y.orden);
  const textos = items.map(({ e, cuando }) => textoEvento(e, nombres, cuando, lugar));
  return {
    titulo: textos[0],
    texto: textos.length > 1 ? textos.slice(1).join(' · ') : 'Entra a ver sus fechas.',
  };
}
