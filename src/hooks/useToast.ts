import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastKind = 'info' | 'success' | 'error'

export type ToastState = {
  message: string
  kind: ToastKind
  linkHref?: string
  linkLabel?: string
} | null

const DURATION_MS: Record<ToastKind, number> = {
  info: 5000,
  success: 6000,
  error: 20000,
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const clear = useCallback(() => {
    clearTimer()
    setToast(null)
  }, [clearTimer])

  const show = useCallback(
    (message: string, kind: ToastKind = 'info', link?: { href: string; label: string }) => {
      clearTimer()
      setToast({
        message,
        kind,
        linkHref: link?.href,
        linkLabel: link?.label,
      })
      timerRef.current = window.setTimeout(() => {
        setToast(null)
        timerRef.current = null
      }, DURATION_MS[kind])
    },
    [clearTimer],
  )

  useEffect(() => () => clearTimer(), [clearTimer])

  return { toast, show, clear }
}
