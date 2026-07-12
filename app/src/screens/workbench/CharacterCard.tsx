import { useState } from 'react'
import { useWorkbench } from '@/store/workbench'
import Lightbox from '@/components/Lightbox'
import { openPrompt, openPromptFields } from '@/components/PromptDialog'
import type { ProjectCharacter, ProjectCharacterForm, ProjectRefImage } from '@/types'

// 参考图 role 的中文名与徽章配色。未知 role 走 neutral 兜底（后端理论上只发这四种）。
const ROLE_LABELS: Record<string, string> = {
  base: '基准',
  turnaround: '三视',
  expression: '表情',
  detail: '细节',
}
const ROLE_COLORS: Record<string, string> = {
  base: 'bg-emerald-950/60 text-emerald-300',
  turnaround: 'bg-sky-950/60 text-sky-300',
  expression: 'bg-violet-950/60 text-violet-300',
  detail: 'bg-amber-950/60 text-amber-300',
}
const ROLE_OPTIONS = ['base', 'turnaround', 'expression', 'detail'] as const

export default function CharacterCard({ char, wide }: { char: ProjectCharacter; wide?: boolean }) {
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
  const upsertCharacterForm = useWorkbench((s) => s.upsertCharacterForm)
  const deleteCharacterForm = useWorkbench((s) => s.deleteCharacterForm)
  const updateCharacterRef = useWorkbench((s) => s.updateCharacterRef)
  const deleteCharacterRefs = useWorkbench((s) => s.deleteCharacterRefs)
  const busy = useWorkbench((s) => s.charBusy[char.id])

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(char.name)
  const [role, setRole] = useState(char.role || '')
  const [lock, setLock] = useState(char.appearance?.imageLockPhrase || '')
  // 放大审片：候选缩略图太小看不清细节，点 ⤢ 用 Lightbox 打开（可左右切换同角色候选）
  const [zoom, setZoom] = useState<number | null>(null)
  // 参考图放大：⤢ 用 Lightbox 打开当前形象的全部参考图
  const [refZoom, setRefZoom] = useState<number | null>(null)
  // 当前查看的形象页签
  const [activeFormId, setActiveFormId] = useState('default')
  // role 徽章的内联小菜单：记录展开的是哪张参考图（refId），null = 收起
  const [roleMenuFor, setRoleMenuFor] = useState<string | null>(null)
  // 批量上传时给这批图打的 role
  const [uploadRole, setUploadRole] = useState('base')
  // 多选删除模式
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // 形象页签列表：default 永远在首位；forms 里若已有 default 条目就用它的名字，不重复渲染。
  const forms = char.forms || []
  const defaultEntry = forms.find((f) => f.id === 'default')
  const tabs: { id: string; name: string }[] = [
    { id: 'default', name: defaultEntry?.name || '主形象' },
    ...forms.filter((f) => f.id !== 'default').map((f) => ({ id: f.id, name: f.name })),
  ]
  // 防御：activeFormId 指向的形象可能已被删（如另一张卡或后端），渲染时回落 default。
  const effectiveFormId = tabs.some((t) => t.id === activeFormId) ? activeFormId : 'default'

  const allRefs = char.referenceImages || []
  // 只显示当前形象组的参考图/候选（缺省 formId、字符串候选都归 default）。
  const refs = allRefs.filter((r) => (r.formId || 'default') === effectiveFormId)
  const candidates = (char.baseCandidates || []).filter(
    (c) => (typeof c === 'string' ? 'default' : c.formId || 'default') === effectiveFormId,
  )
  // 当前形象的外貌锚点句：default 优先读 forms 里 id 为 default 条目的 imageLockPhrase
  // （后端回退链是 form 条目→appearance→角色名），没有才落到角色 appearance；
  // 非 default 在对应 form 上。只读 appearance 会漏掉「default 形象条目带锚点句但
  // appearance 为空」这种数据形态——后端明明能生成，按钮却被这里误判禁用。
  const formLockPhrase =
    effectiveFormId === 'default'
      ? defaultEntry?.imageLockPhrase || char.appearance?.imageLockPhrase || ''
      : forms.find((f) => f.id === effectiveFormId)?.imageLockPhrase || ''

  function switchForm(id: string) {
    if (id === effectiveFormId) return
    setActiveFormId(id)
    // 编辑面板里的 lock 是按打开时的形象取的初值，切形象后继续编辑会把 A 形象的锚点存到 B 上，
    // 直接关掉面板最稳。
    setEditing(false)
    // 多选集合属于旧形象组，跨形象保留没有意义还容易误删。
    setSelecting(false)
    setSelected(new Set())
    setRoleMenuFor(null)
    // 放大索引基于过滤后的数组，切形象后不再指向同一张图。
    setZoom(null)
    setRefZoom(null)
  }

  function startEdit() {
    setName(char.name)
    setRole(char.role || '')
    setLock(formLockPhrase)
    setEditing(true)
  }
  async function save() {
    if (effectiveFormId === 'default') {
      await upsertCharacter({ characterId: char.id, name, role, imageLockPhrase: lock })
    } else {
      // 非 default 形象：名字/定位存角色本体（不带 imageLockPhrase key，免得覆盖主形象的），
      // 锚点句存到对应 form 上。
      await upsertCharacter({ characterId: char.id, name, role })
      await upsertCharacterForm(char.id, { formId: effectiveFormId, imageLockPhrase: lock })
    }
    setEditing(false)
  }

  async function addForm() {
    const values = await openPromptFields({
      title: '新建形象',
      fields: [
        { key: 'name', label: '形象名', placeholder: '如：夏装/兽形' },
        { key: 'lock', label: '外貌锚点句（可空）' },
      ],
    })
    if (!values) return
    const formName = values.name.trim()
    if (!formName) return
    await upsertCharacterForm(char.id, {
      name: formName,
      imageLockPhrase: values.lock.trim() || undefined,
    })
  }

  async function editForm(formId: string) {
    const f = forms.find((x) => x.id === formId)
    if (!f) return
    const values = await openPromptFields({
      title: '编辑形象',
      fields: [
        { key: 'name', label: '形象名', defaultValue: f.name },
        { key: 'lock', label: '外貌锚点句（可空）', defaultValue: f.imageLockPhrase || '' },
      ],
    })
    if (!values || !values.name.trim()) return
    await upsertCharacterForm(char.id, {
      formId: f.id,
      name: values.name.trim(),
      imageLockPhrase: values.lock,
    })
  }

  async function removeForm(f: ProjectCharacterForm | { id: string; name: string }) {
    if (!window.confirm(`删除形象「${f.name}」？该形象的参考图会移入回收站。`)) return
    // 只在真删成功后才把 activeFormId 切回 default：服务器 500 时形象没删掉，页签还在，
    // 切回 default 会让用户以为删除失败但页签消失了，白白多一次困惑。
    const ok = await deleteCharacterForm(char.id, f.id)
    if (ok && activeFormId === f.id) setActiveFormId('default')
  }

  async function editLabel(r: ProjectRefImage) {
    const v = await openPrompt({ title: '编辑标签', label: '标签（留空清除）', defaultValue: r.label || '' })
    if (v === null) return // 取消不动；空串 = 清除（后端语义）
    await updateCharacterRef(char.id, r.id, { label: v.trim() })
  }

  function toggleSelected(refId: string) {
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(refId)) next.delete(refId)
      else next.add(refId)
      return next
    })
  }
  async function deleteSelected() {
    const n = selected.size
    if (!n) return
    if (!window.confirm(`删除选中的 ${n} 张参考图？会移入回收站。`)) return
    // 只在服务器确认成功后才清空本地选择/退出选择模式：500 时照样清掉的话，用户勾的 N 张
    // 全丢，得重勾一遍；store 已经把错误落到 error 上，这里什么都不用做，状态原样留着重试。
    const ok = await deleteCharacterRefs(char.id, [...selected])
    if (ok) {
      setSelecting(false)
      setSelected(new Set())
    }
  }

  // 参考图排序：把第 i 张移到 i+dir。reorder 接口收的是全量顺序，而这里的 i/j 是
  // 当前形象过滤后的下标——先在全量 refs 里定位这两张再交换，别的形象组顺序保持不变。
  function moveRef(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= refs.length) return
    const all = allRefs.slice()
    const ai = all.findIndex((r) => r.id === refs[i].id)
    const aj = all.findIndex((r) => r.id === refs[j].id)
    if (ai < 0 || aj < 0) return
    ;[all[ai], all[aj]] = [all[aj], all[ai]]
    reorderCharacterRefs(char.id, all.map((r) => r.id))
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
            <span
              title="出图时不会自动挂参考图——上传或生成基准图后自动锁定第一张"
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-900/50"
            >
              未锁底图
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-900/50">
              已锁 {refs.length}
            </span>
          )}
          {/* 单形象时不渲染页签行（观感与旧版一致），但新建形象的入口得留着，放这儿 */}
          {tabs.length === 1 && (
            <button onClick={addForm} className="text-[11px] text-neutral-400 hover:text-neutral-200">
              + 形象
            </button>
          )}
          {refs.length > 0 && (
            <button
              onClick={() => {
                setSelecting((v) => !v)
                setSelected(new Set())
              }}
              className="text-[11px] text-neutral-400 hover:text-neutral-200"
            >
              {selecting ? '取消选择' : '选择'}
            </button>
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

      {/* 形象页签行：只有一个形象时不渲染，观感与旧版一致 */}
      {tabs.length > 1 && (
        <div className="flex items-center gap-1 flex-wrap">
          {tabs.map((t) => {
            const active = t.id === effectiveFormId
            return (
              <div key={t.id} className="group relative flex items-center gap-0.5">
                <button
                  onClick={() => switchForm(t.id)}
                  className={`text-[11px] px-2 py-0.5 rounded border ${
                    active
                      ? 'bg-accent/20 text-emerald-200 border-emerald-800'
                      : 'text-neutral-400 border-line hover:border-accent-soft'
                  }`}
                >
                  {t.name}
                </button>
                {/* default 页签不可改不可删：它的名字/锚点走「编辑」面板 */}
                {t.id !== 'default' && (
                  <>
                    <button
                      onClick={() => editForm(t.id)}
                      title="编辑形象名/锚点句"
                      className="text-[10px] w-4 h-4 leading-none rounded bg-black/60 text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-neutral-100"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => removeForm(t)}
                      title="删除这个形象"
                      className="text-[10px] w-4 h-4 leading-none rounded bg-black/60 text-red-300 opacity-0 group-hover:opacity-100 hover:bg-red-900/80"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            )
          })}
          <button onClick={addForm} className="text-[11px] text-neutral-500 hover:text-neutral-200">
            + 形象
          </button>
        </div>
      )}

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
          <p className="text-[10px] text-neutral-500">
            描述这个角色（当前形象）长什么样，用于生成基准图；分镜 prompt 里已由上游拼好
          </p>
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
              {/* 选择模式：整图变成勾选开关，单图操作按钮全部不渲染 */}
              {selecting ? (
                <button
                  onClick={() => toggleSelected(r.id)}
                  title="点击勾选/取消"
                  className={`absolute inset-0 rounded bg-black/50 ${
                    selected.has(r.id) ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  {selected.has(r.id) && (
                    <span className="absolute top-0.5 right-0.5 text-[10px] w-4 h-4 leading-4 rounded bg-accent text-white">
                      ✓
                    </span>
                  )}
                </button>
              ) : (
                <>
                  {r.locked ? (
                    <span className="absolute top-0.5 left-0.5 text-[9px] px-1 rounded bg-black/70 text-emerald-300">
                      锚
                    </span>
                  ) : (
                    <button
                      onClick={() => lockCharacterRef(char.id, r.id)}
                      title="设为锚点：出图时这张会作为该形象的一致性参考图自动挂载"
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
                  {/* role 徽章 + 标签：放 bottom-4，避开底部 bottom-0.5 的 ◀▶ 行 */}
                  <div className="absolute bottom-4 left-0.5 flex items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setRoleMenuFor((cur) => (cur === r.id ? null : r.id))
                      }}
                      title="点击更改用途"
                      className={`text-[9px] px-1 rounded ${
                        ROLE_COLORS[r.role] || 'bg-neutral-900/60 text-neutral-300'
                      }`}
                    >
                      {ROLE_LABELS[r.role] || r.role || '未知'}
                    </button>
                    {r.label && (
                      <span className="text-[9px] px-1 rounded bg-black/60 text-neutral-300">{r.label}</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        editLabel(r)
                      }}
                      title="编辑标签"
                      className="text-[9px] w-3.5 h-3.5 leading-none rounded bg-black/60 text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-neutral-100"
                    >
                      ✎
                    </button>
                  </div>
                  {roleMenuFor === r.id && (
                    <div className="absolute bottom-9 left-0.5 z-10 bg-ink border border-line rounded p-0.5 space-y-0.5">
                      {ROLE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setRoleMenuFor(null)
                            updateCharacterRef(char.id, r.id, { role: opt })
                          }}
                          className={`block w-full text-left text-[10px] px-1.5 py-0.5 rounded hover:bg-white/10 ${
                            r.role === opt ? 'text-emerald-300' : 'text-neutral-300'
                          }`}
                        >
                          {ROLE_LABELS[opt]}
                        </button>
                      ))}
                    </div>
                  )}
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
                </>
              )}
            </div>
          ))}
        </div>
          {selecting && (
            <button
              disabled={selected.size === 0}
              onClick={deleteSelected}
              className="mt-1.5 text-[11px] px-2 py-1 rounded border border-red-900/60 text-red-300 hover:bg-red-950/40 disabled:opacity-40"
            >
              删除选中 ({selected.size})
            </button>
          )}
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
          <p className="text-[11px] text-neutral-500 mb-1">基准图候选（点一张锁定，会保留到你删除）</p>
          <div className={`grid ${wide ? 'grid-cols-6' : 'grid-cols-4'} gap-1.5`}>
            {candidates.map((c, i) => {
              // 旧候选是全局图库 URL 字符串，新候选是持久化对象（file 已是可直接展示的 URL）
              const candUrl = typeof c === 'string' ? c : c.file
              const candKey = typeof c === 'string' ? c : c.id
              return (
                <div key={candKey} className="relative group">
                  <button
                    onClick={() => lockCandidate(char.id, c)}
                    title="锁定为基准图"
                    className="block w-full rounded overflow-hidden border-2 border-transparent hover:border-accent-soft"
                  >
                    <img src={candUrl} alt="" className="w-full aspect-square object-cover" />
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
                      deleteBaseCandidate(char.id, c)
                    }}
                    title="删除这张候选"
                    className="absolute top-0.5 right-0.5 text-[10px] w-4 h-4 leading-none rounded bg-black/70 text-red-300 opacity-0 group-hover:opacity-100 hover:bg-red-900/80"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
          {zoom !== null && (
            <Lightbox
              images={candidates.map((c) => {
                const u = typeof c === 'string' ? c : c.file
                return { id: typeof c === 'string' ? c : c.id, url: u }
              })}
              index={Math.min(zoom, candidates.length - 1)}
              onIndexChange={setZoom}
              onClose={() => setZoom(null)}
            />
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        {busy ? (
          <button
            onClick={() => cancelCharacterBase(char.id)}
            title="中断等待（服务端可能仍在完成本次生成并计费）"
            className="flex-1 text-xs py-1.5 rounded border border-red-900/60 text-red-300 hover:bg-red-950/40"
          >
            取消生成
          </button>
        ) : (
          <button
            onClick={() => generateCharacterBase(char.id, 2, effectiveFormId)}
            disabled={!formLockPhrase.trim()}
            title={!formLockPhrase.trim() ? '先填该形象的外貌锚点句' : ''}
            className="flex-1 text-xs py-1.5 rounded bg-accent hover:bg-accent-soft text-white disabled:opacity-40"
          >
            生成基准图
          </button>
        )}
        <label className="flex-1 block text-center text-xs py-1.5 rounded border border-dashed border-line text-neutral-400 hover:border-accent-soft hover:text-neutral-200 cursor-pointer">
          上传参考图
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={async (e) => {
              const input = e.target
              const files = input.files
              if (files?.length) {
                // 顺序 await：并发上传会竞态写 project.json，后写覆盖先写。
                for (const f of Array.from(files)) {
                  await uploadCharacterRef(char.id, f, { role: uploadRole, formId: effectiveFormId })
                }
              }
              input.value = ''
            }}
          />
        </label>
        <select
          value={uploadRole}
          onChange={(e) => setUploadRole(e.target.value)}
          title="这批上传的参考图的用途"
          className="text-[11px]"
        >
          <option value="base">基准</option>
          <option value="turnaround">三视</option>
          <option value="expression">表情</option>
          <option value="detail">细节</option>
        </select>
      </div>
    </div>
  )
}
