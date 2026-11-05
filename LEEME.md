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
