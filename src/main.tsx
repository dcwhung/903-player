import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { AudioController, createAudioElement } from './player/AudioController';
import { attachPlaybackLog } from './player/playbackLog';
import { UpdateManager, isHardReload, startUpdateChecks } from './pwa/updateManager';
import { migrateStorage } from './services/storageMigration';
import './styles/tokens.css';
import './styles/global.css';

// 舊版進度 / 收藏（URL key）搬去 episode ID key：要喺任何嘢讀進度之前（player、render）做；唔會 throw
migrateStorage();

// 喺 React 外面建立，令 PWA 更新可以直接讀播放狀態（唔使經 React）
const audio = createAudioElement();
// 診斷 iPhone 鎖屏換集冇聲：記低 audio event（版本號連撳 5 下複製）
attachPlaybackLog(audio);
const playerController = new AudioController(audio);
let registration: ServiceWorkerRegistration | undefined;

const updateManager = new UpdateManager({
    checkForUpdate: () => registration?.update() ?? Promise.resolve(),
    applyUpdate: () => {
        // stop = pause + persist：reload 前先存低進度
        playerController.stop();
        // 一定已經 set 咗：applyUpdate 只會由 'refresh' 觸發，而 'refresh' 只會由 registerSW 自己嘅
        // onNeedRefresh 設定，即係 startServiceWorker() 已經返回（S-652）
        void updateSW?.(true);
    },
    reload: () => {
        playerController.stop();
        window.location.reload();
    },
    // 用牆鐘 Date.now 而唔係 performance.now：iOS 背景暫停時 performance.now 可能唔行，
    // 返到前景就會低估停咗幾耐，grace period 永遠計唔夠
    now: Date.now,
    isOnline: () => navigator.onLine,
    // 用播放意圖：撳咗 Play 但 play event 未到嗰陣都當播緊，唔好 reload 搶走呢下撳
    isPlaying: playerController.hasPlayIntent,
    hasRecording: () => playerController.getSnapshot().recording !== null,
    isVisible: () => document.visibilityState === 'visible',
    schedule: (callback, ms) => {
        const id = window.setTimeout(callback, ms);
        return () => window.clearTimeout(id);
    },
    subscribePlayback: playerController.subscribe,
    // 一定要喺 registerSW 之前讀：第一次安裝 clientsClaim 之後就會有
    controlledAtLoad: Boolean(navigator.serviceWorker?.controller),
});
// 由開 app 就追蹤播放停低嘅時間，grace period 先計得準
updateManager.start();

// prompt 模式：新 SW 喺 waiting 等，由 updateManager 決定幾時 skipWaiting
const startServiceWorker = () =>
    registerSW({
        immediate: true,
        onNeedRefresh: updateManager.handleNeedRefresh,
        // 只會 reload 一次；播緊（例如另一個 tab 換咗版本）就等停咗先 reload
        onNeedReload: updateManager.handleNeedReload,
        onRegisteredSW: (_swUrl, swRegistration) => {
            if (!swRegistration) {
                return;
            }
            registration = swRegistration;
            startUpdateChecks(updateManager, { document, window });
        },
    });
// registerSW 要等 isHardReload 查完先叫（S-648），所以係 let；用法見上面 applyUpdate
let updateSW: ReturnType<typeof registerSW> | undefined;
void isHardReload(navigator.serviceWorker)
    .then((hardReload) => {
        if (hardReload) {
            updateManager.markControlled();
        }
    })
    .finally(() => {
        updateSW = startServiceWorker();
    });

// library 漏咗嘅換版自己聽補返：第一次開 app（controlling isUpdate 係 false）、另一個 tab 搶先 skipWaiting（CUI-0017）
navigator.serviceWorker?.addEventListener('controllerchange', updateManager.handleControllerChange);

createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
        <App playerController={playerController} />
    </StrictMode>,
);
