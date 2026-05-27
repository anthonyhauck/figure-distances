import type { Item } from "@owlbear-rodeo/sdk"

type Vec2 = { x: number; y: number }

function pointInPolygon(px: number, py: number, verts: Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x, yi = verts[i].y
    const xj = verts[j].x, yj = verts[j].y
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function toLocalSpace(wx: number, wy: number, ox: number, oy: number, rotDeg: number): Vec2 {
  const rad = -(rotDeg * Math.PI) / 180
  const dx = wx - ox, dy = wy - oy
  return { x: dx * Math.cos(rad) - dy * Math.sin(rad), y: dx * Math.sin(rad) + dy * Math.cos(rad) }
}

function shapeVertices(fog: Item): Vec2[] {
  const s = fog as unknown as { shapeType: string; width: number; height: number }
  const hw = (s.width * fog.scale.x) / 2
  const hh = (s.height * fog.scale.y) / 2
  switch (s.shapeType) {
    case "RECTANGLE":
      return [{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh }]
    case "CIRCLE":
      return Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2
        return { x: Math.cos(a) * hw, y: Math.sin(a) * hh }
      })
    case "TRIANGLE":
      return [{ x: 0, y: -hh }, { x: -hw, y: hh }, { x: hw, y: hh }]
    case "HEXAGON":
      return Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return { x: Math.cos(a) * hw, y: Math.sin(a) * hh }
      })
    default:
      return []
  }
}

// Extract polygon vertices from path commands (MOVE=0, LINE=1, QUAD=2, CONIC=3, CUBIC=4, CLOSE=5)
// Bezier endpoints are used as approximations for curved fog shapes
function pathVertices(fog: Item): Vec2[] {
  const p = fog as unknown as { commands?: unknown[] }
  if (!p.commands) return []
  const sx = fog.scale.x, sy = fog.scale.y
  const verts: Vec2[] = []
  for (const cmd of p.commands as number[][]) {
    switch (cmd[0]) {
      case 0: case 1: // MOVE, LINE: [cmd, x, y]
        verts.push({ x: cmd[1] * sx, y: cmd[2] * sy }); break
      case 2: // QUAD: [cmd, cpx, cpy, x, y]
        verts.push({ x: cmd[3] * sx, y: cmd[4] * sy }); break
      case 3: // CONIC: [cmd, cpx, cpy, x, y, w]
        verts.push({ x: cmd[3] * sx, y: cmd[4] * sy }); break
      case 4: // CUBIC: [cmd, cp1x, cp1y, cp2x, cp2y, x, y]
        verts.push({ x: cmd[5] * sx, y: cmd[6] * sy }); break
    }
  }
  return verts
}

function insideAnyFogItem(token: Item, fogItems: Item[], respectVisibility: boolean): boolean {
  for (const fog of fogItems) {
    if (respectVisibility && !fog.visible) continue

    let verts: Vec2[]
    if (fog.type === "SHAPE") {
      verts = shapeVertices(fog)
    } else if (fog.type === "PATH") {
      verts = pathVertices(fog)
    } else {
      continue
    }

    if (verts.length < 3) continue

    const local = toLocalSpace(token.position.x, token.position.y, fog.position.x, fog.position.y, fog.rotation ?? 0)
    if (pointInPolygon(local.x, local.y, verts)) return true
  }
  return false
}

export function isInFog(token: Item, fogItems: Item[], fogFilled: boolean): boolean {
  if (!token.visible) return true

  if (fogFilled) {
    // Fog covers the whole scene; FOG layer items are revealed areas (may be invisible) — token is hidden if outside all of them
    return !insideAnyFogItem(token, fogItems, false)
  } else {
    // No global fill; FOG layer items are explicit fog zones
    return insideAnyFogItem(token, fogItems, true)
  }
}
