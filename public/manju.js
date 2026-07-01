const MANJU_PACKS_STORAGE_KEY = "yaotu-manju-packs";
const MANJU_CHARACTER_CARDS_STORAGE_KEY = "yaotu-manju-character-cards";
const MANJU_ARCHIVES_STORAGE_KEY = "yaotu-manju-image-archives";
const MANJU_SCRIPT_PACKS_STORAGE_KEY = "yaotu-manju-script-packs";
const MANJU_SHOT_HANDOFF_STORAGE_KEY = "yaotu-manju-shot-handoff";
const MANJU_SHOT_QUEUE_HANDOFF_STORAGE_KEY = "yaotu-manju-shot-queue-handoff";
const MANJU_CHARACTER_HANDOFF_STORAGE_KEY = "yaotu-manju-character-handoff";
const ACTIVE_PROJECT_STORAGE_KEY = "yaotu-manju-workbench-project";
const DEFAULT_CHARACTER_VARIANT_ID = "__default";

const DEFAULT_PROJECT_TITLE = "未命名漫剧";

const categoryLabels = {
  "character-profile": "人设资料",
  turnaround: "三视图",
  detail: "细节图",
  expression: "表情图",
  scene: "场景图",
  "shot-candidate": "分镜候选",
  "shot-final": "分镜定稿",
  discarded: "废稿",
};

const CHARACTER_ASSET_SLOTS = [
  { id: "primary", label: "星标为基准图", shortLabel: "★ 基准", field: "primaryImageId", category: "character-profile", legacyKey: "baseImages", archiveLabel: "基准图" },
  { id: "base", label: "插入基准图", shortLabel: "基准", field: "baseImageId", category: "character-profile", legacyKey: "baseImages", archiveLabel: "基准图" },
  { id: "full-body", label: "插入全身图", shortLabel: "全身", field: "fullBodyImageId", category: "character-profile", legacyKey: "baseImages", archiveLabel: "全身图" },
  { id: "front", label: "插入主视图", shortLabel: "主视", field: "frontImageId", category: "turnaround", legacyKey: "viewImages", archiveLabel: "主视图" },
  { id: "side", label: "插入侧视图", shortLabel: "侧视", field: "sideImageId", category: "turnaround", legacyKey: "viewImages", archiveLabel: "侧视图" },
  { id: "back", label: "插入后视图", shortLabel: "后视", field: "backImageId", category: "turnaround", legacyKey: "viewImages", archiveLabel: "后视图" },
  { id: "three-quarter", label: "插入45度图", shortLabel: "45度", field: "threeQuarterImageId", category: "turnaround", legacyKey: "viewImages", archiveLabel: "45度图" },
  { id: "clothing-detail", label: "插入服装细节", shortLabel: "服装细节", field: "clothingDetailImageId", category: "detail", legacyKey: "detailImages", archiveLabel: "服装细节" },
  { id: "accessory-detail", label: "插入首饰细节", shortLabel: "首饰细节", field: "accessoryDetailImageId", category: "detail", legacyKey: "detailImages", archiveLabel: "首饰细节" },
  { id: "mark-detail", label: "插入纹身/标记", shortLabel: "纹身/标记", field: "markDetailImageId", category: "detail", legacyKey: "detailImages", archiveLabel: "纹身/标记" },
  { id: "custom-detail", label: "插入其他细节", shortLabel: "其他细节", field: "customDetailImageId", category: "detail", legacyKey: "detailImages", archiveLabel: "其他细节" },
  { id: "expression", label: "插入表情图", shortLabel: "表情", field: "expressionImageId", category: "expression", legacyKey: "detailImages", archiveLabel: "表情图" },
];

const DEFAULT_CHARACTER_NEGATIVE_PROMPT = "五官走形，脸型变化，发色偏差，瞳色偏差，服装款式改动，配饰缺失，比例失调，透视畸变，动态姿势，背景杂乱，多余道具，水印文字，字幕，logo，模糊失焦，Q版萌系";

const CHARACTER_GENERATION_TEMPLATES = [
  {
    id: "base",
    label: "基准图",
    category: "character-profile",
    size: "1024x1536",
    count: 2,
    referenceMode: "none",
    instruction: "角色形象基准图，完整呈现五官、发型、发色、瞳色、服装、配饰、配色、材质和画风。全身完整立绘，纯白背景，标准站姿，正脸正对镜头，平视角度，柔和正面无影光，无明暗死角。",
  },
  {
    id: "full-body",
    label: "全身",
    category: "character-profile",
    size: "1024x1536",
    count: 2,
    referenceMode: "prefer",
    instruction: "与参考图人物形象100%一致，完全相同的五官、脸型、发型、发色、瞳色、服装、配饰、配色、材质、画风，仅生成全身完整立绘。纯白背景，标准站姿，平视角度，清晰展示整体比例与服装轮廓。",
  },
  {
    id: "front",
    label: "主视",
    category: "turnaround",
    size: "1024x1536",
    count: 1,
    referenceMode: "prefer",
    instruction: "与参考图人物形象100%一致，仅改变为正面主视图。全身完整立绘，纯白背景，标准站姿正脸正对镜头，平视角度，清晰展示正面五官轮廓与服装正面结构，柔和正面无影光。",
  },
  {
    id: "side",
    label: "侧视",
    category: "turnaround",
    size: "1024x1536",
    count: 1,
    referenceMode: "require",
    instruction: "与参考图人物形象100%一致，仅改变拍摄视角为侧视图。全身完整立绘，纯白背景，标准站姿，平视角度，清晰展示侧面脸型、发型厚度、服装侧面结构和配饰位置。",
  },
  {
    id: "back",
    label: "后视",
    category: "turnaround",
    size: "1024x1536",
    count: 1,
    referenceMode: "require",
    instruction: "与参考图人物形象100%一致，仅改变拍摄视角为背面后视图。全身完整立绘，纯白背景，标准站姿，平视角度，清晰展示背面发型、服装后背结构、配饰固定方式和材质细节。",
  },
  {
    id: "three-quarter",
    label: "45度",
    category: "turnaround",
    size: "1024x1536",
    count: 1,
    referenceMode: "require",
    instruction: "与参考图人物形象100%一致，仅改变拍摄视角为45度三分之四立绘。全身完整，纯白背景，标准站姿，平视角度，兼顾正面五官识别与侧面服装层次。",
  },
  {
    id: "clothing-detail",
    label: "服装细节",
    category: "detail",
    size: "1536x1024",
    count: 1,
    referenceMode: "require",
    instruction: "从参考图角色中提取服装细节，近景特写，清晰展示衣领、袖口、腰封、纹样、面料纹理、缝线和层次结构。保持同一角色设计和画风，不改变服装款式。",
  },
  {
    id: "accessory-detail",
    label: "首饰细节",
    category: "detail",
    size: "1536x1024",
    count: 1,
    referenceMode: "require",
    instruction: "从参考图角色中提取首饰或标志性配饰细节，近景特写，清晰展示形状、材质、颜色、镶嵌、磨损和佩戴位置。保持同一角色设计和画风。",
  },
  {
    id: "mark-detail",
    label: "纹身/标记",
    category: "detail",
    size: "1536x1024",
    count: 1,
    referenceMode: "require",
    instruction: "从参考图角色中提取纹身、疤痕、印记、徽记或特殊皮肤纹理细节，近景特写，清晰展示位置、形状、颜色和边缘质感。保持同一角色设计和画风。",
  },
  {
    id: "custom-detail",
    label: "自定义细节",
    category: "detail",
    size: "1536x1024",
    count: 1,
    referenceMode: "prefer",
    instruction: "根据补充提示词生成指定角色细节图，优先从参考图保持人物形象、服装、配饰、材质和画风一致，只放大展示用户指定部位。",
  },
];

const workspaceData = {
  overview: {
    eyebrow: "Overview",
    title: "项目总览",
    description: "先检查项目资产是否齐，再进入对应模块继续制作。",
    cards: [
      {
        key: "project",
        index: "01",
        title: "项目设定",
        description: "维护剧名、全局画风包、场景基调和默认生图参数。",
        status: "先定方向",
        action: "查看设定",
      },
      {
        key: "script",
        index: "02",
        title: "剧本/分镜",
        description: "导入外部剧本包，或把纯剧本交给辅助 API 拆成可生图的分镜表。",
        status: "上游入口",
        action: "导入剧本",
        featured: true,
      },
      {
        key: "characters",
        index: "03",
        title: "人设库",
        description: "沉淀角色资料卡、三视图、细节图和人设提示词包。",
        status: "最影响一致性",
        action: "整理人设",
      },
      {
        key: "shots",
        index: "04",
        title: "分镜接力",
        description: "以上一张定稿/候选图作为参考，手写下一帧画面内容，再带入 A 版筛选生成。",
        status: "高频入口",
        action: "接下一帧",
      },
      {
        key: "gallery",
        index: "05",
        title: "图集归档",
        description: "按候选、定稿、废稿、人设资料、场景图做项目级归档。",
        status: "减少返工",
        action: "看图集",
      },
      {
        key: "scenes",
        index: "06",
        title: "场景库",
        description: "沉淀固定场景的空间关系、灯光、天气、道具和色彩。",
        status: "待搭模块",
        action: "规划场景",
      },
      {
        key: "export",
        index: "07",
        title: "导出交付",
        description: "按剧名导出 manifest、prompt-pack 和分类图片目录。",
        status: "交付收口",
        action: "准备导出",
      },
    ],
  },
  project: {
    eyebrow: "Step 01",
    title: "项目设定",
    description: "这里应成为 B 版项目的根：剧名、全局画风包、默认比例、候选张数和参考策略都从这里继承。",
    cards: [
      {
        index: "A",
        title: "全局画风提示词包",
        description: "提炼全剧共用的线稿、色彩、光影、材质、画幅和禁用项，后续分镜默认带入。",
        status: "核心",
      },
      {
        index: "B",
        title: "默认生图参数",
        description: "建议固定 9:16、4 张候选、高质量输出，并把文字生成默认禁用。",
        status: "效率",
      },
      {
        index: "C",
        title: "项目资料夹",
        description: "按剧名保存人设资料卡图集、三视图、细节图、场景图和分镜图集。",
        status: "粘性",
      },
    ],
  },
  script: {
    eyebrow: "Step 02",
    title: "剧本/分镜",
    description: "B 版不写长文，只负责把剧本包或纯剧本转成镜头级生产资料，后续镜头表再进入生图流程。",
    custom: "script",
  },
  characters: {
    eyebrow: "Step 03",
    title: "人设库",
    description: "人设库应该是 B 版最重的模块：一个角色一张资料卡，图片、文字提示词和一致性规则绑定在一起。",
    cards: [
      {
        index: "主",
        title: "角色资料卡",
        description: "角色名、身份、年龄感、脸型、发型、服装、标志物、性格气质和负面约束。",
        status: "必做",
      },
      {
        index: "图",
        title: "资料图集",
        description: "人设资料、三视图、细节图、表情图分开收纳，后续一键作为参考图。",
        status: "复用",
      },
      {
        index: "词",
        title: "人设提示词包",
        description: "把角色资料卡压缩成稳定提示词，供分镜公式按角色引用。",
        status: "一致性",
      },
    ],
  },
  scenes: {
    eyebrow: "Step 04",
    title: "场景库",
    description: "场景包解决的是空间连续和重复描述问题，尤其适合办公室、卧室、街角、车内等反复出现的固定地点。",
    cards: [
      {
        index: "景",
        title: "固定地点",
        description: "地点名称、空间结构、入口出口、主道具、主色、常用光源。",
        status: "沉淀",
      },
      {
        index: "镜",
        title: "镜头策略",
        description: "同一场景下的远景、中景、近景、特写可用描述，减少每镜重写。",
        status: "提速",
      },
      {
        index: "氛",
        title: "氛围变化",
        description: "同一地点按白天、夜晚、雨天、危机、暧昧等状态保存变体。",
        status: "质量",
      },
    ],
  },
  shots: {
    eyebrow: "Step 05",
    title: "分镜接力",
    description: "这里不直接生成画面，而是把上一帧参考图、下一帧画面内容和项目归档关系整理好，再交给 A 版生图。",
    custom: "shots",
  },
  gallery: {
    eyebrow: "Step 06",
    title: "图集归档",
    description: "图集页负责把生成结果沉淀为资产，不只是历史图片列表。",
    cards: [
      {
        index: "选",
        title: "候选池",
        description: "同一镜号的多张候选集中比较，保留可用版本。",
        status: "筛选",
      },
      {
        index: "定",
        title: "定稿线",
        description: "定稿图按镜号排序，后续导出或进入剪辑流程。",
        status: "交付",
      },
      {
        index: "查",
        title: "项目筛选",
        description: "按剧名、角色、场景、分类、镜号快速过滤。",
        status: "找图",
      },
    ],
  },
  export: {
    eyebrow: "Step 07",
    title: "导出交付",
    description: "导出页不做视频平台，只把生图资产、提示词包和清单整理好，方便你外部剪辑。",
    cards: [
      {
        index: "包",
        title: "项目图集包",
        description: "按剧名导出图片目录、manifest.json 和 prompt-pack.txt。",
        status: "已有后端",
      },
      {
        index: "清",
        title: "缺口清单",
        description: "导出前提示缺失的人设图、场景图、分镜定稿。",
        status: "减少漏项",
      },
      {
        index: "备",
        title: "备份策略",
        description: "为每个项目保存可复现的提示词包和关键参数。",
        status: "可回溯",
      },
    ],
  },
};

const elements = {
  projectSelect: document.querySelector("#projectSelect"),
  currentProjectTitle: document.querySelector("#currentProjectTitle"),
  heroDescription: document.querySelector("#heroDescription"),
  projectMeta: document.querySelector("#projectMeta"),
  projectSummary: document.querySelector("#projectSummary"),
  characterCount: document.querySelector("#characterCount"),
  packCount: document.querySelector("#packCount"),
  scriptShotCount: document.querySelector("#scriptShotCount"),
  candidateCount: document.querySelector("#candidateCount"),
  finalCount: document.querySelector("#finalCount"),
  scriptReadyItem: document.querySelector("#scriptReadyItem"),
  characterReadyItem: document.querySelector("#characterReadyItem"),
  archiveReadyItem: document.querySelector("#archiveReadyItem"),
  workspaceEyebrow: document.querySelector("#workspaceEyebrow"),
  workspaceTitle: document.querySelector("#workspaceTitle"),
  workspaceDescription: document.querySelector("#workspaceDescription"),
  workspaceGrid: document.querySelector("#workspaceGrid"),
  assetGrid: document.querySelector("#assetGrid"),
  promptPackList: document.querySelector("#promptPackList"),
  qualityList: document.querySelector("#qualityList"),
};

let state = {
  packs: [],
  scriptPacks: [],
  characters: [],
  archives: {},
  images: [],
  scriptStatus: null,
  projectStatus: null,
  characterStatus: null,
  characterStudioStatus: null,
  characterAssetStatus: null,
  sceneStatus: null,
  exportStatus: null,
  scriptDraft: {
    title: "",
    episodeNo: 1,
    text: "",
  },
  shotTableDraft: {
    title: "",
    episodeNo: 1,
    text: "",
    scriptText: "",
  },
  characterStudio: {
    templateId: "base",
    variantId: DEFAULT_CHARACTER_VARIANT_ID,
    variantName: "",
    variantPrompt: "",
    negativePrompt: DEFAULT_CHARACTER_NEGATIVE_PROMPT,
    referenceImageId: "",
    detailReferenceImageId: "",
    detailTarget: "",
    count: 2,
    size: "",
  },
  selectedCharacterId: "",
  activeShotKey: "",
  shotBatchCount: 5,
  shotRelayDraft: {
    referenceImageId: "",
    visualText: "",
    includeSceneLock: true,
    includeCharacterPrompt: false,
  },
  shotTripleDraft: {
    motionText: "",
    anchorMode: "forward",
  },
  activeProject: DEFAULT_PROJECT_TITLE,
  activeWorkspace: "overview",
};

document.querySelectorAll("[data-workspace]").forEach((button) => {
  button.addEventListener("click", () => setWorkspace(button.dataset.workspace));
});

document.querySelectorAll("[data-jump]").forEach((button) => {
  button.addEventListener("click", () => setWorkspace(button.dataset.jump));
});

document.querySelector("#refreshAssetsButton")?.addEventListener("click", () => refreshFromStorage(true));
document.querySelector("#continueButton")?.addEventListener("click", () => {
  setWorkspace("shots");
});
document.querySelector("#newProjectButton")?.addEventListener("click", () => {
  const title = window.prompt("新项目剧名", "");
  const normalized = normalizeTitle(title);
  if (!normalized) {
    return;
  }
  state.activeProject = normalized;
  localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, normalized);
  renderProjectOptions();
  renderAll();
});

elements.projectSelect.addEventListener("change", () => {
  state.activeProject = normalizeTitle(elements.projectSelect.value) || DEFAULT_PROJECT_TITLE;
  localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, state.activeProject);
  renderAll();
});

refreshFromStorage();

async function refreshFromStorage(showFreshState = false) {
  state.packs = readList(MANJU_PACKS_STORAGE_KEY).map(normalizePack).filter(Boolean);
  state.scriptPacks = readList(MANJU_SCRIPT_PACKS_STORAGE_KEY).map(normalizeScriptPack).filter(Boolean);
  state.characters = readList(MANJU_CHARACTER_CARDS_STORAGE_KEY).map(normalizeCharacter).filter(Boolean);
  state.archives = readArchives();
  state.activeProject = pickActiveProject();
  renderProjectOptions();
  renderAll();
  await loadRecentImages(showFreshState);
}

function renderAll() {
  renderHeader();
  renderStats();
  renderWorkspace();
  renderPromptPack();
  renderQualityList();
  renderAssets();
}

function renderProjectOptions() {
  const titles = getProjectTitles();
  elements.projectSelect.innerHTML = "";
  titles.forEach((title) => {
    const option = document.createElement("option");
    option.value = title;
    option.textContent = title;
    elements.projectSelect.append(option);
  });
  elements.projectSelect.value = titles.includes(state.activeProject) ? state.activeProject : titles[0];
  state.activeProject = elements.projectSelect.value || DEFAULT_PROJECT_TITLE;
}

function renderHeader() {
  const projectPack = getActivePack();
  const scriptShots = getActiveScriptShots();
  const archivedCount = getActiveArchives().length;
  const activeCharacters = getActiveCharacters();
  elements.currentProjectTitle.textContent = state.activeProject;
  elements.projectSummary.textContent = `当前剧名：${state.activeProject}`;
  elements.projectMeta.textContent = `${state.packs.length} 个漫剧包 · ${state.scriptPacks.length} 个剧本包 · 本剧 ${activeCharacters.length} 张人设卡`;
  elements.heroDescription.textContent = scriptShots.length
    ? `当前剧名已准备 ${scriptShots.length} 条分镜行，可以进入分镜生成继续做图。`
    : projectPack
      ? "已读取这个项目的漫剧包，可继续导入剧本、补人设、拆场景，并把分镜资产接到新版 B 工作台里。"
      : "还没有保存对应漫剧包，可以先用这个主页框架规划项目，再逐步接入完整编辑能力。";
  elements.scriptReadyItem?.classList.toggle("done", scriptShots.length > 0);
  elements.characterReadyItem.classList.toggle("done", activeCharacters.length > 0);
  elements.archiveReadyItem.classList.toggle("done", archivedCount > 0);
}

function renderStats() {
  const activeArchives = getActiveArchives();
  elements.characterCount.textContent = String(getActiveCharacters().length);
  elements.packCount.textContent = String(state.packs.length);
  elements.scriptShotCount.textContent = String(getActiveScriptShots().length);
  elements.candidateCount.textContent = String(activeArchives.filter((item) => item.category === "shot-candidate").length);
  elements.finalCount.textContent = String(activeArchives.filter((item) => item.category === "shot-final").length);
}

function renderWorkspace() {
  const data = workspaceData[state.activeWorkspace] || workspaceData.overview;
  elements.workspaceEyebrow.textContent = data.eyebrow;
  elements.workspaceTitle.textContent = data.title;
  elements.workspaceDescription.textContent = data.description;
  elements.workspaceGrid.innerHTML = "";
  elements.workspaceGrid.className = "workspace-grid";
  if (state.activeWorkspace === "project") {
    renderProjectWorkspace();
  } else if (data.custom === "script") {
    renderScriptWorkspace();
  } else if (state.activeWorkspace === "characters") {
    renderCharactersWorkspace();
  } else if (state.activeWorkspace === "scenes") {
    renderScenesWorkspace();
  } else if (data.custom === "shots") {
    renderShotsWorkspace();
  } else if (state.activeWorkspace === "gallery") {
    renderGalleryWorkspace();
  } else if (state.activeWorkspace === "export") {
    renderExportWorkspace();
  } else {
    data.cards.forEach((card) => {
      elements.workspaceGrid.append(createTaskCard(card));
    });
  }
  document.querySelectorAll("[data-workspace]").forEach((button) => {
    button.classList.toggle("active", button.dataset.workspace === state.activeWorkspace);
  });
}

function renderPromptPack() {
  const pack = getActivePack();
  const blocks = [
    ["全局画风包", pack?.stylePack || "尚未为当前剧名保存全局画风包。"],
    ["剧本分镜包", summarizeActiveScriptPack()],
    ["场景包", pack?.scenePack || "场景包会在新版 B 版拆成独立场景库。"],
    ["人设提示词包", pack?.characterPack || summarizeCharacters()],
  ];
  elements.promptPackList.innerHTML = "";
  blocks.forEach(([title, text]) => {
    elements.promptPackList.append(createPromptBlock(title, text));
  });
}

function renderQualityList() {
  const pack = getActivePack();
  const scriptShots = getActiveScriptShots();
  const activeArchives = getActiveArchives();
  const checks = [
    {
      label: "项目设定",
      good: Boolean(pack),
      text: pack ? "已保存漫剧包，可以继承画风与参数。" : "建议先保存一个漫剧包，避免分镜提示词散落。",
    },
    {
      label: "剧本分镜",
      good: scriptShots.length > 0,
      text: scriptShots.length > 0 ? `已准备 ${scriptShots.length} 条分镜行，可作为生图队列。` : "可导入剧本包，或用辅助 API 把纯剧本拆成镜头表。",
    },
    {
      label: "角色一致性",
      good: getActiveCharacters().length > 0,
      text: getActiveCharacters().length > 0 ? "已有角色卡，可继续绑定三视图和细节图。" : "还没有人设卡，新 B 版应优先补这个模块。",
    },
    {
      label: "图集沉淀",
      good: activeArchives.length > 0,
      text: activeArchives.length > 0 ? `当前剧名已有 ${activeArchives.length} 张归档资产。` : "还没有归档资产，生成后需要一键标候选/定稿/废稿。",
    },
  ];
  elements.qualityList.innerHTML = "";
  checks.forEach((check) => {
    const item = document.createElement("article");
    item.className = `quality-item ${check.good ? "good" : "warn"}`;
    const label = document.createElement("span");
    label.textContent = check.label;
    const text = document.createElement("p");
    text.textContent = check.text;
    item.append(label, text);
    elements.qualityList.append(item);
  });
}

function renderAssets() {
  const archived = getActiveArchives()
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  const archiveById = new Map(archived.map((item) => [item.imageId, item]));
  const recentImages = state.images
    .map((image) => ({ ...image, archive: archiveById.get(image.id) }))
    .filter((image) => image.archive)
    .slice(0, 8);

  elements.assetGrid.innerHTML = "";
  if (!recentImages.length) {
    const empty = document.createElement("article");
    empty.className = "asset-card empty";
    const title = document.createElement("h3");
    title.textContent = "还没有当前剧名的归档资产";
    const text = document.createElement("p");
    text.textContent = "后续这里会展示人设资料、三视图、场景图、分镜候选和定稿图，让 B 版主页一眼看到项目沉淀。";
    empty.append(title, text);
    elements.assetGrid.append(empty);
    return;
  }

  recentImages.forEach((image) => {
    elements.assetGrid.append(createAssetCard(image));
  });
}

async function loadRecentImages(showFreshState) {
  try {
    const response = await fetch("/api/images?page=1&pageSize=48");
    if (!response.ok) {
      throw new Error("images request failed");
    }
    const data = await response.json();
    state.images = Array.isArray(data.images) ? data.images : [];
    renderAssets();
    if (showFreshState) {
      elements.projectMeta.textContent = `已刷新 · ${state.images.length} 张最近历史图`;
    }
  } catch {
    state.images = [];
    renderAssets();
  }
}

function renderScriptWorkspace() {
  const pack = getActiveScriptPack();
  const shots = flattenScriptShots(pack);
  elements.workspaceGrid.classList.add("script-workspace");

  const statusCard = createScriptStatusCard(pack, shots);
  const importCard = createScriptImportCard();
  const tableImportCard = createShotTableImportCard();
  const splitCard = createScriptSplitCard();
  const tableCard = createScriptTableCard(pack, shots);

  elements.workspaceGrid.append(statusCard, importCard, tableImportCard, splitCard, tableCard);
}

function renderProjectWorkspace() {
  const pack = getActivePack();
  elements.workspaceGrid.classList.add("project-workspace");

  const card = createScriptCard("项目提示词包", "保存后，剧名、画风包、场景包和人设包会被分镜生成、导出交付一起复用。");
  card.classList.add("script-card-wide");
  const form = document.createElement("div");
  form.className = "project-form";

  const titleLabel = createFieldLabel("剧名");
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.maxLength = 80;
  titleInput.value = state.activeProject;
  titleLabel.append(titleInput);

  const styleLabel = createFieldLabel("全局画风提示词包");
  const styleInput = document.createElement("textarea");
  styleInput.rows = 5;
  styleInput.value = pack?.stylePack || "";
  styleInput.placeholder = "统一线稿、色彩、光影、材质、人物比例、画幅、禁用项。";
  styleLabel.append(styleInput);

  const sceneLabel = createFieldLabel("场景提示词包");
  const sceneInput = document.createElement("textarea");
  sceneInput.rows = 4;
  sceneInput.value = pack?.scenePack || "";
  sceneInput.placeholder = "常用地点、空间结构、灯光、天气、关键道具和氛围变化。";
  sceneLabel.append(sceneInput);

  const characterLabel = createFieldLabel("人设提示词包");
  const characterInput = document.createElement("textarea");
  characterInput.rows = 5;
  characterInput.value = pack?.characterPack || compileActiveCharacterPack();
  characterInput.placeholder = "每行一个角色：角色名：脸型、发型、服装、标志物、气质和负面约束。";
  characterLabel.append(characterInput);

  const actions = document.createElement("div");
  actions.className = "script-actions";
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "primary-button";
  saveButton.textContent = "保存项目包";
  saveButton.addEventListener("click", () => saveProjectPackFromForm({
    title: titleInput.value,
    stylePack: styleInput.value,
    scenePack: sceneInput.value,
    characterPack: characterInput.value,
  }));

  const fillCharactersButton = document.createElement("button");
  fillCharactersButton.type = "button";
  fillCharactersButton.className = "ghost-button";
  fillCharactersButton.textContent = "汇总人设";
  fillCharactersButton.addEventListener("click", () => {
    characterInput.value = compileActiveCharacterPack();
  });

  const scriptButton = document.createElement("button");
  scriptButton.type = "button";
  scriptButton.className = "ghost-button";
  scriptButton.textContent = "进入剧本";
  scriptButton.addEventListener("click", () => setWorkspace("script"));

  actions.append(saveButton, fillCharactersButton, scriptButton);
  form.append(titleLabel, styleLabel, sceneLabel, characterLabel, actions);
  card.append(form, createWorkspaceStatus(state.projectStatus));

  const summary = createScriptCard("项目状态", "检查这部剧在进入连续关键帧前的准备情况。");
  const grid = document.createElement("div");
  grid.className = "script-meta-grid";
  [
    ["人设卡", `${getActiveCharacters().length} 张`],
    ["剧本分镜", `${getActiveScriptShots().length} 镜`],
    ["归档资产", `${getActiveArchives().length} 张`],
    ["最近保存", formatDateTime(pack?.updatedAt)],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = label;
    item.append(strong, span);
    grid.append(item);
  });
  summary.append(grid);

  elements.workspaceGrid.append(card, summary);
}

function renderCharactersWorkspace() {
  const characters = getActiveCharacters();
  const selected = characters.find((card) => card.id === state.selectedCharacterId) || null;
  elements.workspaceGrid.classList.add("character-workspace");

  const editor = createScriptCard("人设资料卡", "一张卡绑定一个角色的身份、定位和稳定提示词；保存后可写入项目人设包。");
  const form = document.createElement("div");
  form.className = "character-form";

  const selectLabel = createFieldLabel("已保存角色");
  const select = document.createElement("select");
  const draftOption = document.createElement("option");
  draftOption.value = "";
  draftOption.textContent = "新建角色 / 当前草稿";
  select.append(draftOption);
  characters.forEach((card) => {
    const option = document.createElement("option");
    option.value = card.id;
    option.textContent = card.role ? `${card.name} · ${card.role}` : card.name;
    select.append(option);
  });
  select.value = selected?.id || "";
  select.addEventListener("change", () => {
    state.selectedCharacterId = select.value;
    renderWorkspace();
  });
  selectLabel.append(select);

  const nameLabel = createFieldLabel("角色名");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 80;
  nameInput.value = selected?.name || "";
  nameInput.placeholder = "例如：林雾";
  nameLabel.append(nameInput);

  const roleLabel = createFieldLabel("角色定位");
  const roleInput = document.createElement("input");
  roleInput.type = "text";
  roleInput.maxLength = 120;
  roleInput.value = selected?.role || "";
  roleInput.placeholder = "例如：冷静女主 / 反派继承人";
  roleLabel.append(roleInput);

  const promptLabel = createFieldLabel("人设提示词卡");
  const promptInput = document.createElement("textarea");
  promptInput.rows = 7;
  promptInput.value = selected?.prompt || "";
  promptInput.placeholder = "脸型、发型、瞳色、年龄感、服装轮廓、标志物、气质、不要变化的部分。";
  promptLabel.append(promptInput);

  const actions = document.createElement("div");
  actions.className = "script-actions";
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "primary-button";
  saveButton.textContent = "保存角色";
  saveButton.addEventListener("click", () => saveCharacterFromForm({
    id: selected?.id || "",
    name: nameInput.value,
    role: roleInput.value,
    prompt: promptInput.value,
  }));

  const appendButton = document.createElement("button");
  appendButton.type = "button";
  appendButton.className = "ghost-button";
  appendButton.textContent = "写入人设包";
  appendButton.addEventListener("click", () => appendCharacterToProjectPack({
    name: nameInput.value,
    role: roleInput.value,
    prompt: promptInput.value,
  }));

  const newButton = document.createElement("button");
  newButton.type = "button";
  newButton.className = "ghost-button";
  newButton.textContent = "新建空卡";
  newButton.addEventListener("click", () => {
    state.selectedCharacterId = "";
    renderWorkspace();
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "ghost-button";
  deleteButton.textContent = "删除角色";
  deleteButton.disabled = !selected;
  deleteButton.addEventListener("click", () => deleteCharacterCard(selected));

  actions.append(saveButton, appendButton, newButton, deleteButton);
  form.append(selectLabel, nameLabel, roleLabel, promptLabel, actions);
  editor.append(form, createWorkspaceStatus(state.characterStatus));

  const list = createScriptCard("本剧角色", "这些角色会作为分镜公式的一致性基础。");
  const wrap = document.createElement("div");
  wrap.className = "mini-list";
  if (!characters.length) {
    wrap.append(createEmptyNote("还没有人设卡。先保存主角、男主/女主、反派或高频配角。"));
  } else {
    characters.forEach((card) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "mini-row";
      row.addEventListener("click", () => {
        state.selectedCharacterId = card.id;
        renderWorkspace();
      });
      const strong = document.createElement("strong");
      strong.textContent = card.name || "未命名角色";
      const span = document.createElement("span");
      const assetCount = getCharacterAssetRecords(card).length;
      const variantCount = Array.isArray(card.variants) ? card.variants.length : 0;
      span.textContent = [
        card.role || clipClientText(card.prompt, 32),
        assetCount ? `${assetCount} 张图` : "",
        variantCount ? `${variantCount} 个形象` : "",
      ].filter(Boolean).join(" · ");
      row.append(strong, span);
      wrap.append(row);
    });
  }
  list.append(wrap);

  elements.workspaceGrid.append(
    editor,
    list,
    createCharacterStudioCard(selected),
    createCharacterAssetGalleryCard(selected),
  );
}

function renderScenesWorkspace() {
  const pack = getActivePack();
  const scenes = getActiveScriptScenes();
  const sceneCards = getActiveSceneCards();
  elements.workspaceGrid.classList.add("scene-workspace");

  const editor = createScriptCard("新建场景卡", "每个固定地点做成一张卡：提示词、场景图、标签分开保存，后续分镜可以按地点调用。");
  editor.classList.add("script-card-wide");
  const form = document.createElement("div");
  form.className = "scene-card-form";

  const nameLabel = createFieldLabel("场景名");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 120;
  nameInput.placeholder = "例如：黄叶森林 / 顶楼会议室";
  nameLabel.append(nameInput);

  const tagsLabel = createFieldLabel("标签");
  const tagsInput = document.createElement("input");
  tagsInput.type = "text";
  tagsInput.placeholder = "例如：森林、秋天、黄叶、傍晚";
  tagsLabel.append(tagsInput);

  const imageLabel = createFieldLabel("场景图");
  const imageSelect = document.createElement("select");
  const sceneImageOptions = getSceneImageOptions();
  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = sceneImageOptions.length ? "暂不绑定场景图" : "暂无场景图归档";
  imageSelect.append(noneOption);
  sceneImageOptions.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.imageId;
    option.textContent = optionData.label;
    imageSelect.append(option);
  });
  imageLabel.append(imageSelect);

  const promptLabel = createFieldLabel("场景提示词");
  const promptInput = document.createElement("textarea");
  promptInput.rows = 6;
  promptInput.placeholder = "空间结构、季节天气、光线方向、主色调、材质、关键道具、固定锚点、常用镜头。";
  promptLabel.append(promptInput);

  const actions = document.createElement("div");
  actions.className = "script-actions";
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "primary-button";
  saveButton.textContent = "保存场景卡";
  saveButton.addEventListener("click", () => {
    saveSceneCard({
      name: nameInput.value,
      prompt: promptInput.value,
      imageId: imageSelect.value,
      tags: tagsInput.value,
    });
  });

  const appendScenesButton = document.createElement("button");
  appendScenesButton.type = "button";
  appendScenesButton.className = "ghost-button";
  appendScenesButton.textContent = "同步到场景包";
  appendScenesButton.disabled = sceneCards.length === 0;
  appendScenesButton.addEventListener("click", () => {
    saveScenePackFromForm(pack?.scene || "", compileSceneCardsPack(sceneCards));
  });

  const shotsButton = document.createElement("button");
  shotsButton.type = "button";
  shotsButton.className = "ghost-button";
  shotsButton.textContent = "进入分镜";
  shotsButton.addEventListener("click", () => setWorkspace("shots"));
  actions.append(saveButton, appendScenesButton, shotsButton);
  form.append(nameLabel, tagsLabel, imageLabel, promptLabel, actions);
  editor.append(form, createWorkspaceStatus(state.sceneStatus));

  const cardList = createScriptCard("场景卡片", "固定场景会在这里沉淀成可复用卡片。");
  cardList.classList.add("script-card-wide");
  const cardGrid = document.createElement("div");
  cardGrid.className = "scene-card-grid";
  if (!sceneCards.length) {
    cardGrid.append(createEmptyNote("还没有场景卡。可以手动新建，或从剧本场景一键生成。"));
  } else {
    sceneCards.forEach((scene) => cardGrid.append(createSceneCardView(scene)));
  }
  cardList.append(cardGrid);

  const list = createScriptCard("剧本场景", "从剧本包里识别出的场景，可一键变成场景卡。");
  const wrap = document.createElement("div");
  wrap.className = "mini-list";
  if (!scenes.length) {
    wrap.append(createEmptyNote("还没有剧本场景。先导入剧本包或拆分纯剧本。"));
  } else {
    scenes.slice(0, 20).forEach((scene) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "mini-row";
      row.addEventListener("click", () => {
        saveSceneCard({
          name: scene.location || scene.title || `场景 ${scene.sceneNo}`,
          prompt: formatSceneSummaryLine(scene),
          tags: [scene.location, scene.title].filter(Boolean).join("、"),
        });
      });
      const strong = document.createElement("strong");
      strong.textContent = scene.location || scene.title || `场景 ${scene.sceneNo}`;
      const span = document.createElement("span");
      span.textContent = `${scene.shotCount} 镜 · ${clipClientText(scene.summary || scene.title, 48)}`;
      row.append(strong, span);
      wrap.append(row);
    });
  }
  list.append(wrap);
  elements.workspaceGrid.append(editor, cardList, list);
}

function getActiveSceneCards() {
  return normalizeSceneCards(getActivePack()?.scenes || []);
}

function getSceneImageOptions() {
  return getActiveArchives()
    .filter((archive) => archive.category === "scene" && archive.url)
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))
    .slice(0, 80)
    .map((archive) => ({
      imageId: archive.imageId,
      url: archive.url,
      label: [
        archive.note || archive.scene || "场景图",
        archive.shotNo || "",
      ].filter(Boolean).join(" · "),
      archive,
    }));
}

function createSceneCardView(scene) {
  const article = document.createElement("article");
  article.className = "scene-card";
  const image = scene.imageId ? state.archives[scene.imageId] : null;
  if (image?.url || scene.imageUrl) {
    const img = document.createElement("img");
    img.src = image?.url || scene.imageUrl;
    img.alt = scene.name;
    article.append(img);
  }
  const body = document.createElement("div");
  body.className = "scene-card-body";
  const title = document.createElement("h3");
  title.textContent = scene.name || "未命名场景";
  const prompt = document.createElement("p");
  prompt.textContent = clipClientText(scene.prompt || "场景提示词待补。", 180);
  body.append(title, prompt);
  if (scene.tags?.length) {
    const tags = document.createElement("div");
    tags.className = "scene-card-tags";
    scene.tags.slice(0, 6).forEach((tag) => {
      const span = document.createElement("span");
      span.textContent = tag;
      tags.append(span);
    });
    body.append(tags);
  }

  const actions = document.createElement("div");
  actions.className = "script-actions";
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "ghost-button";
  copyButton.textContent = "复制提示词";
  copyButton.addEventListener("click", () => copyShotPrompt(formatSceneCardPrompt(scene)));
  const packButton = document.createElement("button");
  packButton.type = "button";
  packButton.className = "ghost-button";
  packButton.textContent = "写入场景包";
  packButton.addEventListener("click", () => appendSceneCardToPack(scene));
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "ghost-button danger-inline";
  deleteButton.textContent = "删除";
  deleteButton.addEventListener("click", () => deleteSceneCard(scene.id));
  actions.append(copyButton, packButton, deleteButton);
  body.append(actions);
  article.append(body);
  return article;
}

function formatSceneCardPrompt(scene) {
  return [
    `场景卡：${scene.name || "未命名场景"}`,
    scene.prompt || "",
    scene.tags?.length ? `标签：${scene.tags.join("、")}` : "",
  ].filter(Boolean).join("\n");
}

function compileSceneCardsPack(scenes = getActiveSceneCards()) {
  return scenes.map(formatSceneCardPrompt).filter(Boolean).join("\n\n");
}

function saveSceneCard(value) {
  const name = String(value?.name || "").trim();
  const prompt = String(value?.prompt || "").trim();
  if (!name || !prompt) {
    state.sceneStatus = { type: "error", text: "场景名和场景提示词都要填写。" };
    renderWorkspace();
    return;
  }
  const now = new Date().toISOString();
  const pack = getActivePack() || {
    id: makeEntityId("pack", state.activeProject),
    title: state.activeProject,
  };
  const image = value.imageId ? state.archives[value.imageId] : null;
  const scene = normalizeSceneCards([{
    id: value.id || makeEntityId("scene", `${state.activeProject}-${name}`),
    name,
    prompt,
    imageId: value.imageId || "",
    imageUrl: image?.url || "",
    tags: value.tags,
    createdAt: now,
    updatedAt: now,
  }])[0];
  const scenes = [
    scene,
    ...normalizeSceneCards(pack.scenes || []).filter((item) => item.id !== scene.id && normalizePromptMatchKey(item.name) !== normalizePromptMatchKey(scene.name)),
  ].slice(0, 200);
  upsertScenePack({
    ...pack,
    scenes,
    scene: pack.scene || name,
    scenePack: pack.scenePack || compileSceneCardsPack(scenes),
    updatedAt: now,
  });
  state.sceneStatus = { type: "success", text: `已保存场景卡：${scene.name}。` };
  renderAll();
  setWorkspace("scenes");
}

function appendSceneCardToPack(scene) {
  const pack = getActivePack() || {
    id: makeEntityId("pack", state.activeProject),
    title: state.activeProject,
  };
  upsertScenePack({
    ...pack,
    scenePack: mergeTextBlocks(pack.scenePack, [formatSceneCardPrompt(scene)]),
    updatedAt: new Date().toISOString(),
  });
  state.sceneStatus = { type: "success", text: `已写入场景包：${scene.name}。` };
  renderAll();
  setWorkspace("scenes");
}

function deleteSceneCard(sceneId) {
  const pack = getActivePack();
  if (!pack || !sceneId) {
    return;
  }
  if (!window.confirm("删除这张场景卡？不会删除已归档的场景图。")) {
    return;
  }
  upsertScenePack({
    ...pack,
    scenes: normalizeSceneCards(pack.scenes || []).filter((scene) => scene.id !== sceneId),
    updatedAt: new Date().toISOString(),
  });
  state.sceneStatus = { type: "info", text: "场景卡已删除。" };
  renderAll();
  setWorkspace("scenes");
}

function createCharacterStudioCard(card) {
  const studio = createScriptCard("角色生图区", "用角色提示词包生成基准图、三视图和细节图，结果会自动归档到当前剧名和当前角色。");
  studio.classList.add("script-card-wide", "character-generation-card");
  if (!card) {
    studio.append(createEmptyNote("先保存并选择一个角色，再生成基准图、三视图或细节图。"));
    return studio;
  }

  const templates = getCharacterGenerationTemplates();
  const selectedTemplate = getSelectedCharacterTemplate();
  const variants = getCharacterVariants(card);
  ensureCharacterStudioDefaults(card);

  const top = document.createElement("div");
  top.className = "character-studio-top";

  const variantLabel = createFieldLabel("形象变体");
  const variantSelect = document.createElement("select");
  variants.forEach((variant) => {
    const option = document.createElement("option");
    option.value = variant.id;
    option.textContent = variant.name;
    variantSelect.append(option);
  });
  variantSelect.value = variants.some((variant) => variant.id === state.characterStudio.variantId)
    ? state.characterStudio.variantId
    : DEFAULT_CHARACTER_VARIANT_ID;
  variantSelect.addEventListener("change", () => {
    state.characterStudio.variantId = variantSelect.value;
    const variant = variants.find((item) => item.id === variantSelect.value);
    state.characterStudio.variantName = variant?.custom ? variant.name : "";
    state.characterStudio.variantPrompt = variant?.custom ? variant.prompt : "";
    state.characterStudio.referenceImageId = "";
    state.characterStudio.detailReferenceImageId = "";
    renderWorkspace();
  });
  variantLabel.append(variantSelect);

  const variantNameLabel = createFieldLabel("新/改形象名");
  const variantNameInput = document.createElement("input");
  variantNameInput.type = "text";
  variantNameInput.maxLength = 80;
  variantNameInput.value = state.characterStudio.variantName || "";
  variantNameInput.placeholder = "例如：战损版 / 男变女 / 兽化";
  variantNameInput.addEventListener("input", () => {
    state.characterStudio.variantName = variantNameInput.value;
  });
  variantNameLabel.append(variantNameInput);

  const referenceLabel = createFieldLabel("参考图");
  const referenceSelect = document.createElement("select");
  const references = getCharacterReferenceOptions(card);
  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = selectedTemplate.referenceMode === "none" ? "基准图不使用参考图" : "自动选择最新基准图";
  referenceSelect.append(noneOption);
  references.forEach((reference) => {
    const option = document.createElement("option");
    option.value = reference.id;
    option.textContent = reference.label;
    referenceSelect.append(option);
  });
  referenceSelect.value = references.some((item) => item.id === state.characterStudio.referenceImageId)
    ? state.characterStudio.referenceImageId
    : "";
  referenceSelect.disabled = selectedTemplate.referenceMode === "none" || references.length === 0;
  referenceSelect.addEventListener("change", () => {
    state.characterStudio.referenceImageId = referenceSelect.value;
    renderWorkspace();
  });
  referenceLabel.append(referenceSelect);

  const detailReferenceLabel = createFieldLabel("服装/细节参考图");
  const detailReferenceSelect = document.createElement("select");
  const detailNoneOption = document.createElement("option");
  detailNoneOption.value = "";
  detailNoneOption.textContent = "不使用第二参考图";
  detailReferenceSelect.append(detailNoneOption);
  references.forEach((reference) => {
    const option = document.createElement("option");
    option.value = reference.id;
    option.textContent = reference.label;
    detailReferenceSelect.append(option);
  });
  detailReferenceSelect.value = references.some((item) => item.id === state.characterStudio.detailReferenceImageId)
    ? state.characterStudio.detailReferenceImageId
    : "";
  detailReferenceSelect.disabled = references.length === 0;
  detailReferenceSelect.addEventListener("change", () => {
    state.characterStudio.detailReferenceImageId = detailReferenceSelect.value;
    renderWorkspace();
  });
  detailReferenceLabel.append(detailReferenceSelect);

  const countLabel = createFieldLabel("张数");
  const countInput = document.createElement("input");
  countInput.type = "number";
  countInput.min = "1";
  countInput.max = "4";
  countInput.value = String(state.characterStudio.count || selectedTemplate.count || 1);
  countInput.addEventListener("input", () => {
    state.characterStudio.count = clampNumber(countInput.value, 1, 4, selectedTemplate.count || 1);
  });
  countLabel.append(countInput);

  const sizeLabel = createFieldLabel("尺寸");
  const sizeSelect = document.createElement("select");
  [
    ["", `按模板：${selectedTemplate.size}`],
    ["1024x1536", "竖图 1024x1536"],
    ["1536x1024", "横图 1536x1024"],
    ["1024x1024", "方图 1024x1024"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    sizeSelect.append(option);
  });
  sizeSelect.value = state.characterStudio.size || "";
  sizeSelect.addEventListener("change", () => {
    state.characterStudio.size = sizeSelect.value;
  });
  sizeLabel.append(sizeSelect);

  top.append(variantLabel, variantNameLabel, referenceLabel, detailReferenceLabel, countLabel, sizeLabel);

  const templateGrid = document.createElement("div");
  templateGrid.className = "character-template-grid";
  templates.forEach((template) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `character-template-button${template.id === selectedTemplate.id ? " active" : ""}`;
    button.textContent = template.label;
    button.addEventListener("click", () => {
      state.characterStudio.templateId = template.id;
      state.characterStudio.count = template.count || 1;
      state.characterStudio.size = "";
      if (template.referenceMode === "none") {
        state.characterStudio.referenceImageId = "";
      }
      renderWorkspace();
    });
    templateGrid.append(button);
  });

  const variantPromptLabel = createFieldLabel("形象补充提示词");
  const variantPromptInput = document.createElement("textarea");
  variantPromptInput.rows = 3;
  variantPromptInput.value = state.characterStudio.variantPrompt || getSelectedCharacterVariant(card)?.prompt || "";
  variantPromptInput.placeholder = "只写当前形象和默认人设不同的部分，例如：战损版，外套破损，脸颊轻微擦伤；或男变女/兽变人等形象差异。";
  variantPromptInput.addEventListener("input", () => {
    state.characterStudio.variantPrompt = variantPromptInput.value;
  });
  variantPromptLabel.append(variantPromptInput);

  const detailLabel = createFieldLabel("细节目标");
  const detailInput = document.createElement("input");
  detailInput.type = "text";
  detailInput.maxLength = 120;
  detailInput.value = state.characterStudio.detailTarget || "";
  detailInput.placeholder = "生成细节图时填写：衣领、耳坠、纹身、武器、徽记等";
  detailInput.addEventListener("input", () => {
    state.characterStudio.detailTarget = detailInput.value;
  });
  detailLabel.append(detailInput);

  const negativeLabel = createFieldLabel("反向提示词");
  const negativeInput = document.createElement("textarea");
  negativeInput.rows = 3;
  negativeInput.value = state.characterStudio.negativePrompt || DEFAULT_CHARACTER_NEGATIVE_PROMPT;
  negativeInput.addEventListener("input", () => {
    state.characterStudio.negativePrompt = negativeInput.value;
  });
  negativeLabel.append(negativeInput);

  const promptPreview = document.createElement("pre");
  promptPreview.className = "shot-prompt-preview character-prompt-preview";
  promptPreview.textContent = buildCharacterGenerationPrompt(card, {
    template: selectedTemplate,
    variant: getDraftCharacterVariant(card),
    reference: getSelectedCharacterReference(card, selectedTemplate),
    detailReference: getSelectedCharacterDetailReference(card),
    detailTarget: state.characterStudio.detailTarget,
  });

  const actions = document.createElement("div");
  actions.className = "script-actions";
  const saveVariantButton = document.createElement("button");
  saveVariantButton.type = "button";
  saveVariantButton.className = "ghost-button";
  saveVariantButton.textContent = "保存形象变体";
  saveVariantButton.addEventListener("click", () => saveCharacterVariantFromStudio(card));

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "ghost-button";
  copyButton.textContent = "复制提示词";
  copyButton.addEventListener("click", () => copyCharacterPrompt(promptPreview.textContent));

  const generateButton = document.createElement("button");
  generateButton.type = "button";
  generateButton.className = "primary-button";
  generateButton.textContent = "生成角色图";
  generateButton.addEventListener("click", () => generateCharacterAssetFromStudio(card, generateButton));

  actions.append(saveVariantButton, copyButton, generateButton);
  studio.append(
    top,
    createCharacterVariantStrip(card, variants),
    templateGrid,
    createWorkspaceStatus(state.characterStudioStatus, "character-studio-status"),
    variantPromptLabel,
    detailLabel,
    negativeLabel,
    promptPreview,
    actions,
  );
  return studio;
}

function createCharacterAssetGalleryCard(card) {
  const gallery = createScriptCard("角色图集", "当前角色的人设资料、三视图、细节图会在这里集中预览，后续分镜可作为参考图调用。");
  gallery.classList.add("script-card-wide");
  if (!card) {
    gallery.append(createEmptyNote("选择角色后，这里会显示该角色已归档的基准图、三视图和细节图。"));
    return gallery;
  }

  const records = getCharacterAssetRecords(card)
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  const imageById = new Map(state.images.map((image) => [image.id, image]));
  const grid = document.createElement("div");
  grid.className = "asset-grid archive-asset-grid character-asset-grid";
  if (!records.length) {
    grid.append(createEmptyNote("这个角色还没有图集。建议先生成“基准图”，再用它作为参考图做全身、主视、侧视、后视和细节图。"));
  } else {
    records.slice(0, 24).forEach((archive) => {
      const image = imageById.get(archive.imageId) || {};
      grid.append(createAssetCard({
        ...image,
        id: archive.imageId,
        url: image.url || archive.url,
        archive,
      }, { character: card }));
    });
  }
  gallery.append(createWorkspaceStatus(state.characterAssetStatus, "character-asset-status"), grid);
  return gallery;
}

function createCharacterVariantStrip(card, variants = getCharacterVariants(card)) {
  const strip = document.createElement("div");
  strip.className = "character-variant-strip";
  variants.forEach((variant) => {
    const assets = getCharacterVariantAssets(card, variant);
    const imageIds = mergeUniqueStrings([
      assets.primaryImageId,
      assets.baseImageId,
      assets.fullBodyImageId,
      assets.frontImageId,
      assets.sideImageId,
      assets.backImageId,
      assets.threeQuarterImageId,
      ...(assets.baseImages || []),
      ...(assets.viewImages || []),
      ...(assets.detailImages || []),
    ]);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `variant-card${variant.id === state.characterStudio.variantId ? " active" : ""}`;
    button.addEventListener("click", () => {
      state.characterStudio.variantId = variant.id;
      state.characterStudio.variantName = variant.custom ? variant.name : "";
      state.characterStudio.variantPrompt = variant.custom ? variant.prompt : "";
      state.characterStudio.referenceImageId = "";
      state.characterStudio.detailReferenceImageId = "";
      renderWorkspace();
    });
    const name = document.createElement("strong");
    name.textContent = variant.name;
    const meta = document.createElement("span");
    meta.textContent = `${variant.custom ? "形象卡" : "默认卡"} · ${imageIds.length} 张图`;
    button.append(name, meta);
    strip.append(button);
  });
  return strip;
}

function getCharacterGenerationTemplates() {
  return CHARACTER_GENERATION_TEMPLATES;
}

function getSelectedCharacterTemplate() {
  return getCharacterGenerationTemplates().find((template) => template.id === state.characterStudio.templateId)
    || getCharacterGenerationTemplates()[0];
}

function ensureCharacterStudioDefaults(card) {
  const template = getSelectedCharacterTemplate();
  const variants = getCharacterVariants(card);
  if (!variants.some((variant) => variant.id === state.characterStudio.variantId)) {
    state.characterStudio.variantId = DEFAULT_CHARACTER_VARIANT_ID;
    state.characterStudio.variantName = "";
    state.characterStudio.variantPrompt = "";
  }
  state.characterStudio.negativePrompt = state.characterStudio.negativePrompt || DEFAULT_CHARACTER_NEGATIVE_PROMPT;
  state.characterStudio.count = clampNumber(state.characterStudio.count, 1, 4, template.count || 1);
  if (template.referenceMode === "none") {
    state.characterStudio.referenceImageId = "";
  }
}

function getCharacterVariants(card) {
  const defaultVariant = {
    id: DEFAULT_CHARACTER_VARIANT_ID,
    name: "原身",
    prompt: "",
    assets: normalizeCharacterAssets(card?.assets),
    custom: false,
  };
  const variants = Array.isArray(card?.variants)
    ? card.variants.map(normalizeCharacterVariant).filter(Boolean)
    : [];
  return [defaultVariant, ...variants.map((variant) => ({ ...variant, custom: true }))];
}

function getCharacterVariantLabel(variant) {
  return isDefaultCharacterVariant(variant) ? "原身" : String(variant?.name || "未命名形象").trim();
}

function getCharacterVariantById(card, variantId = DEFAULT_CHARACTER_VARIANT_ID) {
  const id = String(variantId || DEFAULT_CHARACTER_VARIANT_ID).trim();
  return getCharacterVariants(card).find((variant) => variant.id === id) || null;
}

function getArchiveCharacterVariant(card, archive = {}) {
  if (!card) {
    return null;
  }
  const variantId = String(archive?.variantId || "").trim();
  if (variantId) {
    const byId = getCharacterVariantById(card, variantId);
    if (byId) {
      return byId;
    }
  }
  const variantNameKey = normalizePromptMatchKey(archive?.variantName);
  if (variantNameKey) {
    const byName = getCharacterVariants(card).find((variant) => (
      !isDefaultCharacterVariant(variant) && normalizePromptMatchKey(variant.name) === variantNameKey
    ));
    if (byName) {
      return byName;
    }
  }
  return getCharacterVariantById(card, DEFAULT_CHARACTER_VARIANT_ID);
}

function resolveCharacterVariant(card, variant = null) {
  if (typeof variant === "string") {
    return getCharacterVariantById(card, variant) || getCharacterVariantById(card, DEFAULT_CHARACTER_VARIANT_ID);
  }
  if (!variant) {
    return getActiveCharacterVariant(card) || getCharacterVariantById(card, DEFAULT_CHARACTER_VARIANT_ID);
  }
  if (isDefaultCharacterVariant(variant)) {
    return getCharacterVariantById(card, DEFAULT_CHARACTER_VARIANT_ID) || getCharacterVariants(card)[0] || null;
  }
  const byId = getCharacterVariantById(card, variant.id);
  const normalized = normalizeCharacterVariant({
    ...(byId || {}),
    ...variant,
    assets: normalizeCharacterAssets(byId?.assets || variant.assets),
  });
  return normalized ? { ...normalized, custom: true } : getActiveCharacterVariant(card);
}

function getSelectedCharacterVariant(card) {
  return getCharacterVariants(card).find((variant) => variant.id === state.characterStudio.variantId) || null;
}

function getActiveCharacterVariant(card) {
  return getSelectedCharacterVariant(card) || getCharacterVariants(card)[0] || null;
}

function isDefaultCharacterVariant(variantOrId) {
  const id = typeof variantOrId === "object" ? variantOrId?.id : variantOrId;
  return !id || id === DEFAULT_CHARACTER_VARIANT_ID;
}

function getDraftCharacterVariant(card) {
  const selected = getSelectedCharacterVariant(card);
  const draftName = String(state.characterStudio.variantName || "").trim();
  const draftPrompt = String(state.characterStudio.variantPrompt || "").trim();
  if (draftName || draftPrompt) {
    return {
      id: selected?.custom ? selected.id : "",
      name: draftName || selected?.name || "原身",
      prompt: draftPrompt || selected?.prompt || "",
      assets: selected?.custom ? normalizeCharacterAssets(selected.assets) : normalizeCharacterAssets(),
      custom: Boolean(draftName || draftPrompt || selected?.custom),
    };
  }
  return selected || getCharacterVariants(card)[0];
}

function getCharacterVariantAssets(card, variant = getActiveCharacterVariant(card)) {
  if (isDefaultCharacterVariant(variant)) {
    return normalizeCharacterAssets(card?.assets);
  }
  const resolved = resolveCharacterVariant(card, variant);
  return normalizeCharacterAssets(resolved?.assets);
}

function upsertCharacterVariant(card, variant) {
  const normalized = normalizeCharacter(card);
  const normalizedVariant = normalizeCharacterVariant(variant);
  if (!normalized || !normalizedVariant) {
    return normalized;
  }
  return normalizeCharacter({
    ...normalized,
    variants: [
      normalizedVariant,
      ...(Array.isArray(normalized.variants) ? normalized.variants : []).filter((item) => item.id !== normalizedVariant.id),
    ],
    updatedAt: new Date().toISOString(),
  });
}

function upsertCharacterVariantAssets(card, variant, assets, now = new Date().toISOString()) {
  const normalized = normalizeCharacter(card);
  const nextAssets = normalizeCharacterAssets(assets);
  if (!normalized) {
    return normalized;
  }
  if (isDefaultCharacterVariant(variant)) {
    return normalizeCharacter({
      ...normalized,
      assets: nextAssets,
      updatedAt: now,
    });
  }

  const normalizedVariant = normalizeCharacterVariant({
    ...variant,
    assets: nextAssets,
    updatedAt: now,
  });
  if (!normalizedVariant) {
    return normalized;
  }
  return normalizeCharacter({
    ...normalized,
    variants: [
      normalizedVariant,
      ...(Array.isArray(normalized.variants) ? normalized.variants : []).filter((item) => item.id !== normalizedVariant.id),
    ],
    updatedAt: now,
  });
}

function getCharacterAssetRecords(card, variant = getActiveCharacterVariant(card)) {
  if (!card) {
    return [];
  }
  const characterNameKey = normalizePromptMatchKey(card.name);
  const variantId = isDefaultCharacterVariant(variant) ? "" : String(variant?.id || "").trim();
  const variantNameKey = normalizePromptMatchKey(variantId ? variant?.name : "");
  const characterCategories = new Set(["character-profile", "turnaround", "detail", "expression"]);
  return getActiveArchives().filter((archive) => {
    if (!characterCategories.has(archive.category)) {
      return false;
    }

    const archiveVariantId = String(archive.variantId || "").trim();
    const archiveVariantNameKey = normalizePromptMatchKey(archive.variantName);
    const archiveNameKey = normalizePromptMatchKey(archive.characterName);
    const archiveCharacterMatch = archive.characterId
      ? archive.characterId === card.id
      : (characterNameKey && archiveNameKey && (archiveNameKey.includes(characterNameKey) || characterNameKey.includes(archiveNameKey)))
        || (Array.isArray(archive.characters)
          && archive.characters.some((name) => normalizePromptMatchKey(name) === characterNameKey));
    if (variantId) {
      return Boolean(archiveCharacterMatch)
        && (archiveVariantId === variantId || (variantNameKey && archiveVariantNameKey === variantNameKey));
    }
    if (archiveVariantId || archiveVariantNameKey) {
      return false;
    }
    if (archive.characterId && archiveCharacterMatch) {
      return true;
    }
    if (archiveCharacterMatch) {
      return true;
    }
    return false;
  });
}

function getCharacterReferenceOptions(card, variant = getActiveCharacterVariant(card)) {
  const assets = getCharacterVariantAssets(card, variant);
  const records = getCharacterAssetRecords(card, variant)
    .filter((archive) => archive.url)
    .sort((a, b) => {
      const pinned = new Set([
        assets.primaryImageId,
        assets.baseImageId,
        assets.fullBodyImageId,
      ].filter(Boolean));
      const pinScore = (item) => pinned.has(item.imageId) ? 0 : 1;
      if (pinScore(a) !== pinScore(b)) {
        return pinScore(a) - pinScore(b);
      }
      const priority = (item) => item.category === "character-profile" ? 0 : item.category === "turnaround" ? 1 : 2;
      return priority(a) - priority(b)
        || String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
    });
  const options = records.map((archive) => ({
    id: archive.imageId,
    label: [
      getCharacterAssetSlotLabels(card, archive.imageId, variant)[0],
      categoryLabels[archive.category] || "角色图",
      archive.note || archive.batchId || archive.imageId,
    ].filter(Boolean).join(" · "),
    imageId: archive.imageId,
    url: archive.url,
    archive,
  }));
  return addManualReferenceOptions(options, card, variant);
}

function addManualReferenceOptions(options, card, variant) {
  const next = Array.isArray(options) ? [...options] : [];
  const seen = new Set(next.map((item) => item.id));
  [
    state.characterStudio.referenceImageId,
    state.characterStudio.detailReferenceImageId,
  ].forEach((imageId) => {
    const option = getArchiveReferenceOption(imageId, card, variant);
    if (option && !seen.has(option.id)) {
      next.push(option);
      seen.add(option.id);
    }
  });
  return next;
}

function getArchiveReferenceOption(imageId, card, variant) {
  const id = String(imageId || "").trim();
  if (!id) {
    return null;
  }
  const archive = state.archives[id];
  if (!archive || archive.title !== state.activeProject || !archive.url) {
    return null;
  }
  return {
    id,
    label: [
      card ? getCharacterAssetSlotLabels(card, id, variant)[0] : "",
      categoryLabels[archive.category] || "图集参考",
      archive.note || archive.shotNo || archive.batchId || id,
    ].filter(Boolean).join(" · "),
    imageId: id,
    url: archive.url,
    archive,
  };
}

function getSelectedCharacterReference(card, template = getSelectedCharacterTemplate()) {
  if (template.referenceMode === "none") {
    return null;
  }
  const variant = getActiveCharacterVariant(card);
  const assets = getCharacterVariantAssets(card, variant);
  const references = getCharacterReferenceOptions(card, variant);
  if (!references.length) {
    return null;
  }
  return references.find((item) => item.id === state.characterStudio.referenceImageId)
    || references.find((item) => item.id === assets.primaryImageId)
    || references.find((item) => item.id === assets.baseImageId)
    || references.find((item) => item.id === assets.fullBodyImageId)
    || references[0];
}

function getSelectedCharacterDetailReference(card) {
  const references = getCharacterReferenceOptions(card, getActiveCharacterVariant(card));
  const selected = references.find((item) => item.id === state.characterStudio.detailReferenceImageId);
  return selected || null;
}

function normalizeCharacterAssets(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const normalized = {
    primaryImageId: String(source.primaryImageId || "").trim(),
    baseImageId: String(source.baseImageId || "").trim(),
    fullBodyImageId: String(source.fullBodyImageId || "").trim(),
    frontImageId: String(source.frontImageId || "").trim(),
    sideImageId: String(source.sideImageId || "").trim(),
    backImageId: String(source.backImageId || "").trim(),
    threeQuarterImageId: String(source.threeQuarterImageId || "").trim(),
    clothingDetailImageId: String(source.clothingDetailImageId || "").trim(),
    accessoryDetailImageId: String(source.accessoryDetailImageId || "").trim(),
    markDetailImageId: String(source.markDetailImageId || "").trim(),
    customDetailImageId: String(source.customDetailImageId || "").trim(),
    expressionImageId: String(source.expressionImageId || "").trim(),
    baseImages: mergeUniqueStrings(source.baseImages || []),
    viewImages: mergeUniqueStrings(source.viewImages || []),
    detailImages: mergeUniqueStrings(source.detailImages || []),
  };
  if (!normalized.primaryImageId) {
    normalized.primaryImageId = normalized.baseImageId || normalized.baseImages[0] || "";
  }
  if (!normalized.baseImageId) {
    normalized.baseImageId = normalized.primaryImageId || normalized.baseImages[0] || "";
  }
  return normalized;
}

function getCharacterAssetSlotLabels(card, imageId, variant = getActiveCharacterVariant(card)) {
  const targetId = String(imageId || "").trim();
  if (!card || !targetId) {
    return [];
  }
  const assets = getCharacterVariantAssets(card, variant);
  return CHARACTER_ASSET_SLOTS
    .filter((slot) => assets[slot.field] === targetId)
    .map((slot) => slot.shortLabel);
}

function collectCharacterAssetUsages(card, imageId, variant) {
  const targetId = String(imageId || "").trim();
  if (!card || !targetId) {
    return [];
  }
  const activeVariant = resolveCharacterVariant(card, variant);
  const assets = getCharacterVariantAssets(card, activeVariant);
  return CHARACTER_ASSET_SLOTS
    .filter((slot) => assets[slot.field] === targetId)
    .map((slot) => ({
      type: "character-slot",
      characterId: card.id,
      characterName: card.name || "未命名角色",
      variantId: isDefaultCharacterVariant(activeVariant) ? "" : activeVariant?.id || "",
      variantName: getCharacterVariantLabel(activeVariant),
      slotId: slot.id,
      slotLabel: slot.archiveLabel || slot.shortLabel,
    }));
}

function slotForCharacterTemplate(template) {
  const templateId = String(template?.id || "").trim();
  if (templateId === "base") {
    return CHARACTER_ASSET_SLOTS.find((slot) => slot.id === "base");
  }
  return CHARACTER_ASSET_SLOTS.find((slot) => slot.id === templateId)
    || CHARACTER_ASSET_SLOTS.find((slot) => slot.category === template?.category)
    || CHARACTER_ASSET_SLOTS[1];
}

function upsertCharacterAssetSlot(card, imageId, slot, now = new Date().toISOString(), variant = getActiveCharacterVariant(card)) {
  const normalized = normalizeCharacter(card);
  const cleanImageId = String(imageId || "").trim();
  if (!normalized || !cleanImageId || !slot) {
    return normalized;
  }
  const assets = getCharacterVariantAssets(normalized, variant);
  assets[slot.field] = cleanImageId;
  if (slot.id === "primary") {
    assets.baseImageId = assets.baseImageId || cleanImageId;
  }
  if (slot.id === "base") {
    assets.primaryImageId = assets.primaryImageId || cleanImageId;
  }
  if (slot.legacyKey) {
    assets[slot.legacyKey] = mergeUniqueStrings([cleanImageId, ...(assets[slot.legacyKey] || [])]);
  }
  return upsertCharacterVariantAssets(normalized, variant, assets, now);
}

function assignCharacterAssetSlot(card, image, slotId, variant = getActiveCharacterVariant(card)) {
  const normalized = normalizeCharacter(card);
  const imageId = String(image?.id || image?.archive?.imageId || "").trim();
  const slot = CHARACTER_ASSET_SLOTS.find((item) => item.id === slotId);
  if (!normalized || !imageId || !slot) {
    return;
  }
  const now = new Date().toISOString();
  const activeVariant = resolveCharacterVariant(normalized, variant);
  const next = upsertCharacterAssetSlot(normalized, imageId, slot, now, activeVariant);
  const variantId = isDefaultCharacterVariant(activeVariant) ? "" : activeVariant.id;
  const variantName = isDefaultCharacterVariant(activeVariant) ? "" : activeVariant.name;
  state.characters = [
    next,
    ...state.characters.filter((item) => item.id !== next.id),
  ].filter(Boolean).slice(0, 300);
  state.selectedCharacterId = next.id;

  const archive = normalizeArchive({
    ...(state.archives[imageId] || image.archive || {}),
    imageId,
    title: state.activeProject,
    category: slot.category,
    note: [
      next.name,
      variantName,
      slot.archiveLabel,
      image.archive?.variantName || "",
    ].filter(Boolean).join(" · "),
    characterId: next.id,
    characterName: next.name,
    characters: [next.name],
    variantId,
    variantName,
    url: image.url || image.archive?.url || "",
    updatedAt: now,
    createdAt: image.archive?.createdAt || image.createdAt || now,
  });
  if (archive) {
    state.archives[imageId] = archive;
  }

  writeManjuCharacterCards();
  writeManjuArchives();
  state.characterAssetStatus = {
    type: "success",
    text: slot.id === "primary"
      ? `已把这张图星标为 ${next.name}${variantName ? ` · ${variantName}` : ""} 的基准图。`
      : `已把这张图插入 ${next.name}${variantName ? ` · ${variantName}` : ""} 的${slot.archiveLabel}。`,
  };
  renderAll();
  openAssetPreview({
    ...image,
    id: imageId,
    archive: state.archives[imageId] || image.archive,
  }, { character: next, variantId: variantId || DEFAULT_CHARACTER_VARIANT_ID });
}

function buildCharacterGenerationPrompt(card, options = {}) {
  const template = options.template || getSelectedCharacterTemplate();
  const variant = options.variant || getDraftCharacterVariant(card);
  const reference = options.reference || null;
  const detailReference = options.detailReference || null;
  const detailTarget = String(options.detailTarget || "").trim();
  const pack = getActivePack();
  const variantPrompt = String(variant?.prompt || "").trim();
  const detailLine = detailTarget
    ? `细节目标：${detailTarget}。只放大展示这个部位或物件，不改动角色核心设计。`
    : "";
  const referenceLine = reference
    ? "参考图使用规则：与参考图人物形象100%一致，完全相同的五官、脸型、发型、发色、瞳色、服装、配饰、配色、材质、画风；仅按本次模板改变视角、构图或细节展示。"
    : template.referenceMode === "require"
      ? "参考图缺失提示：本模板强烈建议先生成并选择基准图，否则一致性会下降。"
      : "";
  const detailReferenceLine = detailReference
    ? "第二参考图使用规则：只提取服装款式、配饰、纹样、材质、颜色或指定细节；人物身份、五官、脸型、发型和整体画风仍以角色主参考图与人设提示词为准，避免把第二参考图的人脸或体型带入。"
    : "";

  return [
    buildShotPromptSection(
      "全局画风（精简）：",
      pack?.stylePack,
      "竖屏漫剧，统一画风，精致线稿，角色一致，干净背景，适合作为后续分镜参考。",
      900,
    ),
    `剧名：${state.activeProject}`,
    `角色：${card.name}${card.role ? `（${card.role}）` : ""}`,
    `当前形象：${variant?.name || "默认形象"}`,
    [
      "角色主提示词（身份锚点，来自人设卡）：",
      clipPromptSection(card.prompt, 1200),
    ].join("\n"),
    variantPrompt
      ? [
        "当前形象变体提示词（独立生效）：",
        "只改变本段明确指定的性别、形态、状态、服装破损、兽化/Q版/战损等差异；如与角色主提示词冲突，以本段为准；未提到的五官、脸型、发型、发色、瞳色、核心服装、标志物和画风继续保持主提示词一致。",
        clipPromptSection(variantPrompt, 700),
      ].join("\n")
      : "",
    `生成模板：${template.label}\n${template.instruction}`,
    detailLine,
    referenceLine,
    detailReferenceLine,
    "硬性要求：人物身份一致，画面无文字、无字幕、无水印、无 logo；不要更换脸型、发型、发色、服装核心设计、标志物和画风；背景保持简洁，不抢主体。",
  ].filter(Boolean).join("\n\n");
}

function saveCharacterVariantFromStudio(card) {
  if (!card) {
    return;
  }
  const name = String(state.characterStudio.variantName || "").trim();
  const prompt = String(state.characterStudio.variantPrompt || "").trim();
  if (!name || !prompt) {
    state.characterStudioStatus = { type: "error", text: "形象变体需要填写名称和补充提示词。" };
    renderAll();
    return;
  }
  const existing = getSelectedCharacterVariant(card);
  const variant = normalizeCharacterVariant({
    id: existing?.custom ? existing.id : makeEntityId("variant", `${card.name}-${name}`),
    name,
    prompt,
    assets: existing?.custom ? existing.assets : undefined,
    referenceImageId: existing?.referenceImageId || "",
    updatedAt: new Date().toISOString(),
  });
  const next = upsertCharacterVariant(card, variant);
  state.characters = [
    next,
    ...state.characters.filter((item) => item.id !== next.id),
  ].filter(Boolean).slice(0, 300);
  state.selectedCharacterId = next.id;
  state.characterStudio.variantId = variant.id;
  writeManjuCharacterCards();
  state.characterStudioStatus = { type: "success", text: `已保存形象变体：${variant.name}。` };
  renderAll();
}

async function copyCharacterPrompt(prompt) {
  try {
    await writeClipboardText(prompt);
    state.characterStudioStatus = { type: "success", text: "已复制角色生图提示词。" };
  } catch {
    state.characterStudioStatus = { type: "error", text: "复制失败，可以手动选中提示词复制。" };
  }
  renderWorkspace();
}

async function generateCharacterAssetFromStudio(card, button) {
  const normalizedCard = normalizeCharacter(card);
  if (!normalizedCard?.name || !normalizedCard.prompt) {
    state.characterStudioStatus = { type: "error", text: "先保存角色名和人设提示词卡，再生成角色图。" };
    renderAll();
    return;
  }
  const template = getSelectedCharacterTemplate();
  const reference = getSelectedCharacterReference(normalizedCard, template);
  if (template.referenceMode === "require" && !reference) {
    state.characterStudioStatus = { type: "error", text: `“${template.label}”需要先选择角色基准图或全身图作为参考。` };
    renderAll();
    return;
  }

  const variant = getDraftCharacterVariant(normalizedCard);
  const detailReference = getSelectedCharacterDetailReference(normalizedCard);
  const prompt = buildCharacterGenerationPrompt(normalizedCard, {
    template,
    variant,
    reference,
    detailReference,
    detailTarget: state.characterStudio.detailTarget,
  });
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "生成中";
  state.characterStudioStatus = { type: "info", text: `正在生成 ${normalizedCard.name} · ${template.label}，请稍候。` };
  renderWorkspace();

  try {
    const payload = {
      prompt,
      negativePrompt: state.characterStudio.negativePrompt || DEFAULT_CHARACTER_NEGATIVE_PROMPT,
      size: state.characterStudio.size || template.size || "1024x1536",
      quality: "high",
      count: clampNumber(state.characterStudio.count, 1, 4, template.count || 1),
      outputFormat: "png",
      background: "opaque",
      referenceImages: [
        reference ? {
        name: `${normalizedCard.name}-${template.label}-reference`,
        url: reference.url,
        source: "manju-character-reference",
        } : null,
        detailReference ? {
          name: `${normalizedCard.name}-${template.label}-detail-reference`,
          url: detailReference.url,
          source: "manju-character-detail-reference",
        } : null,
      ].filter(Boolean),
      manjuContext: buildCharacterGenerationContext(normalizedCard, template, variant),
    };
    const result = await fetchJson("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, 620000);
    const images = Array.isArray(result.images) ? result.images : [];
    if (!images.length) {
      throw new Error("生成接口没有返回图片。");
    }
    archiveCharacterGeneratedImages(normalizedCard, template, variant, images, result.batchId);
    await loadRecentImages(true);
    state.characterStudioStatus = { type: "success", text: `已生成并归档 ${images.length} 张：${normalizedCard.name} · ${template.label}。` };
  } catch (error) {
    state.characterStudioStatus = { type: "error", text: normalizeFrontendError(error, "角色图生成失败。") };
  } finally {
    button.disabled = false;
    button.textContent = originalText;
    renderAll();
  }
}

function buildCharacterGenerationContext(card, template, variant) {
  return {
    type: "character-base",
    title: state.activeProject,
    category: template.category || "character-profile",
    characterId: card.id,
    characterName: card.name,
    characterRole: card.role,
    characters: [card.name],
    variantId: variant?.custom && variant.id ? variant.id : "",
    variantName: variant?.custom ? variant.name : "",
  };
}

function archiveCharacterGeneratedImages(card, template, variant, images, batchId) {
  const now = new Date().toISOString();
  const category = template.category || "character-profile";
  let nextCard = normalizeCharacter(card);
  let activeVariant = resolveCharacterVariant(nextCard, variant);
  if (variant?.custom && !variant.id) {
    activeVariant = normalizeCharacterVariant({
      ...variant,
      id: makeEntityId("variant", `${nextCard.name}-${variant.name}`),
      assets: normalizeCharacterAssets(variant.assets),
      createdAt: now,
      updatedAt: now,
    });
    nextCard = upsertCharacterVariant(nextCard, activeVariant);
  }
  activeVariant = resolveCharacterVariant(nextCard, activeVariant);
  const variantId = isDefaultCharacterVariant(activeVariant) ? "" : activeVariant.id;
  const variantName = isDefaultCharacterVariant(activeVariant) ? "" : activeVariant.name;
  const slot = slotForCharacterTemplate(template);
  images.forEach((image, index) => {
    const imageId = String(image?.id || "").trim();
    if (!imageId) {
      return;
    }
    state.archives[imageId] = normalizeArchive({
      imageId,
      title: state.activeProject,
      category,
      note: [
        card.name,
        variantName,
        template.label,
        images.length > 1 ? `第${index + 1}张` : "",
      ].filter(Boolean).join(" · "),
      characterId: card.id,
      characterName: card.name,
      characters: [card.name],
      url: image.url || "",
      batchId: batchId || image.batchId || "",
      variantId,
      variantName,
      createdAt: image.createdAt || now,
      updatedAt: now,
    });
  });

  const generatedIds = images.map((image) => image?.id).filter(Boolean);
  const assetKey = category === "character-profile" ? "baseImages" : category === "turnaround" ? "viewImages" : "detailImages";
  let nextAssets = {
    ...getCharacterVariantAssets(nextCard, activeVariant),
    [assetKey]: mergeUniqueStrings([...(getCharacterVariantAssets(nextCard, activeVariant)[assetKey] || []), ...generatedIds]),
  };
  if (generatedIds[0] && slot) {
    nextAssets[slot.field] = generatedIds[0];
    if (slot.id === "primary") {
      nextAssets.baseImageId = nextAssets.baseImageId || generatedIds[0];
    }
    if (slot.id === "base") {
      nextAssets.primaryImageId = nextAssets.primaryImageId || generatedIds[0];
    }
    if (slot.legacyKey) {
      nextAssets[slot.legacyKey] = mergeUniqueStrings([generatedIds[0], ...(nextAssets[slot.legacyKey] || [])]);
    }
  }
  const next = upsertCharacterVariantAssets(nextCard, activeVariant, nextAssets, now);
  state.characters = [
    next,
    ...state.characters.filter((item) => item.id !== next.id),
  ].filter(Boolean).slice(0, 300);
  state.selectedCharacterId = next.id;
  state.characterStudio.variantId = variantId || DEFAULT_CHARACTER_VARIANT_ID;
  state.characterStudio.variantName = variantName;
  state.characterStudio.variantPrompt = isDefaultCharacterVariant(activeVariant) ? "" : activeVariant.prompt || "";
  writeManjuArchives();
  writeManjuCharacterCards();
}

function mergeUniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function renderGalleryWorkspace() {
  const archives = getActiveArchives()
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  const imageById = new Map(state.images.map((image) => [image.id, image]));
  elements.workspaceGrid.classList.add("gallery-workspace");

  const summary = createScriptCard("图集归档", "A 版生成、审核、微调后的图片会按剧名沉淀到这里，B 版只负责项目级查看和交付收口。");
  const metaGrid = document.createElement("div");
  metaGrid.className = "script-meta-grid";
  [
    ["候选", `${archives.filter((item) => item.category === "shot-candidate").length} 张`],
    ["定稿", `${archives.filter((item) => item.category === "shot-final").length} 张`],
    ["人设/场景", `${archives.filter((item) => ["character-profile", "turnaround", "detail", "expression", "scene"].includes(item.category)).length} 张`],
    ["废稿", `${archives.filter((item) => item.category === "discarded").length} 张`],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = label;
    item.append(strong, span);
    metaGrid.append(item);
  });

  const actions = document.createElement("div");
  actions.className = "script-actions";
  const refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "ghost-button";
  refreshButton.textContent = "刷新归档";
  refreshButton.addEventListener("click", () => refreshFromStorage(true));
  const openAButton = document.createElement("button");
  openAButton.type = "button";
  openAButton.className = "primary-button";
  openAButton.textContent = "去 A 版审核";
  openAButton.addEventListener("click", () => {
    window.location.href = "/?mode=general&from=manju-gallery";
  });
  actions.append(refreshButton, openAButton);
  summary.append(metaGrid, actions);

  const list = createScriptCard("本剧资产", "按最近更新时间展示当前剧名下的归档图。");
  list.classList.add("script-card-wide");
  const grid = document.createElement("div");
  grid.className = "asset-grid archive-asset-grid";
  if (!archives.length) {
    grid.append(createEmptyNote("还没有归档资产。先从 B 版分镜发送到 A 版生成，再在 A 版图库标为候选、定稿或废稿。"));
  } else {
    archives.slice(0, 36).forEach((archive) => {
      const image = imageById.get(archive.imageId) || {};
      grid.append(createAssetCard({
        ...image,
        id: archive.imageId,
        url: image.url || archive.url,
        archive,
      }));
    });
  }
  list.append(grid);
  elements.workspaceGrid.append(summary, list);
}

function renderExportWorkspace() {
  const pack = getActivePack();
  const archives = getActiveArchives();
  const finalCount = archives.filter((item) => item.category === "shot-final").length;
  const candidateCount = archives.filter((item) => item.category === "shot-candidate").length;
  const characters = getActiveCharacters();
  const shots = getActiveScriptShots();
  elements.workspaceGrid.classList.add("export-workspace");

  const card = createScriptCard("导出交付包", "把当前剧名的图片、manifest.json、prompt-pack.txt 和角色卡一起导出为本地目录。");
  card.classList.add("script-card-wide");
  const checks = document.createElement("div");
  checks.className = "export-checks";
  [
    ["项目包", Boolean(pack), pack ? "已保存画风/人设/场景提示词包" : "建议先保存项目包"],
    ["剧本分镜", shots.length > 0, shots.length ? `已有 ${shots.length} 镜` : "还没有分镜表"],
    ["角色卡", characters.length > 0, characters.length ? `已有 ${characters.length} 张` : "还没有人设资料卡"],
    ["图集归档", archives.length > 0, archives.length ? `候选 ${candidateCount} 张，定稿 ${finalCount} 张` : "还没有归档图"],
  ].forEach(([label, good, text]) => {
    const item = document.createElement("article");
    item.className = `quality-item ${good ? "good" : "warn"}`;
    const span = document.createElement("span");
    span.textContent = label;
    const p = document.createElement("p");
    p.textContent = text;
    item.append(span, p);
    checks.append(item);
  });

  const actions = document.createElement("div");
  actions.className = "script-actions";
  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "primary-button";
  exportButton.textContent = "导出本剧图集";
  exportButton.disabled = archives.length === 0;
  exportButton.addEventListener("click", () => exportActiveProjectArchive(exportButton));

  const galleryButton = document.createElement("button");
  galleryButton.type = "button";
  galleryButton.className = "ghost-button";
  galleryButton.textContent = "检查图集";
  galleryButton.addEventListener("click", () => setWorkspace("gallery"));

  const scriptButton = document.createElement("button");
  scriptButton.type = "button";
  scriptButton.className = "ghost-button";
  scriptButton.textContent = "导出剧本包";
  scriptButton.disabled = !getActiveScriptPack();
  scriptButton.addEventListener("click", exportActiveScriptPack);

  actions.append(exportButton, galleryButton, scriptButton);
  card.append(checks, actions, createWorkspaceStatus(state.exportStatus));
  elements.workspaceGrid.append(card);
}

function renderShotsWorkspace() {
  const shots = getActiveScriptShots();
  elements.workspaceGrid.classList.add("shots-workspace");

  if (!shots.length) {
    const emptyCard = createScriptCard("还没有可用分镜", "先在剧本页导入剧本包，或用辅助 API 把纯剧本拆成分镜表，再回到这里批量做图。");
    emptyCard.classList.add("script-card-wide");
    const actions = document.createElement("div");
    actions.className = "script-actions";
    const scriptButton = document.createElement("button");
    scriptButton.type = "button";
    scriptButton.className = "primary-button";
    scriptButton.textContent = "去导入剧本";
    scriptButton.addEventListener("click", () => setWorkspace("script"));
    actions.append(scriptButton);
    emptyCard.append(actions);
    elements.workspaceGrid.append(emptyCard);
    return;
  }

  const active = getSelectedShot(shots);
  const prompt = buildShotPrompt(active.shot);
  elements.workspaceGrid.append(
    createShotQueueCard(shots, active),
    createShotRelayCard(active.shot, active.index),
    createShotContextCard(active.shot, active.index),
    createShotPromptCard(active.shot, prompt),
  );
}

function createShotQueueCard(shots, active) {
  const card = createScriptCard("镜头定位", "先选中你正在接力的原始分镜；下一帧实际怎么画，在接力台里单独写。");

  const selectLabel = createFieldLabel("当前镜头");
  const select = document.createElement("select");
  select.className = "shot-select";
  shots.forEach((shot, index) => {
    const option = document.createElement("option");
    const key = shotKey(shot, index);
    option.value = key;
    option.textContent = `${shot.shotNo} · ${shot.location || shot.sceneTitle || "未指定场景"} · ${clipClientText(shot.visual || shot.action || shot.promptSeed, 34)}`;
    select.append(option);
  });
  select.value = active.key;
  select.addEventListener("change", () => {
    state.activeShotKey = select.value;
    renderWorkspace();
  });
  selectLabel.append(select);

  const count = document.createElement("p");
  count.className = "shot-count-note";
  count.textContent = `当前剧名共 ${shots.length} 条分镜；生成与筛选仍在 A 版完成。`;
  card.append(selectLabel, count);
  return card;
}

function createShotTripleBox(shots, active) {
  const box = document.createElement("div");
  box.className = "shot-triple-box";

  const top = document.createElement("div");
  top.className = "shot-batch-top";
  const modeLabel = createFieldLabel("三连方式");
  const modeSelect = document.createElement("select");
  [
    ["forward", "当前镜头作为第 1 张"],
    ["center", "当前镜头作为第 2 张"],
    ["backward", "当前镜头作为第 3 张"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    modeSelect.append(option);
  });
  modeSelect.value = state.shotTripleDraft.anchorMode || "forward";
  modeSelect.addEventListener("change", () => {
    state.shotTripleDraft.anchorMode = modeSelect.value;
  });
  modeLabel.append(modeSelect);

  const sendButton = document.createElement("button");
  sendButton.type = "button";
  sendButton.className = "primary-button";
  sendButton.textContent = "生成三连镜头";
  sendButton.addEventListener("click", () => handoffShotTriple(shots, active.index, {
    motionText: textarea.value,
    anchorMode: modeSelect.value,
  }));
  top.append(modeLabel, sendButton);

  const textarea = document.createElement("textarea");
  textarea.className = "script-textarea shot-triple-textarea";
  textarea.rows = 4;
  textarea.placeholder = "写这段动作/情绪如何推进。例如：她听见身后异响，慢慢回头，风卷起黄叶，最后发现树影后站着一个人。";
  textarea.value = state.shotTripleDraft.motionText || "";
  textarea.addEventListener("input", () => {
    state.shotTripleDraft.motionText = textarea.value;
  });

  const note = document.createElement("p");
  note.className = "shot-count-note";
  note.textContent = "适合一个动作拆成起势、过程、落点三张独立关键帧；A 版队列会尽量用上一张结果作为下一张参考。";

  box.append(top, textarea, note);
  return box;
}

function createShotRelayCard(shot, shotIndex) {
  const card = createScriptCard("下一帧接力台", "按你现在的手法：选上一张图作参考，只写下一帧画面内容，尽量少带冗余提示词。");
  card.classList.add("script-card-wide");
  const referenceOptions = getShotRelayReferenceOptions();

  const grid = document.createElement("div");
  grid.className = "shot-relay-grid";

  const referenceLabel = createFieldLabel("上一帧参考图");
  const referenceSelect = document.createElement("select");
  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = referenceOptions.length ? "不使用参考图" : "暂无可用候选/定稿图";
  referenceSelect.append(noneOption);
  referenceOptions.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.id;
    option.textContent = optionData.label;
    referenceSelect.append(option);
  });
  referenceSelect.value = referenceOptions.some((item) => item.id === state.shotRelayDraft.referenceImageId)
    ? state.shotRelayDraft.referenceImageId
    : "";
  referenceSelect.addEventListener("change", () => {
    state.shotRelayDraft.referenceImageId = referenceSelect.value;
    renderWorkspace();
  });
  referenceLabel.append(referenceSelect);

  const sceneLockLabel = document.createElement("label");
  sceneLockLabel.className = "check-tool relay-check";
  const sceneLockInput = document.createElement("input");
  sceneLockInput.type = "checkbox";
  sceneLockInput.checked = state.shotRelayDraft.includeSceneLock !== false;
  sceneLockInput.addEventListener("change", () => {
    state.shotRelayDraft.includeSceneLock = sceneLockInput.checked;
  });
  const sceneLockText = document.createElement("span");
  sceneLockText.textContent = "带场景锁";
  sceneLockLabel.append(sceneLockInput, sceneLockText);

  const characterLabel = document.createElement("label");
  characterLabel.className = "check-tool relay-check";
  const characterInput = document.createElement("input");
  characterInput.type = "checkbox";
  characterInput.checked = Boolean(state.shotRelayDraft.includeCharacterPrompt);
  characterInput.addEventListener("change", () => {
    state.shotRelayDraft.includeCharacterPrompt = characterInput.checked;
  });
  const characterText = document.createElement("span");
  characterText.textContent = "带角色提示词";
  characterLabel.append(characterInput, characterText);

  grid.append(referenceLabel, sceneLockLabel, characterLabel);

  const selectedReference = referenceOptions.find((item) => item.id === referenceSelect.value);
  const preview = document.createElement("div");
  preview.className = "shot-relay-reference-preview";
  if (selectedReference?.url) {
    const img = document.createElement("img");
    img.src = selectedReference.url;
    img.alt = selectedReference.label;
    const span = document.createElement("span");
    span.textContent = selectedReference.label;
    preview.append(img, span);
  } else {
    preview.append(createEmptyNote("可以先在 A 版把可用图标为候选或定稿，再回到这里选作上一帧参考。"));
  }

  const visualLabel = createFieldLabel("下一帧画面内容");
  const textarea = document.createElement("textarea");
  textarea.className = "script-textarea shot-relay-textarea";
  textarea.rows = 6;
  textarea.placeholder = "只写你脑海里拆出来的下一帧。例如：女主猛地回头，眼神警惕，肩侧发丝被风吹起，身后树影里露出一只苍白的手。";
  textarea.value = state.shotRelayDraft.visualText || "";
  visualLabel.append(textarea);

  const promptBox = document.createElement("pre");
  promptBox.className = "shot-prompt-preview shot-relay-prompt";

  const actions = document.createElement("div");
  actions.className = "script-actions";
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "ghost-button";
  copyButton.textContent = "复制接力提示词";

  const sendButton = document.createElement("button");
  sendButton.type = "button";
  sendButton.className = "primary-button";
  sendButton.textContent = "带参考图去 A 版";
  const getCurrentRelayPrompt = () => buildShotRelayPrompt(shot, {
    visualText: textarea.value,
    includeSceneLock: sceneLockInput.checked,
    includeCharacterPrompt: characterInput.checked,
  });
  const syncRelayPrompt = () => {
    state.shotRelayDraft.visualText = textarea.value;
    state.shotRelayDraft.includeSceneLock = sceneLockInput.checked;
    state.shotRelayDraft.includeCharacterPrompt = characterInput.checked;
    const nextPrompt = getCurrentRelayPrompt();
    promptBox.textContent = nextPrompt || "填写下一帧画面内容后，这里会生成干净提示词。";
    copyButton.disabled = !nextPrompt;
    sendButton.disabled = !nextPrompt;
  };
  textarea.addEventListener("input", syncRelayPrompt);
  sceneLockInput.addEventListener("change", syncRelayPrompt);
  characterInput.addEventListener("change", syncRelayPrompt);
  copyButton.addEventListener("click", () => copyShotPrompt(getCurrentRelayPrompt()));
  sendButton.addEventListener("click", () => handoffShotRelay(shot, shotIndex, {
    prompt: getCurrentRelayPrompt(),
    reference: selectedReference,
    visualText: textarea.value,
    includeSceneLock: sceneLockInput.checked,
    includeCharacterPrompt: characterInput.checked,
  }));
  syncRelayPrompt();
  actions.append(copyButton, sendButton);

  const note = document.createElement("p");
  note.className = "shot-count-note";
  note.textContent = "默认不带原分镜画面内容，不自动带角色提示词；需要角色词时再手动勾选。";

  card.append(grid, preview, visualLabel, promptBox, note, actions);
  return card;
}

function createShotContextCard(shot, shotIndex) {
  const card = createScriptCard("镜头上下文", "先确认镜号、角色、场景、情绪和连续性提示，再送去生图。");
  const grid = document.createElement("div");
  grid.className = "shot-detail-grid";
  const shotBindings = getShotCharacterBindings(shot);
  [
    ["镜号", shot.shotNo],
    ["场景", shot.location || shot.sceneTitle],
    ["角色", formatShotCharacterBindingSummary(shotBindings) || getShotCharacterNames(shot).join("、") || "未指定"],
    ["镜头", shot.camera],
    ["情绪", shot.emotion],
    ["连续性", shot.notes || shot.sceneSummary],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    const span = document.createElement("span");
    span.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value || "待补";
    item.append(span, strong);
    grid.append(item);
  });

  const bindBox = document.createElement("div");
  bindBox.className = "character-bind-box";
  const bindLabel = createFieldLabel("本镜绑定角色");
  const bindInput = document.createElement("input");
  bindInput.type = "text";
  bindInput.value = getShotCharacterNames(shot).join("、");
  bindInput.placeholder = "用顿号或逗号分隔，例如：林雾、顾沉";
  bindLabel.append(bindInput);

  const quickList = document.createElement("div");
  quickList.className = "character-chip-list";
  const activeCharacters = getActiveCharacters().slice(0, 12);
  const bindingControls = [];
  activeCharacters.forEach((character) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost-button";
    button.textContent = character.name || "未命名";
    button.addEventListener("click", () => {
      const names = splitNameList(bindInput.value);
      if (!names.some((name) => normalizePromptMatchKey(name) === normalizePromptMatchKey(character.name))) {
        bindInput.value = [...names, character.name].filter(Boolean).join("、");
      }
    });
    quickList.append(button);
  });

  const bindingGrid = document.createElement("div");
  bindingGrid.className = "shot-character-binding-grid";
  activeCharacters.forEach((character) => {
    const existing = shotBindings.find((binding) => (
      binding.characterId === character.id
      || normalizePromptMatchKey(binding.characterName) === normalizePromptMatchKey(character.name)
    ));
    const row = document.createElement("label");
    row.className = "shot-character-binding-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(existing);
    const name = document.createElement("span");
    name.textContent = character.name || "未命名角色";
    const variantSelect = document.createElement("select");
    getCharacterVariants(character).forEach((variant) => {
      const option = document.createElement("option");
      option.value = variant.id;
      option.textContent = getCharacterVariantLabel(variant);
      variantSelect.append(option);
    });
    variantSelect.value = existing?.variantId && getCharacterVariantById(character, existing.variantId)
      ? existing.variantId
      : DEFAULT_CHARACTER_VARIANT_ID;
    row.append(checkbox, name, variantSelect);
    bindingGrid.append(row);
    bindingControls.push({ character, checkbox, variantSelect });
  });
  const bindingNote = document.createElement("p");
  bindingNote.className = "shot-count-note";
  bindingNote.textContent = "勾选角色后可指定原身/变体；未在人设库中的临时角色仍可写在上方文本框。";

  const bindActions = document.createElement("div");
  bindActions.className = "script-actions";
  const saveBindButton = document.createElement("button");
  saveBindButton.type = "button";
  saveBindButton.className = "primary-button";
  saveBindButton.textContent = "保存绑定";
  saveBindButton.addEventListener("click", () => saveShotCharacterBinding(shot, shotIndex, {
    namesText: bindInput.value,
    bindings: collectShotBindingControls(bindingControls),
  }));
  const clearBindButton = document.createElement("button");
  clearBindButton.type = "button";
  clearBindButton.className = "ghost-button";
  clearBindButton.textContent = "清空角色";
  clearBindButton.addEventListener("click", () => {
    bindInput.value = "";
    bindingControls.forEach((control) => {
      control.checkbox.checked = false;
      control.variantSelect.value = DEFAULT_CHARACTER_VARIANT_ID;
    });
    saveShotCharacterBinding(shot, shotIndex, { namesText: "", bindings: [] });
  });
  bindActions.append(saveBindButton, clearBindButton);
  bindBox.append(bindLabel, quickList, bindingGrid, bindingNote, bindActions);

  card.append(grid, bindBox);
  return card;
}

function collectShotBindingControls(controls = []) {
  return controls
    .filter((control) => control.checkbox.checked)
    .map((control) => {
      const variant = getCharacterVariantById(control.character, control.variantSelect.value)
        || getCharacterVariants(control.character)[0];
      return {
        characterId: control.character.id,
        characterName: control.character.name,
        variantId: variant?.id || DEFAULT_CHARACTER_VARIANT_ID,
        variantName: getCharacterVariantLabel(variant),
      };
    });
}

function saveShotCharacterBinding(shot, shotIndex, value) {
  const pack = getActiveScriptPack();
  const names = splitNameList(typeof value === "object" ? value.namesText : value);
  const controlBindings = Array.isArray(value?.bindings) ? value.bindings : [];
  const bindings = normalizeShotCharacterBindings(controlBindings, names);
  const finalNames = bindings.length
    ? mergeUniqueStrings(bindings.map((binding) => binding.characterName))
    : names;
  if (!pack) {
    state.scriptStatus = { type: "error", text: "当前没有可保存的剧本分镜包。" };
    renderWorkspace();
    return;
  }

  let cursor = 0;
  let updated = false;
  const nextPack = normalizeScriptPack({
    ...pack,
    episodes: pack.episodes.map((episode) => ({
      ...episode,
      scenes: episode.scenes.map((scene) => ({
        ...scene,
        shots: scene.shots.map((item) => {
          if (cursor !== shotIndex) {
            cursor += 1;
            return item;
          }
          cursor += 1;
          updated = true;
          return {
            ...item,
            characters: finalNames,
            characterBindings: bindings,
          };
        }),
      })),
    })),
    updatedAt: new Date().toISOString(),
  });

  if (!updated || !nextPack) {
    state.scriptStatus = { type: "error", text: `没有找到 ${shot?.shotNo || "当前镜头"}，请刷新后再试。` };
    renderWorkspace();
    return;
  }

  upsertScriptPack(nextPack);
  state.scriptStatus = {
    type: "success",
    text: finalNames.length ? `已绑定本镜角色：${formatShotCharacterBindingSummary(bindings) || finalNames.join("、")}。` : "已清空本镜角色绑定。",
  };
  renderAll();
  setWorkspace("shots");
}

function createShotPromptCard(shot, prompt) {
  const card = createScriptCard("完整分镜提示词（备选）", "这是旧的完整拼装方式，会带入原分镜画面、角色和场景信息；现在更建议优先使用上方接力台。");
  card.classList.add("script-card-wide");

  const promptBox = document.createElement("pre");
  promptBox.className = "shot-prompt-preview";
  promptBox.textContent = prompt;

  const actions = document.createElement("div");
  actions.className = "script-actions";
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "primary-button";
  copyButton.textContent = "复制提示词";
  copyButton.addEventListener("click", () => copyShotPrompt(prompt));

  const handoffButton = document.createElement("button");
  handoffButton.type = "button";
  handoffButton.className = "ghost-button";
  handoffButton.textContent = "带完整提示词去 A 版";
  handoffButton.addEventListener("click", () => handoffShotPrompt(prompt, shot));

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "ghost-button";
  backButton.textContent = "返回剧本表";
  backButton.addEventListener("click", () => setWorkspace("script"));

  actions.append(copyButton, handoffButton, backButton);

  const meta = document.createElement("p");
  meta.className = "shot-count-note";
  meta.textContent = `${shot.shotNo} · ${shot.dialogueRef ? "含对白参考，不入画" : "无对白参考"}`;

  card.append(promptBox, meta);
  if (state.scriptStatus?.text) {
    const status = document.createElement("p");
    status.className = `script-status ${state.scriptStatus.type || "info"}`;
    status.textContent = state.scriptStatus.text;
    card.append(status);
  }
  card.append(actions);
  return card;
}

function createScriptStatusCard(pack, shots) {
  const card = createScriptCard("当前剧本包", "把剧本拆成镜头后，B 版后续的人设、场景、提示词公式都围绕这张表工作。");
  const metaGrid = document.createElement("div");
  metaGrid.className = "script-meta-grid";

  [
    ["剧名", pack?.title || state.activeProject],
    ["剧本包", pack ? "已导入" : "未导入"],
    ["完整剧本", pack?.scriptText ? `${pack.scriptText.length} 字` : "未保存"],
    ["分镜行", `${shots.length} 条`],
    ["更新时间", formatDateTime(pack?.updatedAt || pack?.createdAt)],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = value || "待补";
    const span = document.createElement("span");
    span.textContent = label;
    item.append(strong, span);
    metaGrid.append(item);
  });

  const actions = document.createElement("div");
  actions.className = "script-actions";
  const jumpButton = document.createElement("button");
  jumpButton.type = "button";
  jumpButton.className = shots.length ? "primary-button" : "ghost-button";
  jumpButton.textContent = "进入分镜生成";
  jumpButton.addEventListener("click", () => setWorkspace("shots"));
  actions.append(jumpButton);

  if (state.scriptStatus?.text) {
    const status = document.createElement("p");
    status.className = `script-status ${state.scriptStatus.type || "info"}`;
    status.textContent = state.scriptStatus.text;
    card.append(metaGrid, status, actions);
  } else {
    card.append(metaGrid, actions);
  }
  return card;
}

function createScriptImportCard() {
  const card = createScriptCard("导入剧本包（含分镜）", "支持 yaotu-manju-script-pack JSON。导入后会按剧名归档，并在主页统计中显示镜头数。");
  const actions = document.createElement("div");
  actions.className = "script-actions";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.hidden = true;
  fileInput.addEventListener("change", () => {
    const [file] = fileInput.files || [];
    if (file) {
      importScriptPackFile(file);
    }
    fileInput.value = "";
  });

  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.className = "primary-button";
  importButton.textContent = "导入剧本包 JSON";
  importButton.addEventListener("click", () => fileInput.click());

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "ghost-button";
  exportButton.textContent = "导出当前包";
  exportButton.disabled = !getActiveScriptPack();
  exportButton.addEventListener("click", exportActiveScriptPack);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "ghost-button";
  deleteButton.textContent = "删除当前包";
  deleteButton.disabled = !getActiveScriptPack();
  deleteButton.addEventListener("click", deleteActiveScriptPack);

  actions.append(importButton, exportButton, deleteButton, fileInput);
  card.append(actions);
  return card;
}

function createShotTableImportCard() {
  const card = createScriptCard("导入/粘贴现成分镜表", "适合已经在其他 AI 平台生成了分镜表的情况。支持 JSON、CSV、TSV 和 Markdown 表格，导入后直接进入妖荼分镜生产。");
  card.classList.add("script-card-wide");
  const existingPack = getActiveScriptPack();

  const form = document.createElement("div");
  form.className = "shot-table-form";

  const titleLabel = createFieldLabel("剧名");
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.value = state.shotTableDraft.title || state.activeProject;
  titleInput.maxLength = 80;
  titleInput.addEventListener("input", () => {
    state.shotTableDraft.title = titleInput.value;
  });
  titleLabel.append(titleInput);

  const episodeLabel = createFieldLabel("集数");
  const episodeInput = document.createElement("input");
  episodeInput.type = "number";
  episodeInput.min = "1";
  episodeInput.max = "999";
  episodeInput.value = String(state.shotTableDraft.episodeNo || state.scriptDraft.episodeNo || 1);
  episodeInput.addEventListener("input", () => {
    state.shotTableDraft.episodeNo = Number.parseInt(episodeInput.value, 10) || 1;
  });
  episodeLabel.append(episodeInput);

  const scriptLabel = createFieldLabel("完整剧本原文（可选）");
  scriptLabel.classList.add("script-text-field");
  const scriptTextarea = document.createElement("textarea");
  scriptTextarea.className = "script-textarea shot-table-script-textarea";
  scriptTextarea.placeholder = "如果这份分镜表来自外部 AI，可以把完整剧本原文也粘贴在这里；导入后会和分镜表保存在同一个剧本包里。";
  scriptTextarea.value = state.shotTableDraft.scriptText || state.scriptDraft.text || existingPack?.scriptText || "";
  scriptTextarea.addEventListener("input", () => {
    state.shotTableDraft.scriptText = scriptTextarea.value;
  });
  scriptLabel.append(scriptTextarea);

  const tableLabel = createFieldLabel("分镜表");
  tableLabel.classList.add("script-text-field");
  const textarea = document.createElement("textarea");
  textarea.className = "script-textarea shot-table-textarea";
  textarea.placeholder = "可粘贴 Markdown 表格、CSV/TSV，或 JSON 数组。常见列名可用：镜号、场景、角色、画面、动作、情绪、镜头、对白、提示词、备注。";
  textarea.value = state.shotTableDraft.text || "";
  textarea.addEventListener("input", () => {
    state.shotTableDraft.text = textarea.value;
  });
  tableLabel.append(textarea);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json,.csv,.tsv,.txt,.md,.markdown,application/json,text/plain,text/csv,text/tab-separated-values,text/markdown";
  fileInput.hidden = true;
  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files || [];
    if (file) {
      state.shotTableDraft.text = await readFileText(file);
      textarea.value = state.shotTableDraft.text;
      state.scriptStatus = { type: "info", text: `已导入分镜表文件：${file.name}` };
      renderAll();
      setWorkspace("script");
    }
    fileInput.value = "";
  });

  const actions = document.createElement("div");
  actions.className = "script-actions";
  const fileButton = document.createElement("button");
  fileButton.type = "button";
  fileButton.className = "ghost-button";
  fileButton.textContent = "导入表格文件";
  fileButton.addEventListener("click", () => fileInput.click());

  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.className = "primary-button";
  importButton.textContent = "解析为分镜包";
  importButton.addEventListener("click", () => importShotTableText({
    title: titleInput.value,
    episodeNo: episodeInput.value,
    tableText: textarea.value,
    scriptText: scriptTextarea.value || state.scriptDraft.text || existingPack?.scriptText || "",
  }));

  const sampleButton = document.createElement("button");
  sampleButton.type = "button";
  sampleButton.className = "ghost-button";
  sampleButton.textContent = "填入示例表头";
  sampleButton.addEventListener("click", () => {
    const sample = [
      "| 镜号 | 场景 | 角色 | 画面 | 动作 | 情绪 | 镜头 | 对白参考 | 提示词 | 备注 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
      "| 1-1-001 | 山林入口 | 玄甲将军、白鹿 | 秋日山林，追猎队伍散开 | 将军勒马回望 | 紧张 | 竖屏中景，低机位 | 白鹿钻进隐蔽山洞 | 古风漫剧关键帧，山林，追猎，紧张氛围 | 保持玄甲服饰一致 |",
    ].join("\n");
    textarea.value = mergeTextBlocks(textarea.value, [sample]);
    state.shotTableDraft.text = textarea.value;
  });

  actions.append(fileButton, importButton, sampleButton, fileInput);
  form.append(titleLabel, episodeLabel, scriptLabel, tableLabel, actions);
  card.append(form);
  return card;
}

function createScriptSplitCard() {
  const card = createScriptCard("导入剧本（不含分镜）", "粘贴正文或导入 TXT/MD 后，用辅助 API 拆成分镜包。拆分结果会保存为当前剧名的镜头表。");
  card.classList.add("script-card-wide");

  const form = document.createElement("div");
  form.className = "script-form";

  const titleLabel = createFieldLabel("剧名");
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.value = state.scriptDraft.title || state.activeProject;
  titleInput.maxLength = 80;
  titleInput.addEventListener("input", () => {
    state.scriptDraft.title = titleInput.value;
  });
  titleLabel.append(titleInput);

  const episodeLabel = createFieldLabel("集数");
  const episodeInput = document.createElement("input");
  episodeInput.type = "number";
  episodeInput.min = "1";
  episodeInput.max = "999";
  episodeInput.value = String(state.scriptDraft.episodeNo || 1);
  episodeInput.addEventListener("input", () => {
    state.scriptDraft.episodeNo = Number.parseInt(episodeInput.value, 10) || 1;
  });
  episodeLabel.append(episodeInput);

  const textLabel = createFieldLabel("剧本文本");
  textLabel.classList.add("script-text-field");
  const textarea = document.createElement("textarea");
  textarea.className = "script-textarea";
  textarea.placeholder = "粘贴剧情正文、对白、旁白或外部工具导出的剧本。辅助 API 会按画面动作拆成可生图分镜。";
  textarea.value = state.scriptDraft.text || "";
  textarea.addEventListener("input", () => {
    state.scriptDraft.text = textarea.value;
  });
  textLabel.append(textarea);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".txt,.md,.markdown,text/plain,text/markdown";
  fileInput.hidden = true;
  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files || [];
    if (file) {
      state.scriptDraft.text = await readFileText(file);
      textarea.value = state.scriptDraft.text;
      state.scriptStatus = { type: "info", text: `已导入文本：${file.name}` };
      renderAll();
      setWorkspace("script");
    }
    fileInput.value = "";
  });

  const actions = document.createElement("div");
  actions.className = "script-actions";
  const fileButton = document.createElement("button");
  fileButton.type = "button";
  fileButton.className = "ghost-button";
  fileButton.textContent = "导入 TXT/MD";
  fileButton.addEventListener("click", () => fileInput.click());

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "ghost-button";
  saveButton.textContent = "仅保存原文";
  saveButton.addEventListener("click", () => saveOriginalScriptFromForm({
    title: titleInput.value,
    episodeNo: episodeInput.value,
    scriptText: textarea.value,
  }));

  const splitButton = document.createElement("button");
  splitButton.type = "button";
  splitButton.className = "primary-button";
  splitButton.textContent = "辅助 API 拆分镜";
  splitButton.addEventListener("click", () => splitPlainScript({
    title: titleInput.value,
    episodeNo: episodeInput.value,
    scriptText: textarea.value,
    button: splitButton,
  }));

  actions.append(fileButton, saveButton, splitButton, fileInput);
  form.append(titleLabel, episodeLabel, textLabel, actions);
  card.append(form);
  return card;
}

function createScriptTableCard(pack, shots) {
  const card = createScriptCard("分镜表预览", pack ? `${pack.title} · ${shots.length} 条镜头` : "导入或拆分后，这里会显示可生图的镜头行。");
  card.classList.add("script-card-wide");

  if (!shots.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "还没有分镜行。可以导入标准剧本包、粘贴现成分镜表，或把纯剧本文本交给辅助 API 拆分。";
    card.append(empty);
    return card;
  }

  const wrap = document.createElement("div");
  wrap.className = "script-table-wrap";
  const table = document.createElement("table");
  table.className = "script-shot-table";
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>镜号</th><th>场景</th><th>角色</th><th>画面动作</th><th>镜头/情绪</th><th>提示词种子</th></tr>";
  const tbody = document.createElement("tbody");
  shots.slice(0, 80).forEach((shot) => {
    const row = document.createElement("tr");
    [
      shot.shotNo,
      shot.location || shot.sceneTitle,
      shot.characters.join("、") || "未指定",
      shot.visual || shot.action,
      [shot.camera, shot.emotion].filter(Boolean).join(" / "),
      shot.promptSeed,
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value || "待补";
      row.append(cell);
    });
    tbody.append(row);
  });
  table.append(thead, tbody);
  wrap.append(table);
  card.append(wrap);
  return card;
}

function getSelectedShot(shots) {
  if (!shots.length) {
    return null;
  }
  const selectedIndex = shots.findIndex((shot, index) => shotKey(shot, index) === state.activeShotKey);
  const index = selectedIndex >= 0 ? selectedIndex : 0;
  const shot = shots[index];
  const key = shotKey(shot, index);
  state.activeShotKey = key;
  return { shot, key, index };
}

function buildShotBatchItems(shots, startIndex) {
  const count = clampNumber(state.shotBatchCount, 5, 10, 5);
  return shots
    .slice(startIndex, startIndex + count)
    .map((shot, offset) => ({
      shot,
      index: startIndex + offset,
      key: shotKey(shot, startIndex + offset),
    }));
}

function buildShotTripleItems(shots, sourceIndex, options = {}) {
  const baseShot = shots[sourceIndex];
  if (!baseShot) {
    return [];
  }
  const motionText = clipPromptSection(options.motionText || "", 900);
  const anchorMode = ["forward", "center", "backward"].includes(options.anchorMode)
    ? options.anchorMode
    : "forward";
  const phases = getShotTriplePhases(anchorMode);
  const groupId = `triple-${Date.now().toString(36)}`;
  const lockBase = buildShotContinuityLock(baseShot, motionText, groupId, phases.length);
  return phases.map((phase, offset) => {
    const frameIndex = offset + 1;
    const continuityLock = {
      ...lockBase,
      frameIndex,
      frameRole: phase.role,
      frameInstruction: phase.guide,
      previousFramePolicy: frameIndex > 1 ? "previous-generated" : "none",
    };
    const shot = {
      ...baseShot,
      shotNo: `${baseShot.shotNo || sourceIndex + 1}-连${frameIndex}`,
      visual: buildShotTripleVisual(baseShot, motionText, phase, frameIndex, phases.length),
      action: phase.guide,
      camera: phase.camera || baseShot.camera,
      emotion: phase.emotion || baseShot.emotion,
      notes: [
        baseShot.notes || baseShot.sceneSummary,
        `三连镜头第 ${frameIndex}/${phases.length} 张：${phase.role}。固定同一场景、同一角色形象、同一季节光线与色彩，只推进动作。`,
      ].filter(Boolean).join("\n"),
    };
    return {
      shot,
      index: sourceIndex,
      key: `${shotKey(baseShot, sourceIndex)}-triple-${frameIndex}`,
      continuityLock,
    };
  });
}

function getShotTriplePhases(anchorMode) {
  if (anchorMode === "center") {
    return [
      {
        role: "前一瞬",
        guide: "根据当前镜头倒推前一瞬，动作刚刚开始，人物姿态与情绪为当前镜头做铺垫。",
        camera: "与当前镜头保持同一机位和焦段，只允许轻微构图变化。",
      },
      {
        role: "当前镜头",
        guide: "保留原镜头的核心动作与情绪，作为三连镜头的中间关键帧。",
      },
      {
        role: "后一瞬",
        guide: "承接当前镜头，动作继续推进到下一瞬，情绪更明确，但场景和角色设计不漂移。",
        camera: "延续同一镜头轴线，可轻微推近或跟随主体。",
      },
    ];
  }
  if (anchorMode === "backward") {
    return [
      {
        role: "起势",
        guide: "根据当前镜头倒推动作起点，角色还未完成动作，画面保留即将爆发的预备感。",
        camera: "与当前镜头保持同一空间轴线。",
      },
      {
        role: "过程",
        guide: "承接起势，动作推进到中段，姿态更有动势，仍然服务当前镜头的落点。",
      },
      {
        role: "当前镜头/落点",
        guide: "以原镜头作为三连镜头落点，动作已经完成或情绪抵达最高点。",
      },
    ];
  }
  return [
    {
      role: "起势",
      guide: "以原镜头作为动作起点，角色刚刚做出反应，动作清晰但不要过度完成。",
    },
    {
      role: "过程",
      guide: "承接上一帧，动作推进到中段，人物姿态、衣摆、发丝或道具有连续运动感。",
      camera: "延续同一镜头轴线，可轻微推近或跟随主体。",
    },
    {
      role: "落点",
      guide: "承接前两帧，动作完成并形成情绪落点，画面要能作为这一小段的结束关键帧。",
      camera: "保持同一空间关系，可用更明确的构图强调结果。",
    },
  ];
}

function buildShotContinuityLock(shot, motionText, groupId, frameTotal) {
  const scene = shot?.location || shot?.sceneTitle || "沿用当前镜头场景";
  const sceneLock = [
    shot?.location,
    shot?.sceneTitle,
    shot?.sceneSummary,
    shot?.notes,
  ].filter(Boolean).join("\n");
  const bindings = getShotCharacterBindings(shot);
  return {
    groupId,
    title: "三连镜头",
    frameTotal,
    anchorShotNo: String(shot?.shotNo || "").trim(),
    scene,
    sceneLock: sceneLock || scene,
    characterLock: formatShotCharacterBindingSummary(bindings) || getShotCharacterNames(shot).join("、"),
    motionText,
  };
}

function buildShotTripleVisual(baseShot, motionText, phase, frameIndex, frameTotal) {
  return [
    `三连镜头第 ${frameIndex}/${frameTotal} 张（${phase.role}）。`,
    `本帧任务：${phase.guide}`,
    `原镜头画面：${clipPromptSection(baseShot?.visual || baseShot?.action || baseShot?.promptSeed, 700) || "沿用当前镜头画面内容。"}`,
    motionText ? `用户动作提示：${motionText}` : "用户动作提示：把原镜头拆成起势、过程、落点三个连续动作阶段。",
  ].filter(Boolean).join("\n");
}

function shotKey(shot, index) {
  return [
    shot?.episodeNo || 1,
    shot?.sceneNo || 1,
    shot?.shotNo || index + 1,
    index,
  ].map((part) => String(part).trim()).join("-");
}

function buildShotPromptSection(title, content, fallback, maxLength) {
  const text = clipPromptSection(content || fallback, maxLength);
  return text ? `${title}\n${text}` : "";
}

function clipPromptSection(value, maxLength = 800) {
  const text = compactPromptText(value);
  if (!text || text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).replace(/[，。；、,;\s]+$/u, "")}\n（本镜已精简截取，完整资料仍保存在项目包中）`;
}

function compactPromptText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function getShotCharacterNames(shot) {
  return Array.isArray(shot?.characters)
    ? shot.characters.map((name) => String(name || "").trim()).filter(Boolean).slice(0, 12)
    : [];
}

function normalizeShotCharacterBindings(bindings = [], fallbackNames = []) {
  const activeCharacters = getActiveCharacters();
  const fallback = Array.isArray(fallbackNames) ? fallbackNames : [];
  const source = Array.isArray(bindings) && bindings.length
    ? bindings
    : fallback.map((name) => ({ characterName: name }));
  const seen = new Set();
  return source.map((binding) => {
    const characterName = String(binding?.characterName || binding?.name || binding || "").trim();
    const characterId = String(binding?.characterId || "").trim();
    const requestedVariantId = String(binding?.variantId || "").trim();
    const requestedVariantName = String(binding?.variantName || "").trim();
    const card = activeCharacters.find((item) => (
      (characterId && item.id === characterId)
      || normalizePromptMatchKey(item.name) === normalizePromptMatchKey(characterName)
    ));
    const variant = card
      ? getCharacterVariantById(card, requestedVariantId || DEFAULT_CHARACTER_VARIANT_ID)
        || getArchiveCharacterVariant(card, { variantName: requestedVariantName })
        || getCharacterVariantById(card, DEFAULT_CHARACTER_VARIANT_ID)
      : null;
    const variantId = variant?.id || requestedVariantId || DEFAULT_CHARACTER_VARIANT_ID;
    const normalized = {
      characterId: card?.id || characterId,
      characterName: card?.name || characterName,
      variantId,
      variantName: variant ? getCharacterVariantLabel(variant) : requestedVariantName || (variantId === DEFAULT_CHARACTER_VARIANT_ID ? "原身" : ""),
    };
    const key = `${normalized.characterId || normalizePromptMatchKey(normalized.characterName)}:${normalized.variantId}`;
    if (!normalized.characterName || seen.has(key)) {
      return null;
    }
    seen.add(key);
    return normalized;
  }).filter(Boolean).slice(0, 12);
}

function getShotCharacterBindings(shot) {
  return normalizeShotCharacterBindings(shot?.characterBindings, getShotCharacterNames(shot));
}

function formatShotCharacterBindingSummary(bindings = []) {
  return bindings
    .map((binding) => `${binding.characterName}${binding.variantName && binding.variantName !== "原身" ? `·${binding.variantName}` : ""}`)
    .filter(Boolean)
    .join("、");
}

function normalizePromptMatchKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s"'“”‘’《》<>【】[\]（）()：:，,。.;；、|｜/／_-]+/g, "");
}

function promptTextIncludesName(text, name) {
  const textKey = normalizePromptMatchKey(text);
  const nameKey = normalizePromptMatchKey(name);
  return Boolean(nameKey && textKey.includes(nameKey));
}

function splitPromptLines(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function pickUniquePromptLines(lines, maxCount) {
  const seen = new Set();
  return lines.filter((line) => {
    const key = normalizePromptMatchKey(line);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, maxCount);
}

function selectShotCharacterPrompt(shot, pack) {
  const bindings = getShotCharacterBindings(shot);
  const names = bindings.length ? bindings.map((binding) => binding.characterName) : getShotCharacterNames(shot);
  const cards = getActiveCharacters();
  const lines = [];

  if (names.length) {
    bindings.forEach((binding) => {
      const card = cards.find((item) => (
        (binding.characterId && item.id === binding.characterId)
        || normalizePromptMatchKey(item.name) === normalizePromptMatchKey(binding.characterName)
      ));
      if (!card) {
        return;
      }
      const variant = getCharacterVariantById(card, binding.variantId)
        || getArchiveCharacterVariant(card, { variantName: binding.variantName })
        || getCharacterVariantById(card, DEFAULT_CHARACTER_VARIANT_ID);
      const variantPrompt = String(variant?.prompt || "").trim();
      lines.push([
        formatCharacterPromptLine(card),
        `本镜使用形象：${getCharacterVariantLabel(variant)}。`,
        variantPrompt ? `形象补充提示词：${clipPromptSection(variantPrompt, 420)}` : "",
      ].filter(Boolean).join("\n"));
    });
    if (!bindings.length) {
      cards.forEach((card) => {
        if (names.some((name) => promptTextIncludesName(card.name, name) || promptTextIncludesName(formatCharacterPromptLine(card), name))) {
          lines.push(formatCharacterPromptLine(card));
        }
      });
    }

    splitPromptLines(pack?.characterPack).forEach((line) => {
      if (names.some((name) => promptTextIncludesName(line, name))) {
        lines.push(line);
      }
    });

    if (!lines.length) {
      names.forEach((name) => {
        lines.push(`${name}：沿用当前项目人设，保持脸型、发型、服装、标志物和气质一致。`);
      });
    }
  } else {
    lines.push("本镜未指定角色；如画面出现人物，只使用当前项目已有角色，不新增无关人物。");
  }

  return clipPromptSection(pickUniquePromptLines(lines, 6).join("\n"), 900);
}

function selectShotScenePrompt(shot, pack) {
  const keywords = [
    shot?.location,
    shot?.sceneTitle,
    shot?.sceneSummary,
  ].map(normalizePromptMatchKey).filter(Boolean);

  const matchedLines = splitPromptLines(pack?.scenePack).filter((line) => {
    const key = normalizePromptMatchKey(line);
    return keywords.some((keyword) => keyword && (key.includes(keyword) || keyword.includes(key)));
  });
  const matchedCards = Array.isArray(pack?.scenes)
    ? pack.scenes.filter((scene) => {
      const key = normalizePromptMatchKey([scene.name, scene.prompt, ...(scene.tags || [])].join(" "));
      return keywords.some((keyword) => keyword && (key.includes(keyword) || keyword.includes(key)));
    })
    : [];
  const cardLines = matchedCards.slice(0, 2).map((scene) => [
    `场景卡：${scene.name}`,
    scene.prompt,
    scene.tags?.length ? `标签：${scene.tags.join("、")}` : "",
  ].filter(Boolean).join("\n"));
  const fallback = [
    shot?.location || shot?.sceneTitle ? `地点：${shot.location || shot.sceneTitle}` : "",
    shot?.sceneSummary ? `场景概要：${shot.sceneSummary}` : "",
    "明确空间关系、主光源、关键道具和前后景层次。",
  ].filter(Boolean).join("\n");

  return clipPromptSection(
    [...cardLines, pickUniquePromptLines(matchedLines, 4).join("\n")].filter(Boolean).join("\n")
      || fallback
      || pack?.scenePack,
    650,
  );
}

function buildShotContextPrompt(shot, title) {
  const bindings = getShotCharacterBindings(shot);
  const names = bindings.length ? bindings.map((binding) => binding.characterName) : getShotCharacterNames(shot);
  const characterNames = formatShotCharacterBindingSummary(bindings) || names.join("、") || "未指定角色";
  const hasVisualText = Boolean(shot?.visual || shot?.action);
  const visual = [shot?.visual, shot?.action].filter(Boolean).join("\n动作补充：")
    || shot?.promptSeed
    || "按当前镜号补全清晰画面动作。";
  const contextLines = [
    `剧名：${title}`,
    `镜号：${shot?.shotNo || "未编号"}`,
    `集/场：第 ${shot?.episodeNo || 1} 集，${shot?.sceneTitle || `场景 ${shot?.sceneNo || 1}`}`,
    `场景：${shot?.location || shot?.sceneTitle || "未指定场景"}`,
    `出场角色：${characterNames}`,
    `画面内容：${clipPromptSection(visual, 900)}`,
    `镜头语言：${clipPromptSection(shot?.camera || "中景，平视镜头，构图清晰", 220)}`,
    `情绪氛围：${clipPromptSection(shot?.emotion || "符合剧情张力，情绪明确", 220)}`,
  ];

  if (shot?.dialogueRef) {
    contextLines.push(`对白/旁白参考：${clipPromptSection(shot.dialogueRef, 350)}（只理解剧情与情绪，不要生成字幕文字）`);
  }
  if (shot?.notes || shot?.sceneSummary) {
    contextLines.push(`连续性提示：${clipPromptSection(shot.notes || shot.sceneSummary, 350)}`);
  }
  if (shot?.promptSeed && hasVisualText) {
    contextLines.push(`提示词种子：${clipPromptSection(shot.promptSeed, 500)}`);
  }

  return contextLines.join("\n");
}

function buildShotContinuityPrompt(lock) {
  if (!lock || typeof lock !== "object") {
    return "";
  }
  const lines = [
    `${lock.title || "连续镜头"}：第 ${lock.frameIndex || 1}/${lock.frameTotal || 3} 张${lock.frameRole ? `（${lock.frameRole}）` : ""}`,
    lock.anchorShotNo ? `锚点镜头：${lock.anchorShotNo}` : "",
    `固定场景：${lock.scene || "沿用当前分镜场景"}`,
    lock.sceneLock ? `场景锁定：${clipPromptSection(lock.sceneLock, 420)}` : "",
    lock.characterLock ? `角色锁定：${clipPromptSection(lock.characterLock, 260)}` : "",
    lock.motionText ? `动作推进：${clipPromptSection(lock.motionText, 520)}` : "",
    lock.frameInstruction ? `本帧任务：${clipPromptSection(lock.frameInstruction, 360)}` : "",
    "只生成这一张独立关键帧，不要三宫格、拼图、分屏、多画格或同屏多时刻。",
    "同组三连镜头必须保持角色五官、发型、服装、场景季节、光线方向、主色调、关键道具一致；只改变动作阶段、表情细节和必要的镜头推进。",
    lock.previousFramePolicy === "previous-generated"
      ? "如果提供上一帧参考图，请把它作为动作连续性和场景一致性的参考，但不要复刻成同一张图。"
      : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function buildShotPrompt(shot, options = {}) {
  const pack = getActivePack();
  const scriptPack = getActiveScriptPack();
  const title = scriptPack?.title || state.activeProject || DEFAULT_PROJECT_TITLE;
  const hardRequirements = "硬性要求：保持角色脸型、发型、服装核心设计一致；保持全剧画风统一；画面无文字、无水印、无 logo；不要生成对白字幕；构图为竖屏漫剧关键帧，9:16 优先。";
  const continuityPrompt = buildShotContinuityPrompt(options.continuityLock || options);
  const promptBody = [
    buildShotPromptSection(
      "全局画风（精简）：",
      pack?.stylePack,
      "竖屏漫剧关键帧，统一画风，角色一致，电影感构图，适合连续分镜生产。",
      700,
    ),
    buildShotPromptSection(
      "本镜角色（只带出场角色）：",
      selectShotCharacterPrompt(shot, pack),
      summarizeCharacters(),
      900,
    ),
    buildShotPromptSection(
      "本镜场景（只带相关空间）：",
      selectShotScenePrompt(shot, pack),
      "固定场景未填写，请依据当前分镜建立清晰空间关系、光线和关键道具。",
      650,
    ),
    buildShotPromptSection(
      "连续镜头锁定：",
      continuityPrompt,
      "",
      1100,
    ),
    `分镜公式：\n${buildShotContextPrompt(shot, title)}`,
  ].filter(Boolean).join("\n\n");

  return [
    clipPromptSection(promptBody, 3900),
    hardRequirements,
  ].filter(Boolean).join("\n\n");
}

function getShotRelayReferenceOptions() {
  const imageById = new Map(state.images.map((image) => [image.id, image]));
  const preferredCategories = new Set(["shot-final", "shot-candidate"]);
  return getActiveArchives()
    .filter((archive) => preferredCategories.has(archive.category) && (archive.url || imageById.get(archive.imageId)?.url))
    .sort((a, b) => {
      const finalDelta = (b.category === "shot-final" ? 1 : 0) - (a.category === "shot-final" ? 1 : 0);
      if (finalDelta) {
        return finalDelta;
      }
      return String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
    })
    .slice(0, 80)
    .map((archive) => {
      const image = imageById.get(archive.imageId) || {};
      const label = [
        categoryLabels[archive.category] || "分镜图",
        archive.shotNo || "",
        archive.note || "",
      ].filter(Boolean).join(" · ");
      return {
        id: archive.imageId,
        label: clipClientText(label || archive.imageId, 72),
        url: image.url || archive.url,
        archive,
      };
    });
}

function buildShotRelayPrompt(shot, options = {}) {
  const visualText = compactPromptText(options.visualText || "");
  if (!visualText) {
    return "";
  }
  const pack = getActivePack();
  const scriptPack = getActiveScriptPack();
  const title = scriptPack?.title || state.activeProject || DEFAULT_PROJECT_TITLE;
  const lines = [
    buildShotPromptSection(
      "全局画风（精简）：",
      pack?.stylePack,
      "竖屏漫剧关键帧，统一画风，电影感构图，适合连续分镜生产。",
      650,
    ),
    options.includeSceneLock
      ? buildShotPromptSection(
        "场景锁（只用于保持空间与光线，不扩写动作）：",
        selectShotScenePrompt(shot, pack) || shot?.sceneSummary || shot?.location || shot?.sceneTitle,
        "沿用上一帧参考图的场景、季节、光线方向、色彩倾向和空间关系。",
        650,
      )
      : "",
    options.includeCharacterPrompt
      ? buildShotPromptSection(
        "角色提示词（可选）：",
        selectShotCharacterPrompt(shot, pack),
        "",
        850,
      )
      : "",
    [
      "接力分镜：",
      `剧名：${title}`,
      `原始镜号：${shot?.shotNo || "未编号"}`,
      `下一帧画面内容：${clipPromptSection(visualText, 1200)}`,
      shot?.camera ? `镜头语言参考：${clipPromptSection(shot.camera, 220)}` : "",
      shot?.emotion ? `情绪参考：${clipPromptSection(shot.emotion, 220)}` : "",
      "如果提供上一帧参考图：保持参考图中的角色身份、服装核心设计、场景空间、季节、光线方向和主色调，只推进到上述下一帧画面内容。",
      "只生成一张独立竖屏漫剧关键帧，不要三宫格、拼图、分屏、多画格、字幕文字、水印或 logo。",
    ].filter(Boolean).join("\n"),
    "硬性要求：画面内容以“下一帧画面内容”为准，不沿用原分镜画面内容；不要生成对白字幕；9:16 竖屏优先。",
  ].filter(Boolean);
  return clipPromptSection(lines.join("\n\n"), 3900);
}

async function copyShotPrompt(prompt) {
  try {
    await writeClipboardText(prompt);
    state.scriptStatus = { type: "success", text: "已复制当前分镜提示词。" };
  } catch {
    state.scriptStatus = { type: "error", text: "复制失败，可以手动选中提示词复制。" };
  }
  renderWorkspace();
}

function handoffShotPrompt(prompt, shot) {
  const bindings = getShotCharacterBindings(shot);
  const payload = {
    prompt,
    title: state.activeProject,
    project: buildManjuProjectContext(),
    shotNo: shot?.shotNo || "",
    scene: shot?.location || shot?.sceneTitle || "",
    characters: Array.isArray(shot?.characters) ? shot.characters : [],
    characterBindings: bindings,
    manjuContext: buildShotGenerationContext(shot),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(MANJU_SHOT_HANDOFF_STORAGE_KEY, JSON.stringify(payload));
  window.location.href = "/?mode=general&from=manju-shot";
}

function handoffShotRelay(shot, shotIndex, options = {}) {
  const prompt = String(options.prompt || "").trim();
  const visualText = String(options.visualText || "").trim();
  if (!prompt || !visualText) {
    state.scriptStatus = { type: "error", text: "先填写下一帧画面内容，再带入 A 版。" };
    renderWorkspace();
    return;
  }
  state.shotRelayDraft = {
    referenceImageId: options.reference?.id || "",
    visualText,
    includeSceneLock: options.includeSceneLock !== false,
    includeCharacterPrompt: Boolean(options.includeCharacterPrompt),
  };
  const payload = {
    type: "yaotu-manju-shot-relay",
    version: 1,
    prompt,
    title: state.activeProject,
    project: buildManjuProjectContext(),
    shotNo: shot?.shotNo || "",
    sourceIndex: shotIndex,
    scene: shot?.location || shot?.sceneTitle || "",
    characters: Array.isArray(shot?.characters) ? shot.characters : [],
    skipCharacterReferences: !options.includeCharacterPrompt,
    referenceImages: options.reference?.url ? [{
      id: `manju-relay-ref-${options.reference.id}`,
      name: `上一帧参考 · ${options.reference.label || options.reference.id}`,
      url: options.reference.url,
      thumb: options.reference.url,
      source: "manju-relay-reference",
    }] : [],
    manjuContext: buildShotGenerationContext(shot, {
      sourceShotNo: shot?.shotNo || "",
      continuityLock: {
        groupId: `relay-${Date.now().toString(36)}`,
        title: "单帧接力",
        frameIndex: 1,
        frameTotal: 1,
        frameRole: "下一帧",
        frameInstruction: visualText,
        previousFramePolicy: options.reference?.url ? "manual-reference" : "none",
        anchorShotNo: shot?.shotNo || "",
        scene: shot?.location || shot?.sceneTitle || "",
        sceneLock: options.includeSceneLock !== false ? (shot?.sceneSummary || shot?.location || shot?.sceneTitle || "") : "",
        characterLock: options.includeCharacterPrompt ? (formatShotCharacterBindingSummary(getShotCharacterBindings(shot)) || getShotCharacterNames(shot).join("、")) : "",
        motionText: visualText,
      },
    }),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(MANJU_SHOT_HANDOFF_STORAGE_KEY, JSON.stringify(payload));
  window.location.href = "/?mode=general&from=manju-shot-relay";
}

function handoffShotBatch(shots, startIndex) {
  const batchItems = buildShotBatchItems(shots, startIndex);
  if (!batchItems.length) {
    state.scriptStatus = { type: "error", text: "当前镜头后面没有可生成的分镜。" };
    renderWorkspace();
    return;
  }

  const project = buildManjuProjectContext();
  const payload = {
    type: "yaotu-manju-shot-queue",
    version: 1,
    id: `queue-${Date.now().toString(36)}`,
    title: state.activeProject,
    project,
    activeIndex: 0,
    createdAt: new Date().toISOString(),
    shots: batchItems.map((item, queueIndex) => ({
      key: item.key,
      queueIndex,
      sourceIndex: item.index,
      prompt: buildShotPrompt(item.shot),
      shotNo: item.shot.shotNo,
      episodeNo: item.shot.episodeNo,
      sceneNo: item.shot.sceneNo,
      scene: item.shot.location || item.shot.sceneTitle || "",
      sceneTitle: item.shot.sceneTitle || "",
      characters: Array.isArray(item.shot.characters) ? item.shot.characters : [],
      characterBindings: getShotCharacterBindings(item.shot),
      visual: item.shot.visual || item.shot.action || item.shot.promptSeed || "",
      manjuContext: buildShotGenerationContext(item.shot),
      status: "pending",
    })),
  };
  localStorage.setItem(MANJU_SHOT_QUEUE_HANDOFF_STORAGE_KEY, JSON.stringify(payload));
  window.location.href = "/?mode=general&from=manju-shot-queue";
}

function handoffShotTriple(shots, sourceIndex, options = {}) {
  const tripleItems = buildShotTripleItems(shots, sourceIndex, options);
  if (!tripleItems.length) {
    state.scriptStatus = { type: "error", text: "当前镜头无法扩展三连镜头。" };
    renderWorkspace();
    return;
  }

  state.shotTripleDraft.motionText = options.motionText || "";
  state.shotTripleDraft.anchorMode = options.anchorMode || "forward";
  const project = buildManjuProjectContext();
  const queueId = `triple-${Date.now().toString(36)}`;
  const baseShot = shots[sourceIndex];
  const payload = {
    type: "yaotu-manju-shot-queue",
    queueKind: "shot-triple",
    version: 1,
    id: queueId,
    title: state.activeProject,
    project,
    activeIndex: 0,
    previousFramePolicy: "previous-generated",
    createdAt: new Date().toISOString(),
    shots: tripleItems.map((item, queueIndex) => ({
      key: item.key,
      queueIndex,
      sourceIndex: item.index,
      prompt: buildShotPrompt(item.shot, { continuityLock: item.continuityLock }),
      shotNo: item.shot.shotNo,
      episodeNo: item.shot.episodeNo,
      sceneNo: item.shot.sceneNo,
      scene: item.shot.location || item.shot.sceneTitle || "",
      sceneTitle: item.shot.sceneTitle || "",
      characters: Array.isArray(item.shot.characters) ? item.shot.characters : [],
      characterBindings: getShotCharacterBindings(item.shot),
      visual: item.shot.visual || item.shot.action || item.shot.promptSeed || "",
      continuityLock: item.continuityLock,
      manjuContext: buildShotGenerationContext(item.shot, {
        queueId,
        continuityLock: item.continuityLock,
        sourceShotNo: baseShot?.shotNo || "",
      }),
      status: "pending",
    })),
  };
  localStorage.setItem(MANJU_SHOT_QUEUE_HANDOFF_STORAGE_KEY, JSON.stringify(payload));
  window.location.href = "/?mode=general&from=manju-shot-queue";
}

function handoffCharacterBaseImage(card) {
  const name = String(card?.name || "").trim();
  const prompt = String(card?.prompt || "").trim();
  if (!name || !prompt) {
    state.characterStatus = { type: "error", text: "先填写角色名和人设提示词卡，再生成底图。" };
    renderWorkspace();
    return;
  }

  const normalizedCard = normalizeCharacter({
    ...card,
    id: card.id || makeEntityId("character", `${state.activeProject}-${name}`),
    title: state.activeProject,
    name,
    prompt,
  });
  const payload = {
    type: "yaotu-manju-character-base",
    version: 1,
    id: `character-base-${Date.now().toString(36)}`,
    title: state.activeProject,
    project: buildManjuProjectContext(),
    character: normalizedCard,
    prompt: buildCharacterBasePrompt(normalizedCard),
    manjuContext: {
      type: "character-base",
      title: state.activeProject,
      category: "character-profile",
      characterId: normalizedCard.id,
      characterName: normalizedCard.name,
      characterRole: normalizedCard.role,
    },
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(MANJU_CHARACTER_HANDOFF_STORAGE_KEY, JSON.stringify(payload));
  window.location.href = "/?mode=general&from=manju-character";
}

function buildCharacterBasePrompt(card) {
  const pack = getActivePack();
  return [
    buildShotPromptSection(
      "全局画风（精简）：",
      pack?.stylePack,
      "竖屏漫剧，统一画风，精致线稿，角色一致，干净背景，适合作为后续分镜参考。",
      900,
    ),
    "目标：生成角色形象底图，作为后续分镜参考图。",
    `剧名：${state.activeProject}`,
    `角色：${card.name}${card.role ? `（${card.role}）` : ""}`,
    `人设：${clipPromptSection(card.prompt, 1200)}`,
    "画面要求：正面或 3/4 角度半身像，脸型、发型、瞳色、服装轮廓和标志物清晰；背景简洁，不抢主体；不要出现文字、字幕、水印、logo。",
    "一致性要求：后续分镜必须以这张图作为角色身份参考，避免换脸、换发型、换服装核心设计。",
  ].filter(Boolean).join("\n\n");
}

function buildManjuProjectContext() {
  const pack = getActivePack() || {};
  return {
    title: state.activeProject,
    pack: {
      title: state.activeProject,
      stylePack: pack.stylePack || "",
      scenePack: pack.scenePack || "",
      characterPack: pack.characterPack || compileActiveCharacterPack(),
    },
    characters: getActiveCharacters(),
  };
}

function buildShotGenerationContext(shot, options = {}) {
  const bindings = getShotCharacterBindings(shot);
  return {
    type: "shot",
    title: state.activeProject,
    category: "shot-candidate",
    shotNo: String(shot?.shotNo || "").trim(),
    scene: String(shot?.location || shot?.sceneTitle || "").trim(),
    sceneTitle: String(shot?.sceneTitle || "").trim(),
    queueId: String(options.queueId || "").trim(),
    sourceShotNo: String(options.sourceShotNo || "").trim(),
    continuityLock: options.continuityLock || null,
    characters: bindings.length ? bindings.map((binding) => binding.characterName) : getShotCharacterNames(shot),
    characterBindings: bindings,
  };
}

async function writeClipboardText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("copy failed");
  }
}

function clipClientText(value, maxLength = 36) {
  const text = String(value || "待补画面").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function createScriptCard(titleText, descriptionText) {
  const card = document.createElement("article");
  card.className = "script-card";
  const title = document.createElement("h3");
  title.textContent = titleText;
  const description = document.createElement("p");
  description.textContent = descriptionText;
  card.append(title, description);
  return card;
}

function createFieldLabel(text) {
  const label = document.createElement("label");
  label.className = "field";
  const span = document.createElement("span");
  span.textContent = text;
  label.append(span);
  return label;
}

async function importScriptPackFile(file) {
  try {
    const text = await readFileText(file);
    const parsed = JSON.parse(text);
    const source = parsed?.pack && typeof parsed.pack === "object" ? parsed.pack : parsed;
    const pack = normalizeScriptPack({
      ...source,
      title: normalizeTitle(source.title) || state.activeProject,
      source: source.source || "imported-script-pack",
    });
    if (!pack || flattenScriptShots(pack).length === 0) {
      if (!pack?.scriptText) {
        throw new Error("这个 JSON 里没有识别到分镜行或完整剧本原文。");
      }
    }
    upsertScriptPack(pack);
    state.activeProject = pack.title;
    localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, pack.title);
    const shotCount = flattenScriptShots(pack).length;
    state.scriptStatus = {
      type: "success",
      text: `已导入 ${pack.title}：${shotCount} 条分镜${pack.scriptText ? "，含完整剧本原文" : ""}。`,
    };
    renderProjectOptions();
    renderAll();
  } catch (error) {
    state.scriptStatus = { type: "error", text: error.message || "剧本包导入失败。" };
    renderAll();
  }
}

function importShotTableText({ title, episodeNo, tableText, scriptText }) {
  try {
    const normalizedTitle = normalizeTitle(title) || state.activeProject || DEFAULT_PROJECT_TITLE;
    const normalizedEpisodeNo = clampNumber(episodeNo, 1, 999, 1);
    const pack = parseShotTableToScriptPack(String(tableText || ""), {
      title: normalizedTitle,
      episodeNo: normalizedEpisodeNo,
      scriptText,
    });
    const normalizedPack = normalizeScriptPack(pack);
    const shotCount = flattenScriptShots(normalizedPack).length;
    if (!normalizedPack || shotCount === 0) {
      throw new Error("没有识别到可用分镜行。");
    }
    upsertScriptPack(normalizedPack);
    state.activeProject = normalizedPack.title;
    state.activeShotKey = "";
    localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, normalizedPack.title);
    state.scriptStatus = {
      type: "success",
      text: `已导入现成分镜表：${shotCount} 条镜头${normalizedPack.scriptText ? "，并保存完整剧本原文" : ""}。`,
    };
    renderProjectOptions();
    renderAll();
  } catch (error) {
    state.scriptStatus = { type: "error", text: error.message || "分镜表解析失败。" };
    renderAll();
    setWorkspace("script");
  }
}

function parseShotTableToScriptPack(text, context) {
  const sourceText = String(text || "").trim();
  if (sourceText.length < 6) {
    throw new Error("先粘贴或导入一份分镜表。");
  }

  const parsedJson = tryParseLooseJson(sourceText);
  if (parsedJson) {
    const source = parsedJson?.pack && typeof parsedJson.pack === "object" ? parsedJson.pack : parsedJson;
    if (source?.episodes || source?.shots) {
      return {
        ...source,
        title: normalizeTitle(source.title) || context.title,
        source: source.source || "imported-shot-table",
        scriptText: normalizeScriptTextValue(context.scriptText)
          || normalizeScriptTextValue(source.scriptText || source.fullScript || source.originalScript || source.script),
      };
    }
    const jsonRows = extractShotRowsFromJson(source);
    if (jsonRows.length) {
      return buildScriptPackFromShotRows(jsonRows, context, "imported-json-shot-table");
    }
  }

  const markdownRows = parseMarkdownTableRows(sourceText);
  if (markdownRows.length) {
    return buildScriptPackFromShotRows(markdownRows, context, "imported-markdown-shot-table");
  }

  const delimitedRows = parseDelimitedTableRows(sourceText);
  if (delimitedRows.length) {
    return buildScriptPackFromShotRows(delimitedRows, context, "imported-delimited-shot-table");
  }

  throw new Error("暂时没有识别到表格结构。建议使用 Markdown 表格、CSV/TSV，或包含 shots/rows 数组的 JSON。");
}

function extractShotRowsFromJson(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  const candidates = [
    value.rows,
    value.items,
    value.table,
    value.shots,
    value.storyboard,
    value.shotTable,
    value.shotList,
    value.data,
  ];
  return candidates.find((item) => Array.isArray(item)) || [];
}

function tryParseLooseJson(text) {
  const source = stripCodeFence(text);
  const candidates = [source];
  const firstObject = source.search(/[{[]/);
  const lastObject = Math.max(source.lastIndexOf("}"), source.lastIndexOf("]"));
  if (firstObject >= 0 && lastObject > firstObject) {
    candidates.push(source.slice(firstObject, lastObject + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function stripCodeFence(text) {
  const source = String(text || "").trim();
  const fenced = source.match(/^```(?:json|csv|tsv|markdown|md)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : source;
}

function parseMarkdownTableRows(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("|"));
  if (lines.length < 2) {
    return [];
  }

  const headerIndex = lines.findIndex((line, index) => {
    const cells = splitMarkdownRow(line);
    const nextCells = splitMarkdownRow(lines[index + 1] || "");
    return cells.length >= 2 && nextCells.length >= 2 && isMarkdownSeparatorRow(nextCells);
  });
  const headers = splitMarkdownRow(lines[headerIndex >= 0 ? headerIndex : 0]);
  if (headers.length < 2) {
    return [];
  }
  const startIndex = headerIndex >= 0 ? headerIndex + 2 : 1;
  return lines.slice(startIndex)
    .map(splitMarkdownRow)
    .filter((cells) => cells.length >= 2 && !isMarkdownSeparatorRow(cells))
    .map((cells) => objectFromCells(headers, cells))
    .filter((row) => Object.values(row).some(Boolean));
}

function splitMarkdownRow(line) {
  return String(line || "")
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isMarkdownSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(String(cell || "").trim()));
}

function parseDelimitedTableRows(text) {
  const source = stripCodeFence(text);
  const lines = source.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return [];
  }
  const firstLines = lines.slice(0, 5).join("\n");
  const delimiter = firstLines.includes("\t") ? "\t" : ",";
  if (delimiter === "," && !firstLines.includes(",")) {
    return [];
  }
  const records = lines.map((line) => splitDelimitedLine(line, delimiter));
  const headers = records[0].map((cell) => cell.trim());
  if (headers.length < 2) {
    return [];
  }
  return records.slice(1)
    .filter((cells) => cells.some((cell) => String(cell || "").trim()))
    .map((cells) => objectFromCells(headers, cells))
    .filter((row) => Object.values(row).some(Boolean));
}

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function objectFromCells(headers, cells) {
  return headers.reduce((acc, header, index) => {
    const key = String(header || `列${index + 1}`).trim();
    if (key) {
      acc[key] = String(cells[index] || "").trim();
    }
    return acc;
  }, {});
}

function buildScriptPackFromShotRows(rows, context, source) {
  const title = normalizeTitle(context.title) || DEFAULT_PROJECT_TITLE;
  const fallbackEpisodeNo = clampNumber(context.episodeNo, 1, 999, 1);
  const scriptText = normalizeScriptTextValue(context.scriptText);
  const mappedRows = rows
    .map((row, index) => normalizeShotTableRow(row, index, fallbackEpisodeNo))
    .filter(Boolean);
  if (!mappedRows.length) {
    throw new Error("表格里没有可用于生图的分镜内容。");
  }

  const episodeMap = new Map();
  mappedRows.forEach((row) => {
    const episodeNo = row.episodeNo || fallbackEpisodeNo;
    if (!episodeMap.has(episodeNo)) {
      episodeMap.set(episodeNo, {
        episodeNo,
        title: `第${episodeNo}集`,
        summary: "",
        sceneMap: new Map(),
      });
    }
    const episode = episodeMap.get(episodeNo);
    const sceneKey = row.sceneNo
      ? `scene-no:${row.sceneNo}`
      : `scene-name:${row.location || row.sceneTitle || "默认场景"}`;
    if (!episode.sceneMap.has(sceneKey)) {
      const sceneNo = row.sceneNo || episode.sceneMap.size + 1;
      episode.sceneMap.set(sceneKey, {
        sceneNo,
        title: row.sceneTitle || row.location || `场景${sceneNo}`,
        location: row.location || row.sceneTitle || "",
        summary: row.sceneSummary || "",
        shots: [],
      });
    }
    const scene = episode.sceneMap.get(sceneKey);
    scene.shots.push({
      shotNo: row.shotNo || `${episodeNo}-${scene.sceneNo}-${String(scene.shots.length + 1).padStart(3, "0")}`,
      characters: row.characters,
      visual: row.visual,
      action: row.action,
      emotion: row.emotion,
      camera: row.camera,
      dialogueRef: row.dialogueRef,
      promptSeed: row.promptSeed,
      notes: row.notes,
    });
  });

  return {
    type: "yaotu-manju-script-pack",
    version: 1,
    id: `script-${sanitizeDownloadName(title)}-${Date.now().toString(36)}`,
    title,
    source,
    scriptText,
    summary: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    episodes: Array.from(episodeMap.values()).map((episode) => ({
      episodeNo: episode.episodeNo,
      title: episode.title,
      summary: episode.summary,
      scenes: Array.from(episode.sceneMap.values()),
    })),
  };
}

function normalizeShotTableRow(row, index, fallbackEpisodeNo) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const normalized = normalizeRowKeys(row);
  const episodeNo = clampNumber(pickRowValue(normalized, ["episodeNo", "episode", "集数", "集", "episodeIndex"]), 1, 999, fallbackEpisodeNo);
  const sceneNo = clampNumber(pickRowValue(normalized, ["sceneNo", "sceneIndex", "场景号", "场次", "场号"]), 1, 999, 0);
  const sceneTitle = pickRowValue(normalized, ["sceneTitle", "scene", "场景", "场景标题", "场景名", "场次名称"]);
  const location = pickRowValue(normalized, ["location", "place", "地点", "场地", "位置", "环境"]);
  const charactersText = pickRowValue(normalized, ["characters", "character", "角色", "人物", "出场角色", "角色列表"]);
  const visual = pickRowValue(normalized, ["visual", "image", "description", "picture", "画面", "画面内容", "画面描述", "视觉", "内容", "分镜内容"]);
  const action = pickRowValue(normalized, ["action", "动作", "人物动作", "行为"]);
  const emotion = pickRowValue(normalized, ["emotion", "mood", "情绪", "氛围", "情绪氛围"]);
  const camera = pickRowValue(normalized, ["camera", "framing", "shotType", "镜头", "镜头语言", "景别", "机位", "构图"]);
  const dialogueRef = pickRowValue(normalized, ["dialogueRef", "dialogue", "line", "对白", "对白参考", "台词", "旁白", "文案"]);
  const promptSeed = pickRowValue(normalized, ["promptSeed", "prompt", "提示词", "提示词种子", "生图提示词", "画面提示词"]);
  const notes = pickRowValue(normalized, ["notes", "note", "备注", "连续性", "连续性提示", "补充"]);
  if (![visual, action, dialogueRef, promptSeed, notes].some(Boolean)) {
    return null;
  }
  return {
    episodeNo,
    sceneNo,
    sceneTitle,
    location,
    sceneSummary: pickRowValue(normalized, ["sceneSummary", "场景概要", "场景说明"]),
    shotNo: pickRowValue(normalized, ["shotNo", "shot", "id", "镜号", "镜头号", "分镜号", "编号", "序号"]) || String(index + 1),
    characters: splitNameList(charactersText),
    visual,
    action,
    emotion,
    camera,
    dialogueRef,
    promptSeed,
    notes,
  };
}

function normalizeRowKeys(row) {
  return Object.entries(row).reduce((acc, [key, value]) => {
    acc[normalizeHeaderKey(key)] = String(value || "").trim();
    return acc;
  }, {});
}

function pickRowValue(row, aliases) {
  for (const alias of aliases) {
    const key = normalizeHeaderKey(alias);
    if (row[key]) {
      return row[key];
    }
  }
  return "";
}

function normalizeHeaderKey(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[：:：/／_\-—－]+/g, "")
    .toLowerCase();
}

function splitNameList(value) {
  return String(value || "")
    .split(/[、,，/／;；|｜]+/)
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function saveOriginalScriptFromForm({ title, episodeNo, scriptText }) {
  const normalizedTitle = normalizeTitle(title) || state.activeProject || DEFAULT_PROJECT_TITLE;
  const text = normalizeScriptTextValue(scriptText);
  if (text.length < 20) {
    state.scriptStatus = { type: "error", text: "剧本文本太短，至少保存一段完整剧情。" };
    renderAll();
    setWorkspace("script");
    return;
  }
  const previous = state.scriptPacks.find((pack) => pack.title === normalizedTitle) || {};
  const episodeNoValue = clampNumber(episodeNo, 1, 999, 1);
  const payload = normalizeScriptPack({
    ...previous,
    id: previous.id || makeEntityId("script", normalizedTitle),
    title: normalizedTitle,
    source: previous.source || "original-script",
    scriptText: text,
    episodes: previous.episodes || [{
      episodeNo: episodeNoValue,
      title: `第${episodeNoValue}集`,
      scenes: [],
    }],
    updatedAt: new Date().toISOString(),
  });
  upsertScriptPack(payload);
  state.activeProject = payload.title;
  localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, payload.title);
  state.scriptStatus = { type: "success", text: `已保存《${payload.title}》完整剧本原文。` };
  renderProjectOptions();
  renderAll();
}

async function splitPlainScript({ title, episodeNo, scriptText, button }) {
  const normalizedTitle = normalizeTitle(title) || state.activeProject;
  const text = String(scriptText || "").trim();
  if (text.length < 20) {
    state.scriptStatus = { type: "error", text: "剧本文本太短，至少粘贴一段完整剧情。" };
    renderAll();
    setWorkspace("script");
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "拆分中...";
  try {
    const data = await fetchJson("/api/manju/script/split", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: normalizedTitle,
        episodeNo: Number.parseInt(episodeNo, 10) || 1,
        scriptText: text,
        stylePack: getActivePack()?.stylePack || "",
        characterCards: getActiveCharacters(),
      }),
    }, 620000);
    const pack = normalizeScriptPack({
      ...data.pack,
      scriptText: data.pack?.scriptText || text,
    });
    if (!pack || flattenScriptShots(pack).length === 0) {
      throw new Error("辅助 API 没有返回可用分镜表。");
    }
    upsertScriptPack(pack);
    state.activeProject = pack.title;
    localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, pack.title);
    state.scriptStatus = { type: "success", text: `已生成 ${flattenScriptShots(pack).length} 条分镜，使用模型：${data.model || "辅助 API"}` };
    renderProjectOptions();
    renderAll();
  } catch (error) {
    state.scriptStatus = { type: "error", text: error.message || "辅助 API 拆分失败。" };
    renderAll();
    setWorkspace("script");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function exportActiveScriptPack() {
  const pack = getActiveScriptPack();
  if (!pack) {
    return;
  }
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeDownloadName(pack.title)}-script-pack.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function deleteActiveScriptPack() {
  const pack = getActiveScriptPack();
  if (!pack) {
    return;
  }
  if (!window.confirm(`删除《${pack.title}》的剧本分镜包？`)) {
    return;
  }
  state.scriptPacks = state.scriptPacks.filter((item) => item.id !== pack.id);
  writeScriptPacks();
  state.scriptStatus = { type: "info", text: `已删除 ${pack.title} 的剧本包。` };
  renderProjectOptions();
  renderAll();
}

function createTaskCard(card) {
  const article = document.createElement("article");
  article.className = `task-card${card.featured ? " featured" : ""}`;
  const top = document.createElement("div");
  top.className = "task-top";
  const index = document.createElement("span");
  index.className = "task-index";
  index.textContent = card.index;
  const status = document.createElement("span");
  status.className = "task-status";
  status.textContent = card.status;
  top.append(index, status);

  const title = document.createElement("h3");
  title.textContent = card.title;
  const description = document.createElement("p");
  description.textContent = card.description;
  article.append(top, title, description);

  if (card.action && card.key) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "task-action";
    action.textContent = card.action;
    action.addEventListener("click", () => setWorkspace(card.key));
    article.append(action);
  }
  return article;
}

function createPromptBlock(title, text) {
  const block = document.createElement("div");
  block.className = "prompt-block";
  const label = document.createElement("span");
  label.textContent = title;
  const body = document.createElement("p");
  body.textContent = text;
  block.append(label, body);
  return block;
}

function createAssetCard(image, options = {}) {
  const character = options.character || findCharacterForAsset(image);
  const archive = state.archives[image.id || image.archive?.imageId] || image.archive || {};
  const variant = character ? (options.variant || getArchiveCharacterVariant(character, archive)) : null;
  const slotLabels = character ? getCharacterAssetSlotLabels(character, image.id || image.archive?.imageId, variant) : [];
  const card = document.createElement("article");
  card.className = "asset-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", "打开归档图大图预览");
  const img = document.createElement("img");
  img.className = "asset-thumb";
  img.src = image.url || image.thumb || "";
  img.alt = image.archive?.note || categoryLabels[image.archive?.category] || "漫剧归档图";
  const body = document.createElement("div");
  body.className = "asset-body";
  const title = document.createElement("h3");
  title.textContent = categoryLabels[image.archive?.category] || "归档资产";
  const meta = document.createElement("span");
  meta.className = "asset-meta";
  meta.textContent = image.archive?.note || image.batchId || image.id || "未备注";
  body.append(title, meta);
  if (slotLabels.length) {
    const badges = document.createElement("div");
    badges.className = "asset-slot-badges";
    slotLabels.slice(0, 3).forEach((label) => {
      const badge = document.createElement("span");
      badge.textContent = label;
      badges.append(badge);
    });
    body.append(badges);
  }
  card.append(img, body);
  card.addEventListener("click", () => openAssetPreview(image, { character, variantId: variant?.id }));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAssetPreview(image, { character, variantId: variant?.id });
    }
  });
  return card;
}

function openAssetPreview(image, options = {}) {
  const imageId = String(image?.id || image?.archive?.imageId || "").trim();
  const url = image?.url || image?.thumb || image?.archive?.url || "";
  if (!imageId || !url) {
    return;
  }
  document.querySelectorAll(".asset-preview-backdrop").forEach((node) => node.remove());

  const characters = getActiveCharacters();
  let selectedCharacter = options.character || findCharacterForAsset(image) || characters[0] || null;
  const archive = state.archives[imageId] || image.archive || null;
  let selectedVariant = selectedCharacter ? getArchiveCharacterVariant(selectedCharacter, archive) : null;
  const usage = getArchiveUsage(imageId);
  const backdrop = document.createElement("div");
  backdrop.className = "asset-preview-backdrop";

  function pickPreviewVariant(card) {
    if (!card) {
      return null;
    }
    const variants = getCharacterVariants(card);
    const archiveBelongsToCard = archive?.characterId === card.id
      || normalizePromptMatchKey(archive?.characterName) === normalizePromptMatchKey(card.name);
    const preferredIds = [
      options.variantId,
      archiveBelongsToCard ? archive?.variantId : "",
      state.selectedCharacterId === card.id ? state.characterStudio.variantId : "",
      DEFAULT_CHARACTER_VARIANT_ID,
    ].filter(Boolean);
    for (const id of preferredIds) {
      const found = variants.find((variant) => variant.id === id);
      if (found) {
        return found;
      }
    }
    if (archiveBelongsToCard && archive?.variantName) {
      const archiveVariant = getArchiveCharacterVariant(card, archive);
      if (archiveVariant) {
        return archiveVariant;
      }
    }
    return variants[0] || null;
  }

  const modal = document.createElement("section");
  modal.className = "asset-preview-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  const media = document.createElement("div");
  media.className = "asset-preview-media";
  const preview = document.createElement("img");
  preview.src = url;
  preview.alt = archive?.note || "归档图大图";
  media.append(preview);

  const panel = document.createElement("aside");
  panel.className = "asset-preview-panel";
  const head = document.createElement("div");
  head.className = "asset-preview-head";
  const title = document.createElement("h3");
  title.textContent = categoryLabels[archive?.category] || "归档资产";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "icon-button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "关闭大图预览");
  closeButton.addEventListener("click", () => backdrop.remove());
  head.append(title, closeButton);

  const meta = document.createElement("p");
  meta.className = "asset-preview-meta";
  meta.textContent = archive?.note || image.batchId || imageId;
  panel.append(head, meta);

  if (usage.length) {
    const usageNote = document.createElement("p");
    usageNote.className = "asset-preview-warning";
    usageNote.textContent = `已被使用：${usage.slice(0, 4).map(formatArchiveUsageLabel).join(" / ")}${usage.length > 4 ? ` 等 ${usage.length} 处` : ""}`;
    panel.append(usageNote);
  }

  if (characters.length) {
    const characterLabel = createFieldLabel("写入角色");
    const select = document.createElement("select");
    characters.forEach((card) => {
      const option = document.createElement("option");
      option.value = card.id;
      option.textContent = `${card.name}${card.role ? `（${card.role}）` : ""}`;
      select.append(option);
    });
    select.value = selectedCharacter?.id || characters[0].id;
    selectedCharacter = characters.find((card) => card.id === select.value) || characters[0];
    selectedVariant = pickPreviewVariant(selectedCharacter);
    select.addEventListener("change", () => {
      selectedCharacter = characters.find((card) => card.id === select.value) || characters[0];
      selectedVariant = pickPreviewVariant(selectedCharacter);
      renderVariantSelect();
      renderSlotButtons();
    });
    characterLabel.append(select);
    panel.append(characterLabel);

    const variantLabel = createFieldLabel("写入形象");
    const variantSelect = document.createElement("select");
    variantSelect.addEventListener("change", () => {
      selectedVariant = getCharacterVariantById(selectedCharacter, variantSelect.value)
        || getCharacterVariants(selectedCharacter)[0]
        || null;
      renderSlotButtons();
    });
    variantLabel.append(variantSelect);
    panel.append(variantLabel);

    const slotWrap = document.createElement("div");
    slotWrap.className = "asset-slot-actions";
    panel.append(slotWrap);

    function renderVariantSelect() {
      variantSelect.innerHTML = "";
      const variants = getCharacterVariants(selectedCharacter);
      if (!variants.some((variant) => variant.id === selectedVariant?.id)) {
        selectedVariant = variants[0] || null;
      }
      variants.forEach((variant) => {
        const option = document.createElement("option");
        option.value = variant.id;
        option.textContent = `${getCharacterVariantLabel(variant)}${variant.custom ? " · 形象卡" : " · 默认"}`;
        variantSelect.append(option);
      });
      variantSelect.value = selectedVariant?.id || DEFAULT_CHARACTER_VARIANT_ID;
    }

    function renderSlotButtons() {
      slotWrap.innerHTML = "";
      const currentLabels = getCharacterAssetSlotLabels(selectedCharacter, imageId, selectedVariant);
      const targetNote = document.createElement("p");
      targetNote.className = "asset-preview-meta";
      targetNote.textContent = `写入目标：${selectedCharacter.name} · ${getCharacterVariantLabel(selectedVariant)}`;
      slotWrap.append(targetNote);
      if (currentLabels.length) {
        const note = document.createElement("p");
        note.className = "asset-preview-meta";
        note.textContent = `当前位置：${currentLabels.join(" / ")}`;
        slotWrap.append(note);
      }
      CHARACTER_ASSET_SLOTS.forEach((slot) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = slot.id === "primary" ? "primary-button" : "ghost-button";
        button.textContent = slot.label;
        button.addEventListener("click", () => assignCharacterAssetSlot(selectedCharacter, {
          ...image,
          id: imageId,
          url,
        }, slot.id, selectedVariant));
        slotWrap.append(button);
      });
    }
    renderVariantSelect();
    renderSlotButtons();
  } else {
    panel.append(createEmptyNote("当前剧名还没有角色卡。先在人设库保存角色后，再把图片插入对应位置。"));
  }

  const workflowActions = document.createElement("div");
  workflowActions.className = "asset-slot-actions asset-workflow-actions";

  const mainReferenceButton = document.createElement("button");
  mainReferenceButton.type = "button";
  mainReferenceButton.className = "ghost-button";
  mainReferenceButton.textContent = "设为主参考图";
  mainReferenceButton.disabled = !selectedCharacter;
  mainReferenceButton.addEventListener("click", () => {
    if (!selectedCharacter) {
      return;
    }
    useAssetAsStudioReference(selectedCharacter, image, "main", { variant: selectedVariant });
    backdrop.remove();
  });

  const detailReferenceButton = document.createElement("button");
  detailReferenceButton.type = "button";
  detailReferenceButton.className = "ghost-button";
  detailReferenceButton.textContent = "设为服装/细节参考";
  detailReferenceButton.disabled = !selectedCharacter;
  detailReferenceButton.addEventListener("click", () => {
    if (!selectedCharacter) {
      return;
    }
    useAssetAsStudioReference(selectedCharacter, image, "detail", { variant: selectedVariant });
    backdrop.remove();
  });

  const tweakButton = document.createElement("button");
  tweakButton.type = "button";
  tweakButton.className = "primary-button";
  tweakButton.textContent = "去角色生图区微调";
  tweakButton.disabled = !selectedCharacter;
  tweakButton.addEventListener("click", () => {
    if (!selectedCharacter) {
      return;
    }
    useAssetAsStudioReference(selectedCharacter, image, "main", { jump: true, variant: selectedVariant });
    backdrop.remove();
  });

  const removeArchiveButton = document.createElement("button");
  removeArchiveButton.type = "button";
  removeArchiveButton.className = "ghost-button";
  removeArchiveButton.textContent = usage.length ? "已使用，不能移出图集" : "仅移出本剧图集";
  removeArchiveButton.disabled = !archive || usage.length > 0;
  removeArchiveButton.addEventListener("click", () => {
    removeAssetFromArchive(imageId, { close: () => backdrop.remove() });
  });

  const detachButton = document.createElement("button");
  detachButton.type = "button";
  detachButton.className = "ghost-button";
  detachButton.textContent = "解除选用关系";
  detachButton.disabled = usage.length === 0;
  detachButton.addEventListener("click", () => {
    detachAssetUsages(imageId, { close: () => backdrop.remove() });
  });

  const deleteSourceButton = document.createElement("button");
  deleteSourceButton.type = "button";
  deleteSourceButton.className = "ghost-button danger-button";
  deleteSourceButton.textContent = usage.length ? "已使用，不能删源图" : "删除源图";
  deleteSourceButton.disabled = usage.length > 0;
  deleteSourceButton.addEventListener("click", () => {
    deleteArchiveSourceImage(imageId, { close: () => backdrop.remove() });
  });

  workflowActions.append(mainReferenceButton, detailReferenceButton, tweakButton, detachButton, removeArchiveButton, deleteSourceButton);
  panel.append(workflowActions);

  modal.append(media, panel);
  backdrop.append(modal);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      backdrop.remove();
    }
  });
  document.addEventListener("keydown", function closeOnEscape(event) {
    if (event.key === "Escape") {
      backdrop.remove();
      document.removeEventListener("keydown", closeOnEscape);
    }
  });
  document.body.append(backdrop);
}

function useAssetAsStudioReference(card, image, mode, options = {}) {
  const normalized = normalizeCharacter(card);
  const imageId = String(image?.id || image?.archive?.imageId || "").trim();
  const url = image?.url || image?.thumb || image?.archive?.url || "";
  if (!normalized || !imageId || !url) {
    return;
  }

  const now = new Date().toISOString();
  const existingArchive = state.archives[imageId] || image.archive || {};
  const activeVariant = resolveCharacterVariant(
    normalized,
    options.variant || getArchiveCharacterVariant(normalized, existingArchive),
  );
  const variantId = isDefaultCharacterVariant(activeVariant) ? "" : activeVariant?.id || "";
  const variantName = isDefaultCharacterVariant(activeVariant) ? "" : activeVariant?.name || "";
  state.selectedCharacterId = normalized.id;
  state.characterStudio.variantId = variantId || DEFAULT_CHARACTER_VARIANT_ID;
  state.characterStudio.variantName = variantName;
  state.characterStudio.variantPrompt = isDefaultCharacterVariant(activeVariant) ? "" : activeVariant?.prompt || "";
  state.characters = [
    normalizeCharacter({ ...normalized, updatedAt: now }),
    ...state.characters.filter((item) => item.id !== normalized.id),
  ].filter(Boolean).slice(0, 300);

  state.archives[imageId] = normalizeArchive({
    ...existingArchive,
    imageId,
    title: state.activeProject,
    category: existingArchive.category || "character-profile",
    note: existingArchive.note || [normalized.name, variantName, "参考图"].filter(Boolean).join(" · "),
    characterId: normalized.id,
    characterName: normalized.name,
    characters: existingArchive.characters?.length ? existingArchive.characters : [normalized.name],
    variantId,
    variantName,
    url,
    updatedAt: now,
    createdAt: existingArchive.createdAt || now,
  });

  if (mode === "detail") {
    state.characterStudio.detailReferenceImageId = imageId;
    state.characterStudio.templateId = "custom-detail";
    state.characterStudio.detailTarget = state.characterStudio.detailTarget || "参考第二张图中的服装、配饰、纹样、材质和颜色细节";
  } else {
    state.characterStudio.referenceImageId = imageId;
    if (getSelectedCharacterTemplate().referenceMode === "none" || options.jump) {
      state.characterStudio.templateId = "custom-detail";
    }
  }
  state.characterStudio.count = 1;
  state.characterStudioStatus = {
    type: "success",
    text: mode === "detail"
      ? `已把这张图设为 ${normalized.name} · ${getCharacterVariantLabel(activeVariant)} 的服装/细节参考图。`
      : `已把这张图设为 ${normalized.name} · ${getCharacterVariantLabel(activeVariant)} 的主参考图。`,
  };

  writeManjuCharacterCards();
  writeManjuArchives();
  if (options.jump) {
    setWorkspace("characters");
  }
  renderAll();
}

function getArchiveUsage(imageId) {
  const targetId = String(imageId || "").trim();
  if (!targetId) {
    return [];
  }

  const usages = [];
  getActiveCharacters().forEach((card) => {
    getCharacterVariants(card).forEach((variant) => {
      usages.push(...collectCharacterAssetUsages(card, targetId, variant));
    });
  });

  if (state.characterStudio.referenceImageId === targetId) {
    usages.push({
      type: "studio-reference",
      characterName: "角色生图区",
      slotLabel: "主参考图",
    });
  }

  if (state.characterStudio.detailReferenceImageId === targetId) {
    usages.push({
      type: "studio-reference",
      characterName: "角色生图区",
      slotLabel: "服装/细节参考图",
    });
  }

  const archive = state.archives[targetId];
  if (archive?.category === "shot-final") {
    usages.push({
      type: "shot-final",
      characterName: archive.shotNo || "分镜",
      slotLabel: "定稿图",
    });
  }

  return usages;
}

function formatArchiveUsageLabel(item) {
  return [
    item.characterName,
    item.variantName && item.variantName !== "原身" ? item.variantName : "",
    item.slotLabel,
  ].filter(Boolean).join(" · ");
}

function removeImageFromCharacterAssets(assets, imageId) {
  const targetId = String(imageId || "").trim();
  const next = normalizeCharacterAssets(assets);
  CHARACTER_ASSET_SLOTS.forEach((slot) => {
    if (next[slot.field] === targetId) {
      next[slot.field] = "";
    }
  });
  ["baseImages", "viewImages", "detailImages"].forEach((key) => {
    next[key] = (next[key] || []).filter((id) => id !== targetId);
  });
  return normalizeCharacterAssets(next);
}

function detachImageFromCharacter(card, imageId, now = new Date().toISOString()) {
  const normalized = normalizeCharacter(card);
  if (!normalized) {
    return null;
  }
  const variants = Array.isArray(normalized.variants)
    ? normalized.variants.map((variant) => normalizeCharacterVariant({
      ...variant,
      assets: removeImageFromCharacterAssets(variant.assets, imageId),
      updatedAt: now,
    })).filter(Boolean)
    : [];
  return normalizeCharacter({
    ...normalized,
    assets: removeImageFromCharacterAssets(normalized.assets, imageId),
    variants,
    updatedAt: now,
  });
}

function detachAssetUsages(imageId, options = {}) {
  const targetId = String(imageId || "").trim();
  const usage = getArchiveUsage(targetId);
  if (!targetId || usage.length === 0) {
    return;
  }
  if (!window.confirm("这张图已经被选用。解除选用关系后，它会保留在图集中，但不再作为角色插槽、参考图或分镜定稿使用。继续吗？")) {
    return;
  }

  const now = new Date().toISOString();
  state.characters = state.characters.map((card) => detachImageFromCharacter(card, targetId, now)).filter(Boolean);

  if (state.characterStudio.referenceImageId === targetId) {
    state.characterStudio.referenceImageId = "";
  }
  if (state.characterStudio.detailReferenceImageId === targetId) {
    state.characterStudio.detailReferenceImageId = "";
  }

  if (state.archives[targetId]?.category === "shot-final") {
    state.archives[targetId] = normalizeArchive({
      ...state.archives[targetId],
      category: "shot-candidate",
      updatedAt: now,
    });
  }

  writeManjuCharacterCards();
  writeManjuArchives();
  state.characterAssetStatus = { type: "success", text: "已解除这张图的选用关系，现在可以移出图集或删除源图。" };
  options.close?.();
  renderAll();
}

function removeAssetFromArchive(imageId, options = {}) {
  const targetId = String(imageId || "").trim();
  if (!targetId || !state.archives[targetId]) {
    return;
  }
  const usage = getArchiveUsage(targetId);
  if (usage.length) {
    window.alert("这张图正在被角色插槽、参考图或分镜定稿使用。请先解除选用关系，再移出图集。");
    return;
  }
  if (!window.confirm("仅从当前剧名的 B 版图集中移出这张图？源文件仍会保留在 outputs，不会影响 A 版历史图。")) {
    return;
  }

  delete state.archives[targetId];
  writeManjuArchives();
  state.characterAssetStatus = { type: "info", text: "已从本剧图集中移出，源图未删除。" };
  options.close?.();
  renderAll();
}

async function deleteArchiveSourceImage(imageId, options = {}) {
  const targetId = String(imageId || "").trim();
  if (!targetId) {
    return;
  }
  const usage = getArchiveUsage(targetId);
  if (usage.length) {
    window.alert("这张图正在被角色插槽、参考图或分镜定稿使用，已阻止删除源图。请先解除选用关系。");
    return;
  }
  if (!window.confirm("删除源图会从 outputs 中移除图片文件，并同步移出 B 版图集。确定删除吗？")) {
    return;
  }

  try {
    const result = await fetchJson("/api/images/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [targetId] }),
    }, 30000);
    if (!Array.isArray(result.deleted) || !result.deleted.includes(targetId)) {
      const failed = Array.isArray(result.failed) ? result.failed.find((item) => item.id === targetId) : null;
      throw new Error(failed?.error || "删除接口没有确认删除这张图。");
    }
    delete state.archives[targetId];
    writeManjuArchives();
    await loadRecentImages(true);
    state.characterAssetStatus = { type: "success", text: "已安全删除源图，并从 B 版图集中移除。" };
    options.close?.();
    renderAll();
  } catch (error) {
    state.characterAssetStatus = { type: "error", text: normalizeFrontendError(error, "删除源图失败。") };
    renderAll();
  }
}

function findCharacterForAsset(image) {
  const archive = image?.archive || {};
  const characterId = String(archive.characterId || "").trim();
  if (characterId) {
    const byId = state.characters.find((card) => card.id === characterId);
    if (byId) {
      return byId;
    }
  }
  const nameKey = normalizePromptMatchKey(archive.characterName || (Array.isArray(archive.characters) ? archive.characters[0] : ""));
  return state.characters.find((card) => normalizePromptMatchKey(card.name) === nameKey) || null;
}

function createWorkspaceStatus(status, extraClassName = "") {
  const fragment = document.createDocumentFragment();
  if (!status?.text) {
    return fragment;
  }
  const item = document.createElement("p");
  item.className = `script-status ${status.type || "info"}${extraClassName ? ` ${extraClassName}` : ""}`;
  item.textContent = status.text;
  fragment.append(item);
  return fragment;
}

function createEmptyNote(text) {
  const item = document.createElement("p");
  item.className = "empty-note";
  item.textContent = text;
  return item;
}

function saveProjectPackFromForm({ title, stylePack, scenePack, characterPack }) {
  const nextTitle = normalizeTitle(title);
  if (!nextTitle) {
    state.projectStatus = { type: "error", text: "先填写剧名，再保存项目包。" };
    renderAll();
    return;
  }

  const previousTitle = state.activeProject;
  const previous = state.packs.find((pack) => pack.title === previousTitle) || {};
  const payload = normalizePack({
    ...previous,
    id: previous.id || makeEntityId("pack", nextTitle),
    title: nextTitle,
    stylePack,
    scenePack,
    characterPack,
    updatedAt: new Date().toISOString(),
  });

  state.packs = [
    payload,
    ...state.packs.filter((pack) => pack.id !== payload.id && pack.title !== payload.title),
  ].filter(Boolean).slice(0, 80);
  if (previousTitle !== payload.title) {
    migrateProjectTitle(previousTitle, payload.title);
  } else {
    writeManjuPacks();
  }
  state.activeProject = payload.title;
  localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, payload.title);
  state.projectStatus = { type: "success", text: `已保存《${payload.title}》项目包。` };
  renderProjectOptions();
  renderAll();
}

function saveCharacterFromForm({ id, name, role, prompt }) {
  const cleanName = String(name || "").trim();
  const cleanPrompt = String(prompt || "").trim();
  if (!cleanName || !cleanPrompt) {
    state.characterStatus = { type: "error", text: "角色名和人设提示词卡都要填写。" };
    renderAll();
    return;
  }

  const existing = state.characters.find((card) => card.id === id)
    || state.characters.find((card) => card.title === state.activeProject && card.name === cleanName)
    || {};
  const payload = normalizeCharacter({
    ...existing,
    id: existing.id || makeEntityId("character", `${state.activeProject}-${cleanName}`),
    title: state.activeProject,
    name: cleanName,
    role,
    prompt: cleanPrompt,
    updatedAt: new Date().toISOString(),
  });

  state.characters = [
    payload,
    ...state.characters.filter((card) => card.id !== payload.id),
  ].filter(Boolean).slice(0, 300);
  state.selectedCharacterId = payload.id;
  writeManjuCharacterCards();
  state.characterStatus = { type: "success", text: `已保存人设资料卡：${payload.name}。` };
  renderAll();
}

function appendCharacterToProjectPack(card) {
  const line = formatCharacterPromptLine(card);
  if (!line) {
    state.characterStatus = { type: "error", text: "先填写角色名和人设提示词卡。" };
    renderAll();
    return;
  }

  const pack = getActivePack() || {
    id: makeEntityId("pack", state.activeProject),
    title: state.activeProject,
  };
  const nextCharacterPack = mergeTextBlocks(pack.characterPack || "", [line]);
  const payload = normalizePack({
    ...pack,
    title: state.activeProject,
    characterPack: nextCharacterPack,
    updatedAt: new Date().toISOString(),
  });
  state.packs = [
    payload,
    ...state.packs.filter((item) => item.id !== payload.id && item.title !== payload.title),
  ].filter(Boolean).slice(0, 80);
  writeManjuPacks();
  state.characterStatus = { type: "success", text: "已写入项目人设提示词包。" };
  renderAll();
}

function deleteCharacterCard(card) {
  if (!card) {
    return;
  }
  if (!window.confirm(`删除《${state.activeProject}》的人设资料卡“${card.name || "未命名"}”？`)) {
    return;
  }
  state.characters = state.characters.filter((item) => item.id !== card.id);
  state.selectedCharacterId = "";
  writeManjuCharacterCards();
  state.characterStatus = { type: "info", text: "人设资料卡已删除。" };
  renderAll();
}

function saveScenePackFromForm(scene, scenePack) {
  const pack = getActivePack() || {
    id: makeEntityId("pack", state.activeProject),
    title: state.activeProject,
  };
  upsertScenePack({
    ...pack,
    title: state.activeProject,
    scene: String(scene || "").trim(),
    scenePack: String(scenePack || "").trim(),
    updatedAt: new Date().toISOString(),
  });
  state.sceneStatus = { type: "success", text: "场景提示词包已保存到当前项目。" };
  renderAll();
}

function upsertScenePack(pack) {
  const payload = normalizePack({
    ...pack,
    title: state.activeProject,
    updatedAt: pack.updatedAt || new Date().toISOString(),
  });
  if (!payload) {
    return;
  }
  state.packs = [
    payload,
    ...state.packs.filter((item) => item.id !== payload.id && item.title !== payload.title),
  ].filter(Boolean).slice(0, 80);
  writeManjuPacks();
}

async function exportActiveProjectArchive(button) {
  const archives = getActiveArchives();
  if (!archives.length) {
    state.exportStatus = { type: "error", text: "当前剧名还没有可导出的归档图片。" };
    renderAll();
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "导出中";
  try {
    const pack = {
      ...(getActivePack() || {}),
      title: state.activeProject,
      characters: getActiveCharacters(),
    };
    const result = await fetchJson("/api/manju/archive/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: state.activeProject,
        pack,
        archives,
      }),
    }, 30000);
    const skippedCount = Array.isArray(result.skipped) ? result.skipped.length : Number(result.skipped || 0);
    state.exportStatus = {
      type: skippedCount > 0 ? "error" : "success",
      text: `已导出 ${result.copied || 0} 张，跳过 ${skippedCount} 张。目录：${result.exportDir}`,
    };
  } catch (error) {
    state.exportStatus = { type: "error", text: normalizeFrontendError(error, "导出漫剧图集失败。") };
  } finally {
    button.disabled = false;
    button.textContent = originalText;
    renderAll();
  }
}

function setWorkspace(key) {
  state.activeWorkspace = workspaceData[key] ? key : "overview";
  renderWorkspace();
}

function getProjectTitles() {
  const titles = [
    localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY),
    ...state.packs.map((item) => item.title),
    ...state.scriptPacks.map((item) => item.title),
    ...Object.values(state.archives).map((item) => item.title),
    DEFAULT_PROJECT_TITLE,
  ].map(normalizeTitle).filter(Boolean);
  return Array.from(new Set(titles));
}

function pickActiveProject() {
  const saved = normalizeTitle(localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY));
  const titles = getProjectTitles();
  if (saved && titles.includes(saved)) {
    return saved;
  }
  return titles.find((title) => title !== DEFAULT_PROJECT_TITLE) || DEFAULT_PROJECT_TITLE;
}

function getActivePack() {
  return state.packs.find((pack) => pack.title === state.activeProject);
}

function getActiveArchives() {
  return Object.values(state.archives).filter((item) => item.title === state.activeProject);
}

function getActiveScriptPack() {
  return state.scriptPacks.find((pack) => pack.title === state.activeProject);
}

function getActiveScriptShots() {
  return flattenScriptShots(getActiveScriptPack());
}

function getActiveCharacters() {
  const activeTitle = normalizeTitle(state.activeProject);
  return state.characters.filter((card) => normalizeTitle(card.title) === activeTitle);
}

function compileActiveCharacterPack() {
  return getActiveCharacters()
    .map(formatCharacterPromptLine)
    .filter(Boolean)
    .join("\n");
}

function getActiveScriptScenes() {
  const pack = getActiveScriptPack();
  if (!pack?.episodes?.length) {
    return [];
  }
  const scenes = [];
  pack.episodes.forEach((episode) => {
    episode.scenes.forEach((scene) => {
      scenes.push({
        episodeNo: episode.episodeNo,
        episodeTitle: episode.title,
        sceneNo: scene.sceneNo,
        title: scene.title,
        location: scene.location,
        summary: scene.summary,
        shotCount: Array.isArray(scene.shots) ? scene.shots.length : 0,
      });
    });
  });
  return scenes.filter((scene) => scene.shotCount > 0);
}

function formatSceneSummaryLine(scene) {
  if (!scene) {
    return "";
  }
  const name = scene.location || scene.title || `场景 ${scene.sceneNo || ""}`.trim();
  const summary = scene.summary || scene.title || "固定空间、光线、道具和镜头关系待补。";
  const episode = scene.episodeNo ? `第${scene.episodeNo}集` : "当前剧集";
  const shotCount = scene.shotCount ? `${scene.shotCount} 镜` : "待补镜头";
  return `${name}：${episode} / 场景${scene.sceneNo || "-"} / ${shotCount}。${clipClientText(summary, 120)}`;
}

function mergeTextBlocks(current, blocks = []) {
  const lines = [
    ...String(current || "").split(/\r?\n/),
    ...blocks.flatMap((block) => String(block || "").split(/\r?\n/)),
  ].map((line) => line.trim()).filter(Boolean);
  const seen = new Set();
  return lines.filter((line) => {
    const key = line.replace(/\s+/g, " ");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).join("\n");
}

function formatCharacterPromptLine(card) {
  const name = String(card?.name || "").trim();
  const role = String(card?.role || "").trim();
  const prompt = String(card?.prompt || "").trim();
  if (!name || !prompt) {
    return "";
  }
  return `${name}：${[role, prompt].filter(Boolean).join("，")}`;
}

function summarizeActiveScriptPack() {
  const pack = getActiveScriptPack();
  const shots = flattenScriptShots(pack);
  if (!pack || shots.length === 0) {
    return "尚未导入剧本分镜包。可导入 JSON 包，或用辅助 API 将纯剧本拆成分镜表。";
  }
  const sample = shots
    .slice(0, 3)
    .map((shot) => `${shot.shotNo} ${shot.visual || shot.action || shot.sceneTitle || "待补画面"}`)
    .join(" / ");
  return `${pack.title}：${shots.length} 条分镜。${sample}`;
}

function summarizeCharacters() {
  const characters = getActiveCharacters();
  if (!characters.length) {
    return "尚未保存人设提示词包。";
  }
  return characters
    .slice(0, 4)
    .map((item) => `${item.name || "未命名角色"}：${item.prompt || item.role || "待补提示词"}`)
    .join(" / ");
}

function readList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : Object.values(parsed || {});
  } catch {
    return [];
  }
}

function readArchives() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MANJU_ARCHIVES_STORAGE_KEY) || "{}");
    const records = Array.isArray(parsed)
      ? parsed
      : Object.entries(parsed || {}).map(([imageId, item]) => ({ ...item, imageId: item?.imageId || imageId }));
    return records.reduce((acc, item) => {
      const record = normalizeArchive(item);
      if (record) {
        acc[record.imageId] = record;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function normalizePack(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const now = new Date().toISOString();
  const title = normalizeTitle(item.title);
  if (!title) {
    return null;
  }
  return {
    id: String(item.id || title),
    title,
    scene: String(item.scene || "").trim(),
    stylePack: String(item.stylePack || "").trim(),
    scenePack: String(item.scenePack || "").trim(),
    scenes: normalizeSceneCards(item.scenes),
    characterPack: String(item.characterPack || "").trim(),
    createdAt: String(item.createdAt || now),
    updatedAt: String(item.updatedAt || item.createdAt || now),
  };
}

function normalizeSceneCards(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  const now = new Date().toISOString();
  return items.map((item) => {
    if (!item || typeof item !== "object") {
      return null;
    }
    const name = String(item.name || item.title || item.location || "").trim().slice(0, 120);
    const prompt = String(item.prompt || item.scenePrompt || item.description || "").trim().slice(0, 4000);
    if (!name && !prompt) {
      return null;
    }
    return {
      id: String(item.id || makeEntityId("scene", `${name}-${prompt.slice(0, 24)}`)),
      name: name || "未命名场景",
      prompt,
      imageId: String(item.imageId || "").trim(),
      imageUrl: String(item.imageUrl || item.url || "").trim(),
      tags: splitNameList(Array.isArray(item.tags) ? item.tags.join("、") : item.tags).slice(0, 12),
      createdAt: String(item.createdAt || now),
      updatedAt: String(item.updatedAt || item.createdAt || now),
    };
  }).filter(Boolean).slice(0, 200);
}

function normalizeScriptPack(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const now = new Date().toISOString();
  const title = normalizeTitle(item.title) || DEFAULT_PROJECT_TITLE;
  const episodes = normalizeScriptEpisodes(item.episodes, item.shots);
  return {
    type: "yaotu-manju-script-pack",
    version: Number.parseInt(item.version, 10) || 1,
    id: String(item.id || `script-${title}`).trim() || `script-${Date.now()}`,
    title,
    source: String(item.source || "yaotu-script-import").trim().slice(0, 80),
    scriptText: normalizeScriptTextValue(item.scriptText || item.fullScript || item.originalScript || item.script),
    summary: String(item.summary || "").trim().slice(0, 2000),
    createdAt: String(item.createdAt || now),
    updatedAt: String(item.updatedAt || now),
    episodes,
  };
}

function normalizeScriptEpisodes(episodes, fallbackShots) {
  const sourceEpisodes = Array.isArray(episodes) && episodes.length
    ? episodes
    : [{
        episodeNo: 1,
        title: "第1集",
        scenes: [{
          sceneNo: 1,
          title: "未命名场景",
          location: "",
          summary: "",
          shots: Array.isArray(fallbackShots) ? fallbackShots : [],
        }],
      }];

  return sourceEpisodes.slice(0, 200).map((episode, episodeIndex) => {
    const episodeNo = clampNumber(episode?.episodeNo, 1, 999, episodeIndex + 1);
    return {
      episodeNo,
      title: String(episode?.title || `第${episodeNo}集`).trim().slice(0, 120),
      summary: String(episode?.summary || "").trim().slice(0, 2000),
      scenes: normalizeScriptScenes(episode?.scenes, episodeNo),
    };
  }).filter((episode) => episode.scenes.length > 0);
}

function normalizeScriptScenes(scenes, episodeNo) {
  const sourceScenes = Array.isArray(scenes) && scenes.length
    ? scenes
    : [{
        sceneNo: 1,
        title: "未命名场景",
        location: "",
        summary: "",
        shots: [],
      }];

  return sourceScenes.slice(0, 500).map((scene, sceneIndex) => {
    const sceneNo = clampNumber(scene?.sceneNo, 1, 999, sceneIndex + 1);
    const location = String(scene?.location || scene?.place || "").trim().slice(0, 160);
    return {
      sceneNo,
      title: String(scene?.title || location || `场景${sceneNo}`).trim().slice(0, 160),
      location,
      summary: String(scene?.summary || "").trim().slice(0, 2000),
      shots: normalizeScriptShots(scene?.shots, episodeNo, sceneNo),
    };
  }).filter((scene) => scene.shots.length > 0);
}

function normalizeScriptShots(shots, episodeNo, sceneNo) {
  if (!Array.isArray(shots)) {
    return [];
  }
  return shots.slice(0, 2000).map((shot, shotIndex) => {
    if (!shot || typeof shot !== "object") {
      return null;
    }
    const order = shotIndex + 1;
    const shotNo = String(shot.shotNo || shot.id || `${episodeNo}-${sceneNo}-${String(order).padStart(3, "0")}`).trim().slice(0, 80);
    const characters = Array.isArray(shot.characters)
      ? shot.characters
      : String(shot.characters || "").split(/[、,，/]/);
    return {
      shotNo,
      order,
      characters: characters.map((name) => String(name || "").trim()).filter(Boolean).slice(0, 12),
      characterBindings: normalizeShotCharacterBindings(shot.characterBindings, characters),
      visual: String(shot.visual || shot.image || shot.description || "").trim().slice(0, 2000),
      action: String(shot.action || "").trim().slice(0, 1000),
      emotion: String(shot.emotion || shot.mood || "").trim().slice(0, 500),
      camera: String(shot.camera || shot.framing || "").trim().slice(0, 500),
      dialogueRef: String(shot.dialogueRef || shot.dialogue || "").trim().slice(0, 1000),
      promptSeed: String(shot.promptSeed || shot.prompt || "").trim().slice(0, 2000),
      notes: String(shot.notes || "").trim().slice(0, 1000),
    };
  }).filter((shot) => shot && (shot.visual || shot.action || shot.promptSeed || shot.dialogueRef));
}

function flattenScriptShots(pack) {
  if (!pack?.episodes?.length) {
    return [];
  }
  const rows = [];
  pack.episodes.forEach((episode) => {
    episode.scenes.forEach((scene) => {
      scene.shots.forEach((shot) => {
        rows.push({
          ...shot,
          episodeNo: episode.episodeNo,
          episodeTitle: episode.title,
          sceneNo: scene.sceneNo,
          sceneTitle: scene.title,
          location: scene.location,
          sceneSummary: scene.summary,
        });
      });
    });
  });
  return rows;
}

function upsertScriptPack(pack) {
  const normalized = normalizeScriptPack({
    ...pack,
    updatedAt: new Date().toISOString(),
  });
  if (!normalized) {
    return;
  }
  state.scriptPacks = [
    normalized,
    ...state.scriptPacks.filter((item) => item.id !== normalized.id && item.title !== normalized.title),
  ].slice(0, 200);
  writeScriptPacks();
}

function writeScriptPacks() {
  localStorage.setItem(MANJU_SCRIPT_PACKS_STORAGE_KEY, JSON.stringify(state.scriptPacks));
}

function writeManjuPacks() {
  const packs = state.packs
    .map(normalizePack)
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 80);
  state.packs = packs;
  localStorage.setItem(MANJU_PACKS_STORAGE_KEY, JSON.stringify(packs));
}

function writeManjuCharacterCards() {
  const cards = state.characters
    .map(normalizeCharacter)
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 300);
  state.characters = cards;
  localStorage.setItem(MANJU_CHARACTER_CARDS_STORAGE_KEY, JSON.stringify(cards));
}

function writeManjuArchives() {
  const entries = Object.values(state.archives || {})
    .map(normalizeArchive)
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 2000);
  state.archives = entries.reduce((acc, item) => {
    acc[item.imageId] = item;
    return acc;
  }, {});
  localStorage.setItem(MANJU_ARCHIVES_STORAGE_KEY, JSON.stringify(state.archives));
}

function migrateProjectTitle(oldTitle, newTitle) {
  const from = normalizeTitle(oldTitle);
  const to = normalizeTitle(newTitle);
  if (!from || !to || from === to) {
    writeManjuPacks();
    return;
  }
  const now = new Date().toISOString();
  const shouldMove = (title) => normalizeTitle(title) === from || (!normalizeTitle(title) && from === DEFAULT_PROJECT_TITLE);
  state.characters = state.characters.map((card) => shouldMove(card.title)
    ? normalizeCharacter({ ...card, title: to, updatedAt: now })
    : card).filter(Boolean);
  state.scriptPacks = state.scriptPacks.map((pack) => shouldMove(pack.title)
    ? normalizeScriptPack({ ...pack, title: to, updatedAt: now })
    : pack).filter(Boolean);
  state.archives = Object.values(state.archives || {}).reduce((acc, archive) => {
    const next = shouldMove(archive.title)
      ? normalizeArchive({ ...archive, title: to, updatedAt: now })
      : normalizeArchive(archive);
    if (next) {
      acc[next.imageId] = next;
    }
    return acc;
  }, {});
  writeManjuPacks();
  writeManjuCharacterCards();
  writeScriptPacks();
  writeManjuArchives();
}

function normalizeCharacter(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const now = new Date().toISOString();
  const variants = Array.isArray(item.variants)
    ? item.variants.map(normalizeCharacterVariant).filter(Boolean).slice(0, 40)
    : [];
  return {
    id: String(item.id || item.name || globalThis.crypto?.randomUUID?.() || Date.now()),
    title: normalizeTitle(item.title),
    name: String(item.name || "").trim(),
    role: String(item.role || "").trim(),
    prompt: String(item.prompt || "").trim(),
    assets: normalizeCharacterAssets(item.assets),
    variants,
    createdAt: String(item.createdAt || now),
    updatedAt: String(item.updatedAt || item.createdAt || now),
  };
}

function normalizeCharacterVariant(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const name = String(item.name || "").trim().slice(0, 80);
  const prompt = String(item.prompt || "").trim().slice(0, 4000);
  if (!name || !prompt) {
    return null;
  }
  const now = new Date().toISOString();
  return {
    id: String(item.id || makeEntityId("variant", name)),
    name,
    prompt,
    assets: normalizeCharacterAssets(item.assets),
    referenceImageId: String(item.referenceImageId || "").trim(),
    createdAt: String(item.createdAt || now),
    updatedAt: String(item.updatedAt || item.createdAt || now),
  };
}

function normalizeArchive(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const imageId = String(item.imageId || "").trim();
  if (!imageId) {
    return null;
  }
  const characters = Array.isArray(item.characters)
    ? item.characters.map((name) => String(name || "").trim()).filter(Boolean).slice(0, 12)
    : [];
  return {
    imageId,
    title: normalizeTitle(item.title) || DEFAULT_PROJECT_TITLE,
    category: categoryLabels[item.category] ? item.category : "shot-candidate",
    note: String(item.note || "").trim(),
    shotNo: String(item.shotNo || "").trim(),
    scene: String(item.scene || "").trim(),
    queueId: String(item.queueId || "").trim(),
    characterId: String(item.characterId || "").trim(),
    characterName: String(item.characterName || "").trim(),
    characters,
    variantId: String(item.variantId || "").trim(),
    variantName: String(item.variantName || "").trim(),
    url: String(item.url || "").trim(),
    batchId: String(item.batchId || "").trim(),
    createdAt: String(item.createdAt || "").trim(),
    updatedAt: String(item.updatedAt || "").trim(),
  };
}

function makeEntityId(prefix, value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "item";
  const random = globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10);
  return `${prefix}-${slug}-${Date.now().toString(36)}-${random}`;
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
  if (response.status === 405) {
    return "本地服务还没有加载对应接口。请重启妖荼本地服务或桌面端后再试。";
  }
  if (/524|timeout occurred|origin web server timed out|cloudflare|cf-error|host\s*error/i.test(raw)) {
    if (/辅助 API|文本模型|拆分镜/i.test(raw)) {
      return raw;
    }
    return "上游 API 中转服务超时（Cloudflare 524）。建议先缩短提示词、降低尺寸/质量、一次生成 1 张，稍后重试或切换 API 配置。";
  }
  if (/auth_unavailable|no auth available/i.test(raw)) {
    return `当前 API 配置没有这个模型的可用授权。请在设置里切换到已授权的生图配置或模型。\n原始错误：${raw}`;
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

function normalizeScriptTextValue(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, 120000);
}

function normalizeTitle(value) {
  return String(value || "").trim().slice(0, 80);
}

function clampNumber(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(new Error("文件读取失败。")));
    reader.readAsText(file, "utf-8");
  });
}

function formatDateTime(value) {
  if (!value) {
    return "待生成";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16);
  }
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sanitizeDownloadName(value) {
  return String(value || "manju")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "manju";
}
