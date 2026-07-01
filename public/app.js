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

const promptLexiconGroups = [
  {
    id: "camera",
    label: "镜头",
    items: [
      { label: "低角度", text: "低角度仰拍，强调主体体量与压迫感，透视稳定" },
      { label: "过肩", text: "过肩镜头，前景肩部轻微虚化，视线指向明确" },
      { label: "特写", text: "面部特写，眼神清晰，浅景深，情绪集中" },
      { label: "广角", text: "广角镜头，空间纵深明显，边缘畸变克制" },
      { label: "长焦", text: "长焦压缩空间，背景柔和虚化，主体轮廓干净" },
    ],
  },
  {
    id: "composition",
    label: "构图",
    items: [
      { label: "三分法", text: "三分法构图，主体落在视觉焦点，留白可承载信息" },
      { label: "对称", text: "中心对称构图，结构稳定，左右视觉重量均衡" },
      { label: "前中后景", text: "清晰前景、中景、背景层次，空间关系可读" },
      { label: "引导线", text: "利用建筑线条和光影引导视线，焦点明确" },
      { label: "负空间", text: "保留干净负空间，主体不贴边，画面呼吸感充足" },
    ],
  },
  {
    id: "lighting",
    label: "灯光",
    items: [
      { label: "电影侧光", text: "cinematic side lighting，面部明暗层次清楚，轮廓边缘有柔和 rim light" },
      { label: "柔光", text: "large softbox lighting，阴影柔和，皮肤和材质质感自然" },
      { label: "逆光", text: "backlight silhouette，轮廓光清晰，背景高光不过曝" },
      { label: "雨夜霓虹", text: "rainy neon lighting，湿润反光地面，冷暖色对比克制" },
      { label: "窗光", text: "window light from one side，空气中轻微尘埃感，光线方向稳定" },
    ],
  },
  {
    id: "expression",
    label: "表情",
    items: [
      { label: "克制", text: "克制表情，眼神压住情绪，嘴角细微变化" },
      { label: "震惊", text: "短暂震惊，瞳孔聚焦，肩颈紧绷，表情不过度夸张" },
      { label: "疲惫", text: "疲惫但保持清醒，眼下轻微阴影，姿态收紧" },
      { label: "决心", text: "坚定决心，视线直指目标，下颌线稳定" },
      { label: "温柔", text: "温柔放松的表情，眼神柔和，面部肌肉自然" },
    ],
  },
  {
    id: "action",
    label: "动作",
    items: [
      { label: "回头", text: "角色半身回头，肩线带动动作，视线与镜头形成张力" },
      { label: "推门", text: "一手推开门，另一手自然保持平衡，门缝透出光线" },
      { label: "递物", text: "双人递交物件，手部结构准确，物件位置清楚" },
      { label: "奔跑", text: "向前奔跑，衣摆和发丝有方向性动态，身体重心合理" },
      { label: "停顿", text: "动作停在关键一瞬，姿态有惯性，画面有悬念" },
    ],
  },
  {
    id: "mood",
    label: "画面气质",
    items: [
      { label: "高级克制", text: "高级、克制、干净的视觉气质，细节精致但不过度堆叠" },
      { label: "悬疑", text: "悬疑氛围，暗部保留细节，画面张力来自光影和留白" },
      { label: "温暖日常", text: "温暖日常感，低对比柔和色彩，生活细节真实" },
      { label: "史诗感", text: "epic scale，宏大空间尺度，主体仍然清晰可辨" },
      { label: "杂志质感", text: "editorial visual polish，构图精确，色彩统一，质感高级" },
    ],
  },
  {
    id: "continuity",
    label: "连续性约束",
    items: [
      { label: "角色一致", text: "保持角色脸型、发型、发色、服装轮廓、标志性配饰完全一致" },
      { label: "场景一致", text: "保持同一地点的空间结构、门窗位置、主道具和光线方向一致" },
      { label: "镜头衔接", text: "延续上一帧镜头关系，只推进动作和表情，不重设场景" },
      { label: "服装锁定", text: "服装款式、材质、配色和配饰不改变，不新增不合理装饰" },
      { label: "无文字", text: "画面中不要生成可读文字、字幕、水印、logo 或随机符号" },
    ],
  },
];

const MANJU_PACKS_STORAGE_KEY = "yaotu-manju-packs";
const MANJU_CHARACTER_CARDS_STORAGE_KEY = "yaotu-manju-character-cards";
const MANJU_ARCHIVES_STORAGE_KEY = "yaotu-manju-image-archives";
const MANJU_SHOT_HANDOFF_STORAGE_KEY = "yaotu-manju-shot-handoff";
const MANJU_SHOT_QUEUE_HANDOFF_STORAGE_KEY = "yaotu-manju-shot-queue-handoff";
const MANJU_CHARACTER_HANDOFF_STORAGE_KEY = "yaotu-manju-character-handoff";
const MANJU_ACTIVE_SHOT_QUEUE_STORAGE_KEY = "yaotu-manju-active-shot-queue";
const ACTIVE_PROJECT_STORAGE_KEY = "yaotu-manju-workbench-project";
const MANJU_ARCHIVE_ALL_VALUE = "__all__";
const DEFAULT_MANJU_ARCHIVE_CATEGORY = "shot-candidate";
const MANJU_ARCHIVE_CATEGORIES = [
  { value: "character-profile", label: "人设资料" },
  { value: "turnaround", label: "三视图" },
  { value: "detail", label: "细节图" },
  { value: "expression", label: "表情图" },
  { value: "scene", label: "场景图" },
  { value: "shot-candidate", label: "分镜候选" },
  { value: "shot-final", label: "分镜定稿" },
  { value: "discarded", label: "废稿" },
];
const DEFAULT_GENERAL_PROMPT = "面向 AI 图片管理软件的主题背景，现代、克制、有一点东方志怪感但不做古风插画，画面有层次但不抢内容，中心和右侧留出干净空间，适合承载侧边栏、卡片和预览区域。";

const form = document.querySelector("#generatorForm");
const promptInput = document.querySelector("#prompt");
const promptLabel = document.querySelector("#promptLabel");
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
const apiProfileManagerSelect = document.querySelector("#apiProfileManagerSelect");
const openApiSettingsButton = document.querySelector("#openApiSettingsButton");
const closeApiSettingsButton = document.querySelector("#closeApiSettingsButton");
const apiSettingsModal = document.querySelector("#apiSettingsModal");
const newProfileButton = document.querySelector("#newProfileButton");
const deleteProfileButton = document.querySelector("#deleteProfileButton");
const saveApiButton = document.querySelector("#saveApiButton");
const testApiButton = document.querySelector("#testApiButton");
const apiProfileName = document.querySelector("#apiProfileName");
const apiImageModel = document.querySelector("#apiImageModel");
const apiImageModelSelect = document.querySelector("#apiImageModelSelect");
const apiEndpointMode = document.querySelector("#apiEndpointMode");
const apiBaseUrl = document.querySelector("#apiBaseUrl");
const apiKey = document.querySelector("#apiKey");
const apiMessage = document.querySelector("#apiMessage");
const auxProfileManagerSelect = document.querySelector("#auxProfileManagerSelect");
const newAuxProfileButton = document.querySelector("#newAuxProfileButton");
const deleteAuxProfileButton = document.querySelector("#deleteAuxProfileButton");
const auxProfileName = document.querySelector("#auxProfileName");
const auxUseActiveProfile = document.querySelector("#auxUseActiveProfile");
const auxModel = document.querySelector("#auxModel");
const auxModelSelect = document.querySelector("#auxModelSelect");
const auxBaseUrl = document.querySelector("#auxBaseUrl");
const auxApiKey = document.querySelector("#auxApiKey");
const loadImageModelsButton = document.querySelector("#loadImageModelsButton");
const loadAuxModelsButton = document.querySelector("#loadAuxModelsButton");
const testAuxButton = document.querySelector("#testAuxButton");
const saveAuxButton = document.querySelector("#saveAuxButton");
const checkUpdateButton = document.querySelector("#checkUpdateButton");
const updateStatusText = document.querySelector("#updateStatusText");
const referenceInput = document.querySelector("#referenceInput");
const extractReferenceSceneButton = document.querySelector("#extractReferenceSceneButton");
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
const savePromptButton = document.querySelector("#savePromptButton");
const promptOptimizeMode = document.querySelector("#promptOptimizeMode");
const optimizePromptButton = document.querySelector("#optimizePromptButton");
const lexiconCategorySelect = document.querySelector("#lexiconCategorySelect");
const lexiconChipList = document.querySelector("#lexiconChipList");
const savedPromptCount = document.querySelector("#savedPromptCount");
const savedPromptList = document.querySelector("#savedPromptList");
const recentPromptCount = document.querySelector("#recentPromptCount");
const recentPromptList = document.querySelector("#recentPromptList");
const previewModal = document.querySelector("#previewModal");
const previewImage = document.querySelector("#previewImage");
const previewCaption = document.querySelector("#previewCaption");
const previewClose = document.querySelector("#previewClose");
const previewPrevious = document.querySelector("#previewPrevious");
const previewNext = document.querySelector("#previewNext");
const manjuGalleryTools = document.querySelector("#manjuGalleryTools");
const manjuArchiveActiveTitle = document.querySelector("#manjuArchiveActiveTitle");
const manjuArchiveTitleFilter = document.querySelector("#manjuArchiveTitleFilter");
const manjuArchiveCategoryFilter = document.querySelector("#manjuArchiveCategoryFilter");
const manjuArchiveSummary = document.querySelector("#manjuArchiveSummary");
const clearManjuArchiveFilterButton = document.querySelector("#clearManjuArchiveFilterButton");
const exportManjuArchiveButton = document.querySelector("#exportManjuArchiveButton");
const archiveQuickPanel = document.querySelector("#archiveQuickPanel");
const archiveQuickGroups = document.querySelector("#archiveQuickGroups");
const refreshArchiveQuickButton = document.querySelector("#refreshArchiveQuickButton");
const shotQueuePanel = document.querySelector("#shotQueuePanel");
const shotQueueTitle = document.querySelector("#shotQueueTitle");
const shotQueueProgress = document.querySelector("#shotQueueProgress");
const shotQueueCurrent = document.querySelector("#shotQueueCurrent");
const shotQueueList = document.querySelector("#shotQueueList");
const clearShotQueueButton = document.querySelector("#clearShotQueueButton");
const loadShotQueuePromptButton = document.querySelector("#loadShotQueuePromptButton");
const generateShotQueueCurrentButton = document.querySelector("#generateShotQueueCurrentButton");
const generateShotQueueAllButton = document.querySelector("#generateShotQueueAllButton");

let activeMode = "general";
localStorage.setItem("yaotu-workbench-mode", activeMode);
let activePurpose = "software";
let activeStyle = "none";
let apiSettings = { activeProfileId: "", profiles: [], activeAuxiliaryProfileId: "", auxiliaryProfiles: [] };
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
let activeShotQueue = readActiveShotQueue();
let isShotQueueRunning = false;
let activeManjuGenerationContext = null;
let activeManjuProjectTitle = (localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY) || "").trim();

applyWorkbenchMode();
promptInput.value = DEFAULT_GENERAL_PROMPT;
applyManjuCharacterHandoff();
applyManjuShotHandoff();
applyManjuShotQueueHandoff();
renderStylePresets();
renderPromptLexicon();
renderShotQueuePanel();
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
manjuArchiveTitleFilter.addEventListener("change", () => {
  galleryPage = 1;
  loadImages();
});
manjuArchiveCategoryFilter.addEventListener("change", () => {
  galleryPage = 1;
  loadImages();
});
clearManjuArchiveFilterButton.addEventListener("click", () => {
  manjuArchiveTitleFilter.value = MANJU_ARCHIVE_ALL_VALUE;
  manjuArchiveCategoryFilter.value = MANJU_ARCHIVE_ALL_VALUE;
  galleryPage = 1;
  loadImages();
});
exportManjuArchiveButton.addEventListener("click", exportCurrentManjuArchive);
refreshArchiveQuickButton.addEventListener("click", () => {
  renderArchiveQuickPanel();
  showMessage("已刷新归档快捷引用。", false);
});
clearShotQueueButton.addEventListener("click", clearShotQueue);
loadShotQueuePromptButton.addEventListener("click", () => loadActiveShotQueuePrompt(true));
generateShotQueueCurrentButton.addEventListener("click", () => generateActiveShotQueueFrame());
generateShotQueueAllButton.addEventListener("click", generateRemainingShotQueueFrames);
selectPageImages.addEventListener("change", () => {
  setCurrentPageSelection(selectPageImages.checked);
});
deleteSelectedButton.addEventListener("click", deleteSelectedImages);
referenceInput.addEventListener("change", handleReferenceFiles);
extractReferenceSceneButton.addEventListener("click", extractSceneFromReferences);
clearReferencesButton.addEventListener("click", clearReferenceImages);
analysisImageInput.addEventListener("change", handleAnalysisImageFiles);
clearAnalysisImagesButton.addEventListener("click", clearAnalysisImages);
extractKeywordsButton.addEventListener("click", extractKeywordsFromUploads);
extractUploadedStyleButton.addEventListener("click", extractStyleFromUploads);
extractUploadedPromptButton.addEventListener("click", extractPromptFromUploads);
savePromptButton.addEventListener("click", saveCurrentPrompt);
optimizePromptButton.addEventListener("click", optimizeCurrentPrompt);
lexiconCategorySelect.addEventListener("change", renderPromptLexiconItems);
newProfileButton.addEventListener("click", createNewProfileDraft);
deleteProfileButton.addEventListener("click", deleteActiveProfile);
saveApiButton.addEventListener("click", saveApiSettings);
testApiButton.addEventListener("click", testApiConnection);
loadImageModelsButton.addEventListener("click", loadImageModels);
loadAuxModelsButton.addEventListener("click", loadAuxiliaryModels);
testAuxButton.addEventListener("click", testAuxiliaryConnection);
saveAuxButton.addEventListener("click", saveAuxiliarySettings);
checkUpdateButton.addEventListener("click", checkForAppUpdates);
newAuxProfileButton.addEventListener("click", createNewAuxiliaryProfileDraft);
deleteAuxProfileButton.addEventListener("click", deleteActiveAuxiliaryProfile);
profileSelect.addEventListener("change", activateSelectedProfile);
apiProfileManagerSelect.addEventListener("change", syncManagerProfileSelection);
auxProfileManagerSelect.addEventListener("change", activateSelectedAuxiliaryProfile);
apiEndpointMode.addEventListener("change", syncModelForEndpointMode);
apiImageModelSelect.addEventListener("change", () => {
  if (apiImageModelSelect.value) {
    apiImageModel.value = apiImageModelSelect.value;
    syncMainModelWithApiDefault();
  }
});
apiImageModel.addEventListener("input", () => {
  syncImageModelSelect();
  syncMainModelWithApiDefault();
});
openApiSettingsButton.addEventListener("click", openApiSettings);
closeApiSettingsButton.addEventListener("click", closeApiSettings);
apiSettingsModal.addEventListener("click", (event) => {
  if (event.target === apiSettingsModal) {
    closeApiSettings();
  }
});
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

function applyManjuCharacterHandoff() {
  const raw = localStorage.getItem(MANJU_CHARACTER_HANDOFF_STORAGE_KEY);
  if (!raw) {
    return;
  }

  localStorage.removeItem(MANJU_CHARACTER_HANDOFF_STORAGE_KEY);
  try {
    const payload = JSON.parse(raw);
    const prompt = String(payload?.prompt || "").trim();
    if (!prompt) {
      return;
    }

    syncManjuProjectContext(payload);
    activeMode = "general";
    activePurpose = "free";
    activeStyle = "none";
    purposePreset.value = "free";
    promptInput.value = prompt;
    activeManjuGenerationContext = normalizeManjuGenerationContext(payload.manjuContext || {
      type: "character-base",
      title: payload.title,
      category: "character-profile",
      characterId: payload.character?.id,
      characterName: payload.character?.name,
      characterRole: payload.character?.role,
    });
    referenceImages = [];
    applyCharacterBaseDefaults();
    localStorage.setItem("yaotu-workbench-mode", activeMode);
    applyWorkbenchMode(activeMode);
    renderReferenceImages();
    updatePromptPreview();

    showMessage(`已载入《${payload.title || "未命名漫剧"}》角色底图任务：${payload.character?.name || "未命名角色"}。生成后会自动归档为人设资料。`, false);
  } catch {
    showMessage("B 版角色底图任务读取失败，可以回到漫剧工作台重新发送。", true);
  }
}

function applyManjuShotHandoff() {
  const raw = localStorage.getItem(MANJU_SHOT_HANDOFF_STORAGE_KEY);
  if (!raw) {
    return;
  }

  localStorage.removeItem(MANJU_SHOT_HANDOFF_STORAGE_KEY);
  try {
    const payload = JSON.parse(raw);
    const prompt = String(payload?.prompt || "").trim();
    if (!prompt) {
      return;
    }

    syncManjuProjectContext(payload);
    activeMode = "general";
    activePurpose = "free";
    activeStyle = "none";
    purposePreset.value = "free";
    promptInput.value = prompt;
    activeManjuGenerationContext = normalizeManjuGenerationContext(payload.manjuContext || {
      type: "shot",
      title: payload.title,
      category: "shot-candidate",
      shotNo: payload.shotNo,
      scene: payload.scene,
      characters: payload.characters,
    });
    referenceImages = referenceImages.filter((image) => image.source !== "manju-relay-reference");
    if (payload.skipCharacterReferences) {
      referenceImages = referenceImages.filter((image) => image.source !== "manju-auto-character-reference");
    } else {
      applyManjuCharacterReferences(activeManjuGenerationContext);
    }
    if (Array.isArray(payload.referenceImages) && payload.referenceImages.length) {
      referenceImages = mergeReferencePayloads(referenceImages, payload.referenceImages).slice(0, 16);
    }
    renderReferenceImages();
    localStorage.setItem("yaotu-workbench-mode", activeMode);
    applyWorkbenchMode(activeMode);
    updatePromptPreview();

    const shotLabel = payload?.shotNo ? ` ${payload.shotNo}` : "";
    showMessage(payload.type === "yaotu-manju-shot-relay"
      ? `已从 B 版带入分镜${shotLabel}接力提示词${payload.referenceImages?.length ? "和上一帧参考图" : ""}。`
      : `已从 B 版带入分镜${shotLabel}提示词，并自动匹配角色参考图。`, false);
  } catch {
    showMessage("B 版分镜提示词读取失败，可以回到漫剧工作台重新带入。", true);
  }
}

function applyManjuShotQueueHandoff() {
  const raw = localStorage.getItem(MANJU_SHOT_QUEUE_HANDOFF_STORAGE_KEY);
  if (!raw) {
    return;
  }

  localStorage.removeItem(MANJU_SHOT_QUEUE_HANDOFF_STORAGE_KEY);
  const queue = normalizeShotQueue(raw);
  if (!queue) {
    showMessage("B 版连续分镜队列读取失败，可以回到漫剧工作台重新发送。", true);
    return;
  }

  activeShotQueue = queue;
  syncManjuProjectContext(queue);
  activeMode = "general";
  activePurpose = "free";
  activeStyle = "none";
  purposePreset.value = "free";
  setCurrentManjuTitle(queue.title);
  localStorage.setItem("yaotu-workbench-mode", activeMode);
  writeActiveShotQueue();
  applyWorkbenchMode(activeMode);
  applyShotQueueDefaults();
  loadActiveShotQueuePrompt(false);
  showMessage(`已接收《${queue.title}》连续关键帧队列：${queue.shots.length} 镜。`, false);
}

function normalizeManjuContinuityLock(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const frameTotal = Math.min(10, Math.max(1, Number.parseInt(value.frameTotal, 10) || 3));
  const frameIndex = Math.min(frameTotal, Math.max(1, Number.parseInt(value.frameIndex, 10) || 1));
  return {
    groupId: String(value.groupId || "").trim().slice(0, 120),
    title: String(value.title || "连续镜头").trim().slice(0, 80) || "连续镜头",
    frameIndex,
    frameTotal,
    frameRole: String(value.frameRole || "").trim().slice(0, 80),
    frameInstruction: String(value.frameInstruction || "").trim().slice(0, 500),
    previousFramePolicy: String(value.previousFramePolicy || "").trim().slice(0, 80),
    anchorShotNo: String(value.anchorShotNo || "").trim().slice(0, 80),
    scene: String(value.scene || "").trim().slice(0, 160),
    sceneLock: String(value.sceneLock || "").trim().slice(0, 800),
    characterLock: String(value.characterLock || "").trim().slice(0, 500),
    motionText: String(value.motionText || "").trim().slice(0, 900),
  };
}

function normalizeShotQueue(value) {
  let source = value;
  if (typeof value === "string") {
    try {
      source = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!source || typeof source !== "object" || !Array.isArray(source.shots)) {
    return null;
  }

  const shots = source.shots.slice(0, 10).map((shot, index) => {
    const prompt = String(shot?.prompt || "").trim();
    if (!prompt) {
      return null;
    }
    return {
      key: String(shot.key || `${shot.shotNo || "shot"}-${index}`).slice(0, 120),
      queueIndex: index,
      sourceIndex: Number.parseInt(shot.sourceIndex, 10) || index,
      prompt,
      shotNo: String(shot.shotNo || `镜头 ${index + 1}`).trim().slice(0, 80),
      episodeNo: Number.parseInt(shot.episodeNo, 10) || 1,
      sceneNo: Number.parseInt(shot.sceneNo, 10) || 1,
      scene: String(shot.scene || shot.sceneTitle || "").trim().slice(0, 160),
      sceneTitle: String(shot.sceneTitle || "").trim().slice(0, 160),
      characters: Array.isArray(shot.characters)
        ? shot.characters.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [],
      characterBindings: normalizeManjuCharacterBindings(shot.characterBindings),
      visual: String(shot.visual || "").trim().slice(0, 500),
      continuityLock: normalizeManjuContinuityLock(shot.continuityLock || shot.manjuContext?.continuityLock),
      manjuContext: normalizeManjuGenerationContext(shot.manjuContext || {
        type: "shot",
        title: source.title,
        category: "shot-candidate",
        shotNo: shot.shotNo,
        scene: shot.scene || shot.sceneTitle,
        queueId: source.id,
        characters: shot.characters,
        characterBindings: shot.characterBindings,
      }),
      status: ["done", "error", "pending"].includes(shot.status) ? shot.status : "pending",
      imageIds: Array.isArray(shot.imageIds) ? shot.imageIds.filter(Boolean).slice(0, 20) : [],
      error: String(shot.error || "").trim().slice(0, 500),
    };
  }).filter(Boolean);

  if (!shots.length) {
    return null;
  }

  const activeIndex = Math.min(
    shots.length - 1,
    Math.max(0, Number.parseInt(source.activeIndex, 10) || 0),
  );
  return {
    type: "yaotu-manju-shot-queue",
    queueKind: String(source.queueKind || "").trim().slice(0, 80),
    version: 1,
    id: String(source.id || `queue-${Date.now().toString(36)}`).slice(0, 120),
    title: String(source.title || "未命名漫剧").trim().slice(0, 80) || "未命名漫剧",
    project: source.project && typeof source.project === "object" ? source.project : null,
    previousFramePolicy: String(source.previousFramePolicy || "").trim().slice(0, 80),
    createdAt: String(source.createdAt || new Date().toISOString()),
    updatedAt: String(source.updatedAt || new Date().toISOString()),
    activeIndex,
    shots,
  };
}

function syncManjuProjectContext(source) {
  const project = source?.project && typeof source.project === "object" ? source.project : {};
  const title = String(project.title || source?.title || "").trim();
  if (title) {
    setCurrentManjuTitle(title);
  }

  const packSource = project.pack && typeof project.pack === "object" ? project.pack : null;
  if (packSource) {
    const packs = readManjuPacks();
    const pack = {
      ...packSource,
      id: packSource.id || packs.find((item) => item.title === title)?.id || makeManjuPackId(title),
      title: packSource.title || title,
      updatedAt: new Date().toISOString(),
    };
    writeManjuPacks([pack, ...packs.filter((item) => item.id !== pack.id && item.title !== pack.title)]);
  }

  const projectCharacters = Array.isArray(project.characters) ? project.characters : [];
  if (projectCharacters.length) {
    const existing = readManjuCharacterCards();
    const next = [...existing];
    projectCharacters.forEach((character) => {
      const normalized = normalizeManjuCharacterCard({
        ...character,
        title: character.title || title,
      });
      if (!normalized.name || !normalized.prompt) {
        return;
      }
      const index = next.findIndex((item) => (
        item.id === normalized.id
        || (item.title === normalized.title && item.name === normalized.name)
      ));
      if (index >= 0) {
        next[index] = {
          ...next[index],
          ...normalized,
          assets: {
            ...(next[index].assets || {}),
            ...(normalized.assets || {}),
          },
          updatedAt: normalized.updatedAt || next[index].updatedAt,
        };
      } else {
        next.push(normalized);
      }
    });
    writeManjuCharacterCards(next);
  }
}

function normalizeManjuGenerationContext(context) {
  if (!context || typeof context !== "object") {
    return null;
  }
  const type = String(context.type || "shot").trim();
  const category = isValidManjuArchiveCategory(context.category)
    ? context.category
    : type === "character-base" ? "character-profile" : DEFAULT_MANJU_ARCHIVE_CATEGORY;
  const characterName = String(context.characterName || "").trim().slice(0, 120);
  const characters = Array.isArray(context.characters)
    ? context.characters.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
    : [];
  if (!characters.length && characterName) {
    characters.push(characterName);
  }
  const characterBindings = normalizeManjuCharacterBindings(context.characterBindings, characters);
  return {
    type,
    title: String(context.title || getCurrentManjuTitle()).trim() || "未命名漫剧",
    category,
    characterId: String(context.characterId || "").trim().slice(0, 120),
    characterName,
    characterRole: String(context.characterRole || "").trim().slice(0, 120),
    variantId: String(context.variantId || "").trim().slice(0, 120),
    variantName: String(context.variantName || "").trim().slice(0, 120),
    shotNo: String(context.shotNo || "").trim().slice(0, 80),
    sourceShotNo: String(context.sourceShotNo || "").trim().slice(0, 80),
    scene: String(context.scene || context.sceneTitle || "").trim().slice(0, 160),
    sceneTitle: String(context.sceneTitle || "").trim().slice(0, 160),
    queueId: String(context.queueId || "").trim().slice(0, 120),
    continuityLock: normalizeManjuContinuityLock(context.continuityLock),
    characters,
    characterBindings,
  };
}

function getManjuGenerationContextForImage(image) {
  const requestContext = normalizeManjuGenerationContext(image?.request?.manjuContext || image?.params?.manjuContext);
  if (requestContext) {
    return requestContext;
  }

  const archive = readManjuArchives()[image?.id];
  if (!archive) {
    return null;
  }

  const characterAssetCategories = new Set(["character-profile", "turnaround", "detail", "expression"]);
  return normalizeManjuGenerationContext({
    type: characterAssetCategories.has(archive.category) ? "character-base" : "shot",
    title: archive.title,
    category: archive.category,
    shotNo: archive.shotNo,
    sourceShotNo: archive.sourceShotNo,
    scene: archive.scene,
    queueId: archive.queueId,
    continuityLock: archive.continuityLock,
    characterId: archive.characterId,
    characterName: archive.characterName,
    characters: archive.characters,
    variantId: archive.variantId,
    variantName: archive.variantName,
    characterBindings: archive.characterBindings,
  });
}

function normalizeManjuCharacterBindings(bindings = [], fallbackNames = []) {
  const source = Array.isArray(bindings) && bindings.length
    ? bindings
    : [];
  const normalized = source.map((binding) => {
    if (!binding || typeof binding !== "object") {
      return null;
    }
    const characterName = String(binding.characterName || binding.name || "").trim().slice(0, 120);
    const characterId = String(binding.characterId || "").trim().slice(0, 120);
    if (!characterName && !characterId) {
      return null;
    }
    const variantId = String(binding.variantId || "").trim().slice(0, 120);
    return {
      characterId,
      characterName,
      variantId: variantId || "__default",
      variantName: String(binding.variantName || (variantId ? "" : "原身")).trim().slice(0, 120) || (variantId ? "" : "原身"),
    };
  }).filter(Boolean).slice(0, 12);
  if (normalized.length) {
    return normalized;
  }
  return Array.isArray(fallbackNames)
    ? fallbackNames.map((name) => ({
      characterId: "",
      characterName: String(name || "").trim().slice(0, 120),
      variantId: "__default",
      variantName: "原身",
    })).filter((item) => item.characterName).slice(0, 12)
    : [];
}

function normalizeManjuCharacterCard(card) {
  const now = new Date().toISOString();
  return {
    id: String(card?.id || makeManjuCharacterCardId(card?.title || getCurrentManjuTitle(), card?.name || "角色")).trim(),
    title: String(card?.title || getCurrentManjuTitle()).trim() || "未命名漫剧",
    name: String(card?.name || "").trim(),
    role: String(card?.role || "").trim(),
    prompt: String(card?.prompt || "").trim(),
    assets: card?.assets && typeof card.assets === "object" ? card.assets : {},
    createdAt: String(card?.createdAt || now),
    updatedAt: String(card?.updatedAt || now),
  };
}

function applyCharacterBaseDefaults() {
  setModelInputValue("gpt-image-2");
  sizeSelect.value = "1024x1536";
  document.querySelector("#quality").value = "high";
  document.querySelector("#count").value = "4";
  document.querySelector("#background").value = "opaque";
  updateSizeUi();
}

function applyManjuCharacterReferences(context) {
  referenceImages = referenceImages.filter((image) => image.source !== "manju-auto-character-reference");
  const autoReferences = findManjuCharacterReferencesForContext(context);
  referenceImages = mergeReferencePayloads(referenceImages, autoReferences).slice(0, 16);
  renderReferenceImages();
}

function findManjuCharacterReferencesForContext(context) {
  const normalized = normalizeManjuGenerationContext(context);
  if (!normalized || normalized.type === "character-base") {
    return [];
  }
  const title = normalized.title;
  const bindings = normalized.characterBindings.length
    ? normalized.characterBindings
    : normalizeManjuCharacterBindings([], normalized.characters.length ? normalized.characters : [normalized.characterName].filter(Boolean));
  if (!bindings.length) {
    return [];
  }

  const referenceCategories = new Set(["character-profile", "turnaround", "detail", "expression"]);
  const archives = Object.values(readManjuArchives())
    .filter((record) => record.title === title && referenceCategories.has(record.category) && record.url);
  const references = [];
  bindings.forEach((binding) => {
    const name = binding.characterName;
    const key = normalizeManjuMatchKey(name);
    const matched = archives
      .filter((record) => {
        const characterMatch = binding.characterId
          ? record.characterId === binding.characterId
          : [record.characterName, record.note, record.shotNo, record.scene].map(normalizeManjuMatchKey)
            .some((field) => field && (field.includes(key) || key.includes(field)));
        return characterMatch && manjuArchiveVariantMatchesBinding(record, binding);
      })
      .slice(0, 2);
    matched.forEach((record) => {
      references.push({
        id: `manju-ref-${record.imageId}`,
        name: `${name}${binding.variantName && binding.variantName !== "原身" ? ` · ${binding.variantName}` : ""} · ${getManjuArchiveCategoryLabel(record.category)}`,
        url: record.url,
        thumb: record.url,
        source: "manju-auto-character-reference",
      });
    });
  });
  return references.slice(0, 8);
}

function manjuArchiveVariantMatchesBinding(record, binding) {
  const bindingVariantId = String(binding?.variantId || "__default").trim();
  const bindingVariantNameKey = normalizeManjuMatchKey(binding?.variantName);
  const recordVariantId = String(record?.variantId || "").trim();
  const recordVariantNameKey = normalizeManjuMatchKey(record?.variantName);
  if (!bindingVariantId || bindingVariantId === "__default") {
    return !recordVariantId && !recordVariantNameKey;
  }
  if (recordVariantId && recordVariantId === bindingVariantId) {
    return true;
  }
  return Boolean(bindingVariantNameKey && recordVariantNameKey && bindingVariantNameKey === recordVariantNameKey);
}

function mergeReferencePayloads(primary = [], secondary = []) {
  const merged = [];
  const seen = new Set();
  [...primary, ...secondary].forEach((image) => {
    if (!image || typeof image !== "object") {
      return;
    }
    const key = image.url || image.dataUrl || image.id || image.name;
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(image);
  });
  return merged;
}

function findShotQueuePreviousFrameReferences(shot) {
  const policy = shot?.continuityLock?.previousFramePolicy || activeShotQueue?.previousFramePolicy;
  if (policy !== "previous-generated" || !activeShotQueue?.shots?.length) {
    return [];
  }
  const currentIndex = activeShotQueue.shots.findIndex((item) => item.key === shot?.key);
  if (currentIndex <= 0) {
    return [];
  }
  const previous = activeShotQueue.shots
    .slice(0, currentIndex)
    .reverse()
    .find((item) => item.status === "done" && Array.isArray(item.imageIds) && item.imageIds.length > 0);
  if (!previous) {
    return [];
  }
  const archives = readManjuArchives();
  return previous.imageIds
    .slice()
    .reverse()
    .map((imageId) => archives[imageId])
    .filter((record) => record?.url)
    .slice(0, 1)
    .map((record) => ({
      id: `manju-prev-frame-${record.imageId}`,
      name: `上一帧参考 · ${previous.shotNo || record.shotNo || "连续镜头"}`,
      url: record.url,
      thumb: record.url,
      source: "manju-previous-frame-reference",
    }));
}

function normalizeManjuMatchKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s"'“”‘’《》<>【】[\]（）()：:，,。.;；、|｜/／_-]+/g, "");
}

function readActiveShotQueue() {
  return normalizeShotQueue(localStorage.getItem(MANJU_ACTIVE_SHOT_QUEUE_STORAGE_KEY));
}

function writeActiveShotQueue() {
  if (!activeShotQueue) {
    localStorage.removeItem(MANJU_ACTIVE_SHOT_QUEUE_STORAGE_KEY);
    return;
  }
  activeShotQueue.updatedAt = new Date().toISOString();
  localStorage.setItem(MANJU_ACTIVE_SHOT_QUEUE_STORAGE_KEY, JSON.stringify(activeShotQueue));
}

function getActiveShotQueueItem() {
  if (!activeShotQueue?.shots?.length) {
    return null;
  }
  activeShotQueue.activeIndex = Math.min(
    activeShotQueue.shots.length - 1,
    Math.max(0, Number.parseInt(activeShotQueue.activeIndex, 10) || 0),
  );
  return activeShotQueue.shots[activeShotQueue.activeIndex];
}

function renderShotQueuePanel() {
  if (!shotQueuePanel) {
    return;
  }
  if (!activeShotQueue?.shots?.length) {
    shotQueuePanel.hidden = true;
    document.body.classList.remove("shot-queue-mode");
    return;
  }

  const current = getActiveShotQueueItem();
  const doneCount = activeShotQueue.shots.filter((shot) => shot.status === "done").length;
  shotQueuePanel.hidden = false;
  document.body.classList.add("shot-queue-mode");
  setCurrentManjuTitle(activeShotQueue.title);
  shotQueueTitle.textContent = "连续关键帧";
  shotQueueProgress.textContent = `${doneCount} / ${activeShotQueue.shots.length}`;
  shotQueueCurrent.textContent = current
    ? `${current.shotNo} · ${current.scene || current.sceneTitle || "未指定场景"}`
    : "等待分镜";

  shotQueueList.innerHTML = "";
  activeShotQueue.shots.forEach((shot, index) => {
    const item = document.createElement("li");
    item.className = `${index === activeShotQueue.activeIndex ? "active " : ""}${shot.status}`;
    const button = document.createElement("button");
    button.type = "button";
    const shotName = document.createElement("strong");
    shotName.textContent = shot.shotNo;
    const status = document.createElement("span");
    status.textContent = shot.status === "done" ? "已生成" : shot.status === "error" ? "失败" : "待生成";
    button.append(shotName, status);
    button.title = shot.visual || shot.prompt;
    button.addEventListener("click", () => {
      activeShotQueue.activeIndex = index;
      writeActiveShotQueue();
      loadActiveShotQueuePrompt(false);
      renderShotQueuePanel();
    });
    item.append(button);
    shotQueueList.append(item);
  });

  const hasPending = activeShotQueue.shots.some((shot) => shot.status !== "done");
  loadShotQueuePromptButton.disabled = isShotQueueRunning || !current;
  generateShotQueueCurrentButton.disabled = isShotQueueRunning || !current;
  generateShotQueueAllButton.disabled = isShotQueueRunning || !hasPending;
  clearShotQueueButton.disabled = isShotQueueRunning;
}

function loadActiveShotQueuePrompt(showToast = true) {
  const shot = getActiveShotQueueItem();
  if (!shot) {
    return;
  }
  activeMode = "general";
  activePurpose = "free";
  activeStyle = "none";
  purposePreset.value = "free";
  promptInput.value = shot.prompt;
  setCurrentManjuTitle(activeShotQueue.title);
  activeManjuGenerationContext = normalizeManjuGenerationContext(shot.manjuContext || {
    type: "shot",
    title: activeShotQueue.title,
    category: "shot-candidate",
    shotNo: shot.shotNo,
    scene: shot.scene || shot.sceneTitle,
    queueId: activeShotQueue.id,
    characters: shot.characters,
  });
  applyManjuCharacterReferences(activeManjuGenerationContext);
  referenceImages = referenceImages.filter((image) => image.source !== "manju-previous-frame-reference");
  const continuityReferences = findShotQueuePreviousFrameReferences(shot);
  if (continuityReferences.length) {
    referenceImages = mergeReferencePayloads(referenceImages, continuityReferences).slice(0, 16);
    renderReferenceImages();
  }
  localStorage.setItem("yaotu-workbench-mode", activeMode);
  applyWorkbenchMode(activeMode);
  updatePromptPreview();
  if (showToast) {
    showMessage(`已载入 ${shot.shotNo} 的生图提示词。`, false);
  }
}

function applyShotQueueDefaults() {
  setModelInputValue("gpt-image-2");
  sizeSelect.value = "2160x3840";
  document.querySelector("#quality").value = "high";
  document.querySelector("#count").value = "1";
  document.querySelector("#background").value = "opaque";
  updateSizeUi();
}

function clearShotQueue() {
  if (isShotQueueRunning) {
    return;
  }
  if (!window.confirm("清空当前连续关键帧队列？已归档的候选图不会删除。")) {
    return;
  }
  activeShotQueue = null;
  writeActiveShotQueue();
  renderShotQueuePanel();
  showMessage("已清空连续关键帧队列。", false);
}

async function generateActiveShotQueueFrame(allowWhileRunning = false) {
  if (isShotQueueRunning && !allowWhileRunning) {
    return false;
  }
  const shot = getActiveShotQueueItem();
  if (!shot) {
    showMessage("当前没有可生成的分镜队列。", true);
    return false;
  }
  const shouldManageBusy = !isShotQueueRunning;
  if (shouldManageBusy) {
    isShotQueueRunning = true;
    renderShotQueuePanel();
  }

  loadActiveShotQueuePrompt(false);
  applyShotQueueDefaults();

  const payload = collectPayload();
  payload.prompt = shot.prompt;
  payload.count = 1;
  payload.referenceImages = mergeReferencePayloads(
    mergeReferencePayloads(
      payload.referenceImages,
      findManjuCharacterReferencesForContext(shot.manjuContext || activeManjuGenerationContext),
    ),
    findShotQueuePreviousFrameReferences(shot),
  );
  payload.manjuContext = normalizeManjuGenerationContext(shot.manjuContext || activeManjuGenerationContext || {
    type: "shot",
    title: activeShotQueue.title,
    category: "shot-candidate",
    shotNo: shot.shotNo,
    scene: shot.scene || shot.sceneTitle,
    queueId: activeShotQueue.id,
    characters: shot.characters,
  });
  payload.autoArchiveManju = false;

  try {
    const result = await runGeneration(payload, `正在生成 ${shot.shotNo} 关键帧。`);
    if (!result?.images?.length) {
      shot.status = "error";
      shot.error = "生成失败或没有返回图片。";
      writeActiveShotQueue();
      renderShotQueuePanel();
      return false;
    }

    archiveShotQueueImages(result.images, shot);
    shot.status = "done";
    shot.error = "";
    shot.imageIds = Array.from(new Set([...(shot.imageIds || []), ...result.images.map((image) => image.id).filter(Boolean)]));
    moveShotQueueToNextPending();
    writeActiveShotQueue();
    renderShotQueuePanel();
    await loadImages();
    showMessage(`${shot.shotNo} 已生成并归档为分镜候选。`, false);
    return true;
  } finally {
    if (shouldManageBusy) {
      isShotQueueRunning = false;
      renderShotQueuePanel();
    }
  }
}

async function generateRemainingShotQueueFrames() {
  if (!activeShotQueue?.shots?.length || isShotQueueRunning) {
    return;
  }
  isShotQueueRunning = true;
  renderShotQueuePanel();
  try {
    let generatedCount = 0;
    while (activeShotQueue?.shots?.some((shot) => shot.status !== "done")) {
      const nextIndex = activeShotQueue.shots.findIndex((shot) => shot.status !== "done");
      if (nextIndex < 0) {
        break;
      }
      activeShotQueue.activeIndex = nextIndex;
      writeActiveShotQueue();
      renderShotQueuePanel();
      const ok = await generateActiveShotQueueFrame(true);
      if (!ok) {
        break;
      }
      generatedCount += 1;
    }
    showMessage(generatedCount > 0
      ? `连续关键帧已顺序生成 ${generatedCount} 镜。`
      : "没有新的关键帧需要生成。", false);
  } finally {
    isShotQueueRunning = false;
    renderShotQueuePanel();
  }
}

function moveShotQueueToNextPending() {
  if (!activeShotQueue?.shots?.length) {
    return;
  }
  const nextIndex = activeShotQueue.shots.findIndex((shot) => shot.status !== "done");
  activeShotQueue.activeIndex = nextIndex >= 0 ? nextIndex : activeShotQueue.shots.length - 1;
}

function archiveShotQueueImages(images, shot) {
  const archives = readManjuArchives();
  const now = new Date().toISOString();
  const context = normalizeManjuGenerationContext(shot.manjuContext || {
    type: "shot",
    title: activeShotQueue.title,
    category: "shot-candidate",
    shotNo: shot.shotNo,
    scene: shot.scene || shot.sceneTitle,
    queueId: activeShotQueue.id,
    characters: shot.characters,
  });
  images.forEach((image, index) => {
    if (!image?.id) {
      return;
    }
    archives[image.id] = {
      imageId: image.id,
      title: context?.title || activeShotQueue.title,
      category: context?.category || "shot-candidate",
      note: buildManjuArchiveNote(context, index, images.length) || `${shot.shotNo}${images.length > 1 ? ` 候选${index + 1}` : ""}`,
      shotNo: context?.shotNo || shot.shotNo,
      sourceShotNo: context?.sourceShotNo || "",
      scene: context?.scene || shot.scene || shot.sceneTitle || "",
      queueId: context?.queueId || activeShotQueue.id,
      continuityLock: context?.continuityLock || shot.continuityLock || null,
      characterId: context?.characterId || "",
      characterName: context?.characterName || "",
      characters: context?.characters || [],
      characterBindings: context?.characterBindings || [],
      url: image.url || "",
      batchId: image.batchId || "",
      createdAt: image.createdAt || now,
      updatedAt: now,
    };
  });
  writeManjuArchives(archives);
  updateManjuArchiveToolbar();
}

function archiveGeneratedManjuImages(images, context) {
  const normalized = normalizeManjuGenerationContext(context);
  if (!normalized || !Array.isArray(images) || images.length === 0) {
    return false;
  }

  const archives = readManjuArchives();
  const now = new Date().toISOString();
  let archivedCount = 0;
  images.forEach((image, index) => {
    if (!image?.id) {
      return;
    }
    archives[image.id] = {
      imageId: image.id,
      title: normalized.title,
      category: normalized.category,
      note: buildManjuArchiveNote(normalized, index, images.length),
      shotNo: normalized.shotNo,
      sourceShotNo: normalized.sourceShotNo,
      scene: normalized.scene,
      queueId: normalized.queueId,
      continuityLock: normalized.continuityLock,
      characterId: normalized.characterId,
      characterName: normalized.characterName,
      characters: normalized.characters,
      characterBindings: normalized.characterBindings,
      variantId: normalized.variantId,
      variantName: normalized.variantName,
      url: image.url || "",
      batchId: image.batchId || "",
      createdAt: image.createdAt || now,
      updatedAt: now,
    };
    archivedCount += 1;
  });

  if (archivedCount === 0) {
    return false;
  }

  writeManjuArchives(archives);
  if (normalized.type === "character-base") {
    updateManjuCharacterAssetsFromImages(normalized, images);
  }
  updateManjuArchiveToolbar();
  return true;
}

function buildManjuArchiveNote(context, index, total) {
  const suffix = total > 1 ? `候选${index + 1}` : "";
  if (context?.type === "character-base") {
    return [context.characterName || "角色底图", suffix].filter(Boolean).join(" · ").slice(0, 160);
  }
  return [
    context?.shotNo || "分镜",
    context?.characters?.join("、") || "",
    suffix,
  ].filter(Boolean).join(" · ").slice(0, 160);
}

function updateManjuCharacterAssetsFromImages(context, images) {
  const characterName = context?.characterName || "";
  if (!characterName || !Array.isArray(images) || images.length === 0) {
    return;
  }

  const cards = readManjuCharacterCards();
  const title = context.title || getCurrentManjuTitle();
  const index = cards.findIndex((card) => (
    (context.characterId && card.id === context.characterId)
    || (card.title === title && normalizeManjuMatchKey(card.name) === normalizeManjuMatchKey(characterName))
  ));
  if (index < 0) {
    return;
  }

  const existing = cards[index];
  const baseImages = images
    .filter((image) => image?.id)
    .map((image) => ({
      imageId: image.id,
      url: image.url || "",
      batchId: image.batchId || "",
      createdAt: image.createdAt || new Date().toISOString(),
    }));
  const previousBaseImages = Array.isArray(existing.assets?.baseImages) ? existing.assets.baseImages : [];
  cards[index] = {
    ...existing,
    assets: {
      ...(existing.assets || {}),
      primaryImageId: existing.assets?.primaryImageId || baseImages[0]?.imageId || "",
      baseImages: [...baseImages, ...previousBaseImages]
        .filter((item, itemIndex, list) => item?.imageId && list.findIndex((other) => other.imageId === item.imageId) === itemIndex)
        .slice(0, 24),
    },
    updatedAt: new Date().toISOString(),
  };
  writeManjuCharacterCards(cards);
}

function applyWorkbenchMode() {
  document.body.classList.remove("manju-mode");
  promptLabel.textContent = "画面方向";
  promptInput.placeholder = "例如：深色 AI 图片管理工具背景，带细腻玻璃质感、微弱数据流，中心和右侧留出干净区域，适合承载软件面板。";
  updateManjuArchiveToolbar();
}

function openApiSettings() {
  apiSettingsModal.classList.add("open");
  apiSettingsModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  renderProfiles();
  loadUpdateStatus();
}

function closeApiSettings() {
  apiSettingsModal.classList.remove("open");
  apiSettingsModal.setAttribute("aria-hidden", "true");
  if (!previewModal.classList.contains("open")) {
    document.body.style.overflow = "";
  }
}

function readManjuPacks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MANJU_PACKS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
  } catch {
    return [];
  }
}

function writeManjuPacks(packs) {
  localStorage.setItem(MANJU_PACKS_STORAGE_KEY, JSON.stringify(packs.slice(0, 80)));
}

function makeManjuPackId(title) {
  const normalized = String(title || "manju-pack")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "manju-pack";
  return `${normalized}-${Date.now().toString(36)}`;
}

function readManjuCharacterCards() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MANJU_CHARACTER_CARDS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
  } catch {
    return [];
  }
}

function writeManjuCharacterCards(cards) {
  localStorage.setItem(MANJU_CHARACTER_CARDS_STORAGE_KEY, JSON.stringify(cards.slice(0, 300)));
}

function makeManjuCharacterCardId(title, name) {
  const normalized = `${title || "manju"}-${name || "character"}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "manju-character";
  return `${normalized}-${Date.now().toString(36)}`;
}

function getManjuCharacterCardsForTitle(title = getCurrentManjuTitle()) {
  return readManjuCharacterCards()
    .filter((card) => card.title === title)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-Hans-CN"));
}

function getCurrentManjuTitle() {
  return activeManjuProjectTitle.trim() || "未命名漫剧";
}

function setCurrentManjuTitle(title) {
  activeManjuProjectTitle = String(title || "").trim();
  if (activeManjuProjectTitle) {
    localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, activeManjuProjectTitle);
  }
}

function isValidManjuArchiveCategory(value) {
  return MANJU_ARCHIVE_CATEGORIES.some((category) => category.value === value);
}

function getManjuArchiveCategoryLabel(value) {
  return MANJU_ARCHIVE_CATEGORIES.find((category) => category.value === value)?.label || "分镜候选";
}

function normalizeManjuArchiveRecord(item, fallbackImageId = "") {
  if (!item || typeof item !== "object") {
    return null;
  }
  const imageId = String(item.imageId || fallbackImageId || "").trim();
  if (!imageId) {
    return null;
  }
  const category = isValidManjuArchiveCategory(item.category) ? item.category : DEFAULT_MANJU_ARCHIVE_CATEGORY;
  const characters = Array.isArray(item.characters)
    ? item.characters.map((name) => String(name || "").trim()).filter(Boolean).slice(0, 12)
    : [];
  return {
    imageId,
    title: String(item.title || "未命名漫剧").trim() || "未命名漫剧",
    category,
    note: String(item.note || "").trim().slice(0, 160),
    shotNo: String(item.shotNo || "").trim().slice(0, 80),
    sourceShotNo: String(item.sourceShotNo || "").trim().slice(0, 80),
    scene: String(item.scene || "").trim().slice(0, 160),
    queueId: String(item.queueId || "").trim().slice(0, 120),
    continuityLock: normalizeManjuContinuityLock(item.continuityLock),
    characterId: String(item.characterId || "").trim().slice(0, 120),
    characterName: String(item.characterName || "").trim().slice(0, 120),
    characters,
    characterBindings: normalizeManjuCharacterBindings(item.characterBindings, characters),
    variantId: String(item.variantId || "").trim().slice(0, 120),
    variantName: String(item.variantName || "").trim().slice(0, 120),
    url: String(item.url || ""),
    batchId: String(item.batchId || ""),
    createdAt: String(item.createdAt || ""),
    updatedAt: String(item.updatedAt || ""),
  };
}

function readManjuArchives() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MANJU_ARCHIVES_STORAGE_KEY) || "{}");
    const records = Array.isArray(parsed)
      ? parsed
      : Object.entries(parsed || {}).map(([imageId, item]) => ({ ...item, imageId: item?.imageId || imageId }));
    return records.reduce((acc, item) => {
      const record = normalizeManjuArchiveRecord(item);
      if (record) {
        acc[record.imageId] = record;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function writeManjuArchives(archives) {
  const entries = Object.values(archives || {})
    .map((item) => normalizeManjuArchiveRecord(item))
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 2000);
  const nextArchives = entries.reduce((acc, item) => {
    acc[item.imageId] = item;
    return acc;
  }, {});
  localStorage.setItem(MANJU_ARCHIVES_STORAGE_KEY, JSON.stringify(nextArchives));
}

function makeManjuTitleFilterValue(title) {
  return `title:${title}`;
}

function parseManjuTitleFilterValue(value) {
  return String(value || "").startsWith("title:") ? String(value).slice(6) : "";
}

function renderManjuArchiveTitleOptions(archives) {
  const previousValue = manjuArchiveTitleFilter.value || MANJU_ARCHIVE_ALL_VALUE;
  const currentTitle = getCurrentManjuTitle();
  const titles = Array.from(new Set([
    currentTitle,
    ...Object.values(archives).map((item) => item.title).filter(Boolean),
  ])).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

  manjuArchiveTitleFilter.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = MANJU_ARCHIVE_ALL_VALUE;
  allOption.textContent = "全部剧名";
  manjuArchiveTitleFilter.append(allOption);

  titles.forEach((title) => {
    const option = document.createElement("option");
    option.value = makeManjuTitleFilterValue(title);
    option.textContent = title;
    manjuArchiveTitleFilter.append(option);
  });

  const hasPrevious = Array.from(manjuArchiveTitleFilter.options).some((option) => option.value === previousValue);
  manjuArchiveTitleFilter.value = hasPrevious ? previousValue : MANJU_ARCHIVE_ALL_VALUE;
}

function archiveRecordMatchesFilters(record, titleFilter, categoryFilter) {
  if (!record) {
    return false;
  }
  if (titleFilter && record.title !== titleFilter) {
    return false;
  }
  if (categoryFilter !== MANJU_ARCHIVE_ALL_VALUE && record.category !== categoryFilter) {
    return false;
  }
  return true;
}

function isManjuArchiveFilterActive() {
  return manjuArchiveTitleFilter.value !== MANJU_ARCHIVE_ALL_VALUE
    || manjuArchiveCategoryFilter.value !== MANJU_ARCHIVE_ALL_VALUE;
}

function filterManjuGalleryImages(images, archives = readManjuArchives()) {
  if (!isManjuArchiveFilterActive()) {
    return images;
  }
  const titleFilter = parseManjuTitleFilterValue(manjuArchiveTitleFilter.value);
  const categoryFilter = manjuArchiveCategoryFilter.value || MANJU_ARCHIVE_ALL_VALUE;
  return images.filter((image) => archiveRecordMatchesFilters(archives[image.id], titleFilter, categoryFilter));
}

function getManjuArchiveRecordsForTitle(title = getCurrentManjuTitle()) {
  return Object.values(readManjuArchives())
    .filter((item) => item.title === title)
    .sort((a, b) => String(a.updatedAt || "").localeCompare(String(b.updatedAt || "")));
}

function updateManjuArchiveToolbar() {
  if (!manjuGalleryTools) {
    return;
  }

  const archives = readManjuArchives();
  const records = Object.values(archives);
  const currentTitle = getCurrentManjuTitle();
  const currentTitleHasArchives = records.some((item) => item.title === currentTitle);
  const showManjuTools = Boolean(activeShotQueue?.shots?.length) || currentTitleHasArchives;
  manjuGalleryTools.hidden = !showManjuTools;
  manjuArchiveActiveTitle.textContent = currentTitle;
  renderManjuArchiveTitleOptions(archives);

  const titleFilter = parseManjuTitleFilterValue(manjuArchiveTitleFilter.value);
  const categoryFilter = manjuArchiveCategoryFilter.value || MANJU_ARCHIVE_ALL_VALUE;
  const currentTitleCount = records.filter((item) => item.title === currentTitle).length;
  const filteredCount = records.filter((item) => archiveRecordMatchesFilters(item, titleFilter, categoryFilter)).length;
  const filterActive = isManjuArchiveFilterActive();
  manjuArchiveSummary.textContent = filterActive
    ? `归档 ${records.length} 张 · 筛选 ${filteredCount} 张 · 当前页 ${galleryImages.length} 张`
    : `归档 ${records.length} 张 · 本剧 ${currentTitleCount} 张`;
  clearManjuArchiveFilterButton.disabled = !filterActive;
  exportManjuArchiveButton.disabled = !showManjuTools || currentTitleCount === 0;
  renderArchiveQuickPanel(archives);
}

function renderArchiveQuickPanel(archives = readManjuArchives()) {
  if (!archiveQuickPanel || !archiveQuickGroups) {
    return;
  }
  const title = getCurrentManjuTitle();
  const records = Object.values(archives)
    .filter((record) => record.title === title && record.url)
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  const characterRecords = records
    .filter((record) => ["character-profile", "turnaround", "detail", "expression"].includes(record.category))
    .slice(0, 12);
  const sceneRecords = records
    .filter((record) => record.category === "scene")
    .slice(0, 12);
  const showPanel = Boolean(activeShotQueue?.shots?.length)
    || characterRecords.length > 0
    || sceneRecords.length > 0;
  archiveQuickPanel.hidden = !showPanel;
  if (!showPanel) {
    return;
  }

  archiveQuickGroups.innerHTML = "";
  archiveQuickGroups.append(
    createArchiveQuickGroup("角色", characterRecords, "还没有归档角色图。"),
    createArchiveQuickGroup("场景", sceneRecords, "还没有归档场景图。"),
  );
}

function createArchiveQuickGroup(title, records, emptyText) {
  const group = document.createElement("div");
  group.className = "archive-quick-group";
  const head = document.createElement("div");
  head.className = "archive-quick-group-head";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const count = document.createElement("span");
  count.textContent = `${records.length} 张`;
  head.append(strong, count);

  const list = document.createElement("div");
  list.className = "archive-quick-list";
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "archive-quick-empty";
    empty.textContent = emptyText;
    list.append(empty);
  } else {
    records.forEach((record) => {
      list.append(createArchiveQuickItem(record));
    });
  }

  group.append(head, list);
  return group;
}

function createArchiveQuickItem(record) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "archive-quick-item";
  item.title = [getManjuArchiveCategoryLabel(record.category), record.note, record.characterName, record.scene].filter(Boolean).join(" · ");
  const img = document.createElement("img");
  img.src = record.url;
  img.alt = record.note || getManjuArchiveCategoryLabel(record.category);
  const text = document.createElement("span");
  text.textContent = clipClientText(record.note || record.characterName || record.scene || record.shotNo || record.imageId, 30);
  item.append(img, text);
  item.addEventListener("click", () => addArchiveRecordReference(record));
  return item;
}

function addArchiveRecordReference(record) {
  if (!record?.url) {
    showMessage("这条归档没有可用图片地址。", true);
    return;
  }
  referenceImages = mergeReferencePayloads(referenceImages, [{
    id: `archive-ref-${record.imageId}`,
    name: [getManjuArchiveCategoryLabel(record.category), record.note || record.characterName || record.scene || record.imageId].filter(Boolean).join(" · "),
    url: record.url,
    thumb: record.url,
    source: "manju-archive-quick-reference",
  }]).slice(0, 16);
  renderReferenceImages();
  showMessage("已加入参考图。", false);
}

function clipClientText(value, maxLength = 36) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text || text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(1, maxLength - 1))}…`;
}

async function archiveManjuImage(image, category, note = "") {
  if (!image?.id) {
    showMessage("这张图没有可归档的本地记录。", true);
    return;
  }

  const nextCategory = isValidManjuArchiveCategory(category) ? category : DEFAULT_MANJU_ARCHIVE_CATEGORY;
  const archives = readManjuArchives();
  const previous = archives[image.id] || {};
  const requestContext = normalizeManjuGenerationContext(image.request?.manjuContext || image.params?.manjuContext);
  archives[image.id] = {
    imageId: image.id,
    title: requestContext?.title || getCurrentManjuTitle(),
    category: nextCategory,
    note: String(note || "").trim(),
    shotNo: previous.shotNo || requestContext?.shotNo || "",
    sourceShotNo: previous.sourceShotNo || requestContext?.sourceShotNo || "",
    scene: previous.scene || requestContext?.scene || "",
    queueId: previous.queueId || requestContext?.queueId || "",
    continuityLock: previous.continuityLock || requestContext?.continuityLock || null,
    characterId: previous.characterId || requestContext?.characterId || "",
    characterName: previous.characterName || requestContext?.characterName || "",
    characters: previous.characters?.length ? previous.characters : requestContext?.characters || [],
    characterBindings: previous.characterBindings?.length ? previous.characterBindings : requestContext?.characterBindings || [],
    variantId: previous.variantId || requestContext?.variantId || "",
    variantName: previous.variantName || requestContext?.variantName || "",
    url: image.url || "",
    batchId: image.batchId || "",
    createdAt: image.createdAt || previous.createdAt || "",
    updatedAt: new Date().toISOString(),
  };
  writeManjuArchives(archives);
  updateManjuArchiveToolbar();
  await loadImages();
  showMessage(`已归档到「${archives[image.id].title} / ${getManjuArchiveCategoryLabel(nextCategory)}」。`, false);
}

function archiveDerivedManjuImages(sourceImage, generatedImages, actionLabel, preferredCategory = "") {
  if (!sourceImage?.id || !Array.isArray(generatedImages) || generatedImages.length === 0) {
    return false;
  }

  const archives = readManjuArchives();
  const source = archives[sourceImage.id];
  if (!source) {
    return false;
  }

  const now = new Date().toISOString();
  const category = isValidManjuArchiveCategory(preferredCategory) ? preferredCategory : source.category;
  let archivedCount = 0;
  generatedImages.forEach((image, index) => {
    if (!image?.id) {
      return;
    }
    archives[image.id] = {
      imageId: image.id,
      title: source.title || getCurrentManjuTitle(),
      category,
      note: buildDerivedManjuArchiveNote(source, actionLabel, index, generatedImages.length),
      shotNo: source.shotNo || "",
      sourceShotNo: source.sourceShotNo || "",
      scene: source.scene || "",
      queueId: source.queueId || "",
      continuityLock: source.continuityLock || null,
      characterId: source.characterId || "",
      characterName: source.characterName || "",
      characters: source.characters || [],
      characterBindings: source.characterBindings || [],
      variantId: source.variantId || "",
      variantName: source.variantName || "",
      url: image.url || "",
      batchId: image.batchId || "",
      createdAt: image.createdAt || now,
      updatedAt: now,
    };
    archivedCount += 1;
  });

  if (archivedCount === 0) {
    return false;
  }
  writeManjuArchives(archives);
  updateManjuArchiveToolbar();
  return true;
}

function buildDerivedManjuArchiveNote(source, actionLabel, index, total) {
  const suffix = total > 1 ? `${actionLabel}${index + 1}` : actionLabel;
  return [source.note || source.shotNo || "", suffix].filter(Boolean).join(" · ").slice(0, 160);
}

function getDerivedManjuArchiveCategory(image, action) {
  const record = readManjuArchives()[image?.id];
  if (!record) {
    return "";
  }
  if (action === "upscale") {
    return record.category;
  }
  return ["shot-candidate", "shot-final", "discarded"].includes(record.category)
    ? "shot-candidate"
    : record.category;
}

async function removeManjuImageArchive(image) {
  if (!image?.id) {
    return;
  }
  const archives = readManjuArchives();
  delete archives[image.id];
  writeManjuArchives(archives);
  updateManjuArchiveToolbar();
  await loadImages();
  showMessage("已取消这张图的漫剧归档。", false);
}

function pruneManjuArchives(imageIds) {
  const ids = new Set((imageIds || []).filter(Boolean));
  if (ids.size === 0) {
    return;
  }
  const archives = readManjuArchives();
  let changed = false;
  ids.forEach((id) => {
    if (archives[id]) {
      delete archives[id];
      changed = true;
    }
  });
  if (changed) {
    writeManjuArchives(archives);
    updateManjuArchiveToolbar();
  }
}

async function exportCurrentManjuArchive() {
  const title = getCurrentManjuTitle();
  const archives = getManjuArchiveRecordsForTitle(title);
  if (archives.length === 0) {
    showMessage("先把本剧图片归档后，再导出图集包。", true);
    return;
  }

  const originalText = exportManjuArchiveButton.textContent;
  exportManjuArchiveButton.disabled = true;
  exportManjuArchiveButton.textContent = "导出中";

  try {
    const storedPack = readManjuPacks().find((item) => item.title === title);
    const pack = {
      ...(storedPack || {}),
      title,
      activeFormulaPreset: storedPack?.formulaPreset || "shot",
    };
    const result = await fetchJson("/api/manju/archive/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        pack: {
          ...pack,
          characters: getManjuCharacterCardsForTitle(title),
        },
        archives,
        categories: MANJU_ARCHIVE_CATEGORIES,
      }),
    }, 30000);

    const skippedCount = Array.isArray(result.skipped) ? result.skipped.length : Number(result.skipped || 0);
    showMessage(`已导出「${title}」图集：复制 ${result.copied || 0} 张，跳过 ${skippedCount} 张。目录：${result.exportDir}`, skippedCount > 0);
  } catch (error) {
    showMessage(normalizeFrontendError(error, "导出漫剧图集失败。"), true);
  } finally {
    exportManjuArchiveButton.textContent = originalText;
    updateManjuArchiveToolbar();
  }
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
  await loadUpdateStatus();
  await loadImages();
  renderReferenceImages();
  renderAnalysisImages();
}

async function loadConfig() {
  try {
    const config = await fetchJson("/api/config", {}, 5000);
    if (config.defaultModel) {
      setModelInputValue(config.defaultModel);
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

async function loadUpdateStatus() {
  try {
    const status = await fetchJson("/api/update/status", {}, 5000);
    renderUpdateStatus(status);
  } catch (error) {
    renderUpdateStatus({
      enabled: false,
      status: "error",
      error: normalizeFrontendError(error, "读取更新状态失败。"),
    });
  }
}

async function checkForAppUpdates() {
  checkUpdateButton.disabled = true;
  renderUpdateStatus({ enabled: true, status: "checking" });
  showApiMessage("正在检查软件更新。", false);
  try {
    const result = await fetchJson("/api/update/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }, 70000);
    renderUpdateStatus(result);
    if (result.status === "available") {
      showApiMessage(`发现新版本：${result.availableVersion || "可用更新"}。请按弹窗提示下载。`, false);
    } else if (result.status === "not-available") {
      showApiMessage(`已是最新版本：${result.latestVersion || result.version || "当前版本"}。`, false);
    } else if (result.status === "downloaded") {
      showApiMessage("更新已下载，请按弹窗提示重启安装。", false);
    } else {
      showApiMessage(result.message || result.reason || result.error || "更新检查未完成。", !result.ok);
    }
  } catch (error) {
    const message = normalizeFrontendError(error, "检查更新失败。");
    renderUpdateStatus({ enabled: false, status: "error", error: message });
    showApiMessage(message, true);
  } finally {
    checkUpdateButton.disabled = false;
  }
}

function renderUpdateStatus(status = {}) {
  const currentVersion = status.version ? `当前 ${status.version}` : "";
  const checkedAt = status.checkedAt ? `，检查时间 ${formatDateTime(status.checkedAt)}` : "";
  let text = "";

  if (status.status === "checking" || status.checking) {
    text = "正在检查更新...";
  } else if (status.status === "available") {
    text = `发现新版本 ${status.availableVersion || ""}${checkedAt}`;
  } else if (status.status === "downloaded") {
    text = `更新 ${status.availableVersion || ""} 已下载，等待重启安装`;
  } else if (status.status === "not-available") {
    text = `已是最新版本 ${status.latestVersion || status.version || ""}${checkedAt}`;
  } else if (status.status === "disabled" || status.enabled === false) {
    text = `当前环境不可自动更新：${status.reason || status.message || "未启用"}${currentVersion ? `（${currentVersion}）` : ""}`;
  } else if (status.status === "error") {
    text = `更新检查失败：${status.error || status.message || "未知错误"}`;
  } else {
    text = `自动更新已启用${currentVersion ? `（${currentVersion}）` : ""}`;
  }

  updateStatusText.textContent = text;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value || "");
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}

async function loadApiSettings() {
  try {
    apiSettings = await fetchJson("/api/settings", {}, 8000);
    if (!Array.isArray(apiSettings.profiles)) {
      throw new Error("本地服务返回的 API 配置格式不正确。");
    }
    renderProfiles();
    fillAuxiliaryForm(apiSettings.auxiliary);
    renderAuxiliaryProfiles();
    renderStylePresets();
    renderSavedPrompts();
    renderRecentPrompts();
    showApiMessage("配置已加载。", false);
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "读取 API 配置失败。"), true);
  }
}

function renderProfiles() {
  const activeId = apiSettings.activeProfileId || apiSettings.profiles[0]?.id || "";
  renderProfileOptions(profileSelect, apiSettings.profiles);
  renderProfileOptions(apiProfileManagerSelect, apiSettings.profiles);
  profileSelect.value = activeId;
  apiProfileManagerSelect.value = activeId;
  fillApiForm(getManagedProfile());
  updateProfileActions();
}

function renderAuxiliaryProfiles() {
  const profiles = apiSettings.auxiliaryProfiles || [];
  const activeId = apiSettings.activeAuxiliaryProfileId || apiSettings.auxiliary?.id || profiles[0]?.id || "";
  renderProfileOptions(auxProfileManagerSelect, profiles);
  auxProfileManagerSelect.value = activeId;
  fillAuxiliaryForm(getManagedAuxiliaryProfile() || apiSettings.auxiliary);
  updateAuxiliaryProfileActions();
}

function renderProfileOptions(select, profiles) {
  select.innerHTML = "";
  profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name || profile.id;
    select.append(option);
  });
}

function fillApiForm(profile) {
  if (!profile) {
    apiProfileName.value = "默认配置";
    apiBaseUrl.value = "https://api.openai.com";
    apiImageModel.value = "gpt-image-2";
    apiEndpointMode.value = "images";
    syncModelForEndpointMode();
    syncImageModelSelect();
    syncMainModelWithApiDefault();
    apiKey.value = "";
    apiKey.placeholder = "粘贴 API Key";
    return;
  }

  apiProfileName.value = profile.name || "";
  apiBaseUrl.value = profile.baseUrl || "";
  apiImageModel.value = profile.imageModel || "gpt-image-2";
  apiEndpointMode.value = profile.endpointMode || "images";
  syncModelForEndpointMode();
  syncImageModelSelect();
  syncMainModelWithApiDefault();
  apiKey.value = "";
  apiKey.placeholder = profile.hasApiKey ? `已保存 ${profile.apiKeyMask}，留空则保留` : "粘贴 API Key";
}

function syncModelForEndpointMode() {
  syncImageModelSelect();
  syncMainModelWithApiDefault();
}

function syncMainModelWithApiDefault() {
  const model = apiImageModel.value.trim();
  if (model) {
    setModelInputValue(model);
  }
}

function setModelInputValue(model) {
  modelSelect.value = model || "gpt-image-2";
  updateSizeUi();
}

function renderImageModelOptions(models = []) {
  apiImageModelSelect.innerHTML = "";
  const manualOption = document.createElement("option");
  manualOption.value = "";
  manualOption.textContent = models.length > 0 ? "手动输入 / 不使用列表" : "先拉取模型";
  apiImageModelSelect.append(manualOption);

  models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    apiImageModelSelect.append(option);
  });
  apiImageModelSelect.disabled = models.length === 0;
  syncImageModelSelect();
}

function syncImageModelSelect() {
  const current = apiImageModel.value.trim();
  const values = Array.from(apiImageModelSelect.options).map((option) => option.value);
  apiImageModelSelect.value = values.includes(current) ? current : "";
}

function fillAuxiliaryForm(auxiliary = {}) {
  auxProfileName.value = auxiliary.name || "辅助 API";
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

function renderPromptLexicon() {
  lexiconCategorySelect.innerHTML = "";
  promptLexiconGroups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.label;
    lexiconCategorySelect.append(option);
  });
  renderPromptLexiconItems();
}

function renderPromptLexiconItems() {
  const group = promptLexiconGroups.find((item) => item.id === lexiconCategorySelect.value) || promptLexiconGroups[0];
  lexiconChipList.innerHTML = "";
  (group?.items || []).forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "lexicon-chip";

    const insertButton = document.createElement("button");
    insertButton.type = "button";
    insertButton.textContent = item.label;
    insertButton.title = item.text;
    insertButton.addEventListener("click", () => insertPromptText(item.text));

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "lexicon-save";
    saveButton.textContent = "☆";
    saveButton.title = "收藏到提示词";
    saveButton.addEventListener("click", () => saveSavedPrompt({
      name: `${group.label} · ${item.label}`,
      text: item.text,
      mode: "lexicon",
      source: `lexicon:${group.id}`,
    }));

    chip.append(insertButton, saveButton);
    lexiconChipList.append(chip);
  });
}

function insertPromptText(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    return;
  }
  promptInput.value = promptInput.value.trim()
    ? `${promptInput.value.trim()}，${cleanText}`
    : cleanText;
  promptInput.focus();
  updatePromptPreview();
  showMessage("已插入常用提示词。", false);
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
    savedPromptList.append(renderPromptCard(item, {
      deleteLabel: "删除",
      onDelete: () => deleteSavedPrompt(item.id),
    }));
  });
}

function renderRecentPrompts() {
  const prompts = apiSettings.recentPrompts || [];
  recentPromptList.innerHTML = "";
  recentPromptCount.textContent = String(prompts.length);

  if (prompts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "saved-empty";
    empty.textContent = "还没有最近使用记录。";
    recentPromptList.append(empty);
    return;
  }

  prompts.forEach((item) => {
    recentPromptList.append(renderPromptCard(item, {
      deleteLabel: "移除",
      onDelete: () => deleteRecentPrompt(item.id),
      includeSave: true,
    }));
  });
}

function renderPromptCard(item, options = {}) {
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

  actions.append(useButton, appendButton);
  if (options.includeSave) {
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "收藏";
    saveButton.addEventListener("click", () => saveSavedPrompt({
      name: item.name || "最近提示词",
      text: item.text,
      mode: item.mode || "recent",
      source: "recent-to-favorite",
    }));
    actions.append(saveButton);
  }

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "danger-action";
  deleteButton.textContent = options.deleteLabel || "删除";
  deleteButton.addEventListener("click", options.onDelete || (() => deleteSavedPrompt(item.id)));

  actions.append(deleteButton);
  card.append(title, preview, actions);
  return card;
}

function getSelectedProfile() {
  return apiSettings.profiles.find((profile) => profile.id === profileSelect.value) || apiSettings.profiles[0];
}

function getManagedProfile() {
  return apiSettings.profiles.find((profile) => profile.id === apiProfileManagerSelect.value);
}

function getManagedAuxiliaryProfile() {
  return (apiSettings.auxiliaryProfiles || []).find((profile) => profile.id === auxProfileManagerSelect.value);
}

function createNewAuxiliaryProfileDraft() {
  const id = `aux-${Date.now()}`;
  const option = document.createElement("option");
  option.value = id;
  option.textContent = "新辅助配置";
  auxProfileManagerSelect.append(option);
  auxProfileManagerSelect.value = id;
  auxProfileName.value = "新辅助配置";
  auxUseActiveProfile.checked = false;
  auxBaseUrl.value = "https://api.openai.com";
  auxApiKey.value = "";
  auxApiKey.placeholder = "粘贴辅助 API Key";
  auxModel.value = "gpt-4o-mini";
  renderAuxiliaryModelOptions([]);
  updateAuxiliaryUi();
  updateAuxiliaryProfileActions();
  showApiMessage("填写后保存即可作为新的辅助 API 配置使用。", false);
}

function updateAuxiliaryProfileActions() {
  const profiles = apiSettings.auxiliaryProfiles || [];
  const managedProfile = getManagedAuxiliaryProfile();
  deleteAuxProfileButton.disabled = profiles.length <= 1 && Boolean(managedProfile);
}

function createNewProfileDraft() {
  const id = `profile-${Date.now()}`;
  const option = document.createElement("option");
  option.value = id;
  option.textContent = "新配置";
  apiProfileManagerSelect.append(option);
  apiProfileManagerSelect.value = id;
  apiProfileName.value = "新配置";
  apiBaseUrl.value = "https://api.openai.com";
  apiImageModel.value = "gpt-image-2";
  apiEndpointMode.value = "images";
  apiKey.value = "";
  apiKey.placeholder = "粘贴 API Key";
  updateProfileActions();
  showApiMessage("填写后保存并启用。Kirby 这类中转如果 Images API 不通，可以把“生图接口”切到聊天兼容。", false);
}

function syncManagerProfileSelection() {
  fillApiForm(getManagedProfile());
  updateProfileActions();
}

function updateProfileActions() {
  const profiles = apiSettings.profiles || [];
  const managedProfile = getManagedProfile();
  deleteProfileButton.disabled = profiles.length <= 1 && Boolean(managedProfile);
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
    renderProfiles();
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
    renderAuxiliaryProfiles();
    await loadConfig();
    showApiMessage("已保存并启用。", false);
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "保存 API 配置失败。"), true);
  } finally {
    saveApiButton.disabled = false;
  }
}

async function deleteActiveProfile() {
  const profile = getManagedProfile();
  if (!profile) {
    const selectedOption = apiProfileManagerSelect.selectedOptions[0];
    selectedOption?.remove();
    apiProfileManagerSelect.value = apiSettings.activeProfileId || apiSettings.profiles[0]?.id || "";
    fillApiForm(getManagedProfile());
    updateProfileActions();
    showApiMessage("未保存的新配置已移除。", false);
    return;
  }
  if ((apiSettings.profiles || []).length <= 1) {
    showApiMessage("至少需要保留一个 API 配置。", true);
    return;
  }
  if (!window.confirm(`确定删除 API 配置“${profile.name || profile.id}”吗？`)) {
    return;
  }

  try {
    deleteProfileButton.disabled = true;
    apiSettings = await fetchJson("/api/settings/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id }),
    });
    renderProfiles();
    fillAuxiliaryForm(apiSettings.auxiliary);
    renderAuxiliaryProfiles();
    await loadConfig();
    showApiMessage("配置已删除。", false);
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "删除 API 配置失败。"), true);
  } finally {
    updateProfileActions();
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

async function activateSelectedAuxiliaryProfile() {
  const profile = getManagedAuxiliaryProfile();
  fillAuxiliaryForm(profile || {});
  updateAuxiliaryProfileActions();
  if (!profile) {
    return;
  }

  try {
    apiSettings = await fetchJson("/api/auxiliary-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: profile.id,
        name: profile.name,
        useActiveProfile: profile.useActiveProfile,
        baseUrl: profile.baseUrl,
        model: profile.model,
        setActive: true,
      }),
    });
    renderAuxiliaryProfiles();
    showApiMessage(`已启用辅助配置：${profile.name || profile.model}`, false);
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "启用辅助 API 配置失败。"), true);
  }
}

async function deleteActiveAuxiliaryProfile() {
  const profile = getManagedAuxiliaryProfile();
  if (!profile) {
    const selectedOption = auxProfileManagerSelect.selectedOptions[0];
    selectedOption?.remove();
    auxProfileManagerSelect.value = apiSettings.activeAuxiliaryProfileId || apiSettings.auxiliaryProfiles?.[0]?.id || "";
    fillAuxiliaryForm(getManagedAuxiliaryProfile() || apiSettings.auxiliary);
    updateAuxiliaryProfileActions();
    showApiMessage("未保存的新辅助配置已移除。", false);
    return;
  }
  if ((apiSettings.auxiliaryProfiles || []).length <= 1) {
    showApiMessage("至少需要保留一个辅助 API 配置。", true);
    return;
  }
  if (!window.confirm(`确定删除辅助 API 配置“${profile.name || profile.id}”吗？`)) {
    return;
  }

  try {
    deleteAuxProfileButton.disabled = true;
    apiSettings = await fetchJson("/api/auxiliary-settings/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id }),
    });
    renderAuxiliaryProfiles();
    showApiMessage("辅助 API 配置已删除。", false);
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "删除辅助 API 配置失败。"), true);
  } finally {
    updateAuxiliaryProfileActions();
  }
}

async function loadImageModels() {
  try {
    loadImageModelsButton.disabled = true;
    showApiMessage("正在拉取生图 API 模型列表。", false);
    const result = await fetchJson("/api/image-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectApiSettingsPayload()),
    }, 40000);

    if (!result.ok) {
      showApiMessage(`拉取模型失败：${result.error || "未知错误"}\nEndpoint: ${result.endpoint || ""}`, true);
      return;
    }

    renderImageModelOptions(result.models || []);
    if (!apiImageModel.value.trim() && result.models?.length) {
      apiImageModel.value = result.models[0];
      syncImageModelSelect();
      syncMainModelWithApiDefault();
    }
    showApiMessage(`已拉取 ${result.modelCount || 0} 个生图模型。可在“已拉取模型”下拉框选择，或继续手动输入。\nEndpoint: ${result.endpoint}`, false);
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "拉取生图模型失败。"), true);
  } finally {
    loadImageModelsButton.disabled = false;
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
    renderAuxiliaryProfiles();
    showApiMessage(`辅助 API 已保存：${apiSettings.auxiliary?.name || apiSettings.auxiliary?.model || auxModel.value}`, false);
  } catch (error) {
    showApiMessage(normalizeFrontendError(error, "保存辅助 API 失败。"), true);
  } finally {
    saveAuxButton.disabled = false;
  }
}

function collectApiSettingsPayload() {
  return {
    profileId: apiProfileManagerSelect.value || `profile-${Date.now()}`,
    name: apiProfileName.value.trim() || "API Profile",
    baseUrl: apiBaseUrl.value.trim(),
    apiKey: apiKey.value.trim(),
    imageModel: apiImageModel.value.trim() || "gpt-image-2",
    endpointMode: apiEndpointMode.value,
    setActive: true,
    auxiliary: collectAuxiliaryPayload(),
  };
}

function collectAuxiliaryPayload() {
  return {
    profileId: auxProfileManagerSelect.value || `aux-${Date.now()}`,
    name: auxProfileName.value.trim() || "辅助 API",
    useActiveProfile: auxUseActiveProfile.checked,
    baseUrl: auxBaseUrl.value.trim(),
    apiKey: auxApiKey.value.trim(),
    model: auxModel.value.trim() || "gpt-4o-mini",
    setActive: true,
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

async function runGeneration(payload, statusText, options = {}) {
  setBusy(true);
  showMessage(statusText, false);
  const requestPayload = { ...payload };
  const shouldAutoArchiveManju = options.autoArchiveManju !== false
    && requestPayload.autoArchiveManju !== false;
  delete requestPayload.autoArchiveManju;

  try {
    const result = await fetchJson("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    }, 620000);
    const manjuContext = shouldAutoArchiveManju
      ? normalizeManjuGenerationContext(requestPayload.manjuContext || activeManjuGenerationContext)
      : null;
    if (manjuContext) {
      archiveGeneratedManjuImages(result.images, manjuContext);
    }
    await rememberRecentPrompt({
      name: makePromptName(requestPayload.prompt),
      text: requestPayload.prompt,
      mode: activeMode,
      source: "generation",
    });
    galleryPage = 1;
    await loadImages();
    showMessage(`已生成 ${result.images.length} 张，批次 ${result.batchId}。`, false);
    return result;
  } catch (error) {
    showMessage(normalizeFrontendError(error, "生成失败。"), true);
    return null;
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
    const pageImages = data.images || [];
    const archives = readManjuArchives();
    galleryImages = filterManjuGalleryImages(pageImages, archives);
    galleryTotal = Number(data.total) || 0;
    galleryPage = Number(data.page) || 1;
    galleryPageSizeValue = Number(data.pageSize) || galleryPageSizeValue;
    galleryTotalPages = Number(data.totalPages) || 1;

    if (!pageImages.length) {
      updateGalleryControls();
      showMessage("还没有生成记录。", false);
      return;
    }
    if (!galleryImages.length) {
      updateGalleryControls();
      showMessage("当前漫剧归档筛选在这一页没有匹配图片。", false);
      return;
    }
    galleryImages.forEach((image) => renderImage(image, gallery));
    updateGalleryControls();
    showMessage(isManjuArchiveFilterActive()
      ? `已按漫剧归档筛选当前页，显示 ${galleryImages.length} / ${pageImages.length} 张。`
      : `已加载第 ${galleryPage} 页，共 ${galleryTotal} 张历史图片。`, false);
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
  updateManjuArchiveToolbar();
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
    pruneManjuArchives(result.deleted || []);
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
  const model = modelSelect.value.trim() || "gpt-image-2";
  modelSelect.value = model;
  const size = resolveSize(model);
  const selectedStyle = getAllStylePresets()[activeStyle];
  const styleReferences = selectedStyle?.saved && selectedStyle.strength === "high"
    ? selectedStyle.references || []
    : [];
  const payload = {
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
  const manjuContext = normalizeManjuGenerationContext(activeManjuGenerationContext);
  if (manjuContext) {
    payload.manjuContext = manjuContext;
  }
  return payload;
}

function resolveSize(model) {
  const selected = sizeSelect.value;
  const size = selected === "custom"
    ? `${Number(customWidth.value)}x${Number(customHeight.value)}`
    : selected;

  if (!model.startsWith("gpt-image-")) {
    return LEGACY_SIZES.has(size) ? size : "auto";
  }

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
    if (!model.startsWith("gpt-image-")) {
      sizeHint.textContent = "Responses API 模型会通过图像工具生成；尺寸建议使用 auto 或基础比例。";
      sizeHint.classList.remove("invalid");
      return;
    }

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

  const savePromptFromImageButton = document.createElement("button");
  savePromptFromImageButton.type = "button";
  savePromptFromImageButton.textContent = "存提示词";
  savePromptFromImageButton.addEventListener("click", () => savePromptFromImage(image));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "danger-action";
  deleteButton.textContent = "删除";
  deleteButton.addEventListener("click", () => deleteSingleImage(image));

  actions.append(openLink, downloadLink, referenceButton, rerollButton, savePromptFromImageButton, deleteButton);
  info.append(title, renderImageMeta(image), actions, renderManjuArchiveActions(image), renderPostActions(image));
  article.append(selector, img, info);

  if (prepend) {
    container.prepend(article);
  } else {
    container.append(article);
  }
}

async function savePromptFromImage(image) {
  const text = String(image?.request?.prompt || image?.prompt || "").trim();
  if (!text) {
    showMessage("这张结果没有可保存的提示词记录。", true);
    return;
  }
  await saveSavedPrompt({
    name: makePromptName(text),
    text,
    mode: image?.request?.manjuContext ? "manju-result" : "result",
    source: "result-card",
  });
}

function renderManjuArchiveActions(image) {
  const archives = readManjuArchives();
  const record = archives[image.id];
  const panel = document.createElement("div");
  panel.className = "archive-actions";

  const status = document.createElement("div");
  status.className = "archive-status";
  const badge = document.createElement("span");
  badge.className = record ? "archive-badge" : "archive-badge muted";
  badge.textContent = record
    ? `${record.title} / ${getManjuArchiveCategoryLabel(record.category)}`
    : "未归档";
  status.append(badge);
  if (record?.note) {
    const note = document.createElement("span");
    note.className = "archive-note";
    note.textContent = record.note;
    status.append(note);
  }

  const controls = document.createElement("div");
  controls.className = "archive-controls";

  const categorySelect = document.createElement("select");
  categorySelect.className = "archive-category-select";
  MANJU_ARCHIVE_CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.value;
    option.textContent = category.label;
    categorySelect.append(option);
  });
  categorySelect.value = record?.category || DEFAULT_MANJU_ARCHIVE_CATEGORY;

  const noteInput = document.createElement("input");
  noteInput.className = "archive-note-input";
  noteInput.type = "text";
  noteInput.maxLength = 80;
  noteInput.placeholder = "角色名 / 镜号备注";
  noteInput.value = record?.note || "";

  const archiveButton = document.createElement("button");
  archiveButton.type = "button";
  archiveButton.textContent = "归档";
  archiveButton.addEventListener("click", () => archiveManjuImage(image, categorySelect.value, noteInput.value));

  const finalButton = document.createElement("button");
  finalButton.type = "button";
  finalButton.textContent = "定稿";
  finalButton.addEventListener("click", () => {
    categorySelect.value = "shot-final";
    archiveManjuImage(image, categorySelect.value, noteInput.value);
  });

  const discardedButton = document.createElement("button");
  discardedButton.type = "button";
  discardedButton.textContent = "废稿";
  discardedButton.addEventListener("click", () => {
    categorySelect.value = "discarded";
    archiveManjuImage(image, categorySelect.value, noteInput.value);
  });

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "取消";
  clearButton.disabled = !record;
  clearButton.addEventListener("click", () => removeManjuImageArchive(image));

  controls.append(categorySelect, noteInput, archiveButton, finalButton, discardedButton, clearButton);
  panel.append(status, controls);
  return panel;
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

async function extractSceneFromReferences() {
  if (referenceImages.length === 0) {
    showMessage("先添加参考图，再提取场景提示词。", true);
    return;
  }

  await runImageAnalysis({
    mode: "scene",
    images: referenceImages.slice(0, 4).map(referenceImageAnalysisPayload),
    busyText: `正在从 ${Math.min(referenceImages.length, 4)} 张参考图提取场景提示词。`,
    title: `参考图场景 · ${Math.min(referenceImages.length, 4)} 张`,
  });
}

function analysisImagePayload(image) {
  return {
    name: image.name,
    dataUrl: image.dataUrl,
    source: image.source,
  };
}

function referenceImageAnalysisPayload(image) {
  return {
    name: image.name,
    dataUrl: image.dataUrl,
    url: image.url,
    source: image.source || "reference",
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
  useAnalysisButton.textContent = analysis.mode === "prompt-optimization"
    ? "写入优化"
    : analysis.mode === "style"
    ? "追加为风格"
    : analysis.mode === "keywords"
      ? "追加关键词"
      : analysis.mode === "scene"
        ? "写入场景"
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

  if (latestAnalysis.mode === "prompt-optimization") {
    promptInput.value = latestAnalysis.optimizedPrompt || extractOptimizedPromptFromText(text) || text;
    if ((latestAnalysis.negativePrompt || "").trim()) {
      negativePromptInput.value = latestAnalysis.negativePrompt.trim();
    }
  } else if (latestAnalysis.mode === "scene") {
    promptInput.value = promptInput.value.trim()
      ? `${promptInput.value.trim()}\n\nScene prompt package:\n${text}`
      : text;
  } else if (["style", "keywords"].includes(latestAnalysis.mode) && promptInput.value.trim()) {
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

function extractOptimizedPromptFromText(text) {
  const match = String(text || "").match(/优化后提示词\s*[：:]\s*([\s\S]*?)(?:(?:\n|\\n)\s*反向提示词\s*[：:]|$)/);
  return match?.[1]?.trim() || "";
}

async function saveAnalysisPrompt() {
  const text = latestAnalysis?.mode === "prompt-optimization"
    ? (latestAnalysis.optimizedPrompt || extractOptimizedPromptFromText(getAnalysisText()) || getAnalysisText())
    : getAnalysisText();
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

async function saveCurrentPrompt() {
  const text = promptInput.value.trim();
  if (!text) {
    showMessage("先填写一段提示词再收藏。", true);
    return;
  }
  await saveSavedPrompt({
    name: makePromptName(text),
    text,
    mode: activeMode,
    source: "main-prompt",
  });
}

async function optimizeCurrentPrompt() {
  const text = promptInput.value.trim();
  if (!text) {
    showMessage("先填写一段提示词再优化。", true);
    return;
  }
  optimizePromptButton.disabled = true;
  showMessage("正在使用辅助 API 优化提示词。", false);
  try {
    const result = await fetchJson("/api/optimize-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: text,
        negativePrompt: negativePromptInput.value.trim(),
        mode: promptOptimizeMode.value,
        auxiliary: collectAuxiliaryPayload(),
      }),
    }, 240000);
    const optimizedPrompt = result.optimizedPrompt || result.text || "";
    latestAnalysis = {
      mode: "prompt-optimization",
      title: optimizeModeLabel(result.mode || promptOptimizeMode.value),
      name: optimizeModeLabel(result.mode || promptOptimizeMode.value),
      text: result.text || optimizedPrompt,
      optimizedPrompt,
      negativePrompt: result.negativePrompt || "",
    };
    showAnalysisResult(latestAnalysis);
    showMessage("提示词优化完成，可写入或收藏。", false);
  } catch (error) {
    showMessage(normalizeFrontendError(error, "提示词优化失败。"), true);
  } finally {
    optimizePromptButton.disabled = false;
  }
}

function optimizeModeLabel(mode) {
  return {
    conservative: "保守优化提示词",
    quality: "质量优先提示词",
    continuity: "连续性优先提示词",
  }[mode] || "优化提示词";
}

function makePromptName(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32) || "保存的提示词";
}

async function saveSavedPrompt(payload) {
  try {
    apiSettings = await fetchJson("/api/saved-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    renderSavedPrompts();
    renderRecentPrompts();
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
    renderRecentPrompts();
    showMessage("提示词已删除。", false);
  } catch (error) {
    showMessage(normalizeFrontendError(error, "删除提示词失败。"), true);
  }
}

async function rememberRecentPrompt(payload) {
  if (!payload?.text?.trim()) {
    return;
  }
  try {
    apiSettings = await fetchJson("/api/recent-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    renderRecentPrompts();
  } catch {
    // Recent prompt tracking should never block generation or prompt editing.
  }
}

async function deleteRecentPrompt(id) {
  try {
    apiSettings = await fetchJson("/api/recent-prompts/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    renderRecentPrompts();
    showMessage("最近使用记录已移除。", false);
  } catch (error) {
    showMessage(normalizeFrontendError(error, "移除最近使用记录失败。"), true);
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
  rememberRecentPrompt({
    name: item.name || makePromptName(item.text),
    text: item.text,
    mode: item.mode || activeMode,
    source: append ? "prompt-append" : "prompt-use",
  });
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

async function rerollImage(image) {
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
    autoArchiveManju: false,
  };
  const manjuContext = getManjuGenerationContextForImage(image);
  if (manjuContext) {
    payload.manjuContext = manjuContext;
  }

  const result = await runGeneration(payload, "正在按原提示词和参数重Roll。");
  if (archiveDerivedManjuImages(image, result?.images, "重Roll", getDerivedManjuArchiveCategory(image, "reroll"))) {
    await loadImages();
    showMessage("已重Roll，并自动继承原分镜归档。", false);
  }
}

async function upscaleImage(image, preset) {
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
    autoArchiveManju: false,
  };
  const manjuContext = getManjuGenerationContextForImage(image);
  if (manjuContext) {
    payload.manjuContext = manjuContext;
  }

  const result = await runGeneration(payload, `正在放大到 ${size}。`);
  if (archiveDerivedManjuImages(image, result?.images, "放大", getDerivedManjuArchiveCategory(image, "upscale"))) {
    await loadImages();
    showMessage("已放大，并自动继承原分镜归档。", false);
  }
}

async function tweakImage(image, instruction) {
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
    autoArchiveManju: false,
  };
  const manjuContext = getManjuGenerationContextForImage(image);
  if (manjuContext) {
    payload.manjuContext = manjuContext;
  }

  const result = await runGeneration(payload, "正在按参考图做局部微调。");
  if (archiveDerivedManjuImages(image, result?.images, "微调", getDerivedManjuArchiveCategory(image, "tweak"))) {
    await loadImages();
    showMessage("已完成微调，并自动继承原分镜归档。", false);
  }
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
      throw new Error(`${normalizeFetchJsonErrorMessage(response, body, text)}${requestId}`);
    }
    return body;
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeFetchJsonErrorMessage(response, body, text) {
  const raw = String(body?.error || body?.message || text || "").trim();
  if (/524|timeout occurred|origin web server timed out|cloudflare|cf-error|host\s*error/i.test(raw)) {
    return "上游 API 中转服务超时（Cloudflare 524）。建议先缩短提示词、降低尺寸/质量、一次生成 1 张，稍后重试或切换 API 配置。";
  }
  if (/<!doctype html|<html[\s>]/i.test(raw)) {
    return `上游 API 返回了网页错误（HTTP ${response.status}），不是有效 JSON。请检查中转服务状态或 API Base URL。`;
  }
  return raw || `HTTP ${response.status}`;
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
