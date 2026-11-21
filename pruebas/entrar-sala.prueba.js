import { prueba, igual, verdadero } from './corredor.js';
import { entrarASala } from '../js/nucleo/entrar-sala.js';

const AHORA = 1_800_000_000_000;
const MIN = 60 * 1000;

// `salas` es la secuencia de lecturas: la primera antes de unirse, la segunda después.
function armar(salas, entro = true) {
  const lecturas = [...salas];
  let uniones = 0;
  return {
    leer: async () => (lecturas.length > 1 ? lecturas.shift() : lecturas[0]),
    unirse: async () => { uniones++; return entro; },
    uniones: () => uniones,
  };
}
const esperando = (minutos = 1) => ({ estado: 'esperando', anfitrion: 'a', creadaMs: AHORA - minutos * MIN });

prueba('entrar a sala: si no existe, terminó o se canceló, ya no', async () => {
  for (const sala of [null, { estado: 'terminada', anfitrion: 'a' }, { estado: 'cancelada', anfitrion: 'a' }]) {
    const f = armar([sala]);
    igual(await entrarASala({ ...f, yo: 'b', ahora: AHORA }), 'ya-no', JSON.stringify(sala));
    igual(f.uniones(), 0);
  }
});

prueba('entrar a sala: si ya están jugando, entra sin volver a unirse', async () => {
  const f = armar([{ estado: 'jugando', anfitrion: 'a' }]);
  igual(await entrarASala({ ...f, yo: 'b', ahora: AHORA }), 'jugar');
  igual(f.uniones(), 0);
});

prueba('entrar a sala: si está esperando, se une y entra', async () => {
  const f = armar([esperando()]);
  igual(await entrarASala({ ...f, yo: 'b', ahora: AHORA }), 'jugar');
  igual(f.uniones(), 1);
});

prueba('entrar a sala: si otro toque ya la pasó a jugando, entra igual', async () => {
  const f = armar([esperando(), { estado: 'jugando', anfitrion: 'a' }], false);
  igual(await entrarASala({ ...f, yo: 'b', ahora: AHORA }), 'jugar');
});

prueba('entrar a sala: si la cancelaron mientras entraba, ya no', async () => {
  const f = armar([esperando(), { estado: 'cancelada', anfitrion: 'a' }], false);
  igual(await entrarASala({ ...f, yo: 'b', ahora: AHORA }), 'ya-no');
});

prueba('entrar a sala: con caduca, una espera de más de 30 min ya no cuenta', async () => {
  const vieja = armar([esperando(31)]);
  igual(await entrarASala({ ...vieja, yo: 'b', caduca: true, ahora: AHORA }), 'ya-no');
  igual(vieja.uniones(), 0);
  const sinCaducar = armar([esperando(31)]);
  igual(await entrarASala({ ...sinCaducar, yo: 'b', ahora: AHORA }), 'jugar');
  igual(sinCaducar.uniones(), 1);
});

prueba('entrar a sala: el anfitrión que toca su propia invitación entra a su sala', async () => {
  const f = armar([esperando()]);
  igual(await entrarASala({ ...f, yo: 'a', ahora: AHORA }), 'jugar');
  igual(f.uniones(), 0);
});

prueba('entrar a sala: si la lectura falla, rechaza (la pantalla dice que se perdió la conexión)', async () => {
  let rechazo = null;
  try { await entrarASala({ leer: () => Promise.reject(new Error('sin red')), unirse: async () => true, yo: 'b' }); }
  catch (e) { rechazo = e; }
  verdadero(rechazo instanceof Error);
});
