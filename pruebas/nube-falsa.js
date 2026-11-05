// Nube en memoria con la misma interfaz que js/nucleo/nube.js, para probar sin internet.
// Dos `mundo.nube(uid)` del mismo mundo comparten datos, como dos celulares.
import { ErrorNube } from '../js/nucleo/nube.js';

const esMapa = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const copia = (v) => (v === undefined ? undefined : structuredClone(v));
const ceder = () => new Promise((r) => setTimeout(r, 0));

function combinar(antes, cambios) {
  const resultado = { ...antes };
  for (const [k, v] of Object.entries(cambios)) {
    resultado[k] = esMapa(v) && esMapa(antes?.[k]) ? combinar(antes[k], v) : v;
  }
  return resultado;
}

export function crearMundoFalso() {
  const datos = new Map(); // ruta → { valor, version }
  const oyentes = new Map(); // ruta → Set<fn>
  let conectado = true;

  const exigirConexion = () => { if (!conectado) throw new ErrorNube('sin-conexion'); };
  const valor = (ruta) => copia(datos.get(ruta)?.valor) ?? null;
  const version = (ruta) => datos.get(ruta)?.version ?? 0;

  function avisar(ruta) {
    const fns = oyentes.get(ruta);
    if (!fns) return;
    queueMicrotask(() => fns.forEach((fn) => fn(valor(ruta))));
  }
  function aplicar(ruta, nuevo, { combinar: mezclar = false } = {}) {
    const antes = datos.get(ruta)?.valor;
    const final = mezclar && antes ? combinar(antes, nuevo) : nuevo;
    datos.set(ruta, { valor: copia(final), version: version(ruta) + 1 });
    avisar(ruta);
  }
  function quitar(ruta) {
    if (!datos.has(ruta)) return;
    datos.delete(ruta);
    avisar(ruta);
  }

  function nube(uid) {
    return {
      async iniciar() { exigirConexion(); return { uid }; },
      async leer(ruta) { exigirConexion(); return valor(ruta); },
      escuchar(ruta, fn) {
        if (!oyentes.has(ruta)) oyentes.set(ruta, new Set());
        const propio = (v) => fn(v);
        oyentes.get(ruta).add(propio);
        queueMicrotask(() => { if (oyentes.get(ruta)?.has(propio)) fn(valor(ruta)); });
        return () => oyentes.get(ruta)?.delete(propio);
      },
      async escribir(ruta, nuevo, opciones) { exigirConexion(); aplicar(ruta, nuevo, opciones); },
      async borrar(ruta) { exigirConexion(); quitar(ruta); },
      async listar(coleccion) {
        exigirConexion();
        const prefijo = `${coleccion}/`;
        return [...datos.keys()]
          .filter((r) => r.startsWith(prefijo) && !r.slice(prefijo.length).includes('/'))
          .map((r) => ({ id: r.slice(prefijo.length), datos: valor(r) }));
      },
      // Optimista: si algo leído cambió antes de confirmar, se repite `fn`.
      async transaccion(fn) {
        for (let intento = 0; intento < 5; intento++) {
          exigirConexion();
          const leidas = new Map();
          const escrituras = [];
          const tx = {
            async leer(ruta) {
              await ceder();
              exigirConexion();
              leidas.set(ruta, version(ruta));
              return valor(ruta);
            },
            escribir(ruta, nuevo, opciones) { escrituras.push([ruta, copia(nuevo), opciones]); },
          };
          const resultado = await fn(tx);
          exigirConexion();
          if ([...leidas].every(([ruta, v]) => version(ruta) === v)) {
            escrituras.forEach(([ruta, nuevo, opciones]) => aplicar(ruta, nuevo, opciones));
            return resultado;
          }
        }
        throw new ErrorNube('desconocido', 'La transacción no se pudo completar');
      },
      horaServidor() { return Date.now(); },
    };
  }

  return {
    nube,
    datos,
    desconectar() { conectado = false; },
    reconectar() { conectado = true; },
  };
}
