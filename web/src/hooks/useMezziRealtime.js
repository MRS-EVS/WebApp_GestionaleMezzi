import { useEffect } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_BASE_URL } from '../api/client'

export function useMezziRealtime(onUpdate) {
  useEffect(() => {
    let disposed = false
    let retryTimer = null

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/mezzi`, { withCredentials: false })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('MezziAggiornati', onUpdate)

    const start = async () => {
      try {
        await connection.start()
      } catch (err) {
        if (disposed) return
        console.warn('Aggiornamento realtime non disponibile, nuovo tentativo tra 5 secondi:', err)
        retryTimer = window.setTimeout(start, 5000)
      }
    }

    start()

    return () => {
      disposed = true
      if (retryTimer) window.clearTimeout(retryTimer)
      connection.off('MezziAggiornati', onUpdate)
      connection.stop().catch(() => {})
    }
  }, [onUpdate])
}
