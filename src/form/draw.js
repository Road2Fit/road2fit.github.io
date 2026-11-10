// Dessin du squelette néon par-dessus la vidéo (caméra en direct et extraits), même cadrage que la vidéo (object-contain).
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32]];

export function neonColor() {
  try { return getComputedStyle(document.documentElement).getPropertyValue('--neon').trim() || '#c6ff3d'; } catch (e) { return '#c6ff3d'; }
}

export function drawSkeleton(canvas, video, lm, { aspect = 9 / 16, color = '#c6ff3d' } = {}) {
  if (!canvas || !canvas.getContext) return;
  let ctx = null;
  try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }
  if (!ctx) return;
  const cw = canvas.clientWidth, ch = canvas.clientHeight, dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(cw * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  if (!lm) return;
  const vw = (video && video.videoWidth) || aspect * 1000, vh = (video && video.videoHeight) || 1000;
  const s = Math.min(cw / vw, ch / vh), ox = (cw - vw * s) / 2, oy = (ch - vh * s) / 2;
  const X = p => ox + p.x * vw * s, Y = p => oy + p.y * vh * s;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  for (const [a, b] of BONES) {
    const A = lm[a], B = lm[b];
    if (!A || !B || (A.visibility ?? 1) < 0.4 || (B.visibility ?? 1) < 0.4) continue;
    ctx.globalAlpha = Math.min(A.visibility ?? 1, B.visibility ?? 1);
    ctx.beginPath(); ctx.moveTo(X(A), Y(A)); ctx.lineTo(X(B), Y(B)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  for (let i = 11; i < 33; i++) {
    const p = lm[i];
    if (!p || (p.visibility ?? 1) < 0.4) continue;
    ctx.beginPath(); ctx.arc(X(p), Y(p), 4, 0, Math.PI * 2); ctx.fill();
  }
}

/** Repères de l'image la plus proche d'un instant (ms, même horloge que les images). */
export function frameAt(frames, t) {
  if (!frames || !frames.length) return null;
  let lo = 0, hi = frames.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (frames[m].t < t) lo = m + 1; else hi = m; }
  const a = frames[Math.max(0, lo - 1)], b = frames[lo];
  return (Math.abs(a.t - t) < Math.abs(b.t - t) ? a : b).lm || null;
}
