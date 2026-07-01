import { create } from 'zustand'
import { api, fileToDataUrl } from '@/lib/api'
import { builtInStylePresets, purposePresets } from '@/data/presets'
import type {
  AppConfig,
  AppSettings,
  AuxiliaryInput,
  GeneratedImage,
  GenerateParams,
  ProfileInput,
  ReferenceImageInput,
  SavedItem,
  TestResult,
} from '@/types'

export interface RefItem {
  id: string
  name: string
  dataUrl?: string
  url?: string
}

export interface FormState {
  prompt: string
  negativePrompt: string
  purpose: string
  style: string
  model: string
  size: string
  quality: string
  count: number
  outputFormat: string
  background: string
  outputCompression: number
}

const DEFAULT_FORM: FormState = {
  prompt: '',
  negativePrompt: '',
  purpose: 'free',
  style: 'none',
  model: '',
  size: '2160x3840',
  quality: 'high',
  count: 1,
  outputFormat: 'png',
  background: 'auto',
  outputCompression: 85,
}

// 与旧版一致：把已存风格（saved:<id>）解析成创作方向。内置风格走 presets。
function getSavedStyleText(item: SavedItem): string {
  return String(item.styleText || item.text || '').trim()
}

function buildSavedStyleGuidance(item: SavedItem): string[] {
  const strength = item.strength || 'medium'
  const lines = [
    "Apply the following visual style DNA to the user's subject only.",
    'Do not copy the original reference subject, face, clothing, pose, scene, story, text, logo, or specific objects.',
  ]
  if (strength !== 'low') {
    lines.push("Preserve the user's subject and composition priority; use the style as visual language, not content.")
  }
  lines.push(`Style DNA:\n${getSavedStyleText(item)}`)
  if (item.negativeText) {
    lines.push(`Style negatives / avoid:\n${item.negativeText}`)
  }
  if (strength === 'high') {
    lines.push('Use any attached style reference images for style only; ignore their subject matter.')
  }
  return lines
}

function resolveStyleGuidance(styleKey: string, savedStyles: SavedItem[]): string[] {
  if (styleKey.startsWith('saved:')) {
    const id = styleKey.slice('saved:'.length)
    const item = savedStyles.find((s) => s.id === id)
    return item ? buildSavedStyleGuidance(item) : []
  }
  return builtInStylePresets[styleKey]?.guidance || []
}

// 高强度的已存风格，把它的参考图也作为参考图发送（保持风格的硬约束）。
function savedStyleReferences(styleKey: string, savedStyles: SavedItem[]): ReferenceImageInput[] {
  if (!styleKey.startsWith('saved:')) return []
  const id = styleKey.slice('saved:'.length)
  const item = savedStyles.find((s) => s.id === id)
  if (!item || item.strength !== 'high') return []
  return (item.referenceImages || [])
    .map((r) => ({ name: r.name, dataUrl: r.dataUrl, url: r.url, source: 'saved-style-reference' }))
    .filter((r) => r.dataUrl || r.url)
}

// 与旧版 composePrompt 一致：把用户提示词 + 用途/风格创作方向 + 硬性要求 + 负面拼成最终提示词。
export function composePrompt(form: FormState, savedStyles: SavedItem[] = []): string {
  const userText = form.prompt.trim()
  const purpose = purposePresets[form.purpose] || purposePresets.free
  const styleGuidance = resolveStyleGuidance(form.style, savedStyles)
  const lines = [userText]
  const creative = [...(purpose.guidance || []), ...styleGuidance]
  if (creative.length) {
    lines.push('', 'Creative direction:', ...creative.map((p) => `- ${p}`))
  }
  if ((purpose.requirements || []).length) {
    lines.push('', 'Hard requirements:', ...(purpose.requirements || []).map((p) => `- ${p}`))
  }
  const neg = form.negativePrompt.trim()
  if (neg) {
    lines.push(
      '',
      'Negative prompt / avoid:',
      ...neg.split(/\n+/).map((p) => `- ${p.trim()}`).filter((p) => p !== '- '),
    )
  }
  return lines.join('\n')
}

// 样图分析「提示词」模式返回「提示词：…/反向提示词：…」，拆出来回填表单。
export function parseAnalysisPrompt(text: string): { prompt: string; negative: string } {
  const promptMatch = text.match(/提示词[:：]\s*([\s\S]*?)(?:\n\s*反向提示词|$)/)
  const negMatch = text.match(/反向提示词[:：]\s*([\s\S]*)$/)
  return {
    prompt: (promptMatch?.[1] || text).trim(),
    negative: (negMatch?.[1] || '').trim(),
  }
}

interface GeneratorState {
  config: AppConfig | null
  configError: string | null

  form: FormState
  setForm: (patch: Partial<FormState>) => void

  refs: RefItem[]
  addRefFiles: (files: FileList | File[]) => Promise<void>
  addRefFromImage: (img: GeneratedImage) => void
  removeRef: (id: string) => void
  clearRefs: () => void

  generating: boolean
  optimizing: boolean
  notice: string | null
  error: string | null
  lastBatch: GeneratedImage[]

  // 提示词库 / 最近 / 风格库
  savedPrompts: SavedItem[]
  recentPrompts: SavedItem[]
  savedStyles: SavedItem[]

  // 样图分析
  analysisImages: RefItem[]
  analysisMode: string
  analysisBusy: boolean
  analysisResult: string | null

  gallery: GeneratedImage[]
  page: number
  totalPages: number
  total: number
  galleryLoading: boolean

  // 设置
  settings: AppSettings | null
  settingsOpen: boolean
  settingsBusy: boolean
  testResult: TestResult | null

  loadConfig: () => Promise<void>
  generate: () => Promise<void>
  optimize: (mode: string) => Promise<void>
  reroll: (img: GeneratedImage) => void
  loadGallery: (page?: number) => Promise<void>
  deleteImage: (id: string) => Promise<void>

  // 提示词库 / 最近 / 风格库
  refreshCollections: () => Promise<void>
  savePromptItem: (name: string) => Promise<void>
  applyPromptItem: (item: SavedItem) => void
  removeSavedPrompt: (id: string) => Promise<void>
  removeRecentPrompt: (id: string) => Promise<void>
  removeSavedStyle: (id: string) => Promise<void>

  // 样图分析
  addAnalysisFiles: (files: FileList | File[]) => Promise<void>
  removeAnalysisImage: (id: string) => void
  clearAnalysis: () => void
  setAnalysisMode: (mode: string) => void
  runAnalysis: () => Promise<void>
  useAnalysisAsPrompt: () => void
  saveAnalysisAsStyle: (name: string, strength: string) => Promise<void>

  openSettings: () => void
  closeSettings: () => void
  loadSettings: () => Promise<void>
  saveProfile: (input: ProfileInput) => Promise<void>
  setActiveProfile: (id: string) => Promise<void>
  removeProfile: (id: string) => Promise<void>
  testConnection: (input: { profileId?: string; apiKey?: string; baseUrl?: string }) => Promise<void>

  // 辅助 API（优化/分析）
  auxModels: string[]
  auxModelsBusy: boolean
  auxModelsError: string | null
  saveAuxiliary: (input: AuxiliaryInput) => Promise<void>
  setActiveAuxiliary: (id: string) => Promise<void>
  removeAuxiliary: (id: string) => Promise<void>
  listAuxModels: (input: { useActiveProfile?: boolean; apiKey?: string; baseUrl?: string }) => Promise<void>
}

let refSeq = 0

function pickCollections(s: AppSettings) {
  return {
    savedPrompts: s.savedPrompts || [],
    recentPrompts: s.recentPrompts || [],
    savedStyles: s.savedStyles || [],
  }
}

export const useGenerator = create<GeneratorState>((set, get) => ({
  config: null,
  configError: null,

  form: DEFAULT_FORM,
  setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),

  refs: [],
  addRefFiles: async (files) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const items: RefItem[] = []
    for (const f of list) {
      const dataUrl = await fileToDataUrl(f)
      items.push({ id: `ref-${Date.now()}-${refSeq++}`, name: f.name, dataUrl })
    }
    set((s) => ({ refs: [...s.refs, ...items].slice(0, 16) }))
  },
  addRefFromImage: (img) =>
    set((s) => {
      if (s.refs.some((r) => r.url === img.url)) return s
      return {
        refs: [
          ...s.refs,
          { id: `ref-${Date.now()}-${refSeq++}`, name: img.id, url: img.url },
        ].slice(0, 16),
        notice: '已设为参考图。',
      }
    }),
  removeRef: (id) => set((s) => ({ refs: s.refs.filter((r) => r.id !== id) })),
  clearRefs: () => set({ refs: [] }),

  generating: false,
  optimizing: false,
  notice: null,
  error: null,
  lastBatch: [],

  savedPrompts: [],
  recentPrompts: [],
  savedStyles: [],

  analysisImages: [],
  analysisMode: 'prompt',
  analysisBusy: false,
  analysisResult: null,

  gallery: [],
  page: 1,
  totalPages: 1,
  total: 0,
  galleryLoading: false,

  settings: null,
  settingsOpen: false,
  settingsBusy: false,
  testResult: null,

  auxModels: [],
  auxModelsBusy: false,
  auxModelsError: null,

  loadConfig: async () => {
    try {
      const config = await api.getConfig()
      set((s) => ({
        config,
        configError: null,
        form: s.form.model ? s.form : { ...s.form, model: config.defaultModel },
      }))
    } catch (e) {
      set({ configError: (e as Error).message })
    }
    await get().refreshCollections()
  },

  refreshCollections: async () => {
    try {
      const settings = await api.getSettings()
      set({ settings, ...pickCollections(settings) })
    } catch {
      // 设置拉取失败不阻塞生图主流程
    }
  },

  generate: async () => {
    const { form, refs, savedStyles } = get()
    if (!form.prompt.trim()) {
      set({ error: '先写一句画面提示词。' })
      return
    }
    set({ generating: true, error: null, notice: null })
    const styleRefs = savedStyleReferences(form.style, savedStyles)
    const body: GenerateParams = {
      prompt: composePrompt(form, savedStyles),
      negativePrompt: form.negativePrompt.trim() || undefined,
      model: form.model.trim() || undefined,
      size: form.size,
      quality: form.quality,
      count: form.count,
      outputFormat: form.outputFormat,
      background: form.background,
      outputCompression: form.outputCompression,
      referenceImages: [
        ...refs.map((r) => ({
          name: r.name,
          dataUrl: r.dataUrl,
          url: r.url,
          source: 'reference',
        })),
        ...styleRefs,
      ],
    }
    try {
      const result = await api.generate(body)
      set({
        lastBatch: result.images,
        notice: `已生成 ${result.images.length} 张，批次 ${result.batchId}。`,
      })
      await get().loadGallery(1)
      // 记一笔「最近用过」（失败不影响出图）。
      try {
        const settings = await api.saveRecentPrompt({
          text: form.prompt.trim(),
          negativeText: form.negativePrompt.trim() || undefined,
        })
        set(pickCollections(settings))
      } catch {
        /* ignore */
      }
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ generating: false })
    }
  },

  optimize: async (mode) => {
    const { form } = get()
    if (!form.prompt.trim()) {
      set({ error: '先写点提示词再优化。' })
      return
    }
    set({ optimizing: true, error: null, notice: null })
    try {
      const r = await api.optimizePrompt({
        prompt: form.prompt.trim(),
        negativePrompt: form.negativePrompt.trim() || undefined,
        mode,
      })
      const optimized = (r.optimizedPrompt || r.text || '').trim()
      if (!optimized) {
        set({ notice: '优化没有返回内容。' })
        return
      }
      set((s) => ({
        form: {
          ...s.form,
          prompt: optimized,
          negativePrompt: (r.negativePrompt || '').trim() || s.form.negativePrompt,
        },
        notice: '已用辅助 API 优化提示词。',
      }))
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ optimizing: false })
    }
  },

  reroll: (img) => {
    const r = img.request || {}
    set((s) => ({
      form: {
        ...s.form,
        prompt: r.prompt ?? img.prompt ?? s.form.prompt,
        negativePrompt: r.negativePrompt ?? '',
        model: r.model ?? s.form.model,
        size: r.size ?? s.form.size,
        quality: r.quality ?? s.form.quality,
        count: r.n ?? s.form.count,
        outputFormat: r.output_format ?? s.form.outputFormat,
        background: r.background ?? s.form.background,
        outputCompression: r.output_compression ?? s.form.outputCompression,
      },
      notice: '已载入该图参数，可直接「生成图片」重 Roll。',
    }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },

  loadGallery: async (page = 1) => {
    set({ galleryLoading: true })
    try {
      const data = await api.listImages(page, 24)
      set({
        gallery: data.images,
        page: data.page,
        totalPages: data.totalPages,
        total: data.total,
      })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ galleryLoading: false })
    }
  },

  deleteImage: async (id) => {
    try {
      await api.deleteImages([id])
      set((s) => ({
        gallery: s.gallery.filter((g) => g.id !== id),
        lastBatch: s.lastBatch.filter((g) => g.id !== id),
        total: Math.max(0, s.total - 1),
      }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  savePromptItem: async (name) => {
    const { form } = get()
    const text = form.prompt.trim()
    if (!text) {
      set({ error: '提示词空的，没法收藏。' })
      return
    }
    try {
      const settings = await api.saveSavedPrompt({
        name: name.trim() || text.slice(0, 16),
        text,
        negativeText: form.negativePrompt.trim() || undefined,
      })
      set({ ...pickCollections(settings), notice: '已收藏当前提示词。' })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  applyPromptItem: (item) => {
    set((s) => ({
      form: { ...s.form, prompt: item.text || '', negativePrompt: item.negativeText || '' },
      notice: `已载入「${item.name}」。`,
    }))
  },

  removeSavedPrompt: async (id) => {
    try {
      const settings = await api.deleteSavedPrompt(id)
      set(pickCollections(settings))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  removeRecentPrompt: async (id) => {
    try {
      const settings = await api.deleteRecentPrompt(id)
      set(pickCollections(settings))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  removeSavedStyle: async (id) => {
    try {
      const settings = await api.deleteSavedStyle(id)
      set((s) => ({
        ...pickCollections(settings),
        // 删掉的风格如果正被选中，回落到 none。
        form: s.form.style === `saved:${id}` ? { ...s.form, style: 'none' } : s.form,
      }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  addAnalysisFiles: async (files) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const items: RefItem[] = []
    for (const f of list) {
      const dataUrl = await fileToDataUrl(f)
      items.push({ id: `an-${Date.now()}-${refSeq++}`, name: f.name, dataUrl })
    }
    set((s) => ({ analysisImages: [...s.analysisImages, ...items].slice(0, 8) }))
  },

  removeAnalysisImage: (id) =>
    set((s) => ({ analysisImages: s.analysisImages.filter((r) => r.id !== id) })),

  clearAnalysis: () => set({ analysisImages: [], analysisResult: null }),

  setAnalysisMode: (mode) => set({ analysisMode: mode }),

  runAnalysis: async () => {
    const { analysisImages, analysisMode } = get()
    if (analysisImages.length === 0) {
      set({ error: '先上传要分析的样图。' })
      return
    }
    set({ analysisBusy: true, error: null, notice: null, analysisResult: null })
    try {
      const r = await api.analyzeImage({
        images: analysisImages.map((a) => ({ name: a.name, dataUrl: a.dataUrl, url: a.url })),
        mode: analysisMode,
      })
      set({ analysisResult: r.text, notice: `已分析 ${analysisImages.length} 张样图。` })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ analysisBusy: false })
    }
  },

  useAnalysisAsPrompt: () => {
    const { analysisResult, analysisMode } = get()
    if (!analysisResult) return
    if (analysisMode === 'prompt') {
      const { prompt, negative } = parseAnalysisPrompt(analysisResult)
      set((s) => ({
        form: { ...s.form, prompt, negativePrompt: negative || s.form.negativePrompt },
        notice: '已把分析结果填入提示词。',
      }))
    } else {
      set((s) => ({ form: { ...s.form, prompt: analysisResult }, notice: '已把分析结果填入提示词。' }))
    }
  },

  saveAnalysisAsStyle: async (name, strength) => {
    const { analysisResult, analysisImages } = get()
    if (!analysisResult) {
      set({ error: '先分析出风格文本，再保存。' })
      return
    }
    try {
      const settings = await api.saveSavedStyle({
        name: name.trim() || '未命名风格',
        text: analysisResult,
        styleText: analysisResult,
        strength,
        referenceImages: analysisImages
          .filter((a) => a.dataUrl)
          .map((a) => ({ name: a.name, dataUrl: a.dataUrl, source: 'style-reference' })),
      })
      set({
        ...pickCollections(settings),
        notice:
          strength === 'high'
            ? '风格已保存（高强度，调用时样图会作为参考图发送）。'
            : '风格已保存，可在「风格」下拉里选用。',
      })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  openSettings: () => {
    set({ settingsOpen: true, testResult: null })
    get().loadSettings()
  },
  closeSettings: () => set({ settingsOpen: false, testResult: null }),

  loadSettings: async () => {
    try {
      const settings = await api.getSettings()
      set({ settings, ...pickCollections(settings) })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  saveProfile: async (input) => {
    set({ settingsBusy: true, testResult: null })
    try {
      const settings = await api.saveProfile(input)
      set({ settings })
      await get().loadConfig()
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ settingsBusy: false })
    }
  },

  setActiveProfile: async (id) => {
    const profile = get().settings?.profiles.find((p) => p.id === id)
    if (!profile) return
    await get().saveProfile({
      profileId: profile.id,
      name: profile.name,
      baseUrl: profile.baseUrl,
      imageModel: profile.imageModel,
      endpointMode: profile.endpointMode,
      setActive: true,
    })
  },

  removeProfile: async (id) => {
    set({ settingsBusy: true })
    try {
      const settings = await api.deleteProfile(id)
      set({ settings })
      await get().loadConfig()
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ settingsBusy: false })
    }
  },

  testConnection: async (input) => {
    set({ settingsBusy: true, testResult: null })
    try {
      const testResult = await api.testConnection(input)
      set({ testResult })
    } catch (e) {
      set({ testResult: { ok: false, error: (e as Error).message } })
    } finally {
      set({ settingsBusy: false })
    }
  },

  saveAuxiliary: async (input) => {
    set({ settingsBusy: true })
    try {
      const settings = await api.saveAuxiliary(input)
      set({ settings, notice: '辅助 API 已保存。' })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ settingsBusy: false })
    }
  },

  setActiveAuxiliary: async (id) => {
    const profile = get().settings?.auxiliaryProfiles?.find((p) => p.id === id)
    if (!profile) return
    await get().saveAuxiliary({
      profileId: profile.id,
      name: profile.name,
      useActiveProfile: profile.useActiveProfile,
      baseUrl: profile.baseUrl,
      model: profile.model,
      setActive: true,
    })
  },

  removeAuxiliary: async (id) => {
    set({ settingsBusy: true })
    try {
      const settings = await api.deleteAuxiliary(id)
      set({ settings })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ settingsBusy: false })
    }
  },

  listAuxModels: async (input) => {
    set({ auxModelsBusy: true, auxModelsError: null, auxModels: [] })
    try {
      const r = await api.listAuxiliaryModels(input)
      if (r.ok) {
        set({ auxModels: r.models })
      } else {
        set({ auxModelsError: r.error || '拉取模型失败', auxModels: [] })
      }
    } catch (e) {
      set({ auxModelsError: (e as Error).message })
    } finally {
      set({ auxModelsBusy: false })
    }
  },
}))
