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

// Queries the actual server for who's online right now via the vanilla
// "list" command, rather than trusting our in-memory join/leave cache --
// the cache only reflects players who joined/left *after* the bot started,
// so it can be wrong (e.g. shows 0 players) if the bot was restarted while
// players were already connected.
// Typical responses:
//   "There are 2 of a max of 20 players online: QauiltyControl, S_aucyyy"
//   "There are 0 of a max of 20 players online: "
async function getOnlinePlayers() {
  const result = await execute('list');
  if (!result.success) return null;

  const match = result.response.match(/players online:\s*(.*)$/i);
  if (!match) return [];

  const namesPart = match[1].trim();
  if (!namesPart) return [];

  return namesPart.split(',').map((name) => name.trim()).filter(Boolean);
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
  getOnlinePlayers,
  disconnect,
};