import { useState, useEffect, useRef } from 'react'
import { subscribePcm } from './useMicStream'

export interface DecibelState {
  db: number | null
}

// G2 mic: s16le @ 16 kHz, mono.  Two bytes per sample, little-endian.
function pcmToDb(chunk: Uint8Array): number {
  const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
  const sampleCount = Math.floor(chunk.byteLength / 2)
  if (sampleCount === 0) return 0

  let sumSq = 0
  for (let i = 0; i < sampleCount; i++) {
    const s = view.getInt16(i * 2, true) // little-endian
    sumSq += s * s
  }
  const rms = Math.sqrt(sumSq / sampleCount)
  if (rms < 1) return 0
  // Map 16-bit full-scale to a 0-100 range centred around typical speech levels.
  return Math.max(0, Math.min(100, 20 * Math.log10(rms / 32768) + 90))
}

const THROTTLE_MS = 150 // minimum ms between React state updates

/**
 * Real-time dB meter driven by G2 glasses PCM audio.
 * Subscribes to raw PCM chunks via `subscribePcm`; returns null when inactive.
 */
export function useDecibels(active: boolean): DecibelState {
  const [db, setDb] = useState<number | null>(null)
  const lastUpdateRef = useRef<number>(0)

  useEffect(() => {
    if (!active) {
      setDb(null)
      return
    }

    const unsub = subscribePcm((chunk) => {
      const now = performance.now()
      if (now - lastUpdateRef.current < THROTTLE_MS) return
      lastUpdateRef.current = now
      setDb(pcmToDb(chunk))
    })

    return () => {
      unsub()
      setDb(null)
    }
  }, [active])

  return { db }
}
