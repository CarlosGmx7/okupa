# Guía: el relevo de Cloudflare (invitaciones en segundos)

## Qué hace

Cuando alguien crea una sala de Trivia o Probable, o acepta un juego, el celular avisa al relevo
(`servidor/relevo/relevo.js`), y el relevo le pide a GitHub correr «Notificaciones» de una vez.
Así la invitación llega en unos 30 segundos y no al siguiente turno de cron-job.org (hasta 5 min).

El relevo no recibe ni guarda datos de nadie: solo despierta a GitHub. Si se cae, cron-job.org
sigue mandando todo cada 5 minutos.

## Paso 1: otro token de GitHub

Igual al de cron-job.org, pero con otro nombre, para poder quitar uno sin dañar el otro:

1. https://github.com/settings/personal-access-tokens/new
2. **Token name**: `okupa-relevo`. **Expiration**: la más larga; anota la fecha.
3. **Repository access**: **Only select repositories** → `CarlosGmx7/okupa`.
4. **Permissions** → **Repository permissions** → **Actions**: **Read and write**.
5. **Generate token** y cópialo al Bloc de notas. No lo pegues en el chat.

## Paso 2: el Worker en Cloudflare

1. Crea una cuenta gratis en https://dash.cloudflare.com/sign-up y confirma el correo.
2. En el menú: **Workers & Pages** (o **Compute → Workers**) → **Create** → **Create Worker**
   (o **Start with Hello World**).
3. **Name**: `okupa-relevo` → **Deploy**.
4. **Edit code**: borra todo lo que hay y pega el contenido completo de `servidor/relevo/relevo.js`
   → **Deploy**.
5. Vuelve al Worker → **Settings** → **Variables and Secrets** → **Add**:
   - **Type**: **Secret**. **Variable name**: `GITHUB_TOKEN`. **Value**: el token del paso 1.
   - **Deploy** (o **Save**).
6. Copia la dirección del Worker, que se ve así: `https://okupa-relevo.<tu-cuenta>.workers.dev`.
   Pásamela por el chat (esa dirección no es secreta). Ya puedes borrar el token del Bloc de notas.

## Paso 3: conectar la app

Claude pone la dirección en `RELEVO` dentro de `js/nucleo/nube-config.js` y publica la versión.

## Comprobar

- Abrir la dirección del Worker en el navegador debe decir error 405 (normal: solo acepta POST).
- Crear una sala de Trivia: en GitHub → **Actions** → **Notificaciones** aparece una corrida
  `workflow_dispatch` en segundos, y la invitación llega al otro celular en ~30 s.

## Si algo falla

- En Cloudflare → el Worker → **Logs** (o **Observability**): «GitHub respondió 401» = token vencido o
  mal copiado; 403/404 = al token le falta Actions o el repo `okupa`. Haz otro token y cámbialo en el
  secreto `GITHUB_TOKEN`.
- Para apagarlo: pon `RELEVO = null` en `nube-config.js` (o borra el Worker). Todo sigue llegando
  con cron-job.org cada 5 minutos.
- El plan gratis de Cloudflare da 100.000 pedidos al día: sobra.
