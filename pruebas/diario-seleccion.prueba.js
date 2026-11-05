import { prueba, igual, verdadero } from './corredor.js';
import { semilla } from './matematicas.prueba.js';
import { cargarDiario } from '../js/modulos/diario/contenido.js';
import { normalizarPerfil } from '../js/modulos/diario/perfil.js';
import { elegirDia, elegirReto, agregarVistas } from '../js/modulos/diario/seleccion.js';

const { preguntas, vocabulario } = await cargarDiario();
const porId = new Map(preguntas.map((p) => [p.id, p]));
const perfil = (inicial) => ({ inicial: normalizarPerfil(inicial) });
const libres = { a: perfil({ intensidad: 3 }), b: perfil({ intensidad: 3 }) };

prueba('selección diario: 3 de temas distintos, una para adivinar', () => {
  const rnd = semilla(11);
  for (let i = 0; i < 200; i++) {
    const { gustos, adivinar } = elegirDia({ preguntas, perfiles: libres, rnd });
    igual(gustos.length, 3);
    const elegidas = gustos.map((id) => porId.get(id));
    verdadero(elegidas.every(Boolean), `ids inexistentes: ${gustos}`);
    igual(new Set(elegidas.map((p) => p.tema)).size, 3, `temas repetidos: ${gustos}`);
    verdadero([0, 1, 2].includes(adivinar) && elegidas[adivinar].adivinar === true, `adivinar ${adivinar} en ${gustos}`);
  }
});

prueba('selección diario: respeta la intensidad menor, los temas evitados y requiere', () => {
  const conRequiere = [...preguntas, { ...preguntas[0], id: 'dia-9999', texto: 'Seguimiento', intensidad: 1, requiere: { favorito: 'artista' } }];
  const perfiles = { a: perfil({ intensidad: 3, evitarTemas: ['postura'] }), b: perfil({ intensidad: 1 }) };
  const rnd = semilla(3);
  for (let i = 0; i < 150; i++) {
    const { gustos } = elegirDia({ preguntas: conRequiere, perfiles, rnd });
    for (const id of gustos) {
      const p = porId.get(id);
      verdadero(p, `salió ${id}`);
      verdadero(p.intensidad === 1 && p.tema !== 'postura', `${id}: intensidad ${p.intensidad}, tema ${p.tema}`);
    }
  }
});

prueba('selección diario: prefiere temas pedidos y evita los de los días anteriores', () => {
  const cuenta = (opciones) => {
    const rnd = semilla(5);
    const n = {};
    for (let i = 0; i < 300; i++) {
      for (const id of elegirDia({ preguntas, rnd, ...opciones }).gustos) n[porId.get(id).tema] = (n[porId.get(id).tema] || 0) + 1;
    }
    return n;
  };
  const base = cuenta({ perfiles: libres });
  const pedida = cuenta({ perfiles: { a: perfil({ intensidad: 3, masTemas: ['musica'] }), b: perfil({ intensidad: 3, masTemas: ['musica'] }) } });
  const reciente = cuenta({ perfiles: libres, recientes: ['musica'] });
  verdadero(pedida.musica > base.musica * 1.3, `pedida ${pedida.musica} vs base ${base.musica}`);
  verdadero(reciente.musica < base.musica * 0.8, `reciente ${reciente.musica} vs base ${base.musica}`);
});

prueba('selección diario: con el banco agotado vuelven primero las más antiguas', () => {
  const temas = ['musica', 'gustos', 'dilema', 'postura', 'recuerdos'];
  const mini = temas.map((tema, i) => ({ id: `dia-000${i + 1}`, tema, intensidad: 1, tipo: 'escala', texto: `P${i}`, extremos: ['a', 'b'], adivinar: i === 0 }));
  const vistas = mini.map((p) => p.id);
  const { gustos } = elegirDia({ preguntas: mini, perfiles: libres, vistas, rnd: semilla(9) });
  igual([...gustos].sort(), ['dia-0001', 'dia-0002', 'dia-0003']);
  const conUnaNueva = elegirDia({ preguntas: mini, perfiles: libres, vistas: vistas.slice(0, 4), rnd: semilla(9) });
  verdadero(conUnaNueva.gustos.includes('dia-0005'), `la no vista entra: ${conUnaNueva.gustos}`);
});

prueba('reto de inglés: 3 preguntas de entradas distintas, primero las no vistas', () => {
  const rnd = semilla(21);
  const reto = elegirReto({ vocabulario, rnd });
  igual(reto.length, 3);
  igual(new Set(reto.map((p) => p.entrada)).size, 3);
  verdadero(reto.every((p) => p.tema === 'ingles' && p.opciones.length === 4), JSON.stringify(reto));
  const quedan = vocabulario.slice(-3).map((e) => e.id);
  const vistas = vocabulario.slice(0, -3).map((e) => e.id);
  igual(elegirReto({ vocabulario, vistas, rnd }).map((p) => p.entrada).sort(), [...quedan].sort());
  igual(elegirReto({ vocabulario: vocabulario.slice(0, 5), vistas: vocabulario.slice(0, 5).map((e) => e.id), rnd }).map((p) => p.entrada).sort(),
    vocabulario.slice(0, 3).map((e) => e.id).sort(), 'agotado: las más antiguas');
});

prueba('agregarVistas no duplica y deja lo nuevo al final', () => {
  igual(agregarVistas(['x', 'y', 'z'], ['y', 'w']), ['x', 'z', 'y', 'w']);
  igual(agregarVistas(['x', 'y', 'z'], ['w'], 2), ['z', 'w']);
});
