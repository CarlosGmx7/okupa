// Instalar Okupa como app. El aviso del navegador (beforeinstallprompt) puede llegar antes de que
// cargue este módulo, por eso index.html lo guarda en window.__okupaInstalar.

export function crearInstalacion(win = window) {
  const oyentes = new Set();
  const avisar = () => oyentes.forEach((fn) => fn());
  win.addEventListener('okupa:instalable', avisar);
  win.addEventListener('appinstalled', () => { win.__okupaInstalar = null; avisar(); });

  return {
    estado() {
      const nav = win.navigator;
      return {
        puedeInstalar: Boolean(win.__okupaInstalar),
        esIOS: /iphone|ipad|ipod/i.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1),
        instalada: win.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true,
      };
    },
    async instalar() {
      const evento = win.__okupaInstalar;
      if (!evento) return;
      evento.prompt();
      try { await evento.userChoice; } catch { /* el usuario cerró el aviso */ }
      win.__okupaInstalar = null;
      avisar();
    },
    alCambiar(fn) {
      oyentes.add(fn);
    },
  };
}
