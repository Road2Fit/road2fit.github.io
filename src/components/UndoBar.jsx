export function UndoBar({ handleUndo, undoInfo }) {
  return (
    <div className="fixed bottom-4 left-4 z-50 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 text-sm">
      <span className="text-slate-200">{undoInfo.label}</span>
      <button onClick={handleUndo} className="font-black text-pink-300 hover:text-pink-200 underline">Annuler</button>
    </div>
  );
}
