// Boutique de l'avatar (4.40, idée de Gabin) : chaque niveau gagné rapporte des pièces, de plus en plus ; elles achètent
// des objets pour l'avatar des animations (anim/avatar.js). Purement décoratif : aucun effet sur l'entraînement.
// Pièces = gagnées (calculées d'après le niveau, jamais stockées) − prix des objets achetés (gameState.avatarOwned,
// réunis entre appareils par la fusion) : un achat ne se perd pas et le solde ne peut pas être faussé par la synchro.
// Objets portés : gameState.avatar.items = { emplacement: id }. Tous les dessins sont originaux.

export const START_COINS = 30; // de quoi s'offrir un premier petit objet
/** Pièces gagnées en passant au niveau `l` (l ≥ 2) : 14 au niveau 2, 30 au niveau 10, 50 au 20, 110 au 50. */
export const coinsForLevel = l => (l >= 2 ? 10 + 2 * l : 0);
/** Total gagné en arrivant au niveau `level`. */
export function coinsEarned(level) {
  let s = START_COINS;
  for (let l = 2; l <= Math.min(100, Math.max(1, Math.floor(level || 1))); l++) s += coinsForLevel(l);
  return s;
}

export const SLOTS = [
  { id: 'head', label: 'Tête' },
  { id: 'eyes', label: 'Yeux' },
  { id: 'face', label: 'Visage' },
  { id: 'neck', label: 'Cou et épaules' },
  { id: 'wrists', label: 'Poignets' },
  { id: 'hands', label: 'Mains' },
  { id: 'waist', label: 'Taille' },
  { id: 'knees', label: 'Genoux' },
  { id: 'socks', label: 'Chaussettes' },
  { id: 'topPattern', label: 'Motif du haut' },
  { id: 'bottomPattern', label: 'Motif du bas' },
  { id: 'shoes', label: 'Chaussures' },
  { id: 'aura', label: 'Effet' },
];

// kind = forme dessinée par Figure.jsx ; c / c2 = couleurs
export const ITEMS = [
  // tête
  { id: 'band_red', slot: 'head', kind: 'band', name: 'Bandeau rouge', price: 40, c: '#d9483b' },
  { id: 'band_black', slot: 'head', kind: 'band', name: 'Bandeau noir', price: 40, c: '#1f2328' },
  { id: 'band_white', slot: 'head', kind: 'band', name: 'Bandeau blanc', price: 40, c: '#e5e7eb' },
  { id: 'band_neon', slot: 'head', kind: 'band', name: 'Bandeau fluo', price: 150, c: '#a3e635', glow: true },
  { id: 'cap_black', slot: 'head', kind: 'cap', name: 'Casquette noire', price: 80, c: '#22252b', c2: '#3a3f48' },
  { id: 'cap_red', slot: 'head', kind: 'cap', name: 'Casquette rouge', price: 80, c: '#c2362b', c2: '#e05a4e' },
  { id: 'cap_back', slot: 'head', kind: 'capBack', name: 'Casquette à l’envers', price: 90, c: '#2f6fb5', c2: '#24578f' },
  { id: 'beanie', slot: 'head', kind: 'beanie', name: 'Bonnet', price: 90, c: '#7c4dcc', c2: '#5e36a6' },
  { id: 'beanie_orange', slot: 'head', kind: 'beanie', name: 'Bonnet orange', price: 90, c: '#ea7a1e', c2: '#c25e10' },
  { id: 'bob', slot: 'head', kind: 'bob', name: 'Bob', price: 100, c: '#d8c89a', c2: '#b8a777' },
  { id: 'bandana', slot: 'head', kind: 'bandana', name: 'Bandana', price: 110, c: '#b4233c', c2: '#e5e7eb' },
  { id: 'headphones', slot: 'head', kind: 'headphones', name: 'Casque audio', price: 160, c: '#22252b', c2: '#ef4444' },
  { id: 'headphones_white', slot: 'head', kind: 'headphones', name: 'Casque audio blanc', price: 160, c: '#e5e7eb', c2: '#94a3b8' },
  { id: 'crown', slot: 'head', kind: 'crown', name: 'Couronne', price: 600, c: '#eab308', c2: '#fde047' },
  // yeux
  { id: 'sunglasses', slot: 'eyes', kind: 'sunglasses', name: 'Lunettes de soleil', price: 70, c: '#111827' },
  { id: 'sport_glasses', slot: 'eyes', kind: 'sportGlasses', name: 'Lunettes de sport', price: 120, c: '#0ea5e9', c2: '#e0f2fe' },
  { id: 'round_glasses', slot: 'eyes', kind: 'roundGlasses', name: 'Lunettes rondes', price: 60, c: '#1f2328' },
  { id: 'gold_glasses', slot: 'eyes', kind: 'sunglasses', name: 'Lunettes dorées', price: 220, c: '#eab308' },
  // visage (couleur des cheveux)
  { id: 'moustache', slot: 'face', kind: 'moustache', name: 'Moustache', price: 50 },
  { id: 'beard_short', slot: 'face', kind: 'beard', name: 'Barbe courte', price: 60 },
  { id: 'beard_long', slot: 'face', kind: 'beardLong', name: 'Barbe longue', price: 90 },
  // cou et épaules
  { id: 'chain', slot: 'neck', kind: 'chain', name: 'Chaîne dorée', price: 130, c: '#eab308' },
  { id: 'chain_silver', slot: 'neck', kind: 'chain', name: 'Chaîne argentée', price: 110, c: '#cbd5e1' },
  { id: 'whistle', slot: 'neck', kind: 'whistle', name: 'Sifflet de coach', price: 50, c: '#e5e7eb', c2: '#94a3b8' },
  { id: 'towel', slot: 'neck', kind: 'towel', name: 'Serviette sur l’épaule', price: 70, c: '#f1f5f9', c2: '#cbd5e1' },
  { id: 'medal', slot: 'neck', kind: 'medal', name: 'Médaille d’or', price: 350, c: '#eab308', c2: '#d9483b' },
  // poignets
  { id: 'wrist_white', slot: 'wrists', kind: 'wristband', name: 'Poignets éponge blancs', price: 40, c: '#e5e7eb' },
  { id: 'wrist_red', slot: 'wrists', kind: 'wristband', name: 'Poignets éponge rouges', price: 40, c: '#d9483b' },
  { id: 'wrist_neon', slot: 'wrists', kind: 'wristband', name: 'Poignets éponge fluo', price: 90, c: '#a3e635' },
  { id: 'watch', slot: 'wrists', kind: 'watch', name: 'Montre connectée', price: 90, c: '#111827', c2: '#38bdf8' },
  { id: 'bracelets', slot: 'wrists', kind: 'bracelets', name: 'Bracelets', price: 50, c: '#f59e0b', c2: '#db5c9a' },
  { id: 'wraps', slot: 'wrists', kind: 'wristband', name: 'Bandes de poignet', price: 70, c: '#1f2328', c2: '#ef4444' },
  // mains
  { id: 'gloves', slot: 'hands', kind: 'gloves', name: 'Gants de muscu', price: 80, c: '#22252b' },
  { id: 'gloves_red', slot: 'hands', kind: 'gloves', name: 'Gants rouges', price: 80, c: '#b4233c' },
  { id: 'chalk', slot: 'hands', kind: 'chalk', name: 'Magnésie', price: 60, c: '#f1f5f9' },
  { id: 'straps', slot: 'hands', kind: 'straps', name: 'Sangles de tirage', price: 70, c: '#eab308' },
  // taille
  { id: 'belt_leather', slot: 'waist', kind: 'belt', name: 'Ceinture de force', price: 150, c: '#6b3f1f', c2: '#a3a3a3' },
  { id: 'belt_neon', slot: 'waist', kind: 'belt', name: 'Ceinture fluo', price: 200, c: '#a3e635', c2: '#1f2328' },
  { id: 'belt_black', slot: 'waist', kind: 'belt', name: 'Ceinture noire', price: 150, c: '#1f2328', c2: '#d4d4d8' },
  { id: 'fanny', slot: 'waist', kind: 'fanny', name: 'Sac banane', price: 80, c: '#db5c9a', c2: '#1f2328' },
  // genoux
  { id: 'knee_black', slot: 'knees', kind: 'knee', name: 'Genouillères noires', price: 100, c: '#22252b' },
  { id: 'knee_red', slot: 'knees', kind: 'knee', name: 'Genouillères rouges', price: 100, c: '#b4233c' },
  { id: 'knee_blue', slot: 'knees', kind: 'knee', name: 'Genouillères bleues', price: 100, c: '#2f6fb5' },
  // chaussettes
  { id: 'socks_white', slot: 'socks', kind: 'socks', name: 'Chaussettes hautes blanches', price: 30, c: '#f1f5f9' },
  { id: 'socks_black', slot: 'socks', kind: 'socks', name: 'Chaussettes hautes noires', price: 30, c: '#1f2328' },
  { id: 'socks_striped', slot: 'socks', kind: 'socks', name: 'Chaussettes rayées', price: 50, c: '#f1f5f9', c2: '#d9483b' },
  { id: 'socks_neon', slot: 'socks', kind: 'socks', name: 'Chaussettes fluo', price: 60, c: '#a3e635' },
  // motifs (sur la couleur choisie du vêtement)
  { id: 'top_stripes', slot: 'topPattern', kind: 'stripes', name: 'Haut rayé', price: 120 },
  { id: 'top_camo', slot: 'topPattern', kind: 'camo', name: 'Haut camouflage', price: 180 },
  { id: 'top_stars', slot: 'topPattern', kind: 'stars', name: 'Haut étoilé', price: 200 },
  { id: 'top_number', slot: 'topPattern', kind: 'number', name: 'Maillot numéro 23', price: 160 },
  { id: 'top_check', slot: 'topPattern', kind: 'check', name: 'Haut à carreaux', price: 150 },
  { id: 'bottom_stripe', slot: 'bottomPattern', kind: 'sideStripe', name: 'Bandes sur le côté', price: 90, c: '#f1f5f9' },
  { id: 'bottom_stripe_red', slot: 'bottomPattern', kind: 'sideStripe', name: 'Bandes rouges sur le côté', price: 90, c: '#d9483b' },
  { id: 'bottom_camo', slot: 'bottomPattern', kind: 'camo', name: 'Bas camouflage', price: 160 },
  // chaussures
  { id: 'shoes_gold', slot: 'shoes', kind: 'shoeColor', name: 'Chaussures dorées', price: 300, c: '#e8b923' },
  { id: 'shoes_neon', slot: 'shoes', kind: 'shoeColor', name: 'Chaussures fluo', price: 140, c: '#a3e635' },
  { id: 'shoes_lifting', slot: 'shoes', kind: 'lifting', name: 'Chaussures d’haltérophilie', price: 180, c: '#e5e7eb', c2: '#2f6fb5' },
  // effets
  { id: 'aura_neon', slot: 'aura', kind: 'aura', name: 'Halo fluo', price: 400, c: '#a3e635' },
  { id: 'aura_gold', slot: 'aura', kind: 'aura', name: 'Halo doré', price: 500, c: '#eab308' },
  { id: 'aura_violet', slot: 'aura', kind: 'aura', name: 'Halo violet', price: 450, c: '#a855f7' },
];
export const itemById = id => ITEMS.find(x => x.id === id) || null;

/** Pièces restantes : gagnées au niveau actuel − prix des objets achetés. */
export function coinsLeft(level, owned) {
  const spent = [...new Set(owned || [])].reduce((s, id) => s + ((itemById(id) || {}).price || 0), 0);
  return Math.max(0, coinsEarned(level) - spent);
}
export const canBuy = (item, level, owned) => !!item && !(owned || []).includes(item.id) && coinsLeft(level, owned) >= item.price;

/** Objets portés valides : un par emplacement, seulement s'ils sont achetés (`owned` null = pas de contrôle, pour l'essayage). */
export function cleanItems(items, owned = null) {
  const out = {};
  Object.entries(items && typeof items === 'object' ? items : {}).forEach(([slot, id]) => {
    const it = itemById(id);
    if (it && it.slot === slot && (!owned || owned.includes(id))) out[slot] = id;
  });
  return out;
}
