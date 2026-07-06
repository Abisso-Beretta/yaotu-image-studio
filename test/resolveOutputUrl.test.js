"use strict";

// resolveOutputUrl 是 /outputs/* 静态服务的安全护栏：把 URL 路径映射回 outputDir 内的
// 真实磁盘文件，任何越界（穿越/绝对路径/编码穿越）都必须返回 null。
//
// 关键：server.js 顶层会对 dataDir/outputDir 做 mkdirSync，且 resolveOutputUrl 读取的
// outputDir 在 require 时就固定。所以必须在 require('../server.js') 之前把
// YAOTU_DATA_DIR 指到临时目录，绝不碰真实 outputs。

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "yaotu-resolveurl-"));
process.env.YAOTU_DATA_DIR = tmpDataDir;

const { resolveOutputUrl, outputDir } = require("../server.js");

before(() => {
  // outputDir 由 server.js 在 require 时基于我们设的 YAOTU_DATA_DIR 计算并 mkdir。
  // 断言它确实落在临时目录内，保证本测试自始至终不触碰真实 outputs。
  assert.ok(path.resolve(outputDir).startsWith(path.resolve(tmpDataDir) + path.sep));
});

after(() => {
  try {
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  } catch {
    // 清理失败不影响结论
  }
});

test("maps a legal /outputs/ path to the real file on disk", () => {
  const filePath = path.join(outputDir, "hello.png");
  fs.writeFileSync(filePath, "x");
  assert.equal(resolveOutputUrl("/outputs/hello.png"), filePath);
});

test("maps a nested /outputs/ subpath", () => {
  const dir = path.join(outputDir, "sub", "deep");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, "img.png");
  fs.writeFileSync(filePath, "y");
  assert.equal(resolveOutputUrl("/outputs/sub/deep/img.png"), filePath);
});

test("percent-decodes legit filenames (e.g. %20 space)", () => {
  const filePath = path.join(outputDir, "my file.png");
  fs.writeFileSync(filePath, "z");
  assert.equal(resolveOutputUrl("/outputs/my%20file.png"), filePath);
});

test("returns null for a non-existent file inside outputs", () => {
  assert.equal(resolveOutputUrl("/outputs/does-not-exist.png"), null);
});

test("returns null when the target is a directory, not a file", () => {
  fs.mkdirSync(path.join(outputDir, "adir"), { recursive: true });
  assert.equal(resolveOutputUrl("/outputs/adir"), null);
});

test("rejects ../ path traversal even when the escaped file really exists", () => {
  // /outputs/../secret.txt → 解析到 outputDir 的父目录，落在 outputDir 之外 → null
  const secret = path.join(tmpDataDir, "secret.txt");
  fs.writeFileSync(secret, "top secret");
  assert.equal(resolveOutputUrl("/outputs/../secret.txt"), null);
});

test("rejects percent-encoded ../ traversal (%2e%2e)", () => {
  const secret = path.join(tmpDataDir, "secret.txt");
  fs.writeFileSync(secret, "top secret");
  // %2e%2e 解码成 ..，同样逃出 outputDir → null
  assert.equal(resolveOutputUrl("/outputs/%2e%2e/secret.txt"), null);
});

test("rejects an absolute path smuggled in after /outputs/", () => {
  const secret = path.join(tmpDataDir, "secret.txt");
  fs.writeFileSync(secret, "top secret");
  // 绝对路径拼在 /outputs/ 之后，被 path.resolve 当绝对路径处理，逃出 outputDir → null
  assert.equal(resolveOutputUrl("/outputs/" + secret), null);
});

test("returns null for paths without the /outputs/ prefix", () => {
  // 前缀不匹配 → 正则不替换，整段被当作(盘根/绝对)路径解析，落在 outputDir 外 → null
  assert.equal(resolveOutputUrl("/secret.txt"), null);
  assert.equal(resolveOutputUrl("/etc/passwd"), null);
});
