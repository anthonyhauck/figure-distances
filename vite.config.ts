import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  base: "/Figure-Distances/",
  build: {
    rollupOptions: {
      input: {
        background: resolve(__dirname, "background.html"),
        action: resolve(__dirname, "action/index.html"),
      },
    },
  },
})
