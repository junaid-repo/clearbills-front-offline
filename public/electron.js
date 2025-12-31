const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess; // To keep track of the JAR process

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // Load the React Build (index.html)
  // In development, you might change this to load localhost:3000
  mainWindow.loadFile(path.join(__dirname, '../build/index.html'));

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startBackend() {
  const jarFile = 'shop-0.0.3-USER_SPECIFIC.jar'; // We will rename your jar to this later
  let jarPath;

  if (app.isPackaged) {
    // IN PRODUCTION: usage inside the .exe
    // 'resources' is a special folder where electron-builder puts extra files
    jarPath = path.join(process.resourcesPath, jarFile);
  } else {
    // IN DEVELOPMENT: path to your local target folder
    jarPath = path.join(__dirname, '../../ShopAppBackEnd/shop/target/shop-0.0.3-USER_SPECIFIC.jar');
  }

  console.log("Launching JAR from:", jarPath);

  // Spawn the Java process
  // NOTE: This assumes the user has Java installed.
  // If you want to bundle Java itself, the path logic changes slightly.
  backendProcess = spawn('java', ['-jar', jarPath]);

  backendProcess.stdout.on('data', (data) => {
    console.log(`SpringBoot: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`SpringBoot Error: ${data}`);
  });
}

app.on('ready', () => {
  startBackend();
  createWindow();
});

// Kill the JAR when the app closes
app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
