import { useEffect, useRef, useState, useCallback } from "react"
import OBR, { Item, Theme } from "@owlbear-rodeo/sdk"
import { TOOL_ID, MODE_ID, SOURCE_TOKEN_KEY } from "../constants"
import { getDistance, GridConfig } from "../util/distance"
import { isInFog } from "../util/fog"

async function registerTool() {
  try {
    await OBR.tool.create({
      id: TOOL_ID,
      icons: [
        {
          icon: `${import.meta.env.BASE_URL}ruler-icon.svg`,
          label: "Measure Distances",
          filter: { activeTools: [TOOL_ID] },
        },
      ],
      shortcut: "M",
      defaultMode: MODE_ID,
    })
  } catch {
    // Tool already registered (popover re-opened during same session)
  }

  try {
    await OBR.tool.createMode({
      id: MODE_ID,
      icons: [
        {
          icon: `${import.meta.env.BASE_URL}ruler-icon.svg`,
          label: "Measure",
          filter: { activeTools: [TOOL_ID] },
        },
      ],
      onToolClick: async (_ctx, event) => {
        const target = event.target
        if (!target || target.layer !== "CHARACTER") {
          await OBR.player.setMetadata({ [SOURCE_TOKEN_KEY]: null })
          return
        }
        await OBR.player.setMetadata({ [SOURCE_TOKEN_KEY]: target.id })
      },
    })
  } catch {
    // Mode already registered
  }
}

interface TokenDistance {
  id: string
  name: string
  display: string
  raw: number
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
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [sourceName, setSourceName] = useState("")
  const [distances, setDistances] = useState<TokenDistance[]>([])
  const [theme, setTheme] = useState<Theme | null>(null)
  const [ready, setReady] = useState(false)
  const lastSourceIdRef = useRef<string | null | undefined>(undefined)

  const refresh = useCallback(async (srcId: string | null) => {
    if (!srcId) {
      setDistances([])
      setSourceName("")
      return
    }

    const [characterItems, fogItems, gridConfig] = await Promise.all([
      OBR.scene.items.getItems((item: Item) => item.layer === "CHARACTER"),
      OBR.scene.items.getItems((item: Item) => item.layer === "FOG"),
      buildGridConfig(),
    ])

    const source = characterItems.find((i) => i.id === srcId)
    if (!source) {
      setDistances([])
      setSourceName("")
      return
    }

    setSourceName(source.name || "Selected Token")

    const results: TokenDistance[] = characterItems
      .filter((i) => i.id !== srcId)
      .filter((i) => !isInFog(i, fogItems))
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
      setReady(true)

      // Register the measure tool and mode (runs once per session on first popover open)
      await registerTool()

      // Theme
      const t = await OBR.theme.getTheme()
      setTheme(t)
      cleanups.push(OBR.theme.onChange(setTheme))

      // Initial source token from player metadata
      const meta = await OBR.player.getMetadata()
      const initId = (meta[SOURCE_TOKEN_KEY] as string | null) ?? null
      lastSourceIdRef.current = initId
      setSourceId(initId)
      await refresh(initId)

      // React to source token changes (set by the tool's onToolClick handler)
      cleanups.push(
        OBR.player.onChange(async (player) => {
          const id = (player.metadata[SOURCE_TOKEN_KEY] as string | null) ?? null
          if (id === lastSourceIdRef.current) return
          lastSourceIdRef.current = id
          setSourceId(id)
          await refresh(id)
        })
      )

      // Re-calculate when any token moves, is added, or removed
      cleanups.push(
        OBR.scene.items.onChange(async () => {
          const currentId = lastSourceIdRef.current ?? null
          if (currentId) await refresh(currentId)
        })
      )
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
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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

  if (!sourceId) {
    return (
      <div style={css.root}>
        <p style={css.empty}>
          Activate the <strong>Measure</strong> tool (M),<br />
          then click a token on the map.
        </p>
      </div>
    )
  }

  return (
    <div style={css.root}>
      <div style={css.label}>From</div>
      <div style={css.sourceName}>{sourceName}</div>
      <div style={css.divider} />
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
