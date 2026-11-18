# Cómo sacar una APK nueva de Okupa

La APK no se actualiza sola. Okupa avisa dentro de la app («Hay una versión nueva de la app») cuando `data/apk.json` trae un `versionCode` mayor que el de la APK instalada. Sigue los pasos en este orden.

1. En `okupa-apk/twa-manifest.json` sube `appVersionCode` (por ejemplo de 1 a 2) y `appVersionName` (por ejemplo de `1.0.0` a `1.0.1`).
2. En el mismo archivo pon `startUrl` con el mismo número: `/okupa/?apk=<appVersionCode>` (por ejemplo `/okupa/?apk=2`). Así la app sabe qué versión es.
3. Construye la APK con `construir.ps1`, usando la misma llave (`android.keystore`, alias `okupa`). Si cambias de llave, el celular no deja actualizar encima.
4. Sube el `.apk` a GitHub Releases del repositorio `CarlosGmx7/okupa` y publica el release como el más reciente (la dirección `releases/latest` debe llevar a él).
5. Por último, en `data/apk.json` sube `versionCode` y `version` a los mismos valores del paso 1 y publica la app. Hazlo al final: en cuanto este archivo se publica, los celulares con la APK vieja ven el aviso.

Los celulares que ya tienen la APK 1 no tienen `?apk` y se reconocen por venir de la app; no hay que tocarlos. Quien toca «Ahora no» no vuelve a ver el aviso de esa versión, pero sí el de una versión mayor.

## Los avisos dejan de llegar a los 60 días

GitHub apaga solo los flujos programados (cron) de un repositorio sin actividad durante 60 días. Si las notificaciones dejan de llegar:

1. Entra al repositorio en GitHub y abre la pestaña **Actions**.
2. Elige el flujo **Notificaciones** en la lista de la izquierda.
3. Si aparece el aviso de que está desactivado, toca **Enable workflow**.

Cualquier publicación en el repositorio también reinicia esos 60 días.
