// modules/serverMonitor.js
const config = require('./config');
const sftp = require('./sftp');
const logParser = require('./logParser');
const db = require('./database');
const playerCache = require('./playerCache');
const { formatDuration } = require('./playtime');
const { joinMessage, leaveMessage, deathMessage, advancementMessage, statusAlert } = require('./embedBuilder');

let discordClient = null;

async function announce(content, type = 'bot') {
  if (!discordClient) return;
  const channelId = type === 'admin' ? config.channels.adminChat : config.channels.botCommands;
  const channel = await discordClient.channels.fetch(channelId).catch(() => null);
  if (channel) await channel.send(content);
}

async function handleEvent(event) {
  console.log(`[serverMonitor] Event Detected: ${event.type} | User: ${event.username || 'unknown'}`);

  switch (event.type) {
    case 'join': {
      // Ensure we track the player in cache so we know when they joined
      const player = await db.getPlayerByUsername(event.username);
      if (player) {
        playerCache.addPlayer(player.uuid, event.username);
        await db.startSession(player.uuid);
      }
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

    case 'death': 
      await announce(deathMessage(event.message), 'bot'); 
      break;

    case 'advancement': 
      await announce(advancementMessage(event.username, event.advancement), 'bot'); 
      break;

    case 'started': 
      await announce(statusAlert('online'), 'admin'); 
      break;

    case 'stopping': 
      await announce(statusAlert('stop'), 'admin'); 
      playerCache.clear();
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

function init(client) { discordClient = client; }

module.exports = { init, pollOnce };