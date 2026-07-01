import { useEffect, useState } from 'react'
import { useWorkbench } from '@/store/workbench'
import type { ProjectCharacter, ProjectShot } from '@/types'

function CharacterCard({ char }: { char: ProjectCharacter }) {
  const uploadCharacterRef = useWorkbench((s) => s.uploadCharacterRef)
  const generateCharacterBase = useWorkbench((s) => s.generateCharacterBase)
  const lockCandidate = useWorkbench((s) => s.lockCandidate)
  const deleteCharacterRef = useWorkbench((s) => s.deleteCharacterRef)
  const lockCharacterRef = useWorkbench((s) => s.lockCharacterRef)
  const upsertCharacter = useWorkbench((s) => s.upsertCharacter)
  const deleteCharacter = useWorkbench((s) => s.deleteCharacter)
  const busy = useWorkbench((s) => s.charBusy[char.id])
  const refs = char.referenceImages || []
  const candidates = char.baseCandidates || []

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(char.name)
  const [role, setRole] = useState(char.role || '')
  const [lock, setLock] = useState(char.appearance?.imageLockPhrase || '')

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
        <div className="grid grid-cols-4 gap-1.5">
          {refs.map((r) => (
            <div key={r.id} className="relative group">
              <img src={r.file} alt="" className="w-full aspect-square object-cover rounded border border-line" />
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
                onClick={() => deleteCharacterRef(char.id, r.id)}
                title="删除这张参考图"
                className="absolute top-0.5 right-0.5 text-[10px] w-4 h-4 leading-none rounded bg-black/70 text-red-300 opacity-0 group-hover:opacity-100 hover:bg-red-900/80"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {candidates.length > 0 && (
        <div>
          <p className="text-[11px] text-neutral-500 mb-1">基准图候选（点一张锁定）</p>
          <div className="grid grid-cols-4 gap-1.5">
            {candidates.map((url) => (
              <button
                key={url}
                onClick={() => lockCandidate(char.id, url)}
                title="锁定为基准图"
                className="rounded overflow-hidden border-2 border-transparent hover:border-accent-soft"
              >
                <img src={url} alt="" className="w-full aspect-square object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={busy}
          onClick={() => generateCharacterBase(char.id, 2)}
          className="text-xs py-1.5 rounded bg-accent hover:bg-accent-soft text-white disabled:opacity-40"
        >
          {busy ? '生成中…' : '生成基准图'}
        </button>
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
  const chooseCandidate = useWorkbench((s) => s.chooseCandidate)
  const deleteCandidate = useWorkbench((s) => s.deleteCandidate)
  const deleteShot = useWorkbench((s) => s.deleteShot)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const render = current?.renders?.find((r) => r.shotId === shot.shotId)

  return (
    <div className="rounded-lg border border-line bg-panel p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-mono text-neutral-200">{shot.shotId}</span>
        {shot.shotType && <span className="text-xs text-neutral-500">{shot.shotType}</span>}
        {shot.characterIds.map((c) => (
          <span key={c} className="text-[11px] px-1.5 py-0.5 rounded bg-accent/20 text-emerald-200 border border-emerald-900/40">
            {c}
          </span>
        ))}
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
          <button
            disabled={shotBusy || batchRunning || !shot.prompt}
            onClick={() => generateShot(shot.shotId, count)}
            title={!shot.prompt ? '先「编辑」补上提示词' : ''}
            className="text-xs px-3 py-1.5 rounded bg-accent hover:bg-accent-soft text-white disabled:opacity-40"
          >
            {shotBusy ? '出图中…' : `生成 ${count} 张`}
          </button>
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
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {render.candidates.map((cand) => {
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
      )}
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

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const charsWithRef = current?.characters.filter((c) => (c.referenceImages || []).length).length || 0
  const chosen = current?.renders?.filter((r) => r.chosenImageId).length || 0

  function newProject() {
    const name = window.prompt('新项目名字（如：回声）')
    if (!name) return
    const episode = window.prompt('集号（可空，如 S01E01）') || ''
    createProject(name, episode)
  }
  function addShot() {
    upsertShot({ prompt: '' })
  }
  function addCharacter() {
    const name = window.prompt('角色名')
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
          className="min-w-[200px]"
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
          className="text-sm px-3 py-2 rounded-lg border border-line text-neutral-200 hover:border-accent-soft"
        >
          新建空项目
        </button>
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
                  className="text-xs px-3 py-1.5 rounded border border-red-900/60 text-red-300"
                >
                  停止
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
        <div className="flex-1 min-h-0 grid grid-cols-[320px_1fr] max-[900px]:grid-cols-1">
          {/* 人设库 */}
          <aside className="border-r border-line overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-300">人设库 · 一致性锚</h2>
              <button onClick={addCharacter} className="text-[11px] text-accent hover:text-accent-soft">
                + 添加角色
              </button>
            </div>
            {current.characters.length === 0 ? (
              <p className="text-xs text-neutral-500">还没有角色，点「+ 添加角色」建一个。</p>
            ) : (
              current.characters.map((c) => <CharacterCard key={c.id} char={c} />)
            )}
          </aside>

          {/* 分镜 */}
          <main className="overflow-y-auto p-4 space-y-3">
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
          </main>
        </div>
      )}
    </div>
  )
}
