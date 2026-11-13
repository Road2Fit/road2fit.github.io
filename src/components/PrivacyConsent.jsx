import { PRIVACY_VERSION } from './PrivacyPolicy';

// Comptes créés avant la politique de confidentialité (ou après un changement de version) : on demande l'accord une fois.
// gameState.privacyConsent = { version, at }. Refuser = continuer sans compte en ligne (on propose de supprimer le compte).
export function PrivacyConsent({ onAccept, onLater }) {
  const open = () => window.dispatchEvent(new CustomEvent('rondoufit-privacy'));
  return (
    <div className="fixed inset-0 z-[84] bg-black/70 overflow-y-auto" style={{ margin: 0 }}>
      <div className="min-h-full flex items-end sm:items-center justify-center p-3">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-3" role="dialog" aria-label="Confidentialité" data-testid="privacy-consent">
          <h2 className="text-lg font-black text-white">Tes données et l’appli</h2>
          <p className="text-sm text-slate-300">Road2Fit s’ouvre à d’autres testeurs : voici, noir sur blanc, ce que l’appli fait de tes données (où elles sont, ce qui est partagé, comment tout supprimer). Rien ne change dans ton utilisation.</p>
          <p className="text-xs text-slate-400">Rappel : les conseils du coach sont des repères généraux, pas un avis médical.</p>
          <button type="button" onClick={open} className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm font-bold" data-testid="privacy-consent-read">Lire la politique de confidentialité</button>
          <button type="button" onClick={() => onAccept({ version: PRIVACY_VERSION, at: new Date().toISOString() })} className="w-full py-2.5 rounded-xl bg-pink-600 text-white text-sm font-black" data-testid="privacy-consent-accept">J’ai lu et j’accepte</button>
          <button type="button" onClick={onLater} className="w-full text-xs font-bold text-slate-400 underline" data-testid="privacy-consent-later">Plus tard</button>
        </div>
      </div>
    </div>
  );
}
