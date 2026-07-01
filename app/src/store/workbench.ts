import { create } from 'zustand'
import { api, fileToDataUrl } from '@/lib/api'
import type { ExportResult, ImageProject, ProjectRender, ProjectSummary } from '@/types'

interface WorkbenchState {
  projects: ProjectSummary[]
  current: ImageProject | null
  currentKey: string | null

  loading: boolean
  importing: boolean
  error: string | null
  notice: string | null
  shotBusy: Record<string, boolean>
  charBusy: Record<string, boolean>

  batchRunning: boolean
  batchStop: boolean
  batchProgress: { done: number; total: number }
  exporting: boolean
  exportResult: ExportResult | null

  loadProjects: () => Promise<void>
  importPackageFile: (file: File) => Promise<void>
  openProject: (key: string) => Promise<void>
  uploadCharacterRef: (characterId: string, file: File) => Promise<void>
  generateCharacterBase: (characterId: string, count: number) => Promise<void>
  lockCandidate: (characterId: string, url: string) => Promise<void>
  generateShot: (shotId: string, count: number) => Promise<void>
  chooseCandidate: (shotId: string, imageId: string | undefined) => Promise<void>
  runBatch: (count: number) => Promise<void>
  stopBatch: () => void
  exportEpisode: () => Promise<void>
  openExportFolder: () => Promise<void>

  // 编辑层
  createProject: (name: string, episode?: string) => Promise<void>
  upsertShot: (patch: {
    shotId?: string
    prompt?: string
    negative?: string
    characterIds?: string[]
    shotType?: string
    scene?: string
  }, matchShotId?: string) => Promise<void>
  deleteShot: (shotId: string) => Promise<void>
  upsertCharacter: (input: {
    characterId?: string
    name?: string
    role?: string
    imageLockPhrase?: string
  }) => Promise<void>
  deleteCharacter: (characterId: string) => Promise<void>
  deleteCharacterRef: (characterId: string, refId: string) => Promise<void>
  lockCharacterRef: (characterId: string, refId: string) => Promise<void>
  deleteCandidate: (shotId: string, imageId: string) => Promise<void>
}

function applyRender(project: ImageProject | null, render: ProjectRender): ImageProject | null {
  if (!project) return project
  const renders = Array.isArray(project.renders) ? [...project.renders] : []
  const i = renders.findIndex((r) => r.shotId === render.shotId)
  if (i >= 0) renders[i] = render
  else renders.push(render)
  return { ...project, renders }
}

export const useWorkbench = create<WorkbenchState>((set, get) => ({
  projects: [],
  current: null,
  currentKey: null,
  loading: false,
  importing: false,
  error: null,
  notice: null,
  shotBusy: {},
  charBusy: {},

  batchRunning: false,
  batchStop: false,
  batchProgress: { done: 0, total: 0 },
  exporting: false,
  exportResult: null,

  loadProjects: async () => {
    set({ loading: true })
    try {
      const { projects } = await api.listProjects()
      set({ projects })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  importPackageFile: async (file) => {
    set({ importing: true, error: null, notice: null })
    try {
      const text = await file.text()
      let pkg: unknown
      try {
        pkg = JSON.parse(text)
      } catch {
        throw new Error('这个文件不是合法 JSON，确认选的是「生图任务包」。')
      }
      const { key, project } = await api.importPackage(pkg)
      set({ current: project, currentKey: key, notice: `已导入《${project.project.name}》${project.episode || ''}。` })
      await get().loadProjects()
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ importing: false })
    }
  },

  openProject: async (key) => {
    if (!key) {
      set({ current: null, currentKey: null })
      return
    }
    set({ loading: true, error: null })
    try {
      const { project } = await api.getProject(key)
      set({ current: project, currentKey: key })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  uploadCharacterRef: async (characterId, file) => {
    const key = get().currentKey
    if (!key) return
    try {
      const dataUrl = await fileToDataUrl(file)
      const { project } = await api.addCharacterRef({ key, characterId, dataUrl })
      set({ current: project, notice: '已锁定参考底图。' })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  generateCharacterBase: async (characterId, count) => {
    const key = get().currentKey
    if (!key) return
    set((s) => ({ charBusy: { ...s.charBusy, [characterId]: true }, error: null, notice: null }))
    try {
      const { project } = await api.generateCharacterBase({ key, characterId, count })
      set({ current: project, notice: '基准图候选已生成，挑一张「锁定」。' })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set((s) => ({ charBusy: { ...s.charBusy, [characterId]: false } }))
    }
  },

  lockCandidate: async (characterId, url) => {
    const key = get().currentKey
    if (!key) return
    try {
      const { project } = await api.addCharacterRef({ key, characterId, url })
      set({ current: project, notice: '已锁定基准图。' })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  generateShot: async (shotId, count) => {
    const key = get().currentKey
    if (!key) return
    set((s) => ({ shotBusy: { ...s.shotBusy, [shotId]: true }, error: null, notice: null }))
    try {
      const { render, referencesAttached } = await api.generateShot({ key, shotId, count })
      set((s) => ({
        current: applyRender(s.current, render),
        notice: `分镜 ${shotId} 出图完成${referencesAttached ? `（挂了 ${referencesAttached} 张角色参考图）` : '（未挂参考图，先去人设库锁底图）'}。`,
      }))
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set((s) => ({ shotBusy: { ...s.shotBusy, [shotId]: false } }))
    }
  },

  chooseCandidate: async (shotId, imageId) => {
    const key = get().currentKey
    if (!key) return
    try {
      const { render } = await api.chooseRender({ key, shotId, imageId })
      set((s) => ({ current: applyRender(s.current, render) }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  stopBatch: () => set({ batchStop: true }),

  runBatch: async (count) => {
    const { current, currentKey } = get()
    if (!current || !currentKey) return
    const targets = current.shots.filter((s) => {
      if (!s.prompt) return false
      const r = current.renders?.find((x) => x.shotId === s.shotId)
      return !r || !r.candidates?.length
    })
    if (targets.length === 0) {
      set({ notice: '没有待出图的分镜（有提示词的都出过了）。' })
      return
    }
    set({
      batchRunning: true,
      batchStop: false,
      batchProgress: { done: 0, total: targets.length },
      error: null,
      notice: null,
    })
    let done = 0
    for (const shot of targets) {
      if (get().batchStop) break
      set((s) => ({ shotBusy: { ...s.shotBusy, [shot.shotId]: true } }))
      try {
        const { render } = await api.generateShot({ key: currentKey, shotId: shot.shotId, count })
        done += 1
        set((s) => ({
          current: applyRender(s.current, render),
          batchProgress: { done, total: targets.length },
          shotBusy: { ...s.shotBusy, [shot.shotId]: false },
        }))
      } catch (e) {
        // 出错即停，避免在配置坏掉时连续烧钱
        set((s) => ({
          error: `分镜 ${shot.shotId} 出图失败，已停止：${(e as Error).message}`,
          shotBusy: { ...s.shotBusy, [shot.shotId]: false },
        }))
        break
      }
    }
    const stopped = get().batchStop
    set({
      batchRunning: false,
      notice: get().error ? null : stopped ? `已停止，完成 ${done} 镜。` : `批量出图完成，共 ${done} 镜。`,
    })
  },

  exportEpisode: async () => {
    const key = get().currentKey
    if (!key) return
    set({ exporting: true, error: null, notice: null, exportResult: null })
    try {
      const res = await api.exportProject({ key })
      set({
        exportResult: res,
        notice: `已导出 ${res.count} 张定稿到：${res.exportDir}${
          res.missing.length ? `（${res.missing.length} 镜还没定稿，未导出）` : ''
        }`,
      })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ exporting: false })
    }
  },

  openExportFolder: async () => {
    const key = get().currentKey
    if (!key) return
    try {
      await api.openExportFolder({ key })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  // ---- 编辑层 ----
  createProject: async (name, episode) => {
    const clean = name.trim()
    if (!clean) return
    set({ error: null, notice: null })
    try {
      const { key, project } = await api.createProject({ name: clean, episode })
      set({ current: project, currentKey: key, notice: `已建空项目《${project.project.name}》。` })
      await get().loadProjects()
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  upsertShot: async (patch, matchShotId) => {
    const key = get().currentKey
    if (!key) return
    set({ error: null })
    try {
      const { project } = await api.upsertShot({ key, shotId: matchShotId, patch })
      set({ current: project })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  deleteShot: async (shotId) => {
    const key = get().currentKey
    if (!key) return
    if (!window.confirm(`删除分镜 ${shotId}？连同它的候选图一起删，不可撤销。`)) return
    try {
      const { project } = await api.deleteShot({ key, shotId })
      set({ current: project, notice: `已删除分镜 ${shotId}。` })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  upsertCharacter: async (input) => {
    const key = get().currentKey
    if (!key) return
    set({ error: null })
    try {
      const { project } = await api.upsertCharacter({ key, ...input })
      set({ current: project })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  deleteCharacter: async (characterId) => {
    const key = get().currentKey
    if (!key) return
    if (!window.confirm(`删除角色「${characterId}」？它的参考图和分镜里的引用都会清掉，不可撤销。`)) return
    try {
      const { project } = await api.deleteCharacter({ key, characterId })
      set({ current: project, notice: `已删除角色 ${characterId}。` })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  deleteCharacterRef: async (characterId, refId) => {
    const key = get().currentKey
    if (!key) return
    try {
      const { project } = await api.deleteCharacterRef({ key, characterId, refId })
      set({ current: project })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  lockCharacterRef: async (characterId, refId) => {
    const key = get().currentKey
    if (!key) return
    try {
      const { project } = await api.lockCharacterRef({ key, characterId, refId })
      set({ current: project, notice: '已换锚点底图。' })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  deleteCandidate: async (shotId, imageId) => {
    const key = get().currentKey
    if (!key) return
    try {
      const { render } = await api.deleteCandidate({ key, shotId, imageId })
      set((s) => ({ current: applyRender(s.current, render) }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },
}))
