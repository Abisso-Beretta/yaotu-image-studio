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

// 主动取消（AbortController.abort）抛出的错误。调用方用它区分「用户取消」和真错误。
export function isAbortError(e: unknown): boolean {
  return (e as { name?: string } | null)?.name === 'AbortError'
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch (e) {
    // 用户主动取消：原样抛出，别伪装成「连不上后端」。
    if (isAbortError(e)) throw e
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

function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return jsonFetch<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

export const api = {
  getConfig: () => jsonFetch<AppConfig>('/api/config'),

  generate: (body: GenerateParams, signal?: AbortSignal) =>
    postJson<GenerateResult>('/api/generate', body, signal),

  listImages: (page = 1, pageSize = 24) =>
    jsonFetch<ImagesPage>(`/api/images?page=${page}&pageSize=${pageSize}`),

  deleteImages: (ids: string[]) =>
    postJson<{ deleted: string[]; failed?: { id: string; error: string }[] }>('/api/images/delete', { ids }),

  getSettings: () => jsonFetch<AppSettings>('/api/settings'),

  saveProfile: (body: ProfileInput) => postJson<AppSettings>('/api/settings', body),

  deleteProfile: (profileId: string) =>
    postJson<AppSettings>('/api/settings/delete', { profileId }),

  testConnection: (body: { profileId?: string; apiKey?: string; baseUrl?: string }) =>
    postJson<TestResult>('/api/test-connection', body),

  testAuxiliary: (body: {
    useActiveProfile?: boolean
    apiKey?: string
    baseUrl?: string
    model?: string
  }) => postJson<TestResult>('/api/test-auxiliary', body),

  listImageModels: (body: { profileId?: string; apiKey?: string; baseUrl?: string }) =>
    postJson<AuxiliaryModelsResult>('/api/image-models', body),

  // 漫剧项目
  listProjects: () => jsonFetch<{ projects: ProjectSummary[] }>('/api/projects'),

  importPackage: (pkg: unknown) =>
    postJson<{ key: string; project: ImageProject; summary: ProjectSummary }>(
      '/api/projects/import',
      pkg,
    ),

  getProject: (key: string) =>
    jsonFetch<{ key: string; project: ImageProject }>(`/api/project?key=${encodeURIComponent(key)}`),

  addCharacterRef: (body: {
    key: string
    characterId: string
    dataUrl?: string
    url?: string
    role?: string
    formId?: string
    label?: string
    locked?: boolean
    baseCandidateId?: string
  }) =>
    postJson<{ key: string; project: ImageProject }>('/api/project/character-ref', body),

  generateCharacterBase: (
    body: { key: string; characterId: string; count?: number; formId?: string },
    signal?: AbortSignal,
  ) =>
    postJson<{ key: string; project: ImageProject }>(
      '/api/project/generate-character-base',
      body,
      signal,
    ),

  generateShot: (body: { key: string; shotId: string; count?: number }, signal?: AbortSignal) =>
    postJson<{ key: string; shotId: string; render: ProjectRender; referencesAttached: number }>(
      '/api/project/generate-shot',
      body,
      signal,
    ),

  chooseRender: (body: { key: string; shotId: string; imageId?: string }) =>
    postJson<{ key: string; shotId: string; render: ProjectRender }>('/api/project/choose', body),

  exportProject: (body: { key: string }) => postJson<ExportResult>('/api/project/export', body),

  openExportFolder: (body: { key: string }) =>
    postJson<{ ok: boolean; dir: string }>('/api/project/open-folder', body),

  // 漫剧编辑层：手动增删改
  createProject: (body: { name: string; episode?: string }) =>
    postJson<{ key: string; project: ImageProject; summary: ProjectSummary }>('/api/project/create', body),

  deleteProject: (body: { key: string }) =>
    postJson<{ ok: boolean; projects: ProjectSummary[] }>('/api/project/delete', body),

  updateProjectSettings: (body: {
    key: string
    name?: string
    episode?: string
    style?: { lockPhrase?: string; globalNegative?: string }
    defaults?: { size?: string; model?: string; attachCharacterRefs?: boolean }
  }) => postJson<{ key: string; project: ImageProject }>('/api/project/settings', body),

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
      characterForms?: Record<string, string>
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

  reorderCharacterRefs: (body: { key: string; characterId: string; orderedRefIds: string[] }) =>
    postJson<{ key: string; project: ImageProject }>('/api/project/character-ref/reorder', body),

  deleteCandidate: (body: { key: string; shotId: string; imageId: string }) =>
    postJson<{ key: string; shotId: string; render: ProjectRender }>('/api/project/candidate/delete', body),

  deleteCharacterBaseCandidate: (body: { key: string; characterId: string; url?: string; candidateId?: string }) =>
    postJson<{ key: string; project: ImageProject }>('/api/project/character-base-candidate/delete', body),

  // 角色多形象 / 回收站
  // 新增或修改角色的一个形象（不传 formId 表示新建）
  upsertCharacterForm: (body: {
    key: string
    characterId: string
    formId?: string
    name?: string
    imageLockPhrase?: string
    note?: string
  }) => postJson<{ key: string; project: ImageProject }>('/api/project/character-form', body),

  // 删除角色的一个形象
  deleteCharacterForm: (body: { key: string; characterId: string; formId: string }) =>
    postJson<{ key: string; project: ImageProject }>('/api/project/character-form/delete', body),

  // 更新单张参考图的属性（角色定位/标签/所属形象）
  updateCharacterRef: (body: {
    key: string
    characterId: string
    refId: string
    role?: string
    label?: string
    formId?: string
  }) => postJson<{ key: string; project: ImageProject }>('/api/project/character-ref/update', body),

  // 批量删除参考图
  deleteCharacterRefs: (body: { key: string; characterId: string; refIds: string[] }) =>
    postJson<{ key: string; project: ImageProject }>('/api/project/character-refs/delete', body),

  // 查询项目回收站占用（文件数与字节数）
  getProjectTrashInfo: (body: { key: string }) =>
    postJson<{ key: string; count: number; bytes: number }>('/api/project/trash/info', body),

  // 清空项目回收站
  emptyProjectTrash: (body: { key: string }) =>
    postJson<{ key: string; ok: boolean }>('/api/project/trash/empty', body),

  optimizePrompt: (body: {
    prompt: string
    negativePrompt?: string
    mode: string
    targetSize?: string
    purpose?: string
    styleSelected?: boolean
    styleName?: string
  }) =>
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

  analyzeImage: (body: {
    images: { name?: string; dataUrl?: string; url?: string }[]
    mode: string
    targetSize?: string
  }) =>
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

  // 纯前端展示偏好（如主题背景）。桌面版每次启动端口随机分配，localStorage 按源隔离会失效，
  // 所以落盘到后端而不是浏览器本地存储。
  getUiPrefs: () => jsonFetch<{ backgroundTheme?: string }>('/api/ui-prefs'),

  setUiPrefs: (patch: { backgroundTheme?: string }) =>
    postJson<{ backgroundTheme?: string }>('/api/ui-prefs', patch),
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

// 桌面版 api 对象的完整类型：作为「契约」固化下来，手机版 mobileApi 必须逐方法实现同一套签名。
export type ApiContract = typeof api
