import { prueba, igual, verdadero } from './corredor.js';

async function hoja(ruta) {
  const h = new CSSStyleSheet();
  h.replaceSync(await (await fetch(ruta, { cache: 'no-store' })).text());
  return h;
}

prueba('estilos: cada regla con color-mix() tiene respaldo para navegadores sin él', async () => {
  const h = await hoja('css/componentes.css');
  const conMezcla = [...h.cssRules]
    .filter((r) => r instanceof CSSStyleRule && r.cssText.includes('color-mix('))
    .map((r) => r.selectorText);
  verdadero(conMezcla.length > 0, 'no se encontró color-mix');
  const respaldo = [...h.cssRules].find((r) => r instanceof CSSSupportsRule &&
    r.conditionText.includes('not') && r.conditionText.includes('color-mix'));
  verdadero(respaldo, 'falta @supports not (… color-mix …)');
  const cubiertos = [...respaldo.cssRules].filter((r) => !r.cssText.includes('color-mix(')).map((r) => r.selectorText);
  igual(conMezcla.filter((s) => !cubiertos.includes(s)), []);
});

prueba('estilos: la carta no se selecciona tampoco en Safari viejo', async () => {
  const texto = await (await fetch('css/componentes.css', { cache: 'no-store' })).text();
  const carta = texto.match(/\n\.carta \{[^}]*\}/)?.[0] || '';
  verdadero(carta.includes('-webkit-user-select: none'), carta);
});

prueba('estilos: ningún font-size en px', async () => {
  for (const ruta of ['css/base.css', 'css/componentes.css']) {
    const texto = await (await fetch(ruta, { cache: 'no-store' })).text();
    igual(texto.match(/font-size:[^;}]*px/g) || [], [], ruta);
    // El ancho de pantalla también escala con la letra elegida.
    igual((texto.match(/font-size:[^;}]*vw[^;}]*/g) || []).filter((d) => !d.includes('var(--escala-letra)')), [], ruta);
  }
});

prueba('estilos: tamaños de letra por data-letra', async () => {
  const texto = await (await fetch('css/base.css', { cache: 'no-store' })).text();
  verdadero(/:root\[data-letra="grande"\]\s*\{\s*font-size:\s*112\.5%;/.test(texto), 'falta la regla de letra grande');
  verdadero(/:root\[data-letra="muy-grande"\]\s*\{\s*font-size:\s*125%;/.test(texto), 'falta la regla de letra muy grande');
  verdadero(/--escala-letra:\s*1;/.test(texto) && /--escala-letra:\s*1\.125;/.test(texto) && /--escala-letra:\s*1\.25;/.test(texto), 'falta --escala-letra');
});