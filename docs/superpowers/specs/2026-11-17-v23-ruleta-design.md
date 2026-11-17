# Okupa v23 — Ruleta de citas (diseño)

Fecha: 2026-11-17. Rama `v23-ruleta`, worktree `../okupa-v23`.

## Intención

Carlos y su pareja a veces no saben qué hacer juntos. La Ruleta decide por ellos **rápido**: eligen presupuesto y si se quedan en casa o salen, giran, y sale un plan concreto. La usan en un solo celular, en el momento; no es para planear con calma (para eso está Match).

**Éxito:** abrir la Ruleta y tener un plan que les provoque hacer en menos de 10 segundos, y que en una semana de uso casi no se repitan planes.

## Metas

- Modo nuevo «Ruleta» con dos selectores y un botón «Girar».
- Presupuesto: **Sin plata**, **Algo medio**, **Darnos un gusto**.
- Lugar: **En casa**, **Salir**.
- Un banco propio de planes concretos y nada genéricos, unos 40 por combinación (6 combinaciones, ~240 planes).
- «Girar otra vez» sin límite; en la misma racha no se repite un plan ya mostrado.

## No metas

- Nada de votos, salas ni esperar al otro celular.
- No usa la nube: ni Firestore, ni avisos, ni lugares del Mapa, ni planes de Match (Carlos eligió el enfoque A).
- No guarda historial de citas hechas ni calificaciones.
- No permite agregar planes propios en esta versión.

## Anti-metas (sería un fracaso aunque funcione)

- Planes genéricos tipo «vean una película» o «salgan a comer». Cada plan dice qué hacer de forma concreta («Cocinen arepas rellenas con lo que haya en la nevera y califíquense como en un reality»).
- Que tarde: animación larga, pantallas intermedias o carga desde internet.
- Que «Algo medio» signifique cosas distintas para cada uno.

## Restricciones

- HTML/CSS/JS con módulos ES, sin compilación; módulo en `js/modulos/ruleta/`, registrado en `modulos.json`; datos en `data/ruleta/planes.json`. Debe funcionar sin internet (archivos en `PRECACHE`).
- Español colombiano con tuteo; nodos con `el()`; letras en rem; sin `--acento`. Respetar `prefers-reduced-motion`.
- Subir `CACHE` a `okupa-v23`; archivos nuevos en `PRECACHE` y `pruebas/pwa.prueba.js`; pruebas nuevas en `pruebas.html`.
- No se publica sin el visto bueno de Carlos.

## Enfoques considerados

- **A. Modo propio solo con su banco de planes** — 0 lecturas, sin internet, lo más rápido; los planes son de la app. **Elegido por Carlos.**
- B. A más lugares del Mapa al «Salir» — más personal, pero cuesta lecturas, necesita red y no se sabe el presupuesto del lugar.
- C. Botón dentro de Match — descartado: Match es votar con calma entre los dos; la Ruleta es decidir al instante.

## Lo decidido con Carlos

- Para cuando no saben qué hacer; que decida rápido; en un solo celular.
- Selector de presupuesto (3) y selector **En casa / Salir** (los dos casos les pasan).
- Enfoque A.

## Decisiones mías (Carlos puede corregirlas)

- **Cifras del presupuesto**, para que signifique lo mismo para los dos (pesos colombianos, para los dos juntos): Sin plata = $0 (o lo que ya hay en la casa); Algo medio = hasta unos $80.000; Darnos un gusto = más de $80.000. Se muestran como ayuda bajo el selector.
- **Pantalla:** un solo paso. Arriba dos filas de botones tipo píldora (presupuesto y lugar, recordando la última elección en el celular), en el centro la ruleta, abajo «Girar». Al caer, el plan aparece grande con un emoji/ícono de su tipo y dos botones: «Girar otra vez» y «¡Hagámoslo!». «¡Hagámoslo!» solo cierra con un mensaje corto («¡Disfruten!»); no guarda nada.
- **Animación:** giro de ~1,2 s que desacelera; sin animación con movimiento reducido (sale el plan directo).
- **Racha:** los planes mostrados se recuerdan por combinación mientras la pantalla está abierta (en memoria); al acabarse la combinación, se baraja de nuevo.
- **Ubicación en el inicio:** sección «Nosotros», después de Cápsula. Ícono `◎`. Sin aviso bajo el modo (como Match y Cápsula).
- **Contenido:** planes originales, en tuteo colombiano, aplicables en cualquier ciudad de Colombia, sin marcas ni nombres de lugares, 20 a 160 caracteres, imperativo en plural («Hagan…», «Vayan…»). Mezcla de tipos: cocinar, juego, conversación, aire libre, cultura, aventura, romántico, picante suave. Ninguno explícito. Los de «Salir · Sin plata» son gratis de verdad (parques, caminatas, eventos gratis, miradores). Formato: `{ id, presupuesto: 'nulo'|'medio'|'grande', lugar: 'casa'|'salir', texto, tipo }`, ids `cas-nul-001`, `sal-gra-040`, etc.

- **Funciona sin pareja enlazada** (no usa la nube). La última elección se guarda con `ctx.almacen` (almacenamiento local del celular), clave `okupa:ruleta`.
- **Primera vez:** arranca en «Algo medio» + «Salir», con «Girar» listo; nunca hay un estado sin elegir.
- **La ruleta es decorativa:** gira mostrando los íconos de los tipos de plan (no 40 rebanadas con texto, que serían ilegibles) y al detenerse aparece el plan.
- **«En casa · Darnos un gusto»** puede incluir pedir a domicilio algo especial, comprar ingredientes caros o un kit de experiencia; siempre sin marcas.
- **Trato:** a la pareja se le habla en plural («Hagan…», «Cocinen…»), que es como se le habla a dos en Colombia; el resto de la app sigue en tuteo.
- **Orden en «Nosotros»:** el siguiente número libre después de Cápsula.
- **El banco de planes va en su propia tarea y su propio commit**, para que Carlos pueda leerlo y pedir cambios antes de publicar.

## Lo que queda para quien construye

- Diseño visual exacto de la ruleta dentro del estilo de la app (temas claro/oscuro existentes).
- Lista de `tipo` y su ícono.
- Pruebas: elección sin repetir dentro de la racha, rebarajar al agotarse, recordar la última elección, banco válido (6 combinaciones, ≥40 cada una, ids únicos, longitudes, sin duplicados de texto), registro del módulo y caché.
