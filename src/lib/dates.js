// Dates au format local AAAA-MM-JJ : jour courant, hier, début de semaine (lundi), ajout de jours.
export function addDaysISO(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toLocalISODate(d);
}

export function getWeekStart(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toLocalISODate(d);
}

export const toLocalISODate = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const getTodayISODate = () => toLocalISODate(new Date());

export function getYesterdayISODate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalISODate(d);
}

/** « mardi 21 octobre » à partir d'une date AAAA-MM-JJ. */
export function formatDayFr(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
