/*
 * FATHOM — Electron main process (the Steam desktop build).
 *
 * Loads the IDENTICAL game (index.html) in a Chromium window, so there is one
 * codebase for web and Steam. Steamworks is integrated via the OPTIONAL native
 * module `steamworks.js`: if it isn't installed (or init fails), every Steam call
 * becomes a no-op and the game still runs perfectly — so the build never hard-
 * depends on Steam being present.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ---- resolve the Steam App ID (from package.json, overridable by env) ----
let STEAM_APP_ID = 480; // Valve's Spacewar test app — replace before release
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  if (pkg.fathom && pkg.fathom.steamAppId) STEAM_APP_ID = parseInt(pkg.fathom.steamAppId, 10);
} catch (e) {}
if (process.env.FATHOM_STEAM_APPID) STEAM_APP_ID = parseInt(process.env.FATHOM_STEAM_APPID, 10);

// ---- lazy, optional Steamworks ----
let steamClient = null;
function initSteam() {
  if (steamClient !== null) return steamClient;
  try {
    const steamworks = require('steamworks.js');
    steamClient = steamworks.init(STEAM_APP_ID);
    console.log('[FATHOM] Steam initialised for app', STEAM_APP_ID);
  } catch (e) {
    steamClient = false;
    console.log('[FATHOM] Steamworks not available — running without Steam features.', e && e.message);
  }
  return steamClient;
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'steam', 'icon.png');
  const icon = fs.existsSync(iconPath) ? iconPath : undefined; // graceful if absent
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 400,
    backgroundColor: '#000000',
    fullscreen: true,
    autoHideMenuBar: true,
    title: 'FATHOM',
    icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', 'index.html'));

  // F11 toggles fullscreen, Esc handled in-game.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
}

// ---- IPC bridge used by preload -> renderer (window.fathomNative) ----
ipcMain.handle('fathom-steam', (_e, action, a, b) => {
  const c = initSteam();
  if (!c) return false;
  try {
    switch (action) {
      case 'unlock':
        c.achievement.activate(a); return true;
      case 'leaderboard':
        // Upload best score to a named leaderboard (find-or-create).
        c.leaderboard.findOrCreate(a, c.leaderboard.SortMethod.Descending, c.leaderboard.DisplayType.Numeric)
          .then((lb) => c.leaderboard.uploadScore(lb, b)).catch(() => {});
        return true;
      case 'richPresence':
        if (c.localplayer && c.localplayer.setRichPresence) c.localplayer.setRichPresence('status', a);
        return true;
      default: return false;
    }
  } catch (e) { return false; }
});

ipcMain.on('fathom-quit', () => app.quit());
ipcMain.handle('fathom-is-steam', () => !!initSteam());
// Synchronous variant so the renderer's Steam shim can read availability at load.
ipcMain.on('fathom-is-steam-sync', (e) => { e.returnValue = !!initSteam(); });

app.whenReady().then(() => {
  initSteam();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
