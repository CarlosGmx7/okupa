import { prueba, igual, verdadero } from './corredor.js';
import { TEMAS, validarFrase, cargarFrases } from '../js/modulos/probable/logica.js';

const PREFIJOS = { divertidas: 'div', romanticas: 'rom', picantes: 'pic', futuro: 'fut', costumbres: 'cos' };
const TEMAS_BANCO = TEMAS.map((t) => t.id).filter((id) => id !== 'nuestras');
const POR_TEMA = 200;

// Las 155 frases originales (v23): deben seguir con el mismo id y texto.
const ORIGINALES = {
  "div-001": "se ría en el momento menos indicado",
  "div-002": "se coma lo último de la nevera sin avisar",
  "div-003": "se pierda aunque tenga el GPS prendido",
  "div-004": "hable con las mascotas como si fueran personas",
  "div-005": "se tropiece con algo que no existe",
  "div-006": "cante a todo pulmón en la ducha",
  "div-007": "llore viendo una película de dibujos animados",
  "div-008": "mande un mensaje al chat equivocado",
  "div-009": "se ponga una camiseta al revés y salga así a la calle",
  "div-010": "salude de vuelta a alguien que estaba saludando a otra persona",
  "div-011": "se coma el postre antes del almuerzo",
  "div-012": "se duerma a los diez minutos de empezar la película",
  "div-013": "diga que ya va llegando cuando apenas se está bañando",
  "div-014": "se ría de su propio chiste antes de terminar de contarlo",
  "div-015": "se ponga a bailar en plena calle sin pena",
  "div-016": "se gaste la plata del mes en antojos",
  "div-017": "le pida una selfi a alguien que no es la celebridad que cree",
  "div-018": "pegue un grito por una cucaracha",
  "div-019": "se le olvide para qué entró a la cocina",
  "div-020": "hable mientras duerme",
  "div-021": "se equivoque de bus y termine al otro lado de la ciudad",
  "div-022": "cuente el final de la serie sin querer",
  "div-023": "se ría a carcajadas con un meme en pleno velorio",
  "div-024": "se invente la letra de una canción y la cante con toda la seguridad",
  "div-025": "termine de parche con desconocidos en una fiesta",
  "div-026": "se queme la lengua por no esperar a que la sopa se enfríe",
  "div-027": "haga un drama de telenovela por una gripita",
  "div-028": "se quede con la mano arriba esperando un choque de manos que nunca llega",
  "div-029": "se despierte de una pesadilla y le eche la culpa a su pareja",
  "div-030": "confunda la sal con el azúcar",
  "div-031": "se ría tanto que le dé hipo",
  "rom-001": "llore en la boda de unos amigos",
  "rom-002": "escriba una carta de amor a mano",
  "rom-003": "recuerde la fecha exacta de la primera cita",
  "rom-004": "prepare una sorpresa sin ninguna razón",
  "rom-005": "pida perdón primero después de una pelea",
  "rom-006": "guarde todos los recuerdos de la relación en una caja",
  "rom-007": "dedique una canción en plena fiesta",
  "rom-008": "dé un beso en la frente sin avisar",
  "rom-009": "planee una escapada romántica de fin de semana",
  "rom-010": "saque a bailar a su pareja en la sala aunque no haya música",
  "rom-011": "se acuerde de cada fecha especial sin mirar el calendario",
  "rom-012": "deje notas de amor escondidas por la casa",
  "rom-013": "cocine el plato favorito de su pareja para alegrarle un mal día",
  "rom-014": "se emocione viendo fotos viejas de los dos",
  "rom-015": "le dé un beso a su pareja en medio de un aguacero",
  "rom-016": "busque la mano de su pareja apenas salgan a la calle",
  "rom-017": "haga una lista de las cosas que le encantan de su pareja",
  "rom-018": "recuerde el primer mensaje que se mandaron",
  "rom-019": "compre flores sin que sea una fecha especial",
  "rom-020": "llore de felicidad en un aniversario",
  "rom-021": "proponga salir a ver el atardecer",
  "rom-022": "diga cosas cursis delante de todo el mundo",
  "rom-023": "arme una playlist solo con canciones de la relación",
  "rom-024": "mande un audio larguísimo diciendo cuánto extraña a su pareja",
  "rom-025": "dé abrazos largos sin ningún motivo",
  "rom-026": "quiera repetir la primera cita en el mismo lugar",
  "rom-027": "le escriba un mensaje bonito a su pareja en mitad del día",
  "rom-028": "escriba un poema aunque le quede horrible",
  "rom-029": "regale algo hecho con sus propias manos",
  "rom-030": "dé el beso de buenos días todos los días sin falta",
  "rom-031": "le cuente a todo el mundo cómo se conocieron",
  "pic-001": "mande un mensaje subido de tono en horario de oficina",
  "pic-002": "proponga una noche de velas y vino que no termine en la sala",
  "pic-003": "susurre algo atrevido al oído en pleno restaurante",
  "pic-004": "tome la iniciativa después de una cena romántica",
  "pic-005": "robe un beso apasionado en un ascensor",
  "pic-006": "coquetee por chat estando en el mismo cuarto",
  "pic-007": "compre ropa interior nueva para dar una sorpresa",
  "pic-008": "proponga un baño de tina para dos",
  "pic-009": "le eche los perros a su pareja en plena reunión familiar",
  "pic-010": "proponga cancelar los planes para quedarse en la cama",
  "pic-011": "deje un rastro de besos de camino a la habitación",
  "pic-012": "haga un baile sensual solo para su pareja",
  "pic-013": "mande una nota de voz con voz seductora",
  "pic-014": "proponga jugar verdad o reto en versión picante",
  "pic-015": "se meta a la ducha sin invitación",
  "pic-016": "dé un masaje que termine en otra cosa",
  "pic-017": "coquetee con la mirada en medio de un almuerzo familiar",
  "pic-018": "escoja la pijama más atrevida para una noche especial",
  "pic-019": "proponga una escapada a un motel un martes cualquiera",
  "pic-020": "escriba algo picante por chat y luego disimule como si nada",
  "pic-021": "se eche perfume solo para provocar",
  "pic-022": "cierre la puerta con seguro con cara de malas intenciones",
  "pic-023": "proponga apagar la luz antes de que termine la película",
  "pic-024": "pida un beso de esos que no se dan en público",
  "pic-025": "saque una venda para los ojos con cara de misterio",
  "pic-026": "haga una propuesta indecente solo con la mirada",
  "pic-027": "aproveche cualquier abrazo para ir un poquito más allá",
  "pic-028": "escriba una lista de fantasías para cumplir en pareja",
  "pic-029": "despierte a su pareja con besos que no son tan inocentes",
  "pic-030": "baile reguetón con su pareja sin dejar ni un centímetro de espacio",
  "pic-031": "se le note en la cara lo que está pensando en plena reunión de trabajo",
  "fut-001": "quiera tener un perro antes que hijos",
  "fut-002": "se gane la lotería y se la gaste toda en viajes",
  "fut-003": "salga en televisión algún día",
  "fut-004": "se mude a un apartamento con vista al mar",
  "fut-005": "se vaya a vivir al campo a criar gallinas",
  "fut-006": "renuncie para montar su propio negocio",
  "fut-007": "aprenda un idioma nuevo después de los cincuenta",
  "fut-008": "recorra Suramérica con un morral a la espalda",
  "fut-009": "organice todas las reuniones familiares en la vejez",
  "fut-010": "termine con un tatuaje del que después se arrepienta",
  "fut-011": "compre una finca en tierra caliente",
  "fut-012": "corra una maratón completa",
  "fut-013": "tenga más de tres mascotas en la casa",
  "fut-014": "escriba un libro",
  "fut-015": "empiece a ir al gimnasio y no lo deje nunca",
  "fut-016": "aprenda a bailar salsa caleña de verdad",
  "fut-017": "se jubile y se dedique a cuidar matas",
  "fut-018": "quiera casarse en la playa",
  "fut-019": "se compre una moto a los sesenta",
  "fut-020": "acabe viviendo en otro país",
  "fut-021": "consienta demasiado a los nietos",
  "fut-022": "se ponga a estudiar otra carrera",
  "fut-023": "termine de influencer en redes sociales",
  "fut-024": "construya la casa de sus sueños",
  "fut-025": "tenga una huerta en el balcón",
  "fut-026": "le dé la vuelta al mundo en crucero",
  "fut-027": "adopte un gato aunque diga que no le gustan",
  "fut-028": "cambie de ciudad por un trabajo",
  "fut-029": "empiece a ahorrar para la vejez desde ya",
  "fut-030": "pida un año sabático para aprender a surfear",
  "fut-031": "planee la luna de miel con años de anticipación",
  "cos-001": "deje la toalla mojada encima de la cama",
  "cos-002": "se coma lo que sobró directamente de la olla",
  "cos-003": "deje los zapatos regados por toda la casa",
  "cos-004": "apague la alarma cinco veces antes de levantarse",
  "cos-005": "deje la crema dental destapada",
  "cos-006": "se robe la cobija en la noche",
  "cos-007": "deje los platos sucios en el lavaplatos «para mañana»",
  "cos-008": "ponga música a todo volumen mientras hace aseo",
  "cos-009": "se demore más de media hora en la ducha",
  "cos-010": "se pegue a ver series hasta la madrugada",
  "cos-011": "deje el rollo de papel higiénico vacío sin cambiar",
  "cos-012": "pida domicilio porque le dio pereza cocinar",
  "cos-013": "tienda la cama apenas se levante",
  "cos-014": "deje las luces prendidas en toda la casa",
  "cos-015": "se eche una siesta después del almuerzo",
  "cos-016": "ande con el celular en menos del 10 % de batería",
  "cos-017": "revise tres veces si cerró la puerta",
  "cos-018": "deje la ropa en la silla en vez de guardarla",
  "cos-019": "coma en la cama aunque deje migas",
  "cos-020": "cambie el canal justo en la mejor parte",
  "cos-021": "se tome el último tinto y no haga más",
  "cos-022": "deje el cargador en cualquier parte y luego no lo encuentre",
  "cos-023": "ronque como un tractor",
  "cos-024": "organice la nevera como si fuera un supermercado",
  "cos-025": "se acueste sin lavarse los dientes",
  "cos-026": "hable por teléfono en altavoz",
  "cos-027": "deje vasos a medio tomar por toda la casa",
  "cos-028": "se ponga a limpiar cuando está de mal genio",
  "cos-029": "abra la nevera cada cinco minutos aunque no tenga hambre",
  "cos-030": "se ponga las medias de su pareja",
  "cos-031": "pruebe la comida antes de servirla y se coma la mitad",
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
  igual(Object.keys(ORIGINALES).length, 155);
  for (const [id, texto] of Object.entries(ORIGINALES)) {
    igual(porId.get(id)?.texto, texto, id);
    igual(porId.get(id)?.tema, TEMAS_BANCO.find((t) => id.startsWith(`${PREFIJOS[t]}-`)), id);
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
