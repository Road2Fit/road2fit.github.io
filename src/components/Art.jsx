// Icônes en couleur de l'appli, dessinées à la main (mêmes formes sur tous les téléphones, contrairement aux emojis).
// <Art name="flame" /> se place devant un texte ; <Art name="flame" size={28} bare /> seule, sans marge.
import { setEmojiRenderer } from '../jsx/jsx-runtime';
import { MORE } from './ArtMore';
import { LINE } from './ArtLine';

const S = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

const ICONS = {
  heart: <><path d="M12 20.8S3.2 15.6 3.2 9.2c0-2.8 2.1-4.9 4.7-4.9 1.8 0 3.2 1 4.1 2.4.9-1.4 2.3-2.4 4.1-2.4 2.6 0 4.7 2.1 4.7 4.9 0 6.4-8.8 11.6-8.8 11.6Z" fill="#f43f5e" /><path d="M4.6 11.6h3.6l1.5-2.8 2.4 5.4 1.6-2.6h5.7" {...S} stroke="#fff" strokeWidth="1.6" /></>,
  coach: <><path d="M12 3.2C10.8 2 8.4 2.2 7.6 4 5.6 3.9 4.2 5.8 4.8 7.6 3 8.6 2.8 11 4.2 12.2 3.4 14 4.6 16 6.4 16.1 6.9 18 9 18.8 10.4 17.8L12 16.8Z" fill="#f472b6" /><path d="M12 3.2C13.2 2 15.6 2.2 16.4 4 18.4 3.9 19.8 5.8 19.2 7.6 21 8.6 21.2 11 19.8 12.2 20.6 14 19.4 16 17.6 16.1 17.1 18 15 18.8 13.6 17.8L12 16.8Z" fill="#fb7fb8" /><path d="M12 3.5V21M8 7.5c1 .3 1.6 1 1.8 2M16 7.5c-1 .3-1.6 1-1.8 2M6.8 12.2c1.2-.4 2.2-.2 3 .6M17.2 12.2c-1.2-.4-2.2-.2-3 .6" {...S} stroke="#be185d" strokeWidth="1.2" /></>,
  dumbbell: <><rect x="1.2" y="9" width="2.6" height="6" rx="1" fill="#93c5fd" /><rect x="3.8" y="6" width="4" height="12" rx="1.4" fill="#3b82f6" /><rect x="7.8" y="10.4" width="8.4" height="3.2" fill="#cbd5e1" /><rect x="16.2" y="6" width="4" height="12" rx="1.4" fill="#3b82f6" /><rect x="20.2" y="9" width="2.6" height="6" rx="1" fill="#93c5fd" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="17" rx="3" fill="#e2e8f0" /><path d="M3 9.5V7.5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2Z" fill="#ef4444" /><path d="M8 2.8v3.4M16 2.8v3.4" {...S} stroke="#64748b" strokeWidth="2" /><g fill="#3b82f6"><rect x="6.5" y="12" width="3" height="3" rx=".7" /><rect x="10.5" y="12" width="3" height="3" rx=".7" /><rect x="14.5" y="12" width="3" height="3" rx=".7" /><rect x="6.5" y="16.2" width="3" height="3" rx=".7" /><rect x="10.5" y="16.2" width="3" height="3" rx=".7" /></g></>,
  chart: <><rect x="4" y="13" width="4" height="8" rx="1" fill="#60a5fa" /><rect x="10" y="9.5" width="4" height="11.5" rx="1" fill="#a78bfa" /><rect x="16" y="6" width="4" height="15" rx="1" fill="#34d399" /><path d="M3.5 9.5 9 5l3 2 5-4.5M14 2.2h3.2v3.2" {...S} stroke="#f472b6" strokeWidth="1.8" /></>,
  more: <><rect x="3" y="3" width="8" height="8" rx="2.4" fill="#60a5fa" /><rect x="13" y="3" width="8" height="8" rx="2.4" fill="#f472b6" /><rect x="3" y="13" width="8" height="8" rx="2.4" fill="#fbbf24" /><rect x="13" y="13" width="8" height="8" rx="2.4" fill="#34d399" /></>,
  flame: <><path d="M12 2c.6 3.4 2.6 4.8 4.4 7 1.3 1.6 2.1 3.3 2.1 5.4C18.5 18.7 15.6 22 12 22s-6.5-3.3-6.5-7.600c0-2.4 1-4.2 2.4-5.7.2 1.6.8 2.6 1.9 3.200C9.3 8.4 9.9 4.7 12 2Z" fill="#f97316" /><path d="M12 12c.4 1.5 1.3 2.2 2 3.2.5.7.8 1.4.8 2.300C14.8 19.7 13.6 21 12 21s-2.8-1.3-2.8-3.500c0-2.3 1.9-3.3 2.8-5.500Z" fill="#fde047" /></>,
  scale: <><path d="M12 3v17M5 6h14" {...S} stroke="#94a3b8" strokeWidth="2" /><path d="M8 21h8" {...S} stroke="#64748b" strokeWidth="2.4" /><path d="M5 6 2 13h6Z M19 6l-3 7h6Z" {...S} stroke="#cbd5e1" strokeWidth="1" /><path d="M1.8 13a3.2 3.2 0 0 0 6.4 0ZM15.8 13a3.2 3.2 0 0 0 6.4 0Z" fill="#fbbf24" /></>,
  target: <><circle cx="11" cy="13" r="9" fill="#ef4444" /><circle cx="11" cy="13" r="6.2" fill="#f8fafc" /><circle cx="11" cy="13" r="3.4" fill="#ef4444" /><path d="M11 13 20 4" {...S} stroke="#475569" strokeWidth="1.8" /><path d="m18 2.5.3 2.7 2.7.3 2-2-2.5-.5-.5-2.500Z" fill="#38bdf8" /></>,
  medal: <><path d="M7 2h4l2 7H9Z" fill="#3b82f6" /><path d="M17 2h-4l-2 7h4Z" fill="#ef4444" /><circle cx="12" cy="15" r="7" fill="#f59e0b" /><circle cx="12" cy="15" r="4.6" fill="#fde047" /></>,
  trophy: <><path d="M6 5H3v2.500A4 4 0 0 0 7 11.500M18 5h3v2.500a4 4 0 0 1-4 4" {...S} stroke="#d97706" strokeWidth="2" /><path d="M6 3h12v7a6 6 0 0 1-12 0Z" fill="#fbbf24" /><path d="M9 3v7a3 3 0 0 0 1 2.2" {...S} stroke="#fef3c7" strokeWidth="1.4" /><rect x="10.8" y="15.5" width="2.4" height="3.5" fill="#d97706" /><rect x="7.5" y="19" width="9" height="2.8" rx="1" fill="#92400e" /></>,
  crown: <><path d="M3 8l4.5 4L12 4.5 16.5 12 21 8l-2 11H5Z" fill="#fbbf24" /><rect x="5" y="17.5" width="14" height="2.5" rx=".8" fill="#d97706" /><circle cx="12" cy="13.5" r="1.5" fill="#ef4444" /></>,
  timer: <><rect x="10" y="1.5" width="4" height="2.5" rx="1" fill="#94a3b8" /><path d="M18.5 6.5 20 5" {...S} stroke="#94a3b8" strokeWidth="2" /><circle cx="12" cy="13.5" r="8.5" fill="#38bdf8" /><circle cx="12" cy="13.5" r="6.5" fill="#f8fafc" /><path d="M12 9.500v4l2.5 1.8" {...S} stroke="#ef4444" strokeWidth="2" /></>,
  film: <><rect x="3" y="9" width="18" height="12" rx="2" fill="#475569" /><path d="m3 5.5 17-3.5.7 3.500L3.7 9Z" fill="#e2e8f0" /><path d="m6.5 4.8 1.4 3.300M11 3.900l1.4 3.300M15.5 3l1.4 3.3" {...S} stroke="#334155" strokeWidth="1.6" /><path d="m10 12 5.5 3-5.5 3Z" fill="#fbbf24" /></>,
  pencil: <><path d="m15.5 4 4.5 4.500L8.5 20 4 15.500Z" fill="#fbbf24" /><path d="m15.5 4 1.8-1.800a1.5 1.5 0 0 1 2.1 0l2.4 2.400a1.5 1.5 0 0 1 0 2.100L20 8.500Z" fill="#f472b6" /><path d="M4 15.5 2.5 21.5 8.5 20Z" fill="#fde7c7" /><path d="M2.5 21.5 3.1 19l1.9 1.900Z" fill="#334155" /></>,
  muscle: <path d="M6.8 21c-2.6 0-4.1-2.3-3.3-5C4.7 11.6 6 7.5 7 4.3 7.4 3 8.6 2.3 10 2.500l2.7.4c1 .2 1.7 1.1 1.5 2.1-.2 1-1.1 1.6-2.1 1.500l-1.5-.2-1 4.600c2.5-1.8 5.9-1.9 8.5-.3 2.4 1.5 3.6 4.2 2.9 6.8-.7 2.4-2.8 3.6-5.3 3.600Z" fill="#f59e0b" />,
  runner: <><circle cx="15" cy="4.5" r="2.5" fill="#fbbf24" /><path d="M12.5 8.5 9 14l4 2.5-1 5.500M12.5 8.500l4 3.5 3.5-.5M9.5 9.500l3-1M9 14l-2 3-3.5-.5" {...S} stroke="#34d399" strokeWidth="2.6" /></>,
  bolt: <path d="M13.5 2 4.5 14H11l-1 8 9.5-13H13Z" fill="#fde047" />,
  book: <><path d="M3 5c3-1.5 6-1.5 9 .5V21c-3-2-6-2-9-.5Z" fill="#60a5fa" /><path d="M21 5c-3-1.5-6-1.5-9 .5V21c3-2 6-2 9-.5Z" fill="#93c5fd" /><path d="M5.5 9c1.5-.4 3-.3 4.5.3M5.5 12.500c1.5-.4 3-.3 4.5.3M18.5 9c-1.5-.4-3-.3-4.5.3M18.5 12.500c-1.5-.4-3-.3-4.5.3" {...S} stroke="#eff6ff" strokeWidth="1.2" /></>,
  gear: <><circle cx="12" cy="12" r="8" {...S} stroke="#94a3b8" strokeWidth="4.5" strokeDasharray="3.2 3.083" strokeLinecap="butt" /><circle cx="12" cy="12" r="6.6" fill="#94a3b8" /><circle cx="12" cy="12" r="2.8" fill="#334155" /></>,
  cloud: <path d="M7 20a5 5 0 0 1-.8-9.900A6.5 6.5 0 0 1 18.7 9.7 5.2 5.2 0 0 1 18 20Z" fill="#93c5fd" />,
  friends: <><circle cx="16.5" cy="8" r="3.5" fill="#c4b5fd" /><path d="M10.5 21c0-4.5 2.5-7 6-7s6 2.5 6 7Z" fill="#a78bfa" /><circle cx="8.5" cy="8.5" r="4" fill="#7dd3fc" /><path d="M1.5 21c0-5 3-7.5 7-7.500s7 2.5 7 7.500Z" fill="#38bdf8" /></>,
  bulb: <><path d="M12 2a7 7 0 0 0-4 12.700c.7.5 1 1.1 1 2h6c0-.9.3-1.5 1-2A7 7 0 0 0 12 2Z" fill="#fde047" /><rect x="9" y="17.5" width="6" height="2" rx=".8" fill="#94a3b8" /><rect x="10" y="20" width="4" height="2" rx=".8" fill="#64748b" /></>,
  warn: <><path d="M10.3 3.500a2 2 0 0 1 3.4 0l8.2 14.500a2 2 0 0 1-1.7 3H3.800a2 2 0 0 1-1.7-3Z" fill="#fbbf24" /><path d="M12 9v5.5" {...S} stroke="#451a03" strokeWidth="2.4" /><circle cx="12" cy="17.8" r="1.4" fill="#451a03" /></>,
  check: <><circle cx="12" cy="12" r="10" fill="#10b981" /><path d="m7 12.5 3.5 3.500L17 9" {...S} stroke="#fff" strokeWidth="2.8" /></>,
  clipboard: <><rect x="4" y="4" width="16" height="18" rx="2.5" fill="#b45309" /><rect x="6.5" y="6.5" width="11" height="13" rx="1" fill="#f8fafc" /><rect x="8.5" y="2" width="7" height="4" rx="1.4" fill="#94a3b8" /><path d="M9 10.500h6M9 13.500h6M9 16.500h4" {...S} stroke="#60a5fa" strokeWidth="1.6" /></>,
  repeat: <path d="M4 11V9a3 3 0 0 1 3-3h12m-3-3.500L19.5 6 16 9.500M20 13v2a3 3 0 0 1-3 3H5m3 3.500L4.5 18 8 14.5" {...S} stroke="#34d399" strokeWidth="2.4" />,
  star: <path d="m12 2 3 6.5 7 .9-5.2 4.8 1.4 7-6.2-3.5-6.2 3.5 1.4-7L2 9.400l7-.9Z" fill="#fbbf24" />,
  sparkle: <><path d="M10 3c.8 4.5 2.5 6.2 7 7-4.5.8-6.2 2.5-7 7-.8-4.5-2.5-6.2-7-7 4.5-.8 6.2-2.5 7-7Z" fill="#c084fc" /><path d="M18.5 14c.4 2.2 1.3 3.1 3.5 3.5-2.2.4-3.1 1.3-3.5 3.5-.4-2.2-1.3-3.1-3.5-3.5 2.2-.4 3.1-1.3 3.5-3.500Z" fill="#fde047" /></>,
  lock: <><path d="M7.5 11V7.500a4.5 4.5 0 0 1 9 0V11" {...S} stroke="#94a3b8" strokeWidth="2.4" /><rect x="4" y="10.5" width="16" height="11" rx="2.5" fill="#f59e0b" /><circle cx="12" cy="15.5" r="1.8" fill="#78350f" /></>,
  swords: <><path d="M4 3l13 13M20 3 7 16" {...S} stroke="#cbd5e1" strokeWidth="2.4" /><path d="M14.5 18 18 14.500M9.5 18 6 14.5" {...S} stroke="#f59e0b" strokeWidth="2.4" /><path d="m18.5 18.5 2.5 2.500M5.5 18.5 3 21" {...S} stroke="#92400e" strokeWidth="2.6" /></>,
  tired: <><circle cx="12" cy="12" r="10" fill="#fbbf24" /><path d="m6.8 8.5 3 2.5-3 2M17.2 8.500l-3 2.5 3 2" {...S} stroke="#78350f" strokeWidth="1.8" /><ellipse cx="12" cy="16.5" rx="2.2" ry="1.8" fill="#78350f" /></>,
  smile: <><circle cx="12" cy="12" r="10" fill="#fbbf24" /><circle cx="8.5" cy="10" r="1.4" fill="#78350f" /><circle cx="15.5" cy="10" r="1.4" fill="#78350f" /><path d="M7.8 14.500c1.2 2 7.2 2 8.4 0" {...S} stroke="#78350f" strokeWidth="1.8" /></>,
  feather: <><path d="M20.5 3.500C13 3 6.5 7.5 6 15l3-.5 1.5-2 .5 1.500c5.5-.500 9-5 9.5-10.500Z" fill="#7dd3fc" /><path d="M3.5 20.5 14 10" {...S} stroke="#f8fafc" strokeWidth="1.6" /></>,
  band: <path d="M3 7c3-4 5 4 8 0s5 4 8 0M3 13c3-4 5 4 8 0s5 4 8 0M3 19c3-4 5 4 8 0s5 4 8 0" {...S} stroke="#a78bfa" strokeWidth="2.2" />,
  gauge: <><path d="M3 17a9 9 0 0 1 18 0Z" fill="#334155" /><path d="M3.5 17a8.5 8.5 0 0 1 4-7.2" {...S} stroke="#34d399" strokeWidth="3" /><path d="M9 8.900a8.5 8.5 0 0 1 6 0" {...S} stroke="#fbbf24" strokeWidth="3" /><path d="M16.5 9.800a8.5 8.5 0 0 1 4 7.2" {...S} stroke="#ef4444" strokeWidth="3" /><path d="m12 17 4-6" {...S} stroke="#f8fafc" strokeWidth="2.2" /></>,
  camera: <><path d="M8.5 4h7l1.5 3H7Z" fill="#94a3b8" /><rect x="2" y="6.5" width="20" height="14" rx="3" fill="#475569" /><circle cx="12" cy="13.5" r="4.8" fill="#e2e8f0" /><circle cx="12" cy="13.5" r="3" fill="#38bdf8" /><circle cx="18.5" cy="9.5" r="1" fill="#fbbf24" /></>,
  wind: <path d="M3 9h11a2.8 2.8 0 1 0-2.7-3.600M3 13h15.500a2.8 2.8 0 1 1-2.7 3.600M3 17h8a2.3 2.3 0 1 1-2.2 3" {...S} stroke="#7dd3fc" strokeWidth="2.2" />,
  flag: <><path d="M5 2.500V22" {...S} stroke="#94a3b8" strokeWidth="2.2" /><path d="M6 3.500c4-2 7 2 13 0v10c-6 2-9-2-13 0Z" fill="#ef4444" /></>,
  gift: <><rect x="3" y="8" width="18" height="4.5" rx="1" fill="#f472b6" /><rect x="4.5" y="12.5" width="15" height="9" rx="1.5" fill="#ec4899" /><rect x="10.5" y="8" width="3" height="13.5" fill="#fde047" /><path d="M12 8C10 3 5.5 2.5 6 5.5 6.3 7.5 9.5 8 12 8ZM12 8c2-5 6.5-5.5 6-2.500C17.7 7.5 14.5 8 12 8Z" fill="#fde047" /></>,
  save: <><path d="M4 3h13l4 4v13a1.5 1.5 0 0 1-1.5 1.500h-15A1.5 1.5 0 0 1 3 20V4.500A1.5 1.5 0 0 1 4 3Z" fill="#6366f1" /><rect x="7" y="3" width="9" height="6" rx=".8" fill="#e0e7ff" /><rect x="6.5" y="13" width="11" height="8.5" rx=".8" fill="#f8fafc" /></>,
  download: <><rect x="3" y="14" width="18" height="7.5" rx="2" fill="#475569" /><path d="M12 2.500V14m-5-5 5 5.500L17 9" {...S} stroke="#38bdf8" strokeWidth="2.8" /></>,
  sound: <><path d="M3 9.500h4L12.5 5v14L7 14.500H3Z" fill="#94a3b8" /><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.500a8 8 0 0 1 0 11" {...S} stroke="#38bdf8" strokeWidth="2" /></>,
  mute: <><path d="M3 9.500h4L12.5 5v14L7 14.500H3Z" fill="#94a3b8" /><path d="m15.5 9.5 5 5M20.5 9.500l-5 5" {...S} stroke="#ef4444" strokeWidth="2.2" /></>,
  text: <><rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="#60a5fa" /><path d="M7.5 17 12 7l4.5 10M9 14h6" {...S} stroke="#fff" strokeWidth="2.2" /></>,
  compass: <><circle cx="12" cy="12" r="10" fill="#f59e0b" /><circle cx="12" cy="12" r="7.5" fill="#f8fafc" /><path d="m16 8-5.5 2.500L8 16l5.5-2.500Z" fill="#ef4444" /></>,
  dna: <path d="M7 2.500c0 7 10 12 10 19M17 2.500c0 7-10 12-10 19M8.5 6h7M8.5 18h7M10 9h4M10 15h4" {...S} stroke="#a78bfa" strokeWidth="2" />,
  ...{},
  reset: <path d="M4.5 9A8.5 8.5 0 1 1 3.5 13M4 3.500V9h5.5" {...S} stroke="#f87171" strokeWidth="2.6" />,
};

Object.assign(ICONS, MORE);

export const ART_NAMES = Object.keys(ICONS);
export const LINE_NAMES = Object.keys(LINE);

// Deux dessins dans chaque icône : en couleur (thème classique) et au trait (thème néon, style « duo plein »).
// styles.css affiche l'un ou l'autre.
const body = name => {
  const line = LINE[name];
  if (!line) return ICONS[name];
  return <><g className="art-c">{ICONS[name]}</g><g className="art-l">{line}</g></>;
};

// Logo à la place d'un emoji : même taille que le texte autour
let emojiKey = 0;
const EM = '1.15em';
setEmojiRenderer(name => { emojiKey += 1; return <svg key={`e${emojiKey}`} viewBox="0 0 24 24" width={EM} height={EM} aria-hidden="true" className="art inline-block align-[-0.2em] shrink-0">{body(name)}</svg>; });

export function Art({ name, size = 18, bare = false, className = '' }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={`art ${bare ? '' : 'inline-block align-[-0.2em] mr-1.5'} shrink-0 ${className}`}>
      {body(name)}
    </svg>
  );
}
