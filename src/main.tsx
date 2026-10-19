import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { AudioController, createAudioElement } from './player/AudioController';
import { UpdateManager, startUpdateChecks } from './pwa/updateManager';
import './styles/tokens.css';
import './styles/global.css';

// 喺 React 外面建立，令 PWA 更新可以直接讀播放狀態（唔使經 React）
const playerController = new AudioController(createAudioElement());
let registration: ServiceWorkerRegistration | undefined;

const updateManager = new UpdateManager({
    checkForUpdate: () => registration?.update() ?? Promise.resolve(),
    applyUpdate: () => {
        // stop = pause + persist：reload 前先存低進度
        playerController.stop();
        void updateSW(true);
    },
    reload: () => {
        playerController.stop();
        window.location.reload();
    },
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
});
// 由開 app 就追蹤播放停低嘅時間，grace period 先計得準
updateManager.start();

// prompt 模式：新 SW 喺 waiting 等，由 updateManager 決定幾時 skipWaiting
const updateSW = registerSW({
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

createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
        <App playerController={playerController} />
    </StrictMode>,
);
