import { Art } from './Art';

const openVoice = () => window.dispatchEvent(new CustomEvent('rondoufit-voice'));

/**
 * Dictée de séance mise en avant : « Dis toute ta séance en une phrase ». Ouvre la dictée (VoiceWorkoutAssistant, événement rondoufit-voice).
 * `compact` : une seule ligne (Coach), sinon une carte avec un exemple (Exercices, Journal).
 */
export function VoiceCallout({ compact = false, testId = 'voice-callout' }) {
  if (compact) {
    return (
      <button type="button" onClick={openVoice} data-testid={testId} className="w-full flex items-center gap-3 rounded-2xl border border-pink-400/50 bg-gradient-to-r from-pink-500/15 to-violet-500/15 px-4 py-3 text-left hover:border-pink-300">
        <span className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0"><Art name="mic" size={28} bare /></span>
        <span className="flex-1 min-w-0">
          <span className="block font-black text-white">Dicter ma séance</span>
          <span className="block text-xs text-slate-300">Dis tout en une phrase, je remplis les séries pour toi.</span>
        </span>
        <span className="px-3 py-2 rounded-xl bg-pink-600 text-white text-sm font-black shrink-0">Parler</span>
      </button>
    );
  }
  return (
    <section data-testid={testId} className="rounded-2xl border border-pink-400/50 bg-gradient-to-br from-pink-500/15 to-violet-500/15 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0"><Art name="mic" size={32} bare /></span>
        <div className="min-w-0">
          <h3 className="font-black text-white">Dicte ta séance</h3>
        </div>
      </div>
      <button type="button" onClick={openVoice} className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-black text-sm inline-flex items-center justify-center gap-2">
        <Art name="mic" size={20} bare />Dicter ma séance
      </button>
    </section>
  );
}
