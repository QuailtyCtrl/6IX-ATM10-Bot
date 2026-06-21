// modules/commandLogger.js
// Logs every admin-executed command to a local file and posts an embed
// to the admin-chat Discord channel.

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { commandLogEmbed } = require('./embedBuilder');

const LOG_PATH = config.paths.commandLog;

function ensureLogFile() {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, '');
}

function formatTimestamp(date = new Date()) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

async function logCommand(client, user, command) {
  ensureLogFile();
  const timestamp = formatTimestamp();
  const line = `[${new Date().toISOString()}] ${user} executed: ${command}\n`;

  fs.appendFile(LOG_PATH, line, (err) => {
    if (err) console.error('[commandLogger] Failed to write log file:', err.message);
  });

  if (config.channels.adminChat) {
    try {
      const channel = await client.channels.fetch(config.channels.adminChat);
      if (channel) {
        await channel.send({ embeds: [commandLogEmbed(user, command, timestamp)] });
      }
    } catch (err) {
      console.error('[commandLogger] Failed to post to admin-chat:', err.message);
    }
  }
}

module.exports = {
  logCommand,
};
