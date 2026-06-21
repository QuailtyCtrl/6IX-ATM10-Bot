// modules/chatBridge.js
// Two-way bridge between the Minecraft in-game chat and a Discord channel.
// MC -> Discord: called by serverMonitor when a `chat` log event is parsed.
// Discord -> MC: listens for messageCreate in the configured bridge channel
// and relays via RCON `tellraw` (avoids needing op chat or "say" formatting issues).

const config = require('./config');
const rcon = require('./rcon');
const { chatBridgeFromMC } = require('./embedBuilder');

function escapeForTellraw(text) {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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
  const safeUser = escapeForTellraw(username);
  const safeMsg = escapeForTellraw(message);
  const command = `tellraw @a {"text":"[Discord] <${safeUser}> ${safeMsg}"}`;
  return rcon.execute(command);
}

function registerDiscordListener(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!config.channels.chatBridge) return;
    if (message.channel.id !== config.channels.chatBridge) return;

    const result = await sendFromDiscordToMC(message.author.username, message.content);
    if (!result.success) {
      console.error('[chatBridge] Failed to relay Discord -> MC:', result.error);
    }
  });
}

module.exports = {
  sendFromMCToDiscord,
  sendFromDiscordToMC,
  registerDiscordListener,
};
