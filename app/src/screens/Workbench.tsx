import { useEffect, useState } from 'react'
import { useWorkbench } from '@/store/workbench'
import Lightbox from '@/components/Lightbox'
import { openPrompt, openPromptFields } from '@/components/PromptDialog'
import { api } from '@/lib/api'
import CharacterCard from './workbench/CharacterCard'
import type { ProjectCharacter, ProjectShot } from '@/types'

function ShotEditor({
  shot,
  characters,
  onDone,
}: {
  shot: ProjectShot
  characters: ProjectCharacter[]
  onDone: () => void
}) {
  const upsertShot = useWorkbench((s) => s.upsertShot)
  const [shotId, setShotId] = useState(shot.shotId)
  const [prompt, setPrompt] = useState(shot.prompt || '')
  const [negative, setNegative] = useState(shot.negative || '')
  const [ids, setIds] = useState<string[]>(shot.characterIds || [])
  // charId → formId 的出场形象选择；只记非 default，缺省即主形象
  const [formSel, setFormSel] = useState<Record<string, string>>(shot.characterForms || {})

  function toggle(id: string) {
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }
  async function save() {
    // 后端对 characterForms 是整体替换语义，所以总是传（哪怕空对象）——
    // 不传的话取消选择的形象清不掉。default 不落库，缺省 = 主形象。
    const characterForms: Record<string, string> = {}
    for (const id of ids) {
      if (formSel[id] && formSel[id] !== 'default') characterForms[id] = formSel[id]
    }
    await upsertShot(
      { shotId: shotId.trim() || undefined, prompt, negative, characterIds: ids, characterForms },
      shot.shotId,
    )
    onDone()
  }

  return (
    <div className="space-y-2 rounded border border-line bg-black/20 p-2">
      <label className="block text-[11px] text-neutral-500">
        镜号
        <input value={shotId} onChange={(e) => setShotId(e.target.value)} className="w-full text-xs mt-0.5" />
      </label>
      <label className="block text-[11px] text-neutral-500">
        提示词
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="这一镜的画面提示词——补上它「生成」才可用"
          className="w-full text-xs mt-0.5"
        />
      </label>
      <label className="block text-[11px] text-neutral-500">
        反向提示词（可空，空则用全局）
        <input value={negative} onChange={(e) => setNegative(e.target.value)} className="w-full text-xs mt-0.5" />
      </label>
      <div>
        <p className="text-[11px] text-neutral-500 mb-1">出场角色（勾选后出图自动挂其锚点底图；多形象角色可选出场形象）</p>
        {characters.length === 0 ? (
          <p className="text-[11px] text-neutral-600">还没有角色，先去左侧人设库加。</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {characters.map((c) => {
              const on = ids.includes(c.id)
              // 只有多形象角色（存在非 default 形象）才给下拉；单形象没得选，不渲染
              const multiForm = (c.forms || []).some((f) => f.id !== 'default')
              const defaultName = (c.forms || []).find((f) => f.id === 'default')?.name || '主形象'
              return (
                <span key={c.id} className="flex items-center gap-1">
                  <button
                    onClick={() => toggle(c.id)}
                    className={`text-[11px] px-2 py-0.5 rounded border ${
                      on
                        ? 'bg-accent/25 text-emerald-200 border-emerald-800'
                        : 'text-neutral-400 border-line hover:border-accent-soft'
                    }`}
                  >
                    {on ? '✓ ' : ''}
                    {c.name}
                  </button>
                  {on && multiForm && (
                    <select
                      value={formSel[c.id] || 'default'}
                      onChange={(e) => setFormSel((cur) => ({ ...cur, [c.id]: e.target.value }))}
                      title="出场形象"
                      className="text-[11px]"
                    >
                      <option value="default">{defaultName}</option>
                      {(c.forms || [])
                        .filter((f) => f.id !== 'default')
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                    </select>
                  )}
                </span>
              )
            })}
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onDone} className="text-[11px] text-neutral-400 hover:text-neutral-200">
          取消
        </button>
        <button onClick={save} className="text-[11px] px-2 py-0.5 rounded bg-accent text-white hover:bg-accent-soft">
          保存
        </button>
      </div>
    </div>
  )
}

function ShotCard({
  shot,
  count,
  characters,
}: {
  shot: ProjectShot
  count: number
  characters: ProjectCharacter[]
}) {
  const current = useWorkbench((s) => s.current)
  const shotBusy = useWorkbench((s) => s.shotBusy[shot.shotId])
  const batchRunning = useWorkbench((s) => s.batchRunning)
  const generateShot = useWorkbench((s) => s.generateShot)
  const cancelShot = useWorkbench((s) => s.cancelShot)
  const chooseCandidate = useWorkbench((s) => s.chooseCandidate)
  const deleteCandidate = useWorkbench((s) => s.deleteCandidate)
  const deleteShot = useWorkbench((s) => s.deleteShot)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  // 放大审片：候选点击主体仍是定稿/取消，⤢ 才是放大（Lightbox 可左右切换同镜候选）
  const [zoom, setZoom] = useState<number | null>(null)
  const render = current?.renders?.find((r) => r.shotId === shot.shotId)
  // 出图预检：以后端实际行为为准（server.js generateProjectShot 的 FALLBACK-GAP 修复后，
  // 回退链是 该形象锚点→该形象第一张→default形象锚点→default形象第一张→全局兜底
  // (角色任意形象的锚点/第一张)——只要角色 referenceImages 整体不为空，出图就一定会挂上
  // 一张参考图。真正「出图不会挂参考」只有角色完全没图这一种情况，才亮强警示。
  const missing = shot.characterIds
    .map((cid) => characters.find((x) => x.id === cid))
    .filter((c): c is ProjectCharacter => !!c)
    .filter((c) => (c.referenceImages || []).length === 0)
  // 二级弱提示：角色有图，但所选形象组（缺省 default）本身没图——不算「未锁底图」，后端
  // 兜底会挂该角色其他形象的参考图，只是可能不是这一镜想要的那个形象，弱提示即可。
  const formEmpty = shot.characterIds
    .map((cid) => characters.find((x) => x.id === cid))
    .filter((c): c is ProjectCharacter => !!c)
    .filter((c) => (c.referenceImages || []).length > 0)
    .filter((c) => {
      const formId = shot.characterForms?.[c.id] || 'default'
      return !(c.referenceImages || []).some((r) => (r.formId || 'default') === formId)
    })

  return (
    <div className="rounded-lg border border-line bg-panel p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-mono text-neutral-200">{shot.shotId}</span>
        {shot.shotType && <span className="text-xs text-neutral-500">{shot.shotType}</span>}
        {shot.characterIds.map((cid) => {
          const c = characters.find((x) => x.id === cid)
          return (
            <span key={cid} className="text-[11px] px-1.5 py-0.5 rounded bg-accent/20 text-emerald-200 border border-emerald-900/40">
              {c?.name || cid}
            </span>
          )
        })}
        {render?.chosenImageId && (
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-700/30 text-emerald-200">✓ 已定稿</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!shot.prompt && <span className="text-[11px] text-amber-400">无提示词</span>}
          {missing.length > 0 && (
            <span
              className="text-[11px] text-amber-400"
              title={'未锁底图：' + missing.map((c) => c.name).join('、')}
            >
              ⚠ {missing.length} 角色未锁底图
            </span>
          )}
          {formEmpty.length > 0 && (
            <span
              className="text-[11px] text-neutral-500"
              title={'该形象无图，出图将回退挂该角色其他形象的参考图：' + formEmpty.map((c) => c.name).join('、')}
            >
              ℹ {formEmpty.length} 角色形象无图
            </span>
          )}
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-[11px] text-neutral-400 hover:text-neutral-200"
          >
            {editing ? '收起' : '编辑'}
          </button>
          <button
            onClick={() => deleteShot(shot.shotId)}
            className="text-[11px] text-red-400/80 hover:text-red-300"
          >
            删除
          </button>
          {shotBusy && batchRunning ? (
            // 批量跑到这一镜：中断请用顶栏「停止」（会一并 abort 当前镜）。
            <button
              disabled
              className="text-xs px-3 py-1.5 rounded bg-accent text-white opacity-40 cursor-not-allowed"
            >
              出图中…
            </button>
          ) : shotBusy ? (
            <button
              onClick={() => cancelShot(shot.shotId)}
              title="中断等待（服务端可能仍在完成本次生成并计费）"
              className="text-xs px-3 py-1.5 rounded border border-red-900/60 text-red-300 hover:bg-red-950/40"
            >
              取消出图
            </button>
          ) : (
            <button
              disabled={batchRunning || !shot.prompt}
              onClick={() => generateShot(shot.shotId, count)}
              title={!shot.prompt ? '先「编辑」补上提示词' : ''}
              className="text-xs px-3 py-1.5 rounded bg-accent hover:bg-accent-soft text-white disabled:opacity-40"
            >
              生成 {count} 张
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <ShotEditor shot={shot} characters={characters} onDone={() => setEditing(false)} />
      ) : shot.prompt ? (
        <p
          className={`text-xs text-neutral-400 cursor-pointer ${open ? '' : 'line-clamp-2'}`}
          onClick={() => setOpen((v) => !v)}
          title="点击展开/收起"
        >
          {shot.prompt}
        </p>
      ) : (
        <p className="text-xs text-neutral-600 italic">这一镜还没提示词，点「编辑」补上。</p>
      )}

      {render && render.candidates.length > 0 && (
        <>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {render.candidates.map((cand, i) => {
              const chosen = render.chosenImageId === cand.imageId
              return (
                <div key={cand.imageId} className="relative group">
                  <button
                    onClick={() => chooseCandidate(shot.shotId, chosen ? undefined : cand.imageId)}
                    className={`block w-full rounded overflow-hidden border-2 ${
                      chosen ? 'border-emerald-400' : 'border-transparent hover:border-line'
                    }`}
                    title={chosen ? '取消定稿' : '设为定稿'}
                  >
                    <img src={cand.file} alt="" className="w-full aspect-[3/4] object-cover" />
                    {chosen && (
                      <span className="absolute top-1 left-1 text-[10px] px-1 rounded bg-emerald-500 text-black">✓</span>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setZoom(i)
                    }}
                    title="放大查看"
                    className="absolute top-1 right-6 text-[11px] w-4 h-4 leading-none rounded bg-black/70 text-neutral-200 opacity-0 group-hover:opacity-100 hover:bg-black/90"
                  >
                    ⤢
                  </button>
                  <button
                    onClick={() => deleteCandidate(shot.shotId, cand.imageId)}
                    title="删除这张候选"
                    className="absolute top-1 right-1 text-[11px] w-4 h-4 leading-none rounded bg-black/70 text-red-300 opacity-0 group-hover:opacity-100 hover:bg-red-900/80"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
          {zoom !== null && (
            <Lightbox
              images={render.candidates.map((c) => ({ id: c.imageId, url: c.file, createdAt: c.createdAt }))}
              index={Math.min(zoom, render.candidates.length - 1)}
              onIndexChange={setZoom}
              onClose={() => setZoom(null)}
            />
          )}
        </>
      )}
    </div>
  )
}

// 项目设置弹层：项目名/集号/风格锁定句/通用负面/默认生图参数。
// 视觉复用 SettingsModal 的弹层风格（遮罩 + bg-ink 面板）。
// 尺寸/模型留空 = 不改（后端同语义）；保存成功才关闭，失败在弹层内显示错误。
function ProjectSettingsModal({ onClose }: { onClose: () => void }) {
  const current = useWorkbench((s) => s.current)
  const updateSettings = useWorkbench((s) => s.updateSettings)
  const error = useWorkbench((s) => s.error)
  const [name, setName] = useState(current?.project.name || '')
  const [episode, setEpisode] = useState(current?.episode || '')
  const [lockPhrase, setLockPhrase] = useState(current?.style?.lockPhrase || '')
  const [globalNegative, setGlobalNegative] = useState(current?.style?.globalNegative || '')
  const [size, setSize] = useState(current?.defaults?.size || '')
  const [model, setModel] = useState(current?.defaults?.model || '')
  const [attach, setAttach] = useState(current?.defaults?.attachCharacterRefs !== false)
  const [saving, setSaving] = useState(false)

  if (!current) return null

  async function save() {
    setSaving(true)
    const ok = await updateSettings({
      name: name.trim(),
      episode: episode.trim(),
      style: { lockPhrase, globalNegative },
      defaults: { size: size.trim(), model: model.trim(), attachCharacterRefs: attach },
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-ink border border-line rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-100">项目设置</h2>
          <button className="text-neutral-400 hover:text-neutral-200" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11px] text-neutral-500">
            项目名
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full text-xs mt-0.5" />
          </label>
          <label className="block text-[11px] text-neutral-500">
            集号（可空）
            <input
              value={episode}
              onChange={(e) => setEpisode(e.target.value)}
              placeholder="如 S01E01"
              className="w-full text-xs mt-0.5"
            />
          </label>
        </div>
        <p className="text-[11px] text-neutral-600">改名只改显示，磁盘目录（项目 key）不变。</p>

        <label className="block text-[11px] text-neutral-500">
          风格锁定句（生成角色基准图时拼进提示词，统一全片画风）
          <textarea
            value={lockPhrase}
            onChange={(e) => setLockPhrase(e.target.value)}
            rows={3}
            placeholder="如：国漫厚涂风格，电影感打光，高细节…"
            className="w-full text-xs mt-0.5"
          />
          <p className="text-[10px] text-neutral-500 mt-0.5">全项目画风，不是角色外貌——角色外貌写在人设库各形象的「外貌锚点句」里。</p>
        </label>
        <label className="block text-[11px] text-neutral-500">
          通用负面（分镜没写反向词时用它）
          <textarea
            value={globalNegative}
            onChange={(e) => setGlobalNegative(e.target.value)}
            rows={2}
            placeholder="如：文字、水印、畸形手指…"
            className="w-full text-xs mt-0.5"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11px] text-neutral-500">
            默认尺寸
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="宽x高，如 2160x3840"
              className="w-full text-xs mt-0.5"
            />
          </label>
          <label className="block text-[11px] text-neutral-500">
            默认模型
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="如 gpt-image-2"
              className="w-full text-xs mt-0.5"
            />
          </label>
        </div>
        <p className="text-[11px] text-neutral-600">
          gpt-image-2 尺寸约束：宽高都是 16 的倍数、单边 ≤3840、总像素 ≤829 万；留空 = 不改。
        </p>

        <label className="flex items-center gap-2 text-xs text-neutral-300">
          <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
          出图时自动挂出场角色的锚点参考图
        </label>

        {error && <p className="text-xs text-red-300">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded border border-line text-neutral-300 hover:text-neutral-100">
            取消
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded bg-accent hover:bg-accent-soft text-white disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

// 人设库标题行的回收站入口：显示当前项目回收站（.trash 目录）占用，可一键清空。
// 计数拉取失败保持静默——回收站只是辅助信息，不值得打断主流程报错。
function TrashButton() {
  const currentKey = useWorkbench((s) => s.currentKey)
  const current = useWorkbench((s) => s.current)
  const [info, setInfo] = useState<{ count: number; bytes: number } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!currentKey) {
      setInfo(null)
      return
    }
    // 请求发出后项目可能已切换（甚至又切回来）：ignore 标志防止晚到的响应覆盖当前项目的计数
    // ——A 项目删图触发请求后立刻切到 B，A 的响应后到会把按钮/confirm 显示成 A 的条数，
    // 清空却清的是 B 的 .trash，不可恢复。
    let ignore = false
    api
      .getProjectTrashInfo({ key: currentKey })
      .then((r) => {
        if (ignore) return
        setInfo({ count: r.count, bytes: r.bytes })
      })
      .catch(() => {
        if (!ignore) setInfo(null)
      })
    return () => {
      ignore = true
    }
    // 刻意依赖 current 引用：删参考图/形象后 store 会换新的 current 对象，
    // 这里跟着重新拉一次，计数自动跟上，不用手动刷新。
  }, [currentKey, current])

  function fmt(bytes: number) {
    return bytes >= 0.1 * 1024 * 1024
      ? (bytes / 1048576).toFixed(1) + ' MB'
      : Math.max(1, Math.ceil(bytes / 1024)) + ' KB'
  }

  async function empty() {
    if (!currentKey || !info || info.count === 0 || busy) return
    const key = currentKey
    if (
      !window.confirm(
        `清空回收站？共 ${info.count} 项 ${fmt(info.bytes)}，清空后不可恢复。\n（想找回个别文件可在清空前打开项目文件夹的 .trash 目录）`,
      )
    )
      return
    setBusy(true)
    try {
      await api.emptyProjectTrash({ key })
      const r = await api.getProjectTrashInfo({ key })
      // 清空/复查这段 await 期间项目可能已切换：只在仍是发起清空时的那个项目才落计数/提示，
      // 不然会把 B 项目的按钮覆盖成「已清空」，或者把 A 的错误 setInfo 到 B 头上。
      if (useWorkbench.getState().currentKey === key) {
        setInfo({ count: r.count, bytes: r.bytes })
        useWorkbench.setState({ notice: '回收站已清空。' })
      }
    } catch (e) {
      if (useWorkbench.getState().currentKey === key) {
        useWorkbench.setState({ error: (e as Error).message })
      }
    } finally {
      setBusy(false)
    }
  }

  if (info === null) return null
  if (info.count === 0) {
    // 空回收站不给点：没东西可清，弹确认反而烦人。
    return (
      <button className="text-[11px] text-neutral-600 cursor-default" title="回收站是空的">
        回收站
      </button>
    )
  }
  return (
    <button
      onClick={empty}
      disabled={busy}
      className="text-[11px] text-neutral-400 hover:text-red-300 disabled:opacity-50"
    >
      {busy ? '清空中…' : `回收站 (${info.count})`}
    </button>
  )
}

export default function Workbench() {
  const {
    projects,
    current,
    currentKey,
    importing,
    error,
    notice,
    loadProjects,
    importPackageFile,
    openProject,
    batchRunning,
    batchProgress,
    exporting,
    exportResult,
    runBatch,
    stopBatch,
    exportEpisode,
    openExportFolder,
    createProject,
    deleteProject,
    upsertShot,
    upsertCharacter,
  } = useWorkbench()
  const [count, setCount] = useState(2)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [view, setView] = useState<'shots' | 'characters'>('shots')

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const charsWithRef = current?.characters.filter((c) => (c.referenceImages || []).length).length || 0
  const chosen = current?.renders?.filter((r) => r.chosenImageId).length || 0

  async function newProject() {
    const values = await openPromptFields({
      title: '新建空项目',
      fields: [
        { key: 'name', label: '项目名字', placeholder: '如：回声' },
        { key: 'episode', label: '集号（可空）', defaultValue: 'S01E01' },
      ],
    })
    if (!values || !values.name.trim()) return
    createProject(values.name.trim(), values.episode.trim())
  }
  function removeProject() {
    if (!current || !currentKey) return
    const label = `${current.project.name}${current.episode ? ` · ${current.episode}` : ''}`
    if (
      !window.confirm(
        `删除项目「${label}」？\n它的全部分镜、角色、参考图和候选图会连同磁盘目录一起删掉，不可撤销。`,
      )
    )
      return
    deleteProject(currentKey)
  }
  function addShot() {
    upsertShot({ prompt: '' })
  }
  async function addCharacter() {
    const name = await openPrompt({ title: '添加角色', label: '角色名' })
    if (!name) return
    upsertCharacter({ name })
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶栏 */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-line flex-wrap">
        <select
          value={currentKey || ''}
          onChange={(e) => openProject(e.target.value)}
          disabled={batchRunning}
          title={batchRunning ? '批量出图中不能切换项目' : undefined}
          className="min-w-[200px] disabled:opacity-50"
        >
          <option value="">选择项目…</option>
          {projects.map((p) => (
            <option key={p.key} value={p.key}>
              {p.name} {p.episode ? `· ${p.episode}` : ''}（{p.shotCount} 镜）
            </option>
          ))}
        </select>
        <label className="text-sm px-3 py-2 rounded-lg border border-line text-neutral-200 hover:border-accent-soft cursor-pointer">
          {importing ? '导入中…' : '导入任务包'}
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              if (e.target.files?.[0]) importPackageFile(e.target.files[0])
              e.target.value = ''
            }}
          />
        </label>
        <button
          onClick={newProject}
          disabled={batchRunning}
          title={batchRunning ? '批量出图中不能新建项目' : undefined}
          className="text-sm px-3 py-2 rounded-lg border border-line text-neutral-200 hover:border-accent-soft disabled:opacity-50"
        >
          新建空项目
        </button>
        {current && (
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-sm px-3 py-2 rounded-lg border border-line text-neutral-200 hover:border-accent-soft"
          >
            项目设置
          </button>
        )}
        {current && (
          <button
            onClick={removeProject}
            disabled={batchRunning}
            title={batchRunning ? '批量出图中不能删除项目' : '删除当前项目（连磁盘目录，不可撤销）'}
            className="text-sm px-3 py-2 rounded-lg border border-red-900/60 text-red-300 hover:bg-red-950/40 disabled:opacity-50"
          >
            删除项目
          </button>
        )}
        {current && (
          <span className="text-xs text-neutral-500">
            {current.project.name} {current.episode} · 人设 {charsWithRef}/{current.characters.length} 已锁 · 分镜{' '}
            {current.shots.length} · 定稿 {chosen}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <label className="text-xs text-neutral-400 flex items-center gap-1">
            每镜
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} 张
                </option>
              ))}
            </select>
          </label>
          {current &&
            (batchRunning ? (
              <>
                <span className="text-xs text-emerald-300">
                  出图中 {batchProgress.done}/{batchProgress.total}
                </span>
                <button
                  onClick={stopBatch}
                  title="立即停止：中断当前正在跑的一镜（服务端可能仍在完成并计费）"
                  className="text-xs px-3 py-1.5 rounded border border-red-900/60 text-red-300 hover:bg-red-950/40"
                >
                  停止并中断当前
                </button>
              </>
            ) : (
              <button
                onClick={() => runBatch(count)}
                className="text-xs px-3 py-1.5 rounded bg-accent hover:bg-accent-soft text-white"
              >
                批量出图
              </button>
            ))}
          {current && (
            <button
              disabled={exporting || batchRunning}
              onClick={exportEpisode}
              className="text-xs px-3 py-1.5 rounded border border-line text-neutral-200 disabled:opacity-40"
            >
              {exporting ? '导出中…' : '导出本集'}
            </button>
          )}
          {current && exportResult && (
            <button
              onClick={openExportFolder}
              className="text-xs px-3 py-1.5 rounded border border-line text-neutral-200 hover:border-accent-soft"
            >
              打开文件夹
            </button>
          )}
        </div>
      </div>

      {(notice || error) && (
        <div
          className={`mx-5 mt-3 text-sm px-3 py-2 rounded-lg border ${
            error
              ? 'text-red-300 border-red-900/60 bg-red-950/30'
              : 'text-emerald-300 border-emerald-900/60 bg-emerald-950/20'
          }`}
        >
          {error || notice}
        </div>
      )}

      {!current ? (
        <div className="flex-1 flex items-center justify-center text-center text-neutral-500 p-8">
          <div>
            <p className="mb-1">还没有项目。</p>
            <p className="text-sm">从 Scriptwriter 导出「生图任务包」JSON 点「导入任务包」，或点「新建空项目」从零起一集。</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* 分镜 / 人设库 切换 */}
          <div className="flex items-center gap-2 px-5 pt-3">
            <button
              onClick={() => setView('shots')}
              className={`text-xs px-3 py-1.5 rounded border ${
                view === 'shots'
                  ? 'bg-accent/20 text-emerald-200 border-emerald-800'
                  : 'text-neutral-400 border-line hover:border-accent-soft'
              }`}
            >
              分镜
            </button>
            <button
              onClick={() => setView('characters')}
              className={`text-xs px-3 py-1.5 rounded border ${
                view === 'characters'
                  ? 'bg-accent/20 text-emerald-200 border-emerald-800'
                  : 'text-neutral-400 border-line hover:border-accent-soft'
              }`}
            >
              人设库
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {view === 'shots' ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-neutral-300">分镜出图</h2>
                  <button onClick={addShot} className="text-[11px] text-accent hover:text-accent-soft">
                    + 添加分镜
                  </button>
                </div>
                {current.shots.length === 0 ? (
                  <p className="text-xs text-neutral-500">还没有分镜，点「+ 添加分镜」建一个，再「编辑」补提示词。</p>
                ) : (
                  current.shots.map((s) => (
                    // key 掺项目标识：角色/镜号跨项目可能同名同号，切项目后 React 若只按
                    // s.shotId 复用组件实例，卡片内部 useState（editing/zoom 等）会带旧项目
                    // 的残留状态串到新项目。
                    <ShotCard key={`${currentKey}:${s.shotId}`} shot={s} count={count} characters={current.characters} />
                  ))
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-neutral-300">人设库 · 一致性锚</h2>
                  <div className="flex items-center gap-2">
                    <TrashButton />
                    <button onClick={addCharacter} className="text-[11px] text-accent hover:text-accent-soft">
                      + 添加角色
                    </button>
                  </div>
                </div>
                {current.characters.length === 0 ? (
                  <p className="text-xs text-neutral-500">还没有角色，点「+ 添加角色」建一个。</p>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {current.characters.map((c) => (
                      // key 掺项目标识：角色 id 就是角色名且跨项目稳定（Scriptwriter 包、手动
                      // 创建都如此），只用 c.id 会让切项目后同名角色复用同一个 CharacterCard
                      // 实例，内部 selecting/selected/editing 等 useState 全部带旧项目残留过来
                      // （多选删除会把旧项目的 ref id 发给新项目，误报删除成功；编辑面板残留
                      // 会把旧项目角色的名字/锚点存进新项目同名角色）。
                      <CharacterCard key={`${currentKey}:${c.id}`} char={c} wide />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {settingsOpen && current && (
        // key 绑定项目：切项目后再开弹层，表单从新项目初始化
        <ProjectSettingsModal key={currentKey || ''} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
