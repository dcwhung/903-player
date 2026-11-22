/*
 * scripts/ci/detect-code-changes.sh（AU-015）：喺臨時 git repo 入面真係跑個 script（ci.yml `changes` job 叫嘅同一份）。
 * - 分類對象係成條 branch（同 origin/main 嘅 merge-base → SHA），唔係今次 push 嘅 delta：
 *   「code push 之後跟一個淨 docs push」仍然係 code=true
 * - `--no-renames`：source 檔 `git mv` 入 docs path 唔可以當 docs-only
 * - 判斷唔到（冇 merge-base、冇 origin/main、diff 係空）一律 code=true
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = fileURLToPath(new URL('./detect-code-changes.sh', import.meta.url));
const EXIT_USAGE_ERROR = 2;
const TEST_GIT_ENV = {
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_AUTHOR_NAME: 'ci-test',
    GIT_AUTHOR_EMAIL: 'ci-test@example.invalid',
    GIT_COMMITTER_NAME: 'ci-test',
    GIT_COMMITTER_EMAIL: 'ci-test@example.invalid',
};

/**
 * 臨時 repo 用嘅 env：唔食用戶 / 系統 git 設定，亦唔承繼任何 `GIT_*`（S-1391，同 scripts/qa/ledger-merge.test.mjs 一樣），
 * 另外清走 runner 自己嘅 `GITHUB_*`（呢個 test 喺 Actions 跑時有真嘅 GITHUB_SHA / GITHUB_OUTPUT，唔可以漏入 script）
 */
function isolatedEnv(inherited) {
    const kept = Object.entries(inherited).filter(
        ([name]) => !name.startsWith('GIT_') && !name.startsWith('GITHUB_'),
    );
    return { ...Object.fromEntries(kept), ...TEST_GIT_ENV };
}

const BASE_ENV = isolatedEnv(process.env);

const tempDirs = [];

function git(cwd, ...args) {
    return execFileSync('git', args, { cwd, env: BASE_ENV, encoding: 'utf8' }).trim();
}

function commitFile(repo, path, content, message) {
    mkdirSync(join(repo, dirname(path)), { recursive: true });
    writeFileSync(join(repo, path), content);
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', message);
    return git(repo, 'rev-parse', 'HEAD');
}

/** main 有一個 source 檔同一個 doc；`origin/main` 指住 main；停喺新 branch `feature` */
function createRepo() {
    const repo = realpathSync(mkdtempSync(join(tmpdir(), 'detect-code-changes-')));
    tempDirs.push(repo);
    git(repo, 'init', '-q', '-b', 'main');
    commitFile(repo, 'src/a.ts', 'export const a = 1;\n', 'base: source');
    commitFile(repo, 'docs/guide.md', '# guide\n', 'base: docs');
    git(repo, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    git(repo, 'checkout', '-q', '-b', 'feature');
    return repo;
}

/** 跑 script；回 exit status、stdout / stderr、同寫入 GITHUB_OUTPUT 嘅內容 */
function detect(repo, sha, extraEnv = {}) {
    const outputFile = join(repo, '.git', 'github-output.txt');
    writeFileSync(outputFile, '');
    const result = spawnSync('bash', [SCRIPT], {
        cwd: repo,
        env: { ...BASE_ENV, GITHUB_SHA: sha, GITHUB_OUTPUT: outputFile, ...extraEnv },
        encoding: 'utf8',
    });
    return { ...result, output: readFileSync(outputFile, 'utf8') };
}

afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('detect-code-changes', () => {
    it('should not pass inherited GIT_* or GITHUB_* variables to the temp-repo calls', () => {
        const env = isolatedEnv({
            PATH: '/usr/bin',
            GIT_DIR: '/real/repo/.git',
            GITHUB_SHA: 'real-sha',
            GITHUB_OUTPUT: '/real/output',
        });

        expect(env).toEqual({ PATH: '/usr/bin', ...TEST_GIT_ENV });
    });

    it('should report code=true when a docs-only push follows a code push on the same branch', () => {
        const repo = createRepo();
        const codePush = commitFile(repo, 'src/a.ts', 'export const a = 2;\n', 'code push');
        const docsPush = commitFile(repo, 'docs/guide.md', '# guide v2\n', 'docs push');

        // BEFORE = 上一次 push 嘅 head：舊邏輯只睇 codePush..docsPush（淨 docs）
        const result = detect(repo, docsPush, { BEFORE: codePush });

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=true\n');
    });

    it('should report code=false when the whole branch only touches docs paths', () => {
        const repo = createRepo();
        commitFile(repo, 'docs/guide.md', '# guide v2\n', 'docs 1');
        commitFile(repo, '.proj-docs/qa/report.txt', 'report\n', 'docs 2');
        const head = commitFile(repo, 'apps/player/README.md', '# readme\n', 'docs 3');

        const result = detect(repo, head);

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=false\n');
    });

    // S-1401：git 預設用引號包住非 ASCII path（core.quotePath），中文檔名嘅 docs 會 match 唔到 pattern
    it('should report code=false when docs-only files have non-ASCII names and spaces', () => {
        const repo = createRepo();
        commitFile(repo, 'docs/筆記 a.md', '# 筆記\n', 'docs with a non-ASCII name and a space');
        commitFile(repo, '.proj-docs/審查 報告/第 1 版.txt', 'report\n', 'non-ASCII docs folder');
        const head = commitFile(repo, 'apps/player/說明 文件.md', '# 說明\n', 'non-ASCII .md');

        const result = detect(repo, head);

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=false\n');
    });

    it('should report code=true when a source file has a non-ASCII name', () => {
        const repo = createRepo();
        commitFile(repo, 'docs/筆記 a.md', '# 筆記\n', 'docs');
        const head = commitFile(repo, 'src/工具 a.ts', 'export const a = 1;\n', 'non-ASCII source');

        const result = detect(repo, head);

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=true\n');
    });

    it('should report code=true when a path still needs quoting (tab in a docs file name)', () => {
        const repo = createRepo();
        const head = commitFile(repo, 'docs/a\tb.md', '# tab\n', 'docs file with a tab');

        const result = detect(repo, head);

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=true\n');
    });

    it('should report code=true when a source file is renamed into a docs path', () => {
        const repo = createRepo();
        git(repo, 'mv', 'src/a.ts', 'docs/a.md');
        git(repo, 'commit', '-q', '-m', 'rename source into docs');
        const head = git(repo, 'rev-parse', 'HEAD');

        const result = detect(repo, head);

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=true\n');
    });

    it('should report code=true when the branch adds a source file and then a root .md file', () => {
        const repo = createRepo();
        commitFile(repo, 'src/b.ts', 'export const b = 1;\n', 'add source');
        const head = commitFile(repo, 'CHANGELOG.md', '# changes\n', 'docs');

        const result = detect(repo, head);

        expect(result.output).toBe('code=true\n');
    });

    it('should report code=true when the branch has no merge-base with origin/main', () => {
        const repo = createRepo();
        git(repo, 'checkout', '-q', '--orphan', 'unrelated');
        git(repo, 'rm', '-rq', '--cached', '.');
        const head = commitFile(repo, 'docs/only.md', '# unrelated history\n', 'orphan docs');

        const result = detect(repo, head);

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=true\n');
        expect(result.stdout).toContain('base=none');
    });

    it('should report code=true when origin/main does not exist', () => {
        const repo = createRepo();
        const head = commitFile(repo, 'docs/guide.md', '# guide v2\n', 'docs');
        git(repo, 'update-ref', '-d', 'refs/remotes/origin/main');

        const result = detect(repo, head);

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=true\n');
    });

    it('should report code=true for a push to main itself (merge-base equals the SHA, empty diff)', () => {
        const repo = createRepo();
        const mainHead = git(repo, 'rev-parse', 'origin/main');

        const result = detect(repo, mainHead);

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=true\n');
    });

    it('should classify against the merge-base, not the main tip, when main moved on with code', () => {
        const repo = createRepo();
        const head = commitFile(repo, 'docs/guide.md', '# guide v2\n', 'docs on branch');
        git(repo, 'checkout', '-q', 'main');
        commitFile(repo, 'src/a.ts', 'export const a = 3;\n', 'main moves on');
        git(repo, 'update-ref', 'refs/remotes/origin/main', 'HEAD');

        const result = detect(repo, head);

        expect(result.output).toBe('code=false\n');
    });

    it('should exit 2 without writing an output when GITHUB_SHA is missing', () => {
        const repo = createRepo();

        const result = detect(repo, '');

        expect(result.status).toBe(EXIT_USAGE_ERROR);
        expect(result.output).toBe('');
    });
});
