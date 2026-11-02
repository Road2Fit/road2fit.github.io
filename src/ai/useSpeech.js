import { useEffect, useRef, useState } from 'react';

/** Micro du navigateur (reconnaissance vocale en français) : `onText` reçoit chaque morceau de phrase terminé. */
export function useSpeech(onText) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const cbRef = useRef(onText);
  cbRef.current = onText;
  const SpeechRec = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  useEffect(() => () => { try { recRef.current && recRef.current.abort(); } catch (e) { /* rien */ } }, []);
  const toggle = () => {
    if (!SpeechRec) return false;
    if (listening && recRef.current) {
      try { recRef.current.stop(); } catch (e) { /* rien */ }
      setListening(false);
      return true;
    }
    try {
      const rec = new SpeechRec();
      recRef.current = rec;
      rec.lang = 'fr-FR';
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = ev => {
        let txt = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) txt += ev.results[i][0].transcript + ' ';
        if (txt.trim()) cbRef.current(txt.trim());
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      rec.start();
      setListening(true);
    } catch (e) {
      setListening(false);
    }
    return true;
  };
  return { listening, supported: !!SpeechRec, toggle };
}
