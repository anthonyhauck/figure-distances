import type { Item } from "@owlbear-rodeo/sdk"

// Ray-casting point-in-polygon test
function pointInPolygon(
  px: number,
  py: number,
  vertices: Array<{ x: number; y: number }>
): boolean {
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x,
      yi = vertices[i].y
    const xj = vertices[j].x,
      yj = vertices[j].y
    const cross =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (cross) inside = !inside
  }
  return inside
}

// Rotate a point into an item's local (un-rotated) coordinate space
function toLocalSpace(
  wx: number,
  wy: number,
  ox: number,
  oy: number,
  rotationDeg: number
): { x: number; y: number } {
  const angle = -(rotationDeg * Math.PI) / 180
  const dx = wx - ox
  const dy = wy - oy
  return {
    x: dx * Math.cos(angle) - dy * Math.sin(angle),
    y: dx * Math.sin(angle) + dy * Math.cos(angle),
  }
}

export function isInFog(token: Item, fogItems: Item[]): boolean {
  // Explicitly hidden by GM
  if (!token.visible) return true

  for (const fog of fogItems) {
    if (!fog.visible) continue

    // Only SHAPE items have polygon point data we can test precisely
    if (fog.type !== "SHAPE") continue

    const points = (fog as unknown as { points?: Array<{ x: number; y: number }> })
      .points
    if (!points || points.length < 3) continue

    // Transform the token's world position into the fog item's local space
    const local = toLocalSpace(
      token.position.x,
      token.position.y,
      fog.position.x,
      fog.position.y,
      fog.rotation ?? 0
    )

    if (pointInPolygon(local.x, local.y, points)) return true
  }

  return false
}
