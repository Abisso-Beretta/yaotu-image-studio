const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// require('../server') 时模块顶层会 loadDotEnv 读真实 .env、并 mkdirSync dataDir/outputDir，
// 所以必须在 require 之前把 YAOTU_DATA_DIR 指到临时目录，绝不碰真实 outputs。
const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "yaotu-analysisprompts-"));
process.env.YAOTU_DATA_DIR = tmpDataDir;

const {
  buildPromptExtractionPrompt,
  buildStyleExtractionPrompt,
} = require("../server");

after(() => {
  try {
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  } catch {
    // 清理失败不影响结论
  }
});

test("提示词提取生成可与独立风格组合的内容提示词，并服从目标画幅", () => {
  const prompt = buildPromptExtractionPrompt("3840x2160");

  assert.match(prompt, /reusable CONTENT prompt/);
  assert.match(prompt, /separately selected style package/);
  assert.match(prompt, /requested output canvas is 3840x2160 \(landscape\)/);
  assert.match(prompt, /Do NOT output transferable style DNA/);
  assert.match(prompt, /Give each mutable attribute exactly one unambiguous value/);
  assert.match(prompt, /must not negate a positive subject attribute/);
  assert.match(prompt, /do not add generic crop bans such as cropped head/);
  assert.match(prompt, /do not emit stray characters from unrelated writing systems/);
});

test("提示词提取没有可靠目标尺寸时不擅自固定横竖画幅", () => {
  const prompt = buildPromptExtractionPrompt("not-a-size");

  assert.match(prompt, /target canvas is not fixed/);
  assert.match(prompt, /Avoid hard-coding portrait\/landscape orientation/);
  assert.doesNotMatch(prompt, /not-a-size/);
});

test("风格提取包含跨主体迁移测试，并禁止角色、物件和具体构图泄漏", () => {
  const prompt = buildStyleExtractionPrompt();

  assert.match(prompt, /HOW an image is made, never WHO or WHAT/);
  assert.match(prompt, /robot, an elderly person, an animal, or a landscape/);
  assert.match(prompt, /Never include subject identity or anatomy/);
  assert.match(prompt, /Never include concrete clothing, accessories, jewelry, props/);
  assert.match(prompt, /Never include a concrete canvas orientation, aspect ratio, shot scale/);
  assert.match(prompt, /Do not bind a color to hair, eyes, skin, clothing/);
  assert.match(prompt, /not as a required inventory such as lace, gemstones, feathers/);
  assert.equal(prompt.split("\n").some((line) => line.startsWith("不要继承：")), false);
});

test("前端把当前尺寸传给分析接口，新建风格默认使用中强度并展示高强度风险", () => {
  const storeSource = fs.readFileSync(path.resolve("app/src/store/generator.ts"), "utf8");
  const screenSource = fs.readFileSync(path.resolve("app/src/screens/Generator.tsx"), "utf8");

  assert.match(storeSource, /targetSize:\s*form\.size/);
  assert.match(screenSource, /useState\('medium'\)/);
  assert.match(screenSource, /高强度（带样图，可能继承角色）/);
  assert.match(screenSource, /多张同角色图会强化身份特征/);
});
