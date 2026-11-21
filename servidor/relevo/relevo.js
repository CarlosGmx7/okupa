// Relevo de Okupa (Cloudflare Worker): cuando un celular crea o acepta un juego, le pide a GitHub correr
// el workflow «Notificaciones» de una vez, para que la invitación llegue en segundos y no al siguiente cron.
// Se pega tal cual en el editor de Cloudflare (ver docs/guia-relevo.md). Necesita el secreto GITHUB_TOKEN:
// un token fino con «Actions: Read and write» solo sobre CarlosGmx7/okupa.
// No recibe ni guarda datos: solo despierta a GitHub, que manda lo que ya está en la bandeja de avisos.

const ORIGEN = 'https://carlosgmx7.github.io';
const FRENO_MS = 15000;
const GITHUB = 'https://api.github.com/repos/CarlosGmx7/okupa/actions/workflows/notificaciones.yml/dispatches';

function crearRelevo({ ahora = () => Date.now(), buscar = (...a) => fetch(...a) } = {}) {
  let ultimo = -Infinity;
  return async function atender(request, env) {
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    if (request.headers.get('Origin') !== ORIGEN) return new Response(null, { status: 403 });
    if (!env?.GITHUB_TOKEN) return new Response(null, { status: 500 });
    // Un disparo cada 15 s basta: GitHub deja una corrida en marcha y una en cola, y cada una manda toda la bandeja.
    if (ahora() - ultimo < FRENO_MS) return new Response(null, { status: 204 });
    // Se arma antes de llamar: los pedidos que llegan mientras GitHub responde no disparan otra vez.
    const anterior = ultimo;
    ultimo = ahora();
    const fallo = (motivo) => {
      console.warn(motivo);
      ultimo = anterior; // si GitHub falló, el siguiente pedido puede intentar de nuevo
      return new Response(null, { status: 502 });
    };
    try {
      const r = await buscar(GITHUB, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'okupa-relevo',
        },
        body: JSON.stringify({ ref: 'main' }),
      });
      if (!r.ok) return fallo(`GitHub respondió ${r.status}`);
    } catch (e) {
      return fallo(`No se pudo llamar a GitHub: ${e?.message ?? e}`);
    }
    return new Response(null, { status: 204 });
  };
}

// Un solo export: el editor de Cloudflare toma cada export con nombre como otra entrada del Worker.
// `crearRelevo` va dentro solo para las pruebas.
const atender = crearRelevo();
export default { fetch: (request, env) => atender(request, env), crearRelevo };
