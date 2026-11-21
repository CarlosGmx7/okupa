# Guía: que las notificaciones corran cada 5 minutos (cron-job.org)

## Por qué

GitHub corre el horario `*/5 * * * *` «cuando puede». En la práctica lo corrió solo 3 o 4 veces al día
(27 corridas entre el 13 y el 20 de noviembre de 2026). Las invitaciones a Trivia y a Probable y el
«aceptó tu juego» vencen a los 30 minutos, así que llegaban vencidas y el servidor las botaba.
Lo del Diario aguanta 24 horas y por eso sí llegaba.

Arreglo: cron-job.org (gratis) le pide a GitHub, cada 5 minutos, correr el workflow «Notificaciones».
Esas corridas pedidas (`workflow_dispatch`) no se retrasan como las del horario. El horario de GitHub
se queda como respaldo.

## Paso 1 — Permiso de GitHub (solo para este repo)

1. En GitHub: tu foto → **Settings** → **Developer settings** → **Personal access tokens** →
   **Fine-grained tokens** → **Generate new token**.
2. **Token name**: `okupa-cron`.
3. **Expiration**: la más larga que te deje. Anota en tu calendario la fecha en que vence:
   ese día las invitaciones vuelven a fallar hasta que hagas uno nuevo (repite este paso y el 2.5).
4. **Repository access**: **Only select repositories** → `CarlosGmx7/okupa`.
5. **Permissions** → **Repository permissions** → **Actions**: **Read and write**. Nada más.
6. **Generate token** y cópialo. Solo se muestra una vez.

Este permiso solo deja correr o mirar los workflows de `okupa`: no deja cambiar código ni nada más.
No lo pegues en el chat ni en ningún archivo del proyecto: solo en cron-job.org.

## Paso 2 — El despertador en cron-job.org

1. Entra a https://cron-job.org, crea tu cuenta gratis y confirma el correo.
2. **Create cronjob**.
3. **Title**: `Okupa notificaciones`.
4. **URL**:
   `https://api.github.com/repos/CarlosGmx7/okupa/actions/workflows/notificaciones.yml/dispatches`
5. **Execution schedule**: **Every 5 minutes**.
6. En la pestaña **Advanced**:
   - **Request method**: `POST`.
   - **Headers** (agrega uno por uno):
     - `Authorization` → `Bearer ` seguido del token del paso 1 (con un espacio después de Bearer).
     - `Accept` → `application/vnd.github+json`
     - `X-GitHub-Api-Version` → `2022-11-28`
   - **Request body**: `{"ref":"main"}`
7. Guarda. Usa **Test run**: debe responder **204** (eso es «listo», sin contenido).
   - 401: el token está mal copiado o le falta `Bearer `.
   - 403 o 404: al token le falta el permiso de Actions o el repo `okupa`.
   - 422: el body no es exactamente `{"ref":"main"}`.
8. En las notificaciones de cron-job.org deja activado el aviso por correo cuando falle, así te enteras
   si el token se vence.

## Paso 3 — Comprobar

En GitHub → **Actions** → **Notificaciones** deben aparecer corridas cada ~5 minutos con el evento
`workflow_dispatch`. Luego invita a tu pareja a una Trivia: la notificación debe llegar en menos de 5 minutos.

## Si algo falla

- Para volver a como estaba: en cron-job.org, desactiva el cronjob. El horario de GitHub sigue de respaldo.
- Las corridas cada 5 minutos en un repo público no cuestan nada.
