// 手机版「保存到相册」纯平台功能：把 App 私有目录（Directory.Data）下的成图
// 复制进系统相册的「妖荼」相册。独立于出图引擎（engine.ts/adapters.ts），只做平台 UI。
//
// 选型：@capacitor-community/media@7.0.0——Capacitor 6 对应的最新版（peer @capacitor/core ^6.0.0）。
// 关键结论（读该插件 android 源码 MediaPlugin.java 确认）：
//  1. 非 gallery 模式下 isStoragePermissionGranted() 恒为 true，savePhoto/createAlbum 不申请任何权限，
//     所以 AndroidManifest 无需新增权限（仅 INTERNET，已有）。前提是不要开 androidGalleryMode。
//  2. Android 上 savePhoto 的 albumIdentifier 必填，且是相册目录的「绝对路径」（源码 new File(album) 判存在）。
//     自建相册可能不出现在 getAlbums() 里（非 gallery 模式只查 INTERNAL_CONTENT_URI），
//     故这里不依赖 getAlbums()，而是用 getAlbumsPath() 根路径 + 相册名自行拼出绝对路径，
//     并用 createAlbum() 确保目录存在（已存在时插件 reject "Album already exists"，忽略即可）。
//  3. savePhoto 的 path 接受 file:// uri（源码 Uri.parse(path).getPath()），所以直接喂
//     Filesystem.getUri 得到的绝对 uri；fileName 不带扩展名（扩展名从源文件继承，保持 .png）。
import { Media } from '@capacitor-community/media'
import { Filesystem, Directory } from '@capacitor/filesystem'

// 相册名。落地目录为 <外部 media 根>/妖荼/，会被媒体库扫描到，相册可见。
const ALBUM_NAME = '妖荼'

// 「妖荼」相册的绝对路径缓存：首次成功建立/确认后缓存，避免每次保存都 getAlbumsPath + createAlbum。
let cachedAlbumIdentifier: string | null = null

// 确保「妖荼」相册存在，返回它的绝对路径（= savePhoto 需要的 albumIdentifier）。
async function ensureAlbumIdentifier(): Promise<string> {
  if (cachedAlbumIdentifier) return cachedAlbumIdentifier

  // 相册根路径（Android 的 getExternalMediaDirs()[0]）。拼出「妖荼」相册目录的绝对路径。
  const { path: albumsRoot } = await Media.getAlbumsPath()
  const identifier = `${albumsRoot.replace(/\/+$/, '')}/${ALBUM_NAME}`

  // createAlbum 幂等化：目录不存在则创建；已存在时插件会 reject（"Album already exists"），
  // 那是预期情况，吞掉即可——目录在就行。其余错误（无法创建）才向上抛。
  try {
    await Media.createAlbum({ name: ALBUM_NAME })
  } catch (e) {
    const msg = String((e as Error)?.message || '')
    if (!/exist/i.test(msg)) throw e
  }

  cachedAlbumIdentifier = identifier
  return identifier
}

// 把 Directory.Data 下的相对路径（如 'outputs/<batchId>/image-01.png'）保存进系统相册的「妖荼」相册。
// 失败会 throw，由调用方（MobileViewer）转成用户可见反馈。
export async function saveImageToAlbum(relPath: string): Promise<void> {
  // 统一剥前导斜杠：兼容 '/outputs/...' 与 'outputs/...' 两种形态。
  const clean = String(relPath || '').replace(/^\/+/, '')
  if (!clean) throw new Error('图片路径为空，无法保存。')

  // 相对路径 → 绝对 file:// uri。savePhoto 直接吃这个 uri。
  const { uri } = await Filesystem.getUri({ path: clean, directory: Directory.Data })

  const albumIdentifier = await ensureAlbumIdentifier()

  // fileName 不带扩展名（插件从源文件继承扩展名，保持 .png）；用源文件名去掉扩展名，便于识别。
  const base = clean.split('/').pop() || 'image'
  const fileName = base.replace(/\.[^.]+$/, '')

  await Media.savePhoto({ path: uri, albumIdentifier, fileName })
}
