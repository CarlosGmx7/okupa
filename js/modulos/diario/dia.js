// El día del diario en la nube: crearlo una sola vez para los dos, enviar respuestas y leer lo revelado.
// La respuesta del otro solo se pide cuando la propia ya está enviada (las reglas tampoco la dejarían ver).
import { elegirDia, elegirReto, agregarVistas } from './seleccion.js';
import { sumarDias } from './contenido.js';
import { normalizarPerfil } from './perfil.js';
import { otroLugar } from './revelar.js';

const DIAS_RECIENTES = 2;

export const rutaDias = (codigo) => `parejas/${codigo}/dias`;
const rutaDia = (pareja, fecha) => `${rutaDias(pareja.codigo)}/${fecha}`;
const rutaRespuesta = (pareja, fecha, parte, lugar) => `${rutaDia(pareja, fecha)}/respuestas/${parte}_${lugar}`;
const rutaPerfil = (pareja, lugar) => `parejas/${pareja.codigo}/perfiles/${lugar}`;
const rutaUso = (pareja) => `parejas/${pareja.codigo}/estado/uso`;

// El primero que abre el día lo crea; el otro (aunque abra a la vez) recibe el mismo.
export function abrirDia(nube, pareja, { fecha, datos, rnd = Math.random }) {
  return nube.transaccion(async (tx) => {
    const existente = await tx.leer(rutaDia(pareja, fecha));
    if (existente) return { ...existente, fecha };
    const [a, b, uso, ...anteriores] = await Promise.all([
      tx.leer(rutaPerfil(pareja, 'a')), tx.leer(rutaPerfil(pareja, 'b')), tx.leer(rutaUso(pareja)),
      ...Array.from({ length: DIAS_RECIENTES }, (_, i) => tx.leer(rutaDia(pareja, sumarDias(fecha, -(i + 1))))),
    ]);
    const temaDe = new Map(datos.preguntas.map((p) => [p.id, p.tema]));
    const recientes = anteriores.flatMap((d) => d?.gustos || []).map((id) => temaDe.get(id)).filter(Boolean);
    const vistasDiario = uso?.vistasDiario || [];
    const vistasIngles = uso?.vistasIngles || [];
    const { gustos, adivinar } = elegirDia({
      preguntas: datos.preguntas, perfiles: { a, b }, nombres: pareja.nombres || {}, vistas: vistasDiario, recientes, rnd,
    });
    const ingles = elegirReto({ vocabulario: datos.vocabulario, vistas: vistasIngles, rnd });
    const dia = { fecha, gustos, adivinar, ingles, hechos: {} };
    tx.escribir(rutaDia(pareja, fecha), { ...dia, creado: nube.horaServidor() });
    tx.escribir(rutaUso(pareja), {
      vistasDiario: agregarVistas(vistasDiario, gustos),
      vistasIngles: agregarVistas(vistasIngles, ingles.map((p) => p.entrada)),
    }, { combinar: true });
    return dia;
  });
}

export async function leerDia(nube, pareja, fecha) {
  const dia = await nube.leer(rutaDia(pareja, fecha));
  return dia ? { ...dia, fecha } : null;
}

export const escucharDia = (nube, pareja, fecha, fn) =>
  nube.escuchar(rutaDia(pareja, fecha), (dia) => fn(dia ? { ...dia, fecha } : null));

export async function listarDias(nube, pareja) {
  return (await nube.listar(rutaDias(pareja.codigo)))
    .map(({ id, datos }) => ({ ...datos, fecha: id }))
    .sort((x, y) => (x.fecha < y.fecha ? -1 : 1));
}

// Crea la respuesta propia y marca el día en una sola transacción. Si ya existía, no cambia nada.
export function enviar(nube, pareja, fecha, parte, datos) {
  const ruta = rutaRespuesta(pareja, fecha, parte, pareja.lugar);
  return nube.transaccion(async (tx) => {
    if (await tx.leer(ruta)) return false;
    tx.escribir(ruta, { ...datos, enviada: nube.horaServidor() });
    tx.escribir(rutaDia(pareja, fecha), { hechos: { [`${parte}_${pareja.lugar}`]: true } }, { combinar: true });
    return true;
  });
}

export const leerPropia = (nube, pareja, fecha, parte) => nube.leer(rutaRespuesta(pareja, fecha, parte, pareja.lugar));

// Las dos respuestas de una parte, o null si todavía falta alguna.
export async function leerAmbas(nube, pareja, fecha, parte, dia = null) {
  const yo = pareja.lugar;
  const otro = otroLugar(yo);
  const d = dia || (await leerDia(nube, pareja, fecha));
  if (!d?.hechos?.[`${parte}_${yo}`] || !d?.hechos?.[`${parte}_${otro}`]) return null;
  const mia = await leerPropia(nube, pareja, fecha, parte);
  if (!mia) return null;
  const suya = await nube.leer(rutaRespuesta(pareja, fecha, parte, otro));
  return suya ? { [yo]: mia, [otro]: suya } : null;
}

export const guardarPerfil = (nube, pareja, inicial) =>
  nube.escribir(rutaPerfil(pareja, pareja.lugar), { inicial: normalizarPerfil(inicial), actualizado: nube.horaServidor() }, { combinar: true });

export async function leerPerfiles(nube, pareja) {
  const [a, b] = await Promise.all([nube.leer(rutaPerfil(pareja, 'a')), nube.leer(rutaPerfil(pareja, 'b'))]);
  return { a, b };
}
