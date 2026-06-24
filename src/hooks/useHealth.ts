import { useState, useCallback } from 'react'

export interface HealthData {
  steps: number
  calories: number
}

export interface HealthState {
  health: HealthData | null
  updateHealth: (steps: number, calories: number) => void
}

/**
 * Holds health data received from iOS Shortcuts via the server bridge.
 * Only shows data when both steps and calories have been received.
 */
export function useHealth(): HealthState {
  const [health, setHealth] = useState<HealthData | null>(null)

  const updateHealth = useCallback((steps: number, calories: number) => {
    if (steps > 0 || calories > 0) {
      setHealth({ steps, calories })
    }
  }, [])

  return { health, updateHealth }
}
