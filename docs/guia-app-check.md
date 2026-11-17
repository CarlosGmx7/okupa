# Guía: activar App Check en Okupa

App Check le dice a Firebase: «esta petición viene de la app de Okupa de verdad, no de un programa ajeno». Así nadie puede usar tu proyecto desde afuera. Haz los pasos en orden y no te saltes ninguno.

## Lo que ya está hecho

1. Ya creaste la clave de reCAPTCHA v3 para `carlosgmx7.github.io`.
2. La clave del **sitio** (la pública) ya está puesta en `js/nucleo/nube-config.js`.

## Lo que sigue (lo haces tú)

1. Entra a la consola de Firebase, abre el proyecto **okupa-abbdc** y ve a **App Check** (menú de la izquierda, sección «Compilación»).
2. En la pestaña **Apps**, busca la app web de Okupa. Verás dos opciones: «Fraud Defense (antes reCAPTCHA Enterprise)» y «reCAPTCHA». Elige **reCAPTCHA** (NO Fraud Defense).
3. Pega la clave **secreta** de reCAPTCHA v3 (la que ya tienes guardada) en **Clave secreta de reCAPTCHA**, deja **Tiempo de actividad del token** en **1 día** y toca **Guardar**. La clave secreta va solo en Firebase: no se la pases a nadie ni la pegues en ningún archivo del proyecto.
   - Nota: ahí aparece un aviso rojo que dice «reCAPTCHA Classic está obsoleto». Google lo marca así, pero sigue funcionando; en una versión futura de Okupa podríamos pasar a Fraud Defense.
4. Publica la v22 de Okupa (cuando yo te avise que está lista).
5. Abre la app publicada en tu celular y úsala un rato: entra, abre el Diario, la Trivia, el Match.
6. Vuelve a la consola de Firebase, a **App Check → APIs**, y toca **Cloud Firestore**. Ahí verás «Solicitudes verificadas» y «Solicitudes no verificadas». Espera a que casi todas aparezcan como verificadas. Esto puede tardar uno o dos días si la pareja usa la app poco.
7. **Solo cuando casi todas estén verificadas**, toca **Exigir** en Cloud Firestore y confirma. Si lo tocas antes, las personas con la versión vieja de la app dejarán de poder entrar.
8. Si algo falla después de Exigir, toca **Dejar de exigir** en el mismo lugar; todo vuelve a como estaba.

## Para probar en tu computador (token de depuración)

El computador no pasa por reCAPTCHA, así que usa un token de depuración.

1. Abre Okupa en tu computador (`http://127.0.0.1:...` o `localhost`) y abre la consola del navegador (tecla **F12**, pestaña **Consola**).
2. Busca un mensaje que diga algo como «App Check debug token» seguido de una clave larga con letras y números. Cópiala.
3. En la consola de Firebase ve a **App Check → Apps**, toca los tres puntos (**⋮**) de la app web y elige **Administrar tokens de depuración**.
4. Toca **Agregar token de depuración**, pega la clave y guarda.
5. Recarga Okupa en el computador. Ya debería funcionar aunque Firestore esté exigiendo App Check.

Importante: **no agregues** `localhost` ni `127.0.0.1` a los dominios de reCAPTCHA. Para el computador se usa solo el token de depuración.
