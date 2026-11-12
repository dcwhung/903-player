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
// 唔好用 `qa-ledger.sh freeze <chain> <stage> … <淨係改咗嘅檔>` 解 conflict：freeze 會換走成條鏈同一個 stage 嘅全部行。

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const LEDGER = '.proj-docs/qa/verification-ledger.tsv';
const COL_CHAIN = 0;
const COL_STAGE = 1;
const COL_PATH = 2;
const COL_SHA = 3;

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function loadLedger(ref) {
    const text = execFileSync('git', ['show', `${ref}:${LEDGER}`], { encoding: 'utf8' });
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
    const [oursRef = 'HEAD', theirsRef = 'MERGE_HEAD'] = process.argv.slice(2);
    const baseRef = git('merge-base', oursRef, theirsRef);
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

main();
