// Confidentialité et mentions légales (4.47, phase « 10 testeurs »). Texte en français simple, fidèle à ce que fait
// réellement l'appli (à mettre à jour à chaque nouvelle donnée envoyée quelque part). Ouvert par l'événement
// `rondoufit-privacy` (Réglages, création de compte, assistant d'accueil). À faire relire par un juriste avant l'ouverture au public.
export const PRIVACY_VERSION = '2026-11-13';

const S = ({ title, children }) => (
  <section className="space-y-1.5">
    <h3 className="text-sm font-black text-white">{title}</h3>
    <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">{children}</div>
  </section>
);

export function PrivacyPolicy({ onClose }) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/70 overflow-y-auto" onClick={onClose} style={{ margin: 0 }}>
      <div className="min-h-full flex items-end sm:items-center justify-center p-3">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-4" onClick={e => e.stopPropagation()} role="dialog" aria-label="Confidentialité et mentions légales" data-testid="privacy-policy">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-lg font-black text-white">Confidentialité et mentions légales</h2>
            <button type="button" onClick={onClose} aria-label="Fermer" data-testid="privacy-close" className="nav-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">Version du {PRIVACY_VERSION.split('-').reverse().join('/')}. Road2Fit est en test : ce texte peut évoluer, tu seras prévenu dans l’appli.</p>

          <S title="Pas un avis médical">
            <p>Road2Fit propose des entraînements et des conseils généraux, appuyés sur des études publiées. Ce n’est <b>pas un avis médical</b> et cela ne remplace pas un médecin ou un kinésithérapeute. En cas de douleur, de maladie, de grossesse ou de reprise après une blessure, demande d’abord l’avis d’un professionnel de santé. Tu restes responsable de ce que tu soulèves et de la façon dont tu t’entraînes.</p>
            <p>L’appli est réservée aux personnes de 15 ans et plus (moins de 15 ans : avec l’accord d’un parent).</p>
          </S>

          <S title="Qui est responsable de tes données">
            <p>Road2Fit est une application créée et éditée par un particulier, à titre non commercial. Pour toute question ou demande : bouton « Signaler un problème / une idée » dans les réglages de l’appli.</p>
            <p>Hébergement de l’appli : GitHub Pages (GitHub Inc., États-Unis), qui ne reçoit que les visites de la page, pas tes données d’entraînement.</p>
          </S>

          <S title="Ce que l’appli enregistre">
            <p><b>Sur ton téléphone</b> : tout ce que tu saisis (exercices, séances, charges, ressenti, poids, mensurations de profil, douleurs, objectifs, photos, avatar). Sans compte, rien ne quitte ton appareil, sauf ce qui est décrit plus bas pour le coach intelligent.</p>
            <p><b>Avec un compte</b> : ton e-mail et ton mot de passe (chiffré, jamais lisible, même par le créateur), et une copie de tes données pour les retrouver sur un autre appareil. Certaines sont des <b>données de santé</b> (poids, douleurs, photos) : elles servent uniquement à faire fonctionner l’appli pour toi.</p>
            <p>Ces données sont stockées chez Supabase, dans un centre de données en Europe, protégées pour que chaque compte ne puisse lire que les siennes.</p>
          </S>

          <S title="Ce qui est partagé, et seulement si tu le choisis">
            <p><b>Amis</b> : si tu actives les amis, ton prénom ou pseudo, ton niveau, tes exercices, maxima et dernière séance sont visibles par les personnes qui ont ton code. Jamais ton poids, tes notes ni ta sauvegarde. Tes photos, seulement si tu actives leur partage.</p>
            <p><b>Coach intelligent</b> (si tu l’actives) : pour te répondre, un résumé de ton entraînement et de ton profil est envoyé au prestataire qui fait fonctionner le coach IA (situé aux États-Unis) : exercices, séances, réglages du coach, sport, âge, taille, poids et poids visé, douleurs que tu as déclarées. Jamais ton e-mail, ton prénom ni tes photos. Ce que tu dictes ou écris au coach lui est aussi envoyé.</p>
            <p><b>Analyse vidéo</b> : la vidéo est analysée sur ton téléphone et n’est ni enregistrée en ligne ni envoyée. Si tu signales une analyse fausse, seuls les points du squelette (des chiffres, pas d’image) sont envoyés.</p>
          </S>

          <S title="Pour améliorer l’appli">
            <p>Quand l’appli plante, un rapport technique est envoyé (message d’erreur, version, type de téléphone et de navigateur, écran ouvert), sans tes données d’entraînement ni ton e-mail. Les signalements que tu envoies sont lus pour corriger l’appli. Ces rapports et signalements sont gardés au plus 12 mois.</p>
            <p>Aucune publicité, aucune revente de données, aucun traceur publicitaire.</p>
          </S>

          <S title="Combien de temps">
            <p>Tes données sont gardées tant que ton compte existe. Les anciennes versions de ta sauvegarde (pour pouvoir revenir en arrière) sont limitées aux 21 dernières.</p>
          </S>

          <S title="Tes droits">
            <p><b>Voir et récupérer tes données</b> : Réglages → Exporter (fichier complet). <b>Corriger</b> : directement dans l’appli. <b>Tout effacer</b> : Réglages → Mon compte → « Supprimer mon compte » : ton compte et toutes tes données en ligne sont supprimés définitivement, ainsi que les données de ce téléphone.</p>
            <p>Tu peux aussi retirer ton accord au coach intelligent ou aux amis à tout moment dans l’appli. En cas de désaccord, tu peux saisir la CNIL (cnil.fr).</p>
          </S>
          <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl bg-pink-600 text-white text-sm font-black">Fermer</button>
        </div>
      </div>
    </div>
  );
}
