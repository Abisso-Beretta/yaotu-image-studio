// 提示词构建器 —— 桌面（server.js）与手机引擎（app/src/mobile/engine.ts）双端共用的纯逻辑。
//
// 为什么要抽出来：优化提示词 / 样图分析用到的这批「纯构建器」（拼 system+user 文案、按模式选
// max_tokens、归一化模式与目标画幅、从模型响应里抽文本）以前只活在 server.js 里；M3 起手机引擎也要
// 复刻同一套语义。为避免两份实现漂移，把它们原样搬到这里做单一事实源：
//   - server.js 顶部 require 本模块并删掉原定义，逐字节保持对外行为不变（analysisPrompts /
//     promptOptimization 两套测试是安全网）；
//   - 手机引擎经 EngineDeps.promptBuilders 注入本模块的真货（mobileApi.ts 注入，测试也直接 require）。
//
// 铁律：这里只放「纯函数」——不碰 fs / 设置读写 / 网络 / 全局配置。任何带副作用的东西（requestAuxiliaryChat、
// getAuxiliaryApiConfig、prepareAnalysisImages 等）都留在各端自己那边。
//
// CJS 而非 ESM：server.js 是零框架 CommonJS，直接 require 最省事；app 端经 vite alias + 手写
// shared/promptBuilders.d.ts 拿到类型（见该 d.ts 与 app/vite.config.ts、app/tsconfig.json 的 @shared 映射）。

// 允许的优化模式集合。normalizePromptOptimizeMode 用它兜底非法值。
const ALLOWED_PROMPT_OPTIMIZE_MODES = new Set(["conservative", "quality", "continuity"]);

// 本模块私有的 httpError：normalizeAnalysisMode 校验失败时要抛出与 server.js 同形状的错误
//（带 statusCode / publicMessage，供上层 HTTP 处理读取）。刻意在此保留一份 5 行副本，而不是把 server.js
// 里被 87 处引用的 httpError 整体搬来——那会把一个 HTTP 层辅助函数塞进「提示词构建器」模块、且大幅扩大
//「对外行为零变化」的风险面。行为逐字节一致，仅作用域收窄，属有意取舍。
function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
}

function normalizePromptOptimizeMode(value) {
  const mode = String(value || "conservative").trim().toLowerCase();
  return ALLOWED_PROMPT_OPTIMIZE_MODES.has(mode) ? mode : "conservative";
}

function buildPromptOptimizationPrompt({
  prompt,
  negativePrompt,
  mode,
  targetSize,
  purpose,
  styleSelected = false,
  styleName = "",
}) {
  const modeInstruction = {
    conservative: [
      "保守优化：当原文已经是具体画面时，只整理结构、语序、歧义，并做必要的内容补全。",
      "不要改变主体、角色身份、场景、动作、镜头意图或叙事重点，扩写幅度控制在直接可生成所需的范围内。",
      "当原文只有情绪、意象、比喻或生活感受时，仍必须将它具象化为一幅明确画面；保守不等于保留空泛表达。",
    ],
    quality: [
      "完整扩写：在不改变核心创意的前提下，完整补足内容层的主体、动作、环境、空间关系、构图、真实场景光源、天气时间、关键物体与情绪线索。",
      "每个新增细节只能给出一个明确值，形成一幅可直接提交给图像生成模型的单一画面。",
      "完整不等于堆砌画风词、渲染词、质量词，也不等于擅自增加角色身份或世界观设定。",
    ],
    continuity: [
      "连续性优先：锁定原文已经给出的角色特征、服装、道具、场景结构、真实光源、视点、景别和空间关系。",
      "只能消除歧义并补足维持前后帧一致性所必需的内容，不得扩展新身份、新服装、新道具、新场景设定或新风格。",
      "若原文偏抽象，使用最少的新增假设把它落成单一画面，不要提供多个连续性方案。",
    ],
  }[mode] || [];

  const styleInstruction = styleSelected
    ? [
      `应用中已另行选择独立风格${styleName ? `（名称仅作状态标识：${styleName}）` : ""}；该独立风格拥有最高风格优先级。`,
      "风格名称只是元数据。不要解释、复述、扩写或根据名称猜测风格内容，也不要把名称写进优化结果。",
      "把本次结果严格限制在 CONTENT layer。若原文含有会竞争、覆盖或重复独立风格的画风词，删除这些画风词，只保留可分离的题材和画面内容。",
      "禁止新增或复述任何媒介、画法、艺术流派、艺术家模仿、摄影类型、镜头型号、胶片、渲染方式、线稿/笔触/上色技术、全局调色、风格化照明或质量套话。",
      "禁止加入 photorealistic、realistic、cinematic、anime、manga、3D、CGI、illustration、concept art、watercolor、oil painting、film look、masterpiece、best quality、8k、ultra detailed、high quality render 等视觉路线或近义词。",
    ]
    : [
      "应用中没有另行选择独立风格。",
      "若原文明确给出一种画风或媒介，保留该单一路线，但不要扩展出第二种视觉路线，也不要堆叠近义风格词。",
      "若原文没有明确画风，保持风格层开放；不得自行决定摄影、写实、动漫、3D、插画、水彩、厚涂、概念艺术、电影感、胶片感或其他媒介/渲染路线。",
      "不要凭空加入 masterpiece、best quality、8k、ultra detailed、high quality render 等泛化质量套话。",
    ];

  return [
    "请把下面的输入优化为图像生成用的内容提示词。你的职责是整理和扩写 WHAT IS DEPICTED，而不是另选或重写 HOW IT IS RENDERED。",
    "必须使用中文输出；只允许保留必要的中性视点、景别、构图和空间术语。",
    "不要解释优化思路，不要输出 Markdown 表格。",
    "不要调用或暗示任何生图接口。",
    "",
    ...modeInstruction,
    "",
    ...styleInstruction,
    "",
    "内容层可以补足：焦点主体、已知身份与外观、动作、表情、环境、前中后景、相对位置、主体占比、视点、景别、构图、景深层级、真实场景光源、天气、时间、关键物体的颜色与物理材质、以及可见的情绪线索。",
    "场景光源必须是画面世界中真实存在或自然发生的光，例如窗灯、路灯、烛光、日落或阴天漫射光；不得把它改写成 cinematic lighting、studio lighting 等风格标签。",
    "只使用中性的画面组织描述，不使用镜头品牌、焦段数字、胶片型号、摄影流派或渲染管线来制造所谓专业感。",
    "如果输入只有情绪、意象、比喻或主观感受，选择最贴合原意的一处具体场景，将其转译为一幅单一、明确、可构图的画面。",
    "主观描述的具象化必须补足焦点、动作、环境、前中后景、空间关系、真实光源、天气或时间、关键物体与情绪线索，但不得使用‘或’‘可选’‘可以是’‘A/B’等分支表达。",
    "用户没有指定人物身份时，不要随意固定性别、精确年龄、种族、发色、瞳色或复杂服装；优先使用背影、剪影或最低限度的身份信息。",
    analysisTargetCanvasInstruction(targetSize),
    purpose
      ? `当前用途为“${purpose}”。用途只影响内容组织、主体占比、信息层级和留白，不得据此决定或添加视觉风格。`
      : "当前用途未指定；不要自行推断用途对应的视觉风格。",
    "原始反向提示词中的明确排除项应优先保留；只可补充与正向画面直接相关的生成瑕疵，不得套用无关的通用反向词清单。",
    "如果原始反向提示词为空，且没有必须说明的生成瑕疵，反向提示词直接输出‘无’；不得为了填满该字段而发明排除项。",
    "不要把正向画面事实机械改写成‘无白天’‘无晴天’‘无人群’‘无室内’等冗余反向词；只有用户明确排除某项内容时才可写入。",
    "不得凭空加入性别、年龄、种族、发色、瞳色、服装、题材、道德判断或审美路线的排除项。",
    "输出前静默自检：正向和反向之间不得出现身份、属性、颜色、物件、光线、构图、方向、景别或裁切冲突；每个可变属性只能有一个明确值。",
    "",
    "输出格式必须严格为：",
    "优化后提示词：...",
    "反向提示词：...",
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

function buildAnalysisPrompt(mode, targetSize) {
  if (mode === "style") {
    return buildStyleExtractionPrompt();
  }
  if (mode === "keywords") {
    return buildKeywordExtractionPrompt();
  }
  if (mode === "scene") {
    return buildSceneExtractionPrompt();
  }
  return buildPromptExtractionPrompt(targetSize);
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

function normalizeAnalysisTargetSize(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "auto") {
    return text;
  }
  const match = text.match(/^(\d{2,5})x(\d{2,5})$/);
  if (!match) {
    return "";
  }
  return `${Number(match[1])}x${Number(match[2])}`;
}

function analysisTargetCanvasInstruction(value) {
  const size = normalizeAnalysisTargetSize(value);
  if (!size || size === "auto") {
    return "The target canvas is not fixed. Avoid hard-coding portrait/landscape orientation or an aspect ratio unless it is essential to the depicted content.";
  }
  const [width, height] = size.split("x").map(Number);
  const orientation = width > height ? "landscape" : width < height ? "portrait" : "square";
  return `The requested output canvas is ${size} (${orientation}). Adapt the framing and spatial layout to that canvas; do not mechanically copy a conflicting source-image orientation or aspect ratio.`;
}

function buildPromptExtractionPrompt(targetSize) {
  return [
    "Analyze this image and produce a reusable CONTENT prompt that can be combined with a separately selected style package.",
    "Write in Chinese, but keep useful art-direction keywords in English when they are clearer.",
    "Describe only what should be depicted: subject identity and mutable appearance, expression, pose/action, clothing, props, environment, important object colors, spatial relationships, and camera/framing when useful.",
    "Keep content-dependent lighting or atmosphere only when it belongs to the scene itself, such as sunset backlight, candlelight, fog, or rain.",
    "Do NOT output transferable style DNA: medium, art movement, artist imitation, genre/rendering labels, linework method, brushwork, shading/rendering technique, texture treatment, or generic quality boosters such as masterpiece, best quality, 8k, ultra detailed, polished render.",
    analysisTargetCanvasInstruction(targetSize),
    "Before answering, silently run a consistency check. Give each mutable attribute exactly one unambiguous value; do not describe the same eyes, hair, clothing, lighting, color, pose, or camera in conflicting ways.",
    "The negative prompt may list only unwanted artifacts or genuinely excluded content. It must not negate a positive subject attribute, required object, target orientation, framing, crop, lighting, or color.",
    "When the positive prompt uses close-up, tight, bust, half-body, or other intentional partial-body framing, do not add generic crop bans such as cropped head, out of frame, or cropped body to the negative prompt. State the intended visible boundaries positively instead.",
    "Do not add facts that are uncertain or hidden in the image. Prefer omission over invention.",
    "Use Chinese plus established English prompt terms only; do not emit stray characters from unrelated writing systems.",
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
    "Style means HOW an image is made, never WHO or WHAT happens to appear in the references. Repetition across the references does not turn repeated character content into style.",
    "Never include subject identity or anatomy: age, gender, ethnicity, species, face shape, body shape, skin color, hair color/style, eye color, facial features, expression, or pose.",
    "Never include concrete clothing, accessories, jewelry, props, architecture, plants, scene objects, story elements, text, logos, or named character motifs.",
    "Never include a concrete canvas orientation, aspect ratio, shot scale, portrait/bust/full-body framing, camera angle, subject placement, or subject occupancy copied from the references.",
    "Focus only on transferable visual language: medium, mark-making, line/edge behavior, rendering method, lighting behavior, color organization, surface-rendering behavior, detail hierarchy, abstract spatial rhythm, and atmosphere.",
    "Describe color as a system (temperature balance, saturation, contrast, value structure, accent strategy). Do not bind a color to hair, eyes, skin, clothing, or a specific object. Mention a palette family only when it is clearly independent of the subjects.",
    "Describe materials as rendering behavior (for example, how translucent, matte, rough, or reflective surfaces are treated), not as a required inventory such as lace, gemstones, feathers, leather, or metal ornaments.",
    "Describe composition only through transferable abstract rhythm such as focal hierarchy, density contrast, depth layering, negative space, and visual flow.",
    "Apply a strict transfer test to every phrase: if it stops making sense when the new subject is a robot, an elderly person, an animal, or a landscape, delete it.",
    "If a trait cannot be confidently separated from the repeated subject or appears as incidental content, omit it rather than guessing.",
    "Style negatives may reject incompatible rendering approaches only. They must not reject anatomy, subjects, objects, clothing complexity, palette content, framing, crop, or scene elements.",
    "Write concise Chinese labels, but keep precise English art terms when useful.",
    "The style package must help a generator apply the look to a completely different subject.",
    "Do not add extra sections outside the required format.",
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

function normalizeAnalysisMode(value) {
  const mode = String(value || "prompt").trim().toLowerCase();
  if (!["prompt", "style", "keywords", "scene"].includes(mode)) {
    throw httpError(400, "Unsupported analysis mode.");
  }
  return mode;
}

module.exports = {
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
};
