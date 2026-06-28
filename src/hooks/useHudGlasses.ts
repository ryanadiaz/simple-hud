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
 *   [3] Decibels       x:360, y:111, w:211, h:177  (used when weather is ON)
 *   [4] Decibels alt   x:360, y:57,  w:211, h:231  (used when weather is OFF — shares weather slot)
 *   [5] Reticle main   x:278, y:104, w:20,  h:81   (3-line: top tick / center / bottom tick)
 *   [6] Reticle left   x:258, y:131, w:20,  h:27   (left tick — ─ for circle, else space)
 *   [7] Reticle right  x:298, y:131, w:20,  h:27   (right tick — ─ for circle, else space)
 *
 * Reticle characters (all verified 20px wide in firmware font):
 *   cross    ┼   single char, ticks built-in
 *   circle   ○ with │ top/bottom + ─ left/right flanking containers
 *   bullseye ◎  single char
 *   diamond  ◆  single char
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
  reticleMain: GlassesTextElement
  reticleLeft: GlassesTextElement
  reticleRight: GlassesTextElement
}

// ── Text formatters ──────────────────────────────────────────────────────────

function clockText(snapshot: HudSnapshot): string {
  if (snapshot.funModeData) return snapshot.funModeData.matchTimerStr
  if (!snapshot.clockEnabled || snapshot.hidden) return ' '
  return snapshot.timeStr
}

function weatherText(snapshot: HudSnapshot): string {
  if (snapshot.funModeData) return snapshot.funModeData.weaponAmmoText
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

// Routes dB text to the correct container based on weather state.
// When weather is off, decibelsAlt occupies the weather slot (y:57) so there
// is no gap between the clock and the decibels readout.
// In Fun Mode, HP+Armor goes to the main (y:111) container; alt stays blank.
function decibelsRouted(snapshot: HudSnapshot): { main: string; alt: string } {
  if (snapshot.funModeData) return { main: snapshot.funModeData.hpArmorText, alt: ' ' }
  if (snapshot.hidden) return { main: ' ', alt: ' ' }
  const text = decibelsText(snapshot)
  return snapshot.weatherEnabled
    ? { main: text, alt: ' ' }
    : { main: ' ',  alt: text }
}

// Returns a 10-line string for the full 576×288 eventCapture container (z-order 0).
// Fun Mode: top/bottom border + compass bar on line 1 + threat indicator on line 4.
// Compass and threat only occupy the left portion (x:0–359); the clock column
// (x:360+) sits on top of this container and covers the right portion.
//
// Line y-offsets (27 px per line): 0→0, 1→27, 2→54, 3→81, 4→108 … 9→243
function borderText(snapshot: HudSnapshot): string {
  if (!snapshot.reticleEnabled) return ' '
  const line = '─'.repeat(28)
  if (!snapshot.funModeData) {
    return [line, ...Array(8).fill(' '), line].join('\n')
  }
  const { compassStr, threatStr } = snapshot.funModeData
  return [
    line,       // 0  y:0   — top border
    compassStr, // 1  y:27  — compass bar, centered in the 360 px visible area
    ' ',        // 2  y:54
    ' ',        // 3  y:81
    threatStr,  // 4  y:108 — threat indicator
    ' ',        // 5  y:135
    ' ',        // 6  y:162
    ' ',        // 7  y:189
    ' ',        // 8  y:216
    line,       // 9  y:243 — bottom border
  ].join('\n')
}

// Returns content for the 3 reticle containers: { main (3 lines), left, right }.
// Spaces instead of '' everywhere — firmware silently drops empty-string updates.
function reticleContent(snapshot: HudSnapshot): { main: string; left: string; right: string } {
  if (!snapshot.reticleEnabled) return { main: ' \n \n ', left: ' ', right: ' ' }
  switch (snapshot.reticleStyle) {
    case 'cross':    return { main: ' \n┼\n ', left: ' ', right: ' ' }
    case 'circle':   return { main: '│\n○\n│', left: '─', right: '─' }
    case 'bullseye': return { main: ' \n◎\n ', left: ' ', right: ' ' }
    case 'diamond':  return { main: ' \n◆\n ', left: ' ', right: ' ' }
  }
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
              // Future use: could skip splash minTime if source === 'glassesMenu'
              // (user is already wearing the glasses and waiting for the HUD)
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
          { key: 'eventCapture', x: 0,   y: 0,   w: 576, h: 288, eventCapture: true, initial: '' },
          { key: 'clock',        x: 360, y: 30,  w: 211, h: 258, initial: '' },
          { key: 'weather',      x: 360, y: 57,  w: 211, h: 231, initial: '' },
          { key: 'decibels',     x: 360, y: 111, w: 211, h: 177, initial: ' ' },
          { key: 'decibelsAlt',  x: 360, y: 57,  w: 211, h: 231, initial: ' ' },
          { key: 'reticleMain',  x: 278, y: 104, w: 20,  h: 81,  initial: ' \n \n ' },
          { key: 'reticleLeft',  x: 258, y: 131, w: 20,  h: 27,  initial: ' ' },
          { key: 'reticleRight', x: 298, y: 131, w: 20,  h: 27,  initial: ' ' },
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
        els.eventCapture!.setContent(borderText(snap))
        const db = decibelsRouted(snap)
        els.clock!.setContent(clockText(snap))
        els.weather!.setContent(weatherText(snap))
        els.decibels!.setContent(db.main)
        els.decibelsAlt!.setContent(db.alt)
        const rc = reticleContent(snap)
        els.reticleMain!.setContent(rc.main)
        els.reticleLeft!.setContent(rc.left)
        els.reticleRight!.setContent(rc.right)

        await sdk.renderPage(hudPage)
        if (disposed) return

        readyRef.current = true

        // ── Item 2: foreground re-enter & Item 6: device reconnect helper ──────
        // Refreshes all element content from the latest snapshot and re-renders
        // the HUD page. Sets readyRef false for the duration so no concurrent
        // textContainerUpgrade calls slip through.
        async function refreshAndRender() {
          readyRef.current = false
          try {
            const s = snapshotRef.current
            els.eventCapture!.setContent(borderText(s))
            const db = decibelsRouted(s)
            els.clock!.setContent(clockText(s))
            els.weather!.setContent(weatherText(s))
            els.decibels!.setContent(db.main)
            els.decibelsAlt!.setContent(db.alt)
            const rc = reticleContent(s)
            els.reticleMain!.setContent(rc.main)
            els.reticleLeft!.setContent(rc.left)
            els.reticleRight!.setContent(rc.right)
            await sdk.renderPage(hudPage)
            readyRef.current = true
          } catch {
            // Render failed (e.g. device dropped mid-refresh) — stay not-ready;
            // onDeviceStatusChanged will call refreshAndRender again on reconnect.
          }
        }

        // 5. Event handling
        // Item 1: named function so sdk.removeEventListener can be called on cleanup.
        const onEvenHubEvent = (event: EvenHubEvent) => {
          // Double-click: check in every wrapper type before anything else.
          // We bypass mapGlassEvent here to avoid tryConsumeTap's 220 ms cooldown,
          // which fires after a preceding CLICK_EVENT and silently drops the
          // DOUBLE_CLICK_EVENT that the simulator sends immediately after.
          // We also catch the case where the simulator wraps it in sysEvent rather
          // than textEvent/listEvent. Own 500 ms debounce prevents double-fire from
          // duplicate hardware events.
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
        // Item 1: store removal so the cleanup return can unsubscribe.
        cleanupFns.push(() => sdk.removeEventListener(onEvenHubEvent))

        // Item 6: device disconnect / reconnect.
        // Sets readyRef false on drop so useEffect updates stop firing, and
        // re-renders the current page on reconnect to restore the display.
        if (bridge.rawBridge) {
          cleanupFns.push(
            bridge.rawBridge.onDeviceStatusChanged((status) => {
              if (status.isDisconnected() || status.isConnectionFailed()) {
                readyRef.current = false
              } else if (status.isConnected() && !readyRef.current) {
                // Was disconnected; now back — repaint and re-enable updates.
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
      // Items 1, 6, 7: unsubscribe all listeners registered during async init.
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
  }, [snapshot.timeStr, snapshot.clockEnabled, snapshot.hidden, snapshot.reticleEnabled])

  useEffect(() => {
    if (!readyRef.current) return
    const el = elementsRef.current?.weather
    if (!el) return
    el.setContent(weatherText(snapshot)).updateWithEvenHubSdk()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.weather, snapshot.locationKnown, snapshot.hidden, snapshot.reticleEnabled, snapshot.funModeData?.weaponAmmoText])

  useEffect(() => {
    if (!readyRef.current) return
    const els = elementsRef.current
    if (!els) return
    // Use snapshotRef.current so batched renders always see the latest values.
    const { main, alt } = decibelsRouted(snapshotRef.current)
    els.decibels.setContent(main).updateWithEvenHubSdk()
    els.decibelsAlt.setContent(alt).updateWithEvenHubSdk()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.db, snapshot.showDecibels, snapshot.micActive, snapshot.weatherEnabled, snapshot.hidden, snapshot.reticleEnabled, snapshot.funModeData?.hpArmorText])

  useEffect(() => {
    if (!readyRef.current) return
    const els = elementsRef.current
    if (!els) return
    els.eventCapture.setContent(borderText(snapshot)).updateWithEvenHubSdk()
    const { main, left, right } = reticleContent(snapshot)
    els.reticleMain.setContent(main).updateWithEvenHubSdk()
    els.reticleLeft.setContent(left).updateWithEvenHubSdk()
    els.reticleRight.setContent(right).updateWithEvenHubSdk()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.reticleEnabled, snapshot.reticleStyle, snapshot.funModeData?.compassStr, snapshot.funModeData?.threatStr])

}
