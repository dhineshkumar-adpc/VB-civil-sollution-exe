const { app, BrowserWindow, Menu } = require('electron');
const path = require('path'), fs = require('fs');

// Data folder: datapath.txt (next to the exe, optional override) > the SAME folder as the exe.
// Nothing is moved to C:\ or D:\ automatically - data always stays beside the exe.
const exeDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
function pickDataDir() {
  try { const t = fs.readFileSync(path.join(exeDir, 'datapath.txt'), 'utf8').trim(); if (t) return t; } catch (e) {}
  return exeDir;
}
const dataDir = pickDataDir();
try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}
process.env.VBCS_DATA_DIR = dataDir;                       // read by index.html
app.setPath('userData', path.join(dataDir, 'app-cache'));  // localStorage/cache also off the C: profile

if (!app.requestSingleInstanceLock()) app.quit();
let win;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1280, height: 800, show: false, autoHideMenuBar: true, title: 'VB Civil Solution',
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  win.maximize(); win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => win.show());
});
app.on('window-all-closed', () => app.quit());
