import { useEffect, useRef } from 'react'

export default function CampoAutoAjustavel({ value, className = '', minRows = 3, onKeyDown, ...props }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      onKeyDown={onKeyDown}
      className={`resize-none overflow-hidden ${className}`}
      {...props}
    />
  )
}
