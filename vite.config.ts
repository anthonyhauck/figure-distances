import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  base: "/figure-distances/",
  build: {
    rollupOptions: {
      input: {
        action: resolve(__dirname, "action/index.html"),
      },
    },
  },
})
