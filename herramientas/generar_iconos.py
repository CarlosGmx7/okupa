"""Genera los íconos de Okupa a partir de la foto de la pareja.

Uso: python herramientas/generar_iconos.py <foto> <carpeta_salida>
Requiere Pillow (python -m pip install --user pillow).

La foto original viene girada 90°: se endereza, se recorta un cuadrado con las dos caras,
se le da un viso vino y dorado sutil con viñeta suave, y se guardan las versiones:
- icono-192.png / icono-512.png: forma redondeada ("squircle") con anillo dorado, esquinas transparentes
- icono-maskable-512.png: foto a sangre completa (Android recorta su propia forma)
- apple-touch-180.png: foto a sangre completa (iPhone redondea solo)
- favicon-48.png y portada-circular.png: versión circular
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

VINO = (110, 31, 53)
DORADO = (201, 164, 92)
FONDO = (20, 10, 14)

# Cuadrado con las dos caras dentro de la foto ya enderezada (960x720).
RECORTE = (110, 0, 830, 720)


def foto_con_viso(ruta):
    foto = Image.open(ruta).convert('RGB').rotate(90, expand=True).crop(RECORTE)
    vino = Image.new('RGB', foto.size, VINO)
    teñida = Image.blend(foto, ImageChops.soft_light(foto, vino), 0.45)
    dorada = Image.blend(teñida, ImageChops.screen(teñida, Image.new('RGB', foto.size, DORADO)), 0.08)
    return viñeta(dorada)


def viñeta(imagen, fuerza=0.55):
    w, h = imagen.size
    mascara = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mascara).ellipse((-w * 0.15, -h * 0.15, w * 1.15, h * 1.15), fill=255)
    mascara = mascara.filter(ImageFilter.GaussianBlur(w * 0.12))
    oscuro = Image.blend(imagen, Image.new('RGB', imagen.size, FONDO), fuerza)
    return Image.composite(imagen, oscuro, mascara)


def escalar(imagen, lado):
    return imagen.resize((lado, lado), Image.LANCZOS)


def con_forma(foto, lado, forma, margen=0.0, anillo=0.012):
    """Foto dentro de una forma suave, con anillo dorado fino y fuera transparente."""
    escala = 4  # dibujar grande y reducir = bordes suaves
    L = lado * escala
    m = int(L * margen)
    interior = L - 2 * m
    lienzo = Image.new('RGBA', (L, L), (0, 0, 0, 0))
    mascara = Image.new('L', (L, L), 0)
    d = ImageDraw.Draw(mascara)
    caja = (m, m, L - m - 1, L - m - 1)
    if forma == 'circulo':
        d.ellipse(caja, fill=255)
    else:
        d.rounded_rectangle(caja, radius=int(interior * 0.3), fill=255)
    lienzo.paste(escalar(foto, interior).convert('RGBA'), (m, m))
    lienzo.putalpha(mascara)
    grosor = max(2, int(L * anillo))
    trazo = ImageDraw.Draw(lienzo)
    if forma == 'circulo':
        trazo.ellipse(caja, outline=DORADO + (230,), width=grosor)
    else:
        trazo.rounded_rectangle(caja, radius=int(interior * 0.3), outline=DORADO + (230,), width=grosor)
    return lienzo.resize((lado, lado), Image.LANCZOS)


def main(ruta_foto, salida):
    carpeta = Path(salida)
    carpeta.mkdir(parents=True, exist_ok=True)
    foto = foto_con_viso(ruta_foto)
    con_forma(foto, 512, 'squircle', margen=0.04).save(carpeta / 'icono-512.png')
    con_forma(foto, 192, 'squircle', margen=0.04).save(carpeta / 'icono-192.png')
    escalar(foto, 512).save(carpeta / 'icono-maskable-512.png')
    escalar(foto, 180).save(carpeta / 'apple-touch-180.png')
    con_forma(foto, 48, 'circulo', anillo=0.03).save(carpeta / 'favicon-48.png')
    con_forma(foto, 512, 'circulo', anillo=0.01).save(carpeta / 'portada-circular.png')
    print('Íconos generados en', carpeta)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
