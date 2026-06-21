// modules/sftp.js
// Connects to the server over SFTP and tails the Minecraft log file using
// byte-offset seeking, so we only ever read new bytes appended since the
// last poll. Persists offset/state to cache/logState.json so a bot restart
// doesn't reprocess (or skip) lines.

const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const STATE_PATH = config.paths.logState;

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { offset: 0, size: 0, updatedAt: 0 };
  }
}

function saveState(state) {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

let state = loadState();
let sftp = null;

async function getClient() {
  if (sftp) return sftp;
  sftp = new SftpClient();

  // If the underlying connection drops after connect() resolved, null out
  // the cache so the next poll reconnects instead of reusing a dead client.
  sftp.on('end', () => {
    console.warn('[sftp] Connection ended.');
    sftp = null;
  });
  sftp.on('close', () => {
    console.warn('[sftp] Connection closed.');
    sftp = null;
  });
  sftp.on('error', (err) => {
    console.error('[sftp] Client error:', err && err.message, err && err.code, err);
    sftp = null;
  });

  try {
    await sftp.connect({
      host: config.sftp.host,
      port: config.sftp.port,
      username: config.sftp.username,
      password: config.sftp.password,
      readyTimeout: 20000,
      retries: 1,
      // Verbose ssh2-level logging -- prints the raw handshake/auth steps so
      // we can see exactly where/why the connection is dropping.
      debug: (msg) => console.log('[ssh2-debug]', msg),
    });
  } catch (err) {
    console.error('[sftp] connect() threw:', err && err.message, err && err.code, err);
    sftp = null; // allow next poll to retry instead of reusing a dead client
    throw err;
  }

  // Capture a local reference before returning -- if the connection drops
  // immediately after connect() resolves (e.g. host enforces single-session
  // limits), the 'end'/'close' handlers above may have already nulled the
  // module-level `sftp` variable by the time we get here.
  const connectedClient = sftp;
  if (!connectedClient) {
    throw new Error('SFTP connection dropped immediately after connecting (host may only allow one active session at a time).');
  }
  return connectedClient;
}

// Reads only the bytes appended since the last known offset.
// If the remote file is smaller than our stored offset, the log rotated
// (e.g. server restarted) -- reset offset to 0 and read from the start.
async function readNewLines() {
  const client = await getClient();

  let remoteStat;
  try {
    remoteStat = await client.stat(config.sftp.logPath);
  } catch (err) {
    // Connection died between getClient() and stat() -- reset cache so the
    // next poll starts fresh instead of repeating the same dead-client error.
    sftp = null;
    throw err;
  }

  const currentSize = remoteStat.size;

  if (currentSize < state.offset) {
    console.log('[sftp] Log rotation detected, resetting offset to 0.');
    state.offset = 0;
  }

  if (currentSize === state.offset) {
    return []; // nothing new
  }

  let chunks;
  try {
    const stream = await client.createReadStream(config.sftp.logPath, {
      start: state.offset,
      end: currentSize - 1,
    });

    chunks = [];
    await new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
  } catch (err) {
    sftp = null;
    throw err;
  }

  const text = Buffer.concat(chunks).toString('utf8');

  state.offset = currentSize;
  state.size = currentSize;
  state.updatedAt = Date.now();
  saveState(state);

  // Split into lines, drop trailing empty line from partial reads.
  return text.split(/\r?\n/).filter((line) => line.length > 0);
}

async function disconnect() {
  if (sftp) {
    await sftp.end();
    sftp = null;
  }
}

function resetState() {
  state = { offset: 0, size: 0, updatedAt: 0 };
  saveState(state);
}

module.exports = {
  readNewLines,
  disconnect,
  resetState,
};