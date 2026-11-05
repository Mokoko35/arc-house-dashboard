// Windows desktop shell for the IPTV player. It only loads the bundled web app (dist/index.html).
import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import ffmpegStatic from 'ffmpeg-static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TranscodeManager } from './transcode.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))

// Chromium keeps `video.audioTracks` (the audio languages inside an .mkv/.mp4) behind a switch. The player's language menu needs it.
app.commandLine.appendSwitch('enable-blink-features', 'AudioVideoTracks')

const DEV = process.argv.includes('--dev')
const DEV_URL = 'http://localhost:5173'

// ffmpeg ships inside the app. In the installed build it is unpacked from app.asar so it can be run.
const ffmpegPath = ffmpegStatic ? String(ffmpegStatic).replace('app.asar', 'app.asar.unpacked') : null
const transcoder = new TranscodeManager({ ffmpegPath })

// Only our own page may start or stop a conversion.
const trusted = (event) => {
  const url = event.senderFrame?.url ?? ''
  return DEV ? url.startsWith(DEV_URL) : url.startsWith('file://')
}

ipcMain.handle('transcode:start', async (event, url) => {
  if (!trusted(event) || typeof url !== 'string') throw new Error('İzin verilmedi.')
  return transcoder.start(url)
})
ipcMain.handle('transcode:status', (event, id) => (trusted(event) && typeof id === 'string' ? transcoder.status(id) : { subtitles: 'none' }))
ipcMain.handle('transcode:stop', (event, id) => {
  if (trusted(event) && typeof id === 'string') transcoder.stop(id)
})

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
      preload: path.join(here, 'preload.cjs'),
    },
  })

  // A conversion belongs to the page that asked for it: reloading or closing the window ends it.
  win.webContents.on('did-start-loading', () => transcoder.stopAll())
  win.on('closed', () => transcoder.stopAll())

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
  app.on('before-quit', () => transcoder.dispose())
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
