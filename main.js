const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const imagemin = require('imagemin');
const imageminjpeg = require('imagemin-mozjpeg');
const imageminpng = require('imagemin-pngquant');
const slash = require('slash');
const log = require('electron-log');

process.env.NODE_ENV = 'dev';

const isDev = process.env.NODE_ENV !== 'prod';
const isMac = process.platform === 'darwin';

let mainWindow;
let aboutWindow;

const menu = [
    ...(isMac ? [{ label: app.name, submenu: [{ label: 'About', click: createAboutWindow }] }] : []),
    {
        role: 'fileMenu',
    },
    ...(!isMac ? [{ label: 'Help', submenu: [{ label: 'About', click: createAboutWindow }] }] : []),
    ...(isDev
        ? [
              {
                  label: 'Developer',
                  submenu: [
                      {
                          role: 'reload',
                      },
                      {
                          role: 'forcereload',
                      },
                      {
                          type: 'separator',
                      },
                      {
                          role: 'toggledevtools',
                      },
                  ],
              },
          ]
        : []),
];

function createAboutWindow() {
    aboutWindow = new BrowserWindow({
        title: 'About Shrink',
        width: 300,
        height: 300,
        icon: `${__dirname}/assets/icons/Icon_256x256.png`,
        resizable: false,
        backgroundColor: 'black',
    });
    aboutWindow.loadFile(`./app/about.html`);
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: 'Image Shrink',
        width: isDev ? 1000 : 600,
        height: 800,
        icon: `${__dirname}/assets/icons/Icon_256x256.png`,
        resizable: isDev,
        webPreferences: {
            nodeIntegration: true,
        },
        x: 1400,
        y: 300,
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    //mainWindow.loadURL(`file://${__dirname}/app/index.html`);
    mainWindow.loadFile(`./app/index.html`);
}

app.on('ready', () => {
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    globalShortcut.register('CmdOrCtrl+R', () => mainWindow.reload());
    globalShortcut.register('CmdOrCtrl+I', () => mainWindow.toggleDevTools());

    mainWindow.on('closed', () => (mainWindow = null));
});

ipcMain.on('image:minimize', async (e, options) => {
    await shrinkImage({ ...options, destination: path.join(os.homedir(), 'imageshrink') });
    log.info(options.imagePath);
    log.info('done');
});

const shrinkImage = async ({ imagePath, quality, destination }) => {
    const pngQuality = quality / 100;
    try {
        const files = await imagemin([slash(imagePath)], {
            destination,
            plugins: [imageminjpeg({ quality }), imageminpng({ quality: [pngQuality, pngQuality] })],
        });
        console.log('files: ', files);
        shell.openPath(destination);

        mainWindow.webContents.send('image:done');
    } catch (error) {
        log.error(error);
    }
};

app.on('window-all-closed', () => {
    if (isMac) {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.allowRendererProcessReuse = true;
