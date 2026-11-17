import { prueba, igual, verdadero } from './corredor.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { crearPantallasRuleta, TIPOS } from '../js/modulos/ruleta/pantallas.js';
import { crearRacha, PRESUPUESTOS, LUGARES, CLAVE_RULETA } from '../js/modulos/ruleta/logica.js';
import modulo from '../js/modulos/ruleta/modulo.js';

const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 2000) {
  for (let t = 0; t < ms && !cond(); t += 10) await esperar(10);
  verdadero(cond(), 'no llegó a tiempo');
}
const boton = (div, texto) => [...div.querySelectorAll('button')].find((b) => b.textContent.trim() === texto);
const plan = (div) => div.querySelector('.ruleta-plan-texto')?.textContent ?? null;
const ids = { nulo: 'n', medio: 'm', grande: 'g' };

// 3 planes por combinación, con tipos distintos, para poder reconocer de dónde sale cada uno.
const TIPOS_USADOS = ['cocinar', 'juego', 'cultura'];
const BANCO = PRESUPUESTOS.flatMap((p) => LUGARES.flatMap((l) => TIPOS_USADOS.map((tipo, i) => ({
  id: `${ids[p.id]}-${l.id}-${i}`, presupuesto: p.id, lugar: l.id, tipo, texto: `Plan ${p.id} ${l.id} número ${i + 1} para los dos`,
}))));
const textoDe = (p) => p.texto;

function nueva({ banco = BANCO, cargar, giro = 0, reducido = false, almacen = almacenEnMemoria(), azar = () => 0 } = {}) {
  const div = document.createElement('div');
  let nubeLlamada = false;
  const ctx = {
    almacen,
    nube: () => { nubeLlamada = true; throw new Error('la Ruleta no usa la nube'); },
    ir() {}, refrescar() {},
  };
  const pantallas = crearPantallasRuleta({
    cargar: cargar ?? (async () => banco), azar, ms: { giro }, movimientoReducido: () => reducido,
  });
  return { div, ctx, almacen, pantallas, nubeLlamada: () => nubeLlamada, abrir: () => pantallas.principal(div, {}, ctx) };
}
const pulsado = (div, texto) => boton(div, texto)?.getAttribute('aria-pressed');

prueba('ruleta pantalla: pinta «← Inicio», los 3 presupuestos y los 2 lugares, con Algo medio y Salir la primera vez', async () => {
  const r = nueva();
  await r.abrir();
  const volver = r.div.querySelector('a.volver');
  igual([volver.textContent, volver.getAttribute('href')], ['← Inicio', '#/']);
  for (const nombre of ['Sin plata', 'Algo medio', 'Darnos un gusto', 'En casa', 'Salir']) verdadero(boton(r.div, nombre), `falta «${nombre}»`);
  igual(['Sin plata', 'Algo medio', 'Darnos un gusto', 'En casa', 'Salir'].map((n) => pulsado(r.div, n)), ['false', 'true', 'false', 'false', 'true']);
  verdadero(boton(r.div, 'Girar'), 'falta «Girar»');
  verdadero(!plan(r.div), 'no hay plan antes de girar');
  verdadero(r.div.querySelectorAll('.ruleta-rueda').length === 1, 'falta la rueda');
  verdadero(!/null|undefined/.test(r.div.textContent), `texto feo en la pantalla: ${r.div.textContent}`);
  boton(r.div, 'Girar').click();
  await hasta(() => plan(r.div));
  verdadero(!/null|undefined/.test(r.div.textContent), `texto feo con el plan: ${r.div.textContent}`);
});

prueba('ruleta pantalla: cada presupuesto muestra su ayuda', async () => {
  const r = nueva();
  await r.abrir();
  const ayuda = () => r.div.querySelector('.ruleta-ayuda').textContent;
  igual(ayuda(), 'Hasta unos $80.000 para los dos');
  boton(r.div, 'Sin plata').click();
  igual(ayuda(), '$0 · con lo que ya hay');
  boton(r.div, 'Darnos un gusto').click();
  igual(ayuda(), 'Más de $80.000 para los dos');
});

prueba('ruleta pantalla: con elección guardada nulo/casa marca esos', async () => {
  const almacen = almacenEnMemoria();
  almacen.escribir(CLAVE_RULETA, { presupuesto: 'nulo', lugar: 'casa' });
  const r = nueva({ almacen });
  await r.abrir();
  igual(['Sin plata', 'Algo medio', 'Darnos un gusto', 'En casa', 'Salir'].map((n) => pulsado(r.div, n)), ['true', 'false', 'false', 'true', 'false']);
});

prueba('ruleta pantalla: una elección guardada corrupta vuelve a medio + salir', async () => {
  const almacen = almacenEnMemoria();
  almacen.escribir(CLAVE_RULETA, { presupuesto: 'x' });
  const r = nueva({ almacen });
  await r.abrir();
  igual([pulsado(r.div, 'Algo medio'), pulsado(r.div, 'Salir')], ['true', 'true']);
});

prueba('ruleta pantalla: tocar un selector guarda la elección en okupa:ruleta', async () => {
  const r = nueva();
  await r.abrir();
  boton(r.div, 'Darnos un gusto').click();
  igual(r.almacen.leer(CLAVE_RULETA, null), { presupuesto: 'grande', lugar: 'salir' });
  boton(r.div, 'En casa').click();
  igual(r.almacen.leer(CLAVE_RULETA, null), { presupuesto: 'grande', lugar: 'casa' });
  igual([pulsado(r.div, 'Darnos un gusto'), pulsado(r.div, 'Algo medio'), pulsado(r.div, 'En casa'), pulsado(r.div, 'Salir')], ['true', 'false', 'true', 'false']);
});

prueba('ruleta pantalla: Girar muestra un plan de la combinación elegida con su tipo y los dos botones', async () => {
  const r = nueva();
  await r.abrir();
  boton(r.div, 'Girar').click();
  await hasta(() => plan(r.div));
  const esperado = crearRacha(BANCO, () => 0).siguiente('medio', 'salir');
  igual(plan(r.div), textoDe(esperado));
  verdadero(plan(r.div).includes('medio salir'), plan(r.div));
  const tipo = TIPOS.find((t) => t.id === esperado.tipo);
  igual([r.div.querySelector('.ruleta-plan-icono').textContent, r.div.querySelector('.ruleta-plan-tipo').textContent], [tipo.icono, tipo.nombre]);
  verdadero(boton(r.div, 'Girar otra vez') && boton(r.div, '¡Hagámoslo!'), 'faltan los botones');
  verdadero(!boton(r.div, 'Girar'), '«Girar» deja su lugar al resultado');
  igual(r.nubeLlamada(), false);
});

prueba('ruleta pantalla: Girar otra vez muestra otro plan distinto', async () => {
  const r = nueva();
  await r.abrir();
  boton(r.div, 'Girar').click();
  await hasta(() => plan(r.div));
  const primero = plan(r.div);
  boton(r.div, 'Girar otra vez').click();
  await hasta(() => plan(r.div) && plan(r.div) !== primero);
  const racha = crearRacha(BANCO, () => 0);
  racha.siguiente('medio', 'salir');
  igual(plan(r.div), textoDe(racha.siguiente('medio', 'salir')));
});

prueba('ruleta pantalla: «¡Hagámoslo!» dice «¡Disfruten!» y no guarda nada más', async () => {
  const r = nueva();
  await r.abrir();
  boton(r.div, 'Girar').click();
  await hasta(() => plan(r.div));
  const antes = JSON.stringify(r.almacen.leer(CLAVE_RULETA, null));
  boton(r.div, '¡Hagámoslo!').click();
  verdadero(r.div.textContent.includes('¡Disfruten!'), r.div.textContent);
  verdadero(plan(r.div), 'el plan sigue a la vista');
  igual(JSON.stringify(r.almacen.leer(CLAVE_RULETA, null)), antes);
});

prueba('ruleta pantalla: dos toques en «Girar» mientras gira cuentan un solo giro', async () => {
  const r = nueva({ giro: 50 });
  await r.abrir();
  const girar = boton(r.div, 'Girar');
  girar.click();
  girar.click();
  girar.click();
  await hasta(() => plan(r.div), 1000);
  await esperar(120);
  igual(r.div.querySelectorAll('.ruleta-plan-texto').length, 1);
  const racha = crearRacha(BANCO, () => 0);
  igual(plan(r.div), textoDe(racha.siguiente('medio', 'salir')), 'se gastó un solo plan de la racha');
  const segundo = textoDe(racha.siguiente('medio', 'salir'));
  boton(r.div, 'Girar otra vez').click();
  await hasta(() => plan(r.div) === segundo, 1000);
});

prueba('ruleta pantalla: mientras gira no se puede cambiar de combinación ni girar otra vez', async () => {
  const r = nueva({ giro: 80 });
  await r.abrir();
  boton(r.div, 'Girar').click();
  verdadero(boton(r.div, 'Darnos un gusto').disabled && boton(r.div, 'En casa').disabled, 'los selectores se bloquean');
  verdadero(!plan(r.div), 'aún no hay plan');
  await hasta(() => plan(r.div), 1000);
  verdadero(!boton(r.div, 'En casa').disabled, 'se liberan al terminar');
});

prueba('ruleta pantalla: cada combinación lleva su propia racha y no se mezclan planes', async () => {
  const r = nueva();
  await r.abrir();
  boton(r.div, 'Girar').click();
  await hasta(() => plan(r.div));
  const rachaMedio = crearRacha(BANCO, () => 0);
  igual(plan(r.div), textoDe(rachaMedio.siguiente('medio', 'salir')));
  boton(r.div, 'Darnos un gusto').click();
  boton(r.div, 'En casa').click();
  verdadero(!plan(r.div), 'al cambiar de combinación se limpia el resultado');
  boton(r.div, 'Girar').click();
  await hasta(() => plan(r.div));
  const rachaGrande = crearRacha(BANCO, () => 0);
  igual(plan(r.div), textoDe(rachaGrande.siguiente('grande', 'casa')));
  verdadero(plan(r.div).includes('grande casa'), plan(r.div));
  boton(r.div, 'Algo medio').click();
  boton(r.div, 'Salir').click();
  boton(r.div, 'Girar').click();
  await hasta(() => plan(r.div));
  igual(plan(r.div), textoDe(rachaMedio.siguiente('medio', 'salir')), 'la racha de medio/salir sigue donde iba');
});

prueba('ruleta pantalla: si el banco no carga lo dice y la pantalla no queda en blanco', async () => {
  const r = nueva({ cargar: async () => { throw new Error('sin internet'); } });
  await r.abrir();
  verdadero(r.div.textContent.includes('No se pudieron cargar los planes'), r.div.textContent);
  verdadero(r.div.querySelector('a.volver'), 'sigue el enlace «← Inicio»');
  verdadero(boton(r.div, 'Reintentar'), 'ofrece reintentar');
  verdadero(!boton(r.div, 'Girar'), 'no ofrece girar sin planes');
});

prueba('ruleta pantalla: «Reintentar» pide refrescar la pantalla', async () => {
  const r = nueva({ cargar: async () => { throw new Error('sin internet'); } });
  let refrescos = 0;
  r.ctx.refrescar = () => { refrescos++; };
  await r.abrir();
  boton(r.div, 'Reintentar').click();
  igual(refrescos, 1);
});

prueba('ruleta pantalla: una combinación sin planes avisa y no rompe', async () => {
  const r = nueva({ banco: BANCO.filter((p) => !(p.presupuesto === 'nulo' && p.lugar === 'casa')) });
  await r.abrir();
  boton(r.div, 'Sin plata').click();
  boton(r.div, 'En casa').click();
  boton(r.div, 'Girar').click();
  await hasta(() => r.div.textContent.includes('Todavía no hay planes para esta combinación'));
  verdadero(!plan(r.div));
  verdadero(boton(r.div, 'Girar'), 'se puede elegir otra y girar');
  igual(r.div.textContent.includes('undefined') || r.div.textContent.includes('null'), false);
});

prueba('ruleta pantalla: con movimiento reducido el plan sale sin esperar', async () => {
  const r = nueva({ giro: 5000, reducido: true });
  await r.abrir();
  boton(r.div, 'Girar').click();
  verdadero(plan(r.div), 'el plan está al instante');
  verdadero(!r.div.querySelector('.ruleta-rueda').classList.contains('girando'), 'la rueda no anima');
});

prueba('ruleta pantalla: sin pareja ni nube funciona y nunca llama a ctx.nube', async () => {
  const r = nueva();
  await r.abrir();
  boton(r.div, 'Girar').click();
  await hasta(() => plan(r.div));
  boton(r.div, 'Girar otra vez').click();
  boton(r.div, 'Sin plata').click();
  igual(r.nubeLlamada(), false);
});

prueba('ruleta pantalla: los tipos del banco real tienen ícono y nombre', async () => {
  const banco = await (await fetch('data/ruleta/planes.json')).json();
  const usados = [...new Set(banco.map((p) => p.tipo))];
  for (const t of usados) verdadero(TIPOS.some((x) => x.id === t && x.icono && x.nombre), `tipo sin ícono: ${t}`);
});

prueba('ruleta módulo: se registra en Nosotros después de Cápsula, sin aviso bajo el modo', async () => {
  igual(modulo.id, 'ruleta');
  igual(modulo.nombre, 'Ruleta');
  igual({ ...modulo.accesoJuntos }, { ruta: 'ruleta', nombre: 'Ruleta', icono: '◎', seccion: 'nosotros', orden: 5 });
  igual(typeof modulo.rutas[''], 'function');
  const lista = await (await fetch('modulos.json')).json();
  igual(lista[lista.length - 1], 'ruleta');
});
