// modules/serverMonitor.js
const config = require('./config');
const sftp = require('./sftp');
const logParser = require('./logParser');
const db = require('./database');
const playerCache = require('./playerCache');
const rcon = require('./rcon');
const { formatDuration } = require('../commands/playtime');
const chatBridge = require('./chatBridge');
const { joinMessage, leaveMessage, deathMessage, advancementMessage, statusAlert } = require('./embedBuilder');

let discordClient = null;
let serverStartedAt = null;

// Tracks usernames whose UUID we've seen recently via the official
// "UUID of player X is Y" log line, since that line and the "joined the
// game" line are separate log entries that can arrive in either order.
const pendingUuids = new Map(); // username -> uuid

async function announce(content, type = 'bot') {
  if (!discordClient) return;
  const channelId = type === 'admin' ? config.channels.adminChat : config.channels.botCommands;
  const channel = await discordClient.channels.fetch(channelId).catch(() => null);
  if (channel) await channel.send(content);
}

async function handleEvent(event) {
  console.log(`[serverMonitor] Event Detected: ${event.type} | User: ${event.username || 'unknown'}`);

  switch (event.type) {
    case 'uuid': {
      // Save the official UUID as soon as we see it, and cache it in case
      // the "joined the game" line for this player arrives in the same or
      // a later poll batch.
      pendingUuids.set(event.username, event.uuid);
      await db.upsertPlayer(event.uuid, event.username);
      break;
    }

    case 'join': {
      // Resolve UUID: prefer one seen via the official UUID line, else an
      // existing DB record, else fall back to the deterministic offline-mode
      // UUID (covers cases where the UUID line was missed or arrives late).
      let uuid = pendingUuids.get(event.username);
      if (!uuid) {
        const existing = await db.getPlayerByUsername(event.username);
        uuid = existing?.uuid || null;
      }
      if (!uuid) {
        uuid = logParser.generateOfflineUuid(event.username);
      }

      await db.upsertPlayer(uuid, event.username);
      await db.startSession(uuid);
      playerCache.addPlayer(uuid, event.username);
      pendingUuids.delete(event.username);

      await announce(joinMessage(event.username), 'bot');
      break;
    }

    case 'leave': {
      const cached = playerCache.findByUsername(event.username);
      if (!cached) {
        // If not in cache, we can't calculate exact time
        await announce(leaveMessage(event.username, '0s'), 'bot');
      } else {
        const durationMs = await db.endSession(cached.uuid);
        playerCache.removePlayer(cached.uuid);

        // Use formatDuration to turn the DB ms into readable text
        const timeText = formatDuration(durationMs || 0);
        await announce(leaveMessage(event.username, timeText), 'bot');
      }
      break;
    }

    case 'death': {
      if (!event.username) {
        console.warn('[serverMonitor] Death event with no username');
        break;
      }
      const player = await db.getPlayerByUsername(event.username);
      if (player) await db.incrementDeaths(player.uuid);
      await announce(deathMessage(event.message), 'bot');
      break;
    }

    case 'advancement': {
      const player = await db.getPlayerByUsername(event.username);
      if (player) await db.incrementAdvancements(player.uuid);
      await announce(advancementMessage(event.username, event.advancement), 'bot');
      break;
    }

    case 'chat': {
      if (!event.username || !event.message) break;
      await chatBridge.sendFromMCToDiscord(discordClient, event.username, event.message);
      break;
    }

    case 'started':
      await announce(statusAlert('online'), 'admin');
      serverStartedAt = Date.now();
      break;

    case 'stopping':
      await announce(statusAlert('stop'), 'admin');
      playerCache.clear();
      serverStartedAt = null;
      break;
  }
}

async function pollOnce() {
  try {
    const lines = await sftp.readNewLines();
    if (lines.length === 0) return;

    console.log('[DEBUG] Raw lines from log:', lines);

    const events = logParser.parseLines(lines);
    for (const event of events) await handleEvent(event);
  } catch (err) {
    console.error('[serverMonitor] Poll failed:', err.message);
  }
}

async function getServerStatus() {
  const online = await rcon.isServerOnline();
  return {
    online,
    playerCount: playerCache.getOnlineCount(),
    players: playerCache.getOnlineList(),
    uptimeMs: online && serverStartedAt ? Date.now() - serverStartedAt : null,
  };
}

function init(client) { discordClient = client; }

module.exports = { init, pollOnce, getServerStatus };