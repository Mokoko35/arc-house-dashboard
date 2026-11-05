// The bridge between the page and the desktop shell. It exposes three calls and nothing else.
// A sandboxed Electron preload script has to be CommonJS, so `require` is the only way here.
// eslint-disable-next-line typescript/no-require-imports
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('iptvDesktop', {
  /** Starts converting a film for playback; resolves with the HLS address, the subtitle files and the length. */
  transcodeStart: (url) => ipcRenderer.invoke('transcode:start', url),
  /** Are the subtitle files finished? */
  transcodeStatus: (id) => ipcRenderer.invoke('transcode:status', id),
  /** Stops the conversion and deletes its files. */
  transcodeStop: (id) => ipcRenderer.invoke('transcode:stop', id),
})
