const VOWELS = ['அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ','ஒ','ஓ','ஔ']
const CONSONANTS = [
  'க்','ங்','ச்','ஞ்','ட்','ண்',
  'த்','ந்','ப்','ம்','ய்','ர்',
  'ல்','வ்','ழ்','ள்','ற்','ன்',
]

interface Props {
  onChar: (char: string) => void
  onBackspace: () => void
  onClear: () => void
  onDone: () => void
  onSpace: () => void
}

export default function TamilKeyboard({ onChar, onBackspace, onClear, onDone, onSpace }: Props) {
  return (
    <div
      className="bg-white rounded-xl shadow-2xl border border-slate-200 p-3 w-80 select-none"
      style={{ fontFamily: "'Noto Sans Tamil', sans-serif", zIndex: 50 }}
    >
      {/* Vowels */}
      <div className="mb-2">
        <p className="text-xs text-slate-400 mb-1.5">உயிர் எழுத்து</p>
        <div className="flex flex-wrap gap-1">
          {VOWELS.map(v => (
            <Key key={v} label={v} onClick={() => onChar(v)} />
          ))}
        </div>
      </div>

      {/* Consonants */}
      <div className="mb-2">
        <p className="text-xs text-slate-400 mb-1.5">மெய் எழுத்து</p>
        <div className="grid grid-cols-6 gap-1">
          {CONSONANTS.map(c => (
            <Key key={c} label={c} onClick={() => onChar(c)} />
          ))}
        </div>
      </div>

      {/* Special keys */}
      <div className="flex gap-1 pt-1 border-t border-slate-100">
        <button
          onMouseDown={e => { e.preventDefault(); onSpace() }}
          className="flex-1 h-9 rounded-lg bg-slate-100 hover:bg-amber-50 active:bg-amber-200 text-slate-700 text-xs font-medium transition-colors"
        >
          Space
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); onBackspace() }}
          className="h-9 px-3 rounded-lg bg-slate-100 hover:bg-amber-50 active:bg-amber-200 text-slate-700 text-sm transition-colors"
          title="Backspace"
        >
          ⌫
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); onClear() }}
          className="h-9 px-3 rounded-lg bg-slate-100 hover:bg-red-50 active:bg-red-100 text-slate-700 text-xs font-medium transition-colors"
        >
          Clear
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); onDone() }}
          className="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-xs font-semibold transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}

function Key({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className="h-9 min-w-[36px] px-1 rounded-lg bg-slate-100 hover:bg-amber-50 active:bg-amber-200 text-slate-800 text-base transition-colors flex items-center justify-center"
      style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}
    >
      {label}
    </button>
  )
}
