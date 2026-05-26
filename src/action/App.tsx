import { useEffect, useState, useCallback } from "react"
import OBR, { Item, Theme } from "@owlbear-rodeo/sdk"
import { getDistance, GridConfig } from "../util/distance"
import { isInFog } from "../util/fog"

interface TokenDistance {
  id: string
  name: string
  display: string
  raw: number
}

interface FogDebug {
  filled: boolean
  count: number
  types: string[]
}

async function buildGridConfig(): Promise<GridConfig> {
  const [dpi, type, measurement, scale] = await Promise.all([
    OBR.scene.grid.getDpi(),
    OBR.scene.grid.getType(),
    OBR.scene.grid.getMeasurement(),
    OBR.scene.grid.getScale(),
  ])
  return {
    dpi,
    type,
    measurement,
    multiplier: scale.parsed.multiplier,
    unit: scale.parsed.unit,
    digits: scale.parsed.digits,
  }
}

export default function App() {
  const [sourceName, setSourceName] = useState<string | null>(null)
  const [distances, setDistances] = useState<TokenDistance[]>([])
  const [fogDebug, setFogDebug] = useState<FogDebug | null>(null)
  const [theme, setTheme] = useState<Theme | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const selection = await OBR.player.getSelection()

    if (!selection || selection.length === 0) {
      setSourceName(null)
      setDistances([])
      return
    }

    const [characterItems, fogItems, fogFilled, gridConfig] = await Promise.all([
      OBR.scene.items.getItems((item: Item) => item.layer === "CHARACTER"),
      OBR.scene.items.getItems((item: Item) => item.layer === "FOG"),
      OBR.scene.fog.getFilled(),
      buildGridConfig(),
    ])

    const source = characterItems.find((i) => selection.includes(i.id))
    if (!source) {
      setSourceName(null)
      setDistances([])
      return
    }

    setSourceName(source.name || "Token")
    setFogDebug({ filled: fogFilled, count: fogItems.length, types: [...new Set(fogItems.map(i => i.type))] })

    const results: TokenDistance[] = characterItems
      .filter((i) => i.id !== source.id)
      .filter((i) => !isInFog(i, fogItems, fogFilled))
      .map((i) => {
        const { raw, display } = getDistance(source.position, i.position, gridConfig)
        return { id: i.id, name: i.name || "Unknown", display, raw }
      })
      .sort((a, b) => a.raw - b.raw)

    setDistances(results)
  }, [])

  useEffect(() => {
    const cleanups: Array<() => void> = []
    let mounted = true

    OBR.onReady(async () => {
      if (!mounted) return

      const t = await OBR.theme.getTheme()
      if (!mounted) return
      setTheme(t)
      setReady(true)
      cleanups.push(OBR.theme.onChange(setTheme))

      await refresh()

      cleanups.push(OBR.player.onChange(() => { refresh() }))
      cleanups.push(OBR.scene.items.onChange(() => { refresh() }))
      cleanups.push(OBR.scene.fog.onChange(() => { refresh() }))
    })

    return () => {
      mounted = false
      cleanups.forEach((c) => c())
    }
  }, [refresh])

  if (!ready || !theme) return null

  const bg = theme.background.paper
  const textPrimary = theme.text.primary
  const textSecondary = theme.text.secondary
  const accent = theme.primary.main

  const css = {
    root: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: bg,
      color: textPrimary,
      minHeight: "100vh",
      padding: "14px",
    } as React.CSSProperties,
    label: {
      fontSize: "10px",
      fontWeight: 700 as const,
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      color: textSecondary,
      marginBottom: "4px",
    },
    sourceName: {
      fontSize: "15px",
      fontWeight: 600 as const,
      marginBottom: "14px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
    },
    divider: {
      height: "1px",
      background: `${textSecondary}20`,
      margin: "0 0 10px",
    },
    row: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: "7px",
      marginBottom: "3px",
      background: `${textPrimary}08`,
    } as React.CSSProperties,
    tokenName: {
      fontSize: "13px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
      flex: 1,
      minWidth: 0,
    },
    dist: {
      fontSize: "13px",
      fontWeight: 700 as const,
      marginLeft: "8px",
      flexShrink: 0,
      color: accent,
      fontVariantNumeric: "tabular-nums" as const,
    },
    empty: {
      fontSize: "13px",
      color: textSecondary,
      textAlign: "center" as const,
      padding: "28px 0",
      lineHeight: 1.6,
    },
  }

  if (!sourceName) {
    return (
      <div style={css.root}>
        <p style={css.empty}>Select a character token<br />to see distances.</p>
      </div>
    )
  }

  return (
    <div style={css.root}>
      <div style={css.label}>From</div>
      <div style={css.sourceName}>{sourceName}</div>
      <div style={css.divider} />
      {fogDebug && (
        <div style={{ fontSize: "10px", color: textSecondary, marginBottom: "8px", fontFamily: "monospace" }}>
          fog filled={String(fogDebug.filled)} items={fogDebug.count} types=[{fogDebug.types.join(",")}]
        </div>
      )}
      <div style={css.label}>To</div>
      {distances.length === 0 ? (
        <p style={css.empty}>No other visible tokens found.</p>
      ) : (
        distances.map((td) => (
          <div key={td.id} style={css.row}>
            <span style={css.tokenName}>{td.name}</span>
            <span style={css.dist}>{td.display}</span>
          </div>
        ))
      )}
    </div>
  )
}
