const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

function startPythonBackend() {
    const scriptPath = path.join(__dirname, '..', 'backend', 'run.py');

    console.log('Starting Python backend...');
    pythonProcess = spawn('python', [scriptPath], {
        cwd: path.join(__dirname, '..', 'backend')
    });

    pythonProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`));
    pythonProcess.stderr.on('data', (data) => console.error(`Backend: ${data}`));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'out', 'index.html'));
}

app.whenReady().then(() => {
    startPythonBackend();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (pythonProcess) pythonProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    if (pythonProcess) pythonProcess.kill();
});

ipcMain.handle('ping', () => 'pong');

ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Select .gguf Model File',
        properties: ['openFile'],
        filters: [
            { name: 'GGUF Models', extensions: ['gguf'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    return canceled ? null : filePaths[0];
});
