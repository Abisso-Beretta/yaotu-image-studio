// 与后端 server.js 的 JSON 接口对应的类型。

export interface AppConfig {
  hasApiKey: boolean
  defaultModel: string
  baseUrl: string
  endpointMode: string
  activeProfileName: string
  outputDir: string
  version?: string
}

export interface UpdateStatus {
  enabled: boolean
  status: string
  version?: string
  reason?: string
  ok?: boolean
  message?: string
  availableVersion?: string
  latestVersion?: string
  releaseDate?: string
  error?: string
  checking?: boolean
  checkedAt?: string
}

export interface ReferenceImageInput {
  name: string
  dataUrl?: string
  url?: string
  source?: string
}

export interface GenerateParams {
  prompt: string
  negativePrompt?: string
  model?: string
  size: string
  quality: string
  count: number
  outputFormat: string
  background: string
  outputCompression?: number
  referenceImages?: ReferenceImageInput[]
}

export interface ImageRequest {
  endpointMode?: string
  model?: string
  prompt?: string
  negativePrompt?: string
  n?: number
  size?: string
  quality?: string
  output_format?: string
  output_compression?: number
  background?: string
}

export interface GeneratedImage {
  id: string
  url: string
  batchId?: string
  createdAt?: string
  prompt?: string
  bytes?: number
  params?: Record<string, unknown>
  request?: ImageRequest
}

export interface GenerateResult {
  batchId: string
  createdAt: string
  images: GeneratedImage[]
}

export interface ImagesPage {
  images: GeneratedImage[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface SettingsProfile {
  id: string
  name: string
  baseUrl: string
  imageModel: string
  endpointMode: string
  hasApiKey: boolean
  apiKeyMask: string
}

export interface SavedReference {
  name: string
  url?: string
  dataUrl?: string
  source?: string
}

export interface SavedItem {
  id: string
  name: string
  text: string
  styleText?: string
  negativeText?: string
  strength?: 'low' | 'medium' | 'high'
  referenceImages?: SavedReference[]
  mode?: string
  source?: string
  createdAt?: string
  updatedAt?: string
}

export interface AnalyzeResult {
  mode: string
  model: string
  text: string
  images: { name: string; mimeType: string; bytes: number }[]
}

export interface AuxiliaryProfile {
  id: string
  name: string
  useActiveProfile: boolean
  baseUrl: string
  model: string
  hasApiKey: boolean
  apiKeyMask: string
}

export interface AuxiliaryInput {
  profileId?: string
  name: string
  useActiveProfile: boolean
  baseUrl?: string
  model: string
  apiKey?: string
  clearApiKey?: boolean
  setActive?: boolean
}

export interface AuxiliaryModelsResult {
  ok: boolean
  endpoint?: string
  status?: number
  models: string[]
  modelCount?: number
  error?: string
  hint?: string
}

export interface AppSettings {
  activeProfileId: string
  profiles: SettingsProfile[]
  activeAuxiliaryProfileId?: string
  auxiliaryProfiles?: AuxiliaryProfile[]
  auxiliary?: AuxiliaryProfile
  savedPrompts?: SavedItem[]
  savedStyles?: SavedItem[]
  recentPrompts?: SavedItem[]
}

export interface ProfileInput {
  profileId?: string
  name: string
  apiKey?: string
  baseUrl: string
  imageModel: string
  endpointMode: string
  setActive?: boolean
}

export interface TestResult {
  ok: boolean
  endpoint?: string
  status?: number
  modelCount?: number
  error?: string
  hint?: string
}

export interface OptimizeResult {
  optimizedPrompt?: string
  text?: string
  negativePrompt?: string
  mode?: string
}

// 漫剧项目（生图任务包，磁盘持久化）
export interface ProjectSummary {
  key: string
  name: string
  episode: string
  medium: string
  characterCount: number
  charactersWithRef: number
  shotCount: number
  chosenCount: number
}

export interface ProjectRefImage {
  id: string
  file: string
  role: string
  locked?: boolean
}

export interface ProjectCharacter {
  id: string
  name: string
  role?: string
  appearance?: { imageLockPhrase?: string }
  referenceImages?: ProjectRefImage[]
  baseCandidates?: string[]
}

export interface ProjectShot {
  shotId: string
  scene?: string
  shotType?: string
  cameraMove?: string
  composition?: string
  prompt: string
  promptEn?: string
  negative?: string
  characterIds: string[]
}

export interface ProjectCandidate {
  imageId: string
  file: string
  createdAt?: string
}

export interface ProjectRender {
  shotId: string
  status: string
  candidates: ProjectCandidate[]
  chosenImageId?: string
}

export interface ImageProject {
  project: { id: string; name: string; medium: string }
  episode?: string
  style: { lockPhrase: string; globalNegative: string }
  defaults: { size: string; model?: string; attachCharacterRefs?: boolean }
  characters: ProjectCharacter[]
  shots: ProjectShot[]
  renders?: ProjectRender[]
}

export interface ExportResult {
  key: string
  exportDir: string
  count: number
  missing: string[]
  files: { shotId: string; file: string }[]
}
