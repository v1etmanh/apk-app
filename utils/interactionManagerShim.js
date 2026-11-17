// utils/interactionManagerShim.js
//
// React Native 0.88 đã gỡ InteractionManager khỏi core: truy cập
// `require('react-native').InteractionManager` sẽ ném lỗi (dev) hoặc trả undefined (release).
// @react-navigation/stack 6.x vẫn gọi InteractionManager.createInteractionHandle /
// clearInteractionHandle mỗi lần chuyển màn → "Render Error" khi navigate.
//
// Shim tối giản theo đúng API cũ, dựa trên requestIdleCallback / setTimeout.
// PHẢI được import đầu tiên trong App.js (trước mọi navigator).
// Gỡ file này khi nâng @react-navigation lên bản không còn dùng InteractionManager.

const schedule = typeof requestIdleCallback === 'function'
  ? (cb) => requestIdleCallback(cb)
  : (cb) => setTimeout(cb, 0);

let nextHandle = 1;
const activeHandles = new Set();
let pending = [];

const flush = () => {
  if (activeHandles.size > 0) return;
  const queue = pending;
  pending = [];
  queue.forEach(task => {
    if (task.cancelled) return;
    try {
      const run = typeof task.fn === 'function' ? task.fn : task.fn?.run;
      const result = run ? run() : undefined;
      task.resolve(result);
    } catch (e) {
      task.reject(e);
    }
  });
};

const InteractionManagerShim = {
  Events: { interactionStart: 'interactionStart', interactionComplete: 'interactionComplete' },

  runAfterInteractions(fn) {
    let task;
    const promise = new Promise((resolve, reject) => {
      task = { fn, resolve, reject, cancelled: false };
    });
    pending.push(task);
    schedule(flush);
    return {
      then: promise.then.bind(promise),
      done: (...args) => promise.then(...args),
      cancel: () => { task.cancelled = true; },
    };
  },

  createInteractionHandle() {
    const handle = nextHandle++;
    activeHandles.add(handle);
    return handle;
  },

  clearInteractionHandle(handle) {
    activeHandles.delete(handle);
    if (activeHandles.size === 0) schedule(flush);
  },

  addListener() {
    return { remove() {} };
  },

  setDeadline() {},
};

const install = (obj) => {
  try {
    const desc = Object.getOwnPropertyDescriptor(obj, 'InteractionManager');
    if (!desc || desc.configurable) {
      Object.defineProperty(obj, 'InteractionManager', {
        configurable: true,
        enumerable: true,
        value: InteractionManagerShim,
      });
    }
  } catch (e) {
    if (__DEV__) console.warn('[InteractionManagerShim] install failed:', e?.message);
  }
};

// module.exports của react-native (CommonJS) — đối tượng mà các thư viện require tới.
// Dùng require (không dùng import *) để không chạm vào getter đang ném lỗi.
// eslint-disable-next-line global-require
install(require('react-native'));

export default InteractionManagerShim;
