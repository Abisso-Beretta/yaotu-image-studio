// 手写类型声明：描述 shared/promptBuilders.cjs 这个 CommonJS 模块的对外形状，供 app 端 TS 消费。
//
// 为什么需要它、以及它怎么和 .cjs 挂上钩：
//   - .cjs 是纯 JS（app 的 tsconfig 没开 allowJs），TS 读不到它的类型，必须靠这份 .d.ts。
//   - app 端通过别名 `@shared/promptBuilders` 引用本模块。tsconfig 的 paths 把该别名解析到
//     `../shared/promptBuilders`（无扩展名）→ 命中同名的这份 .d.ts 拿类型；vite.config.ts 的 alias 则把
//     同一个别名解析到真正的 `../shared/promptBuilders.cjs` 拿运行时实现。二者由「别名一致」这一约定绑定，
//     这是抽到 app/ 外部换来的取舍（详见 vite.config.ts / tsconfig.json 注释）。
//
// engine.ts 因为「单文件可测」约束不能 import 运行时值，只经 EngineDeps.promptBuilders 注入本模块；
// 注入体的静态类型就是下面的 PromptBuilders（adapters.ts 从这里 import type 后写进 EngineDeps）。

export function normalizePromptOptimizeMode(value: unknown): string

export function buildPromptOptimizationPrompt(input: {
  prompt: string
  negativePrompt?: string
  mode: string
  targetSize?: string
  purpose?: string
  styleSelected?: boolean
  styleName?: string
}): string

export function extractOptimizedPromptText(text: unknown): string

export function extractOptimizedNegativePromptText(text: unknown): string

export function buildAnalysisPrompt(mode: string, targetSize?: string): string

export function maxTokensForAnalysisMode(mode: string): number

export function normalizeAnalysisTargetSize(value: unknown): string

export function analysisTargetCanvasInstruction(value: unknown): string

export function buildPromptExtractionPrompt(targetSize?: string): string

export function buildKeywordExtractionPrompt(): string

export function buildStyleExtractionPrompt(): string

export function buildSceneExtractionPrompt(): string

export function extractTextFromModelResponse(responseBody: unknown): string

// 校验分析模式，非法值抛错（形状同 server.js httpError：带 statusCode / publicMessage）。
export function normalizeAnalysisMode(value: unknown): string

// 注入进手机引擎 EngineDeps 的类型面。与上面的具名导出一一对应，
// 手机引擎只用到其中的优化/分析相关子集，这里给全，便于其它调用方复用。
export interface PromptBuilders {
  normalizePromptOptimizeMode(value: unknown): string
  buildPromptOptimizationPrompt(input: {
    prompt: string
    negativePrompt?: string
    mode: string
    targetSize?: string
    purpose?: string
    styleSelected?: boolean
    styleName?: string
  }): string
  extractOptimizedPromptText(text: unknown): string
  extractOptimizedNegativePromptText(text: unknown): string
  buildAnalysisPrompt(mode: string, targetSize?: string): string
  maxTokensForAnalysisMode(mode: string): number
  normalizeAnalysisTargetSize(value: unknown): string
  analysisTargetCanvasInstruction(value: unknown): string
  buildPromptExtractionPrompt(targetSize?: string): string
  buildKeywordExtractionPrompt(): string
  buildStyleExtractionPrompt(): string
  buildSceneExtractionPrompt(): string
  extractTextFromModelResponse(responseBody: unknown): string
  normalizeAnalysisMode(value: unknown): string
}
