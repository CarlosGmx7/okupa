// Lógica pura de la Ruleta de planes. Sin DOM ni nube.

export const PRESUPUESTOS = [
  { id: 'nulo', nombre: 'Sin plata', ayuda: '$0 · con lo que ya hay' },
  { id: 'medio', nombre: 'Algo medio', ayuda: 'Hasta unos $80.000 para los dos' },
  { id: 'grande', nombre: 'Darnos un gusto', ayuda: 'Más de $80.000 para los dos' },
];

export const LUGARES = [
  { id: 'casa', nombre: 'En casa' },
  { id: 'salir', nombre: 'Salir' },
];

export const CLAVE_RULETA = 'okupa:ruleta';
export const ELECCION_INICIAL = { presupuesto: 'medio', lugar: 'salir' };

const MIN_TEXTO = 20;
const MAX_TEXTO = 160;

const esPresupuesto = (id) => PRESUPUESTOS.some((p) => p.id === id);
const esLugar = (id) => LUGARES.some((l) => l.id === id);

export function validarPlan(p) {
  return !!p
    && typeof p === 'object'
    && typeof p.id === 'string'
    && esPresupuesto(p.presupuesto)
    && esLugar(p.lugar)
    && typeof p.texto === 'string'
    && p.texto.length >= MIN_TEXTO
    && p.texto.length <= MAX_TEXTO
    && typeof p.tipo === 'string'
    && p.tipo.length > 0;
}

export async function cargarPlanes(fetchFn = (u) => fetch(u)) {
  const r = await fetchFn(new URL('../../../data/ruleta/planes.json', import.meta.url).href);
  if (!r.ok) throw new Error(`No se pudieron cargar los planes (${r.status})`);
  const lista = await r.json();
  return Array.isArray(lista) ? lista.filter(validarPlan) : [];
}

export function leerEleccion(almacen) {
  const e = almacen.leer(CLAVE_RULETA, null);
  if (e && typeof e === 'object' && esPresupuesto(e.presupuesto) && esLugar(e.lugar)) {
    return { presupuesto: e.presupuesto, lugar: e.lugar };
  }
  return { ...ELECCION_INICIAL };
}

export function guardarEleccion(almacen, { presupuesto, lugar }) {
  almacen.escribir(CLAVE_RULETA, { presupuesto, lugar });
}

function barajar(lista, azar) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(azar() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Una racha por combinación presupuesto + lugar: entrega los planes sin
// repetir y, al agotarse, rebaraja cuidando que el primero no sea el último.
export function crearRacha(planes, azar = Math.random) {
  const estados = new Map(); // «presupuesto|lugar» → { cola, ultimo }
  return {
    siguiente(presupuesto, lugar) {
      const clave = `${presupuesto}|${lugar}`;
      let est = estados.get(clave);
      if (!est) {
        est = { cola: [], ultimo: null };
        estados.set(clave, est);
      }
      if (est.cola.length === 0) {
        const delGrupo = (planes || []).filter((p) => p.presupuesto === presupuesto && p.lugar === lugar);
        if (delGrupo.length === 0) return null;
        const nueva = barajar(delGrupo, azar);
        if (nueva.length > 1 && nueva[0].id === est.ultimo) {
          [nueva[0], nueva[1]] = [nueva[1], nueva[0]];
        }
        est.cola = nueva;
      }
      const plan = est.cola.shift();
      est.ultimo = plan.id;
      return plan;
    },
  };
}
