# Guía: activar App Check en Okupa

App Check le dice a Firebase: «esta petición viene de la app de Okupa de verdad, no de un programa ajeno». Así nadie puede usar tu proyecto desde afuera. Haz los pasos en orden y no te saltes ninguno.

## Lo que ya está hecho

1. Ya creaste en Google Cloud Fraud Defense una clave web (basada en puntaje) para `carlosgmx7.github.io`.
2. Ya la pegaste en Firebase → App Check → app **okupa** → «Fraud Defense (antes reCAPTCHA Enterprise)» → «Clave de sitio de reCAPTCHA Enterprise», con «Tiempo de actividad del token» en **1 día**, y le diste **Guardar**.
3. La misma clave (la pública, que empieza por `6Lfb8SQu…`) ya está puesta en `js/nucleo/nube-config.js`. La clave secreta no se usa en ningún lado.

Cosas que debes saber:

- Es gratis hasta 10.000 verificaciones al mes por organización, sin facturación. Si se pasara de ahí, Google devuelve errores en vez de cobrarte.
- Cada vez que entras a «crear clave», Google hace una clave nueva. Solo la que empieza por `6Lfb8SQu…` está en uso; las otras las puedes borrar.

## Lo que sigue (lo haces tú)

1. Publica la v22 de Okupa (cuando yo te avise que está lista).
2. Abre la app publicada en tu celular y úsala un rato: entra, abre el Diario, la Trivia, el Match.
3. Entra a la consola de Firebase, abre el proyecto **okupa-abbdc** y ve a **App Check → APIs**. Toca **Cloud Firestore**. Ahí verás «Solicitudes verificadas» y «Solicitudes no verificadas». Espera a que casi todas aparezcan como verificadas. Esto puede tardar uno o dos días si la pareja usa la app poco.
4. **Solo cuando casi todas estén verificadas**, toca **Exigir** en Cloud Firestore y confirma. Si lo tocas antes, las personas con la versión vieja de la app dejarán de poder entrar.
5. Si algo falla después de Exigir, toca **Dejar de exigir** en el mismo lugar; todo vuelve a como estaba.

## Para probar en tu computador (token de depuración)

El computador no pasa por reCAPTCHA, así que usa un token de depuración.

1. Abre Okupa en tu computador (`http://127.0.0.1:...` o `localhost`) y abre la consola del navegador (tecla **F12**, pestaña **Consola**).
2. Busca un mensaje que diga algo como «App Check debug token» seguido de una clave larga con letras y números. Cópiala.
3. En la consola de Firebase ve a **App Check → Apps**, toca los tres puntos (**⋮**) de la app web y elige **Administrar tokens de depuración**.
4. Toca **Agregar token de depuración**, pega la clave y guarda.
5. Recarga Okupa en el computador. Ya debería funcionar aunque Firestore esté exigiendo App Check.

Importante: **no agregues** `localhost` ni `127.0.0.1` a los dominios de la clave. Para el computador se usa solo el token de depuración.
