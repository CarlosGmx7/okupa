import { prueba, igual, verdadero } from './corredor.js';
import { TEMAS, validarFrase, cargarFrases } from '../js/modulos/probable/logica.js';

const PREFIJOS = { divertidas: 'div', romanticas: 'rom', picantes: 'pic', futuro: 'fut', costumbres: 'cos' };
const TEMAS_BANCO = TEMAS.map((t) => t.id).filter((id) => id !== 'nuestras');

prueba('probable contenido: cada tema del banco tiene ≥ 25 frases', async () => {
  const frases = await cargarFrases();
  igual(TEMAS_BANCO, Object.keys(PREFIJOS));
  for (const tema of TEMAS_BANCO) {
    const n = frases.filter((f) => f.tema === tema).length;
    verdadero(n >= 25, `${tema} tiene ${n}`);
  }
  verdadero(frases.every((f) => TEMAS_BANCO.includes(f.tema)), 'todas con tema del banco');
});

prueba('probable contenido: ids únicos con el prefijo del tema', async () => {
  const frases = await cargarFrases();
  igual(new Set(frases.map((f) => f.id)).size, frases.length);
  for (const f of frases) {
    verdadero(new RegExp(`^${PREFIJOS[f.tema]}-\\d{3}$`).test(f.id), f.id);
  }
});

prueba('probable contenido: textos válidos, sin la pregunta ni repetidos', async () => {
  const frases = await cargarFrases();
  for (const f of frases) {
    igual(validarFrase(f.texto), null, f.id);
    verdadero(!f.texto.startsWith('¿'), `${f.id} empieza por ¿`);
    verdadero(!f.texto.toLowerCase().includes('más probable'), `${f.id} contiene «más probable»`);
  }
  const minus = frases.map((f) => f.texto.trim().toLowerCase());
  igual(new Set(minus).size, minus.length, 'textos repetidos');
});
