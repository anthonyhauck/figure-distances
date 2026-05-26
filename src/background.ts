import OBR from "@owlbear-rodeo/sdk"
import { TOOL_ID, MODE_ID, SOURCE_TOKEN_KEY } from "./constants"

OBR.onReady(async () => {
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
      await OBR.action.open()
    },
  })
})
