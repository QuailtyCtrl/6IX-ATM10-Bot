// modules/chatBridge.js
// Two-way bridge between the Minecraft in-game chat and a Discord channel.
// MC -> Discord: called by serverMonitor when a `chat` log event is parsed.
// Discord -> MC: listens for messageCreate in the configured bridge channel
// and relays via RCON `tellraw` (avoids needing op chat or "say" formatting issues).

const config = require('./config');
const rcon = require('./rcon');
const { chatBridgeFromMC } = require('./embedBuilder');

// Build a safe `tellraw @a` command using JSON.stringify so ALL special
// characters (quotes, backslashes, newlines, unicode, etc.) are handled
// correctly — no manual escaping needed.
function buildTellraw(username, message) {
  // Strip actual newlines from Discord messages so they don't break the
  // single-line RCON command. Replace with a space.
  const safeMsg = message.replace(/[\r\n]+/g, ' ').trim();

  const payload = JSON.stringify({
    text: `[Discord] <${username}> ${safeMsg}`,
    color: 'aqua',
  });

  return `tellraw @a ${payload}`;
}

async function sendFromMCToDiscord(client, username, message) {
  if (!config.channels.chatBridge) return;
  try {
    const channel = await client.channels.fetch(config.channels.chatBridge);
    if (channel) {
      await channel.send(chatBridgeFromMC(username, message));
    }
  } catch (err) {
    console.error('[chatBridge] Failed to relay MC -> Discord:', err.message);
  }
}

async function sendFromDiscordToMC(username, message) {
  const command = buildTellraw(username, message);
  return rcon.execute(command);
}

function registerDiscordListener(client) {
  if (!config.channels.chatBridge) {
    console.warn('[chatBridge] CHAT_BRIDGE_CHANNEL_ID is not set — Discord -> MC bridge disabled.');
    return;
  }

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== config.channels.chatBridge) return;

    // Ignore empty messages (e.g. image-only posts)
    const content = message.content.trim();
    if (!content) return;

    const result = await sendFromDiscordToMC(message.author.username, content);
    if (!result.success) {
      console.error('[chatBridge] Failed to relay Discord -> MC:', result.error);
    }
  });

  console.log(`[chatBridge] Discord -> MC bridge listening on channel ${config.channels.chatBridge}`);
}

module.exports = {
  sendFromMCToDiscord,
  sendFromDiscordToMC,
  registerDiscordListener,
};
