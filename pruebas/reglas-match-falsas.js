// Imita en la nube falsa las reglas de Firebase del Match (las reales se prueban con el emulador):
// nadie lee el match_si del otro, y match_matches solo se crea si los dos votaron positivo y al
// menos uno dijo que sí.
import { esMatch } from '../js/modulos/match/logica.js';

const denegado = () => Object.assign(new Error('permiso-denegado'), { codigo: 'permiso-denegado' });

export function conReglasMatch(nube, lugar, admin) {
  return {
    ...nube,
    async leer(ruta) {
      const m = ruta.match(/\/match_si\/[^/]+_([ab])$/);
      if (m && m[1] !== lugar) throw denegado();
      return nube.leer(ruta);
    },
    async escribir(ruta, datos, opciones) {
      const m = ruta.match(/^(parejas\/[^/]+)\/match_matches\/([^/]+)$/);
      const existe = m ? await admin.leer(ruta) : null;
      // Crear: los dos positivos y alguno "si". Sobre uno existente solo se puede cambiar "hecho".
      if (m && existe && Object.keys(datos).some((k) => k !== 'hecho')) throw denegado();
      if (m && !existe) {
        const [a, b] = await Promise.all(['a', 'b'].map((l) => admin.leer(`${m[1]}/match_si/${m[2]}_${l}`)));
        if (!a || !b || !esMatch(a.voto, b.voto)) throw denegado();
      }
      return nube.escribir(ruta, datos, opciones);
    },
  };
}
