'use client'

import { useLocale } from '@payloadcms/ui'
import { useCallback, useEffect, useRef, type TextareaHTMLAttributes } from 'react'

const MIN_HEIGHT_PX = 88
/** Grow with content on the page; only scroll inside the field for very long drafts. */
const MAX_HEIGHT_VH = 0.75
const MAX_HEIGHT_PX = 720

export function AutoGrowTextarea({
  value,
  onChange,
  className,
  disabled,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}) {
  const locale = useLocale()
  const spellLang = locale?.code === 'de' ? 'de' : 'en'
  const ref = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const el = ref.current
    if (!el) return

    el.style.height = 'auto'
    const maxHeight = Math.min(window.innerHeight * MAX_HEIGHT_VH, MAX_HEIGHT_PX)
    const next = Math.max(MIN_HEIGHT_PX, el.scrollHeight)
    el.style.height = `${Math.min(next, maxHeight)}px`
    el.style.overflowY = next > maxHeight ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  useEffect(() => {
    window.addEventListener('resize', adjustHeight)
    return () => window.removeEventListener('resize', adjustHeight)
  }, [adjustHeight])

  return (
    <textarea
      {...rest}
      ref={ref}
      className={className}
      value={value}
      disabled={disabled}
      spellCheck={true}
      lang={spellLang}
      autoCorrect="on"
      autoCapitalize="sentences"
      rows={1}
      onChange={(e) => {
        onChange(e)
        requestAnimationFrame(adjustHeight)
      }}
    />
  )
}
