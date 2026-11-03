import { EXERCISE_CATALOG, normSearch } from '../data/catalog';
import { EQUIP_TIPS, FAMILIES, INFO_FAMILY, NAME_RULES } from './info';
import { ALL_SCENES } from './registry';

const BY_ID = Object.fromEntries(ALL_SCENES.map(s => [s.id, s]));
const CAT = Object.fromEntries(EXERCISE_CATALOG.map(c => [c.id, c]));

/** Identifiant d'exercice animé correspondant à un exercice (catalogue d'abord, puis reconnaissance du nom). */
export function animationIdFor({ catalogId, name } = {}) {
  if (catalogId && BY_ID[catalogId]) return catalogId;
  // exercice du catalogue commun : animation de l'exercice le plus proche indiqué par le coach (`like`)
  const shared = catalogId && EXERCISE_CATALOG.find(c => c.id === catalogId && c.like);
  if (shared && BY_ID[shared.like]) return shared.like;
  const n = normSearch(name || '');
  if (!n) return null;
  const exact = EXERCISE_CATALOG.find(c => normSearch(c.name) === n && BY_ID[c.id]);
  if (exact) return exact.id;
  for (const [re, id] of NAME_RULES) if (re.test(n) && BY_ID[id]) return id;
  return null;
}

/** Tout ce qu'il faut pour afficher un mouvement : scène, texte, matériel. */
export function movementFor(id) {
  const s = BY_ID[id];
  if (!s) return null;
  const cat = CAT[id] || {};
  const fam = FAMILIES[INFO_FAMILY[id]] || null;
  return {
    id,
    name: cat.name || s.name,
    category: cat.category || '',
    equip: cat.equip || '',
    scene: s.scene,
    alts: s.alts || [],
    info: fam,
    equipTips: EQUIP_TIPS[cat.equip] || [],
  };
}

/** Liste des exercices animés, pour le sélecteur « Voir un autre exercice ». */
export function animatedList() {
  return ALL_SCENES.map(s => ({ id: s.id, name: (CAT[s.id] || {}).name || s.name, category: (CAT[s.id] || {}).category || 'Autres' }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
