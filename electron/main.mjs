// Windows desktop shell for the IPTV player. It only loads the bundled web app (dist/index.html).
import { app, BrowserWindow, session, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// Chromium keeps `video.audioTracks` (the audio languages inside an .mkv/.mp4) behind a switch. The player's language menu needs it.
app.commandLine.appendSwitch('enable-blink-features', 'AudioVideoTracks')

const DEV = process.argv.includes('--dev')
const DEV_URL = 'http://localhost:5173'

// IPTV servers rarely send CORS headers, so a normal browser cannot read their lists or streams.
// This app loads only its own bundled page, so it is safe to let it read those responses.
function allowCrossOriginReads() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase().startsWith('access-control-allow-')) delete headers[key]
    }
    headers['Access-Control-Allow-Origin'] = ['*']
    headers['Access-Control-Allow-Headers'] = ['*']
    headers['Access-Control-Allow-Methods'] = ['GET, HEAD, OPTIONS']
    callback({ responseHeaders: headers })
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 560,
    title: 'IPTV Oynatıcı',
    backgroundColor: '#0d1b2f',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Links that open a new window (for example the block explorer) go to the default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  // The app never navigates away from itself.
  win.webContents.on('will-navigate', (event, url) => {
    const own = DEV ? url.startsWith(DEV_URL) : url.startsWith('file://')
    if (!own) event.preventDefault()
  })

  if (DEV) win.loadURL(DEV_URL)
  else win.loadFile(path.join(here, '..', 'dist', 'index.html'))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.whenReady().then(() => {
    allowCrossOriginReads()
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
