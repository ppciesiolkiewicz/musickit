// Init script for the video render page: a clock that only moves when the render script steps it. `performance.now()`
// and `requestAnimationFrame` are the page's only time sources, so every frame is drawn at its exact time, however
// long a frame takes to capture.
(() => {
  let now = 0,
    next = 0;
  const queue = new Map();
  // the browser's own frames still come: a step waits for one, so what a real frame delivers (a ResizeObserver's first
  // size) is drawn before the screenshot, the same whether or not the frame is captured
  const nativeFrame = window.requestAnimationFrame.bind(window);
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => (queue.set(++next, cb), next);
  window.cancelAnimationFrame = (id) => queue.delete(id);
  window.__clock = {
    /** moves the clock on `ms` and runs the frame callbacks that were waiting (ones they ask for wait for the next step) */
    step(ms) {
      now += ms;
      const due = [...queue.values()];
      queue.clear();
      due.forEach((cb) => cb(now));
    },
    /** resolves after the browser's next real rendering opportunity */
    paint: () => new Promise((r) => nativeFrame(() => setTimeout(r, 0))),
  };
})();
