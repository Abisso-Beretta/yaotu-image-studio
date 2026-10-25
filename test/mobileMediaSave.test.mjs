import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
import { webcrypto } from 'node:crypto'
import ts from '../app/node_modules/typescript/lib/typescript.js'

const source = await fs.readFile(new URL('../app/src/mobile/mediaSave.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})

// 模拟真机插件的同名覆盖语义，直接执行生产保存入口，而不是只测试文件名拼接。
function makeAlbum({ crypto = webcrypto, albumExists = false } = {}) {
  const photos = new Map()
  const calls = []
  const albumPath = '/media/妖荼'
  const modules = {
    '@capacitor-community/media': {
      Media: {
        async getAlbumsPath() { return { path: '/media/' } },
        async createAlbum() {
          if (albumExists) throw new Error('Album already exists')
          albumExists = true
        },
        async savePhoto(options) {
          const extension = options.path.slice(options.path.lastIndexOf('.'))
          const destination = `${options.albumIdentifier}/${options.fileName}${extension}`
          photos.set(destination, options.path)
          calls.push(options)
          return { filePath: destination }
        },
      },
    },
    '@capacitor/filesystem': {
      Directory: { Data: 'DATA' },
      Filesystem: {
        async getUri({ path }) { return { uri: `file:///data/${path}` } },
      },
    },
  }
  const exports = {}
  // 固定时间和随机数，验证旧 WebView fallback 在快速重复/并发保存时仍能区分文件。
  class FixedDate extends Date { static now() { return 1792915200000 } }
  const math = Object.create(Math)
  math.random = () => 0.5
  vm.runInNewContext(outputText, {
    exports,
    crypto,
    Date: FixedDate,
    Math: math,
    require(name) {
      assert.ok(Object.hasOwn(modules, name), `Unexpected import: ${name}`)
      return modules[name]
    },
  })
  return { save: exports.saveImageToAlbum, photos, calls, albumPath }
}

test('相册连续保存不同批次的 image-01，保留第一张和第二张', async () => {
  const { save, photos, calls, albumPath } = makeAlbum()
  await save('outputs/batch-one/image-01.png')
  const firstDestination = [...photos.keys()][0]
  const firstSource = photos.get(firstDestination)
  await save('outputs/batch-two/image-01.png')

  assert.equal(photos.size, 2)
  assert.equal(photos.get(firstDestination), firstSource, '后保存的图片不得覆盖第一张')
  assert.ok([...photos.values()].includes('file:///data/outputs/batch-two/image-01.png'))
  assert.ok(calls.every((call) => call.albumIdentifier === albumPath))
  assert.ok(calls[0].fileName.includes('batch-one-image-01'))
  assert.ok(calls[1].fileName.includes('batch-two-image-01'))
})

test('相册重复保存同一张图片也使用不同文件名', async () => {
  const { save, photos } = makeAlbum({ albumExists: true })
  await save('outputs/batch-one/image-01.png')
  await save('outputs/batch-one/image-01.png')
  assert.equal(photos.size, 2)
})

test('旧 WebView 缺少 randomUUID 时，同一毫秒并发保存仍不覆盖并保留源格式', async () => {
  const { save, photos, calls } = makeAlbum({ crypto: null })
  await Promise.all([
    save('/outputs/batch-one/image-01.jpeg'),
    save('/outputs/batch-one/image-01.jpeg'),
    save('outputs/batch-two/image-01.webp'),
    save('outputs/batch-three/image-01.png'),
  ])
  assert.equal(photos.size, 4)
  assert.equal(new Set(calls.map((call) => call.fileName)).size, 4)
  assert.ok(calls.every((call) => !call.fileName.includes('.')), '交给插件的 fileName 不含扩展名')
  assert.equal([...photos.keys()].filter((key) => key.endsWith('.jpeg')).length, 2)
  assert.ok([...photos.keys()].some((key) => key.endsWith('.webp')))
  assert.ok([...photos.keys()].some((key) => key.endsWith('.png')))
})

test('空路径保存失败且不写入相册', async () => {
  const { save, photos } = makeAlbum()
  await assert.rejects(save(''), /图片路径为空/)
  assert.equal(photos.size, 0)
})
