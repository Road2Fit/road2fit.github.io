// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { askRestNotifyOnce, notifyRestEnd } from './restNotify';

const setVis = v => Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
afterEach(() => { delete window.Notification; localStorage.clear(); setVis('visible'); });

describe('notification de fin de repos', () => {
  it('demande l’autorisation une seule fois', () => {
    const req = vi.fn(() => Promise.resolve('granted'));
    window.Notification = Object.assign(function N() {}, { permission: 'default', requestPermission: req });
    askRestNotifyOnce();
    askRestNotifyOnce();
    expect(req).toHaveBeenCalledTimes(1);
  });
  it('notifie seulement quand l’appli n’est pas à l’écran et que c’est autorisé', () => {
    const made = [];
    window.Notification = Object.assign(function N(t, o) { made.push([t, o]); }, { permission: 'granted' });
    setVis('visible');
    expect(notifyRestEnd('Série 2/4')).toBe(false);
    setVis('hidden');
    expect(notifyRestEnd('Série 2/4')).toBe(true);
    expect(made[0][0]).toBe('Repos terminé');
    expect(made[0][1].body).toBe('Série 2/4');
    window.Notification.permission = 'denied';
    expect(notifyRestEnd('x')).toBe(false);
  });
});
