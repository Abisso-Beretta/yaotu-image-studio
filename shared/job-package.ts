// ============================================================================
//  生图任务包 (Image Job Package) — 跨工具共享数据契约
//  v1.0
//
//  这是「副导演 / 牛马制作人」(Scriptwriter, niuma-producer) 与
//  「妖荼」出图工具之间的交接格式。两边照同一份实现。
//  已与 Scriptwriter 侧实现核对一致：
//    - 类型：  _软件开发/牛马制作人/src/types/jobPackage.ts
//    - 导出器：_软件开发/牛马制作人/src/lib/jobPackageExport.ts
//
//  两种形态，别混淆：
//   (1) 导入物（Scriptwriter → 出图工具）= 单个 JSON 文件
//       `<项目>/导出/生图任务包[-集号].json`，类型 = ImageJobPackage，【不含图片】。
//   (2) 出图工具自己的项目 = 一个文件夹（project.json + 图片文件），
//       类型 = ImageProject（在 ImageJobPackage 上加视觉/产出层），可压成 zip 给小伙伴。
//
//  铁律：图片永远是独立文件，绝不内联成 base64 塞进 JSON。
//
//  类型 Appearance / Personality / Character / ShotRow / Medium 与 niuma-producer
//  的 src/types/index.ts 一致（可直接复用），下面只在其上做最小扩展。
// ============================================================================

export const JOB_PACKAGE_SCHEMA_VERSION = '1.0';

// ---------------------------------------------------------------------------
//  1. 与 niuma-producer 一致的基础类型
// ---------------------------------------------------------------------------

export type Medium = 'vertical' | 'horizontal' | 'animation';

/** 包内项目元数据。不含本地绝对 path（path 只在本机有意义，不进可分发的包）。 */
export interface PackageProjectMeta {
  id: string;
  name: string;          // 剧名
  medium: Medium;
  createdAt?: string;
  updatedAt?: string;
  version?: string;      // 项目内容版本（非 schema 版本）
}

export interface Appearance {
  bodyType: string;
  face: string;
  hair: string;
  eyes: string;
  skin: string;
  features: string;
  clothing: string;
  accessories: string;
  aura: string;
  imageLockPhrase: string; // ★ 外貌一句话锁定（文字一致性锚点，已被复制进每条 prompt）
}

export interface Personality {
  core: string;
  speech: string;
  habits: string;
  values: string;
  weakness: string;
}

export interface Character {
  id: string;          // 注意：Scriptwriter 导出时 id = 角色名（如 "林安"）
  name: string;
  role: string;
  age: string;
  gender: string;
  identity: string;
  appearance: Appearance;
  personality: Personality;
  background: string;
  relationships: string;
  actingNotes: string;
}

/** 分镜表行。对应 niuma-producer 的 ShotRow（03-分镜表）。 */
export interface ShotRow {
  shotId: string;     // 全局唯一镜头号，如 "S01E01-C01-SH03"（也可能是降级的 "C01-SH01" / "SH01"）
  scene: string;      // 场次，如 "C01"
  shotType: string;   // 景别
  cameraMove: string; // 运镜
  description: string;// 画面描述
  composition: string;// 构图
  duration: string;   // 时长(秒)
  transition: string; // 转场
  dialogue: string;   // 对白/音效
  visualIntent: string; // 视觉意图（场级）
  notes: string;      // 备注
}

// ---------------------------------------------------------------------------
//  2. Scriptwriter 导出侧在 ShotRow 上补的字段（出图必需）
//
//  ⚠️ 现实：这些字段由 Scriptwriter 解析大模型产出的 04-生图提示词(Markdown) 得到，
//     是「尽力而为」——抽不到就留空。所以出图工具导入后必须容忍并支持手动补：
//       - prompt 可能为空（该镜需手动填或跳过）
//       - characterIds 可能漏（启发式没认出 → 出图工具要能手动指派角色）
// ---------------------------------------------------------------------------

/** 一条可直接送去出图的分镜。 */
export interface ImageShot extends ShotRow {
  /** ★ 最终生图提示词（中文）。出图工具【逐字原样】使用——它已含角色 imageLockPhrase
   *  和风格锁定句，出图工具不会再重复拼接，避免冗余/打架。可能为空。 */
  prompt: string;
  /** 可选：英文 / MJ 版提示词。 */
  promptEn?: string;
  /** 该镜负面词；缺省时回退到 StyleLock.globalNegative。 */
  negative?: string;
  /** ★ 这一镜里出现的角色 id 列表（= 角色名）。自动挂参考图的钥匙；环境空镜为 []。 */
  characterIds: string[];
  /** 可选：关联的场景资产 id。 */
  sceneId?: string;
}

/** 全局风格锁定。来自 Scriptwriter 的视觉风格库。 */
export interface StyleLock {
  /** 风格一句话锁定（已逐字复制进每条 prompt）。出图工具仅作展示/兜底，不重复拼接。 */
  lockPhrase: string;
  /** 通用负面提示词。 */
  globalNegative: string;
}

/** 出图默认参数。 */
export interface GenerationDefaults {
  /** 出图尺寸，如竖屏 "2160x3840"。由 medium 推导（见 MEDIUM_SIZE），可被用户覆盖。 */
  size: string;
  model?: string;     // 出图模型 id，默认 "gpt-image-2"
  quality?: 'auto' | 'low' | 'medium' | 'high';
  format?: 'png' | 'jpeg' | 'webp';
  /** 是否自动把镜头内角色的参考图挂为 reference。默认 true。 */
  attachCharacterRefs?: boolean;
}

// ---------------------------------------------------------------------------
//  3. 顶层：生图任务包（Scriptwriter 导出的就是这个，单 JSON、无图片）
//     字段与 Scriptwriter 侧 ImageJobPackage 逐字一致。
// ---------------------------------------------------------------------------

export interface ImageJobPackage {
  schemaVersion: string;       // 见 JOB_PACKAGE_SCHEMA_VERSION
  project: PackageProjectMeta;
  /** 本次生产单元，如 "S01E01"（一集）。可不填表示整个项目。 */
  episode?: string;
  style: StyleLock;
  defaults: GenerationDefaults;
  characters: Character[];     // 导出时无参考图；出图工具导入后升级为 ImageCharacter
  shots: ImageShot[];
}

// ---------------------------------------------------------------------------
//  4. 出图工具(妖荼)侧的扩展：视觉一致性层 + 生产状态
//     Scriptwriter 不产出这些，仅为类型完整保留。
// ---------------------------------------------------------------------------

export type ReferenceRole = 'base' | 'turnaround' | 'expression' | 'detail';

export interface ReferenceImage {
  id: string;
  /** 项目文件夹内的相对路径，如 "characters/林安/base-01.png"。永远是文件，不是 base64。 */
  file: string;
  role: ReferenceRole;
  /** 锁定的基准图 = 该角色权威一致性锚，出图时优先挂它。 */
  locked?: boolean;
  createdAt?: string;
}

/** Character + 视觉参考图。出图工具在导入的 Character 上补这一层。 */
export interface ImageCharacter extends Character {
  referenceImages?: ReferenceImage[];
}

export interface SceneAsset {
  id: string;
  name: string;
  styleNote?: string;
  referenceImages?: ReferenceImage[];
}

export type RenderStatus = 'pending' | 'generating' | 'done' | 'error';

export interface RenderCandidate {
  imageId: string;
  file: string;       // 项目文件夹内相对路径，如 "outputs/S01E01-C01-SH03/cand-01.png"
  createdAt: string;
}

/** 单镜的出图状态与产物。 */
export interface ShotRender {
  shotId: string;
  status: RenderStatus;
  candidates: RenderCandidate[];
  chosenImageId?: string; // 被选定的定稿
}

/**
 * 出图工具自己的「项目」= 落盘文件夹（project.json + 图片）。
 * 在 ImageJobPackage 之上加：角色视觉层、场景资产、各镜出图状态。
 * 这才是出图工具再次导出（给小伙伴交接）时的完整包。
 */
export interface ImageProject extends Omit<ImageJobPackage, 'characters'> {
  characters: ImageCharacter[];
  scenes?: SceneAsset[];
  renders?: ShotRender[];
}

// ---------------------------------------------------------------------------
//  5. 媒介 → 默认尺寸（gpt-image-2 约束：边 ÷16、≤3840、总像素 ≤8,294,400）
//     与 Scriptwriter 侧 MEDIUM_SIZE 一致。出量想省钱可选中档。
// ---------------------------------------------------------------------------

export const MEDIUM_SIZE: Record<Medium, { default: string; options: string[] }> = {
  vertical: { default: '2160x3840', options: ['2160x3840', '1440x2560', '1080x1920'] },
  horizontal: { default: '3840x2160', options: ['3840x2160', '2560x1440', '1920x1088'] },
  animation: { default: '2560x1440', options: ['3840x2160', '2560x1440', '1920x1088'] },
};
