import { createSplash, TILE_PRESETS } from 'even-toolkit/splash'

export function renderSplash(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fg = '#e0e0e0'
  const cx = w / 2
  const s = Math.min(w / 256, h / 288)

  // Simple text-based splash — replace with pixel-art icon for your app
  ctx.fillStyle = fg
  ctx.font = `bold ${36 * s}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.fillText('SIMPLE HUD', cx, 50 * s)
  ctx.textAlign = 'left'
}

export const appSplash = createSplash({
  tiles: 1,
  tileLayout: 'vertical',
  tilePositions: TILE_PRESETS.topCenter1,
  canvasSize: { w: 200, h: 288 },
  minTimeMs: 3000,
  maxTimeMs: 3000,
  menuText: '',
  render: renderSplash,
})
