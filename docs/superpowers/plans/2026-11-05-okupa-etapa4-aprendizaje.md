# Okupa · Etapa 4: El perfil que aprende · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que Okupa aprenda de las respuestas reveladas del diario (rasgos y favoritos, sin IA), que eso mejore las preguntas del día (más debate, plantillas con sus gustos, seguimientos) y que alimente la trivia con "¿Cuánto me conoces?".

**Architecture:** Lógica pura en `js/modulos/diario/aprender.js` (aportes a rasgos, favoritos, requisitos, plantillas, descripción en palabras). `seleccion.js` la usa para puntuar y filtrar. `dia.js` agrega `aprenderDia` (transacción sobre el perfil propio). La pantalla nueva `#/diario/sabe` muestra y corrige lo aprendido. La trivia arma "¿Cuánto me conoces?" en `js/modulos/trivia/conoces.js` con las respuestas ya reveladas que cada perfil guarda.

**Spec:** `docs/superpowers/specs/2026-11-04-okupa-trivia-diario-design.md` (secciones 4.2 "¿Cuánto me conoces?", 4.3 "Lo que Okupa sabe de mí", 5, 6.4 y etapa 4 de la 10).

## Global Constraints

- Las de las etapas anteriores (sin compilación, `el()`, tuteo, commits con `-F`, suite en "0 fallaron").
- **Se aprende al revelar**, nunca al responder: cada celular actualiza solo el perfil de su dueño la primera vez que ve revelados los gustos de un día, y anota la fecha en `aprendidos`.
- **Perfil** (`parejas/{c}/perfiles/{lugar}`) agrega: `rasgos: { [id]: { suma, n } }`, `respuestas: { [idPregunta]: opcion|valor }` (solo reveladas, máximo las 500 más recientes), `aprendidos: [fechas]` (máximo 400), `favoritos: { artistas, canciones, pelis }` (agregados a mano), `quitados: { artistas, canciones, pelis }`, `correcciones: { [rasgo]: 'izquierda'|'medio'|'derecha'|'oculto' }`.
- **Aporte**: opción → sus `rasgos`; escala → `signo × (valor − 5,5) / 2,25` (entre −2 y 2).
- **Un rasgo se muestra** solo con `n ≥ 3`. Promedio > 0,5 → extremo izquierdo; < −0,5 → derecho; si no, "en el medio". Las correcciones mandan.
- **Requisitos** (`requiere` en una pregunta del diario): `{ rasgo: { id, lado: 'izquierda'|'derecha' } }` (alguno de los dos está en ese lado), `{ favorito: 'artistas'|'canciones'|'pelis' }` (los dos tienen al menos uno), `{ respuesta: { pregunta, opciones: [..] } }` (alguno respondió una de esas opciones).
- **Plantillas**: `texto` y opciones pueden traer `{nombre_otro}`, `{artista_fav_otro}`, `{artista_fav_mio}`, `{cancion_otro}`, `{peli_otro}`; se resuelven al pintar, para cada uno desde su lado. Solo es elegible si se puede resolver para los dos.
- **Selección**: +1 si la pregunta tiene `requiere` y se cumple; +1 si toca un rasgo en el que los dos están en lados opuestos.
- **"¿Cuánto me conoces?"**: máximo 2 por partida, solo si cada uno tiene ≥ 5 días aprendidos y respuestas suficientes; cada uno recibe una pregunta distinta sobre el otro, con las opciones de la pregunta original (escala → rangos "1–3", "4–5", "6–7", "8–10").
- Caché `okupa-v7` con los archivos nuevos.

## Tasks

1. **`aprender.js` puro** — `aporteDe`, `aprenderDeDia(perfil, dia, items, porId, fecha)`, `valorRasgo`, `describirRasgos(perfil, rasgos)`, `favoritosDe(perfil)`, `cumpleRequiere(pregunta, perfiles)`, `resolverPlantilla(pregunta, { yo, nombres, perfiles })`. Pruebas: aprender solo una vez por fecha; umbral de 3; correcciones; favoritos con agregados y quitados; requisitos de los tres tipos; plantilla sin datos → null. Commit `El perfil aprende de las respuestas reveladas`.
2. **Selección y contenido** — `elegirDia` usa requisitos, plantillas y debate. Contenido: ≥ 8 plantillas y ≥ 8 seguimientos en `preguntas.json` (validados). Pruebas: un seguimiento solo sale con su requisito; la plantilla sin datos no sale; el debate sube la frecuencia. Commit `Plantillas, seguimientos y debate en la selección del diario`.
3. **Aprender en la nube y en pantalla** — `aprenderDia(nube, pareja, fecha, dia, propia, porId)` en transacción; Hoy aprende al revelar, el historial aprende lo que falte; las plantillas se pintan resueltas para cada uno. Pruebas: revelar aprende una vez; abrir el historial aprende los días pendientes; la plantilla muestra el artista del otro. Commit `El diario aprende al revelar`.
4. **"Lo que Okupa sabe de mí"** — `#/diario/sabe`: rasgos visibles en palabras, favoritos; corregir (izquierda/medio/derecha), ocultar, quitar y agregar favoritos; ver lo del otro (solo lectura). Pruebas: corregir y ocultar se guardan; agregar y quitar favoritos; lo del otro no tiene botones. Commit `Lo que Okupa sabe de mí`.
5. **"¿Cuánto me conoces?"** — `conoces.js`: `preguntasConoces({ perfiles, preguntas, nombres, rnd })`, `insertarConoces(partida, conoces, rnd)`; la sala las agrega al crear la partida. Pruebas: sin 5 días no hay; cada uno recibe una sobre el otro con la respuesta correcta; escala en rangos; la partida queda con 10 preguntas. Commit `¿Cuánto me conoces? en la trivia`.
6. **Caché, guía y verificación** — `okupa-v7`, LEEME (requisitos y plantillas), suite, reglas y prueba con emuladores. Commit `Caché okupa-v7 y guía del perfil que aprende`.
