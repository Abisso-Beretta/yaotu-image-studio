#!/usr/bin/env node
// ============================================================================
// 一次性验证脚本：角色多形象(forms) / 参考图 role·formId·label / 基准图候选持久化
// / 项目回收站(.trash) / 分镜按形象挂参考 / 旧格式 project.json 兼容。
//
// 全程在临时目录（YAOTU_DATA_DIR）里跑，生图上游用本地 mock HTTP server，
// 绝不触碰真实 outputs/、api-profiles.json、.env，也不消耗真实 API 额度。
// 跑法：node scripts/verify-forms-trash.mjs
// ============================================================================

import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 1x1 透明 PNG，够小又是合法图片，参考图上传和 mock 生图返回都用它。
const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const PNG_DATA_URL = `data:image/png;base64,${PNG_1X1_BASE64}`;

// 沙箱数据目录：脚本退出时整个删掉。
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "yaotu-verify-"));
const SERVER_PORT = 18971;
const MOCK_PORT = 18972;
const BASE = `http://127.0.0.1:${SERVER_PORT}`;

let serverProc = null;
let mockServer = null;
let passCount = 0;

function ok(desc) {
  passCount += 1;
  console.log(`OK: ${desc}`);
}

function assert(cond, desc) {
  if (!cond) {
    throw new Error(`断言失败: ${desc}`);
  }
  ok(desc);
}

async function post(pathname, body) {
  const res = await fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function postOk(pathname, body) {
  const { status, data } = await post(pathname, body);
  if (status !== 200) {
    throw new Error(`POST ${pathname} 返回 ${status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function getProject(key) {
  const res = await fetch(`${BASE}/api/project?key=${encodeURIComponent(key)}`);
  const data = await res.json();
  if (res.status !== 200) {
    throw new Error(`GET /api/project 返回 ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// 直接读沙箱磁盘上的 project.json（断言「落盘」形态，而不是响应层解析后的形态）。
function readDiskProject(key) {
  const file = path.join(dataDir, "outputs", "_projects", key, "project.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function projectDir(key) {
  return path.join(dataDir, "outputs", "_projects", key);
}

function listTrash(key) {
  const dir = path.join(projectDir(key), ".trash");
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk(dir);
  return out;
}

function findChar(project, id) {
  return (project.characters || []).find((c) => c.id === id);
}

// ---- mock 生图上游：模拟 OpenAI images API（server 走 images 端点模式）----
// server 无参考图时 POST <base>/v1/images/generations，带参考图时 POST /v1/images/edits，
// 均返回 { data: [{ b64_json }] }（见 server.js requestImageGeneration/requestImageEdit）。
function startMockUpstream() {
  return new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        if (req.method === "POST" && /\/images\/(generations|edits)$/.test(req.url)) {
          // n 参数解析尽力而为（edits 是 multipart，直接回 1 张也符合 server 的逐张请求策略）
          let n = 1;
          try {
            n = Math.max(1, Number(JSON.parse(body).n) || 1);
          } catch {
            n = 1;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ data: Array.from({ length: n }, () => ({ b64_json: PNG_1X1_BASE64 })) }));
          return;
        }
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: `mock: no route ${req.method} ${req.url}` } }));
      });
    });
    mockServer.listen(MOCK_PORT, "127.0.0.1", () => resolve());
  });
}

function startYaotuServer() {
  return new Promise((resolve, reject) => {
    serverProc = spawn(process.execPath, [path.join(rootDir, "server.js")], {
      env: {
        ...process.env,
        YAOTU_DATA_DIR: dataDir,
        PORT: String(SERVER_PORT),
        OPENAI_API_KEY: "test",
        OPENAI_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
        OPENAI_IMAGE_ENDPOINT_MODE: "images",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let ready = false;
    const onData = (chunk) => {
      const text = String(chunk);
      if (!ready && /running at/.test(text)) {
        ready = true;
        resolve();
      }
    };
    serverProc.stdout.on("data", onData);
    serverProc.stderr.on("data", (c) => process.stderr.write(`[server] ${c}`));
    serverProc.on("exit", (code) => {
      if (!ready) reject(new Error(`server 提前退出，code=${code}`));
    });
    setTimeout(() => {
      if (!ready) reject(new Error("server 15 秒内没就绪"));
    }, 15000).unref();
  });
}

function cleanup() {
  try { serverProc?.kill(); } catch { /* 已退出就算了 */ }
  try { mockServer?.close(); } catch { /* 同上 */ }
  // Windows 上句柄释放可能有延迟，重试几次
  for (let i = 0; i < 5; i += 1) {
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
      break;
    } catch {
      // 等一拍再试
      const until = Date.now() + 300;
      while (Date.now() < until) { /* 自旋等待 */ }
    }
  }
}

async function main() {
  // 安全护栏：确认沙箱目录确实在系统临时目录下，绝不指向仓库真实数据。
  assert(!dataDir.startsWith(rootDir), `沙箱数据目录在仓库外: ${dataDir}`);

  await startMockUpstream();
  ok(`mock 生图上游已启动 127.0.0.1:${MOCK_PORT}`);
  await startYaotuServer();
  ok(`妖荼 server 已在沙箱启动 127.0.0.1:${SERVER_PORT}（YAOTU_DATA_DIR=${dataDir}）`);

  // ===== 建项目 + 角色 + 两个形象 =====
  const created = await postOk("/api/project/create", { name: "verify", episode: "e01" });
  const key = created.key;
  ok(`创建项目 key=${key}`);

  let r = await postOk("/api/project/character", {
    key, name: "林安", role: "主角", imageLockPhrase: "黑发红瞳少年",
  });
  const charId = findChar(r.project, "林安") ? "林安" : r.project.characters[0].id;
  ok(`创建角色 ${charId}`);

  r = await postOk("/api/project/character-form", { key, characterId: charId, name: "夏装", imageLockPhrase: "白色短袖黑发红瞳" });
  r = await postOk("/api/project/character-form", { key, characterId: charId, name: "兽形" });
  let forms = findChar(r.project, charId).forms || [];
  assert(forms.length === 2, "upsert 两个形象后 forms 长度为 2");
  const formA = forms.find((f) => f.name === "夏装").id;
  const formB = forms.find((f) => f.name === "兽形").id;
  assert(forms.find((f) => f.id === formA).imageLockPhrase === "白色短袖黑发红瞳", "形象 imageLockPhrase 落盘正确");

  // 非法 role / 非法 formId 校验
  let bad = await post("/api/project/character-ref", { key, characterId: charId, dataUrl: PNG_DATA_URL, role: "nonsense" });
  assert(bad.status === 400, "非法 role 上传参考图返回 400");
  bad = await post("/api/project/character-ref", { key, characterId: charId, dataUrl: PNG_DATA_URL, formId: "不存在的形象" });
  assert(bad.status === 400, "非法 formId 上传参考图返回 400");

  // ===== 多形象/多 role/带 label 上传，每形象首张自动 locked =====
  r = await postOk("/api/project/character-ref", { key, characterId: charId, dataUrl: PNG_DATA_URL }); // default #1
  r = await postOk("/api/project/character-ref", { key, characterId: charId, dataUrl: PNG_DATA_URL, role: "turnaround", label: "背面" }); // default #2
  r = await postOk("/api/project/character-ref", { key, characterId: charId, dataUrl: PNG_DATA_URL, formId: formA, role: "expression" }); // A #1
  r = await postOk("/api/project/character-ref", { key, characterId: charId, dataUrl: PNG_DATA_URL, formId: formA }); // A #2
  r = await postOk("/api/project/character-ref", { key, characterId: charId, dataUrl: PNG_DATA_URL, formId: formB, label: "毛色参考" }); // B #1

  let disk = readDiskProject(key);
  let refs = findChar(disk, charId).referenceImages;
  const formOf = (ref) => ref.formId || "default";
  assert(refs.length === 5, "5 张参考图全部落盘");
  const defaults = refs.filter((x) => formOf(x) === "default");
  const groupA = refs.filter((x) => formOf(x) === formA);
  const groupB = refs.filter((x) => formOf(x) === formB);
  assert(defaults[0].locked === true && !defaults[1].locked, "default 形象首张自动 locked");
  assert(groupA[0].locked === true && !groupA[1].locked, `形象 ${formA} 首张自动 locked`);
  assert(groupB[0].locked === true, `形象 ${formB} 首张自动 locked`);
  assert(defaults[1].role === "turnaround" && defaults[1].label === "背面", "role/label 落盘正确");
  assert(groupA[0].role === "expression", "非 default 形象的 role 落盘正确");
  assert(defaults.every((x) => x.formId === undefined), "default 形象条目不写 formId 字段（旧数据一致）");

  // ===== lock 只影响同形象 =====
  await postOk("/api/project/character-ref/lock", { key, characterId: charId, refId: groupA[1].id });
  disk = readDiskProject(key);
  refs = findChar(disk, charId).referenceImages;
  const a2 = refs.filter((x) => formOf(x) === formA);
  assert(!a2[0].locked && a2[1].locked === true, "lock 切换在同形象内互斥");
  assert(refs.find((x) => x.id === defaults[0].id).locked === true, "lock 切换不影响 default 形象的锚");
  assert(refs.find((x) => x.id === groupB[0].id).locked === true, `lock 切换不影响形象 ${formB} 的锚`);

  // ===== updateProjectCharacterRef：改 label/role =====
  await postOk("/api/project/character-ref/update", { key, characterId: charId, refId: defaults[1].id, role: "detail", label: "侧面" });
  disk = readDiskProject(key);
  let upd = findChar(disk, charId).referenceImages.find((x) => x.id === defaults[1].id);
  assert(upd.role === "detail" && upd.label === "侧面", "updateProjectCharacterRef 改 role/label 生效");

  // ===== updateProjectCharacterRef：改 formId 后两边锚补位 =====
  // 把 formA 的锚（a2[1]）挪去 formB：formB 已有锚 → 新来的 locked=false；formA 失锚 → 第一张补位
  await postOk("/api/project/character-ref/update", { key, characterId: charId, refId: a2[1].id, formId: formB });
  disk = readDiskProject(key);
  refs = findChar(disk, charId).referenceImages;
  const a3 = refs.filter((x) => formOf(x) === formA);
  const b3 = refs.filter((x) => formOf(x) === formB);
  assert(a3.length === 1 && a3[0].locked === true, "移出后原形象第一张补位成锚");
  assert(b3.length === 2, "移入后目标形象有 2 张");
  assert(b3.find((x) => x.id === groupB[0].id).locked === true, "目标形象原锚保持");
  assert(b3.find((x) => x.id === a2[1].id).locked === false, "移入已有锚的形象 → 新来的不再是锚");
  // 挪进没锚的形象：先把 formB 的锚挪去 formA，验证进入组无锚时补成锚——
  // 这里换一个方向：把 default 的非锚 defaults[1] 挪去一个空场景不适用，跳过；
  // 用 formA（现在只有 1 张、有锚）做「进入组已有锚」已验证过，
  // 「进入组没锚」在批删补位与 baseCandidate 锁定环节还会覆盖。

  // ===== LOCK-SEMANTICS：形象组已有参考图时，显式 locked:true 上传新图要抢锚 =====
  // 对抗审查已确认 addProjectCharacterRef 的落锁判定本身正确：
  // locked: sameForm.length === 0 ? true : Boolean(input.locked)——这里只补断言。
  // formB 组此时已有 2 张（groupB[0] 原锚 + 挪入的 a2[1]），符合复现条件。
  {
    await postOk("/api/project/character-ref", {
      key, characterId: charId, dataUrl: PNG_DATA_URL, formId: formB, locked: true,
    });
    disk = readDiskProject(key);
    refs = findChar(disk, charId).referenceImages;
    const bLock = refs.filter((x) => formOf(x) === formB);
    assert(bLock.length === 3, "组内已有 2 张后再传 locked:true 上传第三张，形象组变 3 张");
    const newestB = bLock.find((x) => x.id !== groupB[0].id && x.id !== a2[1].id);
    assert(newestB && newestB.locked === true, "显式 locked:true 上传的新图成为该组唯一锚");
    assert(bLock.filter((x) => x.locked).length === 1, "组内旧锚被降级，锚在组内唯一");
    // 清理：删掉刚上传的这张，把 formB 组锚显式还原成 groupB[0]，
    // 不影响后面「批删」小节对 formB 组大小=2 的假设。
    await postOk("/api/project/character-ref/delete", { key, characterId: charId, refId: newestB.id });
    await postOk("/api/project/character-ref/lock", { key, characterId: charId, refId: groupB[0].id });
  }

  // ===== 批删 deleteProjectCharacterRefs =====
  // 删掉 formB 的锚 groupB[0] 和 default 的锚 defaults[0]，两个形象都要各自补位
  const trashBefore = listTrash(key).length;
  await postOk("/api/project/character-refs/delete", { key, characterId: charId, refIds: [groupB[0].id, defaults[0].id] });
  disk = readDiskProject(key);
  refs = findChar(disk, charId).referenceImages;
  assert(!refs.some((x) => x.id === groupB[0].id || x.id === defaults[0].id), "批删后 project.json 已剔除两条");
  const d4 = refs.filter((x) => formOf(x) === "default");
  const b4 = refs.filter((x) => formOf(x) === formB);
  assert(d4.length === 1 && d4[0].locked === true, "批删后 default 形象锚补位");
  assert(b4.length === 1 && b4[0].locked === true, `批删后形象 ${formB} 锚补位`);
  const trashAfterBatch = listTrash(key);
  assert(trashAfterBatch.length === trashBefore + 2, "批删的 2 个文件进了 .trash/");

  // ===== trash/info + trash/empty =====
  let info = await postOk("/api/project/trash/info", { key });
  assert(info.count === trashAfterBatch.length && info.count >= 2, `trash/info 条数正确 (${info.count})`);
  const expectBytes = trashAfterBatch.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  assert(info.bytes === expectBytes, `trash/info 字节数正确 (${info.bytes})`);
  await postOk("/api/project/trash/empty", { key });
  info = await postOk("/api/project/trash/info", { key });
  assert(info.count === 0 && info.bytes === 0, "trash/empty 后 info 归零");

  // ===== generateCharacterBase(formId) 候选持久化 =====
  r = await postOk("/api/project/generate-character-base", { key, characterId: charId, formId: formA, count: 2 });
  disk = readDiskProject(key);
  let cands = findChar(disk, charId).baseCandidates || [];
  const objCands = cands.filter((c) => typeof c === "object");
  assert(objCands.length === 2, "generateCharacterBase 产出 2 条对象格式候选");
  assert(objCands.every((c) => c.formId === formA), "候选条目带 formId");
  for (const c of objCands) {
    const p = path.join(projectDir(key), c.file);
    assert(fs.existsSync(p) && c.file.includes("_candidates/"), `候选文件落盘 _candidates/ (${c.file})`);
  }
  // 响应层：对象条目 file 应解析成 URL
  const resp = await getProject(key);
  const respCands = findChar(resp.project, charId).baseCandidates.filter((c) => typeof c === "object");
  assert(respCands.every((c) => c.file.startsWith("/outputs/_projects/")), "响应层把候选 file 解析成 URL");

  // ===== addProjectCharacterRef 带 baseCandidateId 锁定候选 =====
  const lockCand = objCands[0];
  const candDisk = path.join(projectDir(key), lockCand.file);
  // 先把 formA 里现有的 refs 清掉，验证「该形象内首张 → 自动成锚」
  const aRefs = findChar(disk, charId).referenceImages.filter((x) => formOf(x) === formA);
  if (aRefs.length) {
    await postOk("/api/project/character-refs/delete", { key, characterId: charId, refIds: aRefs.map((x) => x.id) });
  }
  r = await postOk("/api/project/character-ref", { key, characterId: charId, baseCandidateId: lockCand.id });
  disk = readDiskProject(key);
  cands = findChar(disk, charId).baseCandidates || [];
  assert(!cands.some((c) => typeof c === "object" && c.id === lockCand.id), "锁定后候选条目已从 baseCandidates 剔除");
  assert(!fs.existsSync(candDisk), "锁定后 _candidates/ 文件被真删（不进回收站）");
  const newRef = findChar(disk, charId).referenceImages.filter((x) => formOf(x) === formA);
  assert(newRef.length === 1 && newRef[0].locked === true, "锁定候选生成的 ref 继承 formId 且为该形象锚");
  assert(cands.some((c) => typeof c === "object" && c.id === objCands[1].id), "其余候选保留（持久字段）");

  // ===== deleteCharacterBaseCandidate 按 candidateId 真删 =====
  const cand2 = objCands[1];
  const cand2Disk = path.join(projectDir(key), cand2.file);
  await postOk("/api/project/character-base-candidate/delete", { key, characterId: charId, candidateId: cand2.id });
  disk = readDiskProject(key);
  assert(!(findChar(disk, charId).baseCandidates || []).some((c) => typeof c === "object" && c.id === cand2.id), "deleteCharacterBaseCandidate 剔除条目");
  assert(!fs.existsSync(cand2Disk), "deleteCharacterBaseCandidate 真删 _candidates/ 文件");
  // 幂等：再删一次不报错
  await postOk("/api/project/character-base-candidate/delete", { key, characterId: charId, candidateId: cand2.id });
  ok("deleteCharacterBaseCandidate 重复删除幂等");

  // ===== 分镜 characterForms + generate-shot + 分镜候选进回收站 =====
  await postOk("/api/project/shot", {
    key,
    patch: { shotId: "SH01", prompt: "测试镜头：林安站在校门口回头微笑", characterIds: [charId], characterForms: { [charId]: formA, 不存在的角色: formB } },
  });
  disk = readDiskProject(key);
  const shot = disk.shots.find((s) => s.shotId === "SH01");
  assert(shot.characterForms && shot.characterForms[charId] === formA, "upsertProjectShot 落盘 characterForms");
  assert(!shot.characterForms["不存在的角色"], "characterForms 清洗掉不在 characterIds 里的 charId");

  const gen = await postOk("/api/project/generate-shot", { key, shotId: "SH01", count: 1 });
  assert(gen.referencesAttached === 1, "generate-shot 按形象挂上 1 张参考图");
  disk = readDiskProject(key);
  const render = disk.renders.find((x) => x.shotId === "SH01");
  assert(render && render.candidates.length >= 1, "分镜候选落盘");
  const shotCand = render.candidates[0];
  const shotCandDisk = path.join(projectDir(key), shotCand.file);
  assert(fs.existsSync(shotCandDisk), "分镜候选文件在项目目录");
  const trashBeforeCand = listTrash(key).length;
  await postOk("/api/project/candidate/delete", { key, shotId: "SH01", imageId: shotCand.imageId });
  assert(!fs.existsSync(shotCandDisk), "deleteProjectCandidate 后原路径文件已移走");
  assert(listTrash(key).length === trashBeforeCand + 1, "分镜候选删除进了 .trash/");

  // ===== FALLBACK-GAP：参考图只在命名形象 + 分镜未设 characterForms 时仍要挂上参考图 =====
  // 回退链走到 default 组为空即止会一张都不挂：角色参考图全在命名形象（比如直接给
  // 「战斗形态」锁基准图，default 组从没图），分镜又没设 characterForms
  // （Scriptwriter 包天然没有这字段）——这里起一个全新角色，只测这条链尾兜底。
  {
    let fbr = await postOk("/api/project/character", { key, name: "回退链角色", imageLockPhrase: "占位锚点" });
    const fbCharId = findChar(fbr.project, "回退链角色")
      ? "回退链角色"
      : fbr.project.characters.find((c) => c.name === "回退链角色").id;
    fbr = await postOk("/api/project/character-form", { key, characterId: fbCharId, name: "战斗形态" });
    const fbFormId = findChar(fbr.project, fbCharId).forms.find((f) => f.name === "战斗形态").id;
    // 只往命名形象传参考图，default 组从没图。
    await postOk("/api/project/character-ref", { key, characterId: fbCharId, dataUrl: PNG_DATA_URL, formId: fbFormId });
    // 分镜挂这个角色但不设 characterForms。
    await postOk("/api/project/shot", {
      key,
      patch: { shotId: "SH-FALLBACK", prompt: "回退链测试镜头：角色站在原地一动不动", characterIds: [fbCharId] },
    });
    const fbGen = await postOk("/api/project/generate-shot", { key, shotId: "SH-FALLBACK", count: 1 });
    assert(fbGen.referencesAttached === 1, "参考图只在命名形象+分镜无 characterForms 时，全局兜底仍挂上 1 张参考图");
  }

  // ===== deleteCharacterForm：该形象 refs + baseCandidates + shots.characterForms 都要清 =====
  const trashBeforeForm = listTrash(key).length;
  disk = readDiskProject(key);
  const formARefCount = findChar(disk, charId).referenceImages.filter((x) => formOf(x) === formA).length;
  assert(formARefCount >= 1, `删除形象前 ${formA} 里还有 ${formARefCount} 张参考图`);
  // 删除前先给 formA 补一条基准图候选，验证残留候选也会被清理（不然点「锁定」
  // 时 validateFormId 对已删形象一律 400，候选卡死）；顺带确认删除前 SH01 仍挂着这个形象。
  r = await postOk("/api/project/generate-character-base", { key, characterId: charId, formId: formA, count: 1 });
  disk = readDiskProject(key);
  const formACandsBefore = (findChar(disk, charId).baseCandidates || []).filter(
    (c) => typeof c === "object" && c.formId === formA
  );
  assert(formACandsBefore.length === 1, "删除形象前先补一条该形象的基准图候选");
  const formACandFile = formACandsBefore[0].file;
  assert(fs.existsSync(path.join(projectDir(key), formACandFile)), "该候选文件已落盘 _candidates/");
  assert(
    findChar(disk, charId) && disk.shots.find((s) => s.shotId === "SH01").characterForms?.[charId] === formA,
    "删除形象前 SH01.characterForms 仍指向该形象"
  );
  bad = await post("/api/project/character-form/delete", { key, characterId: charId, formId: "default" });
  assert(bad.status === 400, "default 形象不可删（400）");
  r = await postOk("/api/project/character-form/delete", { key, characterId: charId, formId: formA });
  disk = readDiskProject(key);
  assert(!(findChar(disk, charId).forms || []).some((f) => f.id === formA), "deleteCharacterForm 剔除形象条目");
  assert(!findChar(disk, charId).referenceImages.some((x) => formOf(x) === formA), "该形象参考图已从数组剔除");
  const formACandsAfter = (findChar(disk, charId).baseCandidates || []).filter(
    (c) => typeof c === "object" && c.formId === formA
  );
  assert(formACandsAfter.length === 0, "deleteCharacterForm 剔除该形象的基准图候选条目");
  assert(!fs.existsSync(path.join(projectDir(key), formACandFile)), "该候选文件已从原 _candidates/ 位置移走");
  assert(
    listTrash(key).length === trashBeforeForm + formARefCount + 1,
    "该形象的参考图 + 基准图候选文件都进了 .trash/（不是真删）"
  );
  const shotAfterFormDelete = disk.shots.find((s) => s.shotId === "SH01");
  assert(
    !shotAfterFormDelete.characterForms || shotAfterFormDelete.characterForms[charId] !== formA,
    "deleteCharacterForm 清掉了 shots[].characterForms 里指向该形象的条目"
  );

  // ===== deleteProjectCharacter：角色目录进 .trash，shots.characterForms[charId] 键也要清 =====
  // 先重新给 SH01 挂上这个角色的 characterForms（这次指向仍存在的 formB），
  // 验证角色整个被删时，脏键不会留下来随导出包持久化。
  await postOk("/api/project/shot", { key, patch: { shotId: "SH01", characterForms: { [charId]: formB } } });
  disk = readDiskProject(key);
  assert(disk.shots.find((s) => s.shotId === "SH01").characterForms?.[charId] === formB, "删除角色前 SH01.characterForms 已重新指向该角色");
  const charDir = path.join(projectDir(key), "characters", charId);
  assert(fs.existsSync(charDir), "删除前角色目录存在");
  await postOk("/api/project/character/delete", { key, characterId: charId });
  assert(!fs.existsSync(charDir), "删除后角色目录已从原位置移走");
  const trashDirs = fs.readdirSync(path.join(projectDir(key), ".trash"));
  assert(trashDirs.some((name) => name.includes(charId)), "角色目录出现在 .trash/ 里");
  disk = readDiskProject(key);
  const shotAfterCharDelete = disk.shots.find((s) => s.shotId === "SH01");
  assert(
    !shotAfterCharDelete.characterForms || !Object.prototype.hasOwnProperty.call(shotAfterCharDelete.characterForms, charId),
    "deleteProjectCharacter 清掉了 shots[].characterForms 里该角色的键"
  );

  // ===== IMPORT-LOSS：重导同一任务包必须 carry over forms / baseCandidates / characterForms =====
  // 用独立项目跑，不搅动上面 charId 的状态。流程：先导入建项目 → 挂形象/带 formId
  // 参考图/（mock）生成候选/分镜设形象（妖荼侧编辑层数据，Scriptwriter 包天然没有）
  // → 用同一个 project.id+episode 再导一次（模拟 Scriptwriter 重新导出、用户重导）
  // → 这些编辑层数据必须原样保留，_candidates/ 磁盘文件不能变孤儿。
  {
    const ilProjectId = "import-loss-proj";
    const ilCharId = "il-char";
    const pkg1 = {
      schemaVersion: "1.0",
      project: { id: ilProjectId, name: "重导测试" },
      episode: "",
      style: { lockPhrase: "", globalNegative: "" },
      defaults: {},
      characters: [{ id: ilCharId, name: "重导角色" }],
      shots: [{ shotId: "IL-SH01", prompt: "重导测试镜头", characterIds: [ilCharId] }],
    };
    let imp = await postOk("/api/projects/import", pkg1);
    const ilKey = imp.key;
    ok(`IMPORT-LOSS：首次导入建项目 key=${ilKey}`);

    let ilr = await postOk("/api/project/character-form", { key: ilKey, characterId: ilCharId, name: "特殊形象" });
    const ilFormId = findChar(ilr.project, ilCharId).forms.find((f) => f.name === "特殊形象").id;
    await postOk("/api/project/character-ref", { key: ilKey, characterId: ilCharId, dataUrl: PNG_DATA_URL, formId: ilFormId });
    await postOk("/api/project/generate-character-base", { key: ilKey, characterId: ilCharId, formId: ilFormId, count: 1 });
    await postOk("/api/project/shot", { key: ilKey, patch: { shotId: "IL-SH01", characterForms: { [ilCharId]: ilFormId } } });

    let ilBefore = readDiskProject(ilKey);
    const ilCharBefore = findChar(ilBefore, ilCharId);
    assert((ilCharBefore.forms || []).some((f) => f.id === ilFormId), "重导前：形象已落盘");
    assert((ilCharBefore.referenceImages || []).some((rf) => rf.formId === ilFormId), "重导前：带 formId 参考图已落盘");
    assert((ilCharBefore.baseCandidates || []).length === 1, "重导前：基准图候选已落盘");
    const ilCandFile = ilCharBefore.baseCandidates[0].file;
    assert(fs.existsSync(path.join(projectDir(ilKey), ilCandFile)), "重导前：候选文件在磁盘");
    const ilShotBefore = ilBefore.shots.find((s) => s.shotId === "IL-SH01");
    assert(ilShotBefore.characterForms?.[ilCharId] === ilFormId, "重导前：分镜形象选择已落盘");

    // 重导同一任务包：project.id/episode 不变（key 不变），Scriptwriter 侧字段可能更新，
    // 但包里天然不会带 forms/baseCandidates/characterForms（那是妖荼侧编辑层数据）。
    const pkg2 = {
      schemaVersion: "1.0",
      project: { id: ilProjectId, name: "重导测试（更新版）" },
      episode: "",
      style: { lockPhrase: "新锁定句", globalNegative: "" },
      defaults: {},
      characters: [{ id: ilCharId, name: "重导角色" }],
      shots: [{ shotId: "IL-SH01", prompt: "重导测试镜头（改过）", characterIds: [ilCharId] }],
    };
    await postOk("/api/projects/import", pkg2);
    let ilAfter = readDiskProject(ilKey);
    const ilCharAfter = findChar(ilAfter, ilCharId);
    assert((ilCharAfter.forms || []).some((f) => f.id === ilFormId), "重导后：形象没丢");
    assert((ilCharAfter.referenceImages || []).some((rf) => rf.formId === ilFormId), "重导后：带 formId 参考图没丢（不是孤儿）");
    assert(
      (ilCharAfter.baseCandidates || []).length === 1 && ilCharAfter.baseCandidates[0].file === ilCandFile,
      "重导后：基准图候选没丢"
    );
    assert(fs.existsSync(path.join(projectDir(ilKey), ilCandFile)), "重导后：候选文件仍在磁盘（没变孤儿）");
    const ilShotAfter = ilAfter.shots.find((s) => s.shotId === "IL-SH01");
    assert(ilShotAfter.characterForms?.[ilCharId] === ilFormId, "重导后：分镜形象选择没丢");
    assert(ilShotAfter.prompt === "重导测试镜头（改过）", "重导后：Scriptwriter 侧字段（prompt）正常更新");
  }

  // ===== 旧格式兼容：手工写旧式 project.json =====
  const legacyKey = "legacy";
  const legacyDir = path.join(dataDir, "outputs", "_projects", legacyKey);
  const legacyCharDir = path.join(legacyDir, "characters", "旧角色");
  fs.mkdirSync(legacyCharDir, { recursive: true });
  fs.writeFileSync(path.join(legacyCharDir, "ref-01.png"), Buffer.from(PNG_1X1_BASE64, "base64"));
  fs.writeFileSync(path.join(legacyCharDir, "ref-02.png"), Buffer.from(PNG_1X1_BASE64, "base64"));
  const legacyProject = {
    schemaVersion: "1.0",
    project: { id: "legacy", name: "旧项目", medium: "vertical", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" },
    episode: "",
    style: { lockPhrase: "", globalNegative: "" },
    defaults: { size: "1080x1920", model: "gpt-image-2", attachCharacterRefs: true },
    characters: [
      {
        id: "旧角色",
        name: "旧角色",
        role: "",
        appearance: { imageLockPhrase: "旧锚点句" },
        // 旧格式：无 formId/label/forms，baseCandidates 是字符串 URL 数组（含死链）
        referenceImages: [
          { id: "旧角色-1", file: "characters/旧角色/ref-01.png", role: "base", locked: true, createdAt: "2025-01-01T00:00:00.000Z" },
          { id: "旧角色-2", file: "characters/旧角色/ref-02.png", role: "base", createdAt: "2025-01-01T00:00:00.000Z" },
        ],
        baseCandidates: ["/outputs/20250101T000000Z-dead/background-01.png"],
      },
    ],
    shots: [{ shotId: "SH01", prompt: "旧镜头", characterIds: ["旧角色"] }],
    renders: [],
  };
  fs.writeFileSync(path.join(legacyDir, "project.json"), JSON.stringify(legacyProject, null, 2), "utf8");

  const legacy = await getProject(legacyKey);
  ok("旧格式 project.json GET 不炸");
  const legacyChar = findChar(legacy.project, "旧角色");
  assert(legacyChar.referenceImages.length === 2, "旧格式 refs 正常返回");
  assert(legacyChar.referenceImages[0].file.startsWith("/outputs/_projects/"), "旧格式 ref file 解析成 URL");
  assert((legacyChar.baseCandidates || []).length === 0, "旧字符串候选死链在响应层被过滤");

  // 旧数据上 lock 第二张：等价 default 形象语义，全组互斥
  await postOk("/api/project/character-ref/lock", { key: legacyKey, characterId: "旧角色", refId: "旧角色-2" });
  disk = readDiskProject(legacyKey);
  let legacyRefs = findChar(disk, "旧角色").referenceImages;
  assert(!legacyRefs[0].locked && legacyRefs[1].locked === true, "旧数据 lock 切换按 default 形象语义互斥");

  // 旧数据上传新图（不带 formId）：进 default 组，不自动抢锚
  await postOk("/api/project/character-ref", { key: legacyKey, characterId: "旧角色", dataUrl: PNG_DATA_URL });
  disk = readDiskProject(legacyKey);
  legacyRefs = findChar(disk, "旧角色").referenceImages;
  assert(legacyRefs.length === 3, "旧数据上传新图成功");
  assert(legacyRefs.filter((x) => x.locked).length === 1 && legacyRefs[1].locked === true, "default 组已有锚 → 新图不抢锚");

  console.log(`\n全部通过：${passCount} 条断言/检查点`);
}

let exitCode = 0;
try {
  await main();
} catch (error) {
  exitCode = 1;
  console.error(`\nFAIL: ${error?.message || error}`);
} finally {
  cleanup();
}
process.exit(exitCode);
