const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path'), fs = require('fs');

// ── Where things live ────────────────────────────────────────────────────────
// Settings : %APPDATA%\VB Civil Solution\datapath.txt  (written by the installer,
//            always writable, survives updates / uninstall)
// Database : the "data folder" chosen in the installer (default: Documents\VB Civil Solution Data)
// Cache    : %APPDATA%\VB Civil Solution\app-cache
const cfgDir = path.join(app.getPath('appData'), 'VB Civil Solution');
const cfgFile = path.join(cfgDir, 'datapath.txt');
try { fs.mkdirSync(cfgDir, { recursive: true }); } catch (e) {}
app.setPath('userData', path.join(cfgDir, 'app-cache'));

const exeDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);

function readLine(f) {
  try { return fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)[0].trim(); } catch (e) { return ''; }
}
function canWrite(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const t = path.join(dir, '.vbcs-write-test');
    fs.writeFileSync(t, 'ok'); fs.unlinkSync(t);
    return true;
  } catch (e) { return false; }
}

// Called once the app is ready (dialogs need that). Returns the data folder or null (user exited).
function resolveDataDir() {
  const defaultDir = path.join(app.getPath('documents'), 'VB Civil Solution Data');
  let chosen = readLine(cfgFile) || readLine(path.join(exeDir, 'datapath.txt')) || defaultDir;
  let remember = true;

  while (!canWrite(chosen)) {
    const r = dialog.showMessageBoxSync({
      type: 'warning', title: 'VB Civil Solution',
      message: 'The data folder is not available',
      detail: chosen + '\n\nIs the drive / pen-drive connected? Your data is NOT lost - it is still in that folder.',
      buttons: ['Try again', 'Choose another folder', 'Use Documents folder (this time only)', 'Exit'],
      defaultId: 0, cancelId: 3, noLink: true
    });
    if (r === 0) continue;
    if (r === 1) {
      const p = dialog.showOpenDialogSync({ title: 'Choose data folder', properties: ['openDirectory', 'createDirectory'] });
      if (p && p[0]) { chosen = p[0]; remember = true; }
      continue;
    }
    if (r === 2) { chosen = defaultDir; remember = false; continue; }
    return null;
  }
  if (remember) { try { fs.writeFileSync(cfgFile, chosen, 'utf8'); } catch (e) {} }
  return chosen;
}

if (!app.requestSingleInstanceLock()) app.quit();
let win, dataDir;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  dataDir = resolveDataDir();
  if (!dataDir) { app.exit(0); return; }
  process.env.VBCS_DATA_DIR = dataDir;   // read by index.html - must be set before the window is created

  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1280, height: 800, show: false, autoHideMenuBar: true, title: 'VB Civil Solution',
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  // Ctrl+Shift+D = open the folder where the database is saved
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && i.control && i.shift && i.key.toLowerCase() === 'd') { shell.openPath(dataDir); e.preventDefault(); }
  });
  win.maximize(); win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => win.show());
});
app.on('window-all-closed', () => app.quit());
