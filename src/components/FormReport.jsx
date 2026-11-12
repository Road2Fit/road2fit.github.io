import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Art } from './Art';
import { ClipPlayer } from './ClipPlayer';
import { getClip, saveClip } from '../form/clip';
import { FormFlag } from './FormFlag';

// Retour du coach sur la série filmée (4.19), affiché pendant le repos.
// Onglet « Algorithme » : verdict, reps, tempo, points à corriger calculés sur le téléphone (gratuit, immédiat).
// Onglet « Coach IA » (seulement si le coach intelligent est activé) : la même série analysée par le coach IA à partir des
// seules mesures chiffrées, lancée seulement sur demande (bouton) pour ne pas consommer de tokens à chaque série. Les deux restent
// visibles pour comparer (phase d'essai) ; le haut-parleur lit l'onglet ouvert.
// 4.20 : un point relevé se touche pour revoir l'extrait vidéo du moment ; « Garder la vidéo » l'enregistre sur le téléphone.
const LEVEL = {
  warn: { dot: 'bg-rose-500', border: 'border-rose-500/60', label: 'À corriger' },
  tip: { dot: 'bg-amber-400', border: 'border-amber-400/50', label: 'À améliorer' },
  info: { dot: 'bg-sky-400', border: 'border-sky-400/40', label: 'Info' },
  good: { dot: 'bg-emerald-400', border: 'border-emerald-500/40', label: 'Bien' },
};
const VERDICT = { Propre: 'bg-emerald-600 text-white', Correct: 'bg-amber-500 text-slate-950', 'À travailler': 'bg-rose-600 text-white' };

function speak(text) {
  try {
    const s = window.speechSynthesis;
    if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 1.02;
    s.speak(u);
  } catch (e) {}
}

const Points = ({ list, onPlay }) => (
  <ul className="space-y-1.5">
    {list.map(f => {
      const playable = !!(onPlay && f.reps && f.reps.length);
      return (
      <li key={f.id + f.level} className={`border-l-4 ${LEVEL[f.level].border} bg-slate-950/60 rounded-r-xl pl-2.5 pr-2 py-1.5 ${playable ? 'cursor-pointer active:bg-slate-800' : ''}`} data-testid={`form-finding-${f.level}`}
        {...(playable ? { role: 'button', tabIndex: 0, onClick: () => onPlay(f), onKeyDown: e => { if (e.key === 'Enter') onPlay(f); }, 'aria-label': `${f.title} : voir le moment dans la vidéo` } : {})}>
        <p className="text-sm font-black text-white flex items-center gap-1.5 min-w-0"><span className={`shrink-0 w-2 h-2 rounded-full ${LEVEL[f.level].dot}`} aria-hidden="true" /><span className="flex-1 min-w-0">{f.title}<span className="sr-only"> ({LEVEL[f.level].label})</span></span>
          {playable && <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-black text-slate-200" data-testid="form-play">▶ Voir{f.reps.length === 1 ? ` (rep ${f.reps[0] + 1})` : ''}</span>}</p>
        {f.detail && <p className="text-xs text-slate-400">{f.detail}</p>}
        {f.fix && f.level !== 'good' && <p className="text-xs font-bold text-emerald-200 mt-0.5">→ {f.fix}</p>}
      </li>
      );
    })}
  </ul>
);

export function FormReport({ form, onFixReps, onAskAi, onChinCal, onFlag = null }) {
  const [all, setAll] = useState(false);
  const [tab, setTab] = useState('algo');
  const [play, setPlay] = useState(null); // point dont on regarde l'extrait ({} = toute la série)
  const [saved, setSaved] = useState(false);
  const r = form && form.result;
  if (!r) return null;
  if (!r.ok) {
    return (
      <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 space-y-1.5" data-testid="form-report">
        <p className="text-sm font-black text-white"><Art name="camera" />Analyse impossible</p>
        <p className="text-sm text-slate-300" data-testid="form-report-fail">{r.message}</p>
        <ul className="text-xs text-slate-400 list-disc pl-4 space-y-0.5">{(r.tips || []).map(t => <li key={t}>{t}</li>)}</ul>
        <FormFlag key={form.at} onFlag={onFlag} noted={form.noted} counted={0} />
      </div>
    );
  }
  const ai = form.ai || null;
  const clip = getClip(r.clipId);
  const aiReady = ai && !ai.pending && !ai.error && !ai.idle;
  const showAi = tab === 'ai' && ai;
  const issues = r.findings.filter(f => f.level === 'warn' || f.level === 'tip');
  const others = r.findings.filter(f => f.level === 'info');
  const goods = r.findings.filter(f => f.level === 'good');
  const main = issues.length ? issues : goods.slice(0, 2);
  const list = all ? [...issues, ...others, ...goods.filter(g => !main.includes(g))] : main.slice(0, 3);
  const extra = all ? 0 : Math.max(0, r.findings.length - list.length);
  const counted = !r.iso && r.repCount !== form.noted;
  const verdict = showAi && aiReady ? ai.verdict : r.verdict;
  const say = () => {
    if (showAi && aiReady) {
      speak([ai.summary, ...ai.points.filter(p => p.level !== 'good').map(p => `${p.title}. ${p.fix}`), ai.nextSet].filter(Boolean).join(' '));
      return;
    }
    const parts = [`Série ${r.verdict.toLowerCase()}.`];
    if (issues.length) issues.slice(0, 3).forEach(f => parts.push(`${f.title}. ${f.fix || ''}`));
    else parts.push('Rien à corriger, continue comme ça.');
    speak(parts.join(' '));
  };
  const tabBtn = (id, label, extraEl) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} data-testid={`form-tab-${id}`}
      className={`flex-1 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 ${tab === id ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>
      {label}{extraEl}
    </button>
  );
  return (
    <div className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded-2xl p-3 space-y-2 max-h-[50dvh] overflow-y-auto overflow-x-hidden" data-testid="form-report">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm font-black text-white"><Art name="camera" />Le coach a regardé ta série</p>
        {(!showAi || aiReady) && <span className={`px-2 py-0.5 rounded-full text-xs font-black ${VERDICT[verdict] || VERDICT.Correct}`} data-testid="form-verdict">{verdict}</span>}
        <button type="button" onClick={say} aria-label="Écouter les conseils" title="Écouter les conseils" className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center" data-testid="form-speak">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
      <p className="text-sm font-bold text-slate-200" data-testid="form-summary">{r.iso ? `Tenue mesurée : ${r.holdSec} s` : r.summary}</p>
      {counted && (
        <div className="flex items-center gap-2 bg-slate-950 rounded-xl px-2.5 py-2" data-testid="form-count">
          <p className="flex-1 text-xs text-slate-300">La caméra a compté <b className="text-white">{r.repCount}</b> rep{r.repCount > 1 ? 's' : ''} (noté : {form.noted}).</p>
          <button type="button" onClick={() => onFixReps && onFixReps(r.repCount)} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-black text-white" data-testid="form-fix-reps">Noter {r.repCount}</button>
        </div>
      )}
      {ai && (
        <div className="flex gap-1 bg-slate-950 rounded-xl p-1" role="tablist" aria-label="Type d’analyse">
          {tabBtn('algo', 'Algorithme')}
          {tabBtn('ai', 'Coach IA', aiReady && tab !== 'ai' ? <span className="w-1.5 h-1.5 rounded-full bg-pink-400" aria-hidden="true" /> : null)}
        </div>
      )}
      {showAi ? (
        <div className="space-y-2" data-testid="form-ai">
          {ai.idle && (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-400">Le coach IA reçoit les mesures de ta série (jamais l’image) et donne une analyse plus personnalisée. Environ 1 centime par analyse.</p>
              <button type="button" onClick={onAskAi} className="w-full py-2.5 rounded-xl bg-pink-600 text-white text-sm font-black" data-key data-testid="form-ai-run"><Art name="sparkle" />Lancer l’analyse du coach</button>
            </div>
          )}
          {ai.pending && <p className="text-sm text-slate-300 animate-pulse" data-testid="form-ai-pending">Le coach IA analyse tes mesures…</p>}
          {ai.error && <p className="text-sm text-rose-200" data-testid="form-ai-error">{ai.error}</p>}
          {ai.error && <button type="button" onClick={onAskAi} className="w-full py-2 rounded-xl bg-slate-800 text-slate-100 text-sm font-bold" data-testid="form-ai-retry">Réessayer</button>}
          {aiReady && (<>
            {ai.summary && <p className="text-sm text-slate-200" data-testid="form-ai-summary">{ai.summary}</p>}
            <Points list={ai.points} />
            {ai.nextSet && <p className="text-xs bg-pink-950/40 border border-pink-500/40 rounded-xl px-2.5 py-2 text-pink-100" data-testid="form-ai-next"><b>Série suivante :</b> {ai.nextSet}</p>}
            {ai.usage && <p className="text-[11px] text-slate-500" data-testid="form-ai-usage">Coût de cette analyse : {ai.usage.input + ai.usage.output} tokens ({ai.usage.input} envoyés, {ai.usage.output} reçus).</p>}
          </>)}
        </div>
      ) : (<>
        {!issues.length && <p className="text-sm font-bold text-emerald-300" data-testid="form-clean">Rien à corriger sur cette série.</p>}
        <Points list={list} onPlay={clip ? f => setPlay(f) : null} />
        {onChinCal && r.chin && (
          <div className="bg-slate-950 rounded-xl px-2.5 py-2 space-y-1.5" data-testid="chin-cal-box">
            {r.findings.some(f => f.id === 'chin' && f.level !== 'good') && <>
              <p className="text-xs text-slate-300">Ton menton passait la barre ? Dis-le à l’algorithme : il se cale sur toi pour les prochaines séries.</p>
              <button type="button" onClick={() => onChinCal('pass')} className="w-full py-2 rounded-lg bg-slate-800 text-xs font-black text-white" data-testid="chin-cal-pass">Mon menton passait la barre</button>
            </>}
            {!!r.chin.cal && <button type="button" onClick={() => onChinCal('reset')} className="w-full py-1 text-[11px] font-bold text-slate-400 underline underline-offset-2" data-testid="chin-cal-reset">Calibration du menton appliquée · remettre à zéro</button>}
          </div>
        )}
        {!all && extra > 0 && <button type="button" onClick={() => setAll(true)} className="text-xs font-bold text-slate-400 underline underline-offset-2" data-testid="form-more">{extra > 1 ? `Voir les ${extra} autres points` : 'Voir l’autre point'}</button>}
      </>)}
      {clip && (
        <div className="pt-1 space-y-1" data-testid="form-video">
          <div className="flex gap-2">
            <button type="button" onClick={() => setPlay({})} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-100 text-xs font-black" data-testid="form-video-watch">▶ Revoir la série</button>
            <button type="button" onClick={() => setSaved(saveClip(clip))} disabled={saved} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-100 text-xs font-black disabled:opacity-60" data-testid="form-video-save">{saved ? '✓ Vidéo gardée' : 'Garder la vidéo'}</button>
          </div>
          <p className="text-[11px] text-slate-500">{saved ? 'Enregistrée dans les téléchargements de ton téléphone.' : 'Sinon, elle est effacée à la série suivante.'}</p>
        </div>
      )}
      <FormFlag key={form.at} onFlag={onFlag} noted={form.noted} counted={r.iso ? null : r.repCount} chin={!!r.chin} timed={!!r.iso} />
      {play && clip && createPortal(<ClipPlayer clip={clip} reps={r.reps || []} finding={play.title ? play : null} onClose={() => setPlay(null)} />, document.body)}
    </div>
  );
}
