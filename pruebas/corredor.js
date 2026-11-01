// Corredor de pruebas mínimo que corre en el navegador, sin dependencias.
const pruebas = [];
const erroresDeCarga = [];

export function prueba(nombre, fn) {
  pruebas.push({ nombre, fn });
}

export function igual(real, esperado, mensaje = '') {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a !== b) throw new Error(`${mensaje ? mensaje + ': ' : ''}se esperaba ${b} y llegó ${a}`);
}

export function verdadero(valor, mensaje = 'se esperaba verdadero') {
  if (!valor) throw new Error(mensaje);
}

export function lanza(fn, mensaje = 'se esperaba una excepción') {
  try { fn(); } catch { return; }
  throw new Error(mensaje);
}

export function registrarErrorDeCarga(archivo, error) {
  erroresDeCarga.push({ nombre: `Carga de ${archivo}`, error });
}

export async function correr() {
  const lista = document.getElementById('resultados');
  let pasaron = 0;
  let fallaron = 0;
  const pintar = (nombre, error) => {
    const li = document.createElement('li');
    li.className = error ? 'falla' : 'ok';
    li.textContent = error ? `✘ ${nombre} — ${error.message || error}` : `✔ ${nombre}`;
    lista.append(li);
  };
  for (const { nombre, error } of erroresDeCarga) {
    fallaron++;
    pintar(nombre, error);
  }
  for (const { nombre, fn } of pruebas) {
    try {
      await fn();
      pasaron++;
      pintar(nombre);
    } catch (e) {
      fallaron++;
      pintar(nombre, e);
    }
  }
  document.getElementById('resumen').textContent = `${pasaron} pasaron, ${fallaron} fallaron`;
}
