// modules/rcon.js
// Thin wrapper around rcon-client with auto-reconnect and a simple
// queued execute() so commands don't race each other.

const { Rcon } = require('rcon-client');
const config = require('./config');

let rcon = null;
let connecting = null;

async function connect() {
  if (rcon && rcon.authenticated) return rcon;
  if (connecting) return connecting;

  connecting = (async () => {
    try {
      rcon = await Rcon.connect({
        host: config.rcon.host,
        port: config.rcon.port,
        password: config.rcon.password,
        timeout: 5000,
      });

      rcon.on('end', () => {
        console.warn('[rcon] Connection closed.');
        rcon = null;
      });

      rcon.on('error', (err) => {
        console.error('[rcon] Error:', err.message);
      });

      console.log('[rcon] Connected.');
      return rcon;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

async function execute(command) {
  try {
    const client = await connect();
    const response = await client.send(command);
    return { success: true, response };
  } catch (err) {
    console.error(`[rcon] Failed to execute "${command}":`, err.message);
    return { success: false, error: err.message };
  }
}

async function isServerOnline() {
  try {
    await connect();
    return true;
  } catch {
    return false;
  }
}

async function disconnect() {
  if (rcon) {
    await rcon.end();
    rcon = null;
  }
}

module.exports = {
  connect,
  execute,
  isServerOnline,
  disconnect,
};
