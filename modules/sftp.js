// modules/sftp.js
// Connects to the server over SFTP, tails the Minecraft log file, 
// and immediately disconnects. This stateless approach prevents 
// strict Pterodactyl panels from dropping idle persistent connections.

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
let pollCount = 0;

async function readNewLines() {
  pollCount++;
  console.log(`[sftp] Checking for new logs... (#${pollCount})`);
  
  const client = new SftpClient();

  try {
    await client.connect({
      host: config.sftp.host,
      port: config.sftp.port,
      username: config.sftp.username,
      password: config.sftp.password,
      readyTimeout: 15000
    });

    const remoteStat = await client.stat(config.sftp.logPath);
    const currentSize = remoteStat.size;

    if (currentSize < state.offset) {
      console.log('[sftp] Log rotation detected, resetting offset to 0.');
      state.offset = 0;
    }

    if (currentSize === state.offset) {
      await client.end();
      return [];
    }

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

    await client.end();

    const text = Buffer.concat(chunks).toString('utf8');
    state.offset = currentSize;
    state.size = currentSize;
    state.updatedAt = Date.now();
    saveState(state);

    return text.split(/\r?\n/).filter((line) => line.length > 0);

  } catch (err) {
    try { await client.end(); } catch (_) {}
    throw err;
  }
}

async function disconnect() {
  return Promise.resolve();
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