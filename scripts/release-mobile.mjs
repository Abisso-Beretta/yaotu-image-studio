#!/usr/bin/env node
// 一键发布手机版：bump 安卓 versionName/versionCode → commit → 打 tag → 推送，
// 触发 GitHub Actions 用正式 keystore 打签名 APK 并发布到 Releases。
//
// 用法（在项目根目录）：
//   npm run release:mobile            # 补丁 +1   0.2.0 -> 0.2.1
//   npm run release:mobile -- minor   # 次版本     0.2.0 -> 0.3.0
//   npm run release:mobile -- major   # 主版本     0.2.0 -> 1.0.0
//   npm run release:mobile -- 0.5.0   # 指定版本号
//
// 每次发布 versionCode 自动 +1（安卓覆盖安装升级要求它单调递增）。
// 前置：工作区必须干净（先把改动 commit 掉），且当前 tag 不能重名。

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const gradlePath = path.join(root, 'app', 'android', 'app', 'build.gradle')

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

// 2. 从 build.gradle 读当前 versionName/versionCode
const raw = readFileSync(gradlePath, 'utf8')
const nameMatch = raw.match(/versionName\s+"(\d+)\.(\d+)\.(\d+)"/)
if (!nameMatch) die('build.gradle 里找不到规范的 versionName "X.Y.Z"。')
const codeMatch = raw.match(/versionCode\s+(\d+)/)
if (!codeMatch) die('build.gradle 里找不到 versionCode。')
const cur = `${nameMatch[1]}.${nameMatch[2]}.${nameMatch[3]}`
const [major, minor, patch] = [Number(nameMatch[1]), Number(nameMatch[2]), Number(nameMatch[3])]
const curCode = Number(codeMatch[1])

const arg = (process.argv[2] || 'patch').trim()
let next
if (arg === 'patch') next = `${major}.${minor}.${patch + 1}`
else if (arg === 'minor') next = `${major}.${minor + 1}.0`
else if (arg === 'major') next = `${major + 1}.0.0`
else if (/^\d+\.\d+\.\d+$/.test(arg)) next = arg
else die(`参数看不懂：「${arg}」——用 patch / minor / major 或 X.Y.Z`)

const nextCode = curCode + 1
const tag = `mobile-v${next}`

// 3. tag 不能已存在
if (run('git tag --list').split(/\r?\n/).includes(tag)) {
  die(`tag ${tag} 已存在，换个版本号。`)
}

const branch = run('git rev-parse --abbrev-ref HEAD')
console.log(`\n发布手机版  ${cur} → ${next}   (versionCode ${curCode} → ${nextCode}, tag ${tag}, 分支 ${branch})`)

// 4. 只改 versionName / versionCode 两行（保持 build.gradle 其余格式不动），提交、打 tag、推送
const updated = raw
  .replace(/(versionName\s+")\d+\.\d+\.\d+(")/, `$1${next}$2`)
  .replace(/(versionCode\s+)\d+/, `$1${nextCode}`)
writeFileSync(gradlePath, updated, 'utf8')
runLoud('git add app/android/app/build.gradle')
runLoud(`git commit -m "Mobile release v${next}"`)
runLoud(`git tag ${tag}`)

console.log(`\n推送 ${branch} 与 ${tag} …`)
runLoud(`git push origin ${branch}`)
runLoud(`git push origin ${tag}`)

console.log(`\n✓ 已推送 ${tag}。GitHub Actions 正在构建签名 APK 并发布：`)
console.log('  https://github.com/Abisso-Beretta/yaotu-image-studio/actions')
console.log(`  完成后在 Releases 页可下载 yaotu-mobile-v${next}.apk。\n`)
