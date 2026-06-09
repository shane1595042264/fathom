/*
 * FATHOM — Electron preload. Exposes a tiny, safe bridge to the renderer as
 * `window.fathomNative`. The game's Steam shim (src/steam/steam.js) and menu
 * ("QUIT") use this; on the web it simply doesn't exist and everything no-ops.
 */
const { contextBridge, ipcRenderer } = require('electron');

let isSteam = false;
try { isSteam = ipcRenderer.sendSync('fathom-is-steam-sync'); } catch (e) {}

contextBridge.exposeInMainWorld('fathomNative', {
  platform: process.platform,
  isSteam,
  quit() { ipcRenderer.send('fathom-quit'); },
  steam: {
    unlock(api) { return ipcRenderer.invoke('fathom-steam', 'unlock', api); },
    submitLeaderboard(name, value) { return ipcRenderer.invoke('fathom-steam', 'leaderboard', name, value); },
    richPresence(text) { return ipcRenderer.invoke('fathom-steam', 'richPresence', text); }
  }
});
