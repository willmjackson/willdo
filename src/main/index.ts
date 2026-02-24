import { app, BrowserWindow, shell, globalShortcut } from 'electron'
import path from 'path'
import fs from 'fs'
import { initDb, getDbPath } from './db'
import { registerIpcHandlers } from './ipc-handlers'
import { createTray, updateTray } from './tray'
import { startSync, stopSync } from './sync'
import { startSync, stopSync } from './sync'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 700,
    minWidth: 380,
    minHeight: 400,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#fafaf8',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Open DevTools in dev
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  // Load renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Hide instead of close (macOS convention)
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
}

app.on('before-quit', () => {
  stopSync()
  ;(app as { isQuitting: boolean }).isQuitting = true
})

app.whenReady().then(() => {
  initDb()
  registerIpcHandlers()
  createWindow()

  if (mainWindow) {
    createTray(mainWindow)
  }

  startSync()

  // Re-export updateTray for use from IPC
  const { ipcMain } = require('electron')
  ipcMain.on('tray:update', () => {
    if (mainWindow) updateTray(mainWindow)
  })

  // Start cloud sync (no-op if not configured)
  startSync()

  // Watch SQLite WAL file for external changes (e.g. /todo skill)
  // and notify the renderer to refresh immediately
  const walPath = getDbPath() + '-wal'
  let dbChangeTimer: ReturnType<typeof setTimeout> | null = null
  try {
    fs.watch(walPath, () => {
      if (dbChangeTimer) clearTimeout(dbChangeTimer)
      dbChangeTimer = setTimeout(() => {
        mainWindow?.webContents.send('tasks:changed')
      }, 300)
    })
  } catch {
    // WAL file may not exist yet; watch the directory instead
    fs.watch(path.dirname(walPath), (_event, filename) => {
      if (filename && filename.endsWith('-wal')) {
        if (dbChangeTimer) clearTimeout(dbChangeTimer)
        dbChangeTimer = setTimeout(() => {
          mainWindow?.webContents.send('tasks:changed')
        }, 300)
      }
    })
  }
})

app.on('window-all-closed', () => {
  // On macOS, keep app running in tray
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show()
  }
})
