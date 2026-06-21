// modules/scheduler.js
// Helper for registering/clearing named recurring tasks.
// Uses an async-safe recursive setTimeout pattern to ensure that 
// long-running async tasks never overlap.

const tasks = new Map();

function start(name, intervalMs, fn) {
  if (tasks.has(name)) {
    console.warn(`[scheduler] Task "${name}" already running, restarting it.`);
    stop(name);
  }

  // Set initial state so stop() can reliably cancel it even during the first run.
  tasks.set(name, 'running');
  console.log(`[scheduler] Started "${name}" every ${intervalMs}ms (async-safe).`);

  async function loop() {
    // If stop() was called while waiting, bail out before executing.
    if (!tasks.has(name)) return;

    try {
      // Await the function so we block the next cycle until this completes.
      await fn();
    } catch (err) {
      console.error(`[scheduler] Error in task "${name}":`, err);
    } finally {
      // Check tasks map again in case stop() was called while fn() was executing.
      if (tasks.has(name)) {
        const handle = setTimeout(loop, intervalMs);
        tasks.set(name, handle);
      }
    }
  }

  // Run once immediately, which then cascades into the timeout loop.
  setTimeout(loop, 4000);
}

function stop(name) {
  const handle = tasks.get(name);
  if (handle && handle !== 'running') {
    clearTimeout(handle);
  }
  tasks.delete(name);
}

function stopAll() {
  for (const name of tasks.keys()) stop(name);
}

module.exports = {
  start,
  stop,
  stopAll,
};