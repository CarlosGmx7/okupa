import { prueba, igual, verdadero } from './corredor.js';
import {
  aporteDe, aprenderDeDia, valorRasgo, describirRasgos, favoritosDe, cumpleRequiere, resolverPlantilla,
} from '../js/modulos/diario/aprender.js';

const RASGOS = [{ id: 'aventura', izquierda: 'aventurero', derecha: 'de rutina' }, { id: 'social', izquierda: 'sociable', derecha: 'casero' }];
const op = { id: 'dia-0001', tipo: 'opciones', opciones: [{ texto: 'Viajar', rasgos: { aventura: 2 } }, { texto: 'Casa', rasgos: { aventura: -1, social: -1 } }] };
const esc = { id: 'dia-0002', tipo: 'escala', extremos: ['Nada', 'Mucho'], rasgo: { id: 'social', signo: 1 } };
const sinRasgo = { id: 'dia-0003', tipo: 'opciones', opciones: [{ texto: 'x' }, { texto: 'y' }] };
const porId = new Map([op, esc, sinRasgo].map((p) => [p.id, p]));
const dia = (fecha) => ({ fecha, gustos: ['dia-0001', 'dia-0002', 'dia-0003'] });
const items = [{ opcion: 0 }, { valor: 10 }, { opcion: 1 }];

prueba('aprender: aporte de opciones y de escala', () => {
  igual(aporteDe(op, { opcion: 0 }), { aventura: 2 });
  igual(aporteDe(op, { opcion: 1 }), { aventura: -1, social: -1 });
  igual(aporteDe(esc, { valor: 10 }), { social: 2 });
  igual(aporteDe(esc, { valor: 1 }), { social: -2 });
  igual(aporteDe(sinRasgo, { opcion: 0 }), {});
});

prueba('aprender: cada día se aprende una sola vez', () => {
  const p1 = aprenderDeDia({}, dia('2026-11-05'), items, porId);
  igual(p1.rasgos, { aventura: { suma: 2, n: 1 }, social: { suma: 2, n: 1 } });
  igual(p1.respuestas, { 'dia-0001': 0, 'dia-0002': 10, 'dia-0003': 1 });
  igual(p1.aprendidos, ['2026-11-05']);
  igual(aprenderDeDia(p1, dia('2026-11-05'), items, porId), p1, 'la misma fecha no cuenta dos veces');
  const p2 = aprenderDeDia(p1, dia('2026-11-06'), items, porId);
  igual(p2.rasgos.aventura, { suma: 4, n: 2 });
});

prueba('aprender: un rasgo se muestra con 3 respuestas y las correcciones mandan', () => {
  let p = {};
  for (const fecha of ['2026-11-01', '2026-11-02']) p = aprenderDeDia(p, dia(fecha), items, porId);
  igual(valorRasgo(p, 'aventura').lado, null, 'con 2 todavía no');
  igual(describirRasgos(p, RASGOS), []);
  p = aprenderDeDia(p, dia('2026-11-03'), items, porId);
  igual(valorRasgo(p, 'aventura').lado, 'izquierda');
  igual(describirRasgos(p, RASGOS).map((r) => r.texto), ['Más bien aventurero', 'Más bien sociable']);
  const corregido = { ...p, correcciones: { aventura: 'derecha', social: 'oculto' } };
  igual(describirRasgos(corregido, RASGOS).map((r) => [r.texto, r.corregido]), [['Más bien de rutina', true]]);
  igual(valorRasgo({ correcciones: { social: 'medio' } }, 'social').lado, 'medio', 'una corrección cuenta aunque no haya respuestas');
  igual(describirRasgos({ correcciones: { social: 'medio' } }, RASGOS)[0].texto, 'Entre sociable y casero');
});

prueba('aprender: favoritos del perfil inicial más los agregados, menos los quitados', () => {
  const perfil = {
    inicial: { artistas: ['Canserbero', 'Lana del Rey'], cancion: 'Es épico', pelis: '' },
    favoritos: { artistas: ['Akapellah'], pelis: ['Coco'] },
    quitados: { artistas: ['lana del rey'] },
  };
  igual(favoritosDe(perfil), { artistas: ['Canserbero', 'Akapellah'], canciones: ['Es épico'], pelis: ['Coco'] });
  igual(favoritosDe(null), { artistas: [], canciones: [], pelis: [] });
});

prueba('aprender: requisitos de rasgo, favorito y respuesta', () => {
  let aventurero = {};
  for (const fecha of ['2026-11-01', '2026-11-02', '2026-11-03']) aventurero = aprenderDeDia(aventurero, dia(fecha), items, porId);
  const conArtista = { inicial: { artistas: ['Canserbero'] } };
  igual(cumpleRequiere({}, { a: null, b: null }), true);
  igual(cumpleRequiere({ requiere: { rasgo: { id: 'aventura', lado: 'izquierda' } } }, { a: aventurero, b: null }), true);
  igual(cumpleRequiere({ requiere: { rasgo: { id: 'aventura', lado: 'derecha' } } }, { a: aventurero, b: null }), false);
  igual(cumpleRequiere({ requiere: { favorito: 'artistas' } }, { a: conArtista, b: conArtista }), true);
  igual(cumpleRequiere({ requiere: { favorito: 'artistas' } }, { a: conArtista, b: {} }), false, 'tienen que tenerlo los dos');
  igual(cumpleRequiere({ requiere: { respuesta: { pregunta: 'dia-0001', opciones: [0] } } }, { a: {}, b: aventurero }), true);
  igual(cumpleRequiere({ requiere: { respuesta: { pregunta: 'dia-0001', opciones: [1] } } }, { a: {}, b: aventurero }), false);
});

prueba('aprender: plantillas se resuelven desde el lado de cada uno', () => {
  const perfiles = { a: { inicial: { artistas: ['Canserbero'], cancion: 'Es épico' } }, b: { inicial: { artistas: ['Lana del Rey'], cancion: 'Video Games' } } };
  const nombres = { a: 'Carlos', b: 'Sofi' };
  const p = { id: 'dia-0200', tipo: 'opciones', texto: '¿Qué tanto aguantas a {artista_fav_otro}, {nombre_otro}?', opciones: [{ texto: 'Pongo {cancion_otro}' }, { texto: 'Mejor {artista_fav_mio}' }] };
  igual(resolverPlantilla(p, { yo: 'a', nombres, perfiles }).texto, '¿Qué tanto aguantas a Lana del Rey, Sofi?');
  igual(resolverPlantilla(p, { yo: 'b', nombres, perfiles }).opciones.map((o) => o.texto), ['Pongo Es épico', 'Mejor Lana del Rey']);
  igual(resolverPlantilla(p, { yo: 'a', nombres, perfiles: { ...perfiles, b: { inicial: {} } } }), null, 'sin datos no se usa');
  igual(resolverPlantilla(sinRasgo, { yo: 'a', nombres, perfiles }).opciones, sinRasgo.opciones, 'sin marcas queda igual');
});
