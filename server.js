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
const ENV_OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ENV_OPENAI_BASE_URL = stripTrailingSlash(process.env.OPENAI_BASE_URL || "https://api.openai.com");
const ENV_OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const ENV_OPENAI_IMAGE_ENDPOINT_MODE = ["images", "chat"].includes(String(process.env.OPENAI_IMAGE_ENDPOINT_MODE || "").toLowerCase())
  ? String(process.env.OPENAI_IMAGE_ENDPOINT_MODE).toLowerCase()
  : "images";
const OPENAI_IMAGE_TIMEOUT_MS = clampInteger(process.env.OPENAI_IMAGE_TIMEOUT_MS, 60000, 1200000, 600000);
const MAX_JSON_BODY_BYTES = clampInteger(process.env.MAX_JSON_BODY_BYTES, 1024 * 1024, 100 * 1024 * 1024, 50 * 1024 * 1024);
const errorLogPath = path.join(dataDir, "server.err.log");

const ALLOWED_MODELS = new Set([
  "gpt-image-2",
  "gpt-image-1.5",
  "gpt-image-1",
]);
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
const ALLOWED_ENDPOINT_MODES = new Set(["images", "chat"]);

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

    if (req.method === "GET" && requestUrl.pathname === "/api/settings") {
      return sendJson(res, 200, sanitizeSettings(loadSettings()));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/settings") {
      const body = await readJson(req);
      const settings = saveSettings(body);
      return sendJson(res, 200, sanitizeSettings(settings));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/test-connection") {
      const body = await readJson(req);
      const result = await testConnection(body);
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

    if (req.method === "POST" && requestUrl.pathname === "/api/analyze-image") {
      const body = await readJson(req);
      const result = await analyzeImages(body);
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
    console.log(`妖荼 running at http://localhost:${actualPort}`);
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
};

async function generateImages(input) {
  const apiConfig = getActiveApiConfig();

  if (!apiConfig.apiKey) {
    throw httpError(401, "OPENAI_API_KEY is missing. Add it to .env or your shell, then restart the server.");
  }

  const prompt = normalizePrompt(input.prompt);
  const negativePrompt = normalizeOptionalText(input.negativePrompt, 8000);
  const model = normalizeChoice(input.model, apiConfig.imageModel, ALLOWED_MODELS, "model");
  const size = normalizeSize(input.size, model);
  const quality = normalizeChoice(input.quality, "auto", ALLOWED_QUALITIES, "quality");
  const outputFormat = normalizeChoice(input.outputFormat, "png", ALLOWED_FORMATS, "output format");
  const background = normalizeChoice(input.background, "auto", ALLOWED_BACKGROUNDS, "background");
  const count = clampInteger(input.count, 1, 4, 1);
  const compression = clampInteger(input.outputCompression, 0, 100, 85);

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
    const message = responseBody.error?.message || responseBody.message || responseBody.raw || `OpenAI API returned ${apiResponse.status}`;
    throw httpError(apiResponse.status, message);
  }

  return responseBody;
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
  return {
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
}

function makePublicParams(requestDetails = {}) {
  const request = makePublicRequest(requestDetails);
  return {
    endpointMode: request.endpointMode,
    model: request.model,
    size: request.size,
    quality: request.quality,
    format: request.output_format,
    background: request.background,
    count: request.n,
    references: request.referenceImages.length,
  };
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
  return buildPromptExtractionPrompt();
}

function maxTokensForAnalysisMode(mode) {
  if (mode === "style") {
    return 1800;
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
  if (!["prompt", "style", "keywords"].includes(mode)) {
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

    return {
      activeProfileId,
      profiles,
      auxiliary: normalizeAuxiliarySettings(parsed.auxiliary || fallback.auxiliary),
      savedPrompts: normalizeSavedItems(parsed.savedPrompts),
      savedStyles: normalizeSavedItems(parsed.savedStyles),
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
    settings.auxiliary = normalizeAuxiliarySettings({
      ...settings.auxiliary,
      ...input.auxiliary,
      apiKey: String(input.auxiliary.apiKey || "").trim() || settings.auxiliary?.apiKey || "",
    });
  } else if (!settings.auxiliary) {
    settings.auxiliary = createDefaultAuxiliarySettings();
  }

  writeSettings(settings);
  return settings;
}

function saveAuxiliarySettings(input) {
  const settings = loadSettings();
  const existing = normalizeAuxiliarySettings(settings.auxiliary || createDefaultAuxiliarySettings());
  settings.auxiliary = normalizeAuxiliarySettings({
    ...existing,
    ...input,
    apiKey: String(input.apiKey || "").trim() || existing.apiKey || "",
  });
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
  const auxiliary = normalizeAuxiliarySettings(settings.auxiliary || createDefaultAuxiliarySettings());

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
  const existing = normalizeAuxiliarySettings(settings.auxiliary || createDefaultAuxiliarySettings());
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
    auxiliary: createDefaultAuxiliarySettings(),
    savedPrompts: [],
    savedStyles: [],
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

function sanitizeSettings(settings) {
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
    auxiliary: sanitizeAuxiliarySettings(settings.auxiliary || createDefaultAuxiliarySettings()),
    savedPrompts: normalizeSavedItems(settings.savedPrompts),
    savedStyles: normalizeSavedItems(settings.savedStyles),
  };
}

function sanitizeAuxiliarySettings(auxiliary) {
  const normalized = normalizeAuxiliarySettings(auxiliary);
  return {
    useActiveProfile: normalized.useActiveProfile,
    baseUrl: normalized.baseUrl,
    model: normalized.model,
    hasApiKey: Boolean(normalized.apiKey),
    apiKeyMask: maskKey(normalized.apiKey),
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

  const imageModel = ALLOWED_MODELS.has(String(profile.imageModel || ""))
    ? String(profile.imageModel)
    : ENV_OPENAI_IMAGE_MODEL;

  return {
    id: normalizeProfileId(profile.id || `profile-${Date.now()}`),
    name: String(profile.name || "API Profile").trim().slice(0, 80),
    apiKey: String(profile.apiKey || "").trim(),
    baseUrl: normalizeBaseUrl(profile.baseUrl || ENV_OPENAI_BASE_URL),
    imageModel,
    endpointMode: normalizeEndpointMode(profile.endpointMode || ENV_OPENAI_IMAGE_ENDPOINT_MODE),
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

function normalizeChoice(value, fallback, allowed, label) {
  const normalized = String(value || fallback).trim();
  if (!allowed.has(normalized)) {
    throw httpError(400, `Unsupported ${label}: ${normalized}`);
  }
  return normalized;
}

function normalizeSize(value, model) {
  const size = String(value || "1536x1024").trim().toLowerCase();

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
