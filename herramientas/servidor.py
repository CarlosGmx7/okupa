"""Servidor local para probar Okupa sin caché del navegador.

Uso: python herramientas/servidor.py [puerto]   (por defecto 8080, sirve la carpeta okupa-app)
"""
import functools
import http.server
import sys
from pathlib import Path


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    raiz = Path(__file__).resolve().parent.parent
    manejador = functools.partial(SinCache, directory=str(raiz))
    http.server.ThreadingHTTPServer(('127.0.0.1', puerto), manejador).serve_forever()
