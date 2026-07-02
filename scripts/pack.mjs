#!/usr/bin/env node
// 一键手动发包（本地打 NSIS 安装包，不推 GitHub、不需要 VPN）。
// 适合“手动发包”流程：打完把 exe 丢群里，小伙伴覆盖安装即可。
//
// 用法（在项目根目录）：
//   npm run pack             # 补丁 +1   0.1.4 -> 0.1.5，然后本地打包
//   npm run pack -- minor    # 次版本     0.1.4 -> 0.2.0
//   npm run pack -- major    # 主版本     0.1.4 -> 1.0.0
//   npm run pack -- 0.5.0    # 指定版本号
//   npm run pack -- same     # 不改版本号，直接用当前版本打包（重打）
//
// 说明：
//   - 与 `npm run release`（推 GitHub 触发自动更新）不同，本脚本纯本地，产物在 dist-installer/。
//   - 默认会把抬起来的版本号 commit 掉（保持仓库整洁）；加 --no-commit 可跳过提交。
//   - 不打 git tag、不 push，绝不联网。

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = path.join(root, 'package.json')

const run = (cmd) => execSync(cmd, { cwd: root, encoding: 'utf8' }).trim()
const runLoud = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' })
function die(msg) {
  console.error(`\n✗ ${msg}\n`)
  process.exit(1)
}

// 解析参数：版本号动作 + 开关
const args = process.argv.slice(2)
const noCommit = args.includes('--no-commit')
const bumpArg = (args.find((a) => !a.startsWith('--')) || 'patch').trim()

// 读当前版本
const raw = readFileSync(pkgPath, 'utf8')
const pkg = JSON.parse(raw)
const cur = String(pkg.version || '0.0.0')
const m = cur.match(/^(\d+)\.(\d+)\.(\d+)$/)
if (!m) die(`当前版本号不规范：${cur}`)
const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])]

// 算下一个版本号
let next
if (bumpArg === 'same') next = cur
else if (bumpArg === 'patch') next = `${major}.${minor}.${patch + 1}`
else if (bumpArg === 'minor') next = `${major}.${minor + 1}.0`
else if (bumpArg === 'major') next = `${major + 1}.0.0`
else if (/^\d+\.\d+\.\d+$/.test(bumpArg)) next = bumpArg
else die(`参数看不懂：「${bumpArg}」——用 patch / minor / major / X.Y.Z / same`)

const changed = next !== cur
console.log(`\n手动发包  ${cur}${changed ? ` → ${next}` : '（版本号不变，重打）'}`)

// 写回版本号（只改 version 那一行，保持其余格式）
if (changed) {
  writeFileSync(pkgPath, raw.replace(/("version":\s*")[^"]+(")/, `$1${next}$2`), 'utf8')

  // 可选提交（仅当仓库里 package.json 有改动且允许提交时）
  if (!noCommit) {
    let isRepo = true
    try { run('git rev-parse --is-inside-work-tree') } catch { isRepo = false }
    if (isRepo) {
      try {
        runLoud('git add package.json')
        runLoud(`git commit -m "Bump version to ${next} (manual pack)"`)
      } catch {
        console.warn('（版本号已写入 package.json，但自动提交失败，可稍后手动 commit）')
      }
    }
  }
}

// 本地打包（build:ui + electron-builder nsis，绝不联网发布）
console.log('\n打包中（build:ui + NSIS，可能要几分钟）…\n')
runLoud('npm run build:installer')

// 找到产物并打印绝对路径
const exeRel = path.join('dist-installer', `YaoTu-Setup-${next}-x64.exe`)
const exeAbs = path.join(root, exeRel)
console.log('\n————————————————————————————————————')
if (existsSync(exeAbs)) {
  const mb = (statSync(exeAbs).size / 1048576).toFixed(1)
  console.log(`✓ 安装包已生成（${mb} MB）：`)
  console.log(`  ${exeAbs}`)
  console.log('\n把这个 exe 丢群里，小伙伴双击覆盖安装即可（无需 VPN）。')
} else {
  console.log('打包命令已结束，但没在预期路径找到 exe，请检查 dist-installer/ 目录：')
  console.log(`  预期：${exeAbs}`)
}
console.log('————————————————————————————————————\n')
