import type { GenerateParams, GeneratedImage, ReferenceImageInput } from '@/types'

function copyReferenceImages(img: GeneratedImage): ReferenceImageInput[] {
  return (img.request?.referenceImages || [])
    .map(({ name, dataUrl, url, source }) => ({ name, dataUrl, url, source }))
    .filter((reference) => Boolean(reference.dataUrl || reference.url))
}

/**
 * 重 Roll 必须复用历史记录里的最终请求，不能再次经过 composePrompt。
 * 否则已经包含用途、风格 DNA 和负面词的 prompt 会被重复拼接。
 */
export function buildRerollParams(img: GeneratedImage): GenerateParams | null {
  const request = img.request
  const prompt = String(request?.prompt || img.prompt || '').trim()
  if (!prompt) return null

  return {
    prompt,
    negativePrompt: request?.negativePrompt?.trim() || undefined,
    model: request?.model?.trim() || undefined,
    size: request?.size || 'auto',
    quality: request?.quality || 'auto',
    count: 1,
    outputFormat: request?.output_format || 'png',
    background: request?.background || 'auto',
    outputCompression: request?.output_compression ?? 85,
    referenceImages: copyReferenceImages(img),
    ...(request?.manjuContext ? { manjuContext: request.manjuContext } : {}),
  }
}
