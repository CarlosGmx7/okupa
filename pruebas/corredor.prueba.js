import { prueba, igual, lanza } from './corredor.js';

prueba('igual compara objetos', () => igual({ a: [1, 2] }, { a: [1, 2] }));

prueba('lanza detecta excepción', () => lanza(() => { throw new Error('x'); }));
