/*
 * Ops 頁（Design Origin：_mockups_/admin-ops/index.html）：純 vanilla JS，冇 framework。
 * 狀態：① 未 login（/api/me 401）、③ 主畫面、④ Publish 成功、⑤ ID 守衛拒絕（409）、⑥ 還原確認。
 * 所有 server 資料一律 textContent 落 DOM（唔經 HTML parse）
 */
'use strict';

const HTTP_UNAUTHORIZED = 401;
const HTTP_CONFLICT = 409;
/** 顯示用 hash 長度（全長喺 tooltip） */
const SHORT_HASH_LENGTH = 12;
const TIME_ZONE = 'Europe/London';
const CATALOG_PATH = '/catalog/v1/catalog.json';

const $ = (id) => document.getElementById(id);

/** 2026-11-09 20:14（英國時間；en-CA = YYYY-MM-DD 格式） */
const formatTime = (iso) =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    })
        .format(new Date(iso))
        .replace(', ', ' ');

const contentText = (p) => `${p.showCount} 個節目、${p.dramaCount} 套劇、${p.episodeCount} 集`;

const shortHash = (hash) => hash.slice(0, SHORT_HASH_LENGTH);

/** fetch JSON；回 { status, body } */
const api = async (path, method = 'GET') => {
    const response = await fetch(path, { method, credentials: 'same-origin' });
    const body = response.headers.get('content-type')?.includes('json')
        ? await response.json()
        : null;
    return { status: response.status, body };
};

const showVersion = async () => {
    const { body } = await api('/api/health');
    document.querySelectorAll('[data-version]').forEach((el) => {
        el.textContent = body?.version ? `api v${body.version}` : '';
    });
};

const renderCurrent = (current) => {
    $('current-empty').hidden = Boolean(current);
    $('current').hidden = !current;
    if (!current) return;
    $('current-time').textContent = `${formatTime(current.createdAt)}（英國時間）`;
    $('current-content').textContent = contentText(current);
    $('current-hash').textContent = shortHash(current.hash);
    $('current-hash').title = current.hash;
    $('current-url').textContent = `${location.origin}${CATALOG_PATH}`;
};

const cell = (text) => {
    const td = document.createElement('td');
    td.textContent = text;
    return td;
};

const statusCell = (publish) => {
    const td = document.createElement('td');
    const el = document.createElement(publish.current ? 'span' : 'button');
    el.textContent = publish.current ? '而家用緊' : '還原';
    el.className = publish.current ? 'tag' : 'small';
    if (!publish.current) {
        el.type = 'button';
        el.addEventListener('click', () => askRollback(publish));
    }
    td.append(el);
    return td;
};

const historyRow = (publish) => {
    const row = document.createElement('tr');
    const hash = document.createElement('td');
    const code = document.createElement('code');
    code.textContent = shortHash(publish.hash);
    hash.append(code);
    row.append(cell(String(publish.id)), cell(formatTime(publish.createdAt)));
    row.append(cell(String(publish.episodeCount)), hash, statusCell(publish));
    return row;
};

const renderHistory = (publishes) => {
    $('history-empty').hidden = publishes.length > 0;
    $('history-wrap').hidden = publishes.length === 0;
    $('history').replaceChildren(...publishes.map(historyRow));
};

/** 而家 publish 緊嗰個（⑥ 文案用） */
let currentPublish = null;

const refresh = async () => {
    const { body } = await api('/api/publishes');
    const publishes = body?.publishes ?? [];
    currentPublish = publishes.find((p) => p.current) ?? null;
    renderCurrent(currentPublish);
    renderHistory(publishes);
};

/** Publish 卡：清走上次結果，返去 ③ */
const resetPublishCard = () => {
    ['publish-ok', 'publish-error', 'guard'].forEach((id) => ($(id).hidden = true));
    $('publish-intro').hidden = false;
    $('publish-actions').hidden = false;
    $('guard-confirm').checked = false;
    $('guard-force').disabled = true;
};

/** ⑤：記住係 publish 定還原，強制時用返同一個 path */
let pendingPath = null;

const showGuard = (path, missing) => {
    pendingPath = path;
    $('publish-intro').hidden = true;
    $('publish-actions').hidden = true;
    $('guard-title').textContent = `已拒絕：有 ${missing.length} 集喺上次 publish 有、今次唔見咗。`;
    $('guard-ids').replaceChildren(
        ...missing.map((id) => Object.assign(document.createElement('li'), { textContent: id })),
    );
    $('guard').hidden = false;
};

const showResult = ({ status, body }, path) => {
    if (status === HTTP_CONFLICT) return showGuard(path, body?.missing ?? []);
    const ok = Boolean(body?.publish);
    const target = $(ok ? 'publish-ok' : 'publish-error');
    target.textContent = ok
        ? `✓ 已 publish #${body.publish.id}：${contentText(body.publish)}（${shortHash(body.publish.hash)}）`
        : `Publish 失敗（HTTP ${status}）：${body?.error ?? '請再試'}`;
    target.hidden = false;
};

/** 撳掣期間停用，避免重複 publish */
const runPublish = async (path) => {
    const buttons = document.querySelectorAll('#main button');
    buttons.forEach((b) => (b.disabled = true));
    resetPublishCard();
    try {
        showResult(await api(path, 'POST'), path);
        await refresh();
    } finally {
        buttons.forEach((b) => (b.disabled = false));
        $('guard-force').disabled = !$('guard-confirm').checked;
    }
};

/** ⑥ */
let rollbackTarget = null;

const askRollback = (publish) => {
    rollbackTarget = publish;
    $('rollback-title').textContent = `還原去 #${publish.id}？`;
    $('rollback-text').textContent =
        `會用 ${formatTime(publish.createdAt)} 嘅版本（${publish.episodeCount} 集）取代而家嘅 #${currentPublish?.id}，` +
        '並記錄做新嘅一個 publish。D1 入面嘅資料唔會改。';
    $('rollback').hidden = false;
};

const closeRollback = () => {
    $('rollback').hidden = true;
    rollbackTarget = null;
};

const bindEvents = () => {
    $('publish').addEventListener('click', () => runPublish('/api/publish'));
    $('guard-confirm').addEventListener(
        'change',
        (e) => ($('guard-force').disabled = !e.target.checked),
    );
    $('guard-force').addEventListener('click', () => runPublish(`${pendingPath}?force=1`));
    $('guard-cancel').addEventListener('click', resetPublishCard);
    $('rollback-cancel').addEventListener('click', closeRollback);
    $('rollback-confirm').addEventListener('click', () => {
        const path = `/api/publishes/${rollbackTarget.id}/rollback`;
        closeRollback();
        runPublish(path);
    });
    $('logout').addEventListener('click', async () => {
        await api('/auth/logout', 'POST');
        location.reload();
    });
};

const start = async () => {
    showVersion();
    const { status, body } = await api('/api/me');
    if (status === HTTP_UNAUTHORIZED) {
        $('login').hidden = false;
        return;
    }
    $('email').textContent = body.email;
    $('main').hidden = false;
    bindEvents();
    await refresh();
};

start();
