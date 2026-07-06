import { useEffect, useState } from 'react'
import { useWorkbench } from '@/store/workbench'
import Lightbox from '@/components/Lightbox'
import { openPrompt, openPromptFields } from '@/components/PromptDialog'
import type { ProjectCharacter, ProjectShot } from '@/types'

function CharacterCard({ char, wide }: { char: ProjectCharacter; wide?: boolean }) {
  const uploadCharacterRef = useWorkbench((s) => s.uploadCharacterRef)
  const generateCharacterBase = useWorkbench((s) => s.generateCharacterBase)
  const cancelCharacterBase = useWorkbench((s) => s.cancelCharacterBase)
  const lockCandidate = useWorkbench((s) => s.lockCandidate)
  const deleteBaseCandidate = useWorkbench((s) => s.deleteBaseCandidate)
  const deleteCharacterRef = useWorkbench((s) => s.deleteCharacterRef)
  const lockCharacterRef = useWorkbench((s) => s.lockCharacterRef)
  const reorderCharacterRefs = useWorkbench((s) => s.reorderCharacterRefs)
  const upsertCharacter = useWorkbench((s) => s.upsertCharacter)
  const deleteCharacter = useWorkbench((s) => s.deleteCharacter)
  const busy = useWorkbench((s) => s.charBusy[char.id])
  const refs = char.referenceImages || []
  const candidates = char.baseCandidates || []

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(char.name)
  const [role, setRole] = useState(char.role || '')
  const [lock, setLock] = useState(char.appearance?.imageLockPhrase || '')
  // 放大审片：候选缩略图太小看不清细节，点 ⤢ 用 Lightbox 打开（可左右切换同角色候选）
  const [zoom, setZoom] = useState<number | null>(null)
  // 参考图放大：⤢ 用 Lightbox 打开这个角色的全部参考图
  const [refZoom, setRefZoom] = useState<number | null>(null)

  function startEdit() {
    setName(char.name)
    setRole(char.role || '')
    setLock(char.appearance?.imageLockPhrase || '')
    setEditing(true)
  }
  async function save() {
    await upsertCharacter({ characterId: char.id, name, role, imageLockPhrase: lock })
    setEditing(false)
  }
  // 参考图排序：把第 i 张移到 i+dir，算出新顺序调 reorder 接口持久化（锚点不必在首位，只影响展示次序）
  function moveRef(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= refs.length) return
    const next = refs.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    reorderCharacterRefs(char.id, next.map((r) => r.id))
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-neutral-100">{char.name}</span>
          {char.role && <span className="text-xs text-neutral-500 ml-2">{char.role}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {refs.length === 0 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-900/50">
              未锁底图
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-900/50">
              已锁 {refs.length}
            </span>
          )}
          <button onClick={startEdit} className="text-[11px] text-neutral-400 hover:text-neutral-200">
            编辑
          </button>
          <button
            onClick={() => deleteCharacter(char.id)}
            className="text-[11px] text-red-400/80 hover:text-red-300"
          >
            删除
          </button>
        </div>
      </div>

      {editing && (
        <div className="space-y-1.5 rounded border border-line bg-black/20 p-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="角色名"
            className="w-full text-xs"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="定位/身份（可空）"
            className="w-full text-xs"
          />
          <textarea
            value={lock}
            onChange={(e) => setLock(e.target.value)}
            placeholder="外貌锚点句（imageLockPhrase）——生成基准图和一致性靠它"
            rows={2}
            className="w-full text-xs"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="text-[11px] text-neutral-400 hover:text-neutral-200">
              取消
            </button>
            <button onClick={save} className="text-[11px] px-2 py-0.5 rounded bg-accent text-white hover:bg-accent-soft">
              保存
            </button>
          </div>
        </div>
      )}

      {refs.length > 0 && (
        <div>
        <div className={`grid ${wide ? 'grid-cols-6' : 'grid-cols-4'} gap-1.5`}>
          {refs.map((r, i) => (
            <div key={r.id} className="relative group">
              <img
                src={r.file}
                alt=""
                className={`w-full aspect-square object-cover rounded border border-line${
                  r.locked ? ' ring-2 ring-emerald-400' : ''
                }`}
              />
              {r.locked ? (
                <span className="absolute top-0.5 left-0.5 text-[9px] px-1 rounded bg-black/70 text-emerald-300">
                  锚
                </span>
              ) : (
                <button
                  onClick={() => lockCharacterRef(char.id, r.id)}
                  title="设为锚点底图"
                  className="absolute top-0.5 left-0.5 text-[9px] px-1 rounded bg-black/60 text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-emerald-300"
                >
                  设锚
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setRefZoom(i)
                }}
                title="放大查看"
                className="absolute top-0.5 right-5 text-[10px] w-4 h-4 leading-none rounded bg-black/70 text-neutral-200 opacity-0 group-hover:opacity-100 hover:bg-black/90"
              >
                ⤢
              </button>
              <button
                onClick={() => deleteCharacterRef(char.id, r.id)}
                title="删除这张参考图"
                className="absolute top-0.5 right-0.5 text-[10px] w-4 h-4 leading-none rounded bg-black/70 text-red-300 opacity-0 group-hover:opacity-100 hover:bg-red-900/80"
              >
                ×
              </button>
              <div className="absolute inset-x-0 bottom-0.5 flex items-center justify-between px-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    moveRef(i, -1)
                  }}
                  disabled={i === 0}
                  title="前移"
                  className="text-[10px] w-4 h-4 leading-none rounded bg-black/70 text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-neutral-100 disabled:opacity-20"
                >
                  ◀
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    moveRef(i, 1)
                  }}
                  disabled={i === refs.length - 1}
                  title="后移"
                  className="text-[10px] w-4 h-4 leading-none rounded bg-black/70 text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-neutral-100 disabled:opacity-20"
                >
                  ▶
                </button>
              </div>
            </div>
          ))}
        </div>
          {refZoom !== null && (
            <Lightbox
              images={refs.map((r) => ({ id: r.id, url: r.file }))}
              index={Math.min(refZoom, refs.length - 1)}
              onIndexChange={setRefZoom}
              onClose={() => setRefZoom(null)}
            />
          )}
        </div>
      )}
      {candidates.length > 0 && (
        <div>
          <p className="text-[11px] text-neutral-500 mb-1">基准图候选（点一张锁定）</p>
          <div className={`grid ${wide ? 'grid-cols-6' : 'grid-cols-4'} gap-1.5`}>
            {candidates.map((url, i) => (
              <div key={url} className="relative group">
                <button
                  onClick={() => lockCandidate(char.id, url)}
                  title="锁定为基准图"
                  className="block w-full rounded overflow-hidden border-2 border-transparent hover:border-accent-soft"
                >
                  <img src={url} alt="" className="w-full aspect-square object-cover" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoom(i)
                  }}
                  title="放大查看"
                  className="absolute top-0.5 right-5 text-[10px] w-4 h-4 leading-none rounded bg-black/70 text-neutral-200 opacity-0 group-hover:opacity-100 hover:bg-black/90"
                >
                  ⤢
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteBaseCandidate(char.id, url)
                  }}
                  title="删除这张候选"
                  className="absolute top-0.5 right-0.5 text-[10px] w-4 h-4 leading-none rounded bg-black/70 text-red-300 opacity-0 group-hover:opacity-100 hover:bg-red-900/80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {zoom !== null && (
            <Lightbox
              images={candidates.map((u) => ({ id: u, url: u }))}
              index={Math.min(zoom, candidates.length - 1)}
              onIndexChange={setZoom}
              onClose={() => setZoom(null)}
            />
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {busy ? (
          <button
            onClick={() => cancelCharacterBase(char.id)}
            title="中断等待（服务端可能仍在完成本次生成并计费）"
            className="text-xs py-1.5 rounded border border-red-900/60 text-red-300 hover:bg-red-950/40"
          >
            取消生成
          </button>
        ) : (
          <button
            onClick={() => generateCharacterBase(char.id, 2)}
            className="text-xs py-1.5 rounded bg-accent hover:bg-accent-soft text-white"
          >
            生成基准图
          </button>
        )}
        <label className="block text-center text-xs py-1.5 rounded border border-dashed border-line text-neutral-400 hover:border-accent-soft hover:text-neutral-200 cursor-pointer">
          上传基准图
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              if (e.target.files?.[0]) uploadCharacterRef(char.id, e.target.files[0])
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}

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

  function toggle(id: string) {
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }
  async function save() {
    await upsertShot(
      { shotId: shotId.trim() || undefined, prompt, negative, characterIds: ids },
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
        <p className="text-[11px] text-neutral-500 mb-1">出场角色（勾选后出图自动挂其锚点底图）</p>
        {characters.length === 0 ? (
          <p className="text-[11px] text-neutral-600">还没有角色，先去左侧人设库加。</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {characters.map((c) => {
              const on = ids.includes(c.id)
              return (
                <button
                  key={c.id}
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
                    <ShotCard key={s.shotId} shot={s} count={count} characters={current.characters} />
                  ))
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-neutral-300">人设库 · 一致性锚</h2>
                  <button onClick={addCharacter} className="text-[11px] text-accent hover:text-accent-soft">
                    + 添加角色
                  </button>
                </div>
                {current.characters.length === 0 ? (
                  <p className="text-xs text-neutral-500">还没有角色，点「+ 添加角色」建一个。</p>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {current.characters.map((c) => (
                      <CharacterCard key={c.id} char={c} wide />
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
