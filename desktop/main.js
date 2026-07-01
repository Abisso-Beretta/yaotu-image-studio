const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const { migrateLegacyData } = require("./migration");
const { configureAutoUpdates } = require("./updater");

let mainWindow = null;
let appServer = null;
const iconPath = path.join(__dirname, "icon.ico");

app.setName("妖荼");
app.setAppUserModelId("local.yaotu.workbench");

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#eef1eb",
    title: "妖荼",
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.removeMenu();
  // 默认打开新版界面（/studio）；旧页面仍可通过界面内「旧版」入口访问。
  mainWindow.loadURL(`http://127.0.0.1:${port}/studio`);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  const dataDir = app.getPath("userData");
  process.env.YAOTU_DATA_DIR = dataDir;
  process.env.PORT = "0";

  const migrationReport = migrateLegacyData({
    dataDir,
    appDir: path.resolve(__dirname, ".."),
    cwd: process.cwd(),
    executableDir: path.dirname(app.getPath("exe")),
    portableExecutableDir: process.env.PORTABLE_EXECUTABLE_DIR,
    portableExecutableFile: process.env.PORTABLE_EXECUTABLE_FILE,
  });
  if (migrationReport.copied.length > 0 || migrationReport.errors.length > 0) {
    console.log("Legacy data migration:", JSON.stringify(migrationReport, null, 2));
  }

  const { startServer, setUpdateController } = require(path.join(__dirname, "..", "server.js"));
  appServer = startServer(0, ({ port }) => {
    createWindow(port);
    const updateStatus = configureAutoUpdates({
      mainWindow,
      packageJsonPath: path.join(__dirname, "..", "package.json"),
    });
    setUpdateController(updateStatus);
    console.log(`Auto update: ${updateStatus.enabled ? "enabled" : updateStatus.reason}`);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && appServer?.address()) {
      const address = appServer.address();
      createWindow(typeof address === "object" && address ? address.port : 8787);
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  if (appServer) {
    appServer.close();
    appServer = null;
  }
});
