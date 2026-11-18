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

// Los ids ya mostrados por combinación viven en el mismo valor: { presupuesto, lugar, vistos: { 'nulo|casa': [ids] } }.
function leerVistos(almacen) {
  const e = almacen.leer(CLAVE_RULETA, null);
  const v = e && typeof e === 'object' ? e.vistos : null;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const limpio = {};
  for (const [clave, ids] of Object.entries(v)) {
    if (Array.isArray(ids)) limpio[clave] = ids.filter((id) => typeof id === 'string');
  }
  return limpio;
}

function escribirEleccion(almacen, eleccion, vistos) {
  const valor = { presupuesto: eleccion.presupuesto, lugar: eleccion.lugar };
  if (Object.keys(vistos).length > 0) valor.vistos = vistos;
  almacen.escribir(CLAVE_RULETA, valor);
}

export function guardarEleccion(almacen, { presupuesto, lugar }) {
  escribirEleccion(almacen, { presupuesto, lugar }, leerVistos(almacen));
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
// Con `almacen` recuerda lo ya mostrado y la racha sigue donde quedó en la próxima visita.
export function crearRacha(planes, azar = Math.random, almacen = null) {
  const estados = new Map(); // «presupuesto|lugar» → { cola, ultimo, vistos }

  function persistir(clave, vistos) {
    if (!almacen) return;
    const todos = { ...leerVistos(almacen), [clave]: vistos };
    escribirEleccion(almacen, leerEleccion(almacen), todos);
  }

  function iniciar(delGrupo, clave) {
    const ids = new Set(delGrupo.map((p) => p.id));
    const vistos = almacen ? [...new Set(leerVistos(almacen)[clave] ?? [])].filter((id) => ids.has(id)) : [];
    const pendientes = delGrupo.filter((p) => !vistos.includes(p.id));
    return { cola: barajar(pendientes, azar), ultimo: vistos.length ? vistos[vistos.length - 1] : null, vistos };
  }

  return {
    siguiente(presupuesto, lugar) {
      const clave = `${presupuesto}|${lugar}`;
      const delGrupo = (planes || []).filter((p) => p.presupuesto === presupuesto && p.lugar === lugar);
      if (delGrupo.length === 0) return null;
      let est = estados.get(clave);
      if (!est) {
        est = iniciar(delGrupo, clave);
        estados.set(clave, est);
      }
      if (est.cola.length === 0) {
        const nueva = barajar(delGrupo, azar);
        if (nueva.length > 1 && nueva[0].id === est.ultimo) {
          [nueva[0], nueva[1]] = [nueva[1], nueva[0]];
        }
        est.cola = nueva;
        est.vistos = [];
      }
      const plan = est.cola.shift();
      est.ultimo = plan.id;
      est.vistos.push(plan.id);
      persistir(clave, est.vistos);
      return plan;
    },
  };
}