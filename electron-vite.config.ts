import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      conditions: ['import', 'module', 'browser', 'default']
    },
    plugins: [react({ jsxRuntime: 'automatic' })]
  }
})
