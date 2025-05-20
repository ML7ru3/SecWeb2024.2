import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync('../server/localhost-key.pem'),
      cert: fs.readFileSync('../server/localhost.pem')
    },
    host: true,
    open: true
  }
})