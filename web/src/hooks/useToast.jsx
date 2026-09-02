import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg, type = 'success', duration = 3500) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), duration)
  }, [])

  const ToastEl = toast ? (
    <div className={`toast ${toast.type}`}>{toast.msg}</div>
  ) : null

  return { showToast, ToastEl }
}
