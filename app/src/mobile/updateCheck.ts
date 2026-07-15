// 手机版「检查更新」的网络编排层：拿当前版本 → 请求 GitHub /releases → 复用 updateVersion 的纯函数挑最新手机版 → 比较。
// 纯逻辑全在 updateVersion.ts；这里只管 Capacitor 侧的副作用（getInfo / CapacitorHttp）与中文友好文案。
import { App } from '@capacitor/app'
import { CapacitorHttp } from '@capacitor/core'
import { compareVersions, pickLatestMobileRelease, type GithubRelease } from './updateVersion'

// 检查更新的仓库与端点。写死本项目仓库；per_page=15 足够覆盖近期几次手机+桌面混合发布。
const RELEASES_URL =
  'https://api.github.com/repos/Abisso-Beretta/yaotu-image-studio/releases?per_page=15'
// 用户网络连 GitHub 不稳，超时压到 10 秒——连不上就早早给友好文案，别让转圈无限挂着。
const TIMEOUT_MS = 10_000

export interface UpdateCheckResult {
  status: 'latest' | 'update' | 'error'
  current: string // 当前 App 版本（versionName）
  latest?: string // 最新手机版版本号（有更新 / 已最新时给）
  notes?: string // release notes（有更新时给）
  apkUrl?: string // apk 下载直链（有更新时给）
  htmlUrl?: string // release 页面（有更新时给，下载兜底）
  message?: string // 出错时的中文友好文案
}

// 拿当前 App 版本。@capacitor/app getInfo().version 在 Android 上就是 package 的 versionName。
// 拿不到（异常）时退回空串，让上层显示「—」而不是崩。
async function getCurrentVersion(): Promise<string> {
  try {
    const info = await App.getInfo()
    return String(info?.version || '').trim()
  } catch {
    return ''
  }
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const current = await getCurrentVersion()

  let resp: { status: number; data: unknown }
  try {
    resp = await CapacitorHttp.get({
      url: RELEASES_URL,
      // 不带任何 token——公开仓库的 releases 匿名可读；带 token 反而有泄露风险。
      headers: { Accept: 'application/vnd.github+json' },
      connectTimeout: TIMEOUT_MS,
      readTimeout: TIMEOUT_MS,
    })
  } catch {
    // 网络异常 / 超时：CapacitorHttp 会 reject。给「连不上」级别的友好文案。
    return { status: 'error', current, message: '连不上 GitHub，稍后再试' }
  }

  if (!resp || resp.status !== 200) {
    // 非 200（限流 403 / 5xx / 404 等）：不暴露原始状态码，统一友好文案。
    return { status: 'error', current, message: '检查更新失败，稍后再试' }
  }

  // CapacitorHttp 的 data 可能是已解析对象，也可能是字符串（视原生层与 content-type 而定），两种都兜。
  let releases: GithubRelease[]
  try {
    const raw = resp.data
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) throw new Error('unexpected shape')
    releases = parsed as GithubRelease[]
  } catch {
    return { status: 'error', current, message: '解析更新信息失败，稍后再试' }
  }

  const latest = pickLatestMobileRelease(releases)
  if (!latest) {
    // 仓库里暂时没有任何手机版 release——当作「已是最新」（没有可升级目标）。
    return { status: 'latest', current }
  }

  // 当前版本比最新的旧 → 有更新；否则已最新。current 为空（getInfo 失败）时保守当作有更新，让用户能看到最新版。
  const hasUpdate = !current || compareVersions(current, latest.version) < 0
  if (hasUpdate) {
    return {
      status: 'update',
      current,
      latest: latest.version,
      notes: latest.notes,
      apkUrl: latest.apkUrl,
      htmlUrl: latest.htmlUrl,
    }
  }
  return { status: 'latest', current, latest: latest.version }
}
