#!/usr/bin/env node
// 逐行三方合併 QA verification ledger（S-866）。
//
// 用法（merge 撞咗 `.proj-docs/qa/verification-ledger.tsv` 之後，喺 repo root 跑）：
//   node scripts/qa/ledger-merge.mjs [<ours-ref> <theirs-ref>]
// 預設 ours = HEAD、theirs = MERGE_HEAD，base = 兩者嘅 merge-base。
//
// 規則（key = chain_id + stage + path；同一個檔可以同時有 S1 同 S3 行）：
//   - 一邊有改、另一邊冇改 → 用有改嗰邊（包括新增 / 刪除）
//   - 兩邊都改咗 → 用 sha256 對得上而家個檔嘅嗰邊；兩邊都唔啱 → 唔寫，列出要重新驗收
//
// Exit code：
//   0 = 合併完，ledger 已寫入
//   1 = 合併完，但有行兩邊都改咗又對唔上而家個檔（列出嚟嗰啲**冇寫入**，要重新驗收再 freeze）
//   2 = 用法 / 環境出錯（cwd 唔係 repo root、冇 MERGE_HEAD、ref 唔存在、ref 入面冇 ledger…）或者 script 自己出錯：冇合併結果
//
// 唔好用 `qa-ledger.sh freeze <chain> <stage> … <淨係改咗嘅檔>` 解 conflict：freeze 會換走成條鏈同一個 stage 嘅全部行。

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';

const LEDGER = '.proj-docs/qa/verification-ledger.tsv';
const COL_CHAIN = 0;
const COL_STAGE = 1;
const COL_PATH = 2;
const COL_SHA = 3;

// AU-014：execFileSync 預設 maxBuffer 得 1 MiB，ledger 過咗就 ENOBUFS；64 MiB 夠用好耐，又唔會無上限食記憶體
const GIT_MAX_BUFFER_BYTES = 64 * 1024 * 1024;
// stderr 用 pipe 收埋：出錯時由 main() 印返一行，唔好畀 git 自己直接噴落 terminal
const GIT_EXEC_OPTIONS = {
    encoding: 'utf8',
    maxBuffer: GIT_MAX_BUFFER_BYTES,
    stdio: ['ignore', 'pipe', 'pipe'],
};
// exit 1 只留畀「有行要重新驗收」；用法 / 環境出錯（cwd 唔啱、git 失敗）用另一個 code 分開（S-1392）
const EXIT_USAGE_ERROR = 2;

/** 用法 / 環境出錯：main() 印一行 message 之後 exit 2，唔寫 ledger */
class UsageError extends Error {}

/** git 自己嘅 stderr 第一行（例如 `fatal: Not a valid object name MERGE_HEAD`）；冇就用 Node 嘅 message（例如 ENOBUFS） */
function firstLine(error) {
    const text = String(error.stderr ?? '').trim() || String(error.message);
    return text.split('\n')[0];
}

function git(...args) {
    try {
        return execFileSync('git', args, GIT_EXEC_OPTIONS);
    } catch (error) {
        throw new UsageError(`git ${args.join(' ')} failed: ${firstLine(error)}`, { cause: error });
    }
}

/** repo root（worktree 就係 worktree root）；cwd 唔喺 git repo 入面就 null */
function repoRoot() {
    try {
        return realpathSync(git('rev-parse', '--show-toplevel').trim());
    } catch {
        return null;
    }
}

// LEDGER 同 fileSha() 嘅 path 都係相對 cwd：喺第二度跑會寫錯位置 / 全部 sha 對唔上，所以一開始就停
function assertRepoRoot() {
    const root = repoRoot();
    const cwd = realpathSync(process.cwd());
    if (root === cwd) return;
    throw new UsageError(
        `must be run from the repo root (${root ?? 'not inside a git repo'}); cwd is ${cwd}`,
    );
}

function loadLedger(ref) {
    const text = git('show', `${ref}:${LEDGER}`);
    const [header, ...lines] = text.split('\n').filter((line) => line.length > 0);
    const rows = new Map();
    for (const line of lines) {
        const cols = line.split('\t');
        rows.set([cols[COL_CHAIN], cols[COL_STAGE], cols[COL_PATH]].join('\t'), line);
    }
    return { header, rows };
}

function fileSha(path) {
    return existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : null;
}

function pick(key, base, ours, theirs, conflicts) {
    if (ours === theirs) return ours;
    if (ours === base) return theirs;
    if (theirs === base) return ours;
    const current = fileSha(key.split('\t')[2]);
    const match = [ours, theirs].find((line) => line && line.split('\t')[COL_SHA] === current);
    if (match) return match;
    conflicts.push(key.replaceAll('\t', ' '));
    return undefined;
}

function main() {
    assertRepoRoot();
    const [oursRef = 'HEAD', theirsRef = 'MERGE_HEAD'] = process.argv.slice(2);
    const baseRef = git('merge-base', oursRef, theirsRef).trim();
    const base = loadLedger(baseRef).rows;
    const ours = loadLedger(oursRef);
    const theirs = loadLedger(theirsRef);

    // 跟 theirs（通常係 main）嘅次序，ours 先有嘅行插喺同一條鏈同一個 stage 最後一行之後
    const keys = [...theirs.rows.keys()];
    const seen = new Set(keys);
    for (const key of ours.rows.keys()) {
        if (seen.has(key)) continue;
        seen.add(key);
        const group = key.split('\t').slice(0, 2).join('\t');
        const last = keys.findLastIndex((k) => k.startsWith(`${group}\t`));
        keys.splice(last === -1 ? keys.length : last + 1, 0, key);
    }

    const conflicts = [];
    const merged = keys
        .map((key) => pick(key, base.get(key), ours.rows.get(key), theirs.rows.get(key), conflicts))
        .filter((line) => line !== undefined);

    writeFileSync(LEDGER, `${[theirs.header, ...merged].join('\n')}\n`);
    console.log(`ledger-merge: ${merged.length} rows written (base ${baseRef.slice(0, 7)})`);
    if (conflicts.length > 0) {
        console.log(
            'Both sides changed and neither matches the current file; re-verify and freeze:',
        );
        for (const c of conflicts) console.log(`  ${c}`);
        process.exitCode = 1;
    }
}

try {
    main();
} catch (error) {
    // 任何冇預計嘅 error 都係 exit 2（唔係 Node 預設嘅 1），等 exit 1 淨係代表「有行要重新驗收」；
    // 唔係 UsageError 就係 bug，印埋 stack
    console.error(error instanceof UsageError ? `ledger-merge: ${error.message}` : error);
    process.exitCode = EXIT_USAGE_ERROR;
}
