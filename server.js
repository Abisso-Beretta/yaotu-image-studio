const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const rootDir = __dirname;
const dataDir = path.resolve(process.env.YAOTU_DATA_DIR || rootDir);
const publicDir = path.join(rootDir, "public");
const outputDir = path.join(dataDir, "outputs");
const envPath = path.join(dataDir, ".env");
const settingsPath = path.join(dataDir, "api-profiles.json");

loadDotEnv(envPath);

const PORT = Number(process.env.PORT || 8787);
const CANONICAL_LOCAL_HOST = "127.0.0.1";
const ENV_OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ENV_OPENAI_BASE_URL = stripTrailingSlash(process.env.OPENAI_BASE_URL || "https://api.openai.com");
const ENV_OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const ENDPOINT_MODE_VALUES = ["images", "chat", "responses"];
const ENV_OPENAI_IMAGE_ENDPOINT_MODE = ENDPOINT_MODE_VALUES.includes(String(process.env.OPENAI_IMAGE_ENDPOINT_MODE || "").toLowerCase())
  ? String(process.env.OPENAI_IMAGE_ENDPOINT_MODE).toLowerCase()
  : "images";
const OPENAI_IMAGE_TIMEOUT_MS = clampInteger(process.env.OPENAI_IMAGE_TIMEOUT_MS, 60000, 1200000, 600000);
const MAX_JSON_BODY_BYTES = clampInteger(process.env.MAX_JSON_BODY_BYTES, 1024 * 1024, 100 * 1024 * 1024, 50 * 1024 * 1024);
const errorLogPath = path.join(dataDir, "server.err.log");
let updateController = null;

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
const ALLOWED_PROMPT_OPTIMIZE_MODES = new Set(["conservative", "quality", "continuity"]);
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

    if (req.method === "POST" && requestUrl.pathname === "/api/manju/archive/export") {
      const body = await readJson(req);
      const result = exportManjuArchive(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/manju/script/split") {
      const body = await readJson(req);
      const result = await splitManjuScript(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/generate") {
      const body = await readJson(req);
      const result = await generateImages(body);
      return sendJson(res, 200, result);
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
      return serveFile(res, outputDir, relativePath);
    }

    if (req.method === "GET") {
      const relativePath = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
      return serveFile(res, publicDir, relativePath);
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

function startServer(port = PORT, onStarted) {
  const listener = server.listen(port, () => {
    const address = listener.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    const apiConfig = getActiveApiConfig();
    console.log(`妖荼 running at http://${CANONICAL_LOCAL_HOST}:${actualPort}`);
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
  publicDir,
  setUpdateController,
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
    };
  }
  return updateController.getStatus();
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
  if (manjuContext) {
    requestDetails.manjuContext = manjuContext;
  }

  if (outputFormat === "jpeg" || outputFormat === "webp") {
    requestDetails.output_compression = compression;
  }

  if (apiConfig.endpointMode === "chat") {
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

  if (apiConfig.endpointMode === "responses") {
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
      ? await requestImageEdit(apiConfig, upstreamRequestDetails, referenceImages)
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

async function requestImageEdit(apiConfig, requestDetails, referenceImages) {
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

function buildImageApiPayload(requestDetails) {
  return {
    model: requestDetails.model,
    prompt: requestDetails.prompt,
    n: requestDetails.n,
    size: requestDetails.size,
    quality: requestDetails.quality,
    output_format: requestDetails.output_format,
    background: requestDetails.background,
    output_compression: requestDetails.output_compression,
  };
}

function buildResponsesImagePayload({ model, prompt, size, quality, outputFormat, referenceImages = [], requestDetails = {} }) {
  const generationPrompt = [
    prompt,
    "",
    "Generate one image.",
    `Target size: ${size}.`,
    `Quality: ${quality}.`,
    `Preferred output format: ${outputFormat}.`,
    requestDetails.negativePrompt ? `Avoid: ${requestDetails.negativePrompt}` : "",
  ].filter(Boolean).join("\n");
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

function listImages(options = {}) {
  if (!fs.existsSync(outputDir)) {
    return {
      images: [],
      total: 0,
      page: 1,
      pageSize: normalizePageSize(options.pageSize),
      totalPages: 1,
    };
  }

  const batches = fs.readdirSync(outputDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  const images = [];
  for (const batch of batches) {
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

    for (const file of fs.readdirSync(batchDir, { withFileTypes: true })) {
      if (!file.isFile() || !/\.(png|jpe?g|webp)$/i.test(file.name)) {
        continue;
      }

      const filePath = path.join(batchDir, file.name);
      const stat = fs.statSync(filePath);
      images.push({
        id: `${batch}/${file.name}`,
        url: `/outputs/${batch}/${file.name}`,
        filePath,
        batchId: batch,
        createdAt,
        prompt,
        params: makePublicParams(requestDetails),
        request: makePublicRequest(requestDetails),
        bytes: stat.size,
      });
    }
  }

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

function exportManjuArchive(input = {}) {
  const title = normalizeOptionalText(input.title, 120) || "未命名漫剧";
  const records = normalizeManjuArchiveExportRecords(input.archives);
  if (records.length === 0) {
    throw httpError(400, "No archived images to export.");
  }

  const exportedAt = new Date();
  const exportId = `${sanitizeFileSegment(title, "未命名漫剧")}-${makeBatchId(exportedAt)}`;
  const exportDir = path.join(outputDir, "manju-archives", exportId);
  fs.mkdirSync(exportDir, { recursive: true });

  const copied = [];
  const skipped = [];

  records.forEach((record, index) => {
    try {
      const source = resolveOutputImageById(record.imageId);
      if (!fs.existsSync(source.filePath) || !fs.statSync(source.filePath).isFile()) {
        skipped.push({ imageId: record.imageId, reason: "source image not found" });
        return;
      }

      const category = MANJU_ARCHIVE_CATEGORIES[record.category] || MANJU_ARCHIVE_CATEGORIES[DEFAULT_MANJU_ARCHIVE_CATEGORY];
      const categoryDir = path.join(exportDir, category.folder);
      fs.mkdirSync(categoryDir, { recursive: true });

      const extension = path.extname(source.fileName);
      const baseName = path.basename(source.fileName, extension);
      const notePart = sanitizeFileSegment(record.note || baseName, baseName);
      const outputName = `${String(index + 1).padStart(3, "0")}-${notePart}${extension.toLowerCase()}`;
      const targetPath = uniqueFilePath(categoryDir, outputName);
      fs.copyFileSync(source.filePath, targetPath);

      const metadata = readBatchMetadata(source.batchId);
      copied.push({
        imageId: source.safeId,
        title: record.title || title,
        category: record.category,
        categoryLabel: category.label,
        note: record.note,
        shotNo: record.shotNo,
        scene: record.scene,
        queueId: record.queueId,
        characterId: record.characterId,
        characterName: record.characterName,
        characters: record.characters,
        sourceUrl: `/outputs/${encodeOutputPath(source.safeId)}`,
        exportedPath: path.relative(exportDir, targetPath).split(path.sep).join("/"),
        exportedUrl: outputUrlForFile(targetPath),
        createdAt: metadata.createdAt || record.createdAt || "",
        updatedAt: record.updatedAt || "",
        prompt: metadata.request?.prompt || "",
        request: makePublicRequest(metadata.request || {}),
      });
    } catch (error) {
      skipped.push({ imageId: record.imageId, reason: error.message || String(error) });
    }
  });

  const pack = normalizeManjuExportPack(input.pack, title);
  const manifest = {
    type: "yaotu-manju-archive",
    version: 1,
    title,
    exportedAt: exportedAt.toISOString(),
    promptPack: pack,
    categories: Object.entries(MANJU_ARCHIVE_CATEGORIES).map(([value, meta]) => ({
      value,
      label: meta.label,
      folder: meta.folder,
      count: copied.filter((item) => item.category === value).length,
    })),
    images: copied,
    skipped,
  };

  const manifestPath = path.join(exportDir, "manifest.json");
  const promptPackPath = path.join(exportDir, "prompt-pack.txt");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(promptPackPath, buildManjuPromptPackText(manifest), "utf8");

  return {
    title,
    exportDir,
    copied: copied.length,
    skipped,
    manifestUrl: outputUrlForFile(manifestPath),
    promptPackUrl: outputUrlForFile(promptPackPath),
  };
}

function normalizeManjuArchiveExportRecords(archives) {
  if (!Array.isArray(archives)) {
    return [];
  }

  return archives.slice(0, 1000)
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const imageId = String(item.imageId || "").trim();
      if (!imageId) {
        return null;
      }
      const category = MANJU_ARCHIVE_CATEGORIES[item.category] ? item.category : DEFAULT_MANJU_ARCHIVE_CATEGORY;
      return {
        imageId,
        title: normalizeOptionalText(item.title, 120),
        category,
        note: normalizeOptionalText(item.note, 160),
        shotNo: normalizeOptionalText(item.shotNo, 80),
        scene: normalizeOptionalText(item.scene, 160),
        queueId: normalizeOptionalText(item.queueId, 120),
        characterId: normalizeOptionalText(item.characterId, 120),
        characterName: normalizeOptionalText(item.characterName, 120),
        characters: normalizeManjuContextCharacters(item.characters),
        createdAt: normalizeOptionalText(item.createdAt, 64),
        updatedAt: normalizeOptionalText(item.updatedAt, 64),
      };
    })
    .filter(Boolean);
}

function normalizeManjuExportPack(pack, title) {
  const source = pack && typeof pack === "object" ? pack : {};
  return {
    title,
    formulaPreset: normalizeOptionalText(source.formulaPreset || source.activeFormulaPreset, 64),
    scene: normalizeOptionalText(source.scene, 1000),
    referenceStrategy: normalizeOptionalText(source.referenceStrategy, 200),
    shotSize: normalizeOptionalText(source.shotSize, 80),
    camera: normalizeOptionalText(source.camera, 80),
    emotion: normalizeOptionalText(source.emotion, 500),
    action: normalizeOptionalText(source.action, 500),
    scenePack: normalizeOptionalText(source.scenePack, 5000),
    stylePack: normalizeOptionalText(source.stylePack, 5000),
    characterPack: normalizeOptionalText(source.characterPack, 5000),
    characters: normalizeManjuExportCharacters(source.characters),
    dialogue: normalizeOptionalText(source.dialogue, 3000),
    formula: normalizeOptionalText(source.formula, 8000),
    updatedAt: normalizeOptionalText(source.updatedAt, 64),
  };
}

function normalizeManjuExportCharacters(characters) {
  if (!Array.isArray(characters)) {
    return [];
  }
  return characters.slice(0, 120)
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const name = normalizeOptionalText(item.name, 120);
      const prompt = normalizeOptionalText(item.prompt, 5000);
      if (!name || !prompt) {
        return null;
      }
      return {
        name,
        role: normalizeOptionalText(item.role, 500),
        prompt,
        updatedAt: normalizeOptionalText(item.updatedAt, 64),
      };
    })
    .filter(Boolean);
}

function buildManjuPromptPackText(manifest) {
  const pack = manifest.promptPack || {};
  const lines = [
    `剧名：${manifest.title}`,
    `导出时间：${manifest.exportedAt}`,
    "",
    "【全局画风提示词包】",
    pack.stylePack || "未填写",
    "",
    "【人设提示词包】",
    pack.characterPack || "未填写",
    "",
    "【人设资料卡】",
    ...(pack.characters?.length
      ? pack.characters.map((card, index) => `${index + 1}. ${card.name}${card.role ? `（${card.role}）` : ""}\n${card.prompt}`)
      : ["未保存角色卡"]),
    "",
    "【场景提示词包】",
    pack.scenePack || "未填写",
    "",
    "【分镜提示词公式】",
    pack.formula || "未填写",
    "",
    "【当前分镜字段】",
    `场景：${pack.scene || "未填写"}`,
    `参考策略：${pack.referenceStrategy || "未填写"}`,
    `景别：${pack.shotSize || "未填写"}`,
    `机位：${pack.camera || "未填写"}`,
    `情绪：${pack.emotion || "未填写"}`,
    `动作：${pack.action || "未填写"}`,
    `对白/旁白：${pack.dialogue || "未填写"}`,
    "",
    "【图集统计】",
    ...manifest.categories.map((category) => `${category.label}：${category.count} 张（${category.folder}）`),
    "",
    "【图片清单】",
    ...manifest.images.map((image, index) => [
      `${index + 1}. ${image.categoryLabel} / ${image.imageId}`,
      `   镜号：${image.shotNo || "未记录"}`,
      `   场景：${image.scene || "未记录"}`,
      `   备注：${image.note || "无"}`,
      `   导出文件：${image.exportedPath}`,
      `   原提示词：${image.prompt || "无记录"}`,
    ].join("\n")),
  ];

  if (manifest.skipped.length > 0) {
    lines.push("", "【跳过项目】", ...manifest.skipped.map((item) => `${item.imageId}: ${item.reason}`));
  }

  return lines.join("\n");
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
    const chatPrompt = [
      prompt,
      "",
      "Generate one image.",
      `Target size: ${size}.`,
      `Quality: ${quality}.`,
      `Preferred output format: ${outputFormat}.`,
      "Return image data or image URLs only when possible.",
    ].join("\n");
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
        id: `${batchId}/${fileName}`,
        url: `/outputs/${batchId}/${fileName}`,
        filePath,
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

async function splitManjuScript(input = {}) {
  const title = normalizeOptionalText(input.title, 120) || "未命名漫剧";
  const episodeNo = clampInteger(input.episodeNo, 1, 999, 1);
  const scriptText = normalizeManjuScriptText(input.scriptText);
  const config = input.auxiliary && typeof input.auxiliary === "object"
    ? getAuxiliaryApiConfigFromInput(input.auxiliary)
    : getAuxiliaryApiConfig();

  if (!config.apiKey) {
    throw httpError(401, "Auxiliary API key is missing.");
  }

  const messages = [
    {
      role: "system",
      content: "You are a manju storyboard planner for an image-generation workbench. Return strict JSON only, no markdown, no explanations.",
    },
    {
      role: "user",
      content: buildManjuScriptSplitPrompt({
        title,
        episodeNo,
        scriptText,
        stylePack: input.stylePack,
        characterCards: input.characterCards,
      }),
    },
  ];

  let responseBody;
  try {
    responseBody = await requestAuxiliaryChat(config, messages, { maxTokens: 6000 });
  } catch (error) {
    throw enrichAuxiliaryError(error, `辅助 API 拆分镜失败（${config.name || "辅助 API"} / ${config.model}）。`);
  }
  const text = extractTextFromModelResponse(responseBody).trim();
  if (!text) {
    throw httpError(502, "Auxiliary API returned no text.");
  }

  const parsed = parseJsonObjectFromText(text);
  const pack = normalizeManjuScriptPack({
    ...parsed,
    title: parsed.title || title,
    source: parsed.source || "yaotu-auxiliary-script-split",
    scriptText: parsed.scriptText || scriptText,
  }, { title, episodeNo, scriptText });
  const shotCount = countManjuScriptShots(pack);

  if (shotCount === 0) {
    throw httpError(502, "Auxiliary API returned no usable shots.");
  }

  return {
    model: config.model,
    pack,
    shotCount,
  };
}

function normalizeManjuScriptText(value) {
  const text = String(value || "").trim();
  if (text.length < 20) {
    throw httpError(400, "Script text is too short.");
  }
  if (text.length > 60000) {
    throw httpError(400, "Script text is too long. Keep it below 60000 characters for one split.");
  }
  return text;
}

function buildManjuScriptSplitPrompt({ title, episodeNo, scriptText, stylePack, characterCards }) {
  const characterHint = buildManjuCharacterHint(characterCards);
  const styleHint = clipText(stylePack, 3000) || "未提供固定画风包。";
  return [
    `请把下面的漫剧剧本拆成“可直接用于生图”的分镜包。`,
    "",
    "要求：",
    "1. 只返回一个 JSON 对象，不要 Markdown，不要解释。",
    "2. 分镜要服务竖屏漫剧关键帧生图，不做视频剪辑，不生成字幕。",
    "3. 每个 shot 只描述一个清晰画面动作，避免把连续动作塞进一镜。",
    "4. dialogueRef 只作为情绪/剧情参考，不要要求画面里出现文字。",
    "5. promptSeed 写成可接入生图公式的中文画面种子，包含主体、场景、动作、情绪、镜头。",
    "6. 人物名尽量与已有人设卡一致；不确定时保留剧本文字里的称呼。",
    "",
    "JSON 结构必须是：",
    JSON.stringify({
      version: 1,
      title,
      source: "yaotu-auxiliary-script-split",
      summary: "本集概要",
      episodes: [
        {
          episodeNo,
          title: `第${episodeNo}集`,
          summary: "本集概要",
          scenes: [
            {
              sceneNo: 1,
              title: "场景标题",
              location: "地点",
              summary: "场景概要",
              shots: [
                {
                  shotNo: `${episodeNo}-1-001`,
                  characters: ["角色A", "角色B"],
                  visual: "这一镜画面看到什么",
                  action: "人物动作",
                  emotion: "情绪/氛围",
                  camera: "景别、机位、构图",
                  dialogueRef: "对白/旁白参考，不入画",
                  promptSeed: "竖屏漫剧关键帧，地点，角色，动作，情绪，镜头",
                  notes: "连续性提示",
                },
              ],
            },
          ],
        },
      ],
    }, null, 2),
    "",
    "当前项目：",
    `剧名：${title}`,
    `集数：${episodeNo}`,
    "",
    "全局画风包参考：",
    styleHint,
    "",
    "已有人设卡参考：",
    characterHint,
    "",
    "待拆分剧本：",
    scriptText,
  ].join("\n");
}

function buildManjuCharacterHint(characterCards) {
  if (!Array.isArray(characterCards) || characterCards.length === 0) {
    return "未提供人设卡。";
  }
  const lines = characterCards.slice(0, 30)
    .map((item, index) => {
      const name = clipText(item?.name, 80) || `角色${index + 1}`;
      const role = clipText(item?.role, 160);
      const prompt = clipText(item?.prompt, 600);
      return `${index + 1}. ${name}${role ? `（${role}）` : ""}${prompt ? `：${prompt}` : ""}`;
    });
  return lines.join("\n") || "未提供人设卡。";
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
      content: buildPromptOptimizationPrompt({ prompt, negativePrompt, mode }),
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

function normalizePromptOptimizeMode(value) {
  const mode = String(value || "conservative").trim().toLowerCase();
  return ALLOWED_PROMPT_OPTIMIZE_MODES.has(mode) ? mode : "conservative";
}

function buildPromptOptimizationPrompt({ prompt, negativePrompt, mode }) {
  const modeInstruction = {
    conservative: [
      "保守优化：只修正结构、语序、歧义和遗漏的质量约束。",
      "不要改变主体、角色身份、场景、动作、镜头意图、画风方向或叙事重点。",
      "尽量保留原文信息，扩写幅度控制在必要范围内。",
    ],
    quality: [
      "质量优先：在不改变核心创意的前提下，补足镜头、构图、光线、材质、色彩、空间层次和画面完成度。",
      "增加更清晰的正向约束，减少模型容易误解的表达。",
      "适合直接提交给图像生成模型。",
    ],
    continuity: [
      "连续性优先：强化角色、服装、道具、场景结构、光线方向、镜头关系和前后帧一致性。",
      "明确哪些元素必须保持稳定，哪些变化只允许发生在动作、表情或镜头推进上。",
      "适合漫剧/分镜/系列图生成，不要发散成新的设定。",
    ],
  }[mode];

  return [
    "请优化下面的图像生成提示词。",
    "必须使用中文输出，必要的摄影、美术、渲染术语可以保留英文。",
    "不要解释优化思路，不要输出 Markdown 表格。",
    "不要调用或暗示任何生图接口。",
    "输出格式必须严格为：",
    "优化后提示词：...",
    "反向提示词：...",
    "",
    ...modeInstruction,
    "",
    "原始提示词：",
    prompt,
    "",
    "原始反向提示词：",
    negativePrompt || "无",
  ].join("\n");
}

function extractOptimizedPromptText(text) {
  const value = String(text || "").trim();
  const match = value.match(/优化后提示词\s*[：:]\s*([\s\S]*?)(?:(?:\n|\\n)\s*反向提示词\s*[：:]|$)/);
  return match?.[1]?.trim() || "";
}

function extractOptimizedNegativePromptText(text) {
  const value = String(text || "").trim();
  const match = value.match(/反向提示词\s*[：:]\s*([\s\S]*)$/);
  return match?.[1]?.trim() || "";
}

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

  const instruction = buildAnalysisPrompt(mode);
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

function buildAnalysisPrompt(mode) {
  if (mode === "style") {
    return buildStyleExtractionPrompt();
  }
  if (mode === "keywords") {
    return buildKeywordExtractionPrompt();
  }
  if (mode === "scene") {
    return buildSceneExtractionPrompt();
  }
  return buildPromptExtractionPrompt();
}

function maxTokensForAnalysisMode(mode) {
  if (mode === "style") {
    return 1800;
  }
  if (mode === "scene") {
    return 1300;
  }
  if (mode === "keywords") {
    return 1000;
  }
  return 1400;
}

function buildPromptExtractionPrompt() {
  return [
    "Analyze this image and produce a reusable image-generation prompt.",
    "Write in Chinese, but keep useful art-direction keywords in English when they are clearer.",
    "Include subject, composition, camera/framing, lighting, color palette, material/texture, mood, background, and quality constraints.",
    "Also include a short negative prompt line for avoiding artifacts.",
    "Do not mention that you are analyzing an image.",
    "Format:",
    "提示词：...",
    "反向提示词：...",
  ].join("\n");
}

function buildKeywordExtractionPrompt() {
  return [
    "Analyze all provided reference images and extract reusable image-generation keywords.",
    "Write in Chinese, but keep precise English keywords when they are commonly used in image prompts.",
    "Return concise keyword groups, not a paragraph.",
    "Include common elements across the images and useful optional variations.",
    "Format:",
    "核心关键词：...",
    "主体 / 场景：...",
    "风格关键词：...",
    "光影 / 色彩：...",
    "材质 / 细节：...",
    "构图 / 镜头：...",
    "反向关键词：...",
  ].join("\n");
}

function buildStyleExtractionPrompt() {
  return [
    "Compare all provided images and extract ONLY the shared visual style DNA as a reusable style package.",
    "Do not describe or copy the subject matter, character identity, clothing, pose, face, objects, scene, story, or specific composition from the images.",
    "Focus only on transferable visual language: medium, linework, rendering method, lighting behavior, color palette, texture/material treatment, edge quality, detail density, camera/space rhythm, and atmosphere.",
    "Write concise Chinese labels, but keep precise English art terms when useful.",
    "The style package must help a generator apply the look to a completely different subject.",
    "Format:",
    "风格名称：...",
    "风格 DNA：",
    "- 媒介 / 画法：...",
    "- 线条 / 边缘：...",
    "- 渲染 / 细节：...",
    "- 光影：...",
    "- 色彩：...",
    "- 材质 / 纹理：...",
    "- 构图节奏：...",
    "风格反向词：...",
    "不要继承：样图主体、人物外貌、服饰、姿势、场景、文字、logo、具体物体",
  ].join("\n");
}

function buildSceneExtractionPrompt() {
  return [
    "Analyze the provided reference image(s) and extract a reusable SCENE prompt package for manga/drama image generation.",
    "Focus on the environment only. Ignore character identity, faces, clothing, pose, body, expression, dialogue, text, logo, and watermark.",
    "Write in Chinese, but keep precise art-direction keywords in English when useful.",
    "The result should help recreate the same location consistently across future keyframes.",
    "Include stable spatial layout, season/weather/time, lighting direction, color palette, materials, props, camera-friendly anchors, and avoid terms.",
    "Format:",
    "场景名称：...",
    "场景提示词：...",
    "空间结构：...",
    "光线 / 时间 / 天气：...",
    "色彩 / 材质：...",
    "关键道具 / 固定锚点：...",
    "常用镜头：...",
    "场景反向词：...",
  ].join("\n");
}

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

function extractTextFromModelResponse(responseBody) {
  if (typeof responseBody?.output_text === "string") {
    return responseBody.output_text;
  }

  const chunks = [];
  function walk(node) {
    if (!node) {
      return;
    }
    if (typeof node === "string") {
      chunks.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== "object") {
      return;
    }
    if (typeof node.text === "string") {
      chunks.push(node.text);
    }
    if (typeof node.output_text === "string") {
      chunks.push(node.output_text);
    }
    if (node.message) {
      walk(node.message);
    }
    if (node.content) {
      walk(node.content);
    }
    if (node.choices) {
      walk(node.choices);
    }
    if (node.output) {
      walk(node.output);
    }
  }

  walk(responseBody?.choices || responseBody?.output || responseBody);
  return chunks.join("\n").trim();
}

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

function normalizeAnalysisMode(value) {
  const mode = String(value || "prompt").trim().toLowerCase();
  if (!["prompt", "style", "keywords", "scene"].includes(mode)) {
    throw httpError(400, "Unsupported analysis mode.");
  }
  return mode;
}

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
  const existing = getActiveAuxiliaryProfile(settings);
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
  normalizeEndpointMode(endpointMode);
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

function serveFile(res, baseDir, relativePath) {
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
    "Cache-Control": "no-store",
  });
  fs.createReadStream(filePath).pipe(res);
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
