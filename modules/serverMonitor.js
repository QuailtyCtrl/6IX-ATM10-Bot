// modules/serverMonitor.js
// The orchestrator: polls the log file via sftp.js, parses new lines via
// logParser.js, and reacts to each event -- updating the database/cache
// and posting Discord announcements. Also tracks RCON-based online status
// for /online and /server.

const config = require('./config');
const sftp = require('./sftp');
const logParser = require('./logParser');
const db = require('./database');
const playerCache = require('./playerCache');
const rcon = require('./rcon');
const chatBridge = require('./chatBridge');
const {
  joinMessage,
  leaveMessage,
  deathMessage,
  advancementMessage,
  statusAlert,
} = require('./embedBuilder');
const { formatDuration } = require('./playtime');

let discordClient = null;
let serverStartedAt = null;

// Tracks usernames whose UUID we've seen recently, since the "logged in"
// line and "UUID of player X is Y" line are separate log entries that can
// arrive in either order depending on server version.
const pendingUuids = new Map(); // username -> uuid

async function postToBotChannel(content) {
  if (!config.channels.botCommands || !discordClient) return;
  try {
    const channel = await discordClient.channels.fetch(config.channels.botCommands);
    if (channel) await channel.send(content);
  } catch (err) {
    console.error('[serverMonitor] Failed to post to bot-commands:', err.message);
  }
}

async function postToAdminChat(content) {
  if (!config.channels.adminChat || !discordClient) return;
  try {
    const channel = await discordClient.channels.fetch(config.channels.adminChat);
    if (channel) await channel.send(content);
  } catch (err) {
    console.error('[serverMonitor] Failed to post to admin-chat:', err.message);
  }
}

async function announce(content) {
  // README spec: join/leave/death/advancement/chat/status events go to
  // both #bot-commands and #admins-chat.
  await Promise.all([postToBotChannel(content), postToAdminChat(content)]);
}

async function handleEvent(event) {
  switch (event.type) {
    case 'uuid': {
      pendingUuids.set(event.username, event.uuid);
      await db.upsertPlayer(event.uuid, event.username);
      break;
    }

    case 'join': {
      // Resolve UUID: prefer one seen in this batch, else look up by username.
      let uuid = pendingUuids.get(event.username);
      if (!uuid) {
        const existing = await db.getPlayerByUsername(event.username);
        uuid = existing?.uuid || null;
      }

      if (!uuid) {
        // No UUID yet -- this can happen on very old log formats. Skip
        // tracking but still announce the join.
        await announce(joinMessage(event.username));
        break;
      }

      await db.upsertPlayer(uuid, event.username);
      await db.startSession(uuid);
      playerCache.addPlayer(uuid, event.username);
      pendingUuids.delete(event.username);

      await announce(joinMessage(event.username));
      break;
    }

    case 'leave': {
      const cached = playerCache.findByUsername(event.username);
      if (!cached) {
        await announce(leaveMessage(event.username, '0s'));
        break;
      }

      playerCache.removePlayer(cached.uuid);
      const durationMs = await db.endSession(cached.uuid);

      await announce(leaveMessage(event.username, formatDuration(durationMs)));
      break;
    }

    case 'death': {
      const player = await db.getPlayerByUsername(event.username);
      if (player) await db.incrementDeaths(player.uuid);

      await announce(deathMessage(event.message));
      break;
    }

    case 'advancement': {
      const player = await db.getPlayerByUsername(event.username);
      if (player) await db.incrementAdvancements(player.uuid);

      await announce(advancementMessage(event.username, event.advancement));
      break;
    }

    case 'chat': {
      await chatBridge.sendFromMCToDiscord(discordClient, event.username, event.message);
      break;
    }

    case 'stopping': {
      await announce(statusAlert('stop'));
      playerCache.clear();
      serverStartedAt = null;
      break;
    }

    case 'started': {
      await announce(statusAlert('online'));
      serverStartedAt = Date.now();
      break;
    }

    default:
      break;
  }
}

async function pollOnce() {
  try {
    const lines = await sftp.readNewLines();
    if (lines.length === 0) return;

    const events = logParser.parseLines(lines);
    for (const event of events) {
      await handleEvent(event);
    }
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

function init(client) {
  discordClient = client;
}

module.exports = {
  init,
  pollOnce,
  getServerStatus,
};
