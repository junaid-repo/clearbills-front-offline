// main.js
const { app, BrowserWindow } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: __dirname + '/icon.png', // optional app icon
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Load your React app (hosted in cloud or localhost)
    win.loadURL('http://localhost:3000/');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
