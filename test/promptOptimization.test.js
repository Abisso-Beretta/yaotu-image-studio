const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// require('../server') 时模块顶层会 loadDotEnv 读真实 .env、并 mkdirSync dataDir/outputDir，
// 所以必须在 require 之前把 YAOTU_DATA_DIR 指到临时目录，绝不碰真实 outputs。
const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "yaotu-promptoptimization-"));
process.env.YAOTU_DATA_DIR = tmpDataDir;

const { buildPromptOptimizationPrompt } = require("../server");

after(() => {
  try {
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  } catch {
    // 清理失败不影响结论
  }
});

test("已选择独立风格时，优化器只处理内容层并禁止竞争风格", () => {
  const prompt = buildPromptOptimizationPrompt({
    prompt: "成年女性机械工程师在维修舱检修机器人，写实电影感概念艺术",
    negativePrompt: "银白长发，红眼，哥特服装",
    mode: "quality",
    targetSize: "3840x2160",
    purpose: "软件背景",
    styleSelected: true,
    styleName: "哥特暖调",
  });

  assert.match(prompt, /独立风格拥有最高风格优先级/);
  assert.match(prompt, /风格名称只是元数据/);
  assert.match(prompt, /严格限制在 CONTENT layer/);
  assert.match(prompt, /删除这些画风词/);
  assert.match(prompt, /photorealistic、realistic、cinematic、anime/);
  assert.match(prompt, /masterpiece、best quality、8k/);
  assert.match(prompt, /requested output canvas is 3840x2160 \(landscape\)/);
  assert.match(prompt, /当前用途为“软件背景”/);
  assert.match(prompt, /用途只影响内容组织、主体占比、信息层级和留白/);
});

test("没有独立风格时，不替用户擅自选择视觉路线", () => {
  const prompt = buildPromptOptimizationPrompt({
    prompt: "一座暴雨中的空城",
    negativePrompt: "",
    mode: "quality",
    targetSize: "2160x3840",
    purpose: "自由创作",
    styleSelected: false,
  });

  assert.match(prompt, /若原文明确给出一种画风或媒介，保留该单一路线/);
  assert.match(prompt, /若原文没有明确画风，保持风格层开放/);
  assert.match(prompt, /不得自行决定摄影、写实、动漫、3D、插画、水彩/);
  assert.match(prompt, /requested output canvas is 2160x3840 \(portrait\)/);
  assert.doesNotMatch(prompt, /该独立风格拥有最高风格优先级/);
});

test("只有主观描述时，完整扩写与保守优化都要求落成单一具体画面", () => {
  const input = {
    prompt: "我想要一种孤独但温柔的感觉，像雨夜里终于有人在灯下等我回家。",
    negativePrompt: "",
    targetSize: "3840x2160",
    purpose: "自由创作",
    styleSelected: true,
    styleName: "自定义风格",
  };
  const qualityPrompt = buildPromptOptimizationPrompt({ ...input, mode: "quality" });
  const conservativePrompt = buildPromptOptimizationPrompt({ ...input, mode: "conservative" });

  assert.match(qualityPrompt, /转译为一幅单一、明确、可构图的画面/);
  assert.match(qualityPrompt, /不得使用‘或’‘可选’‘可以是’‘A\/B’等分支表达/);
  assert.match(qualityPrompt, /不要随意固定性别、精确年龄、种族、发色、瞳色或复杂服装/);
  assert.match(qualityPrompt, /不得凭空加入性别、年龄、种族、发色、瞳色、服装、题材/);
  assert.match(qualityPrompt, /不得为了填满该字段而发明排除项/);
  assert.match(qualityPrompt, /不要把正向画面事实机械改写/);
  assert.match(conservativePrompt, /保守不等于保留空泛表达/);
});

test("前端把尺寸、用途和风格元数据传给优化器，但不发送完整风格 DNA", () => {
  const apiSource = fs.readFileSync(path.resolve("app/src/lib/api.ts"), "utf8");
  const storeSource = fs.readFileSync(path.resolve("app/src/store/generator.ts"), "utf8");
  const screenSource = fs.readFileSync(path.resolve("app/src/screens/Generator.tsx"), "utf8");
  const optimizeBlock = storeSource.slice(
    storeSource.indexOf("optimize: async (mode)"),
    storeSource.indexOf("reroll: async", storeSource.indexOf("optimize: async (mode)")),
  );

  assert.match(apiSource, /targetSize\?: string/);
  assert.match(apiSource, /styleSelected\?: boolean/);
  assert.match(storeSource, /targetSize:\s*form\.size/);
  assert.match(storeSource, /purpose:\s*purposePresets\[form\.purpose\]\?\.label/);
  assert.match(storeSource, /styleSelected,/);
  assert.match(storeSource, /styleName:\s*styleSelected \? styleName \|\| undefined/);
  assert.doesNotMatch(optimizeBlock, /styleText|negativeText|referenceImages/);
  assert.match(screenSource, /完整扩写（适合主观描述）/);
  assert.match(screenSource, /只优化画面内容，不会另加画风/);
});
