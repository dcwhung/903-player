/*
 * scripts/qa/ledger-merge.mjs（AU-014）：喺臨時 git repo 入面真係跑個 script。
 * - ledger 過咗 Node execFileSync 預設 maxBuffer（1 MiB）都要合併到，唔可以 ENOBUFS
 * - cwd 唔係 repo root 就即刻停（exit 2），唔好寫錯位置
 * - git / 用法出錯（冇 MERGE_HEAD、ref 唔存在）都係 exit 2；exit 1 只留畀「有行要重新驗收」
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = fileURLToPath(new URL('./ledger-merge.mjs', import.meta.url));
const LEDGER = '.proj-docs/qa/verification-ledger.tsv';
const HEADER = 'chain_id\tstage\tpath\tsha256\tverified_at';
const NODE_DEFAULT_MAX_BUFFER_BYTES = 1024 * 1024;
// 每行約 150 bytes，12,000 行約 1.8 MiB：穩陣過 1 MiB
const BIG_LEDGER_ROWS = 12_000;
const SHA_HEX_LENGTH = 64;
const EXIT_USAGE_ERROR = 2;
const OURS_ROW = 10;
const THEIRS_ROW = 20;
const SMALL_LEDGER_ROWS = THEIRS_ROW + 1;
const TEST_GIT_ENV = {
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_AUTHOR_NAME: 'ledger-test',
    GIT_AUTHOR_EMAIL: 'ledger-test@example.invalid',
    GIT_COMMITTER_NAME: 'ledger-test',
    GIT_COMMITTER_EMAIL: 'ledger-test@example.invalid',
};

/**
 * 臨時 repo 用嘅 env：唔食用戶 / 系統 git 設定（簽署、hook、template），亦唔承繼任何 `GIT_*`。
 * S-1391：喺 `git rebase --exec` / `git bisect run` / hook 入面跑，git 會 export GIT_DIR / GIT_WORK_TREE /
 * GIT_INDEX_FILE；漏咗入嚟，「臨時 repo」嘅 commit / checkout 就會寫入真 repo
 */
function isolatedGitEnv(inherited) {
    const withoutGit = Object.entries(inherited).filter(([name]) => !name.startsWith('GIT_'));
    return { ...Object.fromEntries(withoutGit), ...TEST_GIT_ENV };
}

const GIT_ENV = isolatedGitEnv(process.env);

const tempDirs = [];

const sha = (char) => char.repeat(SHA_HEX_LENGTH);
const row = (index, shaChar) =>
    [
        'big-chain',
        'S1',
        `apps/player/src/some/deep/folder/file-${index}.ts`,
        sha(shaChar),
        'T',
    ].join('\t');
const ledgerText = (rows) => `${[HEADER, ...rows].join('\n')}\n`;

function git(cwd, ...args) {
    return execFileSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8' }).trim();
}

function commitLedger(repo, rows, message) {
    writeFileSync(join(repo, LEDGER), ledgerText(rows));
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', message);
}

/** base（main）→ ours 改一行、theirs 改另一行；停喺 ours */
function createRepo(rowCount) {
    const repo = realpathSync(mkdtempSync(join(tmpdir(), 'ledger-merge-')));
    tempDirs.push(repo);
    git(repo, 'init', '-q', '-b', 'main');
    mkdirSync(join(repo, dirname(LEDGER)), { recursive: true });
    const baseRows = Array.from({ length: rowCount }, (_, index) => row(index, 'a'));
    commitLedger(repo, baseRows, 'base');

    git(repo, 'checkout', '-q', '-b', 'theirs');
    commitLedger(repo, baseRows.with(THEIRS_ROW, row(THEIRS_ROW, 'c')), 'theirs');

    git(repo, 'checkout', '-q', '-b', 'ours', 'main');
    commitLedger(repo, baseRows.with(OURS_ROW, row(OURS_ROW, 'b')), 'ours');
    return repo;
}

function runScript(cwd, ...args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env: GIT_ENV, encoding: 'utf8' });
}

afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('ledger-merge', () => {
    it('should not pass inherited GIT_* variables to the temp-repo git calls', () => {
        const env = isolatedGitEnv({
            PATH: '/usr/bin',
            GIT_DIR: '/real/repo/.git',
            GIT_WORK_TREE: '/real/repo',
            GIT_INDEX_FILE: '/real/repo/.git/index',
            GIT_AUTHOR_NAME: 'someone else',
        });

        expect(env).toEqual({ PATH: '/usr/bin', ...TEST_GIT_ENV });
    });

    it('should merge both sides when the ledger is larger than the default 1 MiB maxBuffer', () => {
        const repo = createRepo(BIG_LEDGER_ROWS);
        const ledgerBytes = readFileSync(join(repo, LEDGER)).length;
        expect(ledgerBytes).toBeGreaterThan(NODE_DEFAULT_MAX_BUFFER_BYTES);

        const result = runScript(repo, 'ours', 'theirs');

        // boolean 斷言：失敗時唔好將成份 stderr（連 1 MiB stdout dump）印出嚟
        expect(result.stderr.includes('ENOBUFS')).toBe(false);
        expect(result.status).toBe(0);
        expect(result.stdout).toContain(`ledger-merge: ${BIG_LEDGER_ROWS} rows written`);
        const merged = readFileSync(join(repo, LEDGER), 'utf8').split('\n');
        // +1：第 0 行係 header
        expect(merged[OURS_ROW + 1]).toBe(row(OURS_ROW, 'b'));
        expect(merged[THEIRS_ROW + 1]).toBe(row(THEIRS_ROW, 'c'));
        expect(merged).toHaveLength(BIG_LEDGER_ROWS + 2); // header + rows + 尾行 newline
    });

    it('should exit 1 and list the row when both sides changed it and neither matches the file', () => {
        const repo = createRepo(SMALL_LEDGER_ROWS);
        commitLedger(
            repo,
            Array.from({ length: SMALL_LEDGER_ROWS }, (_, index) =>
                row(index, index === OURS_ROW || index === THEIRS_ROW ? 'b' : 'a'),
            ),
            'ours also changes the row theirs changed',
        );

        const result = runScript(repo, 'ours', 'theirs');

        expect(result.status).toBe(1);
        expect(result.stdout).toContain(`file-${THEIRS_ROW}.ts`);
    });

    it('should fail fast without writing when cwd is a subdirectory of the repo', () => {
        const repo = createRepo(SMALL_LEDGER_ROWS);
        const subdir = join(repo, '.proj-docs');

        const result = runScript(subdir, 'ours', 'theirs');

        expect(result.status).toBe(EXIT_USAGE_ERROR);
        expect(result.stderr).toContain('must be run from the repo root');
        expect(result.stderr).toContain(repo);
        expect(git(repo, 'status', '--porcelain')).toBe('');
    });

    it('should exit 2 with a one-line message and leave the ledger alone when there is no MERGE_HEAD', () => {
        const repo = createRepo(SMALL_LEDGER_ROWS);

        const result = runScript(repo);

        expect(result.status).toBe(EXIT_USAGE_ERROR);
        expect(result.stderr).toMatch(/^ledger-merge: .*MERGE_HEAD.*\n$/);
        expect(git(repo, 'status', '--porcelain')).toBe('');
    });

    it('should exit 2 with a one-line message when a ref does not exist', () => {
        const repo = createRepo(SMALL_LEDGER_ROWS);

        const result = runScript(repo, 'ours', 'no-such-ref');

        expect(result.status).toBe(EXIT_USAGE_ERROR);
        expect(result.stderr).toMatch(/^ledger-merge: .*no-such-ref.*\n$/);
        expect(git(repo, 'status', '--porcelain')).toBe('');
    });

    it('should fail fast when cwd is not inside a git repo', () => {
        const outside = realpathSync(mkdtempSync(join(tmpdir(), 'ledger-merge-outside-')));
        tempDirs.push(outside);

        const result = runScript(outside);

        expect(result.status).toBe(EXIT_USAGE_ERROR);
        expect(result.stderr).toContain('must be run from the repo root');
    });
});
