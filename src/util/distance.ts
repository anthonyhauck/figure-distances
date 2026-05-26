import type { GridMeasurement, GridType, Vector2 } from "@owlbear-rodeo/sdk"

export interface GridConfig {
  dpi: number
  type: GridType
  measurement: GridMeasurement
  multiplier: number
  unit: string
  digits: number
}

function gridSquaresFromPixels(a: Vector2, b: Vector2, cfg: GridConfig): number {
  const absDx = Math.abs(b.x - a.x) / cfg.dpi
  const absDy = Math.abs(b.y - a.y) / cfg.dpi
  const maxD = Math.max(absDx, absDy)
  const minD = Math.min(absDx, absDy)

  if (cfg.type === "SQUARE") {
    switch (cfg.measurement) {
      case "CHEBYSHEV":
        return maxD
      case "ALTERNATING":
        // Every other diagonal costs an extra unit (D&D 3.5e style)
        return maxD + Math.floor(minD / 2)
      case "MANHATTAN":
        return absDx + absDy
      default: // EUCLIDEAN
        return Math.sqrt(absDx * absDx + absDy * absDy)
    }
  }

  // HEX, ISOMETRIC, DIMETRIC: Euclidean approximation in grid units
  return Math.sqrt(absDx * absDx + absDy * absDy)
}

export function getDistance(
  a: Vector2,
  b: Vector2,
  cfg: GridConfig
): { raw: number; display: string } {
  const gridSquares = gridSquaresFromPixels(a, b, cfg)
  const real = gridSquares * cfg.multiplier
  const factor = Math.pow(10, cfg.digits)
  const rounded = Math.round(real * factor) / factor
  return { raw: rounded, display: `${rounded} ${cfg.unit}` }
}
