const purposePresets = {
  free: {
    label: "自由创作",
    guidance: [],
    requirements: [],
  },
  software: {
    label: "软件背景",
    guidance: [
      "background art for a real software interface",
      "clear negative space for panels, cards, sidebars, and preview areas",
      "polished but not distracting, suitable behind application UI",
    ],
    requirements: [
      "Do not create fake UI screenshots.",
      "No readable text, numbers, logo, watermark, or signature.",
      "Keep foreground-safe empty space and controlled visual noise.",
    ],
  },
  portrait: {
    label: "人物写真",
    guidance: [
      "portrait-focused image with clear subject presence",
      "natural anatomy, expressive face, coherent lighting",
      "thoughtful background that supports the person without stealing attention",
    ],
    requirements: [
      "Avoid distorted hands, extra fingers, broken facial features, and duplicated limbs.",
      "No watermark, signature, or random text.",
    ],
  },
  character: {
    label: "角色设定",
    guidance: [
      "character concept art with readable silhouette",
      "clear costume language, personality cues, and material details",
      "full-body or three-quarter view when suitable",
    ],
    requirements: [
      "Avoid inconsistent costume details and unclear anatomy.",
      "No watermark, signature, or random text.",
    ],
  },
  desktop: {
    label: "桌面 / 工作台",
    guidance: [
      "desk or workstation scene with curated objects",
      "clean composition, believable scale, tactile materials",
      "organized surface with visual storytelling",
    ],
    requirements: [
      "Avoid clutter that hides the main subject.",
      "No random readable text, watermark, or brand logo.",
    ],
  },
  product: {
    label: "产品静物",
    guidance: [
      "product still life with commercial-quality presentation",
      "accurate material rendering, clean silhouette, controlled reflections",
      "studio-ready composition with premium lighting",
    ],
    requirements: [
      "Keep the product form coherent and inspectable.",
      "No fake brand text, watermark, or random labels.",
    ],
  },
  environment: {
    label: "场景 / 环境",
    guidance: [
      "environment art with strong sense of place",
      "clear foreground, midground, and background depth",
      "atmosphere, weather, light, and scale working together",
    ],
    requirements: [
      "Avoid messy perspective and unreadable focal points.",
      "No watermark, signature, or random text.",
    ],
  },
  architecture: {
    label: "建筑 / 室内",
    guidance: [
      "architecture or interior scene with believable structure",
      "clean perspective, functional layout, intentional materials",
      "lighting that reveals space and texture",
    ],
    requirements: [
      "Avoid impossible geometry and warped furniture.",
      "No watermark, signature, or random text.",
    ],
  },
  fashion: {
    label: "服装 / 潮流",
    guidance: [
      "fashion editorial image emphasizing styling, fabric, and silhouette",
      "intentional pose, outfit detail, and scene mood",
      "cohesive color palette and material contrast",
    ],
    requirements: [
      "Avoid distorted body proportions and broken garment structure.",
      "No watermark, signature, or fake brand marks.",
    ],
  },
  food: {
    label: "美食 / 饮品",
    guidance: [
      "food or drink photography with appetizing texture",
      "fresh ingredients, believable plating, controlled highlights",
      "clean composition for menu, poster, or social media use",
    ],
    requirements: [
      "Avoid plastic-looking food and messy plating.",
      "No watermark, signature, or random text.",
    ],
  },
  icon: {
    label: "图标 / 素材",
    guidance: [
      "single clean asset with centered composition",
      "clear silhouette, simple background, easy extraction",
      "consistent shape language and readable details at small size",
    ],
    requirements: [
      "No text, watermark, signature, or complex background.",
      "Keep edges clean and object identity obvious.",
    ],
  },
  poster: {
    label: "海报 / 封面",
    guidance: [
      "poster or cover artwork with strong central concept",
      "dramatic composition, clear hierarchy, bold mood",
      "leave optional clean space for real typography if needed",
    ],
    requirements: [
      "Do not invent unreadable typography.",
      "No watermark, signature, or random logo.",
    ],
  },
  wallpaper: {
    label: "壁纸",
    guidance: [
      "high-resolution wallpaper composition",
      "balanced focal point, pleasing negative space, durable visual rhythm",
      "works across desktop crop and mobile crop when possible",
    ],
    requirements: [
      "Avoid noisy detail across the whole frame.",
      "No watermark, signature, or random text.",
    ],
  },
  gameAsset: {
    label: "游戏资产",
    guidance: [
      "game-ready visual asset or concept with readable form",
      "clear material, silhouette, and function",
      "consistent art direction suitable for a production pipeline",
    ],
    requirements: [
      "Avoid ambiguous shapes and inconsistent perspective.",
      "No watermark, signature, or random text.",
    ],
  },
};

const builtInStylePresets = {
  none: {
    label: "不套风格",
    guidance: [],
  },
  photoreal: {
    label: "写实摄影",
    guidance: ["photorealistic camera capture", "natural lens behavior", "realistic color and lighting"],
  },
  cinematic: {
    label: "电影感",
    guidance: ["cinematic lighting", "dramatic composition", "film color grading and atmospheric depth"],
  },
  editorial: {
    label: "杂志大片",
    guidance: ["editorial art direction", "premium composition", "fashion-magazine level lighting"],
  },
  studio: {
    label: "棚拍质感",
    guidance: ["controlled studio lighting", "clean backdrop", "precise highlights and shadows"],
  },
  documentary: {
    label: "纪实摄影",
    guidance: ["documentary realism", "available-light feeling", "authentic candid details"],
  },
  macro: {
    label: "微距细节",
    guidance: ["macro photography details", "shallow depth of field", "tactile close-up texture"],
  },
  anime: {
    label: "日系动画",
    guidance: ["anime-inspired illustration", "clean linework", "expressive color and cinematic framing"],
  },
  manga: {
    label: "漫画线稿",
    guidance: ["manga-style line art", "inked contours", "screen-tone inspired contrast"],
  },
  conceptArt: {
    label: "概念设计",
    guidance: ["concept art workflow", "strong silhouette", "production design detail"],
  },
  digitalPainting: {
    label: "数字绘画",
    guidance: ["digital painting", "painterly brushwork", "rich color transitions"],
  },
  watercolor: {
    label: "水彩",
    guidance: ["watercolor wash", "soft pigment edges", "paper texture"],
  },
  oilPainting: {
    label: "油画",
    guidance: ["oil painting texture", "visible brush strokes", "classical color depth"],
  },
  gouache: {
    label: "水粉",
    guidance: ["gouache painting", "matte pigment blocks", "soft handmade texture"],
  },
  ink: {
    label: "水墨 / 墨线",
    guidance: ["ink wash and expressive linework", "controlled empty space", "elegant monochrome contrast"],
  },
  chineseFantasy: {
    label: "东方奇幻",
    guidance: ["eastern fantasy atmosphere", "mythic elegance", "mist, silk, jade, lacquer, and subtle ornament"],
  },
  darkFantasy: {
    label: "暗黑奇幻",
    guidance: ["dark fantasy mood", "ancient mystery", "dramatic shadows and ornate detail"],
  },
  surreal: {
    label: "超现实",
    guidance: ["surreal visual logic", "dreamlike juxtaposition", "uncanny but coherent composition"],
  },
  cyberpunk: {
    label: "赛博朋克",
    guidance: ["cyberpunk atmosphere", "neon signage glow without readable text", "rainy reflections and high-tech grit"],
  },
  neonNoir: {
    label: "霓虹黑色",
    guidance: ["neon noir lighting", "moody shadows", "high contrast colored rim light"],
  },
  vaporwave: {
    label: "蒸汽波",
    guidance: ["vaporwave color mood", "retro-futurist shapes", "soft gradients and nostalgic digital surrealism"],
  },
  retro: {
    label: "复古胶片",
    guidance: ["retro film look", "gentle grain", "nostalgic color palette"],
  },
  y2k: {
    label: "Y2K",
    guidance: ["Y2K glossy design language", "chrome, translucent plastic, playful futuristic details"],
  },
  minimal: {
    label: "极简",
    guidance: ["minimal composition", "restrained palette", "clean geometry and deliberate negative space"],
  },
  brutalist: {
    label: "粗野主义",
    guidance: ["brutalist visual language", "raw structure", "bold massing and utilitarian forms"],
  },
  "3d": {
    label: "3D 渲染",
    guidance: ["high-end 3D render", "physically based materials", "global illumination and clean geometry"],
  },
  clay: {
    label: "黏土 / 泥塑",
    guidance: ["clay render", "soft sculpted forms", "matte handmade texture"],
  },
  isometric: {
    label: "等距视角",
    guidance: ["isometric perspective", "organized miniature world", "clear readable objects"],
  },
  lowPoly: {
    label: "低多边形",
    guidance: ["low-poly geometry", "faceted surfaces", "stylized simplified forms"],
  },
  pixel: {
    label: "像素艺术",
    guidance: ["pixel art style", "crisp blocky forms", "limited palette discipline"],
  },
  vector: {
    label: "矢量插画",
    guidance: ["vector illustration", "flat clean shapes", "consistent stroke and fill language"],
  },
  lineArt: {
    label: "线稿",
    guidance: ["clean line art", "precise contours", "minimal shading"],
  },
  blueprint: {
    label: "蓝图",
    guidance: ["blueprint design aesthetic", "technical drawing clarity", "grid and annotation-like structure without readable text"],
  },
  paperCut: {
    label: "剪纸层叠",
    guidance: ["paper-cut layered illustration", "stacked depth", "soft crafted shadows"],
  },
};

const GPT_IMAGE_2_MAX_PIXELS = 8294400;
const GPT_IMAGE_2_MAX_SIDE = 3840;
const LEGACY_SIZES = new Set(["auto", "1024x1024", "1024x1536", "1536x1024"]);
const postProcessSizePresets = [
  { value: "same", label: "原尺寸" },
  { value: "2x", label: "2x 同比例" },
  { value: "2880x2880", label: "1:1 2880x2880" },
  { value: "3072x2304", label: "4:3 3072x2304" },
  { value: "2304x3072", label: "3:4 2304x3072" },
  { value: "3840x2160", label: "16:9 4K" },
  { value: "2160x3840", label: "9:16 4K" },
  { value: "3584x2240", label: "16:10 近 4K" },
  { value: "2240x3584", label: "10:16 近 4K" },
];

const form = document.querySelector("#generatorForm");
const promptInput = document.querySelector("#prompt");
const negativePromptInput = document.querySelector("#negativePrompt");
const finalPrompt = document.querySelector("#finalPrompt");
const purposePreset = document.querySelector("#purposePreset");
const stylePresetGrid = document.querySelector("#stylePresetGrid");
const statusPill = document.querySelector("#statusPill");
const message = document.querySelector("#message");
const gallery = document.querySelector("#gallery");
const generateButton = document.querySelector("#generateButton");
const refreshButton = document.querySelector("#refreshButton");
const selectPageImages = document.querySelector("#selectPageImages");
const deleteSelectedButton = document.querySelector("#deleteSelectedButton");
const galleryPageSize = document.querySelector("#galleryPageSize");
const previousPageButton = document.querySelector("#previousPageButton");
const nextPageButton = document.querySelector("#nextPageButton");
const pageInfo = document.querySelector("#pageInfo");
const compressionInput = document.querySelector("#outputCompression");
const compressionValue = document.querySelector("#compressionValue");
const modelSelect = document.querySelector("#model");
const sizeSelect = document.querySelector("#size");
const customSize = document.querySelector("#customSize");
const customWidth = document.querySelector("#customWidth");
const customHeight = document.querySelector("#customHeight");
const sizeHint = document.querySelector("#sizeHint");
const profileSelect = document.querySelector("#profileSelect");
const newProfileButton = document.querySelector("#newProfileButton");
const saveApiButton = document.querySelector("#saveApiButton");
const testApiButton = document.querySelector("#testApiButton");
const apiProfileName = document.querySelector("#apiProfileName");
const apiImageModel = document.querySelector("#apiImageModel");
const apiEndpointMode = document.querySelector("#apiEndpointMode");
const apiBaseUrl = document.querySelector("#apiBaseUrl");
const apiKey = document.querySelector("#apiKey");
const apiMessage = document.querySelector("#apiMessage");
const auxUseActiveProfile = document.querySelector("#auxUseActiveProfile");
const auxModel = document.querySelector("#auxModel");
const auxModelSelect = document.querySelector("#auxModelSelect");
const auxBaseUrl = document.querySelector("#auxBaseUrl");
const auxApiKey = document.querySelector("#auxApiKey");
const loadAuxModelsButton = document.querySelector("#loadAuxModelsButton");
const testAuxButton = document.querySelector("#testAuxButton");
const saveAuxButton = document.querySelector("#saveAuxButton");
const referenceInput = document.querySelector("#referenceInput");
const clearReferencesButton = document.querySelector("#clearReferencesButton");
const referenceGrid = document.querySelector("#referenceGrid");
const analysisImageInput = document.querySelector("#analysisImageInput");
const clearAnalysisImagesButton = document.querySelector("#clearAnalysisImagesButton");
const extractKeywordsButton = document.querySelector("#extractKeywordsButton");
const extractUploadedStyleButton = document.querySelector("#extractUploadedStyleButton");
const extractUploadedPromptButton = document.querySelector("#extractUploadedPromptButton");
const analysisUploadGrid = document.querySelector("#analysisUploadGrid");
const analysisPanel = document.querySelector("#analysisPanel");
const analysisTitle = document.querySelector("#analysisTitle");
const analysisName = document.querySelector("#analysisName");
const analysisStyleStrength = document.querySelector("#analysisStyleStrength");
const analysisResult = document.querySelector("#analysisResult");
const copyAnalysisButton = document.querySelector("#copyAnalysisButton");
const useAnalysisButton = document.querySelector("#useAnalysisButton");
const saveAnalysisPromptButton = document.querySelector("#saveAnalysisPromptButton");
const saveAnalysisStyleButton = document.querySelector("#saveAnalysisStyleButton");
const clearAnalysisButton = document.querySelector("#clearAnalysisButton");
const savedPromptCount = document.querySelector("#savedPromptCount");
const savedPromptList = document.querySelector("#savedPromptList");
const previewModal = document.querySelector("#previewModal");
const previewImage = document.querySelector("#previewImage");
const previewCaption = document.querySelector("#previewCaption");
const previewClose = document.querySelector("#previewClose");
const previewPrevious = document.querySelector("#previewPrevious");
const previewNext = document.querySelector("#previewNext");

let activePurpose = "software";
let activeStyle = "none";
let apiSettings = { activeProfileId: "", profiles: [] };
let referenceImages = [];
let analysisImages = [];
let galleryImages = [];
let selectedImageIds = new Set();
let galleryPage = 1;
let galleryPageSizeValue = 12;
let galleryTotal = 0;
let galleryTotalPages = 1;
let previewIndex = 0;
let latestAnalysis = null;
let isAnalysisBusy = false;

promptInput.value = "面向 AI 图片管理软件的主题背景，现代、克制、有一点东方志怪感但不做古风插画，画面有层次但不抢内容，中心和右侧留出干净空间，适合承载侧边栏、卡片和预览区域。";
renderStylePresets();
purposePreset.addEventListener("change", () => {
  activePurpose = purposePreset.value;
  updatePromptPreview();
});

form.addEventListener("input", () => {
  updatePromptPreview();
  updateSizeUi();
});

form.addEventListener("submit", submitGeneration);
sizeSelect.addEventListener("change", updateSizeUi);
modelSelect.addEventListener("change", updateSizeUi);
compressionInput.addEventListener("input", () => {
  compressionValue.textContent = compressionInput.value;
});
refreshButton.addEventListener("click", () => {
  galleryPage = 1;
  loadImages();
});
galleryPageSize.addEventListener("change", () => {
  galleryPageSizeValue = Number(galleryPageSize.value) || 12;
  galleryPage = 1;
  loadImages();
});
previousPageButton.addEventListener("click", () => {
  if (galleryPage > 1) {
    galleryPage -= 1;
    loadImages();
  }
});
nextPageButton.addEventListener("click", () => {
  if (galleryPage < galleryTotalPages) {
    galleryPage += 1;
    loadImages();
  }
});
selectPageImages.addEventListener("change", () => {
  setCurrentPageSelection(selectPageImages.checked);
});
deleteSelectedButton.addEventListener("click", deleteSelectedImages);
referenceInput.addEventListener("change", handleReferenceFiles);
clearReferencesButton.addEventListener("click", clearReferenceImages);
analysisImageInput.addEventListener("change", handleAnalysisImageFiles);
clearAnalysisImagesButton.addEventListener("click", clearAnalysisImages);
extractKeywordsButton.addEventListener("click", extractKeywordsFromUploads);
extractUploadedStyleButton.addEventListener("click", extractStyleFromUploads);
extractUploadedPromptButton.addEventListener("click", extractPromptFromUploads);
newProfileButton.addEventListener("click", createNewProfileDraft);
saveApiButton.addEventListener("click", saveApiSettings);
testApiButton.addEventListener("click", testApiConnection);
loadAuxModelsButton.addEventListener("click", loadAuxiliaryModels);
testAuxButton.addEventListener("click", testAuxiliaryConnection);
saveAuxButton.addEventListener("click", saveAuxiliarySettings);
profileSelect.addEventListener("change", activateSelectedProfile);
auxUseActiveProfile.addEventListener("change", updateAuxiliaryUi);
auxModelSelect.addEventListener("change", () => {
  if (auxModelSelect.value) {
    auxModel.value = auxModelSelect.value;
  }
});
auxModel.addEventListener("input", syncAuxiliaryModelSelect);
copyAnalysisButton.addEventListener("click", copyAnalysisResult);
useAnalysisButton.addEventListener("click", useAnalysisResult);
saveAnalysisPromptButton.addEventListener("click", saveAnalysisPrompt);
saveAnalysisStyleButton.addEventListener("click", saveAnalysisStyle);
clearAnalysisButton.addEventListener("click", clearAnalysisResult);
analysisResult.addEventListener("input", () => {
  if (latestAnalysis) {
    latestAnalysis.text = analysisResult.value;
  }
});
analysisName.addEventListener("input", () => {
  if (latestAnalysis) {
    latestAnalysis.name = analysisName.value;
  }
});
previewClose.addEventListener("click", closePreview);
previewPrevious.addEventListener("click", () => stepPreview(-1));
previewNext.addEventListener("click", () => stepPreview(1));
previewModal.addEventListener("click", (event) => {
  if (event.target === previewModal) {
    closePreview();
  }
});
window.addEventListener("keydown", handlePreviewKeydown);

initialize();

function renderStylePresets() {
  stylePresetGrid.innerHTML = "";
  Object.entries(getAllStylePresets()).forEach(([key, preset]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `preset${key === activeStyle ? " active" : ""}${preset.saved ? " saved-preset" : ""}`;
    button.dataset.style = key;
    button.textContent = preset.label;
    button.addEventListener("click", () => {
      activeStyle = key;
      document.querySelectorAll(".preset").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      updatePromptPreview();
    });
    if (preset.saved) {
      const wrapper = document.createElement("div");
      wrapper.className = "preset-wrap";
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "preset-remove";
      removeButton.textContent = "删";
      removeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteSavedStyle(preset.id);
      });
      wrapper.append(button, removeButton);
      stylePresetGrid.append(wrapper);
    } else {
      stylePresetGrid.append(button);
    }
  });
}

function getAllStylePresets() {
  const saved = {};
  (apiSettings.savedStyles || []).forEach((item) => {
    const styleText = getSavedStyleText(item);
    saved[`saved:${item.id}`] = {
      id: item.id,
      label: item.name,
      guidance: buildSavedStyleGuidance(item, styleText),
      references: Array.isArray(item.referenceImages) ? item.referenceImages : [],
      strength: item.strength || "medium",
      saved: true,
    };
  });
  return {
    ...builtInStylePresets,
    ...saved,
  };
}

function getSavedStyleText(item) {
  return String(item.styleText || extractStylePromptText(item.text) || item.text || "").trim();
}

function buildSavedStyleGuidance(item, styleText) {
  const strength = item.strength || "medium";
  const lines = [
    "Apply the following visual style DNA to the user's subject only.",
    "Do not copy the original reference subject, face, clothing, pose, scene, story, text, logo, or specific objects.",
  ];

  if (strength !== "low") {
    lines.push("Preserve the user's subject and composition priority; use the style as visual language, not content.");
  }

  lines.push(`Style DNA:\n${styleText}`);

  if (item.negativeText) {
    lines.push(`Style negatives / avoid:\n${item.negativeText}`);
  }

  if (strength === "high") {
    lines.push("Use any attached style reference images for style only; ignore their subject matter.");
  }

  return lines;
}

async function initialize() {
  updatePromptPreview();
  updateSizeUi();
  await loadApiSettings();
  await loadConfig();
  await loadImages();
  renderReferenceImages();
  renderAnalysisImages();
}

async function loadConfig() {
  try {
    const config = await fetchJson("/api/config", {}, 5000);
    if (config.defaultModel) {
      modelSelect.value = config.defaultModel;
    }
    statusPill.textContent = config.hasApiKey ? "API Key 已配置" : "缺少 API Key";
    statusPill.classList.toggle("ready", config.hasApiKey);
    statusPill.classList.toggle("missing", !config.hasApiKey);
    updateSizeUi();
  } catch {
    statusPill.textContent = "服务未连接";
    statusPill.classList.add("missing");
  }
}

async function loadApiSettings() {
  try {
    apiSettings = await fetchJson("/api/settings", {}, 8000);
    if (!Array.isArray(apiSettings.profiles)) {
      throw new Error("本地服务返回的 API 配置格式不正确。");
    }
    renderProfiles();
    fillAuxiliaryForm(apiSettings.auxiliary);
    renderStylePresets();
    renderSavedPrompts();
    showApiMessage("配置已加载。", false);
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "读取 API 配置失败。"), true);
  }
}

function renderProfiles() {
  profileSelect.innerHTML = "";
  apiSettings.profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name || profile.id;
    profileSelect.append(option);
  });

  profileSelect.value = apiSettings.activeProfileId || apiSettings.profiles[0]?.id || "";
  fillApiForm(getSelectedProfile());
}

function fillApiForm(profile) {
  if (!profile) {
    apiProfileName.value = "默认配置";
    apiBaseUrl.value = "https://api.openai.com";
    apiImageModel.value = "gpt-image-2";
    apiEndpointMode.value = "images";
    apiKey.value = "";
    apiKey.placeholder = "粘贴 API Key";
    return;
  }

  apiProfileName.value = profile.name || "";
  apiBaseUrl.value = profile.baseUrl || "";
  apiImageModel.value = profile.imageModel || "gpt-image-2";
  apiEndpointMode.value = profile.endpointMode || "images";
  apiKey.value = "";
  apiKey.placeholder = profile.hasApiKey ? `已保存 ${profile.apiKeyMask}，留空则保留` : "粘贴 API Key";
  modelSelect.value = profile.imageModel || "gpt-image-2";
  updateSizeUi();
}

function fillAuxiliaryForm(auxiliary = {}) {
  auxUseActiveProfile.checked = auxiliary.useActiveProfile !== false;
  auxModel.value = auxiliary.model || "gpt-4o-mini";
  syncAuxiliaryModelSelect();
  auxBaseUrl.value = auxiliary.baseUrl || "";
  auxApiKey.value = "";
  auxApiKey.placeholder = auxiliary.hasApiKey ? `已保存 ${auxiliary.apiKeyMask}，留空则保留` : "粘贴辅助 API Key";
  updateAuxiliaryUi();
}

function renderAuxiliaryModelOptions(models = []) {
  auxModelSelect.innerHTML = "";
  const manualOption = document.createElement("option");
  manualOption.value = "";
  manualOption.textContent = models.length > 0 ? "手动输入 / 不使用列表" : "先拉取模型";
  auxModelSelect.append(manualOption);

  models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    auxModelSelect.append(option);
  });
  auxModelSelect.disabled = models.length === 0;
  syncAuxiliaryModelSelect();
}

function syncAuxiliaryModelSelect() {
  const current = auxModel.value.trim();
  const values = Array.from(auxModelSelect.options).map((option) => option.value);
  auxModelSelect.value = values.includes(current) ? current : "";
}

function updateAuxiliaryUi() {
  const isReusing = auxUseActiveProfile.checked;
  auxBaseUrl.disabled = isReusing;
  auxApiKey.disabled = isReusing;
  auxBaseUrl.placeholder = isReusing ? "正在复用当前生图 API" : "https://api.openai.com 或你的视觉模型中转";
  auxApiKey.placeholder = isReusing ? "正在复用当前生图 API Key" : (apiSettings.auxiliary?.hasApiKey ? `已保存 ${apiSettings.auxiliary.apiKeyMask}，留空则保留` : "粘贴辅助 API Key");
}

function renderSavedPrompts() {
  const prompts = apiSettings.savedPrompts || [];
  savedPromptList.innerHTML = "";
  savedPromptCount.textContent = String(prompts.length);

  if (prompts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "saved-empty";
    empty.textContent = "还没有保存提示词。";
    savedPromptList.append(empty);
    return;
  }

  prompts.forEach((item) => {
    const card = document.createElement("article");
    card.className = "saved-card";

    const title = document.createElement("strong");
    title.textContent = item.name || "未命名提示词";

    const preview = document.createElement("p");
    preview.textContent = item.text || "";

    const actions = document.createElement("div");
    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.textContent = "使用";
    useButton.addEventListener("click", () => useSavedPrompt(item, false));

    const appendButton = document.createElement("button");
    appendButton.type = "button";
    appendButton.textContent = "追加";
    appendButton.addEventListener("click", () => useSavedPrompt(item, true));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-action";
    deleteButton.textContent = "删除";
    deleteButton.addEventListener("click", () => deleteSavedPrompt(item.id));

    actions.append(useButton, appendButton, deleteButton);
    card.append(title, preview, actions);
    savedPromptList.append(card);
  });
}

function getSelectedProfile() {
  return apiSettings.profiles.find((profile) => profile.id === profileSelect.value) || apiSettings.profiles[0];
}

function createNewProfileDraft() {
  const id = `profile-${Date.now()}`;
  const option = document.createElement("option");
  option.value = id;
  option.textContent = "新配置";
  profileSelect.append(option);
  profileSelect.value = id;
  apiProfileName.value = "新配置";
  apiBaseUrl.value = "https://api.openai.com";
  apiImageModel.value = "gpt-image-2";
  apiEndpointMode.value = "images";
  apiKey.value = "";
  apiKey.placeholder = "粘贴 API Key";
  showApiMessage("填写后保存并启用。Kirby 这类中转如果 Images API 不通，可以把“生图接口”切到聊天兼容。", false);
}

async function activateSelectedProfile() {
  const profile = getSelectedProfile();
  fillApiForm(profile);
  if (!profile) {
    return;
  }

  try {
    apiSettings = await fetchJson("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: profile.id,
        name: profile.name,
        baseUrl: profile.baseUrl,
        imageModel: profile.imageModel,
        endpointMode: profile.endpointMode,
        setActive: true,
      }),
    });
    showApiMessage(`已启用：${profile.name}`, false);
    await loadConfig();
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "启用配置失败。"), true);
  }
}

async function saveApiSettings() {
  const payload = collectApiSettingsPayload();
  if (!payload.baseUrl) {
    showApiMessage("Base URL 不能为空。", true);
    return;
  }

  try {
    saveApiButton.disabled = true;
    apiSettings = await fetchJson("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    renderProfiles();
    fillAuxiliaryForm(apiSettings.auxiliary);
    await loadConfig();
    showApiMessage("已保存并启用。", false);
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "保存 API 配置失败。"), true);
  } finally {
    saveApiButton.disabled = false;
  }
}

async function testApiConnection() {
  const payload = collectApiSettingsPayload();
  try {
    testApiButton.disabled = true;
    showApiMessage("正在测试连接。", false);
    const result = await fetchJson("/api/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, 30000);

    if (result.ok) {
      showApiMessage(`连接成功。\nEndpoint: ${result.endpoint}`, false);
    } else {
      showApiMessage(`连接失败：${result.error || "未知错误"}\nEndpoint: ${result.endpoint || payload.baseUrl}`, true);
    }
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "测试连接失败。"), true);
  } finally {
    testApiButton.disabled = false;
  }
}

async function testAuxiliaryConnection() {
  try {
    testAuxButton.disabled = true;
    showApiMessage("正在测试辅助 API。", false);
    const result = await fetchJson("/api/test-auxiliary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectAuxiliaryPayload()),
    }, 30000);

    if (result.ok) {
      showApiMessage(`辅助 API 可用：${result.model}\nEndpoint: ${result.endpoint}`, false);
    } else {
      showApiMessage(`辅助 API 连接失败：${result.error || "未知错误"}\nEndpoint: ${result.endpoint || ""}`, true);
    }
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "测试辅助 API 失败。"), true);
  } finally {
    testAuxButton.disabled = false;
  }
}

async function loadAuxiliaryModels() {
  try {
    loadAuxModelsButton.disabled = true;
    showApiMessage("正在拉取辅助 API 模型列表。", false);
    const result = await fetchJson("/api/auxiliary-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectAuxiliaryPayload()),
    }, 40000);

    if (!result.ok) {
      showApiMessage(`拉取模型失败：${result.error || "未知错误"}\nEndpoint: ${result.endpoint || ""}`, true);
      return;
    }

    renderAuxiliaryModelOptions(result.models || []);
    if (!auxModel.value.trim() && result.models?.length) {
      auxModel.value = result.models[0];
      syncAuxiliaryModelSelect();
    }
    showApiMessage(`已拉取 ${result.modelCount || 0} 个模型。可在“已拉取模型”下拉框选择。\nEndpoint: ${result.endpoint}`, false);
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "拉取辅助模型失败。"), true);
  } finally {
    loadAuxModelsButton.disabled = false;
  }
}

async function saveAuxiliarySettings() {
  try {
    saveAuxButton.disabled = true;
    apiSettings = await fetchJson("/api/auxiliary-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectAuxiliaryPayload()),
    });
    fillAuxiliaryForm(apiSettings.auxiliary);
    showApiMessage(`辅助 API 已保存：${apiSettings.auxiliary?.model || auxModel.value}`, false);
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "保存辅助 API 失败。"), true);
  } finally {
    saveAuxButton.disabled = false;
  }
}

function collectApiSettingsPayload() {
  return {
    profileId: profileSelect.value || `profile-${Date.now()}`,
    name: apiProfileName.value.trim() || "API Profile",
    baseUrl: apiBaseUrl.value.trim(),
    apiKey: apiKey.value.trim(),
    imageModel: apiImageModel.value,
    endpointMode: apiEndpointMode.value,
    setActive: true,
    auxiliary: collectAuxiliaryPayload(),
  };
}

function collectAuxiliaryPayload() {
  return {
    useActiveProfile: auxUseActiveProfile.checked,
    baseUrl: auxBaseUrl.value.trim(),
    apiKey: auxApiKey.value.trim(),
    model: auxModel.value.trim() || "gpt-4o-mini",
  };
}

async function handleReferenceFiles(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) {
    return;
  }

  try {
    const loaded = await Promise.all(files.map(readFileAsDataUrl));
    referenceImages = [
      ...referenceImages,
      ...loaded.map((item) => ({
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: item.name,
        dataUrl: item.dataUrl,
        thumb: item.dataUrl,
        source: "upload",
      })),
    ].slice(0, 16);
    renderReferenceImages();
    showMessage(`已添加 ${loaded.length} 张参考图。`, false);
  } catch (error) {
    showMessage(error.message || "读取参考图失败。", true);
  } finally {
    referenceInput.value = "";
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error(`${file.name} 不是图片文件。`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result || "") });
    reader.onerror = () => reject(new Error(`读取 ${file.name} 失败。`));
    reader.readAsDataURL(file);
  });
}

function addGeneratedReference(image) {
  if (!image?.url) {
    showMessage("这张图没有可用的本地地址，不能设为参考图。", true);
    return;
  }

  referenceImages = [
    ...referenceImages,
    {
      id: `generated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: image.id || "Generated image",
      url: image.url,
      thumb: image.url,
      source: "generated",
    },
  ].slice(0, 16);
  renderReferenceImages();
  showMessage("已设为参考图。", false);
}

async function handleAnalysisImageFiles(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) {
    return;
  }

  try {
    const loaded = await Promise.all(files.map(readFileAsDataUrl));
    analysisImages = [
      ...analysisImages,
      ...loaded.map((item) => ({
        id: `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: item.name,
        dataUrl: item.dataUrl,
        thumb: item.dataUrl,
        source: "analysis-upload",
      })),
    ].slice(0, 8);
    renderAnalysisImages();
    showMessage(`已添加 ${loaded.length} 张样图。`, false);
  } catch (error) {
    showMessage(error.message || "读取样图失败。", true);
  } finally {
    analysisImageInput.value = "";
  }
}

function clearAnalysisImages() {
  analysisImages = [];
  renderAnalysisImages();
  showMessage("样图已清空。", false);
}

function removeAnalysisImage(id) {
  analysisImages = analysisImages.filter((image) => image.id !== id);
  renderAnalysisImages();
}

function renderAnalysisImages() {
  analysisUploadGrid.innerHTML = "";
  if (analysisImages.length === 0) {
    const empty = document.createElement("div");
    empty.className = "size-hint";
    empty.textContent = "当前没有样图。";
    analysisUploadGrid.append(empty);
    updateAnalysisActions();
    return;
  }

  analysisImages.forEach((image) => {
    const card = document.createElement("article");
    card.className = "reference-card";

    const img = document.createElement("img");
    img.src = image.thumb || image.dataUrl;
    img.alt = image.name || "Sample image";

    const footer = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = image.name || "Sample image";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", "移除样图");
    removeButton.addEventListener("click", () => removeAnalysisImage(image.id));

    footer.append(name, removeButton);
    card.append(img, footer);
    analysisUploadGrid.append(card);
  });
  updateAnalysisActions();
}

function clearReferenceImages() {
  referenceImages = [];
  renderReferenceImages();
  showMessage("参考图已清空。", false);
}

function removeReferenceImage(id) {
  referenceImages = referenceImages.filter((image) => image.id !== id);
  renderReferenceImages();
}

function renderReferenceImages() {
  referenceGrid.innerHTML = "";
  if (referenceImages.length === 0) {
    const empty = document.createElement("div");
    empty.className = "size-hint";
    empty.textContent = "当前没有参考图。";
    referenceGrid.append(empty);
    return;
  }

  referenceImages.forEach((image) => {
    const card = document.createElement("article");
    card.className = "reference-card";

    const img = document.createElement("img");
    img.src = image.thumb || image.url || image.dataUrl;
    img.alt = image.name || "Reference image";

    const footer = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = image.name || "Reference";
    name.title = image.name || "";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "x";
    removeButton.title = "移除参考图";
    removeButton.addEventListener("click", () => removeReferenceImage(image.id));

    footer.append(name, removeButton);
    card.append(img, footer);
    referenceGrid.append(card);
  });
}

async function submitGeneration(event) {
  event.preventDefault();

  let payload;
  try {
    payload = collectPayload();
  } catch (error) {
    showMessage(error.message, true);
    return;
  }

  await runGeneration(payload, "正在生成，4K 或近 4K 图通常会更慢，耐心等它出片。");
}

async function runGeneration(payload, statusText) {
  setBusy(true);
  showMessage(statusText, false);

  try {
    const result = await fetchJson("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, 620000);
    galleryPage = 1;
    await loadImages();
    showMessage(`已生成 ${result.images.length} 张，批次 ${result.batchId}。`, false);
  } catch (error) {
    showMessage(normalizeFrontendError(error, "生成失败。"), true);
  } finally {
    setBusy(false);
  }
}

async function loadImages() {
  try {
    const params = new URLSearchParams({
      page: String(galleryPage),
      pageSize: String(galleryPageSizeValue),
    });
    const data = await fetchJson(`/api/images?${params}`, {}, 8000);
    gallery.innerHTML = "";
    galleryImages = data.images || [];
    galleryTotal = Number(data.total) || 0;
    galleryPage = Number(data.page) || 1;
    galleryPageSizeValue = Number(data.pageSize) || galleryPageSizeValue;
    galleryTotalPages = Number(data.totalPages) || 1;

    if (!galleryImages.length) {
      updateGalleryControls();
      showMessage("还没有生成记录。", false);
      return;
    }
    galleryImages.forEach((image) => renderImage(image, gallery));
    updateGalleryControls();
    showMessage(`已加载第 ${galleryPage} 页，共 ${galleryTotal} 张历史图片。`, false);
  } catch (error) {
    showMessage(normalizeFrontendError(error, "读取历史图片失败。"), true);
  }
}

function updateGalleryControls() {
  const currentPageIds = galleryImages.map((image) => image.id).filter(Boolean);
  const selectedOnPage = currentPageIds.filter((id) => selectedImageIds.has(id));

  galleryPageSize.value = String(galleryPageSizeValue);
  pageInfo.textContent = `${galleryPage} / ${galleryTotalPages} · 共 ${galleryTotal} 张`;
  previousPageButton.disabled = galleryPage <= 1;
  nextPageButton.disabled = galleryPage >= galleryTotalPages;
  deleteSelectedButton.disabled = selectedImageIds.size === 0;
  deleteSelectedButton.textContent = selectedImageIds.size > 0
    ? `删除所选 (${selectedImageIds.size})`
    : "删除所选";

  selectPageImages.checked = currentPageIds.length > 0 && selectedOnPage.length === currentPageIds.length;
  selectPageImages.indeterminate = selectedOnPage.length > 0 && selectedOnPage.length < currentPageIds.length;

  gallery.querySelectorAll(".thumb-select input").forEach((checkbox) => {
    checkbox.checked = selectedImageIds.has(checkbox.value);
  });
}

function setCurrentPageSelection(shouldSelect) {
  galleryImages.forEach((image) => {
    if (!image.id) {
      return;
    }
    if (shouldSelect) {
      selectedImageIds.add(image.id);
    } else {
      selectedImageIds.delete(image.id);
    }
  });
  updateGalleryControls();
}

async function deleteSelectedImages() {
  const ids = Array.from(selectedImageIds);
  if (!ids.length) {
    showMessage("还没有选择要删除的图片。", true);
    return;
  }
  if (!window.confirm(`确定删除 ${ids.length} 张已生成图片吗？这个操作只删除本地输出文件。`)) {
    return;
  }
  await deleteImagesByIds(ids);
}

async function deleteSingleImage(image) {
  if (!image?.id) {
    showMessage("这张图没有可删除的本地记录。", true);
    return;
  }
  if (!window.confirm("确定删除这张图片吗？")) {
    return;
  }
  await deleteImagesByIds([image.id]);
}

async function deleteImagesByIds(ids) {
  try {
    const result = await fetchJson("/api/images/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }, 12000);
    (result.deleted || []).forEach((id) => selectedImageIds.delete(id));
    if (previewModal.classList.contains("open") && ids.includes(galleryImages[previewIndex]?.id)) {
      closePreview();
    }
    await loadImages();
    const failedCount = (result.failed || []).length;
    const deletedCount = (result.deleted || []).length;
    showMessage(failedCount > 0
      ? `已删除 ${deletedCount} 张，${failedCount} 张删除失败。`
      : `已删除 ${deletedCount} 张图片。`, failedCount > 0);
  } catch (error) {
    showMessage(normalizeFrontendError(error, "删除图片失败。"), true);
  }
}

function collectPayload() {
  const model = modelSelect.value;
  const size = resolveSize(model);
  const selectedStyle = getAllStylePresets()[activeStyle];
  const styleReferences = selectedStyle?.saved && selectedStyle.strength === "high"
    ? selectedStyle.references || []
    : [];
  return {
    prompt: composePrompt(),
    negativePrompt: negativePromptInput.value.trim(),
    model,
    size,
    quality: document.querySelector("#quality").value,
    count: document.querySelector("#count").value,
    outputFormat: document.querySelector("#outputFormat").value,
    background: document.querySelector("#background").value,
    outputCompression: compressionInput.value,
    referenceImages: referenceImages.map((image) => ({
      name: image.name,
      dataUrl: image.dataUrl,
      url: image.url,
      source: image.source,
    })).concat(styleReferences.map((image) => ({
      name: image.name,
      dataUrl: image.dataUrl,
      url: image.url,
      source: "saved-style-reference",
    }))),
  };
}

function resolveSize(model) {
  const selected = sizeSelect.value;
  const size = selected === "custom"
    ? `${Number(customWidth.value)}x${Number(customHeight.value)}`
    : selected;

  if (model !== "gpt-image-2") {
    if (!LEGACY_SIZES.has(size)) {
      throw new Error(`${model} 这里只保留官方基础尺寸：auto、1024x1024、1536x1024、1024x1536。4K/自定义请使用 gpt-image-2。`);
    }
    return size;
  }

  validateGptImage2Size(size);
  return size;
}

function validateGptImage2Size(size) {
  if (size === "auto") {
    return;
  }

  const match = size.match(/^(\d+)x(\d+)$/);
  if (!match) {
    throw new Error("尺寸格式应为 WIDTHxHEIGHT，例如 3584x2240。");
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  const pixels = width * height;

  if (width % 16 !== 0 || height % 16 !== 0) {
    throw new Error("gpt-image-2 的自定义宽高都需要是 16 的倍数。");
  }
  if (width > GPT_IMAGE_2_MAX_SIDE || height > GPT_IMAGE_2_MAX_SIDE) {
    throw new Error("gpt-image-2 的单边不能超过 3840。");
  }
  if (pixels > GPT_IMAGE_2_MAX_PIXELS) {
    throw new Error(`${width}x${height} 是 ${pixels.toLocaleString()} 像素，超过 gpt-image-2 当前上限 ${GPT_IMAGE_2_MAX_PIXELS.toLocaleString()}。16:10 建议用 3584x2240。`);
  }
}

function updateSizeUi() {
  customSize.classList.toggle("visible", sizeSelect.value === "custom");

  const model = modelSelect.value;
  const selected = sizeSelect.value;
  const size = selected === "custom"
    ? `${Number(customWidth.value)}x${Number(customHeight.value)}`
    : selected;

  try {
    if (model !== "gpt-image-2" && !LEGACY_SIZES.has(size)) {
      throw new Error("4K 和自定义尺寸需要 gpt-image-2。");
    }
    validateGptImage2Size(model === "gpt-image-2" ? size : "auto");

    sizeHint.classList.remove("invalid");
    if (size === "3584x2240") {
      sizeHint.textContent = "严格 16:10，接近 4K，且不超过 gpt-image-2 当前总像素上限。";
    } else if (size === "3840x2160") {
      sizeHint.textContent = "这是满宽 4K 16:9。如果必须 16:10，请用 3584x2240。";
    } else if (selected === "custom") {
      sizeHint.textContent = "自定义尺寸会按 gpt-image-2 规则校验：16 的倍数、单边不超过 3840、总像素不超过 8,294,400。";
    } else {
      sizeHint.textContent = "gpt-image-2 支持更多自定义尺寸；旧模型只适合基础尺寸。";
    }
  } catch (error) {
    sizeHint.classList.add("invalid");
    sizeHint.textContent = error.message;
  }
}

function composePrompt() {
  const userText = promptInput.value.trim();
  const purpose = purposePresets[activePurpose] || purposePresets.free;
  const style = getAllStylePresets()[activeStyle] || getAllStylePresets().none;
  const lines = [userText];

  const creativeDirection = [
    ...(purpose.guidance || []),
    ...(style.guidance || []),
  ];

  if (creativeDirection.length > 0) {
    lines.push("", "Creative direction:", ...creativeDirection.map((part) => `- ${part}`));
  }

  if ((purpose.requirements || []).length > 0) {
    lines.push("", "Hard requirements:", ...purpose.requirements.map((part) => `- ${part}`));
  }

  const negativeText = negativePromptInput.value.trim();
  if (negativeText) {
    lines.push("", "Negative prompt / avoid:", ...negativeText.split(/\n+/).map((part) => `- ${part.trim()}`).filter((part) => part !== "- "));
  }

  return lines.join("\n");
}

function updatePromptPreview() {
  finalPrompt.textContent = composePrompt();
}

function prependImages(images, createdAt) {
  images.slice().reverse().forEach((image) => {
    renderImage({ ...image, createdAt }, gallery, true);
  });
}

function renderImage(image, container, prepend = false) {
  const article = document.createElement("article");
  article.className = "thumb";

  const selector = document.createElement("label");
  selector.className = "thumb-select";
  selector.setAttribute("aria-label", "选择图片");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.value = image.id || "";
  checkbox.checked = selectedImageIds.has(image.id);
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      selectedImageIds.add(image.id);
    } else {
      selectedImageIds.delete(image.id);
    }
    updateGalleryControls();
  });
  selector.append(checkbox, document.createElement("span"));

  const img = document.createElement("img");
  img.src = `${image.url}?t=${Date.now()}`;
  img.alt = image.id || "Generated background";
  img.loading = "lazy";
  img.addEventListener("click", () => openPreviewByImage(image));

  const info = document.createElement("div");
  info.className = "thumb-info";

  const title = document.createElement("div");
  title.className = "thumb-title";
  title.title = image.filePath || image.id;
  title.textContent = image.id || "Generated image";

  const actions = document.createElement("div");
  actions.className = "thumb-actions";

  const openLink = document.createElement("a");
  openLink.href = image.url;
  openLink.target = "_blank";
  openLink.rel = "noreferrer";
  openLink.textContent = "打开";

  const downloadLink = document.createElement("a");
  downloadLink.href = image.url;
  downloadLink.download = image.id ? image.id.split("/").pop() : "background.png";
  downloadLink.textContent = "下载";

  const referenceButton = document.createElement("button");
  referenceButton.type = "button";
  referenceButton.textContent = "设参考";
  referenceButton.addEventListener("click", () => addGeneratedReference(image));

  const rerollButton = document.createElement("button");
  rerollButton.type = "button";
  rerollButton.textContent = "重Roll";
  rerollButton.addEventListener("click", () => rerollImage(image));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "danger-action";
  deleteButton.textContent = "删除";
  deleteButton.addEventListener("click", () => deleteSingleImage(image));

  actions.append(openLink, downloadLink, referenceButton, rerollButton, deleteButton);
  info.append(title, renderImageMeta(image), actions, renderPostActions(image));
  article.append(selector, img, info);

  if (prepend) {
    container.prepend(article);
  } else {
    container.append(article);
  }
}

function renderPostActions(image) {
  const panel = document.createElement("div");
  panel.className = "post-actions";

  const upscaleRow = document.createElement("div");
  upscaleRow.className = "post-row";

  const upscaleSelect = document.createElement("select");
  postProcessSizePresets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.value;
    option.textContent = preset.label;
    upscaleSelect.append(option);
  });
  upscaleSelect.value = "2x";

  const upscaleButton = document.createElement("button");
  upscaleButton.type = "button";
  upscaleButton.textContent = "放大";
  upscaleButton.addEventListener("click", () => upscaleImage(image, upscaleSelect.value));

  const tweakInput = document.createElement("textarea");
  tweakInput.rows = 2;
  tweakInput.placeholder = "局部微调，例如：只把右侧背景改成暗红丝绸质感";

  const tweakButton = document.createElement("button");
  tweakButton.type = "button";
  tweakButton.textContent = "微调";
  tweakButton.addEventListener("click", () => tweakImage(image, tweakInput.value));

  upscaleRow.append(upscaleSelect, upscaleButton);
  panel.append(upscaleRow, tweakInput, tweakButton);
  return panel;
}

function renderImageMeta(image) {
  const details = document.createElement("details");
  details.className = "thumb-meta";

  const summary = document.createElement("summary");
  summary.textContent = "提示词和参数";

  const body = document.createElement("div");
  body.className = "meta-body";

  const prompt = document.createElement("pre");
  prompt.className = "meta-prompt";
  prompt.textContent = [
    image.prompt || image.request?.prompt || "无提示词记录",
    image.request?.negativePrompt ? `\n反向提示词：\n${image.request.negativePrompt}` : "",
  ].join("");

  const tags = document.createElement("div");
  tags.className = "meta-tags";
  const params = image.params || {};
  [
    ["接口", params.endpointMode],
    ["模型", params.model],
    ["尺寸", params.size],
    ["质量", params.quality],
    ["格式", params.format],
    ["背景", params.background],
    ["参考图", params.references],
  ].forEach(([label, value]) => {
    const tag = document.createElement("span");
    tag.textContent = `${label}: ${value ?? "-"}`;
    tags.append(tag);
  });

  body.append(prompt, tags);
  details.append(summary, body);
  return details;
}

async function extractKeywordsFromUploads() {
  if (analysisImages.length === 0) {
    showMessage("先上传样图，再提取关键词。", true);
    return;
  }

  await runImageAnalysis({
    mode: "keywords",
    images: analysisImages.map((image) => analysisImagePayload(image)),
    busyText: `正在从 ${analysisImages.length} 张样图提取关键词。`,
    title: `样图关键词 · ${analysisImages.length} 张`,
  });
}

async function extractStyleFromUploads() {
  if (analysisImages.length < 2) {
    showMessage("至少上传 2 张样图，才能提取共同风格。", true);
    return;
  }

  await runImageAnalysis({
    mode: "style",
    images: analysisImages.map((image) => analysisImagePayload(image)),
    busyText: `正在从 ${analysisImages.length} 张样图提取共同风格。`,
    title: `样图风格 · ${analysisImages.length} 张`,
  });
}

async function extractPromptFromUploads() {
  if (analysisImages.length === 0) {
    showMessage("先上传至少 1 张样图，再提取提示词。", true);
    return;
  }

  await runImageAnalysis({
    mode: "prompt",
    images: [analysisImagePayload(analysisImages[0])],
    busyText: "正在从第一张样图提取可复用提示词。",
    title: `样图提示词 · ${analysisImages[0].name || "第一张样图"}`,
  });
}

function analysisImagePayload(image) {
  return {
    name: image.name,
    dataUrl: image.dataUrl,
    source: image.source,
  };
}

async function runImageAnalysis({ mode, images, busyText, title }) {
  setAnalysisBusy(true);
  showMessage(busyText, false);

  try {
    const result = await fetchJson("/api/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, images, auxiliary: collectAuxiliaryPayload() }),
    }, 240000);
    latestAnalysis = {
      mode: result.mode || mode,
      title,
      name: title,
      text: result.text || "",
    };
    showAnalysisResult(latestAnalysis);
    showMessage("分析完成，可以复制或写入提示词。", false);
  } catch (error) {
    showMessage(normalizeFrontendError(error, "图片分析失败。"), true);
  } finally {
    setAnalysisBusy(false);
  }
}

function showAnalysisResult(analysis) {
  analysisPanel.hidden = false;
  analysisTitle.textContent = analysis.title || "分析结果";
  analysisName.value = analysis.name || analysis.title || "分析结果";
  analysisResult.value = analysis.text || "";
  useAnalysisButton.textContent = analysis.mode === "style"
    ? "追加为风格"
    : analysis.mode === "keywords"
      ? "追加关键词"
      : "写入提示词";
}

async function copyAnalysisResult() {
  const text = getAnalysisText();
  if (!text) {
    showMessage("还没有可复制的分析结果。", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showMessage("分析结果已复制。", false);
  } catch {
    showMessage("复制失败，可以直接手动选中结果文本。", true);
  }
}

function useAnalysisResult() {
  const text = getAnalysisText();
  if (!text) {
    showMessage("还没有可写入的分析结果。", true);
    return;
  }

  if (["style", "keywords"].includes(latestAnalysis.mode) && promptInput.value.trim()) {
    const label = latestAnalysis.mode === "style"
      ? "Style direction from uploaded references"
      : "Keywords from uploaded references";
    promptInput.value = `${promptInput.value.trim()}\n\n${label}:\n${text}`;
  } else {
    promptInput.value = text;
  }

  const extractedNegative = extractNegativePrompt(text);
  if (extractedNegative && !negativePromptInput.value.trim()) {
    negativePromptInput.value = extractedNegative;
  }

  updatePromptPreview();
  showMessage("已写入提示词。", false);
}

async function saveAnalysisPrompt() {
  const text = getAnalysisText();
  if (!text) {
    showMessage("先生成或填写一段提示词内容再保存。", true);
    return;
  }

  await saveSavedPrompt({
    name: analysisName.value.trim() || "保存的提示词",
    text,
    mode: latestAnalysis?.mode || "manual",
    source: "analysis",
  });
}

async function saveAnalysisStyle() {
  const rawText = getAnalysisText();
  const styleText = extractStylePromptText(rawText);
  if (!styleText) {
    showMessage("先生成或填写一段风格内容再保存。", true);
    return;
  }

  await saveSavedStyle({
    name: analysisName.value.trim() || "保存的风格",
    text: rawText,
    styleText,
    negativeText: extractStyleNegativeText(rawText),
    strength: analysisStyleStrength.value,
    referenceImages: analysisImages.map((image) => analysisImagePayload(image)),
    mode: latestAnalysis?.mode || "style",
    source: "style-package",
  });
}

async function saveSavedPrompt(payload) {
  try {
    apiSettings = await fetchJson("/api/saved-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    renderSavedPrompts();
    showMessage("提示词已保存。", false);
  } catch (error) {
    showMessage(normalizeFrontendError(error, "保存提示词失败。"), true);
  }
}

async function deleteSavedPrompt(id) {
  if (!window.confirm("确定删除这条已保存提示词吗？")) {
    return;
  }
  try {
    apiSettings = await fetchJson("/api/saved-prompts/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    renderSavedPrompts();
    showMessage("提示词已删除。", false);
  } catch (error) {
    showMessage(normalizeFrontendError(error, "删除提示词失败。"), true);
  }
}

async function saveSavedStyle(payload) {
  try {
    apiSettings = await fetchJson("/api/saved-styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    renderStylePresets();
    showMessage(`风格包已保存，并已加入风格预设。强度：${styleStrengthLabel(payload.strength)}。`, false);
  } catch (error) {
    showMessage(normalizeFrontendError(error, "保存风格失败。"), true);
  }
}

function styleStrengthLabel(strength) {
  return {
    low: "低",
    medium: "中",
    high: "高",
  }[strength] || "中";
}

async function deleteSavedStyle(id) {
  if (!window.confirm("确定删除这个保存风格吗？")) {
    return;
  }
  try {
    apiSettings = await fetchJson("/api/saved-styles/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (activeStyle === `saved:${id}`) {
      activeStyle = "none";
    }
    renderStylePresets();
    updatePromptPreview();
    showMessage("风格已删除。", false);
  } catch (error) {
    showMessage(normalizeFrontendError(error, "删除风格失败。"), true);
  }
}

function useSavedPrompt(item, append) {
  if (append && promptInput.value.trim()) {
    promptInput.value = `${promptInput.value.trim()}\n\n${item.text}`;
  } else {
    promptInput.value = item.text;
  }
  updatePromptPreview();
  showMessage(append ? "已追加保存提示词。" : "已使用保存提示词。", false);
}

function clearAnalysisResult() {
  latestAnalysis = null;
  analysisName.value = "";
  analysisResult.value = "";
  analysisPanel.hidden = true;
}

function getAnalysisText() {
  const text = analysisResult.value.trim();
  if (latestAnalysis) {
    latestAnalysis.text = text;
    latestAnalysis.name = analysisName.value.trim();
  }
  return text;
}

function extractNegativePrompt(text) {
  const match = String(text || "").match(/反向提示词\s*[：:]\s*([\s\S]+)/);
  if (!match) {
    return "";
  }
  return match[1].trim().split(/\n{2,}/)[0].trim();
}

function extractStylePromptText(text) {
  const value = String(text || "").trim();
  if (!value) {
    return "";
  }

  const dna = value.match(/风格\s*DNA\s*[：:]?\s*([\s\S]*?)(?:\n\s*(?:风格反向词|不要继承|反向提示词|适合用途|风格名称|风格提示词)\s*[：:]|$)/i);
  if (dna?.[1]?.trim()) {
    return dna[1].trim();
  }

  const labeled = value.match(/风格提示词\s*[：:]\s*([\s\S]*?)(?:\n\s*(?:适合用途|反向提示词|风格名称)\s*[：:]|$)/);
  if (labeled?.[1]?.trim()) {
    return labeled[1].trim();
  }

  return value;
}

function extractStyleNegativeText(text) {
  const value = String(text || "").trim();
  const styleNegative = value.match(/风格反向词\s*[：:]\s*([\s\S]*?)(?:\n\s*(?:不要继承|风格名称|风格\s*DNA|风格提示词|适合用途|反向提示词)\s*[：:]|$)/i);
  if (styleNegative?.[1]?.trim()) {
    return styleNegative[1].trim();
  }

  return extractNegativePrompt(value);
}

function setAnalysisBusy(isBusy) {
  isAnalysisBusy = isBusy;
  updateAnalysisActions();
}

function updateAnalysisActions() {
  clearAnalysisImagesButton.disabled = isAnalysisBusy || analysisImages.length === 0;
  extractKeywordsButton.disabled = isAnalysisBusy || analysisImages.length === 0;
  extractUploadedPromptButton.disabled = isAnalysisBusy || analysisImages.length === 0;
  extractUploadedStyleButton.disabled = isAnalysisBusy || analysisImages.length < 2;
}

function rerollImage(image) {
  const request = image.request;
  if (!request?.prompt) {
    showMessage("这张图没有完整请求记录，不能重Roll。", true);
    return;
  }

  const payload = {
    prompt: request.prompt,
    model: request.model || "gpt-image-2",
    size: request.size || "auto",
    quality: request.quality || "auto",
    count: 1,
    outputFormat: request.output_format || "png",
    background: request.background || "auto",
    outputCompression: request.output_compression || 85,
    referenceImages: request.referenceImages || [],
  };

  runGeneration(payload, "正在按原提示词和参数重Roll。");
}

function upscaleImage(image, preset) {
  const size = resolvePostProcessSize(image, preset);
  const request = image.request || {};
  const basePrompt = request.prompt || image.prompt || promptInput.value.trim();
  const payload = {
    prompt: [
      basePrompt,
      "",
      "Use the provided reference image as the exact source image.",
      "Upscale and remaster it with cleaner detail, sharper material definition, and preserved composition.",
      "Do not redesign the subject, camera angle, layout, color identity, or important shapes.",
      `Target output size: ${size}.`,
    ].join("\n"),
    model: request.model === "gpt-image-2" ? request.model : "gpt-image-2",
    size,
    quality: "high",
    count: 1,
    outputFormat: request.output_format || "png",
    background: request.background || "auto",
    outputCompression: request.output_compression || 85,
    referenceImages: [generatedImageReference(image, "upscale")],
  };

  runGeneration(payload, `正在放大到 ${size}。`);
}

function tweakImage(image, instruction) {
  const cleanInstruction = String(instruction || "").trim();
  if (cleanInstruction.length < 2) {
    showMessage("先写一句要微调哪里、改成什么样。", true);
    return;
  }

  const request = image.request || {};
  const size = resolvePostProcessSize(image, "same");
  const basePrompt = request.prompt || image.prompt || promptInput.value.trim();
  const payload = {
    prompt: [
      basePrompt,
      "",
      "Use the provided reference image as the base image.",
      "Apply only this local edit:",
      `- ${cleanInstruction}`,
      "Keep all unrelated areas as unchanged as possible, including composition, subject identity, camera angle, lighting direction, and overall style.",
    ].join("\n"),
    model: request.model === "gpt-image-2" ? request.model : "gpt-image-2",
    size,
    quality: request.quality || "high",
    count: 1,
    outputFormat: request.output_format || "png",
    background: request.background || "auto",
    outputCompression: request.output_compression || 85,
    referenceImages: [generatedImageReference(image, "local-tweak")],
  };

  runGeneration(payload, "正在按参考图做局部微调。");
}

function generatedImageReference(image, source) {
  return {
    name: image.id || "Generated image",
    url: image.url,
    source,
  };
}

function resolvePostProcessSize(image, preset) {
  if (/^\d+x\d+$/i.test(preset)) {
    return preset;
  }

  const baseSize = image.request?.size || image.params?.size || sizeSelect.value;
  if (preset === "same") {
    return baseSize && baseSize !== "custom" ? baseSize : resolveSize(modelSelect.value);
  }

  if (preset === "2x") {
    return scaleSize(baseSize, 2) || "3584x2240";
  }

  return "3584x2240";
}

function scaleSize(size, factor) {
  const parsed = parseSize(size);
  if (!parsed) {
    return "";
  }

  let width = roundToMultiple(parsed.width * factor, 16);
  let height = roundToMultiple(parsed.height * factor, 16);
  const limitScale = Math.min(
    1,
    GPT_IMAGE_2_MAX_SIDE / width,
    GPT_IMAGE_2_MAX_SIDE / height,
    Math.sqrt(GPT_IMAGE_2_MAX_PIXELS / (width * height)),
  );

  if (limitScale < 1) {
    width = Math.max(16, Math.floor((width * limitScale) / 16) * 16);
    height = Math.max(16, Math.floor((height * limitScale) / 16) * 16);
  }

  return `${width}x${height}`;
}

function parseSize(size) {
  const match = String(size || "").match(/^(\d+)x(\d+)$/i);
  if (!match) {
    return null;
  }
  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function roundToMultiple(value, multiple) {
  return Math.max(multiple, Math.round(value / multiple) * multiple);
}

function openPreviewByImage(image) {
  const index = galleryImages.findIndex((item) => item.id === image.id);
  previewIndex = index >= 0 ? index : 0;
  if (index < 0) {
    galleryImages = [image, ...galleryImages];
  }
  renderPreview();
  previewModal.classList.add("open");
  previewModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function renderPreview() {
  if (galleryImages.length === 0) {
    return;
  }

  previewIndex = (previewIndex + galleryImages.length) % galleryImages.length;
  const image = galleryImages[previewIndex];
  previewImage.src = `${image.url}?preview=${Date.now()}`;
  previewImage.alt = image.id || "Generated image preview";
  previewCaption.textContent = `${previewIndex + 1} / ${galleryImages.length} · ${image.id || "Generated image"}`;
}

function stepPreview(direction) {
  if (!previewModal.classList.contains("open") || galleryImages.length === 0) {
    return;
  }
  previewIndex += direction;
  renderPreview();
}

function closePreview() {
  previewModal.classList.remove("open");
  previewModal.setAttribute("aria-hidden", "true");
  previewImage.removeAttribute("src");
  document.body.style.overflow = "";
}

function handlePreviewKeydown(event) {
  if (!previewModal.classList.contains("open")) {
    return;
  }
  if (event.key === "Escape") {
    closePreview();
  } else if (event.key === "ArrowLeft") {
    stepPreview(-1);
  } else if (event.key === "ArrowRight") {
    stepPreview(1);
  }
}

async function fetchJson(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    let body = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { error: text || "Invalid JSON response." };
    }
    if (!response.ok) {
      const requestId = body.requestId ? `\nRequest ID: ${body.requestId}` : "";
      throw new Error(`${body.error || `HTTP ${response.status}`}${requestId}`);
    }
    return body;
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeFrontendError(error, fallback) {
  if (error?.name === "AbortError") {
    return `${fallback}\n本地服务没有及时响应。确认 start-generator.bat 仍在运行，然后刷新页面。`;
  }
  if (/Failed to fetch|NetworkError|Load failed|fetch/i.test(error?.message || "")) {
    return `${fallback}\n无法连接本地服务。请重新双击 start-generator.bat，并确认窗口不要关闭。`;
  }
  return error?.message || fallback;
}

function showMessage(text, isError) {
  message.textContent = text;
  message.classList.toggle("error", Boolean(isError));
}

function showApiMessage(text, isError) {
  apiMessage.textContent = text;
  apiMessage.classList.toggle("error", Boolean(isError));
}

function setBusy(isBusy) {
  generateButton.disabled = isBusy;
  generateButton.querySelector("span").textContent = isBusy ? "生成中" : "生成图片";
}
