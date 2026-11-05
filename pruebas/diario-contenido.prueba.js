import { prueba, igual, verdadero } from './corredor.js';
import { cargarDiario, validarDiario, problemaDePreguntaDiario, fechaBogota, fechaLegible, sumarDias, TEMAS_DIARIO } from '../js/modulos/diario/contenido.js';
import { normalizarPerfil, problemaDePerfil, preferenciasDe } from '../js/modulos/diario/perfil.js';

const diario = await cargarDiario();

prueba('diario contenido: válido y suficiente', () => {
  igual(diario.temas.map((t) => t.id), TEMAS_DIARIO);
  igual(validarDiario(diario), []);
  verdadero(diario.preguntas.length >= 600, `hay ${diario.preguntas.length}`);
  for (const tema of TEMAS_DIARIO) {
    const n = diario.preguntas.filter((p) => p.tema === tema).length;
    verdadero(n >= 70, `${tema}: ${n}`);
  }
  verdadero(diario.preguntas.filter((p) => p.adivinar).length >= 300, 'al menos 300 para adivinar');
  verdadero(diario.preguntas.filter((p) => p.requiere).length >= 8, 'al menos 8 seguimientos');
  verdadero(diario.preguntas.filter((p) => /\{[a-z_]+\}/.test(p.texto)).length >= 8, 'al menos 8 plantillas');
  verdadero(diario.vocabulario.length >= 300, 'trae el vocabulario de inglés');
});

prueba('diario: problemaDePreguntaDiario detecta formas malas', () => {
  const ctx = { temas: new Set(['musica']), rasgos: new Set(['aventura']) };
  const buena = { id: 'dia-9001', tema: 'musica', intensidad: 1, tipo: 'opciones', texto: '¿Salsa o rap?', opciones: [{ texto: 'Salsa' }, { texto: 'Rap', rasgos: { aventura: 1 } }] };
  const escala = { id: 'dia-9002', tema: 'musica', intensidad: 2, tipo: 'escala', texto: '¿Qué tanto?', extremos: ['Nada', 'Mucho'], rasgo: { id: 'aventura', signo: -1 } };
  igual(problemaDePreguntaDiario(buena, ctx), null);
  igual(problemaDePreguntaDiario(escala, ctx), null);
  const malas = [
    { ...escala, opciones: buena.opciones },
    { ...escala, extremos: ['Nada'] },
    { ...escala, rasgo: { id: 'aventura', signo: 2 } },
    { ...buena, opciones: [{ texto: 'Salsa' }] },
    { ...buena, opciones: [{ texto: 'Salsa' }, { texto: 'salsa ' }] },
    { ...buena, opciones: [...buena.opciones, { texto: 'C' }, { texto: 'D' }, { texto: 'E' }] },
    { ...buena, opciones: [{ texto: 'Salsa', rasgos: { brujeria: 1 } }, { texto: 'Rap' }] },
    { ...buena, opciones: [{ texto: 'Salsa', rasgos: { aventura: 3 } }, { texto: 'Rap' }] },
    { ...buena, intensidad: 4 },
    { ...buena, tema: 'astrologia' },
    { ...buena, texto: ' ' },
    { ...buena, tipo: 'abierta' },
    { ...buena, adivinar: 'sí' },
    { ...buena, requiere: { magia: 1 } },
    { ...buena, requiere: { rasgo: { id: 'aventura', lado: 'arriba' } } },
    { ...buena, requiere: { favorito: 'comidas' } },
    { ...buena, requiere: { respuesta: { pregunta: 'dia-0001', opciones: [] } } },
    { ...buena, texto: 'Hola {nombre_mio}' },
  ];
  for (const m of malas) verdadero(problemaDePreguntaDiario(m, ctx), JSON.stringify(m));
  const errores = validarDiario({ temas: [{ id: 'musica' }], rasgos: [{ id: 'aventura' }], preguntas: [buena, { ...buena }, { ...escala, id: 'dia-1' }] }).join('\n');
  for (const pista of ['dia-9001', 'dia-1']) verdadero(errores.includes(pista), `falta "${pista}" en:\n${errores}`);
  const huerfana = validarDiario({ temas: [{ id: 'musica' }], rasgos: [{ id: 'aventura' }], preguntas: [{ ...buena, requiere: { respuesta: { pregunta: 'dia-0404', opciones: [0] } } }] });
  verdadero(huerfana.join().includes('dia-0404'), huerfana.join());
  igual(problemaDePreguntaDiario({ ...buena, texto: '¿{artista_fav_otro} o {artista_fav_mio}?', requiere: { favorito: 'artistas', rasgo: { id: 'aventura', lado: 'derecha' } } }, ctx), null);
});

prueba('diario: fechaBogota cambia a medianoche de Colombia', () => {
  igual(fechaBogota(new Date('2026-11-05T04:59:00Z')), '2026-11-04');
  igual(fechaBogota(new Date('2026-11-05T05:00:00Z')), '2026-11-05');
  igual(fechaBogota(new Date('2026-12-31T23:30:00-05:00')), '2026-12-31');
  igual(sumarDias('2026-03-01', -1), '2026-02-28');
  igual(sumarDias('2026-12-31', 1), '2027-01-01');
  igual(fechaLegible('2026-11-05'), 'jueves 5 de noviembre');
});

prueba('diario: el perfil inicial se valida y se completa', () => {
  const vacio = normalizarPerfil({});
  igual(vacio.intensidad, 2);
  igual(vacio.artistas, []);
  igual(problemaDePerfil(vacio, diario.perfilInicial), null);
  const bueno = normalizarPerfil({ generos: ['salsa'], artistas: ['Canserbero'], intensidad: 3, evitarTemas: ['recuerdos'] });
  igual(problemaDePerfil(bueno, diario.perfilInicial), null);
  verdadero(problemaDePerfil({ ...bueno, generos: ['polka-ninja'] }, diario.perfilInicial), 'género inexistente');
  verdadero(problemaDePerfil({ ...bueno, artistas: ['a', 'b', 'c', 'd'] }, diario.perfilInicial), 'más de 3 artistas');
  verdadero(problemaDePerfil({ ...bueno, intensidad: 5 }, diario.perfilInicial), 'intensidad 5');
  verdadero(problemaDePerfil({ ...bueno, cancion: 'x'.repeat(81) }, diario.perfilInicial), 'texto largo');
  verdadero(problemaDePerfil({ ...bueno, evitarTemas: ['astrologia'] }, diario.perfilInicial), 'tema inexistente');
});

prueba('diario: preferenciasDe usa la intensidad menor y une lo evitado', () => {
  const a = { inicial: normalizarPerfil({ intensidad: 3, evitarTemas: ['postura'], masTemas: ['musica'] }) };
  const b = { inicial: normalizarPerfil({ intensidad: 1, evitarTemas: ['recuerdos'], masTemas: ['musica', 'dilema'] }) };
  const p = preferenciasDe({ a, b });
  igual(p.intensidad, 1);
  igual([...p.evitar].sort(), ['postura', 'recuerdos']);
  igual(p.mas.get('musica'), 2);
  igual(p.mas.get('dilema'), 1);
  igual(preferenciasDe({ a, b: null }).intensidad, 2, 'sin perfil del otro: intensidad 2');
  igual(preferenciasDe({ a: null, b: null }).evitar.size, 0);
});
