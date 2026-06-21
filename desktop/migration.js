const fs = require("node:fs");
const path = require("node:path");

const SETTINGS_FILE = "api-profiles.json";
const ENV_FILE = ".env";
const OUTPUTS_DIR = "outputs";
const STATE_FILE = "desktop-migration-state.json";

function migrateLegacyData(options) {
  const dataDir = path.resolve(options.dataDir);
  const force = options.force === true || process.env.YAOTU_FORCE_LEGACY_MIGRATION === "1";
  fs.mkdirSync(dataDir, { recursive: true });

  const state = force ? makeEmptyState() : loadState(dataDir);
  const report = {
    ranAt: new Date().toISOString(),
    dataDir,
    sources: [],
    copied: [],
    skipped: [],
    errors: [],
  };

  for (const sourceDir of discoverLegacyDataDirs(options)) {
    if (!isUsableSourceDir(sourceDir, dataDir)) {
      continue;
    }

    const normalizedSource = normalizePath(sourceDir);
    if (!force && state.migratedSources.includes(normalizedSource)) {
      report.skipped.push({ type: "source", from: sourceDir, reason: "already migrated" });
      continue;
    }

    const artifacts = getLegacyArtifacts(sourceDir);
    if (!artifacts.hasAny) {
      continue;
    }

    const errorCountBefore = report.errors.length;
    report.sources.push(sourceDir);
    copyFileIfMissing(path.join(sourceDir, ENV_FILE), path.join(dataDir, ENV_FILE), ENV_FILE, report);
    copyFileIfMissing(path.join(sourceDir, SETTINGS_FILE), path.join(dataDir, SETTINGS_FILE), SETTINGS_FILE, report);
    copyDirectoryMerge(path.join(sourceDir, OUTPUTS_DIR), path.join(dataDir, OUTPUTS_DIR), OUTPUTS_DIR, report);

    if (report.errors.length === errorCountBefore) {
      state.migratedSources = unique([...state.migratedSources, normalizedSource]);
    }
  }

  state.updatedAt = report.ranAt;
  writeState(dataDir, state, report);
  return report;
}

function discoverLegacyDataDirs(options) {
  const dirs = [];
  addDir(dirs, process.env.YAOTU_LEGACY_DATA_DIR);
  addDir(dirs, options.legacyDataDir);
  addDir(dirs, options.cwd);
  addDir(dirs, options.appDir);
  addDir(dirs, parentDir(options.portableExecutableFile));
  addDir(dirs, parentDir(parentDir(options.portableExecutableFile)));
  addDir(dirs, options.portableExecutableDir);
  addDir(dirs, parentDir(options.portableExecutableDir));
  addDir(dirs, options.executableDir);
  addDir(dirs, parentDir(options.executableDir));
  addDir(dirs, parentDir(parentDir(options.executableDir)));

  return unique(dirs.map((dir) => path.resolve(dir)));
}

function getLegacyArtifacts(sourceDir) {
  const envPath = path.join(sourceDir, ENV_FILE);
  const settingsPath = path.join(sourceDir, SETTINGS_FILE);
  const outputsPath = path.join(sourceDir, OUTPUTS_DIR);
  const hasEnv = isFile(envPath);
  const hasSettings = isFile(settingsPath);
  const hasOutputs = isDirectory(outputsPath);

  return {
    hasAny: hasEnv || hasSettings || hasOutputs,
    hasEnv,
    hasSettings,
    hasOutputs,
  };
}

function copyFileIfMissing(from, to, label, report) {
  if (!isFile(from)) {
    return;
  }

  if (fs.existsSync(to)) {
    report.skipped.push({ type: "file", label, from, to, reason: "target exists" });
    return;
  }

  try {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    report.copied.push({ type: "file", label, from, to, bytes: fs.statSync(to).size });
  } catch (error) {
    report.errors.push({ type: "file", label, from, to, message: error.message });
  }
}

function copyDirectoryMerge(from, to, label, report) {
  if (!isDirectory(from)) {
    return;
  }

  const stats = { files: 0, directories: 0, skipped: 0 };
  try {
    fs.mkdirSync(to, { recursive: true });
    copyDirectoryContents(from, to, stats);
    report.copied.push({ type: "directory", label, from, to, ...stats });
  } catch (error) {
    report.errors.push({ type: "directory", label, from, to, message: error.message });
  }
}

function copyDirectoryContents(from, to, stats) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const sourcePath = path.join(from, entry.name);
    const targetPath = path.join(to, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
        stats.directories += 1;
      }
      copyDirectoryContents(sourcePath, targetPath, stats);
      continue;
    }

    if (!entry.isFile()) {
      stats.skipped += 1;
      continue;
    }

    if (fs.existsSync(targetPath)) {
      stats.skipped += 1;
      continue;
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    stats.files += 1;
  }
}

function loadState(dataDir) {
  const statePath = path.join(dataDir, STATE_FILE);
  if (!isFile(statePath)) {
    return makeEmptyState();
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, "utf8"));
    return {
      migratedSources: Array.isArray(parsed.migratedSources) ? parsed.migratedSources : [],
      updatedAt: parsed.updatedAt || "",
    };
  } catch {
    return makeEmptyState();
  }
}

function writeState(dataDir, state, report) {
  const statePath = path.join(dataDir, STATE_FILE);
  try {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
  } catch (error) {
    report.errors.push({ type: "state", to: statePath, message: error.message });
  }
}

function makeEmptyState() {
  return { migratedSources: [], updatedAt: "" };
}

function isUsableSourceDir(sourceDir, dataDir) {
  if (!sourceDir || !isDirectory(sourceDir)) {
    return false;
  }

  const source = normalizePath(sourceDir);
  const target = normalizePath(dataDir);
  if (source === target || source.includes(".asar")) {
    return false;
  }

  return true;
}

function isDirectory(targetPath) {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function isFile(targetPath) {
  try {
    return fs.statSync(targetPath).isFile();
  } catch {
    return false;
  }
}

function parentDir(dir) {
  return dir ? path.dirname(dir) : "";
}

function addDir(dirs, dir) {
  if (typeof dir === "string" && dir.trim()) {
    dirs.push(dir);
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizePath(targetPath) {
  const resolved = path.resolve(targetPath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

module.exports = {
  migrateLegacyData,
  discoverLegacyDataDirs,
};
