#!/usr/bin/env node
// 一键发布：bump 版本号 → commit → 打 tag → 推送，触发 GitHub Actions 打包发布到 Releases。
// 小伙伴的桌面版(NSIS 安装版)启动后会自动检测到新版并弹窗引导更新。
//
// 用法（在项目根目录）：
//   npm run release            # 补丁 +1   0.1.2 -> 0.1.3
//   npm run release -- minor   # 次版本     0.1.2 -> 0.2.0
//   npm run release -- major   # 主版本     0.1.2 -> 1.0.0
//   npm run release -- 0.5.0   # 指定版本号
//
// 前置：工作区必须干净（先把改动 commit 掉），且当前 tag 不能重名。

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
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

// 1. 必须是干净的 git 工作区
let status
try {
  status = run('git status --porcelain')
} catch {
  die('这里不是 git 仓库。')
}
if (status) {
  die('工作区还有未提交的改动，先 commit 或 stash 再发布：\n' + status)
}

// 2. 算下一个版本号
const raw = readFileSync(pkgPath, 'utf8')
const pkg = JSON.parse(raw)
const cur = String(pkg.version || '0.0.0')
const m = cur.match(/^(\d+)\.(\d+)\.(\d+)$/)
if (!m) die(`当前版本号不规范：${cur}`)
const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])]

const arg = (process.argv[2] || 'patch').trim()
let next
if (arg === 'patch') next = `${major}.${minor}.${patch + 1}`
else if (arg === 'minor') next = `${major}.${minor + 1}.0`
else if (arg === 'major') next = `${major + 1}.0.0`
else if (/^\d+\.\d+\.\d+$/.test(arg)) next = arg
else die(`参数看不懂：「${arg}」——用 patch / minor / major 或 X.Y.Z`)

const tag = `v${next}`

// 3. tag 不能已存在
if (run('git tag --list').split(/\r?\n/).includes(tag)) {
  die(`tag ${tag} 已存在，换个版本号。`)
}

const branch = run('git rev-parse --abbrev-ref HEAD')
console.log(`\n发布  ${cur} → ${next}   (tag ${tag}, 分支 ${branch})`)

// 4. 只改 version 那一行（保持 package.json 其余格式不动），提交、打 tag、推送
writeFileSync(pkgPath, raw.replace(/("version":\s*")[^"]+(")/, `$1${next}$2`), 'utf8')
runLoud('git add package.json')
runLoud(`git commit -m "Release ${tag}"`)
runLoud(`git tag ${tag}`)

console.log(`\n推送 ${branch} 与 ${tag} …`)
runLoud(`git push origin ${branch}`)
runLoud(`git push origin ${tag}`)

console.log(`\n✓ 已推送 ${tag}。GitHub Actions 正在构建并发布：`)
console.log('  https://github.com/Abisso-Beretta/yaotu-image-studio/actions')
console.log(`  完成后小伙伴的桌面版会自动检测到 ${next}。\n`)
