// 手机端「拍照 / 相册」取图的统一入口：把 @capacitor/camera 拿到的图片一律转成 File[]，
// 再交给 store 的 addRefFiles / addAnalysisFiles——复用它们既有的 dataUrl 转换、去重、
// 数量上限与 id 生成逻辑，不在组件里另造一套图片状态。
//
// 权限结论（读插件 README + android/CameraPlugin.java 源码确认，Android 14 / API 34）：
//   - 拍照 getPhoto(source:Camera)：只有当 App 在 Manifest 里「主动声明」了 CAMERA 权限时才申请它
//     （isPermissionDeclared(CAMERA)）；我们不声明，故无需 CAMERA 权限也能拍照。
//   - 相册 pickImages：走系统 Photo Picker（Android 11+ 原生，旧机型 GMS 回填），不需要
//     READ_MEDIA_IMAGES / READ_EXTERNAL_STORAGE。
//   - saveToGallery 一律不开（默认 false），所以不需要读写外部存储权限。
// 结论：Manifest 只需保留原有 INTERNET，另加官方推荐的 Photo Picker 回填 service 声明即可。
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

// 用户取消拍照/选图时插件会 reject（文案含 cancel / no image），调用方据此静默处理、不当报错。
export function isCameraCancel(e: unknown): boolean {
  const msg = String((e as Error)?.message || '').toLowerCase()
  return msg.includes('cancel') || msg.includes('no image')
}

// dataUrl / webPath 统一转 File：fetch 出 blob 再包成 File。
// 相册 pickImages 返回 webPath（可被 webview 直接 fetch 的显示 url），拍照 getPhoto 返回 dataUrl，
// 两者都能被 webview 的 fetch 读到，转成 File 后走 store 既有的 fileToDataUrl 落成 dataUrl。
async function urlToFile(url: string, name: string): Promise<File> {
  const res = await fetch(url)
  const blob = await res.blob()
  // Android 拍照/选图统一输出 jpeg；blob.type 兜底成 image/jpeg，确保能过 store 的 image/ 前缀过滤。
  const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg'
  return new File([blob], name, { type })
}

// 拍照：调系统相机，DataUrl 直接回来。返回单元素数组，便于和相册选择合流。
export async function takePhoto(): Promise<File[]> {
  const photo = await Camera.getPhoto({
    source: CameraSource.Camera,
    resultType: CameraResultType.DataUrl,
    quality: 90,
    correctOrientation: true,
  })
  if (!photo.dataUrl) return []
  const ext = photo.format || 'jpg'
  return [await urlToFile(photo.dataUrl, `camera-${Date.now()}.${ext}`)]
}

// 相册多选：Photo Picker 返回 webPath，逐张 fetch 转 File。limit 限制最多可选张数
// （仅 Android 13+/iOS 生效；旧机型不限，最终由 store 的数量上限兜底 slice）。
export async function pickFromGallery(limit: number): Promise<File[]> {
  const { photos } = await Camera.pickImages({
    quality: 90,
    limit: Math.max(1, limit),
    correctOrientation: true,
  })
  const files: File[] = []
  for (const p of photos) {
    const src = p.webPath || p.path
    if (!src) continue
    const ext = p.format || 'jpg'
    files.push(await urlToFile(src, `gallery-${Date.now()}-${files.length}.${ext}`))
  }
  return files
}
