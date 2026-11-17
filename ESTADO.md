# Estado de Okupa — 2026-11-16
## Objetivo
App para parejas (PWA y APK Android): Preguntas, Trivia, ¿Quién es más probable?, Diario, Match, Mapa, Fechas, Cápsula y Ajustes. Publicada en https://carlosgmx7.github.io/okupa/ (repo CarlosGmx7/okupa, rama `main`). Meta: que aguante muchas parejas y, más adelante, grupos de 3 o más.
## Decisiones tomadas
- HTML/CSS/JS con módulos ES, sin compilación; los módulos activos están en `modulos.json`. Así se publica fácil en GitHub Pages.
- Español colombiano con tuteo. A Carlos se le pregunta con opciones (AskUserQuestion) y con espacio para "otra cosa".
- Firebase gratis (Firestore, acceso anónimo y FCM), sin Blaze, porque a Carlos le falla el método de pago. La privacidad la garantizan las reglas, no la pantalla.
- Notificaciones: notas en `parejas/{c}/avisos`; GitHub Actions (`servidor/notificaciones/`) las manda cada 15 min, "a todos menos quien lo hizo".
- Cada versión va en su rama y worktree (`../okupa-vNN`). No se hace push sin que Carlos lo apruebe. Se reparte entre modelos con /repartir: Sonnet construye y revisa; el diseño y la publicación se hacen aquí.
- Inicio: tres interfaces en Ajustes → «Interfaz del inicio».
  - Moderna (por defecto): 3 tarjetas. El panel de Jugar y Conocernos se abre entre la fila de arriba y Nosotros; el de Nosotros, debajo de Nosotros.
  - Simple: secciones con filas.
  - Clásica: el bloque «Nuestra pareja» con botones redondos más las tarjetas de Preguntas.
- Avisos bajo cada modo solo cuando importan:
  - Fechas: si falta 14 días o menos.
  - Diario: si te toca.
  - Trivia y Probable: «te está esperando», que caduca a los 30 min.
  - Match y Cápsula: nunca.
- APK: TWA con Bubblewrap. Se reparte gratis por GitHub Releases, sin Play. Identificador `io.github.carlosgmx7.okupa`, minSdk 24.
## Estado actual
- Funciona y está publicado: v21b. Pages sirve `sw.js` = `okupa-v21b`. Carlos ya pegó en Firebase las reglas de v21.
- APK 1.0.0 construida y firmada: `okupa-apk/Okupa-1.0.0.apk`. `assetlinks.json` está publicado en el repo `carlosgmx7.github.io` (`.well-known/`, con `.nojekyll`) y Google lo verifica.
- A medias, todo en manos de Carlos:
  - subir la APK a Releases (tag `v1.0.0`);
  - guardar `android.keystore` en Drive;
  - probar en los dos celulares una ronda de ¿Quién es más probable?, un aviso de las 8:00 y una carta.
- El hosts de Windows quedó sin el bloqueo de dl.google.com, tools.google.com y update.googleapis.com; Carlos decidió dejarlo así.
- Límite conocido (v22): con el código, alguien puede «reclamar» el lugar del otro y leer lo de ese lugar (cartas, «no» del Match, Diario). Está dicho en la política. Vigilar Firebase gratis: 50k lecturas y 20k escrituras al día, 1 GB.
## Archivos clave
- `js/nucleo/inicio.js`: las 3 interfaces del inicio.
- `js/nucleo/ajustes.js`: la clave `inicio`.
- `js/nucleo/esperando.js` y `js/nucleo/precalentar.js`: el aviso «te está esperando» y el repintado del inicio.
- `js/modulos/<modo>/` y `data/`: cada modo. El juego está en `probable/` y `data/probable/frases.json`.
- `firebase/firestore.rules` + `firebase/pruebas/`: reglas y sus pruebas con emulador.
- `servidor/notificaciones/`: el envío de avisos.
- `sw.js`: `CACHE` y `PRECACHE`.
- `privacidad.html`.
- `docs/superpowers/specs|plans/`: diseño y plan de cada versión.
- `../okupa-apk/`: el proyecto de la APK. Lleva `twa-manifest.json`, `construir.ps1` (lo corre Carlos) y `android.keystore`, que nunca va a git.
- `C:\bubblewrap\`: JDK 17, el SDK de Android (cmdline-tools en `tools\`) y la CLI de Bubblewrap.
## Próximo paso
Construir la v22 de Seguridad siguiendo `docs/superpowers/plans/2026-11-16-v22-seguridad.md` (diseño aprobado por Carlos en `docs/superpowers/specs/2026-11-16-v22-seguridad-design.md`), en la rama `v22-seguridad`, worktree `../okupa-v22` (ya creado, con uniones de `node_modules` y `correr-una.html`). Empezar por la Task 1 (reglas). Carlos aceptó: solo el celular viejo aprueba, 7 días sin él, freno de 24 h tras un rechazo, App Check exigido de una vez.
Después, cada uno con su brainstorming: guardar el resumen de una ronda en el celular y mostrar si el otro también lo guardó; aviso «ya aceptaron tu juego» (los avisos salen cada 15 min y la sala caduca a los 30); subir cada tema de ¿Quién es más probable? de 31 a 200 frases no genéricas, investigando en Reddit y redes; modo «Ruleta de citas» con presupuesto (nulo, medio, grande). Pendiente de Carlos: el aviso «hay una APK nueva».
## Cómo verificar
- App: desde la carpeta de la rama, `python herramientas/servidor.py <puerto>`. Luego abrir http://127.0.0.1:<puerto>/pruebas.html, que debe decir "0 fallaron" (625 pruebas).
- Reglas: en `firebase/`, correr `node emuladores.mjs exec "node --test pruebas/ ../servidor/notificaciones/pasada.test.mjs ../servidor/notificaciones/logica.test.mjs"` (136 pruebas) y después cerrar el java del puerto 8085.
- Publicado: `https://carlosgmx7.github.io/okupa/sw.js` muestra la `CACHE` actual.
## Cuidado con
- En cada cambio:
  - subir `CACHE` (la próxima es `okupa-v22`);
  - poner los archivos nuevos en `PRECACHE` y en `pruebas/pwa.prueba.js`;
  - poner las pruebas nuevas en `pruebas.html`.
  - Si cambian las reglas, Carlos las pega antes de publicar.
- Un `append` nativo con `null` muestra «null»: hay que usar `el()`. Las letras van en rem y no se usa `--acento`.
- Bash falla (fork), así que se usa PowerShell. Los archivos van sin BOM, salvo los `.ps1`, que necesitan BOM para PS 5.1. Los commits se hacen con `git commit -F`. En los worktrees los `node_modules` son uniones: nunca correr `git clean -fdx`. Para probar en local, desregistrar el service worker y usar 127.0.0.1.
- APK desde la app Claude:
  - AppData y npm global quedan virtualizados, así que la terminal de Carlos no los ve; por eso todo va en `C:\bubblewrap`.
  - Hay que quitar `NoDefaultCurrentDirectoryInExePath`.
  - Gradle no corre en el sandbox de Claude.
  - Nunca dejar `source.properties` en la raíz del SDK.
- APK nueva: siempre con la misma llave y subiendo `appVersionCode`. Los cambios web llegan solos a la APK.
  - probar en los dos celulares una ronda de ¿Quién es más probable? hasta el resumen (la causa exacta del botón en su celular no se pudo reproducir), el mapa en la calle, un aviso de las 8:00 y una carta.