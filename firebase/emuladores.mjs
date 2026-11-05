// Corre los emuladores de Firebase. En Windows, Java necesita una carpeta temporal donde se le
// permita crear sockets internos; se usa firebase/tmp para no depender de la del sistema.
// Uso: node emuladores.mjs exec "node --test pruebas/"   |   node emuladores.mjs start
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const tmp = join(aqui, 'tmp');
mkdirSync(tmp, { recursive: true });

const [modo = 'start', comando] = process.argv.slice(2);
const solo = modo === 'exec' ? 'firestore' : 'auth,firestore';
const args = [join(aqui, 'node_modules/firebase-tools/lib/bin/firebase.js'), `emulators:${modo}`,
  '--only', solo, '--project', 'demo-okupa', '--config', join(aqui, 'firebase.json')];
if (modo === 'exec') args.push(comando);

const hijo = spawn(process.execPath, args, {
  cwd: aqui,
  stdio: 'inherit',
  env: { ...process.env, JAVA_TOOL_OPTIONS: `"-Djdk.net.unixdomain.tmpdir=${tmp}"` }, // comillas: la ruta puede tener espacios
});
hijo.on('exit', (codigo) => process.exit(codigo ?? 1));
