const { app, dialog } = require("electron");
const path = require("node:path");

const PLACEHOLDER_OWNER = "YOUR_GITHUB_OWNER";
const PLACEHOLDER_REPO = "YOUR_GITHUB_REPO";

let updateCheckStarted = false;
let latestUpdateState = {
  enabled: false,
  status: "idle",
  reason: "not initialized",
};
let manualCheckPromise = null;

function configureAutoUpdates(options = {}) {
  if (updateCheckStarted) {
    return createDisabledUpdateController("already started");
  }

  const status = getUpdateStatus(options.packageJsonPath);
  if (!status.enabled) {
    latestUpdateState = {
      ...status,
      status: "disabled",
      version: app.getVersion(),
    };
    return createDisabledUpdateController(status.reason, status);
  }

  let autoUpdater;
  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (error) {
    const unavailable = { enabled: false, reason: `electron-updater unavailable: ${error.message}` };
    latestUpdateState = {
      ...unavailable,
      status: "disabled",
      version: app.getVersion(),
    };
    return createDisabledUpdateController(unavailable.reason, unavailable);
  }

  updateCheckStarted = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  latestUpdateState = {
    ...status,
    status: "idle",
    version: app.getVersion(),
  };

  autoUpdater.on("error", (error) => {
    latestUpdateState = {
      ...latestUpdateState,
      status: "error",
      checking: false,
      error: error.message,
      checkedAt: new Date().toISOString(),
    };
    console.warn("Update check failed:", error.message);
  });

  autoUpdater.on("update-available", async (info) => {
    const version = info.version || "new version";
    latestUpdateState = {
      ...latestUpdateState,
      status: "available",
      checking: false,
      availableVersion: version,
      releaseDate: info.releaseDate,
      checkedAt: new Date().toISOString(),
    };
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
    latestUpdateState = {
      ...latestUpdateState,
      status: "downloaded",
      checking: false,
      availableVersion: version,
      releaseDate: info.releaseDate,
      checkedAt: new Date().toISOString(),
    };
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

  autoUpdater.on("update-not-available", (info) => {
    latestUpdateState = {
      ...latestUpdateState,
      status: "not-available",
      checking: false,
      latestVersion: info.version || app.getVersion(),
      checkedAt: new Date().toISOString(),
    };
  });

  function checkForUpdatesNow() {
    if (manualCheckPromise) {
      return manualCheckPromise;
    }

    latestUpdateState = {
      ...latestUpdateState,
      status: "checking",
      checking: true,
      error: "",
    };

    manualCheckPromise = new Promise((resolve) => {
      let settled = false;
      let timeoutId = null;

      const finish = (result) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        autoUpdater.off("update-available", onAvailable);
        autoUpdater.off("update-not-available", onNotAvailable);
        autoUpdater.off("error", onError);
        manualCheckPromise = null;
        resolve({
          ...latestUpdateState,
          ...result,
          checkedAt: latestUpdateState.checkedAt || new Date().toISOString(),
        });
      };

      const onAvailable = (info) => {
        finish({
          ok: true,
          status: "available",
          availableVersion: info.version || "",
          releaseDate: info.releaseDate,
          message: "Update available.",
        });
      };

      const onNotAvailable = (info) => {
        finish({
          ok: true,
          status: "not-available",
          latestVersion: info.version || app.getVersion(),
          message: "Already up to date.",
        });
      };

      const onError = (error) => {
        finish({
          ok: false,
          status: "error",
          error: error.message,
          message: error.message,
        });
      };

      autoUpdater.once("update-available", onAvailable);
      autoUpdater.once("update-not-available", onNotAvailable);
      autoUpdater.once("error", onError);

      timeoutId = setTimeout(() => {
        latestUpdateState = {
          ...latestUpdateState,
          status: "error",
          checking: false,
          error: "Update check timed out.",
          checkedAt: new Date().toISOString(),
        };
        finish({
          ok: false,
          status: "error",
          error: "Update check timed out.",
          message: "Update check timed out.",
        });
      }, 60000);

      autoUpdater.checkForUpdates().catch(onError);
    });

    return manualCheckPromise;
  }

  setTimeout(() => {
    checkForUpdatesNow().catch((error) => {
      console.warn("Update check failed:", error.message);
    });
  }, 4000);

  return {
    ...status,
    getStatus: () => ({ ...latestUpdateState }),
    checkForUpdates: checkForUpdatesNow,
  };
}

function createDisabledUpdateController(reason, details = {}) {
  const state = {
    ...details,
    enabled: false,
    status: "disabled",
    reason,
    version: app.getVersion(),
  };
  return {
    ...state,
    getStatus: () => ({ ...state }),
    checkForUpdates: async () => ({
      ...state,
      ok: false,
      message: reason,
    }),
  };
}

function getUpdateStatus(packageJsonPath = path.join(__dirname, "..", "package.json")) {
  if (!app) {
    return { enabled: false, reason: "electron app unavailable" };
  }

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
