# Okupa v18 — Lo básico de una app real (diseño)

Fecha: 2026-11-13 · Caché: `okupa-v18`

## Para qué
Okupa va camino a ser APK (TWA) y a recibir parejas que no conocen a Carlos. Les falta lo que cualquier app trae: una entrada que explique y deje todo listo, una política de privacidad pública (Play y la APK la exigen), una copia de seguridad fácil de encontrar y letra más grande para quien la necesite.

**Metas:** quien abre Okupa por primera vez termina enlazado y con avisos en menos de un minuto; la política dice con exactitud qué se guarda y dónde; la copia se encuentra en Ajustes y sirve para pasar a otro celular sin dañar la pareja; la letra se puede agrandar sin romper pantallas.
**No metas:** cuentas con correo o contraseña; traducciones; copia automática en la nube.
**Sería un fracaso si:** la bienvenida le aparece a quien ya usa la app; una copia importada en otro celular le quita el lugar al celular de la pareja; la política promete algo que la app no cumple.

## Decisiones de Carlos
1. Bienvenida con enlace dentro del recorrido (no solo explicar).
2. Política en los dos lados: pantalla en la app y página suelta con URL pública.
3. Copia con todo menos lo de la pareja y el registro de avisos de este celular.
4. Letra en 3 tamaños (Normal, Grande, Muy grande) con botones en Ajustes.
5. Para escalar la letra se pasan los tamaños del CSS de px a rem (descartados: zoom de toda la app, porque descuadra los toques del mapa y del encuadre de la foto; multiplicador en px, mismo trabajo y menos estándar).
6. Contacto de la política: carlos57garavito00@gmail.com (lo dio Carlos el 2026-11-13), en la constante `CORREO_PRIVACIDAD`.

## 1. Bienvenida (`#/bienvenida`)
Cuándo sale: al arrancar, si **no** hay marca `okupa:bienvenida` **y** el celular no tiene pareja (`miPareja` vacío). Así quien ya está enlazado nunca la ve. Tampoco sale si ya hay algo guardado de Preguntas (call mía: es alguien que ya usa la app sin pareja). Solo desvía al abrir el inicio, no un enlace directo como el de un aviso. Al terminar o al tocar «Saltar» se guarda la marca con la fecha.

Pasos (una sola ruta con `?paso=`; puntos de avance arriba y «Saltar» en todos):
1. **Qué es Okupa** — foto de inicio, lema y 3 renglones: preguntas para conocerse, juegos entre los dos (Trivia, Diario, Match), mapa de lugares. Enlace pequeño «Cómo cuidamos sus datos» a la política. Botón «Empezar».
2. **Enlacen sus celulares** — el mismo flujo de crear pareja / tengo un código que hoy vive en `pantallas-pareja.js` (se exporta y se reutiliza, no se copia). Abajo «Lo hago después». Al enlazar pasa solo al paso 3.
3. **Avisos** — solo si quedó enlazado y el navegador soporta notificaciones: explica qué avisos llegan y botón «Activar avisos» (usa `notificaciones.activar()` y muestra el mismo mensaje de error que Ajustes). «Ahora no» sigue. Si no se enlazó o no hay soporte, se salta.
4. **Listo** — «¡Listo!» y botón al inicio. Si no se enlazó, recuerda que la tarjeta «Jueguen juntos» del inicio sirve para hacerlo luego.

En **Acerca de** se agrega «Ver la bienvenida otra vez» (call mía: sirve para enseñarle la app a alguien).

## 2. Política de privacidad
- **Fuente única:** `privacidad.html` en la raíz del sitio, que funciona sin JavaScript, con los colores del tema Vino y modo claro/oscuro. URL: `https://carlosgmx7.github.io/okupa/privacidad.html`.
- **En la app:** ruta `#/privacidad` que trae `privacidad.html` (está en la caché), toma su `<main>` y lo pinta con «← Atrás». Enlaces desde Acerca, Ajustes (pie) y el paso 1 de la bienvenida.
- **Contenido** (español llano, según lo que hace el código hoy):
  - Quién la ofrece y el contacto (`CORREO_PRIVACIDAD`).
  - Sin cuentas: Firebase da un acceso anónimo; no se pide correo ni teléfono.
  - En este celular: ajustes, foto de inicio, preguntas propias y progreso.
  - En la nube (Firebase de Google, plan gratis), solo visible para los dos de la pareja: nombres, respuestas de Trivia y Diario, votos de Match (los «no» no los ve el otro), lugares del mapa con notas y fotos, la última ubicación si la comparten.
  - Para avisos: un registro por celular con el código de notificación, la hora del recordatorio y la zona horaria.
  - Sin publicidad, sin analítica, no se vende ni se comparte con nadie más.
  - Cómo borrar: «Datos de la pareja → Borrar todo» borra la nube para los dos; «Borrar datos de este celular» en Ajustes; o escribir al correo.
  - Pensada para mayores de edad; mención de la Ley 1581 de 2012 (habeas data, Colombia).
  - Fecha de la última actualización.
- No es asesoría legal: Carlos debería leerla antes de subir a Play.

## 3. Copia de seguridad en Ajustes
- Nuevo grupo **«Copia de seguridad»** en Ajustes, entre Notificaciones y Datos: «Guardar copia» y «Recuperar copia».
- La lógica sale de `preguntas/editor.js` a un módulo del núcleo (`js/nucleo/respaldo.js` para las reglas y la hoja de importar). En «Mis preguntas» queda un enlace «La copia de seguridad está en Ajustes».
- **Qué no entra:** toda clave que empiece por `okupa:pareja`, `okupa:dispositivo` u `okupa:notificaciones` (y `okupa:bienvenida`, que es de este celular). Todo lo demás con prefijo `okupa:` sí, incluida la foto de inicio y el tamaño de letra.
- **Al recuperar:** esas claves del archivo se ignoran (copias viejas de la v17 las traen), y en modo «Reemplazar» las del celular se conservan. Se mantienen los modos «Combinar» y «Reemplazar» y el deshacer si no hay espacio.
- Archivo: `okupa-copia-AAAA-MM-DD.json`, formato `version: 1` (sin cambio, compatible).
- Validadores: cada módulo puede declarar `validadoresRespaldo`; el núcleo los junta (hoy solo Preguntas).

## 4. Tamaño de letra
- Ajuste nuevo `letra: 'normal' | 'grande' | 'muy-grande'` en `AJUSTES_DEFECTO` (normal).
- Se aplica con `data-letra` en `<html>`: normal 100 %, grande 112,5 %, muy grande 125 % de la letra raíz. En porcentaje para que también cuente la letra del sistema. Se aplica antes de pintar con el mismo script de `index.html` que ya pone el tema.
- Los 114 `font-size` en px de `css/` pasan a rem (px ÷ 16), con un script en `herramientas/`. Espaciados y tamaños de cajas siguen en px.
- En Ajustes, grupo **«Letra»** debajo de Tema: tres botones «Aa» en tamaño creciente, como el selector de tema.
- Revisar a «Muy grande» en 375 px de ancho: inicio, Trivia, Diario, Match, Mapa, Ajustes y la bienvenida, sin cortes ni scroll lateral.

## Pruebas y publicación
- Pruebas nuevas en `pruebas.html`: cuándo sale la bienvenida, filtro de la copia (exportar y recuperar en los dos modos, con copia vieja que trae pareja), ajuste de letra, y que no quede ningún `font-size` en px.
- `sw.js`: `CACHE = 'okupa-v18'`, `privacidad.html`, `js/nucleo/respaldo.js`, `js/nucleo/bienvenida.js` y `js/nucleo/privacidad.js` al `PRECACHE` y a `pruebas/pwa.prueba.js`.
- No cambian las reglas de Firebase.

## Lo deja a quien construye
Textos finales de cada paso, el estilo de los puntos de avance y el reparto exacto de archivos dentro de `js/nucleo/`.
