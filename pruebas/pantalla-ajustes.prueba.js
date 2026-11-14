import { prueba, igual, verdadero } from './corredor.js';
import { almacenEnMemoria } from './pareja.prueba.js';
import { leerAjustes } from '../js/nucleo/ajustes.js';
import { pantallaAjustes } from '../js/nucleo/pantalla-ajustes.js';
import { pantallaInicio, pantallaAcerca } from '../js/nucleo/inicio.js';
import { guardarPreferencias } from '../js/nucleo/notificaciones.js';

function pintar(extra = {}) {
  const almacen = extra.almacen || almacenEnMemoria();
  const div = document.createElement('div');
  pantallaAjustes(div, {}, { almacen, modulos: [], ir() {}, refrescar() {}, puedeVibrar: true, ...extra });
  return { div, almacen };
}
const texto = (div) => div.textContent;

prueba('inicio: el engranaje lleva a Ajustes', () => {
  const div = document.createElement('div');
  pantallaInicio(div, {}, { modulos: [], almacen: almacenEnMemoria(), ir() {}, refrescar() {} });
  const g = div.querySelector('.engranaje');
  verdadero(g, 'falta el engranaje');
  igual([g.tagName, g.getAttribute('href'), g.getAttribute('aria-label')], ['A', '#/ajustes', 'Ajustes']);
  verdadero(g.querySelector('svg'), 'el engranaje lleva su ícono');
});

prueba('ajustes: se pinta con los grupos y filas', () => {
  const { div } = pintar();
  igual(div.querySelector('h1')?.textContent, 'Ajustes');
  igual([...div.querySelectorAll('.grupo-ajustes-titulo')].map((h) => h.textContent), ['Tema', 'Letra', 'Foto', 'Sonidos y vibración', 'Copia de seguridad', 'Datos']);
  for (const t of ['Guardar copia', 'Recuperar copia']) verdadero(texto(div).includes(t), `falta "${t}"`);
  verdadero(div.querySelector('.ajustes-pie a[href="#/privacidad"]'), 'falta el enlace a la política');
  for (const t of ['Vino y dorado', 'Grafito y rosa', 'Foto de inicio', 'Sonidos', 'Vibración al tocar', 'Datos de la pareja', 'Borrar datos de este celular', 'Acerca de Okupa']) {
    verdadero(texto(div).includes(t), `falta "${t}"`);
  }
  igual(div.querySelector('a[href="#/pareja"]')?.textContent.includes('Datos de la pareja'), true);
});

prueba('ajustes: tamaño de letra con tres opciones que se guardan', () => {
  const { div, almacen } = pintar();
  const grupo = div.querySelector('[role="radiogroup"][aria-label="Tamaño de letra"]');
  verdadero(grupo, 'falta el selector de letra');
  igual([...grupo.querySelectorAll('[data-letra]')].map((b) => b.dataset.letra), ['normal', 'grande', 'muy-grande']);
  igual(grupo.querySelector('[data-letra="normal"]').getAttribute('aria-checked'), 'true');
  grupo.querySelector('[data-letra="muy-grande"]').click();
  igual(leerAjustes(almacen).letra, 'muy-grande');
  igual([...grupo.querySelectorAll('[aria-checked="true"]')].map((b) => b.dataset.letra), ['muy-grande']);
});

prueba('ajustes: sin nada guardado está marcado Vino y dorado (Predeterminado)', () => {
  const { div } = pintar();
  const vino = div.querySelector('.tema-opcion[data-tema="vino"]');
  igual(vino.getAttribute('aria-checked'), 'true');
  verdadero(vino.textContent.includes('Predeterminado'));
  igual(div.querySelector('.tema-opcion[data-tema="grafito"]').getAttribute('aria-checked'), 'false');
});

prueba('ajustes: tocar Grafito cambia el tema al instante', () => {
  const { div, almacen } = pintar();
  div.querySelector('.tema-opcion[data-tema="grafito"]').click();
  igual(leerAjustes(almacen).tema, 'grafito');
  igual(div.querySelector('.tema-opcion[data-tema="grafito"]').getAttribute('aria-checked'), 'true');
  igual(div.querySelector('.tema-opcion[data-tema="vino"]').getAttribute('aria-checked'), 'false');
  igual(document.documentElement.dataset.tema, 'grafito');
  div.querySelector('.tema-opcion[data-tema="vino"]').click();
  igual(document.documentElement.dataset.tema, 'vino');
});

prueba('ajustes: los interruptores cambian el ajuste', () => {
  const { div, almacen } = pintar();
  const sonidos = div.querySelector('.interruptor[data-ajuste="sonidos"]');
  igual([sonidos.getAttribute('role'), sonidos.getAttribute('aria-checked')], ['switch', 'true']);
  sonidos.click();
  igual(sonidos.getAttribute('aria-checked'), 'false');
  igual(leerAjustes(almacen).sonidos, false);
  div.querySelector('.interruptor[data-ajuste="vibracion"]').click();
  igual(leerAjustes(almacen).vibracion, false);
});

prueba('ajustes: sin vibración en el celular se avisa', () => {
  verdadero(!texto(pintar().div).includes('En iPhone no está disponible'));
  verdadero(texto(pintar({ puedeVibrar: false }).div).includes('En iPhone no está disponible'));
});

prueba('ajustes: borrar datos usa la confirmación de siempre', () => {
  const almacen = almacenEnMemoria();
  almacen.escribir('okupa:ajustes', { tema: 'grafito' });
  almacen.escribir('okupa:algo', 1);
  let pregunta = '';
  let recargas = 0;
  let respuesta = false;
  const { div } = pintar({ almacen, confirmar: (t) => { pregunta = t; return respuesta; }, recargar: () => { recargas++; } });
  const borrar = [...div.querySelectorAll('button')].find((b) => b.textContent.includes('Borrar datos de este celular'));
  borrar.click();
  igual(pregunta, '¿Seguro? Se borrará todo lo guardado en este celular, incluidas sus preguntas propias.');
  igual([almacen.claves('okupa:').length, recargas], [2, 0]);
  respuesta = true;
  borrar.click();
  igual([almacen.claves('okupa:').length, recargas], [0, 1]);
});

// Notificaciones falsas: guardan las preferencias como la real y registran las llamadas.
function notifFalsa(almacen, resultado = { ok: true }) {
  const llamadas = [];
  return {
    llamadas,
    async activar() { llamadas.push(['activar']); if (resultado.ok) guardarPreferencias(almacen, { activas: true }); return resultado; },
    async desactivar() { llamadas.push(['desactivar']); guardarPreferencias(almacen, { activas: false }); return { ok: true }; },
    async cambiar(c) { llamadas.push(['cambiar', c]); return guardarPreferencias(almacen, c); },
  };
}
const esperar = () => new Promise((r) => setTimeout(r, 0));
const filaDe = (div, texto) => [...div.querySelectorAll('.fila-ajuste')].find((f) => f.textContent.includes(texto));

prueba('ajustes: notificaciones apagadas muestran solo el interruptor general', () => {
  const almacen = almacenEnMemoria();
  const { div } = pintar({ almacen, notificaciones: notifFalsa(almacen) });
  igual([...div.querySelectorAll('.grupo-ajustes-titulo')].map((h) => h.textContent), ['Tema', 'Letra', 'Foto', 'Sonidos y vibración', 'Notificaciones', 'Copia de seguridad', 'Datos']);
  verdadero(filaDe(div, 'Notificaciones'));
  verdadero(!filaDe(div, 'Recordatorio del Diario') && !div.querySelector('input[type="time"]'));
});

prueba('ajustes: activar con éxito muestra los 4 tipos y la hora 20:00', async () => {
  const almacen = almacenEnMemoria();
  const notif = notifFalsa(almacen);
  const { div } = pintar({ almacen, notificaciones: notif });
  div.querySelector('.interruptor[data-ajuste="notificaciones"]').click();
  await esperar();
  igual(notif.llamadas, [['activar']]);
  for (const t of ['Tu pareja respondió el Diario', 'Invitación a la Trivia', 'Novedades del mapa', 'Recordatorio del Diario', 'Hora del recordatorio']) {
    verdadero(filaDe(div, t), `falta "${t}"`);
  }
  igual(div.querySelector('input[type="time"]').value, '20:00');
  igual(div.querySelector('.interruptor[data-ajuste="notificaciones"]').getAttribute('aria-checked'), 'true');
});

prueba('ajustes: si no se puede activar queda apagado y explica por qué', async () => {
  const casos = {
    'sin-pareja': 'Enlaza tu pareja para recibir avisos',
    'sin-soporte': 'Este navegador no puede recibir notificaciones',
    denegado: 'Las notificaciones están bloqueadas. En Chrome: toca el candado junto a la dirección → Notificaciones → Permitir.',
    'sin-conexion': 'No se pudo activar. Revisa la conexión.',
    'sin-config': 'Notificaciones aún no configuradas.',
    'sin-permiso': 'No diste permiso para las notificaciones. Vuelve a intentarlo y toca Permitir.',
  };
  for (const [motivo, texto] of Object.entries(casos)) {
    const almacen = almacenEnMemoria();
    const { div } = pintar({ almacen, notificaciones: notifFalsa(almacen, { ok: false, motivo }) });
    div.querySelector('.interruptor[data-ajuste="notificaciones"]').click();
    await esperar();
    igual(div.querySelector('.interruptor[data-ajuste="notificaciones"]').getAttribute('aria-checked'), 'false', motivo);
    verdadero(div.textContent.includes(texto), `${motivo}: ${div.querySelector('.ajustes-estado')?.textContent}`);
  }
  const almacen = almacenEnMemoria();
  const { div } = pintar({ almacen, notificaciones: notifFalsa(almacen, { ok: false, motivo: 'sin-pareja' }) });
  div.querySelector('.interruptor[data-ajuste="notificaciones"]').click();
  await esperar();
  verdadero(div.querySelector('.ajustes-estado a[href="#/pareja"]'), 'enlace a enlazar la pareja');
});

prueba('ajustes: apagar un tipo o cambiar la hora guarda el cambio', async () => {
  const almacen = almacenEnMemoria();
  guardarPreferencias(almacen, { activas: true });
  const notif = notifFalsa(almacen);
  const { div } = pintar({ almacen, notificaciones: notif });
  div.querySelector('.interruptor[data-ajuste="aviso-mapa"]').click();
  await esperar();
  const hora = div.querySelector('input[type="time"]');
  hora.value = '21:30';
  hora.dispatchEvent(new Event('change', { bubbles: true }));
  await esperar();
  igual(notif.llamadas, [['cambiar', { avisos: { mapa: false } }], ['cambiar', { hora: '21:30' }]]);
  div.querySelector('.interruptor[data-ajuste="notificaciones"]').click();
  await esperar();
  igual(notif.llamadas.at(-1), ['desactivar']);
  verdadero(!filaDe(div, 'Novedades del mapa'));
});

prueba('acerca: ya no trae "Reiniciar todo"', () => {
  const div = document.createElement('div');
  pantallaAcerca(div, {}, { modulos: [], almacen: almacenEnMemoria(), ir() {}, refrescar() {} });
  verdadero(!div.textContent.includes('Reiniciar todo') && !div.textContent.includes('Empezar de cero'), div.textContent);
});
