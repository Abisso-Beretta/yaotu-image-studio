// 纯逻辑：版本号比较 + 从 GitHub /releases 数组里挑出「最新的手机版 release」。
// 零 import——这样测试能用「单文件 TS 免构建加载」范式（transpileModule → data: URL）直接跑，
// 且逻辑不依赖 Capacitor / 网络，可脱机单测。updateCheck.ts 负责真发请求，复用这里的纯函数。

// GitHub /releases 数组里单个 release 的形状（只取我们要用的字段，其余忽略）。
export interface GithubAsset {
  name?: string
  browser_download_url?: string
}
export interface GithubRelease {
  tag_name?: string
  name?: string
  body?: string
  html_url?: string
  draft?: boolean
  prerelease?: boolean
  assets?: GithubAsset[]
}

// 挑选结果：给 UI / updateCheck 用的精简形状。
export interface MobileRelease {
  version: string // 归一化后的纯版本号（无 v / mobile-v 前缀），如 "0.2.0"
  notes: string // release notes 原文（body），可能多行
  apkUrl: string // .apk 资产的下载直链
  htmlUrl: string // release 页面链接（下载失败时兜底给用户点）
}

// 剥掉 tag 里的前缀：容忍 "v1.2.3" / "mobile-v1.2.3" / "1.2.3" 三种写法。
// 先去掉可选的 "mobile-" 前缀，再去掉可选的 "v"，剩下的当版本号主体。
function stripPrefix(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^mobile-/i, '')
    .replace(/^v/i, '')
}

// 把版本主体拆成数字段数组。只取前导的数字点分部分（如 "1.2.3-beta.4" → [1,2,3]），
// 预发布后缀不参与主比较（本项目 tag 都是纯 x.y.z，这里从宽处理不炸）。
function parseParts(raw: string): number[] {
  const core = stripPrefix(raw).split(/[-+]/)[0] // 砍掉 -beta / +build 之类后缀
  if (!core) return []
  return core.split('.').map((seg) => {
    const n = parseInt(seg, 10)
    return Number.isFinite(n) ? n : 0
  })
}

// 语义化比较：返回 1（a>b）/ -1（a<b）/ 0（相等）。
// 容忍 v / mobile-v 前缀；位数不齐时缺的段按 0 补（"1.2" 视作 "1.2.0"，与 "1.2.0" 相等）。
export function compareVersions(a: string, b: string): number {
  const pa = parseParts(a)
  const pb = parseParts(b)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i += 1) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}

// 从 GitHub /releases 数组里挑出「最新的手机版 release」。
// 手机版判定：tag_name 以 mobile-v 开头（大小写不敏感）且带至少一个 .apk 资产
// ——桌面 release（tag v*，资产是 .exe）据此被过滤掉。取版本号最大的一个。
// 返回 {version, notes, apkUrl, htmlUrl}；无符合项 → null。
export function pickLatestMobileRelease(releases: GithubRelease[] | null | undefined): MobileRelease | null {
  if (!Array.isArray(releases)) return null

  let best: MobileRelease | null = null
  for (const rel of releases) {
    if (!rel || typeof rel !== 'object') continue
    const tag = String(rel.tag_name || '')
    // 只认 mobile-v 前缀的 tag（桌面版是纯 v*，会在这里被排除）
    if (!/^mobile-v/i.test(tag)) continue
    // 草稿 release 不算数（还没正式发出来）
    if (rel.draft) continue

    // 找 .apk 资产：没有下载直链的手机版 release 对用户没意义，跳过
    const assets = Array.isArray(rel.assets) ? rel.assets : []
    const apk = assets.find(
      (as) => as && typeof as.browser_download_url === 'string' && /\.apk$/i.test(String(as.name || '')),
    )
    if (!apk || !apk.browser_download_url) continue

    const candidate: MobileRelease = {
      version: stripPrefix(tag),
      notes: String(rel.body || '').trim(),
      apkUrl: apk.browser_download_url,
      htmlUrl: String(rel.html_url || ''),
    }
    // 取版本号最大者；GitHub 返回顺序不保证严格，故显式比较而非直接取第一个。
    if (!best || compareVersions(candidate.version, best.version) > 0) {
      best = candidate
    }
  }
  return best
}
