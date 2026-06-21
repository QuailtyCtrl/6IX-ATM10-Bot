// modules/scheduler.js
// Tiny helper for registering/clearing named recurring tasks so other
// modules don't each roll their own setInterval bookkeeping.

const tasks = new Map();

function start(name, intervalMs, fn) {
  if (tasks.has(name)) {
    console.warn(`[scheduler] Task "${name}" already running, restarting it.`);
    stop(name);
  }

  // Run once immediately, then on the interval.
  fn();
  const handle = setInterval(fn, intervalMs);
  tasks.set(name, handle);
  console.log(`[scheduler] Started "${name}" every ${intervalMs}ms.`);
}

function stop(name) {
  const handle = tasks.get(name);
  if (handle) {
    clearInterval(handle);
    tasks.delete(name);
  }
}

function stopAll() {
  for (const name of tasks.keys()) stop(name);
}

module.exports = {
  start,
  stop,
  stopAll,
};
