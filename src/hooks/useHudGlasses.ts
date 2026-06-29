/**
 * useHudGlasses — custom glasses display hook using GlassesSdk directly.
 *
 * Creates a page with overlapping text containers at absolute pixel
 * positions on the 576×288 G2 display. Each container is updated in-place
 * via updateWithEvenHubSdk() — no full page rebuilds, no flicker.
 *
 * Container map (5 px invisible border on all sides; usable area x:5–571, y:5–283):
 *   [0] Event capture  x:0,   y:0,   w:576, h:288  (invisible touch target — full screen)
 *   [1] Clock          x:360, y:30,  w:211, h:258  (bottom = 288 — suppresses firmware scroll indicator)
 *   [2] Weather        x:360, y:57,  w:211, h:231
 *   [3] Decibels       x:360, y:111, w:211, h:177  (used when weather is ON + location known)
 *   [4] Decibels alt   x:360, y:57,  w:211, h:231  (used when weather is OFF or no location — shares weather slot)
 */
import { useEffect, useRef } from 'react'
import { EvenHubBridge } from 'even-toolkit/bridge'
import { GlassesSdk, GlassesTextElement } from 'even-toolkit/sdk-wrapper'
import { mapGlassEvent } from 'even-toolkit/action-map'
import { bindKeyboard } from 'even-toolkit/keyboard'
import { activateKeepAlive, deactivateKeepAlive } from 'even-toolkit/keep-alive'
import { OsEventTypeList, type LaunchSource, type EvenHubEvent } from '@evenrealities/even_hub_sdk'
import { appSplash } from '../glass/splash'
import type { HudSnapshot } from '../glass/shared'

interface Elements {
  eventCapture: GlassesTextElement
  clock: GlassesTextElement
  weather: GlassesTextElement
  decibels: GlassesTextElement
  decibelsAlt: GlassesTextElement
}

// ── Text formatters ──────────────────────────────────────────────────────────

function clockText(snapshot: HudSnapshot): string {
  if (!snapshot.clockEnabled || snapshot.hidden) return ' '
  return snapshot.timeStr
}

function weatherText(snapshot: HudSnapshot): string {
  if (snapshot.hidden) return ' '
  if (!snapshot.locationKnown) return ' '
  if (!snapshot.weather) return 'Weather loading...'
  const w = snapshot.weather
  return `${w.temp}°F  ${w.condition}\nFeels like ${w.feelsLike}°F`
}

function decibelsText(snapshot: HudSnapshot): string {
  // Return a single space (not '') when inactive — the G2 firmware silently
  // drops empty-string content updates and leaves stale text visible.
  if (!snapshot.showDecibels || !snapshot.micActive || snapshot.db === null) return ' '
  return `Mic: ${Math.round(snapshot.db)} dB`
}

// Routes dB text to the correct container based on weather + location state.
// When weather is off or no location is set, decibelsAlt occupies the weather
// slot (y:57) so there is no gap between the clock and the decibels readout.
function decibelsRouted(snapshot: HudSnapshot): { main: string; alt: string } {
  if (snapshot.hidden) return { main: ' ', alt: ' ' }
  const text = decibelsText(snapshot)
  return (snapshot.weatherEnabled && snapshot.locationKnown)
    ? { main: text, alt: ' ' }
    : { main: ' ', alt: text }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHudGlasses(snapshot: HudSnapshot, onDoubleClick?: () => void) {
  const snapshotRef = useRef<HudSnapshot>(snapshot)
  snapshotRef.current = snapshot

  // Keep the latest callback in a ref so the closure-bound event handler
  // always calls the current version without needing to re-register.
  const onDoubleClickRef = useRef(onDoubleClick)
  onDoubleClickRef.current = onDoubleClick

  // Debounce ref: prevents double-fire if the firmware/simulator sends
  // duplicate DOUBLE_CLICK events within a short window.
  const lastDoubleClickTimeRef = useRef(0)

  const elementsRef = useRef<Elements | null>(null)
  const sdkRef = useRef<GlassesSdk | null>(null)
  const readyRef = useRef(false)
  // Item 7: track launch source for adaptive behaviour (glassesMenu = user is already wearing)
  const launchSourceRef = useRef<LaunchSource | null>(null)

  // ── Initialize once ────────────────────────────────────────────────────────
  useEffect(() => {
    let disposed = false
    // Items 1, 6, 7: collect cleanup functions from async subscriptions so the
    // synchronous cleanup return can reliably unsubscribe everything.
    const cleanupFns: Array<() => void> = []

    async function init() {
      try {
        // 1. Initialize via EvenHubBridge (handles underlying SDK init + splash)
        const bridge = new EvenHubBridge()
        await bridge.init()
        if (disposed) return

        // Expose for dev tools / STT
        ;(window as any).__evenBridge = bridge

        // Item 7: register onLaunchSource immediately after bridge init, before
        // the splash, so we don't miss the one-shot event the host fires on load.
        if (bridge.rawBridge) {
          cleanupFns.push(
            bridge.rawBridge.onLaunchSource((source) => {
              launchSourceRef.current = source
              console.log('[HUD] Launch source:', source)
            })
          )
        }
        if (disposed) return

        // 2. Show splash
        await appSplash.show(bridge)
        if (disposed) return

        // 3. Build custom HUD page using GlassesSdk
        const sdk = new GlassesSdk()
        sdkRef.current = sdk

        const hudPage = sdk.createPage('hud')

        // Container definitions
        type ContainerDef = {
          key: keyof Elements
          x: number; y: number; w: number; h: number
          eventCapture?: boolean
          initial: string
        }

        const defs: ContainerDef[] = [
          { key: 'eventCapture', x: 0,   y: 0,   w: 576, h: 288, eventCapture: true, initial: ' ' },
          { key: 'clock',        x: 360, y: 30,  w: 211, h: 258, initial: '' },
          { key: 'weather',      x: 360, y: 57,  w: 211, h: 231, initial: '' },
          { key: 'decibels',     x: 360, y: 111, w: 211, h: 177, initial: ' ' },
          { key: 'decibelsAlt',  x: 360, y: 57,  w: 211, h: 231, initial: ' ' },
        ]

        const els: Partial<Elements> = {}
        for (const def of defs) {
          const el = hudPage.addTextElement(def.initial)
          el.setPosition((p) => { p.setX(def.x); p.setY(def.y) })
          el.setSize((s) => { s.setWidth(def.w); s.setHeight(def.h) })
          el.setBorder((b) => { b.setWidth(0); b.setColor('0'); b.setRadius(0) })
          if (def.eventCapture) {
            hudPage.setEventCaptureElement(el)
          }
          els[def.key] = el
        }
        elementsRef.current = els as Elements

        // 4. Wait for splash min time, then clear + show HUD
        await appSplash.waitMinTime()
        if (disposed) return
        await appSplash.clearExtras(bridge)
        if (disposed) return

        // Initial text
        const snap = snapshotRef.current
        const db = decibelsRouted(snap)
        els.clock!.setContent(clockText(snap))
        els.weather!.setContent(weatherText(snap))
        els.decibels!.setContent(db.main)
        els.decibelsAlt!.setContent(db.alt)

        await sdk.renderPage(hudPage)
        if (disposed) return

        readyRef.current = true

        // ── Item 2: foreground re-enter & Item 6: device reconnect helper ──────
        // refreshing flag prevents concurrent calls (SDK event + browser event
        // can both fire when the app resumes — only the first should proceed).
        let refreshing = false
        async function refreshAndRender() {
          if (refreshing) return
          refreshing = true
          readyRef.current = false
          try {
            const s = snapshotRef.current
            const db = decibelsRouted(s)
            els.clock!.setContent(clockText(s))
            els.weather!.setContent(weatherText(s))
            els.decibels!.setContent(db.main)
            els.decibelsAlt!.setContent(db.alt)
            await sdk.renderPage(hudPage)
            readyRef.current = true
          } catch {
            // Render failed — stay not-ready; onDeviceStatusChanged will retry.
          } finally {
            refreshing = false
          }
        }

        // 5. Event handling
        const onEvenHubEvent = (event: EvenHubEvent) => {
          // Double-click: check in every wrapper type before anything else.
          // We bypass mapGlassEvent here to avoid tryConsumeTap's 220 ms cooldown,
          // which fires after a preceding CLICK_EVENT and silently drops the
          // DOUBLE_CLICK_EVENT that the simulator sends immediately after.
          const rawEv = event.textEvent ?? event.listEvent ?? event.sysEvent
          if (rawEv?.eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
            const now = Date.now()
            if (now - lastDoubleClickTimeRef.current > 500) {
              lastDoubleClickTimeRef.current = now
              onDoubleClickRef.current?.()
            }
            return
          }

          // Item 2: remaining system lifecycle events — foreground enter/exit.
          if (event.sysEvent) {
            const { eventType } = event.sysEvent
            if (eventType === OsEventTypeList.FOREGROUND_EXIT_EVENT) {
              readyRef.current = false
            } else if (eventType === OsEventTypeList.FOREGROUND_ENTER_EVENT) {
              void refreshAndRender()
            }
            return
          }

          // All other events (single click, scroll) via mapGlassEvent.
          mapGlassEvent(event)
        }

        sdk.addEventListener(onEvenHubEvent)
        cleanupFns.push(() => sdk.removeEventListener(onEvenHubEvent))

        // Native browser lifecycle — catches iOS screen-off idle recovery which
        // the SDK FOREGROUND_ENTER_EVENT misses when the WebView is suspended.
        const onVisible = () => {
          if (document.visibilityState === 'visible') void refreshAndRender()
        }
        const onFocus = () => void refreshAndRender()
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('focus', onFocus)
        cleanupFns.push(
          () => document.removeEventListener('visibilitychange', onVisible),
          () => window.removeEventListener('focus', onFocus),
        )

        // Heartbeat: re-render all display content every 30 s.
        // iOS throttles JS timers when the screen is idle, which slows React
        // state updates and causes the clock/weather/mic readouts to go stale.
        // This heartbeat bypasses the reactive layer and pushes current snapshot
        // values directly to the glasses on a fixed interval.
        const heartbeat = setInterval(() => {
          if (!disposed) void refreshAndRender()
        }, 30_000)
        cleanupFns.push(() => clearInterval(heartbeat))

        // Item 6: device disconnect / reconnect.
        if (bridge.rawBridge) {
          cleanupFns.push(
            bridge.rawBridge.onDeviceStatusChanged((status) => {
              if (status.isDisconnected() || status.isConnectionFailed()) {
                readyRef.current = false
              } else if (status.isConnected() && !readyRef.current) {
                void refreshAndRender()
              }
            })
          )
        }

      } catch {
        // Glasses not connected — web companion still works
      }
    }

    // Keyboard: Escape / Backspace → double-click (for desktop simulator testing).
    const unbindKeyboard = bindKeyboard((action) => {
      if (action.type === 'GO_BACK') {
        const now = Date.now()
        if (now - lastDoubleClickTimeRef.current > 500) {
          lastDoubleClickTimeRef.current = now
          onDoubleClickRef.current?.()
        }
      }
    })

    activateKeepAlive('simple_hud_keep_alive')
    init()

    return () => {
      disposed = true
      readyRef.current = false
      for (const fn of cleanupFns) fn()
      unbindKeyboard()
      deactivateKeepAlive()
      ;(window as any).__evenBridge = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Per-field reactive updates ─────────────────────────────────────────────
  // Each useEffect watches only the field(s) its container cares about,
  // so only that one container gets updated — no unnecessary writes.

  useEffect(() => {
    if (!readyRef.current) return
    const el = elementsRef.current?.clock
    if (!el) return
    el.setContent(clockText(snapshot)).updateWithEvenHubSdk()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.timeStr, snapshot.clockEnabled, snapshot.hidden])

  useEffect(() => {
    if (!readyRef.current) return
    const el = elementsRef.current?.weather
    if (!el) return
    el.setContent(weatherText(snapshot)).updateWithEvenHubSdk()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.weather, snapshot.locationKnown, snapshot.hidden])

  useEffect(() => {
    if (!readyRef.current) return
    const els = elementsRef.current
    if (!els) return
    const { main, alt } = decibelsRouted(snapshotRef.current)
    els.decibels.setContent(main).updateWithEvenHubSdk()
    els.decibelsAlt.setContent(alt).updateWithEvenHubSdk()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.db, snapshot.showDecibels, snapshot.micActive, snapshot.weatherEnabled, snapshot.locationKnown, snapshot.hidden])

}
