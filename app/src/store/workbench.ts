import { create } from 'zustand'
import { api, fileToDataUrl, isAbortError } from '@/lib/api'
import type { ExportResult, ImageProject, ProjectBaseCandidate, ProjectRender, ProjectSummary } from '@/types'

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
  uploadCharacterRef: (
    characterId: string,
    file: File,
    opts?: { role?: string; formId?: string },
  ) => Promise<void>
  generateCharacterBase: (characterId: string, count: number, formId?: string) => Promise<void>
  cancelCharacterBase: (characterId: string) => void
  lockCandidate: (characterId: string, cand: string | ProjectBaseCandidate) => Promise<void>
  generateShot: (shotId: string, count: number) => Promise<void>
  cancelShot: (shotId: string) => void
  chooseCandidate: (shotId: string, imageId: string | undefined) => Promise<void>
  runBatch: (count: number) => Promise<void>
  stopBatch: () => void
  exportEpisode: () => Promise<void>
  openExportFolder: () => Promise<void>

  // 编辑层
  createProject: (name: string, episode?: string) => Promise<void>
  // 删除整个项目（连磁盘目录一起）。删的若是当前打开的项目，回到无项目状态。
  deleteProject: (key: string) => Promise<void>
  // 项目级设置（名称/集号/风格/默认参数）。返回是否保存成功，弹层用它决定要不要关闭。
  updateSettings: (input: {
    name?: string
    episode?: string
    style?: { lockPhrase?: string; globalNegative?: string }
    defaults?: { size?: string; model?: string; attachCharacterRefs?: boolean }
  }) => Promise<boolean>
  upsertShot: (patch: {
    shotId?: string
    prompt?: string
    negative?: string
    characterIds?: string[]
    shotType?: string
    scene?: string
    characterForms?: Record<string, string>
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
  reorderCharacterRefs: (characterId: string, orderedRefIds: string[]) => Promise<void>
  deleteCandidate: (shotId: string, imageId: string) => Promise<void>
  deleteBaseCandidate: (characterId: string, cand: string | ProjectBaseCandidate) => Promise<void>

  // 多形象 / 参考图属性 / 批量删除
  upsertCharacterForm: (
    characterId: string,
    input: { formId?: string; name?: string; imageLockPhrase?: string; note?: string },
  ) => Promise<void>
  // 三个都返回是否成功（updateSettings 已有此先例）：调用方靠它决定要不要清掉自己的本地
  // 状态（选中集合/activeFormId 等）——服务器 500 时不能假装成功清空，逼用户重勾/重选。
  deleteCharacterForm: (characterId: string, formId: string) => Promise<boolean>
  updateCharacterRef: (
    characterId: string,
    refId: string,
    patch: { role?: string; label?: string; formId?: string },
  ) => Promise<boolean>
  deleteCharacterRefs: (characterId: string, refIds: string[]) => Promise<boolean>
}

function applyRender(project: ImageProject | null, render: ProjectRender): ImageProject | null {
  if (!project) return project
  const renders = Array.isArray(project.renders) ? [...project.renders] : []
  const i = renders.findIndex((r) => r.shotId === render.shotId)
  if (i >= 0) renders[i] = render
  else renders.push(render)
  return { ...project, renders }
}

// 进行中生成请求的 AbortController，按分镜/角色 id 索引。放模块级而不是 store state：
// 它们不驱动渲染（busy 状态另有 shotBusy/charBusy），塞进 state 只会多触发无意义更新。
const shotControllers = new Map<string, AbortController>()
const charControllers = new Map<string, AbortController>()
// 批量出图当前正在跑的那一镜的 controller——「停止」时一起 abort，立即生效。
let batchController: AbortController | null = null

// 取消提示统一文案：abort 只是前端不等了，服务端可能还在跑并计费。
const CANCEL_NOTE = '（已中断等待；服务端可能仍在完成本次生成并计费，完成的图会正常落盘）'

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

  uploadCharacterRef: async (characterId, file, opts) => {
    const key = get().currentKey
    if (!key) return
    try {
      const dataUrl = await fileToDataUrl(file)
      const { project } = await api.addCharacterRef({
        key,
        characterId,
        dataUrl,
        role: opts?.role,
        formId: opts?.formId,
      })
      // 首张自动锁定由后端处理，这里不再宣称「已锁定」。
      set({ current: project, notice: '已上传参考图。' })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  generateCharacterBase: async (characterId, count, formId) => {
    const key = get().currentKey
    if (!key) return
    const controller = new AbortController()
    charControllers.set(characterId, controller)
    set((s) => ({ charBusy: { ...s.charBusy, [characterId]: true }, error: null, notice: null }))
    try {
      const { project } = await api.generateCharacterBase(
        { key, characterId, count, formId },
        controller.signal,
      )
      // 生图期间可能切了项目：current 已经是别的项目，丢弃 UI 更新
      //（服务端已正确落盘，切回来 openProject 就能看到）。
      if (get().currentKey === key) {
        set({ current: project, notice: '基准图候选已生成，挑一张「锁定」。' })
      }
    } catch (e) {
      if (isAbortError(e)) {
        set({ notice: `已取消基准图生成${CANCEL_NOTE}。` })
      } else {
        set({ error: (e as Error).message })
      }
    } finally {
      if (charControllers.get(characterId) === controller) charControllers.delete(characterId)
      set((s) => ({ charBusy: { ...s.charBusy, [characterId]: false } }))
    }
  },

  cancelCharacterBase: (characterId) => {
    charControllers.get(characterId)?.abort()
  },

  lockCandidate: async (characterId, cand) => {
    const key = get().currentKey
    if (!key) return
    try {
      // 旧字符串候选走 url；新对象候选走 baseCandidateId（formId 由后端从候选记录读取）。
      // locked:true 必传：后端落锁规则是 sameForm.length===0 ? true : Boolean(input.locked)——
      // 形象组已有参考图时不传就落 locked:false，旧锚点不会被这张新锁定的替换，
      // 分镜生图仍会挂旧锚，和这里提示的「已锁定基准图」矛盾。
      const { project } = await api.addCharacterRef(
        typeof cand === 'string'
          ? { key, characterId, url: cand, locked: true }
          : { key, characterId, baseCandidateId: cand.id, locked: true },
      )
      set({ current: project, notice: '已锁定基准图。' })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  generateShot: async (shotId, count) => {
    const key = get().currentKey
    if (!key) return
    const controller = new AbortController()
    shotControllers.set(shotId, controller)
    set((s) => ({ shotBusy: { ...s.shotBusy, [shotId]: true }, error: null, notice: null }))
    try {
      const { render, referencesAttached } = await api.generateShot(
        { key, shotId, count },
        controller.signal,
      )
      // 生图期间可能切了项目：把 A 项目的 render 合进 B 项目的 current 会串数据，
      // 不一致就丢弃 UI 更新（服务端已正确落盘，切回来 openProject 就能看到）。
      if (get().currentKey === key) {
        set((s) => ({
          current: applyRender(s.current, render),
          notice: `分镜 ${shotId} 出图完成${referencesAttached ? `（挂了 ${referencesAttached} 张角色参考图）` : '（未挂参考图，先去人设库锁底图）'}。`,
        }))
      }
    } catch (e) {
      if (isAbortError(e)) {
        set({ notice: `已取消分镜 ${shotId} 出图${CANCEL_NOTE}。` })
      } else {
        set({ error: (e as Error).message })
      }
    } finally {
      if (shotControllers.get(shotId) === controller) shotControllers.delete(shotId)
      set((s) => ({ shotBusy: { ...s.shotBusy, [shotId]: false } }))
    }
  },

  cancelShot: (shotId) => {
    shotControllers.get(shotId)?.abort()
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

  stopBatch: () => {
    // 立即生效：置停止位，同时 abort 正在跑的那一镜（不再等它完成）。
    set({ batchStop: true })
    batchController?.abort()
  },

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
    let aborted = false
    for (const shot of targets) {
      // 防御性：批量中项目下拉已禁用，理论上切不了项目；万一切了（如导入任务包）就停。
      if (get().batchStop || get().currentKey !== currentKey) break
      const controller = new AbortController()
      batchController = controller
      set((s) => ({ shotBusy: { ...s.shotBusy, [shot.shotId]: true } }))
      try {
        const { render } = await api.generateShot(
          { key: currentKey, shotId: shot.shotId, count },
          controller.signal,
        )
        done += 1
        set((s) => ({
          // 生图期间切了项目就不把 A 项目的 render 合进 B 项目的 current（服务端已落盘）
          ...(s.currentKey === currentKey ? { current: applyRender(s.current, render) } : {}),
          batchProgress: { done, total: targets.length },
          shotBusy: { ...s.shotBusy, [shot.shotId]: false },
        }))
      } catch (e) {
        set((s) => ({ shotBusy: { ...s.shotBusy, [shot.shotId]: false } }))
        if (isAbortError(e)) {
          // 用户点了「停止」：不是错误，跳出循环走停止文案。
          aborted = true
        } else {
          // 出错即停，避免在配置坏掉时连续烧钱
          set({ error: `分镜 ${shot.shotId} 出图失败，已停止：${(e as Error).message}` })
        }
        break
      } finally {
        if (batchController === controller) batchController = null
      }
    }
    const stopped = get().batchStop || aborted
    set({
      batchRunning: false,
      batchStop: false,
      notice: get().error
        ? null
        : stopped
          ? `已停止，完成 ${done} 镜${aborted ? `；当前镜已中断等待${CANCEL_NOTE}` : ''}。`
          : `批量出图完成，共 ${done} 镜。`,
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

  deleteProject: async (key) => {
    if (!key) return
    set({ error: null, notice: null })
    try {
      await api.deleteProject({ key })
      // 删的是当前打开的项目 → 清空 current/currentKey，回到无项目状态。
      if (get().currentKey === key) {
        set({ current: null, currentKey: null })
      }
      set({ notice: '已删除项目。' })
      await get().loadProjects()
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  updateSettings: async (input) => {
    const key = get().currentKey
    if (!key) return false
    set({ error: null, notice: null })
    try {
      const { project } = await api.updateProjectSettings({ key, ...input })
      if (get().currentKey === key) {
        set({ current: project, notice: '项目设置已保存。' })
      }
      // 项目名/集号显示在顶栏下拉里，顺手刷新列表
      await get().loadProjects()
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
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
    const name = get().current?.characters.find((c) => c.id === characterId)?.name || characterId
    if (!window.confirm(`删除角色「${name}」？它的参考图和分镜里的引用都会清掉，不可撤销。`)) return
    try {
      const { project } = await api.deleteCharacter({ key, characterId })
      set({ current: project, notice: `已删除角色 ${name}。` })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  deleteCharacterRef: async (characterId, refId) => {
    const key = get().currentKey
    if (!key) return
    try {
      const { project } = await api.deleteCharacterRef({ key, characterId, refId })
      set({ current: project, notice: '已删除参考图，已移入回收站。' })
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

  reorderCharacterRefs: async (characterId, orderedRefIds) => {
    const key = get().currentKey
    if (!key) return
    try {
      const { project } = await api.reorderCharacterRefs({ key, characterId, orderedRefIds })
      set({ current: project })
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

  deleteBaseCandidate: async (characterId, cand) => {
    const key = get().currentKey
    if (!key) return
    if (!window.confirm('删除这张候选图？（候选已持久化，删除后不可恢复）')) return
    try {
      // 旧字符串候选按 url 删；新对象候选按 candidateId 删。
      const { project } = await api.deleteCharacterBaseCandidate(
        typeof cand === 'string'
          ? { key, characterId, url: cand }
          : { key, characterId, candidateId: cand.id },
      )
      set({ current: project })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  // ---- 多形象 / 参考图属性 / 批量删除 ----
  upsertCharacterForm: async (characterId, input) => {
    const key = get().currentKey
    if (!key) return
    set({ error: null })
    try {
      const { project } = await api.upsertCharacterForm({ key, characterId, ...input })
      set({ current: project })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  // 不在这里 confirm：UI 层做，因为确认文案要带形象名（store 里再查一遍是重复劳动）。
  // 返回是否成功：服务器 500 时调用方不该把 activeFormId 重置回 default（形象根本没删掉）。
  deleteCharacterForm: async (characterId, formId) => {
    const key = get().currentKey
    if (!key) return false
    set({ error: null })
    try {
      const { project } = await api.deleteCharacterForm({ key, characterId, formId })
      set({ current: project, notice: '已删除形象，其参考图已移入回收站。' })
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  updateCharacterRef: async (characterId, refId, patch) => {
    const key = get().currentKey
    if (!key) return false
    set({ error: null })
    try {
      const { project } = await api.updateCharacterRef({ key, characterId, refId, ...patch })
      set({ current: project })
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  deleteCharacterRefs: async (characterId, refIds) => {
    const key = get().currentKey
    if (!key) return false
    set({ error: null })
    try {
      const { project } = await api.deleteCharacterRefs({ key, characterId, refIds })
      set({ current: project, notice: `已删除 ${refIds.length} 张参考图，已移入回收站。` })
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },
}))
