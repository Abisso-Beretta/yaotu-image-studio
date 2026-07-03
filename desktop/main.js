const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { migrateLegacyData } = require("./migration");
const { configureAutoUpdates } = require("./updater");

/**
 * 向上遍历最多 5 层，寻找含 server.js + package.json 的项目根目录。
 * win-unpacked 构建放在 dist-installer/win-unpacked/ 下，向上两层即为项目根；
 * 开发模式下 electron 二进制在 node_modules 深处，最多四层也能找到；
 * NSIS 安装版安装到任意路径，找不到项目根，返回 null 后回退至 userData。
 */
function detectLocalProjectDataDir(exeDir) {
  let dir = exeDir;
  for (let i = 0; i < 5; i++) {
    const parent = path.dirname(dir);
    if (parent === dir) break; // 到达文件系统根
    dir = parent;
    if (
      fs.existsSync(path.join(dir, "server.js")) &&
      fs.existsSync(path.join(dir, "package.json"))
    ) {
      return dir;
    }
  }
  return null;
}

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
  // 优先用项目根目录当 dataDir，使桌面版与 start-generator.bat 共享同一份数据。
  // 适用场景：win-unpacked 构建放在项目目录内的 dist-installer/win-unpacked/。
  // 找不到项目根（NSIS 安装版安装到任意位置）则回退 userData。
  const localProjectDir = detectLocalProjectDataDir(path.dirname(app.getPath("exe")));
  const dataDir = localProjectDir || app.getPath("userData");
  process.env.YAOTU_DATA_DIR = dataDir;
  if (localProjectDir) {
    console.log(`[dataDir] Using local project root: ${dataDir}`);
  } else {
    console.log(`[dataDir] Using userData: ${dataDir}`);
  }
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
