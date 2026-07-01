// 从旧版 public/app.js 原样搬运的预设数据（用途 / 风格 / 提示词词库）。
export interface Preset {
  label: string
  guidance: string[]
  requirements?: string[]
}
export interface LexiconItem { label: string; text: string }
export interface LexiconGroup { id: string; label: string; items: LexiconItem[] }

export const purposePresets: Record<string, Preset> = {
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
}

export const builtInStylePresets: Record<string, Preset> = {
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
}

export const promptLexiconGroups: LexiconGroup[] = [
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
]
