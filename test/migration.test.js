"use strict";

// migrateLegacyData：把旧数据目录（.env / api-profiles.json / outputs/）搬进新的 dataDir，
// 已存在的目标文件不覆盖，并用 desktop-migration-state.json 记录已迁移的源以保证幂等。
// 全程用 os.tmpdir() 下 mkdtempSync 造的临时源/目标目录，绝不碰真实数据。

const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// discoverLegacyDataDirs 也会读环境里的 YAOTU_LEGACY_DATA_DIR，force 分支读
// YAOTU_FORCE_LEGACY_MIGRATION——清掉两者，保证只用我们显式传入的源、且不走 force。
delete process.env.YAOTU_LEGACY_DATA_DIR;
delete process.env.YAOTU_FORCE_LEGACY_MIGRATION;

const { migrateLegacyData } = require("../desktop/migration.js");

const tmpRoots = [];
function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}

after(() => {
  for (const dir of tmpRoots) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // 清理失败不影响结论
    }
  }
});

const SETTINGS_JSON = JSON.stringify({ profiles: ["legacy"] });

function makeSource() {
  const src = mkTmp("yaotu-mig-src-");
  fs.writeFileSync(path.join(src, ".env"), "OPENAI_API_KEY=from-legacy\n");
  fs.writeFileSync(path.join(src, "api-profiles.json"), SETTINGS_JSON);
  fs.mkdirSync(path.join(src, "outputs", "nested"), { recursive: true });
  fs.writeFileSync(path.join(src, "outputs", "a.png"), "AAA");
  fs.writeFileSync(path.join(src, "outputs", "nested", "b.png"), "BBB");
  return src;
}

function normalize(p) {
  const resolved = path.resolve(p);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

test("copies .env, api-profiles.json and outputs/ into an empty target", () => {
  const src = makeSource();
  const target = mkTmp("yaotu-mig-dst-");

  const report = migrateLegacyData({ dataDir: target, legacyDataDir: src });

  assert.equal(fs.readFileSync(path.join(target, ".env"), "utf8"), "OPENAI_API_KEY=from-legacy\n");
  assert.equal(fs.readFileSync(path.join(target, "api-profiles.json"), "utf8"), SETTINGS_JSON);
  assert.equal(fs.readFileSync(path.join(target, "outputs", "a.png"), "utf8"), "AAA");
  assert.equal(fs.readFileSync(path.join(target, "outputs", "nested", "b.png"), "utf8"), "BBB");

  // report 记录了源与三类已拷贝项（.env / api-profiles.json 为 file，outputs 为 directory）
  assert.ok(report.sources.some((s) => normalize(s) === normalize(src)));
  assert.deepEqual(
    report.copied.map((c) => c.label).sort(),
    [".env", "api-profiles.json", "outputs"].sort()
  );
  assert.equal(report.errors.length, 0);

  // state 文件写出，且记录了该源（规范化路径）
  const statePath = path.join(target, "desktop-migration-state.json");
  assert.ok(fs.existsSync(statePath));
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  assert.ok(state.migratedSources.includes(normalize(src)));
});

test("does not overwrite files that already exist in the target", () => {
  const src = makeSource();
  const target = mkTmp("yaotu-mig-dst-");

  // 目标已有同名 .env 与 outputs/a.png（内容不同）——迁移必须跳过、不覆盖。
  fs.writeFileSync(path.join(target, ".env"), "OPENAI_API_KEY=keep-mine\n");
  fs.mkdirSync(path.join(target, "outputs"), { recursive: true });
  fs.writeFileSync(path.join(target, "outputs", "a.png"), "KEEP");

  const report = migrateLegacyData({ dataDir: target, legacyDataDir: src });

  // 已存在的保持原样
  assert.equal(fs.readFileSync(path.join(target, ".env"), "utf8"), "OPENAI_API_KEY=keep-mine\n");
  assert.equal(fs.readFileSync(path.join(target, "outputs", "a.png"), "utf8"), "KEEP");
  // 缺失的仍被补齐
  assert.equal(fs.readFileSync(path.join(target, "api-profiles.json"), "utf8"), SETTINGS_JSON);
  assert.equal(fs.readFileSync(path.join(target, "outputs", "nested", "b.png"), "utf8"), "BBB");

  // .env 被记为 skipped（target exists），不在 copied 里
  assert.ok(
    report.skipped.some((s) => s.type === "file" && s.label === ".env" && s.reason === "target exists")
  );
  assert.ok(!report.copied.some((c) => c.label === ".env"));
});

test("is idempotent: a second run skips the already-migrated source", () => {
  const src = makeSource();
  const target = mkTmp("yaotu-mig-dst-");

  const first = migrateLegacyData({ dataDir: target, legacyDataDir: src });
  assert.ok(first.sources.some((s) => normalize(s) === normalize(src)));

  const second = migrateLegacyData({ dataDir: target, legacyDataDir: src });
  // 源已被 state 记录 → 第二次直接跳过：不作为 source 处理，也不再拷贝任何东西。
  assert.equal(second.sources.length, 0);
  assert.equal(second.copied.length, 0);
  assert.ok(second.skipped.some((s) => s.type === "source" && s.reason === "already migrated"));
});
