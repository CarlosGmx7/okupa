import { prueba, igual, verdadero } from './corredor.js';
import { crearMundoFalso } from './nube-falsa.js';
import {
  validarLugar, crearLugar, listarLugares, marcarFuimos, borrarLugar,
  guardarVersion, leerVersiones, comprimirFoto, agregarFoto, listarFotos, borrarFoto,
  buscarLugares, MAX_FOTOS,
} from '../js/modulos/mapa/lugares.js';

const parejaDe = (lugar) => ({ codigo: 'ABC234', lugar, nombres: { a: 'Carlos', b: 'Yuli' } });
const base = { nombre: 'Cartagena', lat: 10.42, lng: -75.54, tipo: 'deseo', nota: 'La ciudad amurallada' };

prueba('lugares: valida nombre, coordenadas, tipo y largos', () => {
  igual(validarLugar(base), null);
  for (const malo of [
    { ...base, nombre: '  ' }, { ...base, nombre: 'x'.repeat(81) }, { ...base, lat: 91 },
    { ...base, lng: -181 }, { ...base, tipo: 'otro' }, { ...base, nota: 'x'.repeat(301) },
    { ...base, tipo: 'recuerdo', fecha: '8/11/2026' },
  ]) verdadero(typeof validarLugar(malo) === 'string', JSON.stringify(malo).slice(0, 60));
  igual(validarLugar({ ...base, tipo: 'recuerdo', fecha: '2026-11-08' }), null);
});

prueba('lugares: los dos ven el lugar creado, en orden de creación', async () => {
  const mundo = crearMundoFalso();
  const r = await crearLugar(mundo.nube('u1'), parejaDe('a'), base);
  verdadero(r.ok, r.error);
  await crearLugar(mundo.nube('u1'), parejaDe('a'), { ...base, nombre: 'Medellín' });
  const vistos = await listarLugares(mundo.nube('u2'), parejaDe('b'));
  igual(vistos.map((l) => l.nombre), ['Cartagena', 'Medellín']);
  igual(vistos[0].id, r.id);
});

prueba('lugares: no guarda un lugar inválido', async () => {
  const mundo = crearMundoFalso();
  const r = await crearLugar(mundo.nube('u1'), parejaDe('a'), { ...base, nombre: '' });
  igual(r.ok, false);
  igual(await listarLugares(mundo.nube('u1'), parejaDe('a')), []);
});

prueba('lugares: "¡Fuimos!" convierte el deseo en recuerdo con fecha', async () => {
  const mundo = crearMundoFalso();
  const nube = mundo.nube('u1');
  const { id } = await crearLugar(nube, parejaDe('a'), base);
  await marcarFuimos(nube, parejaDe('a'), id, '2026-11-08');
  const [l] = await listarLugares(nube, parejaDe('a'));
  igual([l.tipo, l.fecha], ['recuerdo', '2026-11-08']);
});

prueba('lugares: la versión del otro no se pide hasta escribir la propia', async () => {
  const mundo = crearMundoFalso();
  const { id } = await crearLugar(mundo.nube('u1'), parejaDe('a'), { ...base, tipo: 'recuerdo' });
  await guardarVersion(mundo.nube('u2'), parejaDe('b'), id, 'Llovió todo el día y fue perfecto');
  igual(await leerVersiones(mundo.nube('u1'), parejaDe('a'), id), { mia: null, otra: null, otraEscrita: null });
  await guardarVersion(mundo.nube('u1'), parejaDe('a'), id, 'El mejor viaje');
  igual(await leerVersiones(mundo.nube('u1'), parejaDe('a'), id),
    { mia: 'El mejor viaje', otra: 'Llovió todo el día y fue perfecto', otraEscrita: true });
});

prueba('lugares: versión vacía o de más de 1000 caracteres se rechaza', async () => {
  const nube = crearMundoFalso().nube('u1');
  igual((await guardarVersion(nube, parejaDe('a'), 'x', '  ')).ok, false);
  igual((await guardarVersion(nube, parejaDe('a'), 'x', 'y'.repeat(1001))).ok, false);
});

function lienzoDe(ancho, alto) {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  const g = c.getContext('2d');
  // Ruido para que el JPEG no comprima a casi nada.
  const img = g.createImageData(ancho, alto);
  for (let i = 0; i < img.data.length; i++) img.data[i] = (i * 7919) % 256;
  g.putImageData(img, 0, 0);
  return c;
}

prueba('lugares: comprimirFoto reduce a 1200 px y cabe en el límite', () => {
  const f = comprimirFoto(lienzoDe(3000, 1500));
  igual([f.ancho, f.alto], [1200, 600]);
  verdadero(f.datos.startsWith('data:image/jpeg;base64,'));
  verdadero(f.datos.length <= 380000, `${f.datos.length}`);
});

prueba('lugares: una foto pequeña no se agranda', () => {
  const f = comprimirFoto(lienzoDe(400, 300));
  igual([f.ancho, f.alto], [400, 300]);
});

prueba('lugares: hasta 6 fotos por lugar, y se pueden borrar', async () => {
  const nube = crearMundoFalso().nube('u1');
  const { id } = await crearLugar(nube, parejaDe('a'), { ...base, tipo: 'recuerdo' });
  const foto = { datos: 'data:image/jpeg;base64,AAAA', ancho: 10, alto: 10 };
  for (let i = 0; i < MAX_FOTOS; i++) verdadero((await agregarFoto(nube, parejaDe('a'), id, foto)).ok);
  igual((await agregarFoto(nube, parejaDe('a'), id, foto)).ok, false);
  const fotos = await listarFotos(nube, parejaDe('a'), id);
  igual(fotos.length, MAX_FOTOS);
  await borrarFoto(nube, parejaDe('a'), id, fotos[0].id);
  igual((await listarFotos(nube, parejaDe('a'), id)).length, MAX_FOTOS - 1);
});

prueba('lugares: borrar un lugar borra también sus fotos y versiones', async () => {
  const mundo = crearMundoFalso();
  const nube = mundo.nube('u1');
  const { id } = await crearLugar(nube, parejaDe('a'), { ...base, tipo: 'recuerdo' });
  await agregarFoto(nube, parejaDe('a'), id, { datos: 'data:image/jpeg;base64,AA', ancho: 1, alto: 1 });
  await guardarVersion(nube, parejaDe('a'), id, 'Texto');
  await borrarLugar(nube, parejaDe('a'), id);
  igual(await listarLugares(nube, parejaDe('a')), []);
  igual(await nube.listar(`parejas/ABC234/lugares/${id}/fotos`), []);
  igual(await nube.leer(`parejas/ABC234/lugares/${id}/versiones/a`), null);
});

prueba('lugares: borrar un lugar borra también la versión que escribió el otro', async () => {
  const mundo = crearMundoFalso();
  const { id } = await crearLugar(mundo.nube('u1'), parejaDe('a'), { ...base, tipo: 'recuerdo' });
  await guardarVersion(mundo.nube('u2'), parejaDe('b'), id, 'Lo de Yuli');
  await borrarLugar(mundo.nube('u1'), parejaDe('a'), id);
  igual(await mundo.nube('u2').leer(`parejas/ABC234/lugares/${id}/versiones/b`), null);
});

prueba('lugares: buscarLugares usa Photon y devuelve nombre, detalle y coordenadas', async () => {
  let pedida = '';
  const fetchFalso = async (url) => {
    pedida = url;
    return { ok: true, json: async () => ({ features: [
      { geometry: { coordinates: [-75.54, 10.42] }, properties: { name: 'Cartagena', state: 'Bolívar', country: 'Colombia' } },
      { geometry: { coordinates: [-74.07, 4.71] }, properties: { name: 'Bogotá', country: 'Colombia' } },
      { geometry: { coordinates: [1, 2] }, properties: {} },
    ] }) };
  };
  const r = await buscarLugares('cartagena', fetchFalso);
  verdadero(pedida.startsWith('https://photon.komoot.io/api/?q=cartagena'), pedida);
  igual(r, [
    { nombre: 'Cartagena', detalle: 'Bolívar, Colombia', lat: 10.42, lng: -75.54 },
    { nombre: 'Bogotá', detalle: 'Colombia', lat: 4.71, lng: -74.07 },
  ]);
  igual(await buscarLugares(' ', fetchFalso), []);
});
