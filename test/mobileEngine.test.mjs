import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import ts from '../app/node_modules/typescript/lib/typescript.js'

// 照抄 test/rerollParams.test.mjs 的「单文件 TS 免构建加载」范式：只转译 engine.ts 这一个文件
// （它只用 import type 引类型，编译后不残留任何运行时 import），再包成 data: URL 动态 import。
// 引擎的文件系统 / 网络 / 密钥存储全部由注入的内存 mock 适配器提供，绝不发真实网络请求。
async function loadEngineModule() {
  const filename = path.resolve('app/src/mobile/engine.ts')
  const source = await fs.readFile(filename, 'utf8')
  const result = ts.transpileModule(source, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  })
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error)
  if (errors.length) {
    throw new Error(
      ts.formatDiagnostics(errors, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => '\n',
      }),
    )
  }
  const url = `data:text/javascript;base64,${Buffer.from(result.outputText).toString('base64')}`
  return import(url)
}

const { MobileEngine } = await loadEngineModule()

// ===== 内存 mock 适配器 =====

// 扁平 key 模拟文件系统：'outputs/<batch>/image-01.png' 直接作 key，readdir 从 key 前缀推导子项。
class MemFile {
  constructor() {
    this.files = new Map()
  }
  async readText(p) {
    return this.files.has(p) ? this.files.get(p) : null
  }
  async writeText(p, c) {
    this.files.set(p, c)
  }
  async writeBase64(p, b) {
    this.files.set(p, b)
  }
  async readBase64(p) {
    return this.files.has(p) ? this.files.get(p) : null
  }
  async readdir(dir) {
    const prefix = dir.endsWith('/') ? dir : `${dir}/`
    const names = new Set()
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        const name = key.slice(prefix.length).split('/')[0]
        if (name) names.add(name)
      }
    }
    return [...names]
  }
  async delete(p) {
    return this.files.delete(p)
  }
  async mkdir() {
    // 扁平存储无需真的建目录
  }
}

class MemSecret {
  constructor() {
    this.store = new Map()
  }
  async get(k) {
    return this.store.has(k) ? this.store.get(k) : null
  }
  async set(k, v) {
    this.store.set(k, v)
  }
  async remove(k) {
    this.store.delete(k)
  }
}

// 记录所有请求；按 url 智能返回假响应（images 端点给 {data:[{b64_json}]}，responses 端点给 {output:[{result}]}）。
// 单个测试可覆写 responder（自定义响应体）与 binaryResponder（自定义 getBinary 下载结果）。
class MockHttp {
  constructor() {
    this.calls = []
    this.binaryCalls = []
    this.responder = null // (call) => HttpResponse；为空时走默认 respond
    // 默认下载成功：返回一张带 PNG 魔数的图片 base64 + image/png。单测可覆写。
    this.binaryResponder = () => ({ status: 200, base64: DOWNLOADED_B64, mimeType: 'image/png' })
  }
  respond(call) {
    if (this.responder) return this.responder(call)
    if (call.url.includes('/responses')) {
      const body = { output: [{ type: 'image_generation_call', result: IMG_B64 }] }
      return { status: 200, json: body, text: JSON.stringify(body) }
    }
    const body = { data: [{ b64_json: IMG_B64 }] }
    return { status: 200, json: body, text: JSON.stringify(body) }
  }
  async postJson(url, body, headers) {
    const call = { kind: 'postJson', url, body, headers }
    this.calls.push(call)
    return this.respond(call)
  }
  async postMultipart(url, fields, files, headers) {
    const call = { kind: 'postMultipart', url, fields, files, headers }
    this.calls.push(call)
    return this.respond(call)
  }
  async get(url, headers) {
    const call = { kind: 'get', url, headers }
    this.calls.push(call)
    return this.respond(call)
  }
  async getBinary(url) {
    this.binaryCalls.push(url)
    return this.binaryResponder(url)
  }
}

// PNG 文件签名字节 \x89PNG\r\n\x1a\n，base64 编码后即以 "iVBORw0KGgo" 开头——正好命中
// looksLikeImageBase64 的魔数识别。填充用 0x00 字节（3 字节对齐 base64，不打乱前缀），
// 拼够长度（> 200 base64 字符）以过长度阈值。
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
// 上游返回的图片 base64：必须带真实图片魔数且 base64 串 > 200 字符，才能被忠实移植的 walker 的
// looksLikeImageBase64 认出（responses 模式的 result 字段靠通用递归 + 魔数识别命中，非专用字段）。
const IMG_B64 = Buffer.concat([PNG_SIG, Buffer.alloc(200, 0x00)]).toString('base64')
// getBinary 下载回来的图片内容（长度不同于 IMG_B64，便于断言“落盘的是下载内容”；下载内容不过 walker，
// 无需满足魔数长度阈值，这里带魔数仅为拟真）。
const DOWNLOADED_B64 = Buffer.concat([PNG_SIG, Buffer.alloc(64, 0x00)]).toString('base64')
// 参考图 base64（短的即可，参考图解析走 dataUrl 而非魔数长度阈值）。
const REF_B64 = Buffer.from('hello-reference').toString('base64')
const REF_DATA_URL = `data:image/png;base64,${REF_B64}`

async function makeEngine({ endpointMode = 'images' } = {}) {
  const file = new MemFile()
  const secret = new MemSecret()
  const http = new MockHttp()
  await secret.set('yaotu.apiKey', 'test-key')
  await file.writeText('config.json', JSON.stringify({ baseUrl: 'https://api.test.com', model: 'gpt-image-2', endpointMode }))
  const engine = new MobileEngine({ http, file, secret, toDisplayUrl: (p) => p })
  return { engine, file, secret, http }
}

function findMetadata(file) {
  for (const [key, value] of file.files.entries()) {
    if (key.endsWith('/metadata.json')) return { path: key, meta: JSON.parse(value) }
  }
  return null
}

const baseParams = { size: '1024x1024', quality: 'high', count: 1, outputFormat: 'png', background: 'auto' }

// ===== 1. images 模式、无参考图：请求 payload 与负向词拼接/去重 =====

test('images 模式无参考图：payload 字段正确，负向词按 Avoid 拼接', async () => {
  const { engine, http } = await makeEngine({ endpointMode: 'images' })
  const result = await engine.generate({
    ...baseParams,
    prompt: 'a serene mountain lake at dawn',
    negativePrompt: 'blurry, watermark',
  })

  assert.equal(result.images.length, 1)
  assert.equal(http.calls.length, 1)
  const call = http.calls[0]
  assert.equal(call.kind, 'postJson')
  assert.match(call.url, /\/v1\/images\/generations$/)
  assert.equal(call.body.model, 'gpt-image-2')
  assert.equal(call.body.n, 1)
  assert.equal(call.body.size, '1024x1024')
  assert.equal(call.body.quality, 'high')
  assert.equal(call.body.output_format, 'png')
  assert.ok(call.body.prompt.includes('a serene mountain lake at dawn'))
  assert.ok(call.body.prompt.includes('Avoid: blurry, watermark'))
})

test('images 模式：负向词已完整包含在 prompt 里时不重复拼接', async () => {
  const { engine, http } = await makeEngine({ endpointMode: 'images' })
  const prompt = 'a quiet street, please avoid blurry, watermark artifacts'
  await engine.generate({ ...baseParams, prompt, negativePrompt: 'blurry, watermark' })

  const call = http.calls[0]
  assert.equal(call.body.prompt, prompt)
  assert.ok(!call.body.prompt.includes('Avoid:'))
})

// ===== 2. responses 模式、带参考图：参考图转 dataUrl 塞进 input_image =====

test('responses 模式带参考图：参考图作为 input_image 的 dataUrl 进入 input 内容', async () => {
  const { engine, http } = await makeEngine({ endpointMode: 'responses' })
  await engine.generate({
    ...baseParams,
    prompt: 'a portrait in soft light',
    referenceImages: [{ name: 'ref.png', dataUrl: REF_DATA_URL, source: 'reference' }],
  })

  const call = http.calls[0]
  assert.equal(call.kind, 'postJson')
  assert.match(call.url, /\/v1\/responses$/)
  const content = call.body.input[0].content
  const textPart = content.find((c) => c.type === 'input_text')
  assert.ok(textPart && textPart.text.includes('a portrait in soft light'))
  const imagePart = content.find((c) => c.type === 'input_image')
  assert.ok(imagePart, '应存在 input_image 条目')
  assert.equal(imagePart.image_url, REF_DATA_URL)
})

// ===== 3. metadata.json 形状：参考图相对路径、无 dataUrl，request/params 齐全 =====

test('生成后 metadata.json：参考图是相对路径且无 dataUrl，request/params 字段齐全', async () => {
  const { engine, file } = await makeEngine({ endpointMode: 'images' })
  await engine.generate({
    ...baseParams,
    prompt: 'a lighthouse on a cliff',
    negativePrompt: 'text, logo',
    referenceImages: [{ name: 'style.png', dataUrl: REF_DATA_URL, source: 'saved-style-reference' }],
  })

  const found = findMetadata(file)
  assert.ok(found, '应写出 metadata.json')
  const { meta } = found
  assert.ok(meta.batchId && meta.createdAt)
  assert.equal(meta.request.prompt, 'a lighthouse on a cliff')
  assert.equal(meta.request.negativePrompt, 'text, logo')

  const refs = meta.request.referenceImages
  assert.equal(refs.length, 1)
  assert.ok(refs[0].url.startsWith('outputs/'), '参考图 url 应为相对路径')
  assert.ok(refs[0].url.includes('/references/'))
  assert.equal(Object.prototype.hasOwnProperty.call(refs[0], 'dataUrl'), false, '不应残留 dataUrl')

  // 图片记录的 params/request 齐全
  const img = meta.images[0]
  assert.ok(img.params && img.params.model === 'gpt-image-2')
  assert.equal(img.params.references, 1)
  assert.ok(img.request && img.request.prompt === 'a lighthouse on a cliff')
  assert.ok(img.url.startsWith('outputs/'))
  assert.match(img.id, /\/image-01\.png$/)
})

// ===== 4. listImages 分页 + 时间倒序 =====

test('listImages：按批次目录名倒序（时间倒序）并正确分页', async () => {
  const { engine, file } = await makeEngine()
  // 造 8 个批次，batchId 前缀递增；每批一张图 + metadata。
  const batchIds = []
  for (let i = 1; i <= 8; i += 1) {
    const day = String(i).padStart(2, '0')
    const batch = `202601${day}T000000Z-b${day}xx`
    batchIds.push(batch)
    await file.writeBase64(`outputs/${batch}/image-01.png`, IMG_B64)
    await file.writeText(
      `outputs/${batch}/metadata.json`,
      JSON.stringify({
        batchId: batch,
        createdAt: `2026-01-${day}T00:00:00.000Z`,
        request: { prompt: `p-${day}`, endpointMode: 'images', model: 'gpt-image-2' },
        images: [{ id: `${batch}/image-01.png`, bytes: 111 }],
      }),
    )
  }

  const page1 = await engine.listImages(1, 6)
  assert.equal(page1.total, 8)
  assert.equal(page1.pageSize, 6)
  assert.equal(page1.totalPages, 2)
  assert.equal(page1.images.length, 6)
  // 倒序：最新批次（b08xx）在最前
  assert.equal(page1.images[0].batchId, '20260108T000000Z-b08xx')
  assert.equal(page1.images[5].batchId, '20260103T000000Z-b03xx')
  assert.equal(page1.images[0].bytes, 111)

  const page2 = await engine.listImages(2, 6)
  assert.equal(page2.images.length, 2)
  assert.equal(page2.images[0].batchId, '20260102T000000Z-b02xx')
  assert.equal(page2.images[1].batchId, '20260101T000000Z-b01xx')
})

// ===== 5. 重 Roll 回路：把 metadata 里的相对路径参考图喂回 generate，从本地读回；缺失文件静默跳过 =====

test('重 Roll：相对路径参考图从本地读回并带进请求；缺失文件静默跳过不中断', async () => {
  const { engine, file, http } = await makeEngine({ endpointMode: 'images' })

  // 第一次生成，带 dataUrl 参考图 → 落盘 + 写进 metadata（相对路径）
  await engine.generate({
    ...baseParams,
    prompt: 'a red fox in snow',
    referenceImages: [{ name: 'ref.png', dataUrl: REF_DATA_URL, source: 'reference' }],
  })
  const meta = findMetadata(file).meta
  const historyRefs = meta.request.referenceImages
  assert.equal(historyRefs.length, 1)
  assert.ok(historyRefs[0].url.startsWith('outputs/'))

  // 用历史相对路径参考图重 Roll：引擎应从 mock 文件系统读回参考内容并带进 multipart 请求
  http.calls.length = 0
  await engine.generate({
    ...baseParams,
    prompt: 'a red fox in snow',
    referenceImages: historyRefs.map((r) => ({ name: r.name, url: r.url, source: r.source })),
  })
  const rerollCall = http.calls[0]
  assert.equal(rerollCall.kind, 'postMultipart', '带参考图应走 /images/edits multipart')
  assert.match(rerollCall.url, /\/v1\/images\/edits$/)
  assert.equal(rerollCall.files.length, 1)
  assert.equal(rerollCall.files[0].base64, REF_B64, '应从本地读回原参考图内容')

  // 缺失文件：参考图指向不存在的相对路径 → 静默跳过，退化为无参考图生成，整批仍完成
  http.calls.length = 0
  const result = await engine.generate({
    ...baseParams,
    prompt: 'a red fox in snow',
    referenceImages: [{ name: 'gone.png', url: 'outputs/does-not-exist/references/reference-01.png', source: 'reference' }],
  })
  assert.equal(result.images.length, 1, '缺失参考图不应中断生成')
  assert.equal(http.calls[0].kind, 'postJson', '无有效参考图应退回 /images/generations')
})

// ===== 6. 远程图片 url：经 getBinary 下载 → 落盘 → metadata 正常，扩展名按 mime 推断 =====

test('images 模式：响应含远程图片 url → getBinary 下载、落盘、metadata 正常，扩展名按 mime 推断', async () => {
  const { engine, file, http } = await makeEngine({ endpointMode: 'images' })
  // 中转站真机故障形态：{data:[{url:"https://..."}]}，简化版旧 walker 会漏掉这张。
  http.responder = () => {
    const body = { data: [{ url: 'https://cdn.example.com/images/abc.png' }] }
    return { status: 200, json: body, text: JSON.stringify(body) }
  }
  // 下载响应给 jpeg：证明扩展名来自下载响应的 content-type，而非 outputFormat(png) 默认值。
  http.binaryResponder = () => ({ status: 200, base64: DOWNLOADED_B64, mimeType: 'image/jpeg' })

  const result = await engine.generate({ ...baseParams, prompt: 'a serene mountain lake at dawn' })

  assert.equal(result.images.length, 1)
  assert.equal(http.binaryCalls.length, 1, 'url 型图片应触发一次 getBinary 下载')
  assert.equal(http.binaryCalls[0], 'https://cdn.example.com/images/abc.png')

  const meta = findMetadata(file).meta
  const img = meta.images[0]
  assert.ok(img.url.startsWith('outputs/'), '落盘 url 为相对路径')
  assert.match(img.id, /\/image-01\.jpg$/, '扩展名应由下载 content-type(jpeg)→jpg 推断')
  assert.equal(file.files.get(img.url), DOWNLOADED_B64, '落盘内容应为下载回来的 base64')
  assert.ok(img.params && img.params.model === 'gpt-image-2', 'metadata 的 params 齐全')
})

// ===== 7. looksLikeImageUrl 边界：/generated/ 无扩展名 url 认；普通网页 url 不认 =====

test('looksLikeImageUrl 边界：/generated/ 无扩展名 url 认作图片；普通网页 url 不认', async () => {
  // 认：带 /generated/ 路径关键字、无扩展名（中转站常见形态）→ 识别并下载
  const a = await makeEngine({ endpointMode: 'images' })
  a.http.responder = () => {
    const body = { data: [{ url: 'https://api.relay.example/generated/9f3c2a' }] }
    return { status: 200, json: body, text: JSON.stringify(body) }
  }
  const okResult = await a.engine.generate({ ...baseParams, prompt: 'a serene mountain lake at dawn' })
  assert.equal(okResult.images.length, 1)
  assert.equal(a.http.binaryCalls.length, 1, '带 /generated/ 的 url 应被识别并下载')

  // 不认：普通网页 url（无图片扩展名、路径无 image/images/files/assets/generated 关键字）
  // → 无可用图片 → 批次级报错、绝不下载
  const b = await makeEngine({ endpointMode: 'images' })
  b.http.responder = () => {
    const body = { data: [{ url: 'https://example.com/pages/article-123' }] }
    return { status: 200, json: body, text: JSON.stringify(body) }
  }
  await assert.rejects(
    () => b.engine.generate({ ...baseParams, prompt: 'a serene mountain lake at dawn' }),
    /未返回任何可用图片数据/,
  )
  assert.equal(b.http.binaryCalls.length, 0, '普通网页 url 不应触发下载')
})

// ===== 8. base64 魔数识别：data 字段里纯 PNG 魔数长字符串被认出直接落盘 =====

test('base64 魔数：data 字段里纯 PNG 魔数长字符串被识别并直接落盘（不走下载）', async () => {
  const { engine, file, http } = await makeEngine({ endpointMode: 'responses' })
  // 上游把裸 base64 放在通用 data 字段（无 b64_json），靠 looksLikeImageBase64 魔数识别命中。
  http.responder = () => {
    const body = { output: [{ type: 'image_generation_call', data: IMG_B64 }] }
    return { status: 200, json: body, text: JSON.stringify(body) }
  }
  const result = await engine.generate({ ...baseParams, prompt: 'a portrait in soft light' })
  assert.equal(result.images.length, 1)
  assert.equal(http.binaryCalls.length, 0, 'base64 直接落盘，不应触发 getBinary 下载')

  const meta = findMetadata(file).meta
  assert.equal(file.files.get(meta.images[0].url), IMG_B64, '落盘内容即识别出的 base64')
})

// ===== 9. url 下载失败：对齐 server.js saveExtractedImages 的 continue 语义（跳过而非抛错）=====

test('url 下载失败：单张跳过、成功那张保留（对齐 server.js saveExtractedImages continue）', async () => {
  const { engine, file, http } = await makeEngine({ endpointMode: 'images' })
  // 同一响应里两个 url：第一个下载失败(404)、第二个成功。server.js: !downloaded → continue。
  http.responder = () => {
    const body = {
      data: [{ url: 'https://cdn.example.com/images/fail.png' }, { url: 'https://cdn.example.com/images/ok.png' }],
    }
    return { status: 200, json: body, text: JSON.stringify(body) }
  }
  http.binaryResponder = (url) =>
    url.includes('fail')
      ? { status: 404, base64: null, mimeType: null }
      : { status: 200, base64: DOWNLOADED_B64, mimeType: 'image/png' }

  // count=1：单次上游请求、单个响应里两个 url；失败那张 continue 跳过、成功那张落盘补足到 limit。
  // （不用 count=2——那会触发 images 模式的多次上游请求，每次都重放同一双 url，语义就不是"单响应内跳过"了。）
  const result = await engine.generate({ ...baseParams, prompt: 'a serene mountain lake at dawn', count: 1 })
  assert.equal(result.images.length, 1, '失败那张跳过、成功那张保留，不中断整批')
  assert.equal(http.binaryCalls.length, 2, '两个 url 都尝试过下载')

  const meta = findMetadata(file).meta
  assert.equal(meta.images.length, 1)
  assert.equal(file.files.get(meta.images[0].url), DOWNLOADED_B64)
})

test('url 全部下载失败：零图片走批次级报错（对齐 server.js images.length===0 throw），下载点不抛错', async () => {
  const { engine, http } = await makeEngine({ endpointMode: 'images' })
  http.responder = () => {
    const body = { data: [{ url: 'https://cdn.example.com/images/only.png' }] }
    return { status: 200, json: body, text: JSON.stringify(body) }
  }
  http.binaryResponder = () => ({ status: 500, base64: null, mimeType: null })

  await assert.rejects(
    () => engine.generate({ ...baseParams, prompt: 'a serene mountain lake at dawn' }),
    /未返回任何可用图片数据/,
    '下载失败被跳过后零图片，应由批次级检查抛错（而非在下载点抛错）',
  )
  assert.equal(http.binaryCalls.length, 1, '下载被尝试过一次')
})

// ===== 10. 原有 b64_json 用例不回归：默认响应 {data:[{b64_json}]} 仍正常落盘 =====

test('b64_json 不回归：默认响应仍识别 b64_json 并落盘，不触发下载', async () => {
  const { engine, file, http } = await makeEngine({ endpointMode: 'images' })
  const result = await engine.generate({ ...baseParams, prompt: 'a serene mountain lake at dawn' })
  assert.equal(result.images.length, 1)
  assert.equal(http.binaryCalls.length, 0, 'b64_json 是内联 base64，不应触发下载')

  const meta = findMetadata(file).meta
  assert.equal(file.files.get(meta.images[0].url), IMG_B64)
  assert.match(meta.images[0].id, /\/image-01\.png$/)
})
