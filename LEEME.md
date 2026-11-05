# Okupa · preguntas para conocerse de verdad

App instalable, sin internet, con ~300 preguntas para parejas: introspectivas, de fidelidad,
controversiales, de postura y de "¿qué harías si…?", inspiradas en Aron, Gottman, Sue Johnson,
Esther Perel, Shirley Glass y R&A Psicólogos.

## Qué hay en esta carpeta

| Archivo / carpeta | Para qué sirve |
|---|---|
| `index.html` | La app |
| `css/` | Estilos (oscuro, vino y dorado) |
| `js/nucleo/` | Lo común a todo el ecosistema: navegación, almacenamiento, componentes |
| `js/modulos/preguntas/` | El módulo de preguntas: categorías, al azar, sesiones, Mis preguntas |
| `modulos.json` | Qué módulos están activos |
| `data/preguntas/` | **Las preguntas, categorías, sesiones y fuentes** (lo que más vas a editar) |
| `fuentes-tipograficas/`, `iconos/` | Tipografías e íconos (incluidos para funcionar sin internet) |
| `sw.js`, `manifest.webmanifest` | Permiten instalarla y usarla sin internet |
| `pruebas.html`, `pruebas/` | Pruebas automáticas que corren en el navegador |
| `herramientas/` | Servidor local de pruebas y generador de íconos |
| `js/nucleo/nube*.js`, `js/nucleo/pareja.js` | Conexión con Firebase y enlace de la pareja (lo único que usa internet) |
| `js/modulos/trivia/`, `data/trivia/` | Trivia en vivo y sus bancos de preguntas |
| `js/modulos/diario/`, `data/diario/` | Diario: las 3 preguntas del día, el reto de inglés y el perfil |
| `firebase/` | Reglas de seguridad de Firebase y sus pruebas (no forman parte de la app) |
| `pruebas-nube.html` | Prueba de la conexión real contra los emuladores de Firebase |

## Probarla en el computador

Los navegadores no dejan abrir esta app con doble clic (`file://`). Desde esta carpeta:

```
python herramientas/servidor.py
```

y abre `http://127.0.0.1:8080`. Las pruebas están en `http://127.0.0.1:8080/pruebas.html`
(debe decir **0 fallaron**).

## Publicarla gratis con GitHub Pages

1. En https://github.com: **New repository** → nombre `okupa` → **Public** → **Create repository**.
2. Desde esta carpeta:
   `git remote add origin https://github.com/TU-USUARIO/okupa.git` y luego
   `git push -u origin main`.
3. **Settings → Pages** → *Branch* `main` y `/ (root)` → **Save**.
4. Al minuto queda en `https://TU-USUARIO.github.io/okupa/`.

> El repositorio es público: los íconos (con su foto) quedan visibles en internet.
> La foto original **no** se sube (está en `herramientas/foto-original.jpg`, ignorada por git).

## Conectar Firebase (una vez)

Las secciones para jugar cada uno en su celular (pareja, y luego Trivia y Diario) usan
Firebase, un servicio gratis de Google. Lo demás de Okupa funciona sin él y sin internet.

1. Entra a https://console.firebase.google.com → **Crear un proyecto** → nombre `okupa` →
   sin Google Analytics.
2. **Compilación → Authentication** → Comenzar → Métodos de acceso → **Anónimo** → Habilitar.
3. **Compilación → Firestore Database** → Crear base de datos → ubicación `us-east1` →
   modo producción.
4. **Configuración del proyecto** (⚙️) → Tus apps → **Web** (`</>`) → apodo `okupa` →
   copia el objeto `firebaseConfig`.
5. Pégalo en `js/nucleo/nube-config.js` como valor de `CONFIG_FIREBASE`
   (en vez de `null`).
6. Publica las reglas de seguridad. Desde la carpeta `firebase/`:
   `npm install`, luego `npx firebase login` y
   `npx firebase deploy --only firestore:rules --project <id-del-proyecto>`.
7. Sube la versión de `CACHE` en `sw.js` y publica con `git push`.

> La configuración de Firebase no es secreta: lo que protege sus datos son las reglas del
> paso 6. **No compartan el código de pareja**: quien lo tenga puede entrar en su lugar.

Para probar las reglas en el computador (necesita Node y Java), desde `firebase/`:
`npm run emuladores` en una terminal y `npm run pruebas` en otra.

## Instalarla

- **Android (Chrome):** abre la dirección → menú ⋮ → **Instalar app**.
- **iPhone (Safari):** abre la dirección → **Compartir** → **Añadir a pantalla de inicio**.
- **PC (Chrome o Edge):** ícono de instalar en la barra de direcciones.

Ábrela una vez con internet; después funciona sin conexión.

## Actualizarla

Cada vez que cambies cualquier archivo, sube la versión en `sw.js`
(por ejemplo `okupa-v4` → `okupa-v5`) y vuelve a publicar con `git push`. Los celulares toman la versión nueva la
próxima vez que abran la app con internet.

## Agregar o cambiar preguntas

Edita `data/preguntas/preguntas.json`. Cada pregunta es una línea así:

```json
{ "id": "fid-028", "categoria": "fidelidad", "formato": "dilema", "profundidad": 3, "texto": "Si…, ¿qué harías?", "fuente": "perel" }
```

Reglas (las revisa `pruebas.html`):

- `id`: prefijo de la categoría + número de 3 cifras, sin repetir (`con`, `fid`, `sex`, `cel`,
  `pas`, `din`, `fam`, `pel`, `val`, `nos`, `fut`).
- `categoria`: un id de `categorias.json`.
- `formato`: `abierta`, `corta`, `dilema` o `postura`.
- `profundidad`: 1 (suave), 2 (profunda) o 3 (intensa).
- `fuente`: un id de `fuentes.json` (`okupa` si es una pregunta original).
- Las `corta` llevan además `"subtipo"` (`si_no`, `escala` o `esto_o_aquello`) y
  `"opciones"` con dos textos (en `escala`: qué significa el 1 y qué significa el 10).

Para preguntas solo de ustedes no hace falta tocar archivos: usen **Mis preguntas** dentro de la app.

## Agregar preguntas de trivia

Cada tema tiene su archivo en `data/trivia/` (`arte`, `historia`, `ciencia`, `deportes`,
`canserbero`, `lana`). Matemáticas e inglés no se escriben: se generan (inglés sale de
`data/ingles/vocabulario.json`). Una pregunta se ve así:

```json
{ "id": "art-013", "tema": "arte", "tipo": "vf", "texto": "…", "respuesta": true,
  "dato": "Explicación corta de la respuesta.", "ref": "https://… (fuente donde se verificó)" }
{ "id": "art-014", "tema": "arte", "tipo": "opciones", "texto": "¿…?",
  "opciones": ["A", "B", "C", "D"], "respuesta": 2, "dato": "…", "ref": "https://…" }
```

Reglas (las revisa `pruebas.html`):

- `id`: prefijo del tema (`art`, `his`, `cie`, `dep`, `can`, `lan`) + 3 cifras, sin repetir.
- `vf`: `respuesta` es `true` o `false`; en cada tema, entre 40 y 60 % de los V/F son verdaderos.
- `opciones`: 4 textos distintos y `respuesta` es la posición de la correcta (0 a 3).
- Siempre `dato` y `ref`: cada dato se verifica en una fuente antes de agregarlo.
- Canserbero: su música y trayectoria; nada sobre los detalles de su muerte.

Para el inglés, cada entrada del vocabulario lleva `es`, `en`, `tipo` (`palabra`, `phrasal`,
`expresion` o `falso_amigo`), un `ejemplo` en inglés con el término entre llaves
(`"I finally {gave up} smoking."`) y, en los falsos amigos, la `trampa` (lo que parece pero no es).

## El Diario

Cada día (cambia a medianoche, hora de Colombia) los dos reciben las mismas **3 preguntas**
de gustos, futuro y posturas, y un **reto de inglés** de 3. Cada uno responde en su celular;
lo del otro solo se ve cuando los dos respondieron esa parte (lo garantizan las reglas de
Firebase, no solo la pantalla). En una de las 3, además, cada uno adivina qué respondió el otro.
Los días que queden sin responder aparecen en **Pendientes**; en **Historial** está el
porcentaje de adivinanzas y la racha de días con los dos al día.

Cómo se escogen: el primero que abre el día lo crea para los dos. Salen preguntas que no han
visto, con la intensidad más baja que aceptó alguno de los dos en su perfil, sin los temas que
alguno prefiere evitar, más seguido de los temas que pidieron, menos de los que salieron los dos
días anteriores, de temas distintos y con una para adivinar. Si se acaban, vuelven las que se
vieron hace más tiempo.

Las preguntas están en `data/diario/preguntas.json`. Una pregunta se ve así:

```json
{ "id": "dia-0097", "tema": "dilema", "intensidad": 2, "tipo": "opciones", "adivinar": true,
  "texto": "¿…?", "opciones": [{ "texto": "A", "rasgos": { "aventura": 1 } }, { "texto": "B" }] }
{ "id": "dia-0098", "tema": "gustos", "intensidad": 1, "tipo": "escala",
  "texto": "¿Qué tanto…?", "extremos": ["Nada", "Muchísimo"], "rasgo": { "id": "social", "signo": 1 } }
```

Reglas (las revisa `pruebas.html`):

- `id`: `dia-` + 4 cifras, sin repetir. `tema`: un id de `data/diario/temas.json`.
- `intensidad`: 1 (suave), 2 (media) o 3 (sin filtro).
- `opciones`: de 2 a 4, con textos distintos. `escala`: va de 1 a 10 y lleva sus dos `extremos`.
- `adivinar: true` si tiene sentido que el otro adivine la respuesta.
- `rasgos` (en cada opción) y `rasgo` (en la escala) dicen qué rasgo del perfil mueve la
  respuesta (de −2 a 2; positivo = el extremo `izquierda` de `data/diario/rasgos.json`).
- Nada genérico: cada pregunta debe obligar a escoger y dejar tema para discutir.

## Agregar una sección nueva al ecosistema

1. Crea `js/modulos/<nombre>/modulo.js` que exporte `{ id, nombre, rutas, tarjetasInicio, iniciar?, acerca? }`
   (mira `js/modulos/preguntas/modulo.js` como ejemplo).
2. Agrega `"<nombre>"` a `modulos.json`.
3. Agrega sus archivos a la lista `PRECACHE` de `sw.js` y sube la versión.

Los módulos guardan sus datos con el prefijo `okupa:<nombre>:`, así no se pisan entre sí.

## Regenerar los íconos

```
python -m pip install --user pillow
python herramientas/generar_iconos.py herramientas/foto-original.jpg iconos
```
