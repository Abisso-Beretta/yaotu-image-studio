import { useEffect, useRef, useState } from 'react'

// 通用输入对话框，替代 window.prompt（Electron 不支持 window.prompt，调用会直接抛异常）。
// 用法：在 App 里挂一次 <PromptDialogHost />，然后任意地方
//   const name = await openPrompt({ title: '添加角色', label: '角色名' })   // null = 取消
//   const values = await openPromptFields({ title, fields: [...] })        // null = 取消

export interface PromptField {
  key: string
  label: string
  defaultValue?: string
  placeholder?: string
}

interface PromptRequest {
  title: string
  fields: PromptField[]
  resolve: (values: Record<string, string> | null) => void
}

let pushRequest: ((req: PromptRequest) => void) | null = null

export function openPromptFields(opts: {
  title: string
  fields: PromptField[]
}): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    if (!pushRequest) {
      // Host 未挂载（不应发生），按取消处理，避免调用点挂死
      resolve(null)
      return
    }
    pushRequest({ title: opts.title, fields: opts.fields, resolve })
  })
}

export async function openPrompt(opts: {
  title: string
  label?: string
  defaultValue?: string
  placeholder?: string
}): Promise<string | null> {
  const values = await openPromptFields({
    title: opts.title,
    fields: [
      {
        key: 'value',
        label: opts.label || '',
        defaultValue: opts.defaultValue,
        placeholder: opts.placeholder,
      },
    ],
  })
  return values === null ? null : values.value
}

export default function PromptDialogHost() {
  const [request, setRequest] = useState<PromptRequest | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const requestRef = useRef<PromptRequest | null>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    pushRequest = (req) => {
      // 已有未关闭的对话框时，旧请求按取消收尾
      requestRef.current?.resolve(null)
      requestRef.current = req
      setValues(Object.fromEntries(req.fields.map((f) => [f.key, f.defaultValue || ''])))
      setRequest(req)
    }
    return () => {
      pushRequest = null
      requestRef.current?.resolve(null)
      requestRef.current = null
    }
  }, [])

  useEffect(() => {
    if (request) firstInputRef.current?.select()
  }, [request])

  // Esc 取消（挂在 window 上，输入框没焦点时也生效）
  useEffect(() => {
    if (!request) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  if (!request) return null

  function close(result: Record<string, string> | null) {
    requestRef.current?.resolve(result)
    requestRef.current = null
    setRequest(null)
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
      onClick={() => close(null)}
    >
      <form
        className="bg-ink border border-line rounded-xl w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          close({ ...values })
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-100">{request.title}</h2>
          <button
            type="button"
            className="text-neutral-400 hover:text-neutral-200"
            onClick={() => close(null)}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {request.fields.map((f, i) => (
            <label key={f.key} className="block">
              {f.label && <span className="block text-xs text-neutral-400 mb-1">{f.label}</span>}
              <input
                ref={i === 0 ? firstInputRef : undefined}
                className="w-full"
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => close(null)}
            className="text-sm px-4 py-2 rounded-lg border border-line text-neutral-200 hover:border-accent-soft"
          >
            取消
          </button>
          <button
            type="submit"
            className="text-sm px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-white"
          >
            确定
          </button>
        </div>
      </form>
    </div>
  )
}
