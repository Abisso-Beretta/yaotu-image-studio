import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import ts from '../app/node_modules/typescript/lib/typescript.js'

async function loadRerollModule() {
  const filename = path.resolve('app/src/lib/reroll.ts')
  const source = await fs.readFile(filename, 'utf8')
  const result = ts.transpileModule(source, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  })
  const errors = (result.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
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

const { buildRerollParams } = await loadRerollModule()

function occurrences(text, marker) {
  return text.split(marker).length - 1
}

test('重 Roll 直接复用历史最终提示词，不重复编排风格和负面词', () => {
  const prompt = [
    'portrait subject',
    '',
    'Creative direction:',
    '- Style DNA: gothic cel shading',
    '',
    'Negative prompt / avoid:',
    '- blurry, watermark',
  ].join('\n')

  const body = buildRerollParams({
    id: 'history/image.png',
    url: '/outputs/history/image.png',
    request: {
      prompt,
      negativePrompt: 'blurry, watermark',
      model: 'gpt-image-2',
      size: '3840x2160',
      quality: 'high',
      n: 4,
      output_format: 'png',
      output_compression: 0,
      background: 'auto',
      referenceImages: [
        { name: 'style.jpg', url: '/outputs/history/references/style.jpg', source: 'saved-style-reference' },
        { name: 'missing.jpg', source: 'reference' },
      ],
      manjuContext: {
        type: 'shot',
        title: '第一集',
        category: 'shot',
        characters: ['爱丽丝'],
      },
    },
  })

  assert.ok(body)
  assert.equal(body.prompt, prompt)
  assert.equal(occurrences(body.prompt, 'Creative direction:'), 1)
  assert.equal(occurrences(body.prompt, 'Negative prompt / avoid:'), 1)
  assert.equal(body.negativePrompt, 'blurry, watermark')
  assert.equal(body.count, 1)
  assert.equal(body.outputCompression, 0)
  assert.deepEqual(body.referenceImages, [
    { name: 'style.jpg', dataUrl: undefined, url: '/outputs/history/references/style.jpg', source: 'saved-style-reference' },
  ])
  assert.deepEqual(body.manjuContext, {
    type: 'shot',
    title: '第一集',
    category: 'shot',
    characters: ['爱丽丝'],
  })
})

test('重 Roll 没有任何历史提示词时拒绝生成', () => {
  assert.equal(buildRerollParams({ id: 'empty', url: '/outputs/empty.png' }), null)
})

test('老图没有 manjuContext 时，重 Roll 返回值里不带这个键', () => {
  const body = buildRerollParams({
    id: 'history/old.png',
    url: '/outputs/history/old.png',
    request: {
      prompt: 'legacy prompt without manju context',
    },
  })

  assert.ok(body)
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'manjuContext'), false)
})
