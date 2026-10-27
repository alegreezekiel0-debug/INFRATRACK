const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, 'src', 'assets', 'logo.png'),
        title: 'InfraTrack - Campus Maintenance Reporting',
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('getUserDataPath', () => {
    return app.getPath('userData');
});

ipcMain.handle('selectImage', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const fileName = path.basename(filePath);
        const destDir = path.join(app.getPath('userData'), 'uploads');

        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const destPath = path.join(destDir, fileName);
        fs.copyFileSync(filePath, destPath);

        return { success: true, fileName, path: destPath };
    }

    return { success: false };
});

ipcMain.handle('getImagePath', (event, fileName) => {
    return path.join(app.getPath('userData'), 'uploads', fileName);
});


