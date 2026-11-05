import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SUPABASE, supabaseReady } from '../config';
import { INITIAL_STATE } from '../data/initialState';
import { normalizeState } from '../data/state';
import { saveSafetyCopy } from '../lib/safetyCopy';
import { PhotoDB } from '../lib/photos';
import { syncOnce } from '../sync/engine';
import { syncPhotos } from '../sync/photoSync';
import * as store from '../sync/storage';
import * as supabase from '../sync/supabase';

const DEBOUNCE_MS = 2000;      // attente après une modification avant d'envoyer
const POLL_MS = 60000;         // vérification régulière (reprise des modifications d'un autre appareil, nouvel essai après erreur)
const FOCUS_MIN_MS = 30000;    // au retour sur l'app, on resynchronise si la dernière synchro date de plus de 30 s

/**
 * Sauvegarde automatique dans le compte de l'application (Supabase) : données (sync/engine.js) et photos (sync/photoSync.js).
 * Statuts : 'off' (pas connecté) · 'loading' (première lecture) · 'saving' · 'synced' · 'error'.
 */
export function useCloudSync({ stateRef, version, applyRemote }) {
  const [account, setAccountState] = useState(store.readAccount);
  const accountOn = supabaseReady(SUPABASE) && !!(account && account.session && account.session.user && account.session.user.id);
  const engineCfg = accountOn ? { kind: 'account', ...SUPABASE, userId: account.session.user.id } : null;
  const configured = !!engineCfg;
  const [status, setStatus] = useState(configured ? 'loading' : 'off');
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const cfgRef = useRef(engineCfg);
  cfgRef.current = engineCfg;
  const isLoaded = useRef(!configured);   // false tant que la première lecture de la sauvegarde n'est pas terminée
  const running = useRef(null);
  const timer = useRef(null);
  const lastSyncRef = useRef(0);

  // Ancienne sauvegarde GitHub : abandonnée. On efface la clé d'accès gardée sur cet appareil (elle ne sert plus à rien).
  useEffect(() => { if (accountOn) store.purgeLegacyGithub(); }, [accountOn]);

  const ports = useMemo(
    () => ({
      api: supabase,
      getLocal: () => stateRef.current,
      isPristine: () => store.getLocalTs() === 0, // jamais modifié sur cet appareil = données de départ
      normalize: normalizeState,
      getLocalTs: store.getLocalTs,
      isDirty: store.isDirty,
      version: () => version.current,
      markDirty: () => { version.current++; store.markDirty(); },
      clearDirty: v => { if (version.current === v) store.clearDirty(); },
      getSynced: store.readSynced,
      setSynced: store.writeSynced,
      applyRemote: (state, ts) => {
        applyRemote(state);
        store.setLocalTs(Math.max(store.getLocalTs(), ts || 0));
      },
      now: () => Date.now(),
    }),
    [stateRef, version, applyRemote]
  );

  // Photos souvenirs : une ligne par photo (voir sync/photoSync.js).
  const photoPorts = useMemo(
    () => ({
      api: supabase.photos,
      local: {
        index: () => PhotoDB.index(),
        get: id => PhotoDB.get(id),
        put: p => PhotoDB.put(p, { remote: true }),
        del: id => PhotoDB.del(id, { remote: true }),
        deleted: () => PhotoDB.deleted(),
        forgetDeleted: id => PhotoDB.forgetDeleted(id),
      },
      getMeta: store.readPhotoMetaAccount,
      setMeta: store.writePhotoMetaAccount,
    }),
    []
  );

  // `quiet` : vérification régulière en arrière-plan, la pastille ne clignote pas si rien n'est à envoyer.
  const syncNow = useCallback(opts => {
    const cfg = cfgRef.current;
    if (!cfg) return Promise.resolve(false);
    if (running.current) return running.current;
    const quiet = !!(opts && opts.quiet);
    setStatus(s => (quiet && s === 'synced' ? s : s === 'off' || s === 'loading' ? 'loading' : 'saving'));
    const p = (async () => {
      try {
        await syncOnce(cfg, ports);
        await syncPhotos(cfg, photoPorts);
        lastSyncRef.current = Date.now();
        setLastSync(lastSyncRef.current);
        setError(null);
        setStatus(store.isDirty() ? 'saving' : 'synced');
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
        if (store.readAccount() && store.readAccount().expired) setAccountState(store.readAccount()); // session refusée : il faut se reconnecter
        return false;
      } finally {
        isLoaded.current = true;
        running.current = null;
      }
    })();
    running.current = p;
    return p;
  }, [ports, photoPorts]);

  const scheduleSync = useCallback(
    (delay = DEBOUNCE_MS, quiet = false) => {
      if (!cfgRef.current) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (navigator.onLine !== false) void syncNow({ quiet });
      }, delay);
    },
    [syncNow]
  );

  // ---- Compte de l'application ----
  const adoptSession = useCallback(session => {
    const uid = session.user.id;
    const last = store.readLastUser();
    if (last && last !== uid) {
      // Cet appareil contenait les données d'une AUTRE personne : jamais envoyées vers ce compte. Copie de sécurité, puis départ à neuf.
      saveSafetyCopy(stateRef.current, 'avant la connexion à un autre compte');
      store.clearDirty();
      store.setLocalTs(0);
      applyRemote(normalizeState(INITIAL_STATE));
    }
    if (last !== uid) {
      store.writeSynced(null);
      store.writePhotoMetaAccount(null);
    }
    store.writeLastUser(uid);
    const next = { session };
    store.writeAccount(next);
    cfgRef.current = { kind: 'account', ...SUPABASE, userId: uid };
    setAccountState(next);
    setError(null);
    setStatus('loading');
    isLoaded.current = false;
    scheduleSync(50);
  }, [applyRemote, scheduleSync, stateRef]);

  const signUp = useCallback(async (email, password, invite) => {
    const r = await supabase.signUp(SUPABASE, email.trim(), password, invite);
    if (r.session) adoptSession(r.session);
    return r;
  }, [adoptSession]);

  const signIn = useCallback(async (email, password) => {
    const session = await supabase.signIn(SUPABASE, email.trim(), password);
    adoptSession(session);
    return session;
  }, [adoptSession]);

  const signOut = useCallback(async () => {
    const acc = store.readAccount();
    await supabase.signOut(SUPABASE, acc && acc.session);
    store.writeAccount(null); // les données restent sur cet appareil ; `lastUser` empêche de les mélanger avec un autre compte
    cfgRef.current = null;
    setAccountState(null);
    setStatus('off');
    isLoaded.current = true;
  }, []);

  // Versions précédentes (historique automatique côté serveur) : liste, puis restauration d'une version.
  const listVersions = useCallback(() => supabase.listHistory(SUPABASE), []);
  const restoreVersion = useCallback(async id => {
    const data = await supabase.getHistory(SUPABASE, id);
    if (!data || !Array.isArray(data.quests)) throw new Error('Cette version est illisible : rien n’a été changé.');
    saveSafetyCopy(stateRef.current, 'avant la restauration d’une version précédente');
    version.current++;
    store.markDirty();
    store.setLocalTs(Date.now());
    const { _savedAt, ...rest } = data;
    applyRemote(normalizeState(rest));
    scheduleSync(50);
  }, [applyRemote, scheduleSync, stateRef, version]);

  // Démarrage, retour sur l'app, retour du réseau, vérification régulière.
  useEffect(() => {
    if (cfgRef.current) scheduleSync(300);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastSyncRef.current > FOCUS_MIN_MS) scheduleSync(200);
    };
    const onOnline = () => scheduleSync(500);
    const onPhotoChange = () => scheduleSync(3000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('rondoufit-photos-local', onPhotoChange);
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible' && cfgRef.current) scheduleSync(100, true);
    }, POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('rondoufit-photos-local', onPhotoChange);
      clearInterval(poll);
      clearTimeout(timer.current);
    };
  }, [scheduleSync]);

  const user = accountOn ? account.session.user : null;
  const needsLogin = !!(account && account.expired && !accountOn);
  return { configured, status, error, lastSync, syncNow, scheduleSync, isLoaded, accountEnabled: supabaseReady(SUPABASE), user, needsLogin, signUp, signIn, signOut, listVersions, restoreVersion };
}
