// Única puerta a internet de Okupa (Firebase). Lo demás de la app no depende de ella.

// codigo: 'sin-config' | 'sin-conexion' | 'permiso' | 'desconocido'
export class ErrorNube extends Error {
  constructor(codigo, mensaje = codigo) {
    super(mensaje);
    this.name = 'ErrorNube';
    this.codigo = codigo;
  }
}
