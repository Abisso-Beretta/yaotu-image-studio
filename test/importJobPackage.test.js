"use strict";

// importJobPackage：把 Scriptwriter 产出的 ImageJobPackage 导入成妖荼的 project.json。
// 它会经 writeProjectFile 落盘到 <dataDir>/outputs/_projects/<slug>/project.json——
// 所以必须在 require('../server.js') 之前把 YAOTU_DATA_DIR 指到临时目录，绝不碰真实 outputs。

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "yaotu-jobpkg-"));
process.env.YAOTU_DATA_DIR = tmpDataDir;

const { importJobPackage, outputDir } = require("../server.js");

const projectsDir = path.join(outputDir, "_projects");

before(() => {
  // 确认落盘根在临时目录内，保证本测试自始至终不触碰真实 outputs。
  assert.ok(path.resolve(outputDir).startsWith(path.resolve(tmpDataDir) + path.sep));
});

after(() => {
  try {
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  } catch {
    // 清理失败不影响结论
  }
});

// 每个用例用不同 project.id，落到各自的 project 目录，互不干扰（existing 恒为 null）。
function makePkg(id, overrides = {}) {
  return {
    schemaVersion: "1.0",
    project: { id, name: `Name ${id}`, medium: "vertical" },
    episode: "",
    style: { lockPhrase: "lock", globalNegative: "blurry, lowres" },
    defaults: {},
    characters: [{ id: "c1", name: "Alice" }],
    shots: [{ shotId: "SH01", prompt: "p1" }],
    ...overrides,
  };
}

test("valid package returns {key, project, summary} and writes project.json under the temp dir", async () => {
  const result = await importJobPackage(makePkg("alpha"));

  assert.equal(typeof result.key, "string");
  assert.ok(result.key.length > 0);
  assert.ok(result.project && result.summary);

  const file = path.join(projectsDir, result.key, "project.json");
  assert.ok(fs.existsSync(file), "project.json should have been written");
  // 落盘绝对路径必须在临时 dataDir 之内
  assert.ok(path.resolve(file).startsWith(path.resolve(tmpDataDir) + path.sep));

  const onDisk = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(onDisk.schemaVersion, "1.0");
  assert.equal(onDisk.project.medium, "vertical");
});

test("defaults.size is derived from medium when the package omits it (vertical)", async () => {
  const result = await importJobPackage(makePkg("beta"));
  assert.equal(result.project.defaults.size, "2160x3840");
});

test("medium drives the default size (horizontal)", async () => {
  const result = await importJobPackage(
    makePkg("beta-h", { project: { id: "beta-h", name: "B-H", medium: "horizontal" } })
  );
  assert.equal(result.project.project.medium, "horizontal");
  assert.equal(result.project.defaults.size, "3840x2160");
});

test("a non-empty defaults.size in the package overrides the medium default", async () => {
  const result = await importJobPackage(makePkg("beta-o", { defaults: { size: "1080x1920" } }));
  assert.equal(result.project.defaults.size, "1080x1920");
});

test("an empty defaults.size falls back to the medium default", async () => {
  const result = await importJobPackage(makePkg("beta-e", { defaults: { size: "" } }));
  assert.equal(result.project.defaults.size, "2160x3840");
});

test("shots are de-duplicated by shotId (last wins) and sorted numerically", async () => {
  const result = await importJobPackage(
    makePkg("gamma", {
      shots: [
        { shotId: "SH02", prompt: "two-A" },
        { shotId: "SH10", prompt: "ten" },
        { shotId: "SH01", prompt: "one" },
        { shotId: "SH02", prompt: "two-B" }, // 同 shotId，后者覆盖前者
      ],
    })
  );

  assert.deepEqual(
    result.project.shots.map((s) => s.shotId),
    ["SH01", "SH02", "SH10"] // 数字自然排序：SH02 在 SH10 之前
  );
  assert.equal(result.project.shots.find((s) => s.shotId === "SH02").prompt, "two-B");
});

test("shot.characterIds defaults to [] when missing or non-array, preserved when valid", async () => {
  const result = await importJobPackage(
    makePkg("delta", {
      shots: [
        { shotId: "SH01" }, // 缺 characterIds
        { shotId: "SH02", characterIds: "c1" }, // 非数组
        { shotId: "SH03", characterIds: ["c1", "c2"] }, // 合法
      ],
    })
  );

  const byId = Object.fromEntries(result.project.shots.map((s) => [s.shotId, s]));
  assert.deepEqual(byId.SH01.characterIds, []);
  assert.deepEqual(byId.SH02.characterIds, []);
  assert.deepEqual(byId.SH03.characterIds, ["c1", "c2"]);
});

test("shots missing shotId collapse to a single '' entry (last wins)", async () => {
  const result = await importJobPackage(
    makePkg("epsilon", {
      shots: [
        { prompt: "no-id-A" },
        { shotId: "SH01", prompt: "one" },
        { prompt: "no-id-B" }, // 同样缺 shotId → 与上一个缺 id 的同 key ""，后者覆盖
      ],
    })
  );

  const shots = result.project.shots;
  const blanks = shots.filter((s) => !s.shotId);
  assert.equal(shots.length, 2); // "" + SH01
  assert.equal(blanks.length, 1);
  assert.equal(blanks[0].prompt, "no-id-B");
});

test("stores shot.negative verbatim and does NOT fall back to style.globalNegative at import time", async () => {
  // 实测契约：importJobPackage 只补 characterIds，不动 negative。
  // 空 negative → globalNegative 的回退发生在渲染时（server.js:836），不在导入时。
  const result = await importJobPackage(
    makePkg("zeta", {
      style: { lockPhrase: "lock", globalNegative: "GLOBAL-NEG" },
      shots: [
        { shotId: "SH01", negative: "" }, // 空串——导入后仍是空串，未被替换
        { shotId: "SH02" }, // 无 negative 字段——导入后仍不存在
        { shotId: "SH03", negative: "custom-neg" }, // 自定义——原样保留
      ],
    })
  );

  const byId = Object.fromEntries(result.project.shots.map((s) => [s.shotId, s]));
  assert.equal(byId.SH01.negative, ""); // 未回退成 GLOBAL-NEG
  assert.equal(Object.prototype.hasOwnProperty.call(byId.SH02, "negative"), false); // 未凭空补上
  assert.equal(byId.SH03.negative, "custom-neg"); // 原样保留
  // 而 style.globalNegative 作为项目级字段被完整保留，供渲染时兜底用
  assert.equal(result.project.style.globalNegative, "GLOBAL-NEG");
});

test("characters carry over with an empty referenceImages when no prior project exists", async () => {
  const result = await importJobPackage(
    makePkg("kappa", { characters: [{ id: "c1", name: "Alice" }, { id: "c2", name: "Bob" }] })
  );

  assert.equal(result.project.characters.length, 2);
  for (const c of result.project.characters) {
    assert.deepEqual(c.referenceImages, []);
  }
});

test("rejects a package whose major schemaVersion is not 1", () => {
  // 同步抛出（在返回 Promise 之前），statusCode 400
  assert.throws(
    () => importJobPackage(makePkg("eta", { schemaVersion: "2.0" })),
    (err) => err.statusCode === 400
  );
});

test("accepts a 1.x minor version and defaults a missing schemaVersion to 1.0", async () => {
  const minor = await importJobPackage(makePkg("theta", { schemaVersion: "1.7" }));
  assert.equal(minor.project.schemaVersion, "1.7");

  const missing = await importJobPackage(makePkg("iota", { schemaVersion: undefined }));
  assert.equal(missing.project.schemaVersion, "1.0");
});

test("rejects structurally invalid packages (throws 400)", () => {
  const bad = [
    null,
    undefined,
    {},
    { project: { id: "x" } }, // 缺 shots
    { shots: [] }, // 缺 project
    { project: { id: "x" }, shots: "nope" }, // shots 非数组
  ];
  for (const pkg of bad) {
    assert.throws(
      () => importJobPackage(pkg),
      (err) => err.statusCode === 400,
      `should reject ${JSON.stringify(pkg)}`
    );
  }
});
