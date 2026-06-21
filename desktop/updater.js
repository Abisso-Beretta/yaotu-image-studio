const { app, dialog } = require("electron");
const path = require("node:path");

const PLACEHOLDER_OWNER = "YOUR_GITHUB_OWNER";
const PLACEHOLDER_REPO = "YOUR_GITHUB_REPO";

let updateCheckStarted = false;

function configureAutoUpdates(options = {}) {
  if (updateCheckStarted) {
    return { enabled: false, reason: "already started" };
  }

  const status = getUpdateStatus(options.packageJsonPath);
  if (!status.enabled) {
    return status;
  }

  let autoUpdater;
  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (error) {
    return { enabled: false, reason: `electron-updater unavailable: ${error.message}` };
  }

  updateCheckStarted = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("error", (error) => {
    console.warn("Update check failed:", error.message);
  });

  autoUpdater.on("update-available", async (info) => {
    const version = info.version || "new version";
    const result = await dialog.showMessageBox(options.mainWindow, {
      type: "info",
      title: "Update available",
      message: `YaoTu ${version} is available`,
      detail: "Download it now? After the download finishes, you can restart to install.",
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate().catch((error) => {
        console.warn("Update download failed:", error.message);
      });
    }
  });

  autoUpdater.on("update-downloaded", async (info) => {
    const version = info.version || "new version";
    const result = await dialog.showMessageBox(options.mainWindow, {
      type: "info",
      title: "Update downloaded",
      message: `YaoTu ${version} has been downloaded`,
      detail: "Restart and install it now?",
      buttons: ["Restart", "Install later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.warn("Update check failed:", error.message);
    });
  }, 4000);

  return status;
}

function getUpdateStatus(packageJsonPath = path.join(__dirname, "..", "package.json")) {
  if (!app.isPackaged) {
    return { enabled: false, reason: "development mode" };
  }

  if (process.env.PORTABLE_EXECUTABLE_FILE || process.env.PORTABLE_EXECUTABLE_DIR) {
    return { enabled: false, reason: "portable build" };
  }

  if (process.env.YAOTU_DISABLE_AUTO_UPDATE === "1") {
    return { enabled: false, reason: "disabled by environment" };
  }

  const githubConfig = readGitHubPublishConfig(packageJsonPath);
  if (!githubConfig) {
    return { enabled: false, reason: "missing GitHub publish config" };
  }

  if (isPlaceholder(githubConfig.owner, PLACEHOLDER_OWNER) || isPlaceholder(githubConfig.repo, PLACEHOLDER_REPO)) {
    return { enabled: false, reason: "GitHub publish config still uses placeholders" };
  }

  return {
    enabled: true,
    provider: "github",
    owner: githubConfig.owner,
    repo: githubConfig.repo,
  };
}

function readGitHubPublishConfig(packageJsonPath) {
  try {
    const packageJson = require(packageJsonPath);
    const publish = packageJson.build && packageJson.build.publish;
    const entries = Array.isArray(publish) ? publish : [publish];
    return entries.find((entry) => entry && entry.provider === "github") || null;
  } catch {
    return null;
  }
}

function isPlaceholder(value, placeholder) {
  return !value || value === placeholder || String(value).startsWith("YOUR_");
}

module.exports = {
  configureAutoUpdates,
  getUpdateStatus,
};
