import { useState, useRef, useCallback, useEffect } from 'react'
import { GlassesSdk } from 'even-toolkit/sdk-wrapper'
import type { EvenHubEvent } from '@evenrealities/even_hub_sdk'

export interface MicStreamState {
  active: boolean
  error: string | null
  /** 'g2' when streaming from G2 glasses, 'browser' when using the desktop mic fallback */
  mode: 'g2' | 'browser' | null
  start: () => Promise<void>
  stop: () => void
  restart: () => void
}

// ── Module-level PCM subscriber registry ─────────────────────────────────────
// Both G2 and browser paths emit s16le mono PCM into this registry so any
// consumer can subscribe without coupling to the mic source.

type PcmListener = (chunk: Uint8Array) => void
const pcmListeners = new Set<PcmListener>()

/**
 * Subscribe to raw PCM chunks (s16le, 16 kHz, mono) regardless of source.
 * Returns an unsubscribe function.
 */
export function subscribePcm(listener: PcmListener): () => void {
  pcmListeners.add(listener)
  return () => pcmListeners.delete(listener)
}

// ── G2 probe ─────────────────────────────────────────────────────────────────

/** Returns true if a PCM chunk arrives within timeoutMs, false otherwise. */
function probeForG2Pcm(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const unsub = subscribePcm(() => {
      unsub()
      resolve(true)
    })
    setTimeout(() => {
      unsub()
      resolve(false)
    }, timeoutMs)
  })
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Dual-mode mic controller.
 *
 * Primary: G2 glasses via bridge.audioControl() — PCM arrives over Bluetooth.
 * Fallback: browser getUserMedia() + Web Audio API — Float32 frames converted
 *   to s16le and emitted via the same subscribePcm() channel.
 */
export function useMicStream(): MicStreamState {
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'g2' | 'browser' | null>(null)

  // activeRef mirrors `active` state but is readable synchronously — used in
  // start/stop so that restart() (stop then immediate start) works without
  // waiting for a React re-render to observe the state change.
  const activeRef = useRef(false)
  const startingRef = useRef(false)

  // G2 SDK refs
  const sdkRef = useRef<GlassesSdk | null>(null)
  const listenerRef = useRef<((event: EvenHubEvent) => void) | null>(null)

  // Browser mic refs
  const browserStreamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null)

  // Register a GlassesSdk event listener once to forward PCM chunks to subscribers
  useEffect(() => {
    const sdk = new GlassesSdk()
    sdkRef.current = sdk

    const handler = (event: EvenHubEvent) => {
      const pcm = event.audioEvent?.audioPcm
      if (pcm && pcm.length > 0) {
        pcmListeners.forEach((cb) => cb(pcm))
      }
    }
    listenerRef.current = handler
    sdk.addEventListener(handler)

    return () => {
      if (listenerRef.current) sdk.removeEventListener(listenerRef.current)
    }
  }, [])

  const startBrowserMic = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, channelCount: 1 },
    })
    browserStreamRef.current = stream

    // 16 kHz matches the G2 PCM format so useDecibels sees consistent data from both sources
    const ctx = new AudioContext({ sampleRate: 16_000 })
    audioCtxRef.current = ctx

    const source = ctx.createMediaStreamSource(stream)

    // 4096 samples @ 16 kHz = ~256 ms per chunk — fine for the 150 ms dB throttle.
    // ScriptProcessorNode is deprecated but still fully supported in all Chromium browsers.
    const scriptNode = ctx.createScriptProcessor(4096, 1, 1)
    scriptNodeRef.current = scriptNode

    scriptNode.onaudioprocess = (ev) => {
      const float32 = ev.inputBuffer.getChannelData(0)
      // Convert Float32 [-1, 1] → Int16 [-32768, 32767], matching G2 s16le format
      const int16 = new Int16Array(float32.length)
      for (let i = 0; i < float32.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32767)))
      }
      pcmListeners.forEach((cb) => cb(new Uint8Array(int16.buffer)))
    }

    // Route through a silent gain node so the processor runs without producing output
    const silent = ctx.createGain()
    silent.gain.value = 0
    source.connect(scriptNode)
    scriptNode.connect(silent)
    silent.connect(ctx.destination)
  }, [])

  const stopBrowserMic = useCallback(() => {
    scriptNodeRef.current?.disconnect()
    scriptNodeRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    browserStreamRef.current?.getTracks().forEach((t) => t.stop())
    browserStreamRef.current = null
  }, [])

  // `start` does not depend on the `active` state value — it reads activeRef
  // instead, which is updated synchronously in both start and stop. This keeps
  // `start` stable across renders and allows restart() to call stop+start
  // without waiting for a React re-render cycle.
  const start = useCallback(async () => {
    if (activeRef.current || startingRef.current) return
    startingRef.current = true
    activeRef.current = true  // optimistic; reset to false in the catch block
    setError(null)
    try {
      const bridge = GlassesSdk.bridge
      if (bridge) {
        // G2 bridge exists — enable audio and probe for real PCM within 600 ms.
        await bridge.audioControl(true)
        const g2Live = await probeForG2Pcm(600)
        if (g2Live) {
          setMode('g2')
          setActive(true)
          return
        }
        // No PCM arrived — glasses not actually streaming; disable and fall through.
        bridge.audioControl(false).catch(() => {})
      }
      // Browser fallback: getUserMedia + Web Audio → same PCM channel
      await startBrowserMic()
      setMode('browser')
      setActive(true)
    } catch {
      activeRef.current = false
      setError('Microphone unavailable — check browser permissions or glasses connection.')
    } finally {
      startingRef.current = false
    }
  }, [startBrowserMic])

  const stop = useCallback(() => {
    const bridge = GlassesSdk.bridge
    if (bridge) bridge.audioControl(false).catch(() => {})
    stopBrowserMic()
    activeRef.current = false  // synchronous so restart() can call start() immediately
    startingRef.current = false
    setActive(false)
    setMode(null)
  }, [stopBrowserMic])

  // Stops the current stream and immediately retries — useful as an error recovery
  // action. Works without a re-render delay because stop() updates activeRef
  // synchronously before start() checks it.
  const restart = useCallback(() => {
    stop()
    start()
  }, [stop, start])

  useEffect(() => {
    return () => {
      const bridge = GlassesSdk.bridge
      if (bridge) bridge.audioControl(false).catch(() => {})
      stopBrowserMic()
    }
  }, [stopBrowserMic])

  return { active, error, mode, start, stop, restart }
}
