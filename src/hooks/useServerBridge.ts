import { useEffect, useRef } from 'react'

/** Events pushed from the Vite plugin via SSE */
export type BridgeMessage =
  | {
      type: 'notification'
      app: string
      appEmoji?: string
      title: string
      body: string
      priority?: 'urgent' | 'normal'
    }
  | {
      type: 'health'
      steps: number
      calories: number
    }

/**
 * Opens an SSE connection to /events and calls onMessage for each server push.
 * Automatically reconnects after a 5-second delay if the connection drops.
 */
export function useServerBridge(onMessage: (msg: BridgeMessage) => void) {
  const cbRef = useRef(onMessage)
  cbRef.current = onMessage

  useEffect(() => {
    let es: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    function connect() {
      if (disposed) return
      es = new EventSource('/events')

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as BridgeMessage
          cbRef.current(data)
        } catch {
          // ignore malformed messages
        }
      }

      es.onerror = () => {
        es?.close()
        es = null
        if (!disposed) {
          retryTimer = setTimeout(connect, 5000)
        }
      }
    }

    connect()

    return () => {
      disposed = true
      es?.close()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [])
}
