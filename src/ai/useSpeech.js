import { useEffect, useRef, useState } from 'react';
import { startListening } from '../voice/mic';

/**
 * Micro du navigateur (reconnaissance vocale en français) : `onText` reçoit chaque morceau de phrase terminé.
 * `error` = message à afficher si le micro ne démarre pas (micro bloqué, navigateur sans reconnaissance…).
 * Le bouton reste toujours affiché : s'il ne peut pas marcher, il explique pourquoi et quoi faire.
 */
export function useSpeech(onText) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const ctl = useRef(null);
  const cbRef = useRef(onText);
  cbRef.current = onText;
  useEffect(() => () => { if (ctl.current) ctl.current.stop(); }, []);
  const toggle = () => {
    if (ctl.current) {
      ctl.current.stop();
      ctl.current = null;
      setListening(false);
      return true;
    }
    setError('');
    setListening(true);
    let ended = false; // peut arriver tout de suite (navigateur sans reconnaissance vocale)
    const c = startListening({
      onFinal: t => cbRef.current(t),
      onError: msg => setError(msg),
      onEnd: () => { ended = true; if (ctl.current && ctl.current === c) ctl.current = null; setListening(false); },
    });
    if (!ended) ctl.current = c;
    return true;
  };
  return { listening, supported: true, error, toggle };
}
