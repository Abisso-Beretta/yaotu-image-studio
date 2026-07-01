import type {
  AppConfig,
  AppSettings,
  AnalyzeResult,
  AuxiliaryInput,
  AuxiliaryModelsResult,
  GenerateParams,
  ExportResult,
  GenerateResult,
  ImageProject,
  ImagesPage,
  OptimizeResult,
  ProfileInput,
  ProjectRender,
  ProjectSummary,
  SavedReference,
  TestResult,
  UpdateStatus,
} from '@/types'

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch (e) {
    throw new Error('连不上本地服务，确认后端 server.js 已启动。')
  }
  const text = await res.text()
  let data: any = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      // 非 JSON 响应（如 HTML 错误页）
    }
  }
  if (!res.ok) {
    const msg = data?.error || data?.detail || `${res.status} ${res.statusText}`
    throw new Error(msg)
  }
  return data as T
}

function postJson<T>(url: string, body: unknown): Promise<T> {
  return jsonFetch<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export const api = {
  getConfig: () => jsonFetch<AppConfig>('/api/config'),

  generate: (body: GenerateParams) => postJson<GenerateResult>('/api/generate', body),

  listImages: (page = 1, pageSize = 24) =>
    jsonFetch<ImagesPage>(`/api/images?page=${page}&pageSize=${pageSize}`),

  deleteImages: (ids: string[]) =>
    postJson<{ deleted: string[]; failed?: string[] }>('/api/images/delete', { ids }),

  getSettings: () => jsonFetch<AppSettings>('/api/settings'),

  saveProfile: (body: ProfileInput) => postJson<AppSettings>('/api/settings', body),

  deleteProfile: (profileId: string) =>
    postJson<AppSettings>('/api/settings/delete', { profileId }),

  testConnection: (body: { profileId?: string; apiKey?: string; baseUrl?: string }) =>
    postJson<TestResult>('/api/test-connection', body),

  // 漫剧项目
  listProjects: () => jsonFetch<{ projects: ProjectSummary[] }>('/api/projects'),

  importPackage: (pkg: unknown) =>
    postJson<{ key: string; project: ImageProject; summary: ProjectSummary }>(
      '/api/projects/import',
      pkg,
    ),

  getProject: (key: string) =>
    jsonFetch<{ key: string; project: ImageProject }>(`/api/project?key=${encodeURIComponent(key)}`),

  addCharacterRef: (body: { key: string; characterId: string; dataUrl?: string; url?: string }) =>
    postJson<{ key: string; project: ImageProject }>('/api/project/character-ref', body),

  generateCharacterBase: (body: { key: string; characterId: string; count?: number }) =>
    postJson<{ key: string; project: ImageProject }>('/api/project/generate-character-base', body),

  generateShot: (body: { key: string; shotId: string; count?: number }) =>
    postJson<{ key: string; shotId: string; render: ProjectRender; referencesAttached: number }>(
      '/api/project/generate-shot',
      body,
    ),

  chooseRender: (body: { key: string; shotId: string; imageId?: string }) =>
    postJson<{ key: string; shotId: string; render: ProjectRender }>('/api/project/choose', body),

  exportProject: (body: { key: string }) => postJson<ExportResult>('/api/project/export', body),

  openExportFolder: (body: { key: string }) =>
    postJson<{ ok: boolean; dir: string }>('/api/project/open-folder', body),

  // 漫剧编辑层：手动增删改
  createProject: (body: { name: string; episode?: string }) =>
    postJson<{ key: string; project: ImageProject; summary: ProjectSummary }>('/api/project/create', body),

  upsertShot: (body: {
    key: string
    shotId?: string
    patch: {
      shotId?: string
      prompt?: string
      negative?: string
      characterIds?: string[]
      shotType?: string
      scene?: string
    }
  }) => postJson<{ key: string; project: ImageProject }>('/api/project/shot', body),

  deleteShot: (body: { key: string; shotId: string }) =>
    postJson<{ key: string; project: ImageProject }>('/api/project/shot/delete', body),

  upsertCharacter: (body: {
    key: string
    characterId?: string
    name?: string
    role?: string
    imageLockPhrase?: string
  }) => postJson<{ key: string; project: ImageProject }>('/api/project/character', body),

  deleteCharacter: (body: { key: string; characterId: string }) =>
    postJson<{ key: string; project: ImageProject }>('/api/project/character/delete', body),

  deleteCharacterRef: (body: { key: string; characterId: string; refId: string }) =>
    postJson<{ key: string; project: ImageProject }>('/api/project/character-ref/delete', body),

  lockCharacterRef: (body: { key: string; characterId: string; refId: string }) =>
    postJson<{ key: string; project: ImageProject }>('/api/project/character-ref/lock', body),

  deleteCandidate: (body: { key: string; shotId: string; imageId: string }) =>
    postJson<{ key: string; shotId: string; render: ProjectRender }>('/api/project/candidate/delete', body),

  optimizePrompt: (body: { prompt: string; negativePrompt?: string; mode: string }) =>
    postJson<OptimizeResult>('/api/optimize-prompt', body),

  // 提示词库 / 最近 / 风格库 / 样图分析
  saveSavedPrompt: (body: { name?: string; text: string; negativeText?: string }) =>
    postJson<AppSettings>('/api/saved-prompts', body),

  deleteSavedPrompt: (id: string) => postJson<AppSettings>('/api/saved-prompts/delete', { id }),

  saveRecentPrompt: (body: { text: string; negativeText?: string }) =>
    postJson<AppSettings>('/api/recent-prompts', body),

  deleteRecentPrompt: (id: string) => postJson<AppSettings>('/api/recent-prompts/delete', { id }),

  saveSavedStyle: (body: {
    name?: string
    text: string
    styleText?: string
    negativeText?: string
    strength?: string
    referenceImages?: SavedReference[]
  }) => postJson<AppSettings>('/api/saved-styles', body),

  deleteSavedStyle: (id: string) => postJson<AppSettings>('/api/saved-styles/delete', { id }),

  analyzeImage: (body: { images: { name?: string; dataUrl?: string; url?: string }[]; mode: string }) =>
    postJson<AnalyzeResult>('/api/analyze-image', body),

  // 辅助 API（优化/分析用的对话模型）
  saveAuxiliary: (body: AuxiliaryInput) => postJson<AppSettings>('/api/auxiliary-settings', body),

  deleteAuxiliary: (id: string) =>
    postJson<AppSettings>('/api/auxiliary-settings/delete', { id }),

  listAuxiliaryModels: (body: {
    useActiveProfile?: boolean
    apiKey?: string
    baseUrl?: string
    model?: string
  }) => postJson<AuxiliaryModelsResult>('/api/auxiliary-models', body),

  // 版本 / 更新检测（更新推送靠 electron-updater + GitHub Releases，只在桌面版生效）
  getUpdateStatus: () => jsonFetch<UpdateStatus>('/api/update/status'),

  checkUpdate: () => postJson<UpdateStatus>('/api/update/check', {}),
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}
