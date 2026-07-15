// 手机版 api 实现：把 MobileEngine 各方法转发成 ApiContract 的同名字段，
// 引擎没做的重功能（漫剧工作台全家桶 + 优化提示词/样图分析/辅助模型/更新检测）统一 stub 抛错。
// 这些 stub 必须存在——ApiContract 是从桌面版 api 对象派生的完整类型，缺一个方法 tsc 就报错；
// UI 会用 capabilities 把入口藏掉，正常不会走到这些兜底路径。
import {
  capacitorFileAdapter,
  capacitorHttpAdapter,
  capacitorSecretAdapter,
  capacitorToDisplayUrl,
} from './capacitorAdapters'
import { MobileEngine } from './engine'
import type { ApiContract } from '@/lib/serverApi'

const engine = new MobileEngine({
  http: capacitorHttpAdapter,
  file: capacitorFileAdapter,
  secret: capacitorSecretAdapter,
  toDisplayUrl: capacitorToDisplayUrl,
})

// 统一的「暂未支持」兜底：文案固定，供所有 stub 复用。
const NOT_SUPPORTED = '手机版暂未支持（后续版本提供）'
const notSupported = async (): Promise<never> => {
  throw new Error(NOT_SUPPORTED)
}

export const mobileApi: ApiContract = {
  // —— 引擎真实实现 ——
  getConfig: () => engine.getConfig(),
  generate: (body, signal) => engine.generate(body, signal),
  listImages: (page, pageSize) => engine.listImages(page, pageSize),
  deleteImages: (ids) => engine.deleteImages(ids),
  getSettings: () => engine.getSettings(),
  saveProfile: (body) => engine.saveProfile(body),
  deleteProfile: (profileId) => engine.deleteProfile(profileId),
  testConnection: (body) => engine.testConnection(body),
  listImageModels: (body) => engine.listImageModels(body),
  saveSavedPrompt: (body) => engine.saveSavedPrompt(body),
  deleteSavedPrompt: (id) => engine.deleteSavedPrompt(id),
  saveRecentPrompt: (body) => engine.saveRecentPrompt(body),
  deleteRecentPrompt: (id) => engine.deleteRecentPrompt(id),
  saveSavedStyle: (body) => engine.saveSavedStyle(body),
  deleteSavedStyle: (id) => engine.deleteSavedStyle(id),
  getUiPrefs: () => engine.getUiPrefs(),
  setUiPrefs: (patch) => engine.setUiPrefs(patch),

  // —— 辅助 API / 优化 / 分析 / 更新检测：手机版不支持 ——
  testAuxiliary: notSupported,
  optimizePrompt: notSupported,
  analyzeImage: notSupported,
  saveAuxiliary: notSupported,
  deleteAuxiliary: notSupported,
  listAuxiliaryModels: notSupported,
  getUpdateStatus: notSupported,
  checkUpdate: notSupported,

  // —— 漫剧工作台 / 项目全家桶：手机版不支持 ——
  listProjects: notSupported,
  importPackage: notSupported,
  getProject: notSupported,
  addCharacterRef: notSupported,
  generateCharacterBase: notSupported,
  generateShot: notSupported,
  chooseRender: notSupported,
  exportProject: notSupported,
  openExportFolder: notSupported,
  createProject: notSupported,
  deleteProject: notSupported,
  updateProjectSettings: notSupported,
  upsertShot: notSupported,
  deleteShot: notSupported,
  upsertCharacter: notSupported,
  deleteCharacter: notSupported,
  deleteCharacterRef: notSupported,
  lockCharacterRef: notSupported,
  reorderCharacterRefs: notSupported,
  deleteCandidate: notSupported,
  deleteCharacterBaseCandidate: notSupported,
  upsertCharacterForm: notSupported,
  deleteCharacterForm: notSupported,
  updateCharacterRef: notSupported,
  deleteCharacterRefs: notSupported,
  getProjectTrashInfo: notSupported,
  emptyProjectTrash: notSupported,
}
