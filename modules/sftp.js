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
  await sftp.connect({
    host: config.sftp.host,
    port: config.sftp.port,
    username: config.sftp.username,
    password: config.sftp.password,
    readyTimeout: 10000,
  });
  return sftp;
}

// Reads only the bytes appended since the last known offset.
// If the remote file is smaller than our stored offset, the log rotated
// (e.g. server restarted) -- reset offset to 0 and read from the start.
async function readNewLines() {
  const client = await getClient();
  const remoteStat = await client.stat(config.sftp.logPath);
  const currentSize = remoteStat.size;

  if (currentSize < state.offset) {
    console.log('[sftp] Log rotation detected, resetting offset to 0.');
    state.offset = 0;
  }

  if (currentSize === state.offset) {
    return []; // nothing new
  }

  const length = currentSize - state.offset;
  const buffer = Buffer.alloc(length);

  // ssh2-sftp-client exposes the underlying ssh2 client for raw read() calls
  // via client.sftp (low-level). We use get() with a range-capable stream instead
  // for broad version compatibility.
  const stream = await client.createReadStream(config.sftp.logPath, {
    start: state.offset,
    end: currentSize - 1,
  });

  const chunks = [];
  await new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });

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
