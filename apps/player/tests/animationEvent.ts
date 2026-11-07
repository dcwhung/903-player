// 要喺 react-dom 載入之前行（vite.config.ts setupFiles 排第一）：jsdom 冇 AnimationEvent，
// React 就會改聽 webkitAnimationEnd，fireEvent.animationEnd 觸發唔到 onAnimationEnd
if (typeof window !== 'undefined' && !('AnimationEvent' in window)) {
    class AnimationEventPolyfill extends Event {
        readonly animationName: string;

        constructor(type: string, init: AnimationEventInit = {}) {
            super(type, init);
            this.animationName = init.animationName ?? '';
        }
    }
    Object.defineProperty(window, 'AnimationEvent', { value: AnimationEventPolyfill });
}
