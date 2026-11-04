import { afterEach, describe, expect, it, vi } from 'vitest';
import { appScriptName, isNewerVersion, startUpdateCheck } from './updateCheck';

describe('détection de mise à jour', () => {
  it('lit le nom du fichier d’application dans la page', () => {
    expect(appScriptName('<script type="module" crossorigin src="./assets/index-BibgGFjH.js"></script>')).toBe('index-BibgGFjH.js');
    expect(appScriptName('<script src="/src/main.jsx"></script>')).toBe('');
    expect(appScriptName('')).toBe('');
  });

  it('compare les numéros de version', () => {
    expect(isNewerVersion('3.8', '3.7')).toBe(true);
    expect(isNewerVersion('3.10', '3.9')).toBe(true);
    expect(isNewerVersion('3.7.1', '3.7')).toBe(true);
    expect(isNewerVersion('3.7', '3.7')).toBe(false);
    expect(isNewerVersion('3.6.3', '3.7')).toBe(false);
    expect(isNewerVersion('', '3.7')).toBe(false);
  });

  describe('vérification', () => {
    const listeners = {};
    afterEach(() => { vi.unstubAllGlobals(); });
    const setup = (online, script = 'index-OLD.js') => {
      vi.stubGlobal('document', { querySelectorAll: () => [{ getAttribute: () => `./assets/${script}` }], addEventListener: () => {}, removeEventListener: () => {}, visibilityState: 'visible' });
      vi.stubGlobal('window', { addEventListener: (k, f) => { listeners[k] = f; }, removeEventListener: () => {} });
      vi.stubGlobal('fetch', vi.fn(async url => (url.includes('version.json')
        ? { ok: true, json: async () => online.note }
        : { ok: true, text: async () => `<script src="./assets/${online.script}"></script>` })));
    };
    const flush = () => new Promise(r => setTimeout(r, 0));

    it('version plus récente en ligne : prévient (même si la page relue est une vieille copie)', async () => {
      setup({ note: { version: '3.8', title: 'Nouveau' }, script: 'index-OLD.js' });
      const got = vi.fn();
      const stop = startUpdateCheck(got, { current: '3.7' });
      await flush(); await flush();
      expect(got).toHaveBeenCalledWith({ version: '3.8', title: 'Nouveau' });
      expect(window.__r2fUpdate.version).toBe('3.8');
      stop();
    });

    it('même version et même fichier : rien ; en ligne plus ancien (copie pas à jour) : rien', async () => {
      setup({ note: { version: '3.7' }, script: 'index-OLD.js' });
      const got = vi.fn();
      startUpdateCheck(got, { current: '3.7' })();
      await flush(); await flush();
      setup({ note: { version: '3.6' }, script: 'index-NEW.js' });
      startUpdateCheck(got, { current: '3.7' })();
      await flush(); await flush();
      expect(got).not.toHaveBeenCalled();
    });

    it('faire défiler la page relance la vérification', async () => {
      setup({ note: { version: '3.7' }, script: 'index-OLD.js' });
      const got = vi.fn();
      const stop = startUpdateCheck(got, { current: '3.7', scrollGapMs: 0 });
      await flush(); await flush();
      expect(got).not.toHaveBeenCalled();
      fetch.mockImplementation(async url => (url.includes('version.json') ? { ok: true, json: async () => ({ version: '3.8' }) } : { ok: true, text: async () => '' }));
      listeners.scroll();
      await flush(); await flush();
      expect(got).toHaveBeenCalled();
      stop();
    });
  });
});
