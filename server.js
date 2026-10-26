const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

// 提示词构建器已抽到 shared/promptBuilders.cjs（桌面/手机双端共用的纯逻辑），此处 require 回来。
// 下面这些名字都是从原来 server.js 里「原样搬走」的纯函数，行为逐字节不变；带副作用的东西
//（requestAuxiliaryChat / getAuxiliaryApiConfig / prepareAnalysisImages / extractModelIds 等）仍留在本文件。
const {
  normalizePromptOptimizeMode,
  buildPromptOptimizationPrompt,
  extractOptimizedPromptText,
  extractOptimizedNegativePromptText,
  buildAnalysisPrompt,
  maxTokensForAnalysisMode,
  normalizeAnalysisTargetSize,
  analysisTargetCanvasInstruction,
  buildPromptExtractionPrompt,
  buildKeywordExtractionPrompt,
  buildStyleExtractionPrompt,
  buildSceneExtractionPrompt,
  extractTextFromModelResponse,
  normalizeAnalysisMode,
} = require("./shared/promptBuilders.cjs");

const rootDir = __dirname;
const dataDir = path.resolve(process.env.YAOTU_DATA_DIR || rootDir);
const outputDir = path.join(dataDir, "outputs");
const styleReferenceDir = path.join(outputDir, "_style-references");
const projectsDir = path.join(outputDir, "_projects");
const envPath = path.join(dataDir, ".env");
const settingsPath = path.join(dataDir, "api-profiles.json");
const uiPrefsPath = path.join(dataDir, "ui-prefs.json");

loadDotEnv(envPath);

const PORT = Number(process.env.PORT || 8787);
const CANONICAL_LOCAL_HOST = "127.0.0.1";
// 默认只绑定回环地址，避免局域网内其他设备直接调用本机 API（烧 Key、删文件）；
// 确需局域网共享时用 YAOTU_HOST 环境变量显式覆盖（如 0.0.0.0）。
const HOST = String(process.env.YAOTU_HOST || "").trim() || CANONICAL_LOCAL_HOST;
const ENV_OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ENV_OPENAI_BASE_URL = stripTrailingSlash(process.env.OPENAI_BASE_URL || "https://api.openai.com");
const ENV_OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const ENDPOINT_MODE_VALUES = ["images", "chat", "responses"];
const ENV_OPENAI_IMAGE_ENDPOINT_MODE = ENDPOINT_MODE_VALUES.includes(String(process.env.OPENAI_IMAGE_ENDPOINT_MODE || "").toLowerCase())
  ? String(process.env.OPENAI_IMAGE_ENDPOINT_MODE).toLowerCase()
  : "images";
const OPENAI_IMAGE_TIMEOUT_MS = clampInteger(process.env.OPENAI_IMAGE_TIMEOUT_MS, 60000, 1200000, 600000);
const MAX_JSON_BODY_BYTES = clampInteger(process.env.MAX_JSON_BODY_BYTES, 1024 * 1024, 100 * 1024 * 1024, 100 * 1024 * 1024);
const errorLogPath = path.join(dataDir, "server.err.log");
let updateController = null;

let APP_VERSION = "0.0.0";
try {
  APP_VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8")).version || APP_VERSION;
} catch {
  // 读不到 package.json 就用兜底版本号
}

const LEGACY_SIZES = new Set([
  "auto",
  "1024x1024",
  "1024x1536",
  "1536x1024",
]);
const GPT_IMAGE_2_MAX_PIXELS = 8294400;
const GPT_IMAGE_2_MAX_SIDE = 3840;
const GPT_IMAGE_2_MIN_SIDE = 16;
const ALLOWED_QUALITIES = new Set(["auto", "low", "medium", "high"]);
const ALLOWED_FORMATS = new Set(["png", "jpeg", "webp"]);
const ALLOWED_BACKGROUNDS = new Set(["auto", "opaque", "transparent"]);
const ALLOWED_ENDPOINT_MODES = new Set(ENDPOINT_MODE_VALUES);
// ALLOWED_PROMPT_OPTIMIZE_MODES 与 normalizePromptOptimizeMode 一起搬去了 shared/promptBuilders.cjs。
const MANJU_ARCHIVE_CATEGORIES = {
  "character-profile": { label: "人设资料", folder: "01-人设资料" },
  "turnaround": { label: "三视图", folder: "02-三视图" },
  detail: { label: "细节图", folder: "03-细节图" },
  expression: { label: "表情图", folder: "04-表情图" },
  scene: { label: "场景图", folder: "05-场景图" },
  "shot-candidate": { label: "分镜候选", folder: "06-分镜候选" },
  "shot-final": { label: "分镜定稿", folder: "07-分镜定稿" },
  discarded: { label: "废稿", folder: "99-废稿" },
};
const DEFAULT_MANJU_ARCHIVE_CATEGORY = "shot-candidate";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && shouldServeLocalStorageCleanup(req, requestUrl)) {
      return sendCanonicalCleanupPage(res, requestUrl);
    }

    if (req.method === "HEAD" && shouldRedirectToCanonicalHost(req)) {
      res.writeHead(308, { Location: getCanonicalLocalUrl(requestUrl) });
      res.end();
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/config") {
      const apiConfig = getActiveApiConfig();
      return sendJson(res, 200, {
        hasApiKey: Boolean(apiConfig.apiKey),
        defaultModel: apiConfig.imageModel,
        baseUrl: apiConfig.baseUrl,
        endpointMode: apiConfig.endpointMode,
        activeProfileName: apiConfig.name,
        outputDir,
        version: APP_VERSION,
      });
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/update/status") {
      return sendJson(res, 200, getUpdateStatusPayload());
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/update/check") {
      const result = await checkForAppUpdates();
      return sendJson(res, 200, result);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/settings") {
      return sendJson(res, 200, sanitizeSettings(loadSettings()));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/settings") {
      const body = await readJson(req);
      const settings = saveSettings(body);
      return sendJson(res, 200, sanitizeSettings(settings));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/settings/delete") {
      const body = await readJson(req);
      const settings = deleteProfile(body.profileId || body.id);
      return sendJson(res, 200, sanitizeSettings(settings));
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/ui-prefs") {
      return sendJson(res, 200, readUiPrefs());
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/ui-prefs") {
      const body = await readJson(req);
      return sendJson(res, 200, saveUiPrefs(body));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/test-connection") {
      const body = await readJson(req);
      const result = await testConnection(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/image-models") {
      const body = await readJson(req);
      const result = await listImageModels(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/test-auxiliary") {
      const body = await readJson(req);
      const result = await testAuxiliaryConnection(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/auxiliary-settings") {
      const body = await readJson(req);
      const settings = saveAuxiliarySettings(body);
      return sendJson(res, 200, sanitizeSettings(settings));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/auxiliary-settings/delete") {
      const body = await readJson(req);
      const settings = deleteAuxiliaryProfile(body.profileId || body.id);
      return sendJson(res, 200, sanitizeSettings(settings));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/auxiliary-models") {
      const body = await readJson(req);
      const result = await listAuxiliaryModels(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/saved-prompts") {
      const body = await readJson(req);
      const settings = saveSavedPrompt(body);
      return sendJson(res, 200, sanitizeSettings(settings));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/saved-prompts/delete") {
      const body = await readJson(req);
      const settings = deleteSavedPrompt(body.id);
      return sendJson(res, 200, sanitizeSettings(settings));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/recent-prompts") {
      const body = await readJson(req);
      const settings = saveRecentPrompt(body);
      return sendJson(res, 200, sanitizeSettings(settings));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/recent-prompts/delete") {
      const body = await readJson(req);
      const settings = deleteRecentPrompt(body.id);
      return sendJson(res, 200, sanitizeSettings(settings));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/saved-styles") {
      const body = await readJson(req);
      const settings = saveSavedStyle(body);
      return sendJson(res, 200, sanitizeSettings(settings));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/saved-styles/delete") {
      const body = await readJson(req);
      const settings = deleteSavedStyle(body.id);
      return sendJson(res, 200, sanitizeSettings(settings));
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/images") {
      return sendJson(res, 200, listImages({
        page: requestUrl.searchParams.get("page"),
        pageSize: requestUrl.searchParams.get("pageSize"),
      }));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/images/delete") {
      const body = await readJson(req);
      const result = deleteImages(body.ids);
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/generate") {
      const body = await readJson(req);
      const result = await generateImages(body);
      return sendJson(res, 200, result);
    }

    // 漫剧项目（磁盘持久化的生图任务包）。
    // 注意：所有带 project / render 的响应统一过 projectResponseForApi ——
    // 磁盘上 file 存契约相对路径，响应里解析成可显示的 /outputs/... URL。
    if (req.method === "GET" && requestUrl.pathname === "/api/projects") {
      return sendJson(res, 200, listProjects());
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/project") {
      return sendJson(res, 200, projectResponseForApi(getProject(requestUrl.searchParams.get("key"))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/projects/import") {
      const body = await readJson(req);
      return sendJson(res, 200, projectResponseForApi(await importJobPackage(body)));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/character-ref") {
      const body = await readJson(req);
      return sendJson(res, 200, projectResponseForApi(await addProjectCharacterRef(body)));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/generate-shot") {
      const body = await readJson(req);
      return sendJson(res, 200, projectResponseForApi(await generateProjectShot(body)));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/generate-character-base") {
      const body = await readJson(req);
      return sendJson(res, 200, projectResponseForApi(await generateCharacterBase(body)));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/choose") {
      const body = await readJson(req);
      return sendJson(res, 200, projectResponseForApi(await chooseProjectRender(body)));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/export") {
      const body = await readJson(req);
      return sendJson(res, 200, exportProject(body));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/open-folder") {
      const body = await readJson(req);
      return sendJson(res, 200, openProjectExportFolder(body));
    }
    // 漫剧编辑层：手动增删改
    if (req.method === "POST" && requestUrl.pathname === "/api/project/create") {
      return sendJson(res, 200, projectResponseForApi(await createEmptyProject(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/delete") {
      return sendJson(res, 200, await deleteProject(await readJson(req)));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/shot") {
      return sendJson(res, 200, projectResponseForApi(await upsertProjectShot(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/shot/delete") {
      return sendJson(res, 200, projectResponseForApi(await deleteProjectShot(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/character") {
      return sendJson(res, 200, projectResponseForApi(await upsertProjectCharacter(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/character/delete") {
      return sendJson(res, 200, projectResponseForApi(await deleteProjectCharacter(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/character-form") {
      return sendJson(res, 200, projectResponseForApi(await upsertCharacterForm(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/character-form/delete") {
      return sendJson(res, 200, projectResponseForApi(await deleteCharacterForm(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/character-ref/delete") {
      return sendJson(res, 200, projectResponseForApi(await deleteProjectCharacterRef(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/character-refs/delete") {
      return sendJson(res, 200, projectResponseForApi(await deleteProjectCharacterRefs(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/character-ref/lock") {
      return sendJson(res, 200, projectResponseForApi(await lockProjectCharacterRef(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/character-ref/update") {
      return sendJson(res, 200, projectResponseForApi(await updateProjectCharacterRef(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/character-ref/reorder") {
      return sendJson(res, 200, projectResponseForApi(await reorderProjectCharacterRefs(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/candidate/delete") {
      return sendJson(res, 200, projectResponseForApi(await deleteProjectCandidate(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/character-base-candidate/delete") {
      return sendJson(res, 200, projectResponseForApi(await deleteCharacterBaseCandidate(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/settings") {
      return sendJson(res, 200, projectResponseForApi(await updateProjectSettings(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/trash/info") {
      return sendJson(res, 200, projectResponseForApi(getProjectTrashInfo(await readJson(req))));
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/project/trash/empty") {
      return sendJson(res, 200, projectResponseForApi(await emptyProjectTrash(await readJson(req))));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/analyze-image") {
      const body = await readJson(req);
      const result = await analyzeImages(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/optimize-prompt") {
      const body = await readJson(req);
      const result = await optimizePrompt(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "GET" && requestUrl.pathname.startsWith("/outputs/")) {
      const relativePath = decodeURIComponent(requestUrl.pathname.replace(/^\/outputs\//, ""));
      return serveFile(res, outputDir, relativePath, outputsCacheControl(relativePath));
    }

    // 新版前端（Vite 构建产物）托管在 /studio，与旧页面并存。
    if (req.method === "GET" && (requestUrl.pathname === "/studio" || requestUrl.pathname.startsWith("/studio/"))) {
      const studioDir = path.join(rootDir, "app", "dist");
      let relativePath = requestUrl.pathname.replace(/^\/studio\/?/, "");
      if (!relativePath || !/\.[a-z0-9]+$/i.test(relativePath)) {
        relativePath = "index.html"; // SPA 回退
      }
      return serveFile(res, studioDir, relativePath);
    }

    if (req.method === "GET") {
      // 旧版 vanilla-JS 页面已下线，所有未命中的 GET 统一重定向到新版 /studio。
      res.writeHead(302, { Location: "/studio" });
      return res.end();
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    const normalized = normalizeServerError(error);
    const status = normalized.statusCode;
    if (status >= 500) {
      logError(normalized, `${req.method} ${req.url}`);
    }
    sendJson(res, status, {
      error: normalized.publicMessage,
      requestId: normalized.requestId,
      detail: status >= 500 ? undefined : normalized.message,
    });
  }
});

// ===== 漫剧项目库（磁盘持久化的生图任务包，存在 outputs/_projects/<key>/）=====

function projectSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9一-龥_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "project";
}

function projectKeyFromPackage(pkg) {
  const base = projectSlug(pkg?.project?.id || pkg?.project?.name || "project");
  const ep = pkg?.episode ? `-${projectSlug(pkg.episode)}` : "";
  return `${base}${ep}`.slice(0, 100);
}

function projectDirFor(key) {
  const slug = projectSlug(key);
  const dir = path.resolve(projectsDir, slug);
  if (!dir.startsWith(path.resolve(projectsDir) + path.sep)) {
    throw httpError(400, "Bad project key.");
  }
  return dir;
}

function readProjectFile(key) {
  const file = path.join(projectDirFor(key), "project.json");
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeProjectFile(key, project) {
  const dir = projectDirFor(key);
  fs.mkdirSync(dir, { recursive: true });
  // 先写临时文件再 rename，进程中途崩溃也不会留下截断的 project.json。
  // 写入方都在 withProject 队列里串行执行，固定临时文件名不会互相踩。
  const file = path.join(dir, "project.json");
  const tmp = path.join(dir, "project.json.tmp");
  try {
    fs.writeFileSync(tmp, JSON.stringify(project, null, 2), "utf8");
    fs.renameSync(tmp, file);
  } catch (error) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // 临时文件清不掉不阻断
    }
    throw error;
  }
  return project;
}

function projectSummary(key, project) {
  const characters = Array.isArray(project.characters) ? project.characters : [];
  const shots = Array.isArray(project.shots) ? project.shots : [];
  const renders = Array.isArray(project.renders) ? project.renders : [];
  return {
    key,
    name: project.project?.name || key,
    episode: project.episode || "",
    medium: project.project?.medium || "vertical",
    characterCount: characters.length,
    charactersWithRef: characters.filter((c) => Array.isArray(c.referenceImages) && c.referenceImages.length).length,
    shotCount: shots.length,
    chosenCount: renders.filter((r) => r.chosenImageId).length,
  };
}

function listProjects() {
  if (!fs.existsSync(projectsDir)) {
    return { projects: [] };
  }
  const keys = fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const projects = [];
  for (const key of keys) {
    const project = readProjectFile(key);
    if (project) {
      projects.push(projectSummary(key, project));
    }
  }
  projects.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return { projects };
}

function getProject(key) {
  if (!key) {
    throw httpError(400, "Missing project key.");
  }
  const project = readProjectFile(key);
  if (!project) {
    throw httpError(404, "Project not found.");
  }
  return { key: projectSlug(key), project };
}

// ===== 项目图片路径：磁盘存契约相对路径，响应边界解析成 URL =====
// 契约（docs/生图任务包-接口规范.md §2、shared/job-package.ts）：project.json 里的
// candidate.file / referenceImages[].file 存**项目文件夹内相对路径**（如
// "outputs/S01E01-C01-SH03/cand-01.png"），项目文件夹整体 zip 给队友即自包含。
// API 响应仍要给前端可直接 <img src> 的地址，所以出门前统一解析成
// /outputs/_projects/<key>/<relPath> URL。解析只发生在响应边界（深拷贝），
// 绝不把解析后的 URL 写回磁盘。

// 镜号/角色 id 可能来自用户手输（upsertProjectShot 等），当目录名用之前清洗掉
// 路径分隔符和 Windows 非法字符，杜绝路径穿越；空串兜底。
function safePathSegment(value) {
  const cleaned = String(value || "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 100);
  return cleaned && !/^-+$/.test(cleaned) ? cleaned : "segment";
}

// 契约相对路径 → 可显示 URL；已是 URL / data: 的原样透传（旧数据兜底，见迁移注释）。
function resolveProjectFileUrl(key, file) {
  const value = String(file || "");
  if (!value || value.startsWith("/outputs/") || value.startsWith("data:") || /^https?:\/\//i.test(value)) {
    return value;
  }
  return `/outputs/_projects/${projectSlug(key)}/${value.replace(/^\/+/, "")}`;
}

// candidate.file / ref.file → 磁盘绝对路径（删除、导出、挂参考图读盘用）。
// 兼容两种形态：契约相对路径（拼进项目目录，resolve 后必须仍在项目目录内，防穿越）、
// /outputs/ 开头的旧 URL；其余（http、data:）返回 null。
function projectFileDiskPath(key, file) {
  const value = String(file || "");
  if (!value) return null;
  if (value.startsWith("/outputs/")) return resolveOutputUrl(value);
  if (value.startsWith("data:") || /^https?:\/\//i.test(value)) return null;
  const base = projectDirFor(key);
  const filePath = path.resolve(base, value.replace(/^\/+/, ""));
  if (!filePath.startsWith(base + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return null;
  }
  return filePath;
}

// 把一张图复制（不是移动）进项目文件夹，返回契约相对路径（永远正斜杠）。
// relDir 形如 "outputs/s01e01-c01-sh03" / "characters/林安"，prefix 形如 "cand" / "ref"。
// 序号扫目录取最大值 +1 再 existsSync 兜底，与参考图命名同一套防覆盖策略。
function copyFileIntoProject(key, relDir, prefix, sourceDiskPath) {
  const dir = path.join(projectDirFor(key), relDir);
  fs.mkdirSync(dir, { recursive: true });
  const extension = (path.extname(sourceDiskPath) || ".png").toLowerCase();
  let seq = 0;
  for (const name of fs.readdirSync(dir)) {
    const match = new RegExp(`^${prefix}-(\\d+)\\.`).exec(name);
    if (match) seq = Math.max(seq, Number(match[1]));
  }
  let fileName;
  do {
    seq += 1;
    fileName = `${prefix}-${String(seq).padStart(2, "0")}${extension}`;
  } while (fs.existsSync(path.join(dir, fileName)));
  fs.copyFileSync(sourceDiskPath, path.join(dir, fileName));
  return `${relDir.split(path.sep).join("/")}/${fileName}`;
}

// ===== 角色多形象 + 参考图分组帮手 =====
// 旧 project.json 的 ref 没有 formId 字段、character 没有 forms 字段，
// 一律视为 default 形象——所有 formId 比较统一走 refFormId，无迁移直接可读。
const REFERENCE_ROLE_VALUES = new Set(["base", "turnaround", "expression", "detail"]);

function refFormId(ref) {
  return (ref && ref.formId) || "default";
}

function characterFormIds(character) {
  const ids = new Set(["default"]);
  for (const form of Array.isArray(character?.forms) ? character.forms : []) {
    ids.add(String(form.id));
  }
  return ids;
}

function normalizeRefRole(value) {
  const role = String(value == null ? "" : value).trim();
  if (!role) return "base";
  if (!REFERENCE_ROLE_VALUES.has(role)) {
    throw httpError(400, "参考图用途不合法（只支持 base / turnaround / expression / detail）。");
  }
  return role;
}

function validateFormId(character, value) {
  const formId = String(value == null ? "" : value).trim();
  if (!formId) return "default";
  if (!characterFormIds(character).has(formId)) {
    throw httpError(400, "形象不存在。");
  }
  return formId;
}

// 把文件或目录移进项目内回收站 <项目>/.trash/，返回移入后的绝对路径。
// 不做 UI 级恢复：恢复 = 用户手动去 .trash 文件夹捞。
function moveIntoProjectTrash(key, diskPath) {
  const trashDir = path.join(projectDirFor(key), ".trash");
  fs.mkdirSync(trashDir, { recursive: true });
  const baseName = path.basename(diskPath);
  const ts = Date.now();
  let target = path.join(trashDir, `${ts}-${baseName}`);
  // 同毫秒同名兜底：时间戳后递增序号，绝不覆盖回收站里已有的文件。
  let n = 1;
  while (fs.existsSync(target)) {
    n += 1;
    target = path.join(trashDir, `${ts}-${n}-${baseName}`);
  }
  try {
    fs.renameSync(diskPath, target);
  } catch {
    // rename 失败（跨盘 EXDEV 等）兜底：复制再删源；目录要递归复制。
    if (fs.statSync(diskPath).isDirectory()) {
      fs.cpSync(diskPath, target, { recursive: true });
      fs.rmSync(diskPath, { recursive: true, force: true });
    } else {
      fs.copyFileSync(diskPath, target);
      fs.unlinkSync(diskPath);
    }
  }
  return target;
}

// 锚补位：该 formId 组内还有参考图但没有锚点 → 组内第一张补成锚点（就地改）。
// 删除 / 跨形象移动之后调用，维持「组内有图必有锚」的自洽语义。
function ensureFormAnchor(refs, formId) {
  const sameForm = refs.filter((r) => refFormId(r) === formId);
  if (sameForm.length && !sameForm.some((r) => r.locked)) {
    sameForm[0].locked = true;
  }
}

function resolveRenderFilesInPlace(key, renders) {
  for (const render of Array.isArray(renders) ? renders : []) {
    for (const cand of Array.isArray(render?.candidates) ? render.candidates : []) {
      if (cand && cand.file) cand.file = resolveProjectFileUrl(key, cand.file);
    }
  }
}

// 深拷贝 project 并把所有 file 字段解析成 URL。
// baseCandidates 是新旧混合数组：旧字符串条目（全局批次 URL、不在契约里）沿用
// 死链过滤 + 原样透传；新对象条目（持久化在项目 _candidates/）把 file 解析成
// URL、文件已不存在的过滤掉。只过滤深拷贝，不写盘——持久清理在
// generateCharacterBase 合并新候选（本来就要写盘）时顺手做。
function projectForResponse(key, project) {
  const clone = JSON.parse(JSON.stringify(project));
  const characters = Array.isArray(clone.characters) ? clone.characters : [];
  const scenes = Array.isArray(clone.scenes) ? clone.scenes : [];
  for (const holder of [...characters, ...scenes]) {
    for (const ref of Array.isArray(holder?.referenceImages) ? holder.referenceImages : []) {
      if (ref && ref.file) ref.file = resolveProjectFileUrl(key, ref.file);
    }
  }
  for (const character of characters) {
    if (Array.isArray(character?.baseCandidates)) {
      character.baseCandidates = character.baseCandidates
        .filter((entry) => typeof entry === "string"
          ? resolveOutputUrl(entry) !== null
          : entry && projectFileDiskPath(key, entry.file) !== null)
        .map((entry) => typeof entry === "string"
          ? entry
          : { ...entry, file: resolveProjectFileUrl(key, entry.file) });
    }
  }
  resolveRenderFilesInPlace(key, clone.renders);
  return clone;
}

function renderForResponse(key, render) {
  const clone = JSON.parse(JSON.stringify(render));
  resolveRenderFilesInPlace(key, [clone]);
  return clone;
}

// 所有返回 { key, project?, render? } 的项目 API 统一过这一层再 sendJson。
function projectResponseForApi(response) {
  if (!response || typeof response !== "object" || !response.key) return response;
  const out = { ...response };
  if (out.project && typeof out.project === "object") out.project = projectForResponse(out.key, out.project);
  if (out.render && typeof out.render === "object") out.render = renderForResponse(out.key, out.render);
  return out;
}

// ===== 项目写入串行化 =====
// project.json 的读-改-写此前完全无锁：任何在读与写之间让出事件循环的 handler
// （生图这种跨 await 几十秒的尤甚）都可能整份覆盖掉期间落盘的其他编辑。
// 这里给每个项目 key 维护一条内存串行队列（promise 链），同一项目的所有
// 读-改-写按到达顺序互斥执行。
const projectTaskQueues = new Map(); // 项目 slug → 队列尾部 promise（永不 reject）

function enqueueProjectTask(key, task) {
  const slug = projectSlug(key);
  const tail = projectTaskQueues.get(slug) || Promise.resolve();
  const run = tail.then(() => task());
  // 错误只传播给本次调用方；队列尾部吞掉 rejection，后续任务照常执行，链条不会卡死。
  const settled = run.then(() => undefined, () => undefined);
  projectTaskQueues.set(slug, settled);
  settled.then(() => {
    // 队列排空后清掉 Map 条目，避免 key 无限累积。
    if (projectTaskQueues.get(slug) === settled) {
      projectTaskQueues.delete(slug);
    }
  });
  return run;
}

// 串行化的「读-改-写」：mutator(project, ctx) 拿到刚从磁盘读出的最新 project，
// 同步或异步改完后由这里统一盖 updatedAt 并 writeProjectFile。约定：
//  - mutator 返回 undefined      → 响应统一为 { key, project }
//  - mutator 返回对象            → 用它作响应（choose / candidate delete 等自定义形状）
//  - mutator 置 ctx.skipWrite    → 本次不写盘（生图完成但目标已被删除时用）
//  - mutator 抛错                → 不写盘，错误原样传给调用方，队列继续
function withProject(key, mutator) {
  return enqueueProjectTask(key, async () => {
    const { key: slug, project } = getProject(key);
    const ctx = { key: slug, skipWrite: false };
    const response = await mutator(project, ctx);
    if (!ctx.skipWrite) {
      project.project.updatedAt = new Date().toISOString();
      writeProjectFile(slug, project);
    }
    return response === undefined ? { key: slug, project } : response;
  });
}

// 媒介 → 默认出图尺寸。手抄自 shared/job-package.ts 的 MEDIUM_SIZE（gpt-image-2 约束：
// 边÷16、≤3840、总像素≤8,294,400）。server.js 是 CommonJS，require 不了那份 TS，
// 所以这里保留一份副本——改动时两边要同步。
const MEDIUM_SIZE = {
  vertical: { default: "2160x3840", options: ["2160x3840", "1440x2560", "1080x1920"] },
  horizontal: { default: "3840x2160", options: ["3840x2160", "2560x1440", "1920x1088"] },
  animation: { default: "2560x1440", options: ["3840x2160", "2560x1440", "1920x1088"] },
};

function defaultSizeForMedium(medium) {
  return (MEDIUM_SIZE[medium] || MEDIUM_SIZE.vertical).default;
}

function importJobPackage(pkg) {
  if (!pkg || typeof pkg !== "object" || !pkg.project || !Array.isArray(pkg.shots)) {
    throw httpError(400, "不是有效的生图任务包（缺 project 或 shots）。");
  }
  // §7 版本兼容：只看主版本号，主版本是 1 就能读（次版本只增字段）；缺省视为 "1.0"。
  const schemaVersion = String(pkg.schemaVersion ?? "").trim() || "1.0";
  const majorVersion = Number.parseInt(schemaVersion.split(".")[0], 10);
  if (majorVersion !== 1) {
    throw httpError(400, `任务包版本 ${schemaVersion} 高于本工具支持的 1.x，请升级妖荼。`);
  }
  // §4 shots 去重 + 排序：shotId 可能是 "S01E01-C01-SH03" 全格式，也可能是降级的
  // "C01-SH01" / "SH01"，用 numeric localeCompare 自然排序数字段；同 shotId 后者覆盖前者。
  // characterIds 是 Scriptwriter 尽力而为解析的，可能整个缺——这里兜成 []，免得前端 .map 崩。
  const shotsById = new Map();
  for (const shot of pkg.shots) {
    if (!shot || typeof shot !== "object") continue;
    shotsById.set(String(shot.shotId || ""), {
      ...shot,
      characterIds: Array.isArray(shot.characterIds) ? shot.characterIds : [],
    });
  }
  const shots = [...shotsById.values()].sort((a, b) =>
    String(a.shotId || "").localeCompare(String(b.shotId || ""), "en", { numeric: true })
  );
  const key = projectKeyFromPackage(pkg);
  // 导入也是「读旧 project → 合并 → 整份写回」，走同一条队列避免与编辑互相覆盖。
  return enqueueProjectTask(key, () => {
    const existing = readProjectFile(key);
    const existingChars = new Map((existing?.characters || []).map((c) => [c.id, c]));

    // 重导（同一任务包再次导入）只能覆盖 Scriptwriter 产出的字段；forms / baseCandidates
    // 是妖荼侧编辑层数据，包里天然没有，必须从旧角色 carry over（与 referenceImages 同方式），
    // 否则带 formId 的参考图/候选变孤儿（见 IMPORT-LOSS 复盘）。
    const characters = (Array.isArray(pkg.characters) ? pkg.characters : []).map((c) => {
      const prior = existingChars.get(c.id);
      return {
        ...c,
        referenceImages: prior?.referenceImages || [],
        forms: prior?.forms || [],
        baseCandidates: prior?.baseCandidates || [],
      };
    });
    const charsById = new Map(characters.map((c) => [c.id, c]));

    // shot.characterForms 同理是妖荼侧编辑层字段，Scriptwriter 包不产出，重建 shots 时
    // 按 shotId 从旧项目 carry over；清洗掉新 shot 已不再关联的角色、以及形象已被删除
    // （不在合并后角色 forms 里）的条目，避免残留指向不存在形象的悬空 formId。
    const existingShotsById = new Map((existing?.shots || []).map((s) => [String(s.shotId || ""), s]));
    for (const shot of shots) {
      const priorForms = existingShotsById.get(String(shot.shotId || ""))?.characterForms;
      if (!priorForms || typeof priorForms !== "object") continue;
      const idSet = new Set(shot.characterIds);
      const cleaned = {};
      for (const [cid, formId] of Object.entries(priorForms)) {
        if (!idSet.has(cid)) continue;
        const char = charsById.get(cid);
        if (!char || !characterFormIds(char).has(String(formId))) continue;
        cleaned[cid] = formId;
      }
      if (Object.keys(cleaned).length > 0) shot.characterForms = cleaned;
    }

    // §6 defaults.size 由 medium 推导兜底；包里给了非空 size 才覆盖。
    const medium = pkg.project.medium || "vertical";
    const pkgDefaults = pkg.defaults && typeof pkg.defaults === "object" ? { ...pkg.defaults } : {};
    if (!pkgDefaults.size) delete pkgDefaults.size;

    const project = {
      schemaVersion,
      project: {
        id: pkg.project.id,
        name: pkg.project.name || pkg.project.id,
        medium,
        createdAt: existing?.project?.createdAt || pkg.project.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      episode: pkg.episode || "",
      style: pkg.style && typeof pkg.style === "object" ? pkg.style : { lockPhrase: "", globalNegative: "" },
      defaults: { size: defaultSizeForMedium(medium), model: ENV_OPENAI_IMAGE_MODEL, attachCharacterRefs: true, ...pkgDefaults },
      characters,
      shots,
      renders: existing?.renders || [],
    };

    writeProjectFile(key, project);
    return { key, project, summary: projectSummary(key, project) };
  });
}

async function addProjectCharacterRef(input) {
  // 原实现在 getProject 和写回之间 await resolveReferenceImage，会覆盖期间的其他编辑；
  // 现在整段读-改-写都在 withProject 队列里执行。
  return withProject(input.key, async (project, ctx) => {
    const key = ctx.key;
    const charId = String(input.characterId || "");
    const character = (project.characters || []).find((c) => c.id === charId);
    if (!character) {
      throw httpError(404, "角色不存在。");
    }

    const role = normalizeRefRole(input.role);
    // 锁定基准图候选（新对象条目）时：显式 formId 优先，否则继承候选条目的 formId。
    let candidateEntry = null;
    if (input.baseCandidateId != null) {
      const candidateId = String(input.baseCandidateId);
      candidateEntry = (Array.isArray(character.baseCandidates) ? character.baseCandidates : [])
        .find((c) => typeof c === "object" && c !== null && c.id === candidateId) || null;
      if (!candidateEntry) {
        throw httpError(404, "基准图候选不存在。");
      }
    }
    const formId = input.formId != null && String(input.formId).trim()
      ? validateFormId(character, input.formId)
      : validateFormId(character, candidateEntry?.formId);

    // 图源：锁定候选且没传 dataUrl/url → 直接读项目 _candidates/ 里的副本；否则照旧解析。
    let resolved;
    if (candidateEntry && input.dataUrl == null && input.url == null) {
      const candDisk = projectFileDiskPath(key, candidateEntry.file);
      if (!candDisk) {
        throw httpError(400, "候选文件已不在。");
      }
      resolved = {
        buffer: fs.readFileSync(candDisk),
        mimeType: mimeFromExtension(path.extname(candDisk)),
      };
    } else {
      resolved = await resolveReferenceImage({ dataUrl: input.dataUrl, url: input.url });
    }
    if (!resolved) {
      throw httpError(400, "参考图读取失败。");
    }

    const dir = path.join(projectDirFor(key), "characters", projectSlug(charId));
    fs.mkdirSync(dir, { recursive: true });
    const refs = Array.isArray(character.referenceImages) ? character.referenceImages : [];
    const extension = extensionFromMime(resolved.mimeType, "png");
    // 序号不能用 refs.length+1：先删 ref-01 再上传，会算出和磁盘残留的 ref-03 同名，
    // 直接覆盖旧图（新旧两个条目指向同一张图）。改成扫目录取已有 ref-NN.* 的最大
    // 序号 +1，再用 existsSync 兜底递增，保证绝不覆盖已有文件。
    let refSeq = 0;
    for (const name of fs.readdirSync(dir)) {
      const match = /^ref-(\d+)\./.exec(name);
      if (match) refSeq = Math.max(refSeq, Number(match[1]));
    }
    let fileName;
    do {
      refSeq += 1;
      fileName = `ref-${String(refSeq).padStart(2, "0")}.${extension}`;
    } while (fs.existsSync(path.join(dir, fileName)));
    fs.writeFileSync(path.join(dir, fileName), resolved.buffer);

    // 锁定候选成功落成 ref 后：候选条目剔除、_candidates/ 副本真删（已复制成 ref，
    // 不进回收站）；其余候选保留。
    if (candidateEntry) {
      const candDisk = projectFileDiskPath(key, candidateEntry.file);
      if (candDisk) {
        try { fs.unlinkSync(candDisk); } catch { /* 文件已不在就算了 */ }
      }
      character.baseCandidates = (character.baseCandidates || []).filter((c) => c !== candidateEntry);
    }

    // ref id 防撞：锁定候选 + 上传可能落在同一毫秒，撞了就追加递增后缀。
    const idBase = `${charId}-${Date.now()}`;
    let refIdValue = idBase;
    let idSeq = 1;
    while (refs.some((r) => r.id === refIdValue)) {
      idSeq += 1;
      refIdValue = `${idBase}-${idSeq}`;
    }

    // 契约 §2：project.json 里存项目文件夹内相对路径（zip 自包含），响应层再解析成 URL。
    // formId 为 default 不落字段（旧数据一致性）；锚点互斥只在同形象组内。
    const relPath = `characters/${projectSlug(charId)}/${fileName}`;
    const sameForm = refs.filter((r) => refFormId(r) === formId);
    const labelText = input.label != null ? String(input.label).trim() : "";
    const refImage = {
      id: refIdValue,
      file: relPath,
      role,
      ...(formId !== "default" ? { formId } : {}),
      ...(labelText ? { label: labelText } : {}),
      locked: sameForm.length === 0 ? true : Boolean(input.locked),
      createdAt: new Date().toISOString(),
    };
    character.referenceImages = (refImage.locked
      ? refs.map((r) => (refFormId(r) === formId ? { ...r, locked: false } : r))
      : refs
    ).concat(refImage);
  });
}

// 用角色外貌锚点 + 全局画风生成「基准图候选」，存进 character.baseCandidates，
// 用户挑一张后再走 addProjectCharacterRef 落盘锁定。
// baseCandidates 不再是纯转瞬字段：新候选复制进项目 characters/<角色>/_candidates/
// 持久化（对象条目 { id, file, formId?, createdAt }），旧字符串 URL 条目继续兼容；
// 但 _candidates/ 仍不在交接契约里（不进导出，见 exportProject 注释）。
// 生图要跑几十秒~几分钟：只在开头从快照抽出生图输入（不持有 project 引用跨越 await），
// 完成后经 withProject 重新读最新 project 合并，避免整份覆盖掉生图期间的用户编辑。
async function generateCharacterBase(input) {
  const { project: snapshot } = getProject(input.key);
  const charId = String(input.characterId || "");
  const character = (snapshot.characters || []).find((c) => c.id === charId);
  if (!character) {
    throw httpError(404, "角色不存在。");
  }
  const formId = validateFormId(character, input.formId);
  // 锁定句逐级回退：非 default 形象条目的锚点句 → default 形象条目的锚点句
  // → 角色外貌锚点 → 角色名。
  const forms = Array.isArray(character.forms) ? character.forms : [];
  const formLock = formId !== "default"
    ? String(forms.find((f) => String(f.id) === formId)?.imageLockPhrase || "").trim()
    : "";
  const defaultFormLock = String(forms.find((f) => String(f.id) === "default")?.imageLockPhrase || "").trim();
  const lock = formLock || defaultFormLock || character.appearance?.imageLockPhrase || character.name;
  if (!lock) {
    throw httpError(400, "这个角色没有外貌锚点，没法生成基准图。");
  }

  const promptParts = [lock, snapshot.style?.lockPhrase, "角色参考图，清晰正面半身，背景简洁干净，统一画风，单人"].filter(Boolean);
  const result = await generateImages({
    prompt: promptParts.join("。"),
    negativePrompt: snapshot.style?.globalNegative || "",
    model: snapshot.defaults?.model,
    size: snapshot.defaults?.size || "auto",
    quality: "high",
    count: clampInteger(input.count, 1, 4, 2),
    outputFormat: "png",
    background: "auto",
    referenceImages: [],
  });

  return withProject(input.key, (project, ctx) => {
    const target = (project.characters || []).find((c) => c.id === charId);
    if (!target) {
      // 角色在生图期间被删了：图片文件照常留在 outputs/ 批次目录，但不写回 project。
      ctx.skipWrite = true;
      return {
        key: ctx.key,
        project,
        characterDeleted: true,
        warning: "角色在生图期间被删除：候选图已生成并保留在 outputs/ 目录，但没有写入项目。",
      };
    }
    // 新候选**复制**进项目 characters/<角色>/_candidates/ 持久化（批次源文件保留），
    // JSON 存对象条目 { id, file, formId?, createdAt }；万一批次文件已丢
    // （resolveOutputUrl 为 null），退回存旧字符串 URL 条目，不丢候选。
    const stamp = Date.now();
    // id 撞现有 baseCandidates 就追加后缀递增（仿参考图 id 的防撞写法，见
    // addProjectCharacterRef 里的 idBase/idSeq）：同角色两批合并回调在队列里背靠背
    // 执行、落在同一毫秒时，光靠时间戳+批内序号防不住撞 id——deleteCharacterBaseCandidate
    // 用 find 只 unlink 第一个匹配的文件，filter 却把两个同 id 条目一起剔除，
    // 第二个条目的 _candidates/ 文件就成了永久孤儿。
    const existingCandidateIds = new Set(
      (Array.isArray(target.baseCandidates) ? target.baseCandidates : [])
        .filter((c) => typeof c === "object" && c !== null)
        .map((c) => c.id)
    );
    const fresh = result.images.map((img, i) => {
      const diskPath = resolveOutputUrl(img.url);
      if (!diskPath) return img.url;
      let candidateId = `cand-${stamp}-${i + 1}`;
      let idSeq = 1;
      while (existingCandidateIds.has(candidateId)) {
        idSeq += 1;
        candidateId = `cand-${stamp}-${i + 1}-${idSeq}`;
      }
      existingCandidateIds.add(candidateId);
      return {
        id: candidateId,
        file: copyFileIntoProject(ctx.key, `characters/${projectSlug(charId)}/_candidates`, `cand-${stamp}`, diskPath),
        ...(formId !== "default" ? { formId } : {}),
        createdAt: result.createdAt,
      };
    });
    // 合并前顺手清理旧数组（本次反正要写盘，零成本；平时死链只在响应层过滤）：
    // 字符串条目沿用死链过滤；对象条目按项目 _candidates/ 文件是否还在过滤。
    const alive = (Array.isArray(target.baseCandidates) ? target.baseCandidates : [])
      .filter((entry) => typeof entry === "string"
        ? resolveOutputUrl(entry) !== null
        : entry && projectFileDiskPath(ctx.key, entry.file) !== null);
    const merged = [...fresh, ...alive];
    target.baseCandidates = merged.slice(0, 12);
    // 被 12 张上限挤掉的对象条目真删 _candidates/ 文件——孤儿文件别堆积；
    // 字符串条目照旧只丢数组（文件归全局图库管）。
    for (const dropped of merged.slice(12)) {
      if (typeof dropped === "string") continue;
      const disk = projectFileDiskPath(ctx.key, dropped.file);
      if (disk) {
        try { fs.unlinkSync(disk); } catch { /* 文件已不在就算了 */ }
      }
    }
  });
}

async function generateProjectShot(input) {
  // 第一阶段：从快照只抽出生图需要的输入（prompt、参考图路径等），
  // 不持有整份 project 引用跨越长耗时的生图 await。
  const { project: snapshot } = getProject(input.key);
  const shotId = String(input.shotId || "");
  const shot = (snapshot.shots || []).find((s) => s.shotId === shotId);
  if (!shot) {
    throw httpError(404, "分镜不存在。");
  }
  if (!shot.prompt) {
    throw httpError(400, "这一镜没有提示词，请回上游（Scriptwriter）补。");
  }

  const referenceImages = [];
  if (snapshot.defaults?.attachCharacterRefs !== false) {
    for (const cid of Array.isArray(shot.characterIds) ? shot.characterIds : []) {
      const ch = (snapshot.characters || []).find((c) => c.id === cid);
      const refs = Array.isArray(ch?.referenceImages) ? ch.referenceImages : [];
      // 分镜可按角色指定形象（shot.characterForms[cid]），缺省 default。
      // 选择顺序逐级回退：该形象内锚点 → 该形象内第一张 → default 形象锚点
      // → default 形象第一张 → 全局兜底（该角色任意形象的锚点/第一张）；
      // 分组比较统一走 refFormId（旧数据无 formId 视为 default）。
      // 全局兜底是必须的：角色参考图可能全在命名形象里（比如直接给「战斗形态」锁了
      // 基准图，default 组从没图），分镜又没设 characterForms（Scriptwriter 包天然
      // 没这字段）——没有它这一镜会一张参考图都不挂，且没有任何警告（行为回归自
      // 旧代码 refs.find(locked)||refs[0]：只要角色有图就挂一张）。
      const formId = (shot.characterForms && shot.characterForms[cid]) || "default";
      const formRefs = refs.filter((r) => refFormId(r) === formId);
      const defaultRefs = refs.filter((r) => refFormId(r) === "default");
      const ref = formRefs.find((r) => r.locked)
        || formRefs[0]
        || defaultRefs.find((r) => r.locked)
        || defaultRefs[0]
        || refs.find((r) => r.locked)
        || refs[0];
      if (ref?.file) {
        // ref.file 磁盘上存契约相对路径（旧数据可能还是 /outputs/ URL），
        // 先解析成 URL 再交给 resolveReferenceImage（它只认 /outputs/、http、data:）。
        referenceImages.push({
          name: String(cid),
          url: resolveProjectFileUrl(input.key, ref.file),
          source: "project-character-reference",
        });
      }
    }
  }

  const result = await generateImages({
    prompt: shot.prompt,
    negativePrompt: shot.negative || snapshot.style?.globalNegative || "",
    model: snapshot.defaults?.model,
    size: snapshot.defaults?.size || "auto",
    quality: input.quality || "high",
    count: clampInteger(input.count, 1, 4, 2),
    outputFormat: "png",
    background: "auto",
    referenceImages,
  });

  // 第二阶段：生图完成后重新读最新 project，把新候选合并进去（按 shotId 定位），
  // 生图期间用户保存的分镜/角色编辑不会被覆盖。
  // 候选复制放在 withProject 里、确认分镜还在之后做：分镜已删就不往项目文件夹塞孤儿文件。
  return withProject(input.key, (project, ctx) => {
    const renders = Array.isArray(project.renders) ? project.renders : [];
    const index = renders.findIndex((r) => r.shotId === shotId);
    const makeRender = (candidates) => ({
      shotId,
      status: "done",
      candidates: [...candidates, ...(index >= 0 ? renders[index].candidates : [])].slice(0, 24),
      chosenImageId: index >= 0 ? renders[index].chosenImageId : undefined,
    });
    if (!(project.shots || []).some((s) => s.shotId === shotId)) {
      // 分镜在生图期间被删了（或改了镜号）：图片文件照常留在 outputs/ 批次目录，
      // 不复制进项目文件夹也不写回 project；响应里直接用批次 URL（响应层对
      // /outputs/ 前缀原样透传，前端照常能预览这批"孤儿"候选）。
      ctx.skipWrite = true;
      return {
        key: ctx.key,
        shotId,
        render: makeRender(result.images.map((img) => ({
          imageId: img.id,
          file: img.url,
          createdAt: result.createdAt,
        }))),
        referencesAttached: referenceImages.length,
        shotDeleted: true,
        warning: "分镜在生图期间被删除：候选图已生成并保留在 outputs/ 目录，但没有写入项目。",
      };
    }
    // 契约 §2：每张候选**复制**（批次源文件保留）进 <项目>/outputs/<镜号>/，
    // project.json 里存项目内相对路径，zip 项目文件夹即自包含。
    // 万一批次文件已不在（resolveOutputUrl 返回 null），退回存批次 URL，不丢候选。
    const candidates = result.images.map((img) => {
      const diskPath = resolveOutputUrl(img.url);
      return {
        imageId: img.id,
        file: diskPath
          ? copyFileIntoProject(ctx.key, `outputs/${safePathSegment(shotId)}`, "cand", diskPath)
          : img.url,
        createdAt: result.createdAt,
      };
    });
    const render = makeRender(candidates);
    if (index >= 0) {
      renders[index] = render;
    } else {
      renders.push(render);
    }
    project.renders = renders;
    return { key: ctx.key, shotId, render, referencesAttached: referenceImages.length };
  });
}

function chooseProjectRender(input) {
  return withProject(input.key, (project, ctx) => {
    const renders = Array.isArray(project.renders) ? project.renders : [];
    const render = renders.find((r) => r.shotId === input.shotId);
    if (!render) {
      throw httpError(404, "这一镜还没有候选图。");
    }
    render.chosenImageId = input.imageId || undefined;
    project.renders = renders;
    return { key: ctx.key, shotId: input.shotId, render };
  });
}

// ---- 漫剧编辑层：手动增删改（分镜 / 角色 / 候选 / 参考图 / 空项目）----
// 全部走 withProject：队列里载入最新 project → mutator 改对象 → 统一写回 { key, project }。

function upsertProjectShot(input) {
  return withProject(input.key, (project) => {
    const patch = input.patch && typeof input.patch === "object" ? input.patch : {};
    const shots = Array.isArray(project.shots) ? project.shots : [];
    const targetId = String(input.shotId || patch.shotId || "");
    const existing = targetId ? shots.find((s) => s.shotId === targetId) : null;
    const cleanIds = Array.isArray(patch.characterIds)
      ? patch.characterIds.map((c) => String(c)).filter(Boolean)
      : undefined;
    // characterForms（角色 id → 该镜使用的形象 id）清洗：只保留最终 characterIds
    // 里还在的键，值统一转字符串；清洗完为空就不落字段。
    const cleanForms = (finalIds) => {
      if (!patch.characterForms || typeof patch.characterForms !== "object") return undefined;
      const out = {};
      for (const [cid, fid] of Object.entries(patch.characterForms)) {
        if (finalIds.includes(cid)) out[cid] = String(fid);
      }
      return Object.keys(out).length ? out : undefined;
    };

    if (existing) {
      if (patch.prompt != null) existing.prompt = String(patch.prompt);
      if (patch.negative != null) existing.negative = String(patch.negative);
      if (patch.shotType != null) existing.shotType = String(patch.shotType);
      if (patch.scene != null) existing.scene = String(patch.scene);
      if (cleanIds) existing.characterIds = cleanIds;
      if (patch.characterForms && typeof patch.characterForms === "object") {
        const forms = cleanForms(cleanIds ?? existing.characterIds ?? []);
        if (forms) {
          existing.characterForms = forms;
        } else {
          delete existing.characterForms;
        }
      }
      // 改镜号：同步 renders 的 shotId
      const nextId = patch.shotId != null ? String(patch.shotId).trim() : existing.shotId;
      if (nextId && nextId !== existing.shotId) {
        if (shots.some((s) => s !== existing && s.shotId === nextId)) {
          throw httpError(409, "已有同名镜号，换一个。");
        }
        const r = (Array.isArray(project.renders) ? project.renders : []).find((x) => x.shotId === existing.shotId);
        if (r) r.shotId = nextId;
        existing.shotId = nextId;
      }
    } else {
      const newId = targetId || `手动-${Date.now()}`;
      if (shots.some((s) => s.shotId === newId)) {
        throw httpError(409, "已有同名镜号，换一个。");
      }
      const newForms = cleanForms(cleanIds || []);
      shots.push({
        shotId: newId,
        prompt: patch.prompt != null ? String(patch.prompt) : "",
        negative: patch.negative != null ? String(patch.negative) : "",
        shotType: patch.shotType != null ? String(patch.shotType) : "",
        scene: patch.scene != null ? String(patch.scene) : "",
        characterIds: cleanIds || [],
        ...(newForms ? { characterForms: newForms } : {}),
      });
    }
    project.shots = shots;
  });
}

function deleteProjectShot(input) {
  return withProject(input.key, (project) => {
    const shotId = String(input.shotId || "");
    project.shots = (Array.isArray(project.shots) ? project.shots : []).filter((s) => s.shotId !== shotId);
    project.renders = (Array.isArray(project.renders) ? project.renders : []).filter((r) => r.shotId !== shotId);
  });
}

function upsertProjectCharacter(input) {
  return withProject(input.key, (project) => {
    const chars = Array.isArray(project.characters) ? project.characters : [];
    const targetId = String(input.characterId || "");
    const existing = targetId ? chars.find((c) => c.id === targetId) : null;

    if (existing) {
      if (input.name != null) existing.name = String(input.name);
      if (input.role != null) existing.role = String(input.role);
      if (input.imageLockPhrase != null) {
        existing.appearance = { ...(existing.appearance || {}), imageLockPhrase: String(input.imageLockPhrase) };
      }
    } else {
      const name = String(input.name || "").trim();
      if (!name) throw httpError(400, "角色需要一个名字。");
      const id = chars.some((c) => c.id === name) ? `${name}-${Date.now()}` : name;
      chars.push({
        id,
        name,
        role: String(input.role || ""),
        appearance: { imageLockPhrase: String(input.imageLockPhrase || "") },
        referenceImages: [],
      });
    }
    project.characters = chars;
  });
}

// 角色多形象（战斗形态 / 便装等）：forms 数组存 { id, name, imageLockPhrase, note }。
// 'default' 是隐含的主形象，forms 里可以没有条目；给主形象起名/写锚点句时才落一条
// id 为 'default' 的条目。旧 project.json 没有 forms 字段，视为只有 default 形象。
function upsertCharacterForm(input) {
  return withProject(input.key, (project) => {
    const charId = String(input.characterId || "");
    const character = (project.characters || []).find((c) => c.id === charId);
    if (!character) throw httpError(404, "角色不存在。");
    const forms = Array.isArray(character.forms) ? character.forms : [];

    let target;
    if (input.formId != null && String(input.formId).trim()) {
      const formId = String(input.formId).trim();
      target = forms.find((f) => String(f.id) === formId);
      if (!target && formId === "default") {
        // default 允许首次 upsert 时补建条目（给主形象起名/写锚点句）。
        target = { id: "default", name: input.name != null ? String(input.name) : "主形象" };
        forms.push(target);
      }
      if (!target) throw httpError(404, "形象不存在。");
    } else {
      const name = String(input.name || "").trim();
      if (!name) throw httpError(400, "形象需要一个名字。");
      // id 撞名策略与 upsertProjectCharacter 一致：撞了追加时间戳。
      const slug = projectSlug(name);
      const id = slug === "default" || forms.some((f) => String(f.id) === slug) ? `${slug}-${Date.now()}` : slug;
      target = { id, name };
      forms.push(target);
    }

    if (input.name != null) target.name = String(input.name);
    if (input.imageLockPhrase != null) target.imageLockPhrase = String(input.imageLockPhrase);
    if (input.note != null) target.note = String(input.note);
    character.forms = forms;
  });
}

function deleteCharacterForm(input) {
  return withProject(input.key, (project, ctx) => {
    const charId = String(input.characterId || "");
    const character = (project.characters || []).find((c) => c.id === charId);
    if (!character) throw httpError(404, "角色不存在。");
    const formId = String(input.formId || "");
    if (formId === "default") throw httpError(400, "主形象不能删除。");
    const forms = Array.isArray(character.forms) ? character.forms : [];
    if (!forms.some((f) => String(f.id) === formId)) throw httpError(404, "形象不存在。");
    character.forms = forms.filter((f) => String(f.id) !== formId);
    // 该形象的参考图一并移进回收站并从数组剔除。
    const refs = Array.isArray(character.referenceImages) ? character.referenceImages : [];
    for (const ref of refs) {
      if (refFormId(ref) !== formId) continue;
      const disk = ref.file ? projectFileDiskPath(ctx.key, ref.file) : null;
      if (disk) {
        try { moveIntoProjectTrash(ctx.key, disk); } catch { /* 文件已不在就算了 */ }
      }
    }
    character.referenceImages = refs.filter((r) => refFormId(r) !== formId);
    // 该形象的基准图候选一并清理：残留候选会在 UI 卡死——点「锁定」时
    // validateFormId(候选.formId) 对已删形象一律 400。对象条目挪进回收站
    // （与参考图同处理，不真删），字符串旧格式条目没有 formId 字段，天然不匹配。
    const candidates = Array.isArray(character.baseCandidates) ? character.baseCandidates : [];
    for (const cand of candidates) {
      if (typeof cand !== "object" || cand === null || cand.formId !== formId) continue;
      const disk = projectFileDiskPath(ctx.key, cand.file);
      if (disk) {
        try { moveIntoProjectTrash(ctx.key, disk); } catch { /* 文件已不在就算了 */ }
      }
    }
    character.baseCandidates = candidates.filter((c) => !(typeof c === "object" && c !== null && c.formId === formId));
    // shots[].characterForms 里指向这个形象的条目一并清掉：不然 ShotEditor 的受控
    // select 悬空、预检误报「形象不存在」、出图时静默回退，脏键还会随导出包持久化。
    for (const s of Array.isArray(project.shots) ? project.shots : []) {
      if (s.characterForms && s.characterForms[charId] === formId) {
        delete s.characterForms[charId];
      }
    }
  });
}

function deleteProjectCharacter(input) {
  return withProject(input.key, (project, ctx) => {
    const charId = String(input.characterId || "");
    project.characters = (Array.isArray(project.characters) ? project.characters : []).filter((c) => c.id !== charId);
    // 角色的参考图目录整个移进项目回收站（不再直接删，误删可去 .trash 手动捞）
    try {
      const dir = path.join(projectDirFor(ctx.key), "characters", projectSlug(charId));
      if (fs.existsSync(dir)) moveIntoProjectTrash(ctx.key, dir);
    } catch {
      // 目录移不动不阻断
    }
    // 从所有分镜里剔除该角色；characterForms[charId] 键也一并删——不然角色都没了，
    // 这个脏键还会跟着 characterIds 清空后继续留在 shots 里，随导出包持久化。
    for (const s of Array.isArray(project.shots) ? project.shots : []) {
      if (Array.isArray(s.characterIds)) s.characterIds = s.characterIds.filter((c) => c !== charId);
      if (s.characterForms && Object.prototype.hasOwnProperty.call(s.characterForms, charId)) {
        delete s.characterForms[charId];
      }
    }
  });
}

function deleteProjectCharacterRef(input) {
  return withProject(input.key, (project, ctx) => {
    const charId = String(input.characterId || "");
    const refId = String(input.refId || "");
    const character = (project.characters || []).find((c) => c.id === charId);
    if (!character) throw httpError(404, "角色不存在。");
    const refs = Array.isArray(character.referenceImages) ? character.referenceImages : [];
    const target = refs.find((r) => r.id === refId);
    if (target?.file) {
      // 兼容契约相对路径 + 旧 /outputs/ URL 两种形态；删除改走项目回收站
      const disk = projectFileDiskPath(ctx.key, target.file);
      if (disk) {
        try { moveIntoProjectTrash(ctx.key, disk); } catch { /* 文件已不在就算了 */ }
      }
    }
    const remaining = refs.filter((r) => r.id !== refId);
    // 锚点补位按 target 所在形象组内做（锚已升级为每形象一个）
    if (target) ensureFormAnchor(remaining, refFormId(target));
    character.referenceImages = remaining;
  });
}

// 批量删参考图：一次 withProject 做完，避免逐张请求排队 + 中途失败留半截。
function deleteProjectCharacterRefs(input) {
  return withProject(input.key, (project, ctx) => {
    const charId = String(input.characterId || "");
    const character = (project.characters || []).find((c) => c.id === charId);
    if (!character) throw httpError(404, "角色不存在。");
    const ids = new Set((Array.isArray(input.refIds) ? input.refIds : []).map(String));
    const refs = Array.isArray(character.referenceImages) ? character.referenceImages : [];
    const affectedForms = new Set();
    for (const ref of refs) {
      if (!ids.has(ref.id)) continue;
      affectedForms.add(refFormId(ref));
      const disk = ref.file ? projectFileDiskPath(ctx.key, ref.file) : null;
      if (disk) {
        try { moveIntoProjectTrash(ctx.key, disk); } catch { /* 文件已不在就算了 */ }
      }
    }
    const remaining = refs.filter((r) => !ids.has(r.id));
    // 每个被波及的形象组分别补锚
    for (const formId of affectedForms) {
      ensureFormAnchor(remaining, formId);
    }
    character.referenceImages = remaining;
  });
}

function lockProjectCharacterRef(input) {
  return withProject(input.key, (project) => {
    const charId = String(input.characterId || "");
    const refId = String(input.refId || "");
    const character = (project.characters || []).find((c) => c.id === charId);
    if (!character) throw httpError(404, "角色不存在。");
    const refs = Array.isArray(character.referenceImages) ? character.referenceImages : [];
    const target = refs.find((r) => r.id === refId);
    if (!target) throw httpError(404, "参考图不存在。");
    // 锚点已升级为每形象一个：互斥只在目标 ref 所在形象组内，其他组的锚不动。
    character.referenceImages = refs.map((r) =>
      refFormId(r) === refFormId(target) ? { ...r, locked: r.id === refId } : r
    );
  });
}

// 改参考图元数据：role / label / formId（跨形象移动会维护两边的锚点）。
function updateProjectCharacterRef(input) {
  return withProject(input.key, (project) => {
    const charId = String(input.characterId || "");
    const refId = String(input.refId || "");
    const character = (project.characters || []).find((c) => c.id === charId);
    if (!character) throw httpError(404, "角色不存在。");
    const refs = Array.isArray(character.referenceImages) ? character.referenceImages : [];
    const target = refs.find((r) => r.id === refId);
    if (!target) throw httpError(404, "参考图不存在。");

    // normalizeRefRole 对 null 返回 'base'，所以必须先判 input.role != null 再调，
    // 否则「不传 role」会被误改回 base。
    if (input.role != null) target.role = normalizeRefRole(input.role);
    if (input.label != null) {
      const labelText = String(input.label).trim();
      if (labelText) {
        target.label = labelText;
      } else {
        delete target.label; // 空串表示清除标签
      }
    }
    if (input.formId != null) {
      const newForm = validateFormId(character, input.formId);
      const oldForm = refFormId(target);
      if (newForm !== oldForm) {
        // 跨形象移动的锁维护顺序：先落 formId，再处理进入组的锚，最后给离开组补锚。
        if (newForm === "default") {
          delete target.formId; // default 不落字段（旧数据一致性）
        } else {
          target.formId = newForm;
        }
        // 进入组已有锚 → target 让位；进入组没锚 → target 补成锚（组内必有锚的自洽语义）。
        const newFormHasAnchor = refs.some((r) => r !== target && refFormId(r) === newForm && r.locked);
        target.locked = !newFormHasAnchor;
        // 离开组还有图但没锚 → 第一张补位。
        ensureFormAnchor(refs, oldForm);
      }
    }
  });
}

function reorderProjectCharacterRefs(input) {
  return withProject(input.key, (project) => {
    const charId = String(input.characterId || "");
    const orderedRefIds = Array.isArray(input.orderedRefIds) ? input.orderedRefIds.map(String) : [];
    const character = (project.characters || []).find((c) => c.id === charId);
    if (!character) throw httpError(404, "角色不存在。");
    const refs = Array.isArray(character.referenceImages) ? character.referenceImages : [];
    const byId = new Map(refs.map((r) => [r.id, r]));
    const seen = new Set();
    const ordered = [];
    // 先按 orderedRefIds 给出的顺序排（忽略不存在的 id 和重复项）
    for (const id of orderedRefIds) {
      const ref = byId.get(id);
      if (ref && !seen.has(id)) {
        ordered.push(ref);
        seen.add(id);
      }
    }
    // orderedRefIds 里没列到的，按原相对顺序追加在后面
    for (const r of refs) {
      if (!seen.has(r.id)) {
        ordered.push(r);
        seen.add(r.id);
      }
    }
    character.referenceImages = ordered;
  });
}

function deleteProjectCandidate(input) {
  return withProject(input.key, (project, ctx) => {
    const shotId = String(input.shotId || "");
    const imageId = String(input.imageId || "");
    const renders = Array.isArray(project.renders) ? project.renders : [];
    const render = renders.find((r) => r.shotId === shotId);
    if (!render) throw httpError(404, "这一镜还没有候选图。");
    const target = (render.candidates || []).find((c) => c.imageId === imageId);
    if (target?.file) {
      // 兼容契约相对路径 + 旧 /outputs/ URL 两种形态；删除改走项目回收站
      const disk = projectFileDiskPath(ctx.key, target.file);
      if (disk) {
        try { moveIntoProjectTrash(ctx.key, disk); } catch { /* 文件已不在就算了 */ }
      }
    }
    render.candidates = (render.candidates || []).filter((c) => c.imageId !== imageId);
    if (render.chosenImageId === imageId) render.chosenImageId = undefined;
    project.renders = renders;
    return { key: ctx.key, shotId, render };
  });
}

function deleteCharacterBaseCandidate(input) {
  return withProject(input.key, (project, ctx) => {
    const charId = String(input.characterId || "");
    const character = (project.characters || []).find((c) => c.id === charId);
    if (!character) throw httpError(404, "角色不存在。");
    const candidates = Array.isArray(character.baseCandidates) ? character.baseCandidates : [];
    // 新格式按 candidateId 删：对象条目剔除 + 真删项目 _candidates/ 里的副本
    // （候选是项目私有副本，不是全局图库的图）。
    if (input.candidateId != null) {
      const candidateId = String(input.candidateId);
      const target = candidates.find((c) => typeof c === "object" && c !== null && c.id === candidateId);
      if (target) {
        const disk = projectFileDiskPath(ctx.key, target.file);
        if (disk) {
          try { fs.unlinkSync(disk); } catch { /* 文件已不在就算了 */ }
        }
      }
      // 找不到也静默成功——幂等，重复点删除/并发删除不报错。
      character.baseCandidates = candidates.filter((c) => !(typeof c === "object" && c !== null && c.id === candidateId));
      return;
    }
    // 旧格式按 url 删：只从数组移除，不删磁盘文件——候选是全局图库批次里的图
    // （/outputs/<batchId>/xx.png），文件归图库管（deleteImages），和分镜候选
    // （项目文件夹私有副本、删条目连文件一起删）不同。
    // url 不在数组里也静默成功——幂等，重复点删除/并发删除不报错。
    const url = String(input.url || "");
    character.baseCandidates = candidates.filter((c) => !(typeof c === "string" && c === url));
  });
}

// ===== 项目回收站 =====
// 删除的参考图/候选/角色目录都移进 <项目>/.trash/。不做 UI 级恢复：
// 恢复 = 用户手动去 .trash 文件夹捞；这两个端点只提供占用统计和一键清空。

// 纯读统计，不改盘，不必进项目队列。
function getProjectTrashInfo(input) {
  const { key } = getProject(input.key); // 项目不存在直接 404
  const trashDir = path.join(projectDirFor(key), ".trash");
  let count = 0;
  let bytes = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        count += 1;
        bytes += fs.statSync(full).size;
      }
    }
  };
  if (fs.existsSync(trashDir)) walk(trashDir);
  return { key, count, bytes };
}

// 清空走 withProject 串行：避免和正在移入回收站的删除操作赛跑。
function emptyProjectTrash(input) {
  return withProject(input.key, (project, ctx) => {
    fs.rmSync(path.join(projectDirFor(ctx.key), ".trash"), { recursive: true, force: true });
    ctx.skipWrite = true; // 没改 project.json，不用写盘
    return { key: ctx.key, ok: true };
  });
}

function createEmptyProject(input) {
  const name = String(input.name || "").trim();
  if (!name) throw httpError(400, "项目需要一个名字。");
  const episode = String(input.episode || "").trim();
  const key = projectKeyFromPackage({ project: { id: name, name }, episode });
  // 创建走同一条队列：并发的同名创建 / 导入按序执行，后到的会命中 409。
  return enqueueProjectTask(key, () => {
    if (readProjectFile(key)) {
      throw httpError(409, "已有同名同集的项目，换个名字，或直接在列表里选它。");
    }
    const now = new Date().toISOString();
    const project = {
      schemaVersion: "1.0",
      project: { id: name, name, medium: "vertical", createdAt: now, updatedAt: now },
      episode,
      style: { lockPhrase: "", globalNegative: "" },
      defaults: { size: defaultSizeForMedium("vertical"), model: ENV_OPENAI_IMAGE_MODEL, attachCharacterRefs: true },
      characters: [],
      shots: [],
      renders: [],
    };
    writeProjectFile(key, project);
    return { key, project, summary: projectSummary(key, project) };
  });
}

// 删除整个项目：把 outputs/_projects/<key>/ 连目录一并删掉，磁盘项目库里彻底移除。
// 目录路径只经 projectDirFor 取（内部 projectSlug + resolve 校验，杜绝 ../ 穿越到
// _projects 之外）；非法 / 空 key 直接 400，目录不存在则 404，绝不静默。
// 走 enqueueProjectTask 串到该项目队列尾：等在途的读改写（生图 / 编辑）都跑完再删，
// 不会删到一半被别的写操作重建目录。项目没有 getProject 内存缓存，删完无需清缓存
//（projectTaskQueues 那条 Map 队列排空后自动清）。删完顺带回最新列表，前端可直接刷新。
function deleteProject(input) {
  const key = String(input?.key || "").trim();
  if (!key) throw httpError(400, "缺少项目 key。");
  const dir = projectDirFor(key); // 非法 key / 路径穿越在这里就 400
  return enqueueProjectTask(key, () => {
    if (!fs.existsSync(dir)) {
      throw httpError(404, "项目不存在，可能已被删除。");
    }
    fs.rmSync(dir, { recursive: true, force: true });
    return { ok: true, projects: listProjects().projects };
  });
}

// 项目级设置：项目名/集号/风格锁定句/通用负面/默认生图参数。
// 浅合并：只更新 body 里传了的字段；style/defaults 内部也按字段合并，绝不整个替换。
// name/episode 只改显示，不改 key（key 是磁盘目录名，改名不迁目录，避免丢图和断链）。
function updateProjectSettings(input) {
  const style = input.style && typeof input.style === "object" ? input.style : {};
  const defaults = input.defaults && typeof input.defaults === "object" ? input.defaults : {};
  // 所有校验放进队列之前做：任何一项非法直接 400，整次请求不落盘。
  const nextName = input.name != null ? normalizeOptionalText(input.name, 120) : undefined;
  const nextEpisode = input.episode != null ? normalizeOptionalText(input.episode, 60) : undefined;
  const nextLockPhrase = style.lockPhrase != null ? normalizeOptionalText(style.lockPhrase, 4000) : undefined;
  const nextGlobalNegative = style.globalNegative != null ? normalizeOptionalText(style.globalNegative, 4000) : undefined;
  // size/model 空字符串 = 不改（前端表单整份提交，留空表示保持现状）。
  const sizeText = defaults.size != null ? String(defaults.size).trim() : "";
  const nextSize = sizeText ? validateProjectDefaultSize(sizeText) : undefined;
  const modelText = defaults.model != null ? String(defaults.model).trim() : "";
  const nextModel = modelText ? normalizeModelForEndpoint(modelText, "images") : undefined;
  const nextAttach = defaults.attachCharacterRefs != null ? Boolean(defaults.attachCharacterRefs) : undefined;

  return withProject(input.key, (project) => {
    if (nextName) project.project.name = nextName; // 名字不能清空，空串跳过
    if (nextEpisode !== undefined) project.episode = nextEpisode; // 集号可清空
    const curStyle = project.style && typeof project.style === "object" ? project.style : {};
    project.style = {
      ...curStyle,
      ...(nextLockPhrase !== undefined ? { lockPhrase: nextLockPhrase } : {}),
      ...(nextGlobalNegative !== undefined ? { globalNegative: nextGlobalNegative } : {}),
    };
    const curDefaults = project.defaults && typeof project.defaults === "object" ? project.defaults : {};
    project.defaults = {
      ...curDefaults,
      ...(nextSize !== undefined ? { size: nextSize } : {}),
      ...(nextModel !== undefined ? { model: nextModel } : {}),
      ...(nextAttach !== undefined ? { attachCharacterRefs: nextAttach } : {}),
    };
  });
}

// 项目默认尺寸校验。与 normalizeSize 的 gpt-image-2 分支同一套约束
// （宽高均为 16 的倍数、单边 ≤3840、总像素 ≤8,294,400）；"auto" 也是合法值。
function validateProjectDefaultSize(value) {
  const size = String(value || "").trim().toLowerCase();
  if (size === "auto") {
    return size;
  }
  const match = size.match(/^(\d{2,4})x(\d{2,4})$/);
  if (!match) {
    throw httpError(400, "默认尺寸格式必须是 宽x高（如 2160x3840）或 auto。");
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width % 16 !== 0 || height % 16 !== 0) {
    throw httpError(400, "gpt-image-2 要求宽和高都是 16 的倍数。");
  }
  if (width < GPT_IMAGE_2_MIN_SIDE || height < GPT_IMAGE_2_MIN_SIDE) {
    throw httpError(400, "gpt-image-2 宽高至少 16 像素。");
  }
  if (width > GPT_IMAGE_2_MAX_SIDE || height > GPT_IMAGE_2_MAX_SIDE) {
    throw httpError(400, "gpt-image-2 单边不能超过 3840 像素。");
  }
  if (width * height > GPT_IMAGE_2_MAX_PIXELS) {
    throw httpError(400, `gpt-image-2 总像素不能超过 ${GPT_IMAGE_2_MAX_PIXELS}（约 829 万），如 2160x3840。`);
  }
  return `${width}x${height}`;
}

// 按集导出：把每镜的定稿按分镜顺序复制成编号文件 + manifest.json
// _candidates/、.trash/ 不会进导出——导出只按 renders 里的定稿逐张复制，不整目录复制。
function exportProject(input) {
  const { project } = getProject(input.key);
  const key = projectSlug(input.key);
  const exportDir = path.join(projectDirFor(key), "export");
  fs.rmSync(exportDir, { recursive: true, force: true });
  fs.mkdirSync(exportDir, { recursive: true });

  const renders = new Map((Array.isArray(project.renders) ? project.renders : []).map((r) => [r.shotId, r]));
  const files = [];
  const missing = [];
  let index = 0;
  for (const shot of Array.isArray(project.shots) ? project.shots : []) {
    const render = renders.get(shot.shotId);
    const chosen = render && render.chosenImageId
      ? (render.candidates || []).find((c) => c.imageId === render.chosenImageId)
      : null;
    // 兼容契约相对路径 + 旧 /outputs/ URL 两种形态
    const src = chosen?.file ? projectFileDiskPath(key, chosen.file) : null;
    if (!src) {
      missing.push(shot.shotId);
      continue;
    }
    index += 1;
    const ext = path.extname(src) || ".png";
    const name = `${String(index).padStart(3, "0")}_${shot.shotId.replace(/[^a-zA-Z0-9_-]/g, "-")}${ext}`;
    fs.copyFileSync(src, path.join(exportDir, name));
    files.push({ shotId: shot.shotId, file: name });
  }

  const manifest = {
    project: project.project?.name || key,
    episode: project.episode || "",
    exportedAt: new Date().toISOString(),
    order: files,
    missing,
  };
  fs.writeFileSync(path.join(exportDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  return { key, exportDir, count: files.length, missing, files };
}

// 用系统文件管理器打开导出目录（后端和用户同机，web/桌面都适用）。
function openProjectExportFolder(input) {
  const key = projectSlug(input.key);
  const dir = path.join(projectDirFor(key), "export");
  if (!fs.existsSync(dir)) {
    throw httpError(404, "还没有导出目录，先点「导出本集」。");
  }
  const { execFile } = require("node:child_process");
  const command = process.platform === "win32"
    ? "explorer"
    : process.platform === "darwin"
      ? "open"
      : "xdg-open";
  // explorer 成功也常返回非 0，忽略回调错误。
  execFile(command, [dir], () => {});
  return { ok: true, dir };
}

// ===== 一次性迁移：project.json 里的旧 URL 形态 file → 契约相对路径 =====
// 历史数据两种旧形态（见 resolveProjectFileUrl 的兜底注释）：
//  A. 全局批次 URL "/outputs/<batchId>/xxx.png"（旧 generateProjectShot 直接存 img.url）
//     → 把文件**复制**进项目文件夹（候选进 outputs/<镜号>/、参考图进 characters|scenes/<id>/），
//       JSON 改存相对路径；批次源文件保留。
//  B. 本项目 URL "/outputs/_projects/<本项目>/characters/..."（旧 addProjectCharacterRef）
//     → 文件本来就在项目文件夹里，只把 JSON 去前缀改成相对路径，不复制。
// 幂等：已是相对路径的条目跳过；源文件不存在的保留原值并 log（响应层 URL 透传仍可兜底）。
// 只迁移 JSON 里的条目（renders candidates + referenceImages），不扫目录，
// .trash/_candidates 无碍；不处理 baseCandidates（旧字符串 URL 形态不迁移，响应层透传兜底）。
// 每个项目走 enqueueProjectTask，与启动后到达的 API 请求在同一条队列里互斥。
function migrateProjectFilesToProjectDirs() {
  if (!fs.existsSync(projectsDir)) {
    return;
  }
  const keys = fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  for (const key of keys) {
    enqueueProjectTask(key, () => {
      const project = readProjectFile(key);
      if (!project) {
        return;
      }
      const slug = projectSlug(key);
      const selfPrefix = `/outputs/_projects/${slug}/`;
      let changed = false;

      // 单个 file 值 → 迁移后的值；不需要动就原样返回。
      const migrateFile = (value, relDir, prefix, label) => {
        const file = String(value || "");
        if (!file || !file.startsWith("/outputs/")) {
          return value; // 已是相对路径 / data: / http / 空 —— 跳过
        }
        if (file.startsWith(selfPrefix)) {
          // 形态 B：去前缀即项目内相对路径；文件不在就保留原值（反正也复制不出来）。
          const relPath = file.slice(selfPrefix.length).replace(/^\/+/, "");
          if (!projectFileDiskPath(key, relPath)) {
            logError(new Error(`migrate: file missing on disk, kept as-is: ${file}`), `project ${slug} ${label}`);
            return value;
          }
          changed = true;
          return relPath;
        }
        // 形态 A：全局批次 URL → 复制进项目文件夹。
        const diskPath = resolveOutputUrl(file);
        if (!diskPath) {
          logError(new Error(`migrate: source file missing, kept as-is: ${file}`), `project ${slug} ${label}`);
          return value;
        }
        changed = true;
        return copyFileIntoProject(key, relDir, prefix, diskPath);
      };

      for (const render of Array.isArray(project.renders) ? project.renders : []) {
        for (const cand of Array.isArray(render?.candidates) ? render.candidates : []) {
          if (cand && cand.file) {
            cand.file = migrateFile(cand.file, `outputs/${safePathSegment(render.shotId)}`, "cand", `candidate ${cand.imageId || ""}`);
          }
        }
      }
      const characters = Array.isArray(project.characters) ? project.characters : [];
      const scenes = Array.isArray(project.scenes) ? project.scenes : [];
      for (const [holders, dirName] of [[characters, "characters"], [scenes, "scenes"]]) {
        for (const holder of holders) {
          for (const ref of Array.isArray(holder?.referenceImages) ? holder.referenceImages : []) {
            if (ref && ref.file) {
              ref.file = migrateFile(ref.file, `${dirName}/${projectSlug(holder.id)}`, "ref", `${dirName} ref ${ref.id || ""}`);
            }
          }
        }
      }

      if (changed) {
        writeProjectFile(key, project);
        console.log(`Migrated project image paths to contract-relative form: ${slug}`);
      }
    }).catch((error) => {
      // 单个项目迁移失败不阻断启动，也不影响其他项目。
      logError(error, `project-files migration: ${key}`);
    });
  }
}

function startServer(port = PORT, onStarted) {
  try {
    migrateStyleReferenceImagesToDisk();
  } catch (error) {
    logError(error, "style-reference migration");
  }
  try {
    migrateProjectFilesToProjectDirs();
  } catch (error) {
    logError(error, "project-files migration");
  }
  const listener = server.listen(port, HOST, () => {
    const address = listener.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    // 绑定通配地址时对外展示回环地址，其余情况展示实际绑定地址。
    const displayHost = HOST === "0.0.0.0" || HOST === "::" ? CANONICAL_LOCAL_HOST : HOST;
    const apiConfig = getActiveApiConfig();
    console.log(`妖荼 running at http://${displayHost}:${actualPort}`);
    console.log(`Outputs: ${outputDir}`);
    if (!apiConfig.apiKey) {
      console.log("OPENAI_API_KEY is not set yet. Add it to .env or your shell before generating.");
    }
    if (typeof onStarted === "function") {
      onStarted({ port: actualPort, outputDir, dataDir });
    }
  });
  return listener;
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = {
  startServer,
  server,
  dataDir,
  outputDir,
  setUpdateController,
  resolveOutputUrl,
  importJobPackage,
  buildPromptOptimizationPrompt,
  buildPromptExtractionPrompt,
  buildStyleExtractionPrompt,
};

function setUpdateController(controller) {
  updateController = controller && typeof controller === "object" ? controller : null;
}

function getUpdateStatusPayload() {
  if (!updateController || typeof updateController.getStatus !== "function") {
    return {
      enabled: false,
      status: "disabled",
      reason: "desktop updater is unavailable",
      version: APP_VERSION,
    };
  }
  const status = updateController.getStatus();
  return { version: APP_VERSION, ...status };
}

async function checkForAppUpdates() {
  if (!updateController || typeof updateController.checkForUpdates !== "function") {
    return {
      enabled: false,
      ok: false,
      status: "disabled",
      reason: "desktop updater is unavailable",
      message: "desktop updater is unavailable",
    };
  }
  return updateController.checkForUpdates();
}

function shouldRedirectToCanonicalHost(req) {
  const host = String(req.headers.host || "").toLowerCase();
  return host === "localhost" || host.startsWith("localhost:");
}

function shouldServeLocalStorageCleanup(req, requestUrl) {
  if (!shouldRedirectToCanonicalHost(req)) {
    return false;
  }
  return requestUrl.pathname === "/"
    || requestUrl.pathname === "/index.html"
    || requestUrl.pathname === "/manju.html";
}

function getCanonicalLocalUrl(requestUrl) {
  const port = requestUrl.port ? `:${requestUrl.port}` : "";
  return `http://${CANONICAL_LOCAL_HOST}${port}${requestUrl.pathname}${requestUrl.search}`;
}

function sendCanonicalCleanupPage(res, requestUrl) {
  const targetUrl = getCanonicalLocalUrl(requestUrl);
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>妖荼正在统一本地存档</title>
</head>
<body>
  <script>
    (() => {
      const prefix = "yaotu-";
      try {
        const keys = [];
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (key && key.startsWith(prefix)) {
            keys.push(key);
          }
        }
        keys.forEach((key) => localStorage.removeItem(key));
      } catch (error) {
        console.warn("Unable to clear legacy localhost storage", error);
      }
      window.location.replace(${JSON.stringify(targetUrl)});
    })();
  </script>
  <p>正在统一本地存档，请稍候...</p>
</body>
</html>`;
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(html);
}

async function generateImages(input) {
  const apiConfig = getActiveApiConfig();

  if (!apiConfig.apiKey) {
    throw httpError(401, "OPENAI_API_KEY is missing. Add it to .env or your shell, then restart the server.");
  }

  const prompt = normalizePrompt(input.prompt);
  const negativePrompt = normalizeOptionalText(input.negativePrompt, 8000);
  const model = normalizeModelForEndpoint(input.model || apiConfig.imageModel, apiConfig.endpointMode);
  const size = normalizeSize(input.size, model);
  const quality = normalizeChoice(input.quality, "auto", ALLOWED_QUALITIES, "quality");
  const outputFormat = normalizeChoice(input.outputFormat, "png", ALLOWED_FORMATS, "output format");
  const background = normalizeChoice(input.background, "auto", ALLOWED_BACKGROUNDS, "background");
  const count = clampInteger(input.count, 1, 4, 1);
  const compression = clampInteger(input.outputCompression, 0, 100, 85);
  const manjuContext = normalizeManjuContext(input.manjuContext);

  const startedAt = new Date();
  const batchId = makeBatchId(startedAt);
  const batchDir = path.join(outputDir, batchId);
  fs.mkdirSync(batchDir, { recursive: true });

  const referenceImages = await prepareReferenceImages(input.referenceImages, batchId, batchDir);
  const maskDataUrl = normalizeEditMask(input.maskDataUrl);
  if (maskDataUrl && referenceImages.length !== 1) {
    throw httpError(400, "局部修改需要且只能有一张原图。");
  }
  if (maskDataUrl && referenceImages[0].mimeType !== "image/png") {
    throw httpError(400, "局部修改的原图和遮罩必须都是 PNG。");
  }
  const requestDetails = {
    endpointMode: apiConfig.endpointMode,
    model,
    prompt,
    negativePrompt,
    n: count,
    size,
    quality,
    output_format: outputFormat,
    background,
    referenceImages: sanitizeReferenceImages(referenceImages),
  };
  if (maskDataUrl) requestDetails.maskApplied = true;
  if (manjuContext) {
    requestDetails.manjuContext = manjuContext;
  }

  if (outputFormat === "jpeg" || outputFormat === "webp") {
    requestDetails.output_compression = compression;
  }

  if (!maskDataUrl && apiConfig.endpointMode === "chat") {
    return generateImagesViaChat({
      apiConfig,
      prompt,
      model,
      size,
      quality,
      outputFormat,
      count,
      startedAt,
      batchId,
      batchDir,
      referenceImages,
      requestDetails,
    });
  }

  if (!maskDataUrl && apiConfig.endpointMode === "responses") {
    return generateImagesViaResponses({
      apiConfig,
      prompt,
      model,
      size,
      quality,
      outputFormat,
      count,
      startedAt,
      batchId,
      batchDir,
      referenceImages,
      requestDetails,
    });
  }

  const images = await generateImagesViaImagesApi({
    apiConfig,
    requestDetails,
    referenceImages,
    maskDataUrl,
    batchId,
    batchDir,
    size,
    outputFormat,
    count,
  });

  if (images.length === 0) {
    throw httpError(502, "OpenAI returned no image data.");
  }

  const metadata = {
    batchId,
    createdAt: startedAt.toISOString(),
    request: requestDetails,
    images,
  };
  fs.writeFileSync(path.join(batchDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf8");
  invalidateImageListCache(batchId);

  return {
    batchId,
    createdAt: metadata.createdAt,
    images,
  };
}

async function generateImagesViaImagesApi(options) {
  const {
    apiConfig,
    requestDetails,
    referenceImages,
    maskDataUrl,
    batchId,
    batchDir,
    size,
    outputFormat,
    count,
  } = options;

  const images = [];
  const attempts = count > 1 ? count : 1;
  const upstreamCount = count > 1 ? 1 : count;

  for (let index = 0; index < attempts && images.length < count; index += 1) {
    const upstreamRequestDetails = {
      ...requestDetails,
      n: upstreamCount,
    };
    const responseBody = referenceImages.length > 0
      ? await requestImageEdit(apiConfig, upstreamRequestDetails, referenceImages, maskDataUrl)
      : await requestImageGeneration(apiConfig, upstreamRequestDetails);

    const saved = await saveOpenAiResponseImages({
      responseBody,
      batchId,
      batchDir,
      size,
      outputFormat,
      requestDetails,
      startIndex: images.length,
      limit: count - images.length,
    });
    images.push(...saved);
  }

  return images;
}

async function generateImagesViaResponses(options) {
  const {
    apiConfig,
    prompt,
    model,
    size,
    quality,
    outputFormat,
    count,
    startedAt,
    batchId,
    batchDir,
    referenceImages = [],
    requestDetails,
  } = options;

  const images = [];

  for (let index = 0; index < count && images.length < count; index += 1) {
    const apiResponse = await fetch(buildOpenAiUrl(apiConfig.baseUrl, "/responses"), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildResponsesImagePayload({
        model,
        prompt,
        size,
        quality,
        outputFormat,
        referenceImages,
        requestDetails,
      })),
      signal: AbortSignal.timeout(OPENAI_IMAGE_TIMEOUT_MS),
    });

    const responseBody = await parseOpenAiJsonResponse(apiResponse);
    const extracted = extractImagesFromAnyResponse(responseBody);
    const saved = await saveExtractedImages({
      extracted,
      batchId,
      batchDir,
      size,
      outputFormat,
      requestDetails,
      startIndex: images.length,
      limit: count - images.length,
    });
    images.push(...saved);
  }

  if (images.length === 0) {
    throw httpError(502, "Responses API image response contained no extractable image data.");
  }

  const metadata = {
    batchId,
    createdAt: startedAt.toISOString(),
    request: requestDetails,
    images,
  };
  fs.writeFileSync(path.join(batchDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf8");
  invalidateImageListCache(batchId);

  return {
    batchId,
    createdAt: metadata.createdAt,
    images,
  };
}

async function requestImageGeneration(apiConfig, requestDetails) {
  const apiResponse = await fetch(buildOpenAiUrl(apiConfig.baseUrl, "/images/generations"), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiConfig.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildImageApiPayload(requestDetails)),
    signal: AbortSignal.timeout(OPENAI_IMAGE_TIMEOUT_MS),
  });

  return parseOpenAiJsonResponse(apiResponse);
}

async function requestImageEdit(apiConfig, requestDetails, referenceImages, maskDataUrl) {
  const form = new FormData();
  const payload = buildImageApiPayload(requestDetails);

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      form.append(key, String(value));
    }
  });

  referenceImages.forEach((image) => {
    const bytes = fs.readFileSync(image.filePath);
    const blob = new Blob([bytes], { type: image.mimeType || "image/png" });
    form.append("image[]", blob, path.basename(image.filePath));
  });

  if (maskDataUrl) {
    const parsedMask = parseDataUrl(maskDataUrl);
    const bytes = Buffer.from(parsedMask.base64, "base64");
    form.append("mask", new Blob([bytes], { type: "image/png" }), "mask.png");
  }

  const apiResponse = await fetch(buildOpenAiUrl(apiConfig.baseUrl, "/images/edits"), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiConfig.apiKey}`,
    },
    body: form,
    signal: AbortSignal.timeout(OPENAI_IMAGE_TIMEOUT_MS),
  });

  return parseOpenAiJsonResponse(apiResponse);
}

function normalizeEditMask(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw httpError(400, "局部修改遮罩格式无效。");
  const parsed = parseDataUrl(value);
  if (!parsed || parsed.mimeType !== "image/png") {
    throw httpError(400, "局部修改遮罩必须是 PNG 图片。");
  }
  if (Buffer.byteLength(parsed.base64, "base64") > 50 * 1024 * 1024) {
    throw httpError(400, "局部修改遮罩不能超过 50 MB。");
  }
  return value;
}

async function parseOpenAiJsonResponse(apiResponse) {
  const responseText = await apiResponse.text();
  let responseBody;
  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseBody = { raw: responseText };
  }

  if (!apiResponse.ok) {
    const message = normalizeUpstreamApiErrorMessage(apiResponse, responseBody, responseText);
    throw httpError(apiResponse.status, message);
  }

  return responseBody;
}

function normalizeUpstreamApiErrorMessage(apiResponse, responseBody, responseText) {
  const status = apiResponse?.status || 502;
  const raw = String(
    responseBody?.error?.message
      || responseBody?.message
      || responseBody?.raw
      || responseText
      || "",
  ).trim();

  if (/524|timeout occurred|origin web server timed out|cloudflare|cf-error|host\s*error/i.test(raw)) {
    return "上游 API 中转服务超时（Cloudflare 524）。建议先缩短提示词、降低尺寸/质量、一次生成 1 张，稍后重试或切换 API 配置。";
  }

  if (/<!doctype html|<html[\s>]/i.test(raw)) {
    return `上游 API 返回了网页错误（HTTP ${status}），不是有效 JSON。请检查中转服务状态或 API Base URL。`;
  }

  if (raw) {
    return raw.length > 1000 ? `${raw.slice(0, 1000)}...` : raw;
  }

  return `OpenAI API returned ${status}`;
}

// gpt-image 的 images / chat 端点不支持 negative_prompt 参数，把负面词以
// "Avoid: ..." 文本追加进最终发送的提示词（与 responses 模式措辞一致）。
// 注意：纯生图页前端（app/src/store/generator.ts 的 composePrompt）
// 会把负面词逐行嵌进 prompt 后再另传 negativePrompt，所以追加前逐行检查
// prompt 是否已包含全部负面内容，避免双重拼接。
function appendNegativePromptText(prompt, negativePrompt) {
  const negative = String(negativePrompt || "").trim();
  if (!negative) {
    return prompt;
  }
  const lines = negative.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 0 && lines.every((line) => prompt.includes(line))) {
    return prompt;
  }
  return `${prompt}\n\nAvoid: ${negative}`;
}

function buildImageApiPayload(requestDetails) {
  return {
    model: requestDetails.model,
    prompt: appendNegativePromptText(requestDetails.prompt, requestDetails.negativePrompt),
    n: requestDetails.n,
    size: requestDetails.size,
    quality: requestDetails.quality,
    output_format: requestDetails.output_format,
    background: requestDetails.background,
    output_compression: requestDetails.output_compression,
  };
}

function buildResponsesImagePayload({ model, prompt, size, quality, outputFormat, referenceImages = [], requestDetails = {} }) {
  const generationPrompt = appendNegativePromptText([
    prompt,
    "",
    "Generate one image.",
    `Target size: ${size}.`,
    `Quality: ${quality}.`,
    `Preferred output format: ${outputFormat}.`,
  ].filter(Boolean).join("\n"), requestDetails.negativePrompt);
  const content = [
    { type: "input_text", text: generationPrompt },
    ...referenceImages.map((reference) => ({
      type: "input_image",
      image_url: referenceToDataUrl(reference),
    })),
  ];
  return {
    model,
    input: [
      {
        role: "user",
        content,
      },
    ],
    tools: [
      {
        type: "image_generation",
        size,
        quality,
        output_format: outputFormat,
      },
    ],
  };
}

async function saveOpenAiResponseImages({ responseBody, batchId, batchDir, size, outputFormat, requestDetails, startIndex = 0, limit = Infinity }) {
  const extracted = extractImagesFromAnyResponse(responseBody).slice(0, limit);
  return saveExtractedImages({
    extracted,
    batchId,
    batchDir,
    size,
    outputFormat,
    requestDetails,
    startIndex,
    limit,
  });
}

async function prepareReferenceImages(inputReferences, batchId, batchDir) {
  const rawReferences = Array.isArray(inputReferences) ? inputReferences.slice(0, 16) : [];
  if (rawReferences.length === 0) {
    return [];
  }

  const referenceDir = path.join(batchDir, "references");
  fs.mkdirSync(referenceDir, { recursive: true });

  const references = [];
  for (const [index, reference] of rawReferences.entries()) {
    const resolved = await resolveReferenceImage(reference);
    if (!resolved) {
      continue;
    }

    const extension = extensionFromMime(resolved.mimeType, path.extname(reference.name || "").replace(".", "") || "png");
    const fileName = `reference-${String(references.length + 1).padStart(2, "0")}.${extension}`;
    const filePath = path.join(referenceDir, fileName);
    fs.writeFileSync(filePath, resolved.buffer);

    references.push({
      id: `${batchId}/references/${fileName}`,
      name: String(reference.name || `Reference ${index + 1}`).slice(0, 120),
      url: `/outputs/${batchId}/references/${fileName}`,
      filePath,
      mimeType: resolved.mimeType || mimeFromExtension(extension),
      bytes: resolved.buffer.length,
      source: reference.source || "reference",
    });
  }

  return references;
}

async function resolveReferenceImage(reference) {
  if (!reference || typeof reference !== "object") {
    return null;
  }

  if (typeof reference.dataUrl === "string") {
    const parsed = parseDataUrl(reference.dataUrl);
    if (parsed) {
      return {
        buffer: Buffer.from(parsed.base64, "base64"),
        mimeType: parsed.mimeType,
      };
    }
  }

  if (typeof reference.url === "string" && reference.url.startsWith("/outputs/")) {
    const filePath = resolveOutputUrl(reference.url);
    if (!filePath) {
      return null;
    }
    return {
      buffer: fs.readFileSync(filePath),
      mimeType: mimeFromExtension(path.extname(filePath).replace(".", "")),
    };
  }

  if (typeof reference.url === "string" && /^https?:\/\//i.test(reference.url)) {
    return downloadImage(reference.url);
  }

  return null;
}

function resolveOutputUrl(urlPath) {
  const relativePath = decodeURIComponent(String(urlPath).replace(/^\/outputs\//, ""));
  const filePath = path.resolve(outputDir, relativePath);
  const basePath = path.resolve(outputDir);
  if (!filePath.startsWith(basePath + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return null;
  }
  return filePath;
}

function sanitizeReferenceImages(referenceImages) {
  return referenceImages.map((reference) => ({
    id: reference.id,
    name: reference.name,
    url: reference.url,
    mimeType: reference.mimeType,
    bytes: reference.bytes,
    source: reference.source,
  }));
}

function decorateImageRecord({ image, requestDetails }) {
  const publicRequest = makePublicRequest(requestDetails);
  return {
    ...image,
    prompt: requestDetails.prompt,
    params: makePublicParams(requestDetails),
    request: publicRequest,
  };
}

function makePublicRequest(requestDetails = {}) {
  const manjuContext = normalizeManjuContext(requestDetails.manjuContext);
  const request = {
    endpointMode: requestDetails.endpointMode || "images",
    model: requestDetails.model || "gpt-image-2",
    prompt: requestDetails.prompt || "",
    negativePrompt: requestDetails.negativePrompt || "",
    n: requestDetails.n || 1,
    size: requestDetails.size || "auto",
    quality: requestDetails.quality || "auto",
    output_format: requestDetails.output_format || requestDetails.outputFormat || "png",
    output_compression: requestDetails.output_compression,
    background: requestDetails.background || "auto",
    referenceImages: Array.isArray(requestDetails.referenceImages) ? requestDetails.referenceImages : [],
  };
  if (requestDetails.maskApplied) request.maskApplied = true;
  if (manjuContext) {
    request.manjuContext = manjuContext;
  }
  return request;
}

function makePublicParams(requestDetails = {}) {
  const request = makePublicRequest(requestDetails);
  const params = {
    endpointMode: request.endpointMode,
    model: request.model,
    size: request.size,
    quality: request.quality,
    format: request.output_format,
    background: request.background,
    count: request.n,
    references: request.referenceImages.length,
  };
  if (request.manjuContext) {
    params.manjuContext = request.manjuContext;
  }
  return params;
}

function mimeFromExtension(extension) {
  const ext = String(extension || "").toLowerCase().replace(/^\./, "");
  if (ext === "jpg" || ext === "jpeg") {
    return "image/jpeg";
  }
  if (ext === "webp") {
    return "image/webp";
  }
  if (ext === "gif") {
    return "image/gif";
  }
  return "image/png";
}

// ===== 图库列表内存缓存 =====
// outputs/ 会积累上万文件，listImages 每次全盘扫描 + 逐文件 statSync 是热点
// （前端每次生成完、每次刷新图库都调）。缓存按批次目录分片：
// batch -> { mtimeMs, images }。每次请求只 readdir 顶层 + statSync 每个批次
// 目录（几百次 stat，比全量扫低两个量级），目录列表和 mtime 都没变就直接用
// 缓存；变了只重扫变化的那几个批次目录（增量更新）。目录里增删文件都会改
// 该目录的 mtime，外部手工删改 outputs/ 的常见情形靠这层对比兜住；本进程
// 写路径（生图、删图、漫剧归档导出）另外主动失效，不依赖 mtime 分辨率。
// 注意 listImages 只扫批次目录的直接子文件，_projects/_style-references 及
// 批次 references/ 等嵌套内容本来就进不了图库，那些写路径无需失效。
const imageListCache = {
  batches: new Map(),
  flat: null, // 按批次倒序摊平的全量列表，命中时直接分页切片
};

// batchId 省略 = 清空整个缓存。被删的条目下次请求会当作新目录重扫。
function invalidateImageListCache(batchId) {
  if (batchId === undefined) {
    imageListCache.batches.clear();
  } else {
    imageListCache.batches.delete(String(batchId));
  }
  imageListCache.flat = null;
}

function listImages(options = {}) {
  const images = collectGalleryImages();
  const pageSize = normalizePageSize(options.pageSize);
  const total = images.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const requestedPage = clampInteger(options.page, 1, totalPages, 1);
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * pageSize;

  return {
    images: images.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

// 返回全量图库列表（批次 ID 倒序）。缓存有效时零磁盘 IO——
// 只有顶层 readdir + 每批次目录一次 statSync 的对比成本。
function collectGalleryImages() {
  if (!fs.existsSync(outputDir)) {
    invalidateImageListCache();
    return [];
  }

  const batchNames = fs.readdirSync(outputDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  const seen = new Set();
  let changed = false;
  for (const batch of batchNames) {
    seen.add(batch);
    let mtimeMs;
    try {
      mtimeMs = fs.statSync(path.join(outputDir, batch)).mtimeMs;
    } catch {
      continue; // 对比窗口内目录被删：本轮跳过，下一轮 readdir 就看不到它了
    }
    const cached = imageListCache.batches.get(batch);
    if (cached && cached.mtimeMs === mtimeMs) {
      continue;
    }
    imageListCache.batches.set(batch, {
      mtimeMs,
      images: scanBatchDirectory(batch),
    });
    changed = true;
  }

  // 磁盘上已不存在的批次目录从缓存剔除
  for (const batch of imageListCache.batches.keys()) {
    if (!seen.has(batch)) {
      imageListCache.batches.delete(batch);
      changed = true;
    }
  }

  if (!changed && imageListCache.flat) {
    return imageListCache.flat;
  }

  const images = [];
  for (const batch of batchNames) {
    const cached = imageListCache.batches.get(batch);
    if (cached) {
      images.push(...cached.images);
    }
  }
  imageListCache.flat = images;
  return images;
}

// 全量扫一个批次目录（readdir + metadata.json + 每文件 statSync）。
// 只有目录 mtime 变了或缓存失效才会走到这里。
function scanBatchDirectory(batch) {
  const batchDir = path.join(outputDir, batch);
  const metadataPath = path.join(batchDir, "metadata.json");
  let createdAt = "";
  let prompt = "";
  let requestDetails = {};

  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      createdAt = metadata.createdAt || "";
      requestDetails = metadata.request || {};
      prompt = requestDetails.prompt || "";
    } catch {
      createdAt = "";
    }
  }

  const images = [];
  let entries;
  try {
    entries = fs.readdirSync(batchDir, { withFileTypes: true });
  } catch {
    return images; // 目录在扫描窗口内被删，当空批次处理
  }
  // 同批次所有图片共享同一份 request/params（响应层只做 JSON 序列化，
  // 共享引用安全），1.6 万张图的缓存别为每张图重复构造大对象。
  const params = makePublicParams(requestDetails);
  const request = makePublicRequest(requestDetails);
  for (const file of entries) {
    if (!file.isFile() || !/\.(png|jpe?g|webp)$/i.test(file.name)) {
      continue;
    }

    const filePath = path.join(batchDir, file.name);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }
    images.push({
      id: `${batch}/${file.name}`,
      url: `/outputs/${batch}/${file.name}`,
      batchId: batch,
      createdAt,
      prompt,
      params,
      request,
      bytes: stat.size,
    });
  }
  return images;
}

function normalizePageSize(value) {
  const size = Number.parseInt(value, 10);
  return [6, 12, 24, 48].includes(size) ? size : 12;
}

function deleteImages(ids) {
  const requestedIds = Array.isArray(ids) ? ids : [];
  const deleted = [];
  const failed = [];

  requestedIds.forEach((id) => {
    try {
      const deletedItem = deleteImageById(id);
      if (deletedItem) {
        deleted.push(id);
      } else {
        failed.push({ id, error: "Image not found." });
      }
    } catch (error) {
      failed.push({ id, error: error.message || String(error) });
    }
  });

  return {
    deleted,
    failed,
  };
}

function deleteImageById(id) {
  const { safeId, batchId, filePath } = resolveOutputImageById(id);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }

  fs.unlinkSync(filePath);
  removeImageFromMetadata(batchId, safeId);
  invalidateImageListCache(batchId);
  return true;
}

function removeImageFromMetadata(batchId, imageId) {
  const metadataPath = path.join(outputDir, batchId, "metadata.json");
  if (!fs.existsSync(metadataPath)) {
    return;
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    if (Array.isArray(metadata.images)) {
      metadata.images = metadata.images.filter((image) => image.id !== imageId);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf8");
    }
  } catch {
    // Keep deletion successful even if old metadata is malformed.
  }
}

function resolveOutputImageById(id) {
  const safeId = String(id || "").replace(/\\/g, "/");
  if (!/^[^/]+\/[^/]+\.(png|jpe?g|webp)$/i.test(safeId)) {
    throw httpError(400, "Invalid image id.");
  }

  const [batchId, fileName] = safeId.split("/");
  const filePath = path.resolve(outputDir, batchId, fileName);
  const basePath = path.resolve(outputDir);
  if (!filePath.startsWith(basePath + path.sep)) {
    throw httpError(403, "Forbidden image path.");
  }

  return {
    safeId,
    batchId,
    fileName,
    filePath,
  };
}

function readBatchMetadata(batchId) {
  const metadataPath = path.join(outputDir, batchId, "metadata.json");
  if (!fs.existsSync(metadataPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  } catch {
    return {};
  }
}

function sanitizeFileSegment(value, fallback) {
  const normalized = String(value || fallback || "item")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .slice(0, 80);
  return normalized || fallback || "item";
}

function uniqueFilePath(dir, fileName) {
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);
  let candidate = path.join(dir, fileName);
  let index = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${baseName}-${index}${extension}`);
    index += 1;
  }
  return candidate;
}

function outputUrlForFile(filePath) {
  const relativePath = path.relative(outputDir, filePath).split(path.sep).join("/");
  return `/outputs/${encodeOutputPath(relativePath)}`;
}

function encodeOutputPath(relativePath) {
  return String(relativePath || "")
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function generateImagesViaChat(options) {
  const {
    apiConfig,
    prompt,
    model,
    size,
    quality,
    outputFormat,
    count,
    startedAt,
    batchId,
    batchDir,
    referenceImages = [],
    requestDetails,
  } = options;

  const images = [];

  for (let index = 0; index < count && images.length < count; index += 1) {
    const chatPrompt = appendNegativePromptText([
      prompt,
      "",
      "Generate one image.",
      `Target size: ${size}.`,
      `Quality: ${quality}.`,
      `Preferred output format: ${outputFormat}.`,
      "Return image data or image URLs only when possible.",
    ].join("\n"), requestDetails.negativePrompt);
    const content = [
      { type: "text", text: chatPrompt },
      ...referenceImages.map((reference) => ({
        type: "image_url",
        image_url: {
          url: referenceToDataUrl(reference),
        },
      })),
    ];

    const apiResponse = await fetch(buildOpenAiUrl(apiConfig.baseUrl, "/chat/completions"), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content,
          },
        ],
        n: 1,
      }),
      signal: AbortSignal.timeout(OPENAI_IMAGE_TIMEOUT_MS),
    });

    const responseBody = await parseOpenAiJsonResponse(apiResponse);
    const extracted = extractImagesFromAnyResponse(responseBody);
    const saved = await saveExtractedImages({
      extracted,
      batchId,
      batchDir,
      size,
      outputFormat,
      requestDetails,
      startIndex: images.length,
      limit: count - images.length,
    });
    images.push(...saved);
  }

  if (images.length === 0) {
    throw httpError(502, "Chat-compatible image response contained no extractable image data.");
  }

  const metadata = {
    batchId,
    createdAt: startedAt.toISOString(),
    request: requestDetails,
    images,
  };
  fs.writeFileSync(path.join(batchDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf8");
  invalidateImageListCache(batchId);

  return {
    batchId,
    createdAt: metadata.createdAt,
    images,
  };
}

function extractImagesFromAnyResponse(value) {
  const images = [];
  const seen = new Set();

  function addImage(candidate) {
    if (!candidate?.data || seen.has(candidate.data)) {
      return;
    }
    seen.add(candidate.data);
    images.push(candidate);
  }

  function walk(node) {
    if (!node) {
      return;
    }

    if (typeof node === "string") {
      if (node.startsWith("data:image/")) {
        addImage({ type: "dataUrl", data: node });
      } else if (looksLikeImageUrl(node)) {
        addImage({ type: "url", data: node });
      } else if (looksLikeImageBase64(node)) {
        addImage({ type: "base64", data: node });
      } else {
        extractImageStrings(node).forEach(addImage);
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (typeof node !== "object") {
      return;
    }

    if (typeof node.b64_json === "string") {
      addImage({ type: "base64", data: node.b64_json });
    }
    ["base64", "b64", "image_base64", "imageBase64"].forEach((key) => {
      if (typeof node[key] === "string" && looksLikeImageBase64(node[key])) {
        addImage({ type: "base64", data: node[key] });
      }
    });
    if (typeof node.url === "string" && looksLikeImageUrl(node.url)) {
      addImage({ type: "url", data: node.url });
    }
    if (typeof node.image === "string") {
      walk(node.image);
    }
    if (typeof node.data === "string" && looksLikeImageBase64(node.data)) {
      addImage({ type: "base64", data: node.data });
    }
    if (node.image_url?.url) {
      walk(node.image_url.url);
    }
    if (node.file?.data) {
      addImage({ type: "base64", data: node.file.data });
    }
    if (node.file?.url) {
      walk(node.file.url);
    }

    Object.values(node).forEach(walk);
  }

  walk(value);
  return images;
}

function extractImageStrings(text) {
  const matches = [];
  const dataUrlRegex = /data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi;
  const urlRegex = /https?:\/\/[^\s"'<>]+/gi;

  for (const match of String(text).matchAll(dataUrlRegex)) {
    matches.push({ type: "dataUrl", data: match[0] });
  }
  for (const match of String(text).matchAll(urlRegex)) {
    const url = match[0].replace(/[),.]+$/, "");
    if (looksLikeImageUrl(url)) {
      matches.push({ type: "url", data: url });
    }
  }

  return matches;
}

async function saveExtractedImages({ extracted, batchId, batchDir, size, outputFormat, requestDetails, startIndex = 0, limit = Infinity }) {
  const images = [];

  for (const item of extracted) {
    if (images.length >= limit) {
      break;
    }

    let buffer;
    let extension = outputFormat === "jpeg" ? "jpg" : outputFormat;

    if (item.type === "dataUrl") {
      const parsed = parseDataUrl(item.data);
      if (!parsed) {
        continue;
      }
      buffer = Buffer.from(parsed.base64, "base64");
      extension = extensionFromMime(parsed.mimeType, extension);
    } else if (item.type === "url") {
      const downloaded = await downloadImage(item.data);
      if (!downloaded) {
        continue;
      }
      buffer = downloaded.buffer;
      extension = extensionFromMime(downloaded.mimeType, extension);
    } else {
      buffer = Buffer.from(item.data, "base64");
    }

    if (!buffer || buffer.length === 0) {
      continue;
    }

    const fileName = `background-${String(startIndex + images.length + 1).padStart(2, "0")}.${extension}`;
    const filePath = path.join(batchDir, fileName);
    fs.writeFileSync(filePath, buffer);
    images.push(decorateImageRecord({
      image: {
        // filePath（本机绝对路径）不放进 record：generate 响应会发给前端，
        // 内部写盘已用上面的同名局部变量，record 无内部消费者。与 listImages 一致不外泄。
        id: `${batchId}/${fileName}`,
        url: `/outputs/${batchId}/${fileName}`,
        revisedPrompt: "",
        size,
        format: extension,
      },
      requestDetails,
    }));
  }

  return images;
}

function referenceToDataUrl(reference) {
  const bytes = fs.readFileSync(reference.filePath);
  return `data:${reference.mimeType || "image/png"};base64,${bytes.toString("base64")}`;
}

async function downloadImage(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      return null;
    }
    const mimeType = response.headers.get("content-type") || "";
    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType,
    };
  } catch {
    return null;
  }
}

function parseDataUrl(value) {
  const match = String(value).match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) {
    return null;
  }
  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2],
  };
}

function looksLikeImageUrl(value) {
  return /^https?:\/\/\S+/i.test(value) && (
    /\.(png|jpe?g|webp)(\?|#|$)/i.test(value) ||
    /\/(image|images|files|assets|generated)\//i.test(value)
  );
}

function looksLikeImageBase64(value) {
  const text = String(value).trim();
  return text.length > 200 && /^(iVBORw0KGgo|\/9j\/|UklGR|R0lGOD)/.test(text);
}

function extensionFromMime(mimeType, fallback) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("png")) {
    return "png";
  }
  if (mime.includes("jpeg") || mime.includes("jpg")) {
    return "jpg";
  }
  if (mime.includes("webp")) {
    return "webp";
  }
  return fallback;
}

async function testConnection(input) {
  const settings = loadSettings();
  const existing = settings.profiles.find((profile) => profile.id === input.profileId);
  const apiKey = String(input.apiKey || existing?.apiKey || getActiveApiConfig().apiKey || "").trim();
  const baseUrl = normalizeBaseUrl(input.baseUrl || existing?.baseUrl || getActiveApiConfig().baseUrl);
  const endpoint = buildOpenAiUrl(baseUrl, "/models");

  if (!apiKey) {
    return {
      ok: false,
      endpoint,
      error: "API key is missing.",
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(20000),
    });

    const responseText = await response.text();
    let responseBody = {};
    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseBody = { raw: responseText.slice(0, 400) };
    }

    if (!response.ok) {
      return {
        ok: false,
        endpoint,
        status: response.status,
        error: responseBody.error?.message || responseBody.message || responseText.slice(0, 400) || `HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      endpoint,
      status: response.status,
      modelCount: Array.isArray(responseBody.data) ? responseBody.data.length : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      endpoint,
      error: error.message || String(error),
      hint: "If this is a relay, verify the relay base URL and whether it supports OpenAI-compatible /v1/models.",
    };
  }
}

async function listImageModels(input) {
  const settings = loadSettings();
  const existing = settings.profiles.find((profile) => profile.id === input.profileId);
  const apiKey = String(input.apiKey || existing?.apiKey || getActiveApiConfig().apiKey || "").trim();
  const baseUrl = normalizeBaseUrl(input.baseUrl || existing?.baseUrl || getActiveApiConfig().baseUrl);
  const endpoint = buildOpenAiUrl(baseUrl, "/models");

  if (!apiKey) {
    return {
      ok: false,
      endpoint,
      models: [],
      error: "API key is missing.",
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(30000),
    });
    const responseText = await response.text();
    let responseBody = {};
    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseBody = { raw: responseText.slice(0, 400) };
    }

    if (!response.ok) {
      return {
        ok: false,
        endpoint,
        status: response.status,
        models: [],
        error: responseBody.error?.message || responseBody.message || responseText.slice(0, 400) || `HTTP ${response.status}`,
      };
    }

    const models = extractModelIds(responseBody);
    return {
      ok: true,
      endpoint,
      status: response.status,
      models,
      modelCount: models.length,
    };
  } catch (error) {
    return {
      ok: false,
      endpoint,
      models: [],
      error: error.message || String(error),
      hint: "If this relay does not expose /v1/models, keep typing the model id manually.",
    };
  }
}

async function testAuxiliaryConnection(input) {
  const config = getAuxiliaryApiConfigFromInput(input);
  const endpoint = buildOpenAiUrl(config.baseUrl, "/chat/completions");

  if (!config.apiKey) {
    return {
      ok: false,
      endpoint,
      error: "Auxiliary API key is missing.",
    };
  }

  try {
    const responseBody = await requestAuxiliaryChat(config, [
      {
        role: "user",
        content: "Reply with exactly: ok",
      },
    ], { maxTokens: 24 });
    return {
      ok: true,
      endpoint,
      model: config.model,
      text: extractTextFromModelResponse(responseBody).slice(0, 80),
    };
  } catch (error) {
    return {
      ok: false,
      endpoint,
      model: config.model,
      error: error.message || String(error),
      hint: "If this is a relay, verify the model supports vision/chat-compatible requests.",
    };
  }
}

async function listAuxiliaryModels(input) {
  const config = getAuxiliaryApiConfigFromInput(input);
  const endpoint = buildOpenAiUrl(config.baseUrl, "/models");

  if (!config.apiKey) {
    return {
      ok: false,
      endpoint,
      models: [],
      error: "Auxiliary API key is missing.",
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
      },
      signal: AbortSignal.timeout(30000),
    });
    const responseText = await response.text();
    let responseBody = {};
    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseBody = { raw: responseText.slice(0, 400) };
    }

    if (!response.ok) {
      return {
        ok: false,
        endpoint,
        status: response.status,
        models: [],
        error: responseBody.error?.message || responseBody.message || responseText.slice(0, 400) || `HTTP ${response.status}`,
      };
    }

    const models = extractModelIds(responseBody);
    return {
      ok: true,
      endpoint,
      status: response.status,
      models,
      modelCount: models.length,
    };
  } catch (error) {
    return {
      ok: false,
      endpoint,
      models: [],
      error: error.message || String(error),
      hint: "If this relay does not expose /v1/models, keep typing the model id manually.",
    };
  }
}

function parseJsonObjectFromText(text) {
  const jsonText = extractJsonObjectText(text);
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw httpError(502, `Auxiliary API returned invalid JSON: ${error.message}`);
  }
}

function extractJsonObjectText(text) {
  const source = String(text || "").trim();
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : source;
  const start = candidate.indexOf("{");
  if (start < 0) {
    throw httpError(502, "Auxiliary API returned no JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < candidate.length; index += 1) {
    const char = candidate[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return candidate.slice(start, index + 1);
      }
    }
  }

  throw httpError(502, "Auxiliary API returned incomplete JSON.");
}

function normalizeManjuScriptPack(input, context = {}) {
  const source = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  const title = clipText(source.title, 120) || context.title || "未命名漫剧";
  const episodes = normalizeManjuScriptEpisodes(source.episodes, source.shots, context.episodeNo || 1);
  return {
    type: "yaotu-manju-script-pack",
    version: Number.parseInt(source.version, 10) || 1,
    id: clipText(source.id, 120) || `script-${Date.now()}`,
    title,
    source: clipText(source.source, 80) || "yaotu-auxiliary-script-split",
    scriptText: normalizeOptionalText(
      source.scriptText || source.fullScript || source.originalScript || source.script || context.scriptText,
      60000,
    ),
    summary: clipText(source.summary, 2000),
    createdAt: clipText(source.createdAt, 64) || now,
    updatedAt: now,
    episodes,
  };
}

function normalizeManjuScriptEpisodes(episodes, fallbackShots, fallbackEpisodeNo) {
  const rawEpisodes = Array.isArray(episodes) && episodes.length
    ? episodes
    : [{
        episodeNo: fallbackEpisodeNo,
        title: `第${fallbackEpisodeNo}集`,
        summary: "",
        scenes: [{
          sceneNo: 1,
          title: "未命名场景",
          location: "",
          summary: "",
          shots: Array.isArray(fallbackShots) ? fallbackShots : [],
        }],
      }];

  return rawEpisodes.slice(0, 120)
    .map((episode, episodeIndex) => {
      const episodeNo = clampInteger(episode?.episodeNo, 1, 999, fallbackEpisodeNo || episodeIndex + 1);
      return {
        episodeNo,
        title: clipText(episode?.title, 120) || `第${episodeNo}集`,
        summary: clipText(episode?.summary, 2000),
        scenes: normalizeManjuScriptScenes(episode?.scenes, episodeNo),
      };
    })
    .filter((episode) => episode.scenes.length > 0);
}

function normalizeManjuScriptScenes(scenes, episodeNo) {
  const rawScenes = Array.isArray(scenes) ? scenes : [];
  return rawScenes.slice(0, 400)
    .map((scene, sceneIndex) => {
      const sceneNo = clampInteger(scene?.sceneNo, 1, 999, sceneIndex + 1);
      const location = clipText(scene?.location || scene?.place, 160);
      return {
        sceneNo,
        title: clipText(scene?.title, 160) || location || `场景${sceneNo}`,
        location,
        summary: clipText(scene?.summary, 2000),
        shots: normalizeManjuScriptShots(scene?.shots, episodeNo, sceneNo),
      };
    })
    .filter((scene) => scene.shots.length > 0);
}

function normalizeManjuScriptShots(shots, episodeNo, sceneNo) {
  if (!Array.isArray(shots)) {
    return [];
  }

  return shots.slice(0, 2000)
    .map((shot, shotIndex) => {
      if (!shot || typeof shot !== "object") {
        return null;
      }
      const order = shotIndex + 1;
      const shotNo = clipText(shot.shotNo || shot.id, 80) || `${episodeNo}-${sceneNo}-${String(order).padStart(3, "0")}`;
      const characters = Array.isArray(shot.characters)
        ? shot.characters
        : String(shot.characters || "").split(/[、,，/]/);
      const normalized = {
        shotNo,
        order,
        characters: characters.map((name) => clipText(name, 80)).filter(Boolean).slice(0, 12),
        visual: clipText(shot.visual || shot.image || shot.description, 2000),
        action: clipText(shot.action, 1000),
        emotion: clipText(shot.emotion || shot.mood, 500),
        camera: clipText(shot.camera || shot.framing, 500),
        dialogueRef: clipText(shot.dialogueRef || shot.dialogue, 1000),
        promptSeed: clipText(shot.promptSeed || shot.prompt, 2000),
        notes: clipText(shot.notes, 1000),
      };
      if (!normalized.visual && !normalized.action && !normalized.promptSeed && !normalized.dialogueRef) {
        return null;
      }
      return normalized;
    })
    .filter(Boolean);
}

function countManjuScriptShots(pack) {
  if (!Array.isArray(pack?.episodes)) {
    return 0;
  }
  return pack.episodes.reduce((episodeTotal, episode) => (
    episodeTotal + (episode.scenes || []).reduce((sceneTotal, scene) => (
      sceneTotal + (Array.isArray(scene.shots) ? scene.shots.length : 0)
    ), 0)
  ), 0);
}

function clipText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

async function optimizePrompt(input = {}) {
  const prompt = normalizePromptDraft(input.prompt);
  const negativePrompt = normalizeOptionalText(input.negativePrompt, 8000);
  const mode = normalizePromptOptimizeMode(input.mode);
  const targetSize = normalizeAnalysisTargetSize(input.targetSize || input.size);
  const purpose = normalizeOptionalText(input.purpose, 120);
  const styleSelected = input.styleSelected === true;
  const styleName = styleSelected ? normalizeOptionalText(input.styleName, 200) : "";
  const config = input.auxiliary && typeof input.auxiliary === "object"
    ? getAuxiliaryApiConfigFromInput(input.auxiliary)
    : getAuxiliaryApiConfig();

  if (!config.apiKey) {
    throw httpError(401, "Auxiliary API key is missing.");
  }

  const messages = [
    {
      role: "system",
      content: "You are a prompt optimization assistant for an image generation workbench. Return the optimized prompt only in the requested format. Do not generate images.",
    },
    {
      role: "user",
      content: buildPromptOptimizationPrompt({
        prompt,
        negativePrompt,
        mode,
        targetSize,
        purpose,
        styleSelected,
        styleName,
      }),
    },
  ];
  const responseBody = await requestAuxiliaryChat(config, messages, {
    maxTokens: mode === "quality" ? 2200 : 1800,
  });
  const text = extractTextFromModelResponse(responseBody).trim();
  if (!text) {
    throw httpError(502, "Auxiliary API returned no optimized prompt.");
  }

  return {
    mode,
    model: config.model,
    text,
    optimizedPrompt: extractOptimizedPromptText(text) || text,
    negativePrompt: extractOptimizedNegativePromptText(text),
  };
}

function normalizePromptDraft(value) {
  const text = String(value || "").trim();
  if (text.length < 4) {
    throw httpError(400, "Prompt is too short.");
  }
  if (text.length > 32000) {
    throw httpError(400, "Prompt is too long. Keep it below 32000 characters.");
  }
  return text;
}

// normalizePromptOptimizeMode / buildPromptOptimizationPrompt / extractOptimizedPromptText /
// extractOptimizedNegativePromptText 已搬到 shared/promptBuilders.cjs（见顶部 require）。

async function analyzeImages(input) {
  const mode = normalizeAnalysisMode(input.mode);
  const rawImages = Array.isArray(input.images) ? input.images : [input.image].filter(Boolean);
  const images = await prepareAnalysisImages(rawImages, mode === "prompt" ? 1 : 8);
  if (images.length === 0) {
    throw httpError(400, "No readable image was provided.");
  }

  const config = input.auxiliary && typeof input.auxiliary === "object"
    ? getAuxiliaryApiConfigFromInput(input.auxiliary)
    : getAuxiliaryApiConfig();
  if (!config.apiKey) {
    throw httpError(401, "Auxiliary API key is missing.");
  }

  const instruction = buildAnalysisPrompt(mode, input.targetSize || input.size);
  const messages = [
    {
      role: "system",
      content: "You are an image prompt assistant for a local image generation workbench. Return practical prompts, not explanations.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: instruction },
        ...images.map((image) => ({
          type: "image_url",
          image_url: {
            url: image.dataUrl,
          },
        })),
      ],
    },
  ];

  const responseBody = await requestAuxiliaryChat(config, messages, { maxTokens: maxTokensForAnalysisMode(mode) });
  const text = extractTextFromModelResponse(responseBody).trim();
  if (!text) {
    throw httpError(502, "Auxiliary API returned no text.");
  }

  return {
    mode,
    model: config.model,
    text,
    images: images.map((image) => ({
      name: image.name,
      mimeType: image.mimeType,
      bytes: image.bytes,
    })),
  };
}

// buildAnalysisPrompt / maxTokensForAnalysisMode / normalizeAnalysisTargetSize /
// analysisTargetCanvasInstruction / buildPromptExtractionPrompt / buildKeywordExtractionPrompt /
// buildStyleExtractionPrompt / buildSceneExtractionPrompt 已搬到 shared/promptBuilders.cjs（见顶部 require）。

async function requestAuxiliaryChat(config, messages, options = {}) {
  const payload = {
    model: config.model,
    messages,
    temperature: 0.2,
  };
  if (options.maxTokens) {
    payload.max_tokens = options.maxTokens;
  }

  const apiResponse = await fetch(buildOpenAiUrl(config.baseUrl, "/chat/completions"), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(OPENAI_IMAGE_TIMEOUT_MS),
  });

  return parseOpenAiJsonResponse(apiResponse);
}

function enrichAuxiliaryError(error, prefix) {
  const message = error?.publicMessage || error?.message || String(error);
  const normalized = httpError(error?.statusCode || 502, `${prefix}\n${message}`);
  normalized.cause = error;
  return normalized;
}

async function prepareAnalysisImages(inputImages, limit) {
  const rawImages = Array.isArray(inputImages) ? inputImages.slice(0, limit) : [];
  const images = [];

  for (const [index, image] of rawImages.entries()) {
    const resolved = await resolveReferenceImage(image);
    if (!resolved?.buffer?.length) {
      continue;
    }
    const mimeType = resolved.mimeType || "image/png";
    images.push({
      name: String(image?.name || image?.id || `Image ${index + 1}`).slice(0, 120),
      mimeType,
      bytes: resolved.buffer.length,
      dataUrl: `data:${mimeType};base64,${resolved.buffer.toString("base64")}`,
    });
  }

  return images;
}

// extractTextFromModelResponse 已搬到 shared/promptBuilders.cjs（见顶部 require）。

function extractModelIds(responseBody) {
  const candidates = [];
  if (Array.isArray(responseBody?.data)) {
    candidates.push(...responseBody.data);
  }
  if (Array.isArray(responseBody?.models)) {
    candidates.push(...responseBody.models);
  }
  if (Array.isArray(responseBody)) {
    candidates.push(...responseBody);
  }

  const ids = candidates
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      return item?.id || item?.name || item?.model;
    })
    .filter((id) => typeof id === "string" && id.trim())
    .map((id) => id.trim());

  return Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
}

// normalizeAnalysisMode 已搬到 shared/promptBuilders.cjs（见顶部 require）。它在校验失败时抛出的
// httpError 由该模块自带的私有 httpError 生成，形状与本文件的一致（statusCode / publicMessage）。

function loadSettings() {
  const fallback = createDefaultSettings();
  if (!fs.existsSync(settingsPath)) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    const profiles = Array.isArray(parsed.profiles)
      ? parsed.profiles.map(normalizeProfile).filter(Boolean)
      : [];

    if (profiles.length === 0) {
      profiles.push(fallback.profiles[0]);
    }

    const activeProfileId = profiles.some((profile) => profile.id === parsed.activeProfileId)
      ? parsed.activeProfileId
      : profiles[0].id;

    const auxiliaryProfiles = normalizeAuxiliaryProfiles(parsed.auxiliaryProfiles, parsed.auxiliary || fallback.auxiliary);
    const activeAuxiliaryProfileId = auxiliaryProfiles.some((profile) => profile.id === parsed.activeAuxiliaryProfileId)
      ? parsed.activeAuxiliaryProfileId
      : auxiliaryProfiles[0].id;
    const auxiliary = auxiliaryProfiles.find((profile) => profile.id === activeAuxiliaryProfileId) || auxiliaryProfiles[0];

    return {
      activeProfileId,
      profiles,
      activeAuxiliaryProfileId,
      auxiliaryProfiles,
      auxiliary,
      savedPrompts: normalizeSavedItems(parsed.savedPrompts),
      savedStyles: normalizeSavedItems(parsed.savedStyles),
      recentPrompts: normalizeSavedItems(parsed.recentPrompts),
    };
  } catch {
    return fallback;
  }
}

function saveSettings(input) {
  const settings = loadSettings();
  const profileId = normalizeProfileId(input.profileId || input.id || `profile-${Date.now()}`);
  const existingIndex = settings.profiles.findIndex((profile) => profile.id === profileId);
  const existing = existingIndex >= 0 ? settings.profiles[existingIndex] : {};

  const nextProfile = normalizeProfile({
    id: profileId,
    name: input.name || existing.name || "API Profile",
    apiKey: String(input.apiKey || "").trim() || existing.apiKey || "",
    baseUrl: input.baseUrl || existing.baseUrl || ENV_OPENAI_BASE_URL,
    imageModel: input.imageModel || existing.imageModel || ENV_OPENAI_IMAGE_MODEL,
    endpointMode: input.endpointMode || existing.endpointMode || ENV_OPENAI_IMAGE_ENDPOINT_MODE,
  });

  if (existingIndex >= 0) {
    settings.profiles[existingIndex] = nextProfile;
  } else {
    settings.profiles.push(nextProfile);
  }

  if (input.activeProfileId) {
    const requested = normalizeProfileId(input.activeProfileId);
    if (settings.profiles.some((profile) => profile.id === requested)) {
      settings.activeProfileId = requested;
    }
  }

  if (input.setActive !== false) {
    settings.activeProfileId = nextProfile.id;
  }

  if (input.auxiliary && typeof input.auxiliary === "object") {
    applyAuxiliarySettings(settings, input.auxiliary, { setActive: input.auxiliary.setActive !== false });
  } else if (!settings.auxiliary) {
    syncActiveAuxiliary(settings);
  }

  writeSettings(settings);
  return settings;
}

function saveAuxiliarySettings(input) {
  const settings = loadSettings();
  applyAuxiliarySettings(settings, input, { setActive: input.setActive !== false });
  writeSettings(settings);
  return settings;
}

function deleteAuxiliaryProfile(id) {
  const settings = loadSettings();
  const profileId = normalizeProfileId(id);
  const profiles = normalizeAuxiliaryProfiles(settings.auxiliaryProfiles, settings.auxiliary)
    .filter((profile) => profile.id !== profileId);

  if (!profileId || profiles.length === settings.auxiliaryProfiles.length) {
    throw httpError(404, "Auxiliary API profile was not found.");
  }
  if (profiles.length === 0) {
    throw httpError(400, "At least one auxiliary API profile is required.");
  }

  settings.auxiliaryProfiles = profiles;
  if (settings.activeAuxiliaryProfileId === profileId) {
    settings.activeAuxiliaryProfileId = profiles[0].id;
  }
  syncActiveAuxiliary(settings);
  writeSettings(settings);
  return settings;
}

function deleteProfile(id) {
  const settings = loadSettings();
  const profileId = normalizeProfileId(id);
  const profiles = settings.profiles.filter((profile) => profile.id !== profileId);

  if (!profileId || profiles.length === settings.profiles.length) {
    throw httpError(404, "API profile was not found.");
  }
  if (profiles.length === 0) {
    throw httpError(400, "At least one API profile is required.");
  }

  settings.profiles = profiles;
  if (settings.activeProfileId === profileId) {
    settings.activeProfileId = profiles[0].id;
  }

  writeSettings(settings);
  return settings;
}

function saveSavedPrompt(input) {
  const settings = ensureCollections(loadSettings());
  const item = normalizeSavedItem(input, "提示词");
  settings.savedPrompts = upsertSavedItem(settings.savedPrompts, item);
  writeSettings(settings);
  return settings;
}

function deleteSavedPrompt(id) {
  const settings = ensureCollections(loadSettings());
  settings.savedPrompts = settings.savedPrompts.filter((item) => item.id !== normalizeSavedItemId(id));
  writeSettings(settings);
  return settings;
}

function saveRecentPrompt(input) {
  const settings = ensureCollections(loadSettings());
  const item = normalizeSavedItem({
    ...input,
    source: input?.source || "recent-prompt",
  }, "最近提示词");
  settings.recentPrompts = upsertRecentItem(settings.recentPrompts, item);
  writeSettings(settings);
  return settings;
}

function deleteRecentPrompt(id) {
  const settings = ensureCollections(loadSettings());
  settings.recentPrompts = settings.recentPrompts.filter((item) => item.id !== normalizeSavedItemId(id));
  writeSettings(settings);
  return settings;
}

function saveSavedStyle(input) {
  const settings = ensureCollections(loadSettings());
  const item = normalizeSavedItem(input, "风格");
  item.referenceImages = persistStyleReferenceImages(item.referenceImages, item.id);
  settings.savedStyles = upsertSavedItem(settings.savedStyles, item);
  writeSettings(settings);
  return settings;
}

function deleteSavedStyle(id) {
  const settings = ensureCollections(loadSettings());
  settings.savedStyles = settings.savedStyles.filter((item) => item.id !== normalizeSavedItemId(id));
  writeSettings(settings);
  return settings;
}

function ensureCollections(settings) {
  return {
    ...settings,
    savedPrompts: normalizeSavedItems(settings.savedPrompts),
    savedStyles: normalizeSavedItems(settings.savedStyles),
    recentPrompts: normalizeSavedItems(settings.recentPrompts),
  };
}

function upsertSavedItem(items, item) {
  const list = normalizeSavedItems(items);
  const existingIndex = list.findIndex((entry) => entry.id === item.id);
  if (existingIndex >= 0) {
    list[existingIndex] = {
      ...list[existingIndex],
      ...item,
      createdAt: list[existingIndex].createdAt || item.createdAt,
      updatedAt: new Date().toISOString(),
    };
    return list;
  }
  return [item, ...list].slice(0, 200);
}

function upsertRecentItem(items, item) {
  const list = normalizeSavedItems(items);
  const existingIndex = list.findIndex((entry) => entry.id === item.id || entry.text === item.text);
  const nextItem = {
    ...item,
    updatedAt: new Date().toISOString(),
  };
  if (existingIndex >= 0) {
    nextItem.id = list[existingIndex].id;
    nextItem.createdAt = list[existingIndex].createdAt || item.createdAt;
    list.splice(existingIndex, 1);
  }
  return [nextItem, ...list].slice(0, 80);
}

function writeSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

// 纯前端展示偏好（如主题背景）。桌面版每次启动端口都是随机分配的，
// 浏览器 localStorage 按“源”（含端口）隔离，端口一变就读不到旧值，
// 所以这类偏好落盘到后端，而不是存 localStorage。
const BACKGROUND_THEMES = new Set(["none", "white", "pink", "purple", "green", "black"]);

function readUiPrefs() {
  try {
    return JSON.parse(fs.readFileSync(uiPrefsPath, "utf8"));
  } catch {
    return {};
  }
}

function saveUiPrefs(patch = {}) {
  const prefs = readUiPrefs();
  if (Object.prototype.hasOwnProperty.call(patch, "backgroundTheme") && BACKGROUND_THEMES.has(patch.backgroundTheme)) {
    prefs.backgroundTheme = patch.backgroundTheme;
  }
  fs.writeFileSync(uiPrefsPath, JSON.stringify(prefs, null, 2), "utf8");
  return prefs;
}

function getActiveApiConfig() {
  const settings = loadSettings();
  const profile = settings.profiles.find((item) => item.id === settings.activeProfileId) || settings.profiles[0] || {};
  return {
    id: profile.id || "env-default",
    name: profile.name || "Default",
    apiKey: profile.apiKey || ENV_OPENAI_API_KEY,
    baseUrl: normalizeBaseUrl(profile.baseUrl || ENV_OPENAI_BASE_URL),
    imageModel: profile.imageModel || ENV_OPENAI_IMAGE_MODEL,
    endpointMode: normalizeEndpointMode(profile.endpointMode || ENV_OPENAI_IMAGE_ENDPOINT_MODE),
  };
}

function getAuxiliaryApiConfig() {
  const settings = loadSettings();
  const activeConfig = getActiveApiConfig();
  const auxiliary = getActiveAuxiliaryProfile(settings);

  if (auxiliary.useActiveProfile) {
    return {
      name: "辅助 API（复用生图配置）",
      apiKey: activeConfig.apiKey,
      baseUrl: activeConfig.baseUrl,
      model: auxiliary.model || "gpt-4o-mini",
    };
  }

  return {
    name: "辅助 API",
    apiKey: auxiliary.apiKey,
    baseUrl: normalizeBaseUrl(auxiliary.baseUrl || activeConfig.baseUrl),
    model: auxiliary.model || "gpt-4o-mini",
  };
}

function getAuxiliaryApiConfigFromInput(input = {}) {
  const settings = loadSettings();
  const activeConfig = getActiveApiConfig();
  const requestedProfileId = input.profileId ? normalizeProfileId(input.profileId) : "";
  const existing = normalizeAuxiliaryProfiles(settings.auxiliaryProfiles, settings.auxiliary)
    .find((profile) => profile.id === requestedProfileId)
    || getActiveAuxiliaryProfile(settings);
  const useActiveProfile = Object.prototype.hasOwnProperty.call(input, "useActiveProfile")
    ? input.useActiveProfile !== false
    : existing.useActiveProfile;
  const model = normalizeAuxiliaryModel(input.model || existing.model);

  if (useActiveProfile) {
    return {
      name: "辅助 API（复用生图配置）",
      apiKey: activeConfig.apiKey,
      baseUrl: activeConfig.baseUrl,
      model,
    };
  }

  return {
    name: "辅助 API",
    apiKey: String(input.apiKey || existing.apiKey || "").trim(),
    baseUrl: normalizeBaseUrl(input.baseUrl || existing.baseUrl || activeConfig.baseUrl),
    model,
  };
}

function createDefaultSettings() {
  const auxiliary = createDefaultAuxiliaryProfile();
  return {
    activeProfileId: "env-default",
    profiles: [
      {
        id: "env-default",
        name: "默认配置",
        apiKey: ENV_OPENAI_API_KEY,
        baseUrl: ENV_OPENAI_BASE_URL,
        imageModel: ENV_OPENAI_IMAGE_MODEL,
        endpointMode: ENV_OPENAI_IMAGE_ENDPOINT_MODE,
      },
    ],
    activeAuxiliaryProfileId: auxiliary.id,
    auxiliaryProfiles: [auxiliary],
    auxiliary,
    savedPrompts: [],
    savedStyles: [],
    recentPrompts: [],
  };
}

function createDefaultAuxiliarySettings() {
  return {
    useActiveProfile: true,
    apiKey: "",
    baseUrl: ENV_OPENAI_BASE_URL,
    model: "gpt-4o-mini",
  };
}

function createDefaultAuxiliaryProfile() {
  return normalizeAuxiliaryProfile({
    id: "aux-default",
    name: "默认辅助配置",
    ...createDefaultAuxiliarySettings(),
  });
}

function sanitizeSettings(settings) {
  const auxiliaryProfiles = normalizeAuxiliaryProfiles(settings.auxiliaryProfiles, settings.auxiliary);
  const activeAuxiliaryProfileId = auxiliaryProfiles.some((profile) => profile.id === settings.activeAuxiliaryProfileId)
    ? settings.activeAuxiliaryProfileId
    : auxiliaryProfiles[0]?.id || "aux-default";
  const auxiliary = auxiliaryProfiles.find((profile) => profile.id === activeAuxiliaryProfileId)
    || auxiliaryProfiles[0]
    || createDefaultAuxiliaryProfile();

  return {
    activeProfileId: settings.activeProfileId,
    profiles: settings.profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      baseUrl: profile.baseUrl,
      imageModel: profile.imageModel,
      endpointMode: profile.endpointMode,
      hasApiKey: Boolean(profile.apiKey),
      apiKeyMask: maskKey(profile.apiKey),
    })),
    activeAuxiliaryProfileId,
    auxiliaryProfiles: auxiliaryProfiles.map(sanitizeAuxiliarySettings),
    auxiliary: sanitizeAuxiliarySettings(auxiliary),
    savedPrompts: normalizeSavedItems(settings.savedPrompts),
    savedStyles: normalizeSavedItems(settings.savedStyles),
    recentPrompts: normalizeSavedItems(settings.recentPrompts),
  };
}

function sanitizeAuxiliarySettings(auxiliary) {
  const normalized = normalizeAuxiliarySettings(auxiliary);
  return {
    id: normalizeProfileId(auxiliary?.id || "aux-default"),
    name: String(auxiliary?.name || "辅助 API").trim().slice(0, 80) || "辅助 API",
    useActiveProfile: normalized.useActiveProfile,
    baseUrl: normalized.baseUrl,
    model: normalized.model,
    hasApiKey: Boolean(normalized.apiKey),
    apiKeyMask: maskKey(normalized.apiKey),
  };
}

function applyAuxiliarySettings(settings, input = {}, options = {}) {
  settings.auxiliaryProfiles = normalizeAuxiliaryProfiles(settings.auxiliaryProfiles, settings.auxiliary);
  const profileId = normalizeProfileId(input.profileId || input.id || settings.activeAuxiliaryProfileId || `aux-${Date.now()}`);
  const existingIndex = settings.auxiliaryProfiles.findIndex((profile) => profile.id === profileId);
  const existing = existingIndex >= 0 ? settings.auxiliaryProfiles[existingIndex] : createDefaultAuxiliaryProfile();
  const explicitApiKey = String(input.apiKey || "").trim();
  const shouldClearApiKey = input.clearApiKey === true;
  const nextProfile = normalizeAuxiliaryProfile({
    ...existing,
    id: profileId,
    name: input.name || existing.name || "辅助 API",
    useActiveProfile: Object.prototype.hasOwnProperty.call(input, "useActiveProfile")
      ? input.useActiveProfile
      : existing.useActiveProfile,
    baseUrl: input.baseUrl || existing.baseUrl,
    model: input.model || existing.model,
    apiKey: shouldClearApiKey ? "" : (explicitApiKey || existing.apiKey || ""),
  });

  if (existingIndex >= 0) {
    settings.auxiliaryProfiles[existingIndex] = nextProfile;
  } else {
    settings.auxiliaryProfiles.push(nextProfile);
  }

  if (input.activeAuxiliaryProfileId) {
    const requested = normalizeProfileId(input.activeAuxiliaryProfileId);
    if (settings.auxiliaryProfiles.some((profile) => profile.id === requested)) {
      settings.activeAuxiliaryProfileId = requested;
    }
  }
  if (options.setActive !== false) {
    settings.activeAuxiliaryProfileId = nextProfile.id;
  }
  syncActiveAuxiliary(settings);
}

function syncActiveAuxiliary(settings) {
  settings.auxiliaryProfiles = normalizeAuxiliaryProfiles(settings.auxiliaryProfiles, settings.auxiliary);
  if (!settings.auxiliaryProfiles.some((profile) => profile.id === settings.activeAuxiliaryProfileId)) {
    settings.activeAuxiliaryProfileId = settings.auxiliaryProfiles[0].id;
  }
  settings.auxiliary = getActiveAuxiliaryProfile(settings);
  return settings.auxiliary;
}

function getActiveAuxiliaryProfile(settings) {
  const profiles = normalizeAuxiliaryProfiles(settings.auxiliaryProfiles, settings.auxiliary);
  return profiles.find((profile) => profile.id === settings.activeAuxiliaryProfileId)
    || profiles[0]
    || createDefaultAuxiliaryProfile();
}

function normalizeAuxiliaryProfiles(profiles, legacyAuxiliary) {
  const normalized = Array.isArray(profiles)
    ? profiles.map(normalizeAuxiliaryProfile).filter(Boolean)
    : [];
  if (normalized.length === 0) {
    normalized.push(normalizeAuxiliaryProfile({
      id: "aux-default",
      name: "默认辅助配置",
      ...(legacyAuxiliary || createDefaultAuxiliarySettings()),
    }));
  }
  return normalized;
}

function normalizeAuxiliaryProfile(input) {
  if (!input || typeof input !== "object") {
    return null;
  }
  const normalized = normalizeAuxiliarySettings(input);
  return {
    id: normalizeProfileId(input.profileId || input.id || `aux-${Date.now()}`),
    name: String(input.name || "辅助 API").trim().slice(0, 80) || "辅助 API",
    ...normalized,
  };
}

function normalizeAuxiliarySettings(input) {
  const existing = input && typeof input === "object" ? input : {};
  return {
    useActiveProfile: existing.useActiveProfile !== false,
    apiKey: String(existing.apiKey || "").trim(),
    baseUrl: normalizeBaseUrl(existing.baseUrl || ENV_OPENAI_BASE_URL),
    model: normalizeAuxiliaryModel(existing.model || "gpt-4o-mini"),
  };
}

function normalizeSavedItems(items) {
  return Array.isArray(items)
    ? items.map((item) => normalizeSavedItem(item)).filter(Boolean).slice(0, 200)
    : [];
}

function normalizeSavedItem(input, fallbackName = "保存项") {
  if (!input || typeof input !== "object") {
    return null;
  }
  const text = String(input.text || input.prompt || input.guidance || "").trim();
  if (!text) {
    throw httpError(400, "Saved item text is required.");
  }
  if (text.length > 32000) {
    throw httpError(400, "Saved item text is too long.");
  }

  const now = new Date().toISOString();
  const name = String(input.name || fallbackName).trim().slice(0, 120) || fallbackName;
  return {
    id: normalizeSavedItemId(input.id) || makeSavedItemId(),
    name,
    text,
    styleText: String(input.styleText || "").trim().slice(0, 32000),
    negativeText: String(input.negativeText || "").trim().slice(0, 8000),
    strength: normalizeStyleStrength(input.strength),
    referenceImages: normalizeSavedReferenceImages(input.referenceImages),
    mode: String(input.mode || "").trim().slice(0, 40),
    source: String(input.source || "").trim().slice(0, 80),
    createdAt: String(input.createdAt || now),
    updatedAt: String(input.updatedAt || now),
  };
}

function normalizeStyleStrength(value) {
  const strength = String(value || "medium").trim().toLowerCase();
  return ["low", "medium", "high"].includes(strength) ? strength : "medium";
}

function normalizeSavedReferenceImages(value) {
  const references = Array.isArray(value) ? value : [];
  return references.slice(0, 8)
    .map((reference) => ({
      name: String(reference?.name || "Style reference").slice(0, 120),
      dataUrl: typeof reference?.dataUrl === "string" && reference.dataUrl.startsWith("data:image/")
        ? reference.dataUrl
        : "",
      url: typeof reference?.url === "string" ? reference.url : "",
      source: String(reference?.source || "style-reference").slice(0, 80),
    }))
    .filter((reference) => reference.dataUrl || reference.url);
}

// Style reference images can be large (multi-image style extraction). Keep them
// on disk under outputs/_style-references/<styleId>/ and store only a pointer in
// api-profiles.json, instead of inlining megabytes of base64. The stored url is a
// normal /outputs/ path, so resolveReferenceImage reads it back and still sends
// these images as references whenever the style is used at high strength.
function persistStyleReferenceImages(references, styleId) {
  const list = Array.isArray(references) ? references.slice(0, 8) : [];
  const safeId = normalizeSavedItemId(styleId) || makeSavedItemId();
  const result = [];
  list.forEach((reference, index) => {
    const inlineParsed = typeof reference?.dataUrl === "string" && reference.dataUrl.startsWith("data:image/")
      ? parseDataUrl(reference.dataUrl)
      : null;

    if (!inlineParsed) {
      // Already on disk (or a remote url) — keep the pointer, drop any dataUrl.
      if (typeof reference?.url === "string" && reference.url) {
        result.push({
          name: String(reference.name || `Style reference ${index + 1}`).slice(0, 120),
          url: reference.url,
          source: String(reference.source || "style-reference").slice(0, 80),
        });
      }
      return;
    }

    const dir = path.join(styleReferenceDir, safeId);
    fs.mkdirSync(dir, { recursive: true });
    const extension = extensionFromMime(inlineParsed.mimeType, "png");
    const fileName = `style-${String(index + 1).padStart(2, "0")}.${extension}`;
    fs.writeFileSync(path.join(dir, fileName), Buffer.from(inlineParsed.base64, "base64"));
    result.push({
      name: String(reference.name || `Style reference ${index + 1}`).slice(0, 120),
      url: `/outputs/_style-references/${safeId}/${fileName}`,
      mimeType: inlineParsed.mimeType,
      source: String(reference.source || "style-reference").slice(0, 80),
    });
  });
  return result;
}

// One-time conversion for styles saved before reference images were moved to disk.
function migrateStyleReferenceImagesToDisk() {
  if (!fs.existsSync(settingsPath)) {
    return;
  }
  let settings;
  try {
    settings = loadSettings();
  } catch {
    return;
  }
  if (!Array.isArray(settings.savedStyles) || settings.savedStyles.length === 0) {
    return;
  }
  let changed = false;
  settings.savedStyles = settings.savedStyles.map((style) => {
    const refs = Array.isArray(style.referenceImages) ? style.referenceImages : [];
    const hasInline = refs.some(
      (ref) => typeof ref?.dataUrl === "string" && ref.dataUrl.startsWith("data:image/")
    );
    if (!hasInline) {
      return style;
    }
    changed = true;
    return { ...style, referenceImages: persistStyleReferenceImages(refs, style.id) };
  });
  if (changed) {
    writeSettings(settings);
    console.log("Moved saved-style reference images out of api-profiles.json onto disk.");
  }
}

function normalizeSavedItemId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function makeSavedItemId() {
  return `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const endpointMode = normalizeEndpointMode(profile.endpointMode || ENV_OPENAI_IMAGE_ENDPOINT_MODE);
  const imageModel = normalizeModelForEndpoint(profile.imageModel || ENV_OPENAI_IMAGE_MODEL, endpointMode);

  return {
    id: normalizeProfileId(profile.id || `profile-${Date.now()}`),
    name: String(profile.name || "API Profile").trim().slice(0, 80),
    apiKey: String(profile.apiKey || "").trim(),
    baseUrl: normalizeBaseUrl(profile.baseUrl || ENV_OPENAI_BASE_URL),
    imageModel,
    endpointMode,
  };
}

function normalizeProfileId(value) {
  return String(value || "profile")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "profile";
}

function normalizeEndpointMode(value) {
  const mode = String(value || "images").trim().toLowerCase();
  return ALLOWED_ENDPOINT_MODES.has(mode) ? mode : "images";
}

function normalizeModelForEndpoint(value, endpointMode) {
  const model = String(value || ENV_OPENAI_IMAGE_MODEL).trim();
  if (!model || model.length > 120 || /[\r\n]/.test(model)) {
    throw httpError(400, "Invalid image model.");
  }
  return model;
}

function normalizeAuxiliaryModel(value) {
  const model = String(value || "gpt-4o-mini").trim();
  if (!model || model.length > 120 || /[\r\n]/.test(model)) {
    throw httpError(400, "Invalid auxiliary model.");
  }
  return model;
}

function normalizeBaseUrl(value) {
  return stripTrailingSlash(String(value || ENV_OPENAI_BASE_URL).trim());
}

function maskKey(key) {
  if (!key) {
    return "";
  }
  if (key.length <= 12) {
    return "已配置";
  }
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function serveFile(res, baseDir, relativePath, cacheControl) {
  const decoded = decodeURIComponent(relativePath || "");
  const filePath = path.resolve(baseDir, decoded);
  const basePath = path.resolve(baseDir);

  if (!filePath.startsWith(basePath + path.sep) && filePath !== basePath) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendJson(res, 404, { error: "Not found" });
  }

  const extension = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
    "Cache-Control": cacheControl || "no-store",
  });
  fs.createReadStream(filePath).pipe(res);
}

// /outputs/** 的 Cache-Control：批次图片按批次 ID（时间戳+随机段）命名目录、
// 落盘后不再改写，可长缓存；漫剧归档导出同理（exportId 唯一 + uniqueFilePath
// 防覆盖）。但两棵子树的图片会原地同名换内容，必须排除：
//   1. _projects/**：ref-NN / cand-NN 的序号 = 现存文件最大序号 +1，删掉最高
//      号的文件再传/再生成，序号会被复用（同名新图，见 copyFileIntoProject）；
//      export/ 每次导出 rmSync 重建，001_<镜号> 重复导出同名不同内容。
//   2. _style-references/<styleId>/style-NN.*：按数组下标命名，重存同一风格
//      直接覆盖。
// 非图片（project.json、manifest.json 等）一律 no-store。
function outputsCacheControl(relativePath) {
  const normalized = String(relativePath || "").replace(/\\/g, "/");
  if (!/\.(png|jpe?g|webp|gif)$/i.test(normalized)) {
    return "no-store";
  }
  if (normalized.startsWith("_projects/") || normalized.startsWith("_style-references/")) {
    return "no-store";
  }
  return "public, max-age=31536000, immutable";
}

function normalizePrompt(prompt) {
  const value = String(prompt || "").trim();
  if (value.length < 8) {
    throw httpError(400, "Prompt is too short.");
  }
  if (value.length > 32000) {
    throw httpError(400, "Prompt is too long. Keep it below 32000 characters.");
  }
  return value;
}

function normalizeOptionalText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length > maxLength) {
    throw httpError(400, `Text is too long. Keep it below ${maxLength} characters.`);
  }
  return text;
}

function normalizeManjuContext(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const type = clipText(value.type || "shot", 40) || "shot";
  const category = MANJU_ARCHIVE_CATEGORIES[value.category]
    ? value.category
    : type === "character-base" ? "character-profile" : DEFAULT_MANJU_ARCHIVE_CATEGORY;
  const characterName = clipText(value.characterName, 120);
  const characters = normalizeManjuContextCharacters(value.characters);
  if (!characters.length && characterName) {
    characters.push(characterName);
  }

  return {
    type,
    title: clipText(value.title, 120) || "未命名漫剧",
    category,
    characterId: clipText(value.characterId, 120),
    characterName,
    characterRole: clipText(value.characterRole, 120),
    shotNo: clipText(value.shotNo, 80),
    scene: clipText(value.scene || value.sceneTitle, 160),
    sceneTitle: clipText(value.sceneTitle, 160),
    queueId: clipText(value.queueId, 120),
    characters,
  };
}

function normalizeManjuContextCharacters(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => clipText(item, 120))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeChoice(value, fallback, allowed, label) {
  const normalized = String(value || fallback).trim();
  if (!allowed.has(normalized)) {
    throw httpError(400, `Unsupported ${label}: ${normalized}`);
  }
  return normalized;
}

function normalizeSize(value, model) {
  const size = String(value || "1536x1024").trim().toLowerCase();

  if (!String(model || "").startsWith("gpt-image-")) {
    return LEGACY_SIZES.has(size) ? size : "auto";
  }

  if (model !== "gpt-image-2") {
    if (!LEGACY_SIZES.has(size)) {
      throw httpError(400, `${model} only supports these sizes here: ${Array.from(LEGACY_SIZES).join(", ")}.`);
    }
    return size;
  }

  if (size === "auto") {
    return size;
  }

  const match = size.match(/^(\d{2,4})x(\d{2,4})$/);
  if (!match) {
    throw httpError(400, "Size must be auto or WIDTHxHEIGHT, for example 3584x2240.");
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width % 16 !== 0 || height % 16 !== 0) {
    throw httpError(400, "For gpt-image-2, width and height must both be multiples of 16.");
  }
  if (width < GPT_IMAGE_2_MIN_SIDE || height < GPT_IMAGE_2_MIN_SIDE) {
    throw httpError(400, "For gpt-image-2, width and height must both be at least 16 pixels.");
  }
  if (width > GPT_IMAGE_2_MAX_SIDE || height > GPT_IMAGE_2_MAX_SIDE) {
    throw httpError(400, "For gpt-image-2, width and height cannot exceed 3840 pixels.");
  }
  if (width * height > GPT_IMAGE_2_MAX_PIXELS) {
    throw httpError(400, `For gpt-image-2, total pixels cannot exceed ${GPT_IMAGE_2_MAX_PIXELS}. Try 3584x2240 for a 16:10 near-4K background.`);
  }

  return `${width}x${height}`;
}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_JSON_BODY_BYTES) {
        req.destroy();
        reject(httpError(413, "Request body is too large."));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(httpError(400, "Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, data) {
  if (res.headersSent) {
    return;
  }
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
}

function normalizeServerError(error) {
  if (error?.statusCode) {
    return error;
  }

  const requestId = makeRequestId();
  const message = error?.message || String(error);
  const name = error?.name || "";

  if (name === "TimeoutError" || name === "AbortError") {
    const timeoutSeconds = Math.round(OPENAI_IMAGE_TIMEOUT_MS / 1000);
    const normalized = httpError(504, `OpenAI image request timed out after ${timeoutSeconds}s. Try one image first, lower quality, or a smaller size.`);
    normalized.requestId = requestId;
    normalized.cause = error;
    return normalized;
  }

  if (/fetch failed|ECONNRESET|ENOTFOUND|ETIMEDOUT|ECONNREFUSED|network/i.test(message)) {
    const normalized = httpError(502, "Could not reach the OpenAI API. Check your network, proxy, or OPENAI_BASE_URL.");
    normalized.requestId = requestId;
    normalized.cause = error;
    return normalized;
  }

  const normalized = httpError(500, "Unexpected server error. See server.err.log for details.");
  normalized.requestId = requestId;
  normalized.cause = error;
  return normalized;
}

function logError(error, context) {
  const lines = [
    `[${new Date().toISOString()}] ${error.requestId || "no-request-id"} ${context}`,
    `${error.name || "Error"}: ${error.message || ""}`,
  ];

  if (error.cause) {
    lines.push(`Cause: ${error.cause.stack || error.cause.message || String(error.cause)}`);
  } else if (error.stack) {
    lines.push(error.stack);
  }

  lines.push("");

  try {
    fs.appendFileSync(errorLogPath, lines.join("\n"), "utf8");
  } catch {
    console.error(lines.join("\n"));
  }
}

function makeRequestId() {
  return Math.random().toString(36).slice(2, 10);
}

function makeBatchId(date) {
  const stamp = date.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const random = Math.random().toString(36).slice(2, 7);
  return `${stamp}-${random}`;
}

function dataUrlToBase64(value) {
  if (typeof value !== "string" || !value.startsWith("data:")) {
    return "";
  }
  return value.split(",")[1] || "";
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function buildOpenAiUrl(baseUrl, apiPath) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const pathSuffix = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  if (/\/v1\/images\/generations$/i.test(normalizedBaseUrl)) {
    if (pathSuffix === "/images/generations") {
      return normalizedBaseUrl;
    }
    return normalizedBaseUrl.replace(/\/images\/generations$/i, pathSuffix);
  }
  if (/\/v1$/i.test(normalizedBaseUrl)) {
    return `${normalizedBaseUrl}${pathSuffix}`;
  }
  return `${normalizedBaseUrl}/v1${pathSuffix}`;
}
