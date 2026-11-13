/* 重新部署 player（App 外觀 plan）：GitHub repository_dispatch → deploy.yml（GitHub Pages）+ Vercel Deploy Hook */
import { SECOND_MS } from '../config';

const GITHUB_API_ORIGIN = 'https://api.github.com';
/** player repo（deploy.yml 喺呢度） */
const PLAYER_REPO = 'dcwhung/903-player';
const REPO_API = `${GITHUB_API_ORIGIN}/repos/${PLAYER_REPO}`;

export const GITHUB_DISPATCH_URL = `${REPO_API}/dispatches`;
/** deploy.yml 要有 on.repository_dispatch.types: [catalog-branding] */
export const DEPLOY_EVENT_TYPE = 'catalog-branding';
export const DEPLOY_RUNS_URL = `${REPO_API}/actions/workflows/deploy.yml/runs`;
export const DEPLOY_RUNS_EVENT = 'repository_dispatch';

/** GitHub REST 要嘅 header（token 另外加）；User-Agent 冇會被 GitHub 拒 */
export const GITHUB_HEADERS: Readonly<Record<string, string>> = {
    accept: 'application/vnd.github+json',
    'user-agent': '903-player-api',
    'x-github-api-version': '2022-11-28',
};

const DEPLOY_TIMEOUT_SECONDS = 10;
/** 外部 call 最多等幾耐：publish 唔可以因為 GitHub / Vercel 慢而卡住 */
export const DEPLOY_TIMEOUT_MS = DEPLOY_TIMEOUT_SECONDS * SECOND_MS;

/** 一頁 run 數（GitHub 上限 100）：created >= 觸發時間嘅 run 唔會多過呢個數 */
export const DEPLOY_RUNS_PER_PAGE = 100;
