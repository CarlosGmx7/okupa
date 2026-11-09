// Match de deseos: cada uno vota tarjetas en su celular y solo se revela lo que los dos quieren.
// Privacidad: el "no" vive solo en el registro privado de quien vota; en la nube compartida solo
// quedan los votos positivos, y las reglas dejan leer el del otro solo a quien ya votó positivo
// esa misma tarjeta. Así un "no" es indistinguible de "todavía no ha votado".

export const MAZOS = [
  { id: 'citas', nombre: 'Citas', icono: '♡' },
  { id: 'viajes', nombre: 'Viajes', icono: '✈' },
  { id: 'finde', nombre: 'Fin de semana', icono: '☀' },
  { id: 'aprender', nombre: 'Aprender juntos', icono: '✎' },
  { id: 'retos', nombre: 'Retos', icono: 'ϟ' },
  { id: 'intimidad', nombre: 'Intimidad', icono: '❦' },
];
const IDS_MAZOS = new Set(MAZOS.map((m) => m.id));
export const VOTOS = ['si', 'quizas', 'no'];
const POSITIVOS = new Set(['si', 'quizas']);

export const esMatch = (x, y) => POSITIVOS.has(x) && POSITIVOS.has(y) && (x === 'si' || y === 'si');

export async function cargarTarjetas(fetchFn = (u) => fetch(u)) {
  const r = await fetchFn(new URL('../../../data/match/tarjetas.json', import.meta.url).href);
  if (!r.ok) throw new Error(`No se pudieron cargar las tarjetas (${r.status})`);
  return r.json();
}

export function validarTarjeta({ mazo, texto }) {
  if (!IDS_MAZOS.has(mazo)) return 'Escoge un mazo.';
  const t = typeof texto === 'string' ? texto.trim() : '';
  if (t.length < 5) return 'Escribe la tarjeta (mínimo 5 caracteres).';
  if (t.length > 140) return 'Máximo 140 caracteres.';
  return null;
}

function hashTexto(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

// Semana ISO ('AAAA-Www') de una fecha 'AAAA-MM-DD'.
export function semanaISO(fechaISO) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  const dia = f.getUTCDay() || 7;
  f.setUTCDate(f.getUTCDate() + 4 - dia);
  const inicio = Date.UTC(f.getUTCFullYear(), 0, 1);
  const semana = Math.ceil(((f - inicio) / 86400000 + 1) / 7);
  return `${f.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

// Uno de los matches sin hacer, el mismo toda la semana y en los dos celulares.
export function planDeLaSemana(matches, fechaISO) {
  const pendientes = matches.filter((m) => !m.hecho).map((m) => m.id).sort();
  if (!pendientes.length) return null;
  return pendientes[hashTexto(semanaISO(fechaISO)) % pendientes.length];
}

let contador = 0;
const nuevoId = () => {
  contador = (contador + 1) % 1296;
  return `n-${Date.now().toString(36)}${contador.toString(36).padStart(2, '0')}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`;
};

export function barajar(lista, rnd = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function crearMatch(nube, pareja) {
  const base = `parejas/${pareja.codigo}`;
  const yo = pareja.lugar;
  const privado = `${base}/match_privado/${yo}`;

  async function misVotos() {
    return (await nube.leer(privado))?.votos || {};
  }

  async function votar(tarjetaId, voto) {
    if (!VOTOS.includes(voto)) throw new Error('voto-invalido');
    const privadoListo = nube.escribir(privado, { votos: { [tarjetaId]: voto } }, { combinar: true });
    if (!POSITIVOS.has(voto)) { await privadoListo; return { match: false }; }
    // Los dos registros del voto se guardan a la vez (un solo viaje de espera).
    await Promise.all([privadoListo, nube.escribir(`${base}/match_si/${tarjetaId}_${yo}`, { voto })]);
    // Nadie lee el voto del otro: se intenta crear el match y las reglas de Firebase solo lo
    // permiten si los dos votaron positivo y alguno dijo que sí. Si lo rechazan, no hay match
    // (salvo que el otro ya lo hubiera creado: eso se mira solo en ese caso).
    const ruta = `${base}/match_matches/${tarjetaId}`;
    try {
      await nube.escribir(ruta, { creadoMs: Date.now(), hecho: false });
      return { match: true };
    } catch {
      return { match: Boolean(await nube.leer(ruta).catch(() => null)) };
    }
  }

  async function pendientes(tarjetas) {
    const votos = await misVotos();
    return tarjetas.filter((t) => !(t.id in votos));
  }

  async function listarMatches() {
    const lista = await nube.listar(`${base}/match_matches`);
    return lista.map(({ id, datos }) => ({ id, hecho: Boolean(datos.hecho), creadoMs: datos.creadoMs || 0 }))
      .sort((x, y) => y.creadoMs - x.creadoMs);
  }

  async function marcarHecho(tarjetaId, hecho) {
    await nube.escribir(`${base}/match_matches/${tarjetaId}`, { hecho: Boolean(hecho) }, { combinar: true });
  }

  async function crearTarjeta({ mazo, texto }) {
    const error = validarTarjeta({ mazo, texto });
    if (error) return { ok: false, error };
    const id = nuevoId();
    await nube.escribir(`${base}/match_tarjetas/${id}`, { mazo, texto: texto.trim(), creadaMs: Date.now() });
    await votar(id, 'si');
    return { ok: true, id };
  }

  async function tarjetasPropias() {
    const lista = await nube.listar(`${base}/match_tarjetas`);
    return lista.map(({ id, datos }) => ({ id, mazo: datos.mazo, texto: datos.texto, creadaMs: datos.creadaMs || 0, propia: true }));
  }

  return { misVotos, votar, pendientes, listarMatches, marcarHecho, crearTarjeta, tarjetasPropias };
}
