import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import ts from '../app/node_modules/typescript/lib/typescript.js'

// 照抄 test/mobileEngine.test.mjs 的「单文件 TS 免构建加载」范式：只转译 updateVersion.ts。
// 它零运行时 import（只有 export interface 与纯函数），编译后不残留任何 import，
// 直接包成 data: URL 动态 import 即可脱机单测——不碰 Capacitor / 网络。
async function loadUpdateVersionModule() {
  const filename = path.resolve('app/src/mobile/updateVersion.ts')
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

const { compareVersions, pickLatestMobileRelease } = await loadUpdateVersionModule()

// ===== compareVersions：大小 / 相等 / 前缀容忍 / 位数不齐 =====

test('compareVersions：基本大小比较', () => {
  assert.equal(compareVersions('1.2.3', '1.2.2'), 1)
  assert.equal(compareVersions('1.2.2', '1.2.3'), -1)
  assert.equal(compareVersions('2.0.0', '1.9.9'), 1)
  // 逐段数值比较，不是字符串比较：10 > 9
  assert.equal(compareVersions('1.10.0', '1.9.0'), 1)
})

test('compareVersions：相等', () => {
  assert.equal(compareVersions('1.2.3', '1.2.3'), 0)
  assert.equal(compareVersions('0.0.0', '0.0.0'), 0)
})

test('compareVersions：容忍 v / mobile-v 前缀（混搭也认）', () => {
  assert.equal(compareVersions('v1.2.3', '1.2.3'), 0)
  assert.equal(compareVersions('mobile-v1.2.3', 'v1.2.3'), 0)
  assert.equal(compareVersions('mobile-v2.0.0', 'v1.9.9'), 1)
  assert.equal(compareVersions('V1.2.3', 'mobile-V1.2.4'), -1) // 大小写不敏感
})

test('compareVersions：位数不齐按 0 补齐', () => {
  assert.equal(compareVersions('1.2', '1.2.0'), 0)
  assert.equal(compareVersions('1', '1.0.0'), 0)
  assert.equal(compareVersions('1.2.1', '1.2'), 1)
  assert.equal(compareVersions('1.2', '1.2.1'), -1)
})

// ===== pickLatestMobileRelease：过滤 / 取最新 / 空数组 =====

// 造一个手机版 release（带 .apk 资产）
function mobileRelease(version, extra = {}) {
  return {
    tag_name: `mobile-v${version}`,
    body: `手机版 ${version} 更新说明`,
    html_url: `https://github.com/x/y/releases/tag/mobile-v${version}`,
    assets: [
      { name: `yaotu-mobile-v${version}.apk`, browser_download_url: `https://dl/mobile-v${version}.apk` },
    ],
    ...extra,
  }
}

// 造一个桌面版 release（tag v*，资产是 .exe）——应被过滤掉
function desktopRelease(version) {
  return {
    tag_name: `v${version}`,
    body: `桌面版 ${version}`,
    html_url: `https://github.com/x/y/releases/tag/v${version}`,
    assets: [{ name: `YaoTu-${version}-x64.exe`, browser_download_url: `https://dl/YaoTu-${version}.exe` }],
  }
}

test('pickLatestMobileRelease：混入桌面 v* release 被过滤，只取手机版', () => {
  const releases = [
    desktopRelease('0.1.9'),
    mobileRelease('0.2.0'),
    desktopRelease('0.2.1'), // 桌面版更高版本号也不许被选中
  ]
  const picked = pickLatestMobileRelease(releases)
  assert.ok(picked)
  assert.equal(picked.version, '0.2.0')
  assert.equal(picked.apkUrl, 'https://dl/mobile-v0.2.0.apk')
  assert.ok(picked.notes.includes('0.2.0'))
  assert.equal(picked.htmlUrl, 'https://github.com/x/y/releases/tag/mobile-v0.2.0')
})

test('pickLatestMobileRelease：mobile-v 前缀但无 .apk 资产的被过滤', () => {
  const noApk = {
    tag_name: 'mobile-v0.3.0',
    body: '误发：忘了传 apk',
    html_url: 'https://x',
    assets: [{ name: 'source.zip', browser_download_url: 'https://dl/source.zip' }],
  }
  const releases = [noApk, mobileRelease('0.2.0')]
  const picked = pickLatestMobileRelease(releases)
  assert.ok(picked)
  assert.equal(picked.version, '0.2.0', '无 apk 的 0.3.0 被跳过，退回 0.2.0')
})

test('pickLatestMobileRelease：取版本号最大的（不依赖数组顺序）', () => {
  const releases = [
    mobileRelease('0.2.0'),
    mobileRelease('0.10.0'), // 数值上比 0.2.0 大
    mobileRelease('0.9.0'),
  ]
  const picked = pickLatestMobileRelease(releases)
  assert.equal(picked.version, '0.10.0')
})

test('pickLatestMobileRelease：草稿 release 被过滤', () => {
  const draft = mobileRelease('0.5.0', { draft: true })
  const releases = [draft, mobileRelease('0.2.0')]
  const picked = pickLatestMobileRelease(releases)
  assert.equal(picked.version, '0.2.0', '草稿 0.5.0 不算，取 0.2.0')
})

test('pickLatestMobileRelease：空数组 → null', () => {
  assert.equal(pickLatestMobileRelease([]), null)
})

test('pickLatestMobileRelease：全是桌面版 / 无有效手机版 → null', () => {
  assert.equal(pickLatestMobileRelease([desktopRelease('0.1.9'), desktopRelease('0.2.0')]), null)
})

test('pickLatestMobileRelease：非数组入参（null/undefined）→ null', () => {
  assert.equal(pickLatestMobileRelease(null), null)
  assert.equal(pickLatestMobileRelease(undefined), null)
})
