import { useState, useRef, useEffect } from 'react'
import TamilKeyboard from './TamilKeyboard'
import { useTamilInput } from '../hooks/useTamilInput'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  id?: string
  required?: boolean
}

export default function TamilInput({
  value,
  onChange,
  placeholder,
  className = '',
  autoFocus,
  id,
  required,
}: Props) {
  const [showKeyboard, setShowKeyboard] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { appendChar, handleBackspace, handleClear, appendSpace } = useTamilInput(
    value,
    onChange,
    inputRef,
  )

  useEffect(() => {
    if (!showKeyboard) return
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowKeyboard(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showKeyboard])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${className} pr-8`}
          autoFocus={autoFocus}
          required={required}
          style={{ fontFamily: "'Noto Sans Tamil', 'Inter', sans-serif" }}
        />
        <button
          type="button"
          onMouseDown={e => {
            e.preventDefault()
            setShowKeyboard(v => !v)
            inputRef.current?.focus()
          }}
          className={`absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold transition-colors ${
            showKeyboard ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'
          }`}
          title="Tamil keyboard (த)"
          tabIndex={-1}
          style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}
        >
          த
        </button>
      </div>

      {showKeyboard && (
        <div className="absolute top-full mt-1 left-0 z-50">
          <TamilKeyboard
            onChar={char => {
              appendChar(char)
              inputRef.current?.focus()
            }}
            onBackspace={() => {
              handleBackspace()
              inputRef.current?.focus()
            }}
            onClear={() => {
              handleClear()
              inputRef.current?.focus()
            }}
            onSpace={() => {
              appendSpace()
              inputRef.current?.focus()
            }}
            onDone={() => setShowKeyboard(false)}
          />
        </div>
      )}
    </div>
  )
}
