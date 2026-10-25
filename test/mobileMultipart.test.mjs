import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import ts from '../app/node_modules/typescript/lib/typescript.js'

async function loadMultipartModule() {
  const filename = path.resolve('app/src/mobile/nativeMultipart.ts')
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
    throw new Error(ts.formatDiagnostics(errors, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
    }))
  }
  const url = `data:text/javascript;base64,${Buffer.from(result.outputText).toString('base64')}`
  return import(url)
}

const { buildNativeMultipartBody } = await loadMultipartModule()

test('手机版参考图请求使用 Capacitor 原生 formData 条目', () => {
  const imageBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD='
  const result = buildNativeMultipartBody(
    { model: 'gpt-image-2', prompt: '保持人物一致，生成新的构图' },
    [{
      fieldName: 'image[]',
      fileName: 'reference-01.jpg',
      mimeType: 'image/jpeg',
      base64: imageBase64,
    }],
    '----test-boundary',
  )

  assert.equal(result.boundary, '----test-boundary')
  assert.deepEqual(result.entries, [
    { key: 'model', value: 'gpt-image-2', type: 'string' },
    { key: 'prompt', value: '保持人物一致，生成新的构图', type: 'string' },
    {
      key: 'image[]',
      value: imageBase64,
      type: 'base64File',
      contentType: 'image/jpeg',
      fileName: 'reference-01.jpg',
    },
  ])
})
