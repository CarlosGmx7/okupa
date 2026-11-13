# Ajustes, tema Grafito, animaciones y sonidos (v16) — diseño

Fecha: 2026-11-13. Entrega: v16 (caché `okupa-v16`). Las notificaciones quedan para la v17 (resumen al final).

## Intención

Carlos quiere que Okupa se sienta como una app terminada: botones que respondan con fluidez al tocarlos,
un menú de Ajustes como el de cualquier app y la opción de elegir entre el diseño actual (vino/dorado)
y uno nuevo, limpio y oscuro. El tema actual se conserva tal cual.

## Metas

1. Animación de "resorte suave" igual en todo lo que se toca: se hunde al presionar y vuelve con un pequeño rebote al soltar.
2. Pantalla `#/ajustes` con: Tema, Foto de inicio, Sonidos y vibración, Borrar datos.
3. Segundo tema, **Grafito y rosa**, elegible en Ajustes; cada celular guarda su elección.
4. Sonidos suaves en momentos importantes y vibración corta al tocar botones, ambos apagables.

## No metas (v16)

- Notificaciones (van en la v17).
- Rediseñar pantallas o cambiar textos/contenido. El tema nuevo cambia colores, letra, radios, fondo e íconos, no la estructura.
- Sincronizar ajustes entre los dos celulares: son de cada celular.

## Anti-metas (fallaría aunque "funcione")

- Que el tema vino/dorado cambie en algo visible (salvo el engranaje nuevo y la animación unificada).
- Un destello del tema equivocado al abrir la app.
- Texto o botones con contraste menor a 4,5:1 en el tema Grafito.
- Animaciones que se sientan lentas: la presión debe responder ya (≤ 100 ms).
- Que algo deje de funcionar sin internet.

## Restricciones

- HTML/CSS/JS con módulos ES, sin compilación ni librerías nuevas; todo local (sin internet).
- Español colombiano con tuteo.
- Respetar `prefers-reduced-motion` (ya hay una regla global en `css/base.css`).
- Cada archivo nuevo va a `PRECACHE` en `sw.js` y a `pruebas/pwa.prueba.js`; `CACHE` pasa a `okupa-v16`.
- Usar `el()` de `js/nucleo/ui.js` para crear nodos (el `append()` nativo convierte listas y `null` en texto).
- `pruebas.html` debe seguir en "0 fallaron" y sumar pruebas de lo nuevo.

## Enfoques considerados

- **Tema por atributo + variables CSS (elegido):** `<html data-tema="grafito">` redefine las variables de `:root`. Los colores ya salen de `css/base.css` (192 usos en `componentes.css`), así que es el camino barato y sin riesgo para el tema actual.
- **Hoja de estilos aparte por tema:** se descarta; duplica reglas y el cambio de tema exige recargar la hoja (destello).
- **Clases por componente (`.boton--grafito`):** se descarta; toca cientos de reglas.

Para el recordatorio de la v17, Carlos eligió GitHub Actions + Firebase Cloud Messaging (gratis, hora elegida con ±15 min) en lugar de Periodic Background Sync (sin hora fija, solo Android).

## Decisiones de Carlos

- Ajustes: notificaciones (v17), cambiar foto, tema, sonidos, borrar datos.
- Acceso a Ajustes: **engranaje arriba** en el inicio.
- Animación: **resorte suave** (estilo iPhone).
- Sonidos: **solo momentos importantes + vibración corta** al tocar; apagables.
- Tema nuevo: paleta **Grafito y rosa**, **solo Inter**, **íconos de línea** en lugar de los glifos/emojis (el tema vino conserva los suyos).
- Avisos de pareja: versión gratis; con GitHub Actions llegarán también con la app cerrada (v17).
- Dos entregas: v16 (esto) y v17 (notificaciones).

## Diseño

### 1. Ajustes guardados (`js/nucleo/ajustes.js`)

- Una sola clave en el almacén del celular: `okupa:ajustes` → `{ tema: 'vino' | 'grafito', sonidos: boolean, vibracion: boolean }`.
- Valores por defecto: `{ tema: 'vino', sonidos: true, vibracion: true }`. Valores inválidos o ausentes vuelven al defecto (no romper con datos viejos).
- API: `leerAjustes(almacen)`, `cambiarAjuste(almacen, clave, valor)`, y un evento/aviso para que tema, sonidos y vibración reaccionen al instante sin recargar.
- "Reiniciar todo" borra `okupa:*`, así que también vuelve el tema a vino. Es lo esperado.

### 2. Tema

- `document.documentElement.dataset.tema` = `vino` | `grafito`. Vino es el `:root` actual, sin cambios.
- **Sin destello:** un script en línea en `index.html` (ya hay `<script>` en las líneas 18 y 32) lee `localStorage['okupa:ajustes']` antes de pintar y pone `data-tema` y el `<meta name="theme-color">`. Debe tolerar JSON roto y respetar el mismo formato que usa `almacen.js` al guardar (revisar si serializa con JSON).
- `theme-color`: vino `#140a0e`, grafito `#0E0E11`. El color del `manifest` queda en vino (no se puede cambiar en vivo).
- Variables de **Grafito y rosa** (`[data-tema="grafito"]` en `css/base.css`):

  | Papel | Valor |
  |---|---|
  | Fondo | `#0E0E11` |
  | Tarjeta (`--superficie`) | `#18181C` |
  | Tarjeta alta (`--superficie-alta`) | `#232329` |
  | Texto (`--crema`) | `#F4F4F5` |
  | Texto tenue (`--tenue`) | `#A1A1AA` |
  | Acento | `#F472B6` (rosa) |
  | Texto sobre acento | `#1A0B12` (casi negro; el blanco sobre ese rosa no llega a 4,5:1) |
  | Borde fino | `rgba(255,255,255,.08)` |
  | Peligro | `#F87171` |

- Las variables actuales tienen nombres de color (`--vino`, `--dorado`…) y se usan con papeles distintos (fondo de botón, borde, texto de acento). El constructor debe recorrer `componentes.css` y, donde haga falta, introducir variables por papel (`--acento`, `--sobre-acento`, `--borde`, `--peligro`…) que en el tema vino valgan **exactamente** lo que hoy, para que vino no cambie. Comprobar contraste ≥ 4,5:1 (texto) y ≥ 3:1 (bordes de controles) en Grafito.
- Grafito: `--serif` apunta a Inter (títulos con peso 600 y `letter-spacing: -0.02em`), radios `--radio: 20px` y `--radio-chico: 14px`, sin manchas de color ni grano (`body::before/::after` ocultos), sombras mínimas.
- Fotos y mapa: el mapa Liberty no cambia. Los pines usan los íconos del tema.

### 3. Íconos de línea (`js/nucleo/iconos.js`)

- Juego pequeño de SVG en línea (trazo 1,75 px, `currentColor`, 24×24, estilo Lucide; incluir aviso de licencia ISC en el archivo).
- Función `icono(glifo)` que devuelve un `<span>` con **ambos**: el glifo actual (`.ico-glifo`) y el SVG (`.ico-linea`). El CSS muestra uno u otro según el tema. Así cambiar de tema no exige repintar.
- Mapeo mínimo (los que existen hoy): `∞` pareja, `☼` diario, `⌖` mapa, `♥` match/recuerdo, `★` deseo, `✦` genérico, `♡` citas, `✈` viajes, `☀` finde, `✎` aprender, `ϟ` retos, `❦` intimidad, y el engranaje de Ajustes. Glifo sin mapeo → se muestra el glifo en ambos temas.
- Reemplazar en: `inicio.js` (juntos y accesos), `ui.js` (carta-icono), `modulos/match/` (mazos, carta, match), `modulos/mapa/lugares-ui.js` (tipo y pines), chip de tema de preguntas. Emojis de texto en frases (📲 en instalar) se dejan.

### 4. Animación "resorte suave"

- Tokens en `:root`: `--presion: scale(.96)`, duración de presión `90ms ease-out`, regreso `420ms` con curva de resorte usando `linear()` (rebote ~4 %) y como respaldo `cubic-bezier(.34, 1.56, .64, 1)` con `@supports`.
- Al presionar se aplica rápido; al soltar, la transición de regreso usa el resorte (la transición se define distinta en `:active` y en reposo).
- Una sola regla para todo lo tocable: `.boton`, `.acceso`, `.juntos`, `.juntos-acceso`, `.opcion-juego`, `.opcion-diario`, `.punto-escala`, `.chip`, `.burbuja`, `.voto`, engranaje, filas de Ajustes, y `button` en general salvo los que ya tienen animación propia (la carta del Match al arrastrar no se toca). Quitar las transiciones de `transform` dispersas para que no peleen.
- iOS: `:active` necesita un `touchstart` pasivo registrado en `document`.
- Solo `transform` y `opacity` (nada de ancho/alto). Con movimiento reducido: sin escala, solo un leve cambio de opacidad.

### 5. Sonidos y vibración (`js/nucleo/sonidos.js`)

- Sonidos sintetizados con Web Audio (sin archivos de audio: pesan cero y funcionan sin internet). Volumen bajo, ≤ 400 ms:
  - `match`: dos notas ascendentes cálidas.
  - `acierto` (Trivia): una nota corta brillante.
  - `guardado` (Diario guardado, lugar guardado): un tic suave.
- `sonar(nombre)` respeta el ajuste `sonidos`; el `AudioContext` se crea o reanuda en el primer toque (los navegadores bloquean el audio antes).
- Vibración: `navigator.vibrate(8)` al presionar los elementos de la regla de resorte (delegado en `pointerdown` sobre `document`), si el ajuste `vibracion` está activo y el navegador lo soporta. iPhone lo ignora sin error. En Ajustes, el interruptor de vibración muestra la nota "En iPhone no está disponible" cuando `navigator.vibrate` no existe.
- El constructor ubica dónde se confirma un match, un acierto de Trivia y un guardado del Diario/lugar, y llama `sonar()` ahí.

### 6. Pantalla de Ajustes (`#/ajustes`, `js/nucleo/pantalla-ajustes.js`)

- Engranaje: botón de 44×44 en la esquina superior derecha del inicio, `aria-label="Ajustes"`, ícono SVG en ambos temas, respetando el área segura de arriba.
- Diseño de lista agrupada (como iOS/Android), con "← Inicio" y título "Ajustes":

```
← Inicio
Ajustes

TEMA
┌───────────────────────────────┐
│ [vista Vino ✓]  [vista Grafito]│  ← dos tarjetas con miniatura de colores; toque = cambia al instante
│  Predeterminado                │  ← Vino y dorado es el predeterminado
└───────────────────────────────┘

FOTO
┌───────────────────────────────┐
│ (foto) Foto de inicio        › │  ← abre el editor actual (abrirEditorPortada)
└───────────────────────────────┘

SONIDOS Y VIBRACIÓN
┌───────────────────────────────┐
│ Sonidos                  [●══] │
│ Vibración al tocar       [●══] │
└───────────────────────────────┘

DATOS
┌───────────────────────────────┐
│ Datos de la pareja           › │  ← va a #/pareja (ahí está "Borrar nuestros datos")
│ Borrar datos de este celular   │  ← rojo; mismo confirm y efecto que "Reiniciar todo"
└───────────────────────────────┘

Acerca de Okupa ›
```

- Interruptores accesibles (`role="switch"`, `aria-checked`, toda la fila tocable, ≥ 44 px de alto).
- "Reiniciar todo" sale de "Acerca de" y queda en Ajustes como "Borrar datos de este celular" (mismo texto de confirmación). "Acerca de" se queda con su información.
- Tocar la foto del inicio sigue abriendo el editor directamente.
- El lápiz sobre la foto de inicio (`.inicio-portada-boton::after`) se achica para que se vea más la foto: de 26 px a 20 px, glifo de 13 px a 10 px, un poco más hacia el borde. Aplica en los dos temas (pedido de Carlos). El área tocable no cambia: es toda la foto.
- En la v16 no aparece la fila de Notificaciones (nada de "Próximamente").
- La ruta se registra en `js/nucleo/app.js` junto a las del núcleo.

### 7. Pruebas (`pruebas/`)

- Ajustes: defectos, valores inválidos, guardar/leer.
- Tema: aplicar pone `data-tema` y `theme-color`; el script en línea tolera JSON roto.
- Íconos: cada glifo mapeado da un SVG; glifo desconocido se mantiene.
- Sonidos: no suena con el ajuste apagado; no falla sin `AudioContext`.
- Pantalla de Ajustes: se pinta, los interruptores cambian el ajuste, el tema cambia sin recargar.
- `pwa.prueba.js`: archivos nuevos en `PRECACHE`.
- Verificación visual en el navegador del panel, ambos temas, a 375 px de ancho.

## Queda a criterio del constructor

- Nombres finales de las variables por papel y cuántas hacen falta.
- Trazos exactos de los SVG y las notas exactas de los sonidos (siempre suaves y cortos).
- Diseño fino de las tarjetas de vista previa del tema.

## v17 — notificaciones (resumen, se diseña aparte)

- Firebase Cloud Messaging (gratis, sin plan Blaze) para recibir avisos con la app cerrada (iPhone: solo instalada, iOS 16.4+).
- Cada celular guarda en Firestore su token, si quiere el recordatorio del Diario, la hora y su zona horaria.
- GitHub Actions cada 15 min (gratis, repo público) con una cuenta de servicio guardada como secreto: manda los recordatorios de la hora y los avisos de lo que hizo la pareja.
- Requiere cambiar las reglas de Firestore (Carlos las pega en la consola) y que Carlos cree la llave de la cuenta de servicio y la guarde en GitHub (con guía paso a paso).
- En Ajustes aparecerá la sección Notificaciones.
