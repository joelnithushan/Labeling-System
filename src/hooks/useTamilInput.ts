import { useCallback } from 'react'

const PULLI = '்'

const CONSONANT_BASES = new Set([
  'க','ங','ச','ஞ','ட','ண','த','ந','ப','ம',
  'ய','ர','ல','வ','ழ','ள','ற','ன',
])

const VOWELS = new Set(['அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ','ஒ','ஓ','ஔ'])

const VOWEL_SIGNS: Record<string, string> = {
  'அ': '',
  'ஆ': 'ா',
  'இ': 'ி',
  'ஈ': 'ீ',
  'உ': 'ு',
  'ஊ': 'ூ',
  'எ': 'ெ',
  'ஏ': 'ே',
  'ஐ': 'ை',
  'ஒ': 'ொ',
  'ஓ': 'ோ',
  'ஔ': 'ௌ',
}

export function useTamilInput(
  value: string,
  onChange: (v: string) => void,
  inputRef: React.RefObject<HTMLInputElement>,
) {
  const appendChar = useCallback(
    (char: string) => {
      const input = inputRef.current
      const start = input?.selectionStart ?? value.length
      const end = input?.selectionEnd ?? value.length

      let before = value.slice(0, start)
      const after = value.slice(end)

      // Combining: vowel after consonant+pulli → replace pulli with vowel sign
      if (VOWELS.has(char) && before.length >= 2) {
        const lastChar = before[before.length - 1]
        const secondLast = before[before.length - 2]
        if (lastChar === PULLI && CONSONANT_BASES.has(secondLast)) {
          const sign = VOWEL_SIGNS[char]
          const newBefore = before.slice(0, -1) // remove pulli
          const newValue = newBefore + sign + after
          onChange(newValue)
          const newPos = newBefore.length + sign.length
          requestAnimationFrame(() => input?.setSelectionRange(newPos, newPos))
          return
        }
      }

      const newValue = before + char + after
      onChange(newValue)
      const newPos = before.length + char.length
      requestAnimationFrame(() => input?.setSelectionRange(newPos, newPos))
    },
    [value, onChange, inputRef],
  )

  const handleBackspace = useCallback(() => {
    const input = inputRef.current
    const start = input?.selectionStart ?? value.length
    const end = input?.selectionEnd ?? value.length

    if (start !== end) {
      const newValue = value.slice(0, start) + value.slice(end)
      onChange(newValue)
      requestAnimationFrame(() => input?.setSelectionRange(start, start))
    } else if (start > 0) {
      const newValue = value.slice(0, start - 1) + value.slice(start)
      onChange(newValue)
      const newPos = start - 1
      requestAnimationFrame(() => input?.setSelectionRange(newPos, newPos))
    }
  }, [value, onChange, inputRef])

  const handleClear = useCallback(() => onChange(''), [onChange])

  const appendSpace = useCallback(() => appendChar(' '), [appendChar])

  return { appendChar, handleBackspace, handleClear, appendSpace }
}
