import { prueba, igual, verdadero } from './corredor.js';
import { etiquetasEnEspanol, aLngLat, limites, MAPLIBRE, ESTILO_LIBERTY } from '../js/modulos/mapa/motor.js';

const ESPANOL = ['coalesce', ['get', 'name:es'], ['get', 'name']];

const muestra = () => ({
  version: 8,
  layers: [
    { id: 'fondo', type: 'background' },
    { id: 'agua', type: 'symbol', layout: { 'text-field': ['case', ['has', 'name:nonlatin'], ['get', 'name:latin'], ['coalesce', ['get', 'name_en'], ['get', 'name']]] } },
    { id: 'escudo', type: 'symbol', layout: { 'text-field': '{ref}' } },
    { id: 'casa', type: 'symbol', layout: { 'text-field': ['get', 'housenumber'] } },
    { id: 'ciudad', type: 'symbol', layout: { 'text-field': '{name:latin}', 'text-size': 14 } },
  ],
});

prueba('mapa: etiquetas con nombre pasan a español, con el nombre local de respaldo', () => {
  const r = etiquetasEnEspanol(muestra());
  igual(r.layers[1].layout['text-field'], ESPANOL);
  igual(r.layers[4].layout['text-field'], ESPANOL);
  igual(r.layers[4].layout['text-size'], 14, 'conserva lo demás del layout');
});

prueba('mapa: etiquetas que no son nombres (números de vía o de casa) no cambian', () => {
  const r = etiquetasEnEspanol(muestra());
  igual(r.layers[2].layout['text-field'], '{ref}');
  igual(r.layers[3].layout['text-field'], ['get', 'housenumber']);
  igual(r.layers[0], { id: 'fondo', type: 'background' });
});

prueba('mapa: etiquetasEnEspanol no modifica el estilo original', () => {
  const original = muestra();
  const copia = JSON.stringify(original);
  etiquetasEnEspanol(original);
  igual(JSON.stringify(original), copia);
});

prueba('mapa: convierte [lat, lng] a [lng, lat] y calcula límites', () => {
  igual(aLngLat([4.6, -74.1]), [-74.1, 4.6]);
  igual(limites([[4, -75], [6, -73], [5, -74]]), [[-75, 4], [-73, 6]]);
});

prueba('mapa: usa MapLibre con versión fija y el estilo Liberty de OpenFreeMap', () => {
  verdadero(/maplibre-gl\/\d+\.\d+\.\d+$/.test(MAPLIBRE), MAPLIBRE);
  igual(ESTILO_LIBERTY, 'https://tiles.openfreemap.org/styles/liberty');
});
