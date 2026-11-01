export function CoachAdvice({ advice, missedMsgs }) {
  return (
    <section className="space-y-2">
      {advice.map((a, i) => (
        <div key={'a' + i} className="bg-sky-950/30 border border-sky-500/40 rounded-xl p-3 text-xs text-sky-100">{a.icon} {a.text}</div>
      ))}
      {missedMsgs.map((m, i) => (
        <div key={'m' + i} className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-100">{m}</div>
      ))}
    </section>
  );
}
