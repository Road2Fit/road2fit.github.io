import { reportError } from '../lib/errorReport';
import { Component } from 'react';
import { STORAGE_KEY } from '../config';

// Écran de secours : si une partie de l'application plante, on propose de recharger et d'exporter les données
// (elles sont toujours dans le navigateur) au lieu d'un écran vide.
export function exportRawSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '{}';
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `rondoufit-secours-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) { /* rien à faire */ }
}

export function CrashScreen({ message }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 space-y-4 text-center">
        <p className="text-4xl">😵</p>
        <h1 className="text-lg font-black text-white">Oups, un écran a planté</h1>
        <p className="text-sm text-slate-300">Tes données sont intactes sur cet appareil. Recharge l’application ; si le problème revient, exporte tes données avant tout.</p>
        {message && <p className="text-xs text-slate-500 break-words">{message}</p>}
        <div className="flex flex-col gap-2">
          <button onClick={() => window.location.reload()} className="py-3 rounded-xl bg-pink-600 text-white font-black">Recharger</button>
          <button onClick={exportRawSave} className="py-3 rounded-xl bg-slate-800 text-slate-100 font-bold">💾 Exporter mes données</button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('RondouFit : écran planté', error); reportError(error, 'écran Oups'); }
  render() {
    return this.state.error ? <CrashScreen message={String(this.state.error && this.state.error.message || '')} /> : this.props.children;
  }
}
