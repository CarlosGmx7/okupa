import { prueba, igual, verdadero } from './corredor.js';
import { TEMAS, validarFrase, cargarFrases } from '../js/modulos/probable/logica.js';

const PREFIJOS = { divertidas: 'div', romanticas: 'rom', picantes: 'pic', futuro: 'fut', costumbres: 'cos' };
const TEMAS_BANCO = TEMAS.map((t) => t.id).filter((id) => id !== 'nuestras');
const POR_TEMA = 200;

// Muestra de las 155 frases originales (v23): deben seguir con el mismo id y texto.
const ORIGINALES = {
  'div-001': 'se ría en el momento menos indicado',
  'div-003': 'se pierda aunque tenga el GPS prendido',
  'div-031': 'se ría tanto que le dé hipo',
  'rom-001': 'llore en la boda de unos amigos',
  'rom-031': 'le cuente a todo el mundo cómo se conocieron',
  'pic-001': 'mande un mensaje subido de tono en horario de oficina',
  'pic-031': 'se le note en la cara lo que está pensando en plena reunión de trabajo',
  'fut-001': 'quiera tener un perro antes que hijos',
  'fut-008': 'recorra Suramérica con un morral a la espalda',
  'fut-031': 'planee la luna de miel con años de anticipación',
  'cos-001': 'deje la toalla mojada encima de la cama',
  'cos-007': 'deje los platos sucios en el lavaplatos «para mañana»',
  'cos-031': 'pruebe la comida antes de servirla y se coma la mitad',
};

// Lugares que ya estaban en el banco original (no son nombres de personas ni marcas).
const NOMBRES_PERMITIDOS = new Set(['Suramérica']);

const normalizar = (t) => t
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9ñ ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

prueba('probable contenido: cada tema del banco tiene ≥ 200 frases', async () => {
  const frases = await cargarFrases();
  igual(TEMAS_BANCO, Object.keys(PREFIJOS));
  for (const tema of TEMAS_BANCO) {
    const n = frases.filter((f) => f.tema === tema).length;
    verdadero(n >= POR_TEMA, `${tema} tiene ${n}`);
  }
  verdadero(frases.every((f) => TEMAS_BANCO.includes(f.tema)), 'todas con tema del banco');
});

prueba('probable contenido: las 155 originales conservan id y texto', async () => {
  const frases = await cargarFrases();
  const porId = new Map(frases.map((f) => [f.id, f]));
  for (const [id, texto] of Object.entries(ORIGINALES)) {
    igual(porId.get(id)?.texto, texto, id);
  }
  for (const tema of TEMAS_BANCO) {
    for (let i = 1; i <= 31; i++) {
      const id = `${PREFIJOS[tema]}-${String(i).padStart(3, '0')}`;
      igual(porId.get(id)?.tema, tema, id);
    }
  }
});

prueba('probable contenido: ids únicos y consecutivos con el prefijo del tema', async () => {
  const frases = await cargarFrases();
  igual(new Set(frases.map((f) => f.id)).size, frases.length);
  for (const f of frases) {
    verdadero(new RegExp(`^${PREFIJOS[f.tema]}-\\d{3}$`).test(f.id), f.id);
  }
  for (const tema of TEMAS_BANCO) {
    const ids = frases.filter((f) => f.tema === tema).map((f) => f.id);
    const esperados = ids.map((_, i) => `${PREFIJOS[tema]}-${String(i + 1).padStart(3, '0')}`);
    igual(ids, esperados, `${tema} consecutivos`);
  }
});

prueba('probable contenido: textos válidos, sin la pregunta ni repetidos', async () => {
  const frases = await cargarFrases();
  for (const f of frases) {
    igual(validarFrase(f.texto), null, f.id);
    verdadero(!f.texto.startsWith('¿'), `${f.id} empieza por ¿`);
    verdadero(!f.texto.toLowerCase().includes('más probable'), `${f.id} contiene «más probable»`);
  }
  const vistos = new Map();
  for (const f of frases) {
    const clave = normalizar(f.texto);
    verdadero(!vistos.has(clave), `${f.id} repite a ${vistos.get(clave)}`);
    vistos.set(clave, f.id);
  }
});

prueba('probable contenido: sin nombres propios', async () => {
  const frases = await cargarFrases();
  for (const f of frases) {
    const palabras = f.texto.split(/\s+/).slice(1).map((p) => p.replace(/^[«"'(¡¿]+|[»"'),.;:!?]+$/g, ''));
    const nombres = palabras.filter((p) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñü]/.test(p) && !NOMBRES_PERMITIDOS.has(p));
    igual(nombres, [], f.id);
  }
});
