import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import path from 'path'
import { getDueTodayCount, listTasks } from './db'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow): Tray {
  const iconPath = path.join(__dirname, '../../resources/trayTemplate.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon)
  tray.setToolTip('WillDo')

  updateTray(mainWindow)
  return tray
}

export function updateTray(mainWindow: BrowserWindow): void {
  if (!tray) return

  const count = getDueTodayCount()
  tray.setTitle(count > 0 ? String(count) : '')

  const todayTasks = listTasks('today').slice(0, 5)
  const taskItems: Electron.MenuItemConstructorOptions[] = todayTasks.map((t) => ({
    label: `${t.due_date ? `${t.due_date} — ` : ''}${t.title}`,
    enabled: false
  }))

  if (taskItems.length === 0) {
    taskItems.push({ label: 'No tasks due today', enabled: false })
  }

  const contextMenu = Menu.buildFromTemplate([
    ...taskItems,
    { type: 'separator' },
    {
      label: 'Open WillDo',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow.show()
    }
  })
}

export function getTray(): Tray | null {
  return tray
}
