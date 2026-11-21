// Relevo de Okupa (Cloudflare Worker): cuando un celular crea o acepta un juego, le pide a GitHub correr
// el workflow «Notificaciones» de una vez, para que la invitación llegue en segundos y no al siguiente cron.
// Se pega tal cual en el editor de Cloudflare (ver docs/guia-relevo.md). Necesita el secreto GITHUB_TOKEN:
// un token fino con «Actions: Read and write» solo sobre CarlosGmx7/okupa.
// No recibe ni guarda datos: solo despierta a GitHub, que manda lo que ya está en la bandeja de avisos.

const ORIGEN = 'https://carlosgmx7.github.io';
const FRENO_MS = 15000;
const GITHUB = 'https://api.github.com/repos/CarlosGmx7/okupa/actions/workflows/notificaciones.yml/dispatches';

export function crearRelevo({ ahora = () => Date.now(), buscar = (...a) => fetch(...a) } = {}) {
  let ultimo = -Infinity;
  return async function atender(request, env) {
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    if (request.headers.get('Origin') !== ORIGEN) return new Response(null, { status: 403 });
    if (!env?.GITHUB_TOKEN) return new Response(null, { status: 500 });
    // Un disparo cada 15 s basta: GitHub deja una corrida en marcha y una en cola, y cada una manda toda la bandeja.
    if (ahora() - ultimo < FRENO_MS) return new Response(null, { status: 204 });
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
      if (!r.ok) {
        console.warn(`GitHub respondió ${r.status}`);
        return new Response(null, { status: 502 });
      }
    } catch (e) {
      console.warn(`No se pudo llamar a GitHub: ${e?.message ?? e}`);
      return new Response(null, { status: 502 });
    }
    ultimo = ahora();
    return new Response(null, { status: 204 });
  };
}

const atender = crearRelevo();
export default { fetch: (request, env) => atender(request, env) };
