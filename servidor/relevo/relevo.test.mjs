// Pruebas del relevo de Cloudflare. Correr con `node --test servidor/relevo/relevo.test.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearRelevo } from './relevo.js';

const BUENO = 'https://carlosgmx7.github.io';
const GITHUB = 'https://api.github.com/repos/CarlosGmx7/okupa/actions/workflows/notificaciones.yml/dispatches';
const ENV = { GITHUB_TOKEN: 'tok-123' };

function armar({ respuesta = 204 } = {}) {
  const llamadas = [];
  let ms = 1_000_000;
  const relevo = crearRelevo({
    ahora: () => ms,
    buscar: async (url, opciones) => { llamadas.push({ url, opciones }); return new Response(null, { status: typeof respuesta === 'function' ? respuesta() : respuesta }); },
  });
  return { relevo, llamadas, pasar: (seg) => { ms += seg * 1000; } };
}
const pedido = (metodo = 'POST', origen = BUENO) =>
  new Request('https://okupa-relevo.ejemplo.workers.dev/', { method: metodo, headers: origen ? { Origin: origen } : {} });

test('GET → 405 sin llamar a GitHub', async () => {
  const { relevo, llamadas } = armar();
  assert.equal((await relevo(pedido('GET'), ENV)).status, 405);
  assert.equal(llamadas.length, 0);
});

test('otro origen o sin origen → 403 sin llamar a GitHub', async () => {
  const { relevo, llamadas } = armar();
  assert.equal((await relevo(pedido('POST', 'https://otro.com'), ENV)).status, 403);
  assert.equal((await relevo(pedido('POST', null), ENV)).status, 403);
  assert.equal(llamadas.length, 0);
});

test('POST del origen bueno → 204 y dispara el workflow', async () => {
  const { relevo, llamadas } = armar();
  assert.equal((await relevo(pedido(), ENV)).status, 204);
  assert.equal(llamadas.length, 1);
  const { url, opciones } = llamadas[0];
  assert.equal(url, GITHUB);
  assert.equal(opciones.method, 'POST');
  assert.equal(opciones.body, '{"ref":"main"}');
  assert.deepEqual(opciones.headers, {
    Authorization: 'Bearer tok-123',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'okupa-relevo',
  });
});

test('freno: a los 5 s no dispara otra vez; a los 16 s sí', async () => {
  const { relevo, llamadas, pasar } = armar();
  await relevo(pedido(), ENV);
  pasar(5);
  assert.equal((await relevo(pedido(), ENV)).status, 204);
  assert.equal(llamadas.length, 1);
  pasar(11);
  await relevo(pedido(), ENV);
  assert.equal(llamadas.length, 2);
});

test('si GitHub falla → 502 y el freno no se arma', async () => {
  let status = 401;
  const { relevo, llamadas } = armar({ respuesta: () => status });
  assert.equal((await relevo(pedido(), ENV)).status, 502);
  status = 204;
  assert.equal((await relevo(pedido(), ENV)).status, 204);
  assert.equal(llamadas.length, 2);
});

test('si la red a GitHub se cae → 502', async () => {
  const relevo = crearRelevo({ buscar: async () => { throw new Error('sin red'); } });
  assert.equal((await relevo(pedido(), ENV)).status, 502);
});

test('sin token → 500 sin llamar a GitHub', async () => {
  const { relevo, llamadas } = armar();
  assert.equal((await relevo(pedido(), {})).status, 500);
  assert.equal(llamadas.length, 0);
});
