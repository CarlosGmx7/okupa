# Okupa · Documento de diseño

Fecha: 2026-11-01 · Estado: pendiente de revisión

## 1. Propósito

Okupa es una app para que una pareja establecida se conozca más a fondo conversando
preguntas introspectivas, controversiales, de fidelidad, de postura personal y de
"¿qué harías si…?". Es el primer módulo de un ecosistema que irá creciendo por partes,
decidiendo cada pieza con el usuario.

Es para uso privado de la pareja (no se distribuye a otras parejas).

**Éxito para la v1:** la pareja la instala en el celular, funciona sin internet, encuentra
siempre una pregunta que vale la pena conversar, y puede adaptarla a su gusto (agregar,
ocultar, armar sesiones) sin tocar código.

## 2. Decisiones de producto

| Tema | Decisión |
|---|---|
| Plataforma | App web instalable (PWA), publicada en GitHub Pages, funciona sin internet |
| Dispositivos | V1: un solo celular compartido. Queda preparada para "cada uno en su celular" |
| Dinámica | Las preguntas se conversan en voz alta; no se escriben ni guardan respuestas |
| Contenido | Sin filtros: incluye sexo, infidelidad, exparejas, temas polémicos |
| Idioma y tono | Español colombiano, tuteo |
| Cantidad | ~300 preguntas en 11 categorías (~25-30 c/u), escritas por Claude, sin revisión previa |
| Fuentes | Visibles de forma discreta en cada carta |
| Seguridad | Sin PIN (no se guarda nada íntimo) |
| Estilo | Íntimo y elegante: oscuro, vino y dorado, serif; formas orgánicas, nada rígido |
| Ícono | Foto de la pareja, enderezada, con viso vino/dorado y forma suave |

## 3. Contenido

### 3.1 Categorías (11)

1. Conocernos de verdad — identidad, infancia, miedos
2. Fidelidad y confianza — qué es infidelidad, perdón, secretos
3. Sexo y deseo — fantasías, frecuencia, límites
4. Celos y límites — amistades, redes, el celular
5. Pasado y exparejas
6. Dinero — cuentas, deudas, prioridades
7. Familia, hijos y suegros
8. Peleas y conflictos — cómo pelea cada uno, reparación
9. Valores y temas polémicos — religión, política, aborto, roles de género
10. Nosotros — qué funciona y qué no en la relación
11. Futuro y sueños

### 3.2 Formatos

- **abierta**: pregunta profunda de conversación libre.
- **corta**: con opciones visibles. Subtipos: `si_no`, `escala` (1–10), `esto_o_aquello` (A o B).
- **dilema**: escenario "¿qué harías si…?".
- **postura**: qué opina cada uno sobre un tema polémico.

Cada pregunta tiene **profundidad** 1 (suave), 2 (profunda) o 3 (intensa).

### 3.3 Fuentes

Las preguntas son redacciones originales inspiradas en estos enfoques (no se copian listas
textuales):

| id | Fuente | Uso principal |
|---|---|---|
| `aron` | Aron, Melinat, Aron, Vallone y Bator (1997), *The experimental generation of interpersonal closeness*, PSPB 23(4) | Conocernos; sesión "Las 36" |
| `gottman` | John Gottman: mapas del amor, sueños dentro del conflicto, reparación (*The Seven Principles for Making Marriage Work*, 1999) | Conocernos, Peleas, Dinero, Nosotros |
| `johnson` | Sue Johnson, terapia focalizada en emociones (*Hold Me Tight*, 2008) | Nosotros, Peleas, Fidelidad |
| `perel` | Esther Perel (*Mating in Captivity*, 2006; *The State of Affairs*, 2017) | Sexo y deseo, Fidelidad |
| `glass` | Shirley Glass (*Not "Just Friends"*, 2003): muros y ventanas | Celos y límites, Fidelidad |
| `rya` | Rogelio Argüello, R&A Psicólogos: preguntas psicológicas para parejas | Varias |
| `nuestra` | Preguntas creadas por la pareja en la app | — |

### 3.4 Sesiones guiadas (incluidas)

| Sesión | Contenido | Duración |
|---|---|---|
| Las 36 (adaptadas de Aron) | 3 bloques de 12, profundidad creciente; cierre: mirarse 4 min a los ojos con temporizador | 45–60 min |
| Mapa del amor | Qué tanto conoces mi mundo hoy (Gottman) | 20 min |
| Lo que nunca hablamos | Fidelidad, celos, pasado | 30 min |
| Noche de deseo | Sexo y deseo (Perel) | 20 min |
| Plata, familia y futuro | Dinero, hijos, suegros, planes | 30 min |

### 3.5 Aviso responsable

En "Acerca de": estos ejercicios no reemplazan terapia y no se recomiendan en relaciones
con violencia o control (advertencia de la literatura de Gottman); si una conversación se
vuelve muy dolorosa, buscar acompañamiento profesional. No interrumpe el juego.

## 4. Pantallas y modos

- **Inicio**: logo, pregunta del día como carta destacada, las tarjetas que aporta cada
  módulo activo (en v1 solo el módulo Preguntas, que aporta: Sesiones guiadas, Categorías,
  Al azar, Mis preguntas) y "Acerca de".
- **Carta**: categoría, texto grande, profundidad (●○○/●●○/●●●), fuente pequeña.
  Deslizar para pasar; botones anterior / saltar. En preguntas cortas se ven las opciones
  y un botón "3, 2, 1… ¡respondan!" para responder al tiempo (no se guarda nada).
- **Categorías**: las 11 (más las propias) con ícono y avance ("8 de 27 vistas"). No es una
  cuadrícula rígida: disposición orgánica, tarjetas con leve inclinación y tamaños variados.
- **Al azar**: mezcla todo, evita las ya vistas; filtro opcional de intensidad máxima.
- **Sesiones guiadas**: lista de sesiones (incluidas + propias); recuerda dónde se quedaron.
- **Pregunta del día**: elegida a partir de la fecha → misma pregunta en cualquier
  dispositivo el mismo día (sirve para el futuro modo de dos celulares).
- **Mis preguntas** (editor dentro de la app):
  - Crear, editar y borrar preguntas propias (categoría, formato, profundidad, texto, opciones).
  - Crear categorías propias (nombre + ícono).
  - Ocultar preguntas incluidas que no les gustan (y restaurarlas).
  - Armar sesiones propias eligiendo y ordenando preguntas.
  - Copia de seguridad: exportar / importar un archivo `.json` (protege contra borrado
    del navegador y permite pasar el contenido a otro celular).
- **Acerca de**: fuentes completas, aviso responsable, reiniciar progreso.

### Qué se guarda en el dispositivo

Preguntas vistas, avance de sesiones, y el contenido propio (preguntas, categorías,
sesiones, ocultas). Nada de respuestas. Todo en `localStorage`, envuelto en try/catch:
si el almacenamiento falla, la app funciona igual sin recordar.

## 5. Diseño visual

- Fondo casi negro con tinte vino, acentos dorados, texto crema.
- Tipografías: serif expresiva para preguntas y títulos (Fraunces) + sans legible para
  interfaz (Inter), ambas con licencia libre (OFL) e incluidas en la app para funcionar
  sin internet.
- Formas orgánicas: esquinas muy redondeadas, cartas apiladas con leve rotación, fondos
  con manchas de color difusas y textura de grano suave. Nada de rejillas rígidas.
- Transiciones suaves entre pantallas y al voltear/deslizar cartas; respeta
  "reducir movimiento" del sistema.
- Diseñada para celular primero; usable en PC.

### Ícono

- Se endereza la foto (viene girada 90°), se encuadran ambas caras, viso vino/dorado sutil
  y borde dorado fino.
- Versiones: 192 px, 512 px, 512 px "maskable" (con margen de seguridad para Android),
  180 px para iPhone, y favicon.
- Limitación honesta: Android e iPhone recortan el ícono instalado con su propia forma
  (círculo o cuadrado redondeado). Dentro de la app el ícono/foto se muestra con forma
  libre (círculo u óvalo suave).
- La foto queda en un repositorio público de GitHub (aceptado por el usuario).

## 6. Arquitectura

Vanilla HTML/CSS/JS con módulos ES, sin paso de compilación ni dependencias.
Los módulos ES no cargan abriendo `index.html` con doble clic (`file://`); se prueba con un
servidor local y se usa publicada en `https://` (igual que Reverso, que ya lo requería).

```
okupa-app/
├── index.html
├── css/
│   ├── base.css            ← tokens de color, tipografía, fondo orgánico
│   └── componentes.css     ← carta, botones, listas, editor
├── js/
│   ├── nucleo/
│   │   ├── app.js          ← arranque, enrutador por hash (#/ruta), registro de módulos
│   │   ├── almacen.js      ← lectura/escritura segura, exportar/importar
│   │   └── ui.js           ← componentes compartidos (carta, deslizar, transiciones, 3-2-1)
│   └── modulos/
│       └── preguntas/
│           ├── modulo.js   ← declara rutas y su acceso en el inicio
│           ├── datos.js    ← une contenido incluido + propio, filtros, pregunta del día
│           ├── progreso.js ← vistas y avance de sesiones
│           ├── pantallas.js← categorías, al azar, sesiones, carta
│           └── editor.js   ← Mis preguntas
├── modulos.json            ← lista de módulos activos (el inicio se arma con esto)
├── data/preguntas/
│   ├── categorias.json
│   ├── preguntas.json
│   ├── sesiones.json
│   └── fuentes.json
├── fuentes-tipograficas/   ← Fraunces, Inter (woff2)
├── iconos/                 ← generados desde la foto
├── sw.js, manifest.webmanifest
├── pruebas.html
└── LEEME.md
```

### 6.1 Módulos (para crecer como ecosistema)

Cada módulo es una carpeta en `js/modulos/<id>/` con un `modulo.js` que exporta:

```js
export default {
  id: 'preguntas',
  nombre: 'Preguntas',
  icono: '…',
  rutas: { 'categorias': pantallaCategorias, 'carta/:id': pantallaCarta, … },
  tarjetaInicio(contenedor) { … }   // lo que aporta a la pantalla de inicio
};
```

`modulos.json` lista los módulos activos. El núcleo los carga con `import()`, registra sus
rutas bajo `#/<id>/…` y pide a cada uno su tarjeta para el inicio. Agregar una sección
nueva del ecosistema = crear su carpeta y añadirla a `modulos.json`, sin tocar los demás.
Cada módulo guarda sus datos bajo su propio prefijo (`okupa:<id>:…`).

### 6.2 Modelo de datos

```json
// categorias.json
{ "id": "fidelidad", "nombre": "Fidelidad y confianza", "icono": "…", "color": "#…" }

// preguntas.json
{ "id": "fid-012", "categoria": "fidelidad", "formato": "dilema",
  "profundidad": 3, "texto": "Si te enteraras…", "fuente": "perel" }
{ "id": "cel-004", "categoria": "celos", "formato": "corta", "subtipo": "esto_o_aquello",
  "opciones": ["Contraseñas compartidas", "Cada uno con su celular privado"],
  "profundidad": 2, "texto": "¿Qué prefieres?", "fuente": "glass" }

// sesiones.json
{ "id": "las-36", "nombre": "Las 36", "descripcion": "…", "minutos": 50,
  "bloques": [ { "nombre": "Bloque I", "preguntas": ["con-001", …] }, … ],
  "cierre": { "tipo": "mirada", "segundos": 240, "texto": "…" } }
```

Contenido propio en `localStorage` bajo `okupa:preguntas:propio` con la misma forma
(`preguntas`, `categorias`, `sesiones`) más `ocultas: [ids]`. Los ids propios llevan
prefijo `n-` para no chocar con los incluidos. `datos.js` une incluido + propio y quita
las ocultas.

Exportar/importar: un archivo `okupa-respaldo-AAAA-MM-DD.json` con todo lo propio y el
progreso; al importar se valida la forma y se pregunta si reemplazar o combinar.

### 6.3 Pregunta del día

Índice = hash estable de la fecha local (AAAA-MM-DD) sobre la lista de preguntas
incluidas de profundidad ≤ 2, ordenada por id. Mismo resultado en cualquier dispositivo
con el mismo contenido.

### 6.4 Sin internet

`sw.js` precachea todos los archivos (código, datos, tipografías, íconos). Versión de
caché `okupa-v1`; al cambiar archivos se sube la versión (documentado en LEEME).

### 6.5 Preparación para dos celulares (no se construye en v1)

Ids estables, contenido propio serializable y pregunta del día determinista. El futuro
módulo de sincronización (p. ej. Supabase) se suma como un módulo más.

## 7. Manejo de errores

- Si falla la carga de un JSON: mensaje amable en pantalla y botón reintentar.
- Si un módulo de `modulos.json` falla al cargar: se omite y el resto sigue funcionando.
- `localStorage` no disponible o lleno: la app funciona sin recordar; el editor avisa que
  no podrá guardar.
- Importación inválida: se rechaza con explicación, sin tocar lo existente.

## 8. Verificación

- `pruebas.html` (corre en el navegador, sin instalar nada):
  - ids únicos; cada pregunta con categoría, formato, profundidad y fuente válidos.
  - preguntas cortas con opciones coherentes con su subtipo.
  - cada categoría con ≥ 20 preguntas; total ≥ 280.
  - sesiones apuntan a preguntas existentes; "Las 36" tiene 3 bloques de 12.
  - pregunta del día determinista; unión incluido + propio respeta ocultas.
  - exportar → importar devuelve el mismo contenido.
- Prueba manual en el navegador integrado con tamaño de celular: navegación, deslizar,
  editor, modo sin internet, instalación.

## 9. Fuera de alcance en v1

Modo de dos celulares, cuentas, notificaciones push, escribir/guardar respuestas, PIN,
otros idiomas, otros módulos del ecosistema.
