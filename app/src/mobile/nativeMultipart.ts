export interface MultipartFileInput {
  fieldName: string
  fileName: string
  mimeType: string
  base64: string
}

export interface NativeFormDataEntry {
  key: string
  value: string
  type: 'base64File' | 'string'
  contentType?: string
  fileName?: string
}

export interface NativeMultipartBody {
  boundary: string
  entries: NativeFormDataEntry[]
}

function makeBoundary(): string {
  return `----YaoTuBoundary${Math.random().toString(36).slice(2)}`
}

// CapacitorHttp's Android implementation accepts this intermediate form and
// decodes base64File entries directly into the multipart output stream.
export function buildNativeMultipartBody(
  fields: Record<string, string>,
  files: MultipartFileInput[],
  boundary = makeBoundary(),
): NativeMultipartBody {
  const entries: NativeFormDataEntry[] = [
    ...Object.entries(fields).map(([key, value]) => ({
      key,
      value,
      type: 'string' as const,
    })),
    ...files.map((file) => ({
      key: file.fieldName,
      value: file.base64,
      type: 'base64File' as const,
      contentType: file.mimeType,
      fileName: file.fileName,
    })),
  ]

  return { boundary, entries }
}
