import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { semilla } from './matematicas.prueba.js';
import { crearPareja, unirse as unirsePareja } from '../js/nucleo/pareja.js';
import { cargarDiario } from '../js/modulos/diario/contenido.js';
import { abrirDia, leerDia, enviar, leerPropia, leerAmbas, guardarPerfil, leerPerfiles, listarDias } from '../js/modulos/diario/dia.js';
import { coincidencia, adivino, estadoDia, rachaAmbos, porcentajeAdivinanzas } from '../js/modulos/diario/revelar.js';

const datos = await cargarDiario();
const porId = new Map(datos.preguntas.map((p) => [p.id, p]));
const FECHA = '2026-11-05';

async function pareja() {
  const mundo = crearMundoFalso();
  const { codigo } = await crearPareja(mundo.nube('u1'), almacenEnMemoria(), { nombre: 'Carlos' });
  await unirsePareja(mundo.nube('u2'), almacenEnMemoria(), { codigo, nombre: 'Sofi' });
  return {
    mundo,
    a: { nube: mundo.nube('u1'), pareja: { codigo, lugar: 'a' } },
    b: { nube: mundo.nube('u2'), pareja: { codigo, lugar: 'b' } },
  };
}
const abrir = (yo, fecha = FECHA, rnd = semilla(4)) => abrirDia(yo.nube, yo.pareja, { fecha, datos, rnd });
const gustos = (opcion) => ({ items: [0, 1, 2].map(() => ({ opcion, comentario: '' })) });

prueba('diario día: los dos abren a la vez y ven lo mismo', async () => {
  const { a, b } = await pareja();
  const [da, db] = await Promise.all([abrir(a, FECHA, semilla(1)), abrir(b, FECHA, semilla(2))]);
  igual(da.gustos, db.gustos);
  igual(da.ingles, db.ingles);
  igual((await leerDia(a.nube, a.pareja, FECHA)).gustos, da.gustos);
  igual(da.ingles.length, 3);
  const uso = await a.nube.leer(`parejas/${a.pareja.codigo}/estado/uso`);
  igual(uso.vistasDiario, da.gustos, 'las vistas se guardan una sola vez');
  igual(uso.vistasIngles, da.ingles.map((p) => p.entrada));
  const otroDia = await abrir(a, '2026-11-06');
  verdadero(otroDia.gustos.every((id) => !da.gustos.includes(id)), 'al otro día no se repiten');
});

prueba('diario día: usa los perfiles de los dos para escoger', async () => {
  const { a, b } = await pareja();
  await guardarPerfil(a.nube, a.pareja, { intensidad: 3, evitarTemas: ['postura'] });
  await guardarPerfil(b.nube, b.pareja, { intensidad: 1 });
  const perfiles = await leerPerfiles(a.nube, a.pareja);
  igual([perfiles.a.inicial.intensidad, perfiles.b.inicial.intensidad], [3, 1]);
  for (let i = 0; i < 5; i++) {
    const dia = await abrir(a, `2026-12-0${i + 1}`, semilla(i + 1));
    verdadero(dia.gustos.every((id) => porId.get(id).intensidad === 1 && porId.get(id).tema !== 'postura'), dia.gustos.join());
  }
});

prueba('diario día: enviar dos veces deja la primera', async () => {
  const { a } = await pareja();
  await abrir(a);
  igual(await enviar(a.nube, a.pareja, FECHA, 'gustos', gustos(0)), true);
  igual(await enviar(a.nube, a.pareja, FECHA, 'gustos', gustos(1)), false);
  igual((await leerPropia(a.nube, a.pareja, FECHA, 'gustos')).items[0].opcion, 0);
});

prueba('diario día: leerAmbas es null hasta que los dos enviaron', async () => {
  const { a, b } = await pareja();
  await abrir(a);
  await enviar(a.nube, a.pareja, FECHA, 'gustos', gustos(0));
  igual(await leerAmbas(a.nube, a.pareja, FECHA, 'gustos'), null);
  igual(await leerAmbas(b.nube, b.pareja, FECHA, 'gustos'), null, 'b no ve lo de a sin responder');
  await enviar(b.nube, b.pareja, FECHA, 'gustos', gustos(2));
  const ambas = await leerAmbas(b.nube, b.pareja, FECHA, 'gustos');
  igual([ambas.a.items[0].opcion, ambas.b.items[0].opcion], [0, 2]);
});

prueba('diario día: gustos e inglés se revelan por separado', async () => {
  const { a, b } = await pareja();
  await abrir(a);
  await enviar(a.nube, a.pareja, FECHA, 'gustos', gustos(0));
  await enviar(b.nube, b.pareja, FECHA, 'gustos', gustos(0));
  await enviar(a.nube, a.pareja, FECHA, 'ingles', { items: [0, 1, 2], aciertos: 2 });
  igual(await leerAmbas(a.nube, a.pareja, FECHA, 'ingles'), null);
  verdadero(await leerAmbas(a.nube, a.pareja, FECHA, 'gustos'), 'gustos sí');
  const dia = await leerDia(a.nube, a.pareja, FECHA);
  igual(estadoDia(dia, 'a'), { gustos: 'revelado', ingles: 'esperando' });
  igual(estadoDia(dia, 'b'), { gustos: 'revelado', ingles: 'responder' });
  igual((await listarDias(a.nube, a.pareja)).map((d) => d.fecha), [FECHA]);
});

prueba('diario: coincidencia y adivino', () => {
  const op = { tipo: 'opciones', opciones: [{ texto: 'x' }, { texto: 'y' }] };
  const esc = { tipo: 'escala', extremos: ['a', 'b'] };
  igual(coincidencia(op, { opcion: 1 }, { opcion: 1 }), 'coinciden');
  igual(coincidencia(op, { opcion: 0 }, { opcion: 1 }), 'debate');
  igual(coincidencia(esc, { valor: 7 }, { valor: 7 }), 'coinciden');
  igual(coincidencia(esc, { valor: 7 }, { valor: 4 }), 'parecido');
  igual(coincidencia(esc, { valor: 8 }, { valor: 4 }), 'debate');
  igual(adivino(op, 1, { opcion: 1 }), true);
  igual(adivino(op, 0, { opcion: 1 }), false);
  igual(adivino(esc, 6, { valor: 7 }), true);
  igual(adivino(esc, 5, { valor: 7 }), false);
  igual(adivino(op, undefined, { opcion: 1 }), false);
  const yoTu = { tipo: 'opciones', espejo: [0, 1], opciones: [{ texto: 'Yo' }, { texto: 'Tú' }, { texto: 'Los dos' }] };
  igual(coincidencia(yoTu, { opcion: 0 }, { opcion: 0 }), 'debate', 'los dos dicen «yo»: no coinciden');
  igual(coincidencia(yoTu, { opcion: 0 }, { opcion: 1 }), 'coinciden', '«yo» y «tú» dicen lo mismo');
  igual(coincidencia(yoTu, { opcion: 2 }, { opcion: 2 }), 'coinciden');
  igual(adivino(yoTu, 0, { opcion: 1 }), true, 'creo que dijo que fui yo, y dijo «tú»');
});

prueba('diario: rachaAmbos cuenta días seguidos con los dos', () => {
  const dia = (fecha, ambos = true) => ({ fecha, hechos: { gustos_a: true, ...(ambos ? { gustos_b: true } : {}) } });
  igual(rachaAmbos([dia('2026-11-03'), dia('2026-11-04'), dia('2026-11-05')], 'gustos', '2026-11-05'), 3);
  igual(rachaAmbos([dia('2026-11-03'), dia('2026-11-04'), dia('2026-11-05', false)], 'gustos', '2026-11-05'), 2, 'hoy todavía no cuenta en contra');
  igual(rachaAmbos([dia('2026-11-01'), dia('2026-11-03'), dia('2026-11-04')], 'gustos', '2026-11-04'), 2, 'un hueco corta la racha');
  igual(rachaAmbos([dia('2026-11-01')], 'gustos', '2026-11-05'), 0);
});

prueba('diario: porcentajeAdivinanzas', () => {
  const op = { tipo: 'opciones', opciones: [{ texto: 'x' }, { texto: 'y' }] };
  igual(porcentajeAdivinanzas([]), null);
  igual(porcentajeAdivinanzas([
    { pregunta: op, a: { opcion: 0, adivina: 1 }, b: { opcion: 1, adivina: 1 } },
    { pregunta: op, a: { opcion: 0, adivina: 0 }, b: { opcion: 0, adivina: 0 } },
  ]), 75);
});
