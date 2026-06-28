import { useState, useEffect } from 'react'
import type { FunModeData } from '../glass/shared'

const MATCH_SECONDS = 15 * 60

// Zero-pad minutes so the string is always 5 chars wide ("09:59"), giving
// consistent column width as the countdown passes 10:00.
function formatTimer(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function buildCompass(bearing: number): string {
  const n = COMPASS.length
  // Show all 8 directions: 3 left + [current] + 4 right.
  // The ring loops so the direction entering the bracket is always the one
  // immediately left or right of the previous bracket — giving a scrolling effect.
  // Total string width is always ~268 px (all 8 directions + separators + brackets).
  // 14 leading spaces centres the brackets near x:180 (midpoint of the 360 px
  // visible area left of the clock container at x:360).
  const parts = [-3, -2, -1, 0, 1, 2, 3, 4].map(i => {
    const idx = ((bearing + i) % n + n) % n
    return i === 0 ? `[${COMPASS[idx]}]` : COMPASS[idx]
  })
  return ' '.repeat(34) + parts.join('  ')
}

export function useFunModeData(enabled: boolean): FunModeData | null {
  const [seconds, setSeconds] = useState(MATCH_SECONDS)
  const [bearing, setBearing] = useState(0)
  const [threatActive, setThreatActive] = useState(false)
  // Match countdown — resets to 15:00 when disabled so re-enabling starts fresh
  useEffect(() => {
    if (!enabled) {
      setSeconds(MATCH_SECONDS)
      return
    }
    const id = setInterval(() => setSeconds(s => (s > 0 ? s - 1 : MATCH_SECONDS)), 1000)
    return () => clearInterval(id)
  }, [enabled])

  // Compass bearing — rotates one step every 1–3 s (random), resets to N on disable
  useEffect(() => {
    if (!enabled) {
      setBearing(0)
      return
    }
    let cancelled = false
    function tick() {
      const delay = 1000 + Math.random() * 2000
      setTimeout(() => {
        if (cancelled) return
        setBearing(b => (b + 1) % 8)
        tick()
      }, delay)
    }
    tick()
    return () => { cancelled = true }
  }, [enabled])

  // Threat indicator — fires randomly every 8–18 s, visible for 2.5 s
  useEffect(() => {
    if (!enabled) {
      setThreatActive(false)
      return
    }
    let cancelled = false
    function schedule() {
      const delay = 8000 + Math.random() * 10000
      setTimeout(() => {
        if (cancelled) return
        setThreatActive(true)
        setTimeout(() => {
          if (cancelled) return
          setThreatActive(false)
          schedule()
        }, 2500)
      }, delay)
    }
    schedule()
    return () => { cancelled = true }
  }, [enabled])

  if (!enabled) return null

  // 15 leading spaces (~120 px) shifts all right-column text against the right
  // edge of the 211 px container (ending ~19 px from the right display boundary).
  const R = '               '
  return {
    matchTimerStr: R + formatTimer(seconds),
    weaponAmmoText: `${R}M4A1\n${R}28 | 90`,
    hpArmorText: `${R}HP  85\n${R}ARM 50`,
    compassStr: buildCompass(bearing),
    threatStr: threatActive ? '      ENEMY SPOTTED' : ' ',
  }
}
