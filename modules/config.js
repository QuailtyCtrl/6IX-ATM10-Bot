// modules/config.js
// Central place for all environment-derived configuration.
// Other modules should require() this instead of touching process.env directly.

require('dotenv').config();

function required(name) {
  const val = process.env[name];
  if (!val) {
    console.warn(`[config] Warning: ${name} is not set in .env`);
  }
  return val;
}

module.exports = {
  discord: {
    token: required('DISCORD_TOKEN'),
    clientId: required('DISCORD_CLIENT_ID'),
    guildId: required('DISCORD_GUILD_ID'),
    adminRoleId: required('ADMIN_ROLE_ID'),
  },

  channels: {
    botCommands: process.env.BOT_COMMANDS_CHANNEL_ID,
    adminChat: process.env.ADMIN_CHAT_CHANNEL_ID,
    chatBridge: process.env.CHAT_BRIDGE_CHANNEL_ID,
  },

  rcon: {
    host: process.env.RCON_HOST,
    port: parseInt(process.env.RCON_PORT, 10) || 25575,
    password: process.env.RCON_PASSWORD,
  },

  sftp: {
    host: process.env.SFTP_HOST,
    port: parseInt(process.env.SFTP_PORT, 10) || 22,
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD,
    logPath: process.env.SFTP_LOG_PATH || '/logs/latest.log',
  },

  server: {
    ip: process.env.SERVER_IP || 'unknown',
    modpack: process.env.MODPACK_NAME || 'Unknown Modpack',
  },

  polling: {
    logIntervalMs: parseInt(process.env.LOG_POLL_INTERVAL_MS, 10) || 2000,
    tpsCooldownMs: parseInt(process.env.TPS_COOLDOWN_MS, 10) || 30000,
  },

  paths: {
    database: require('path').join(__dirname, '..', 'database', 'data.sqlite'),
    logState: require('path').join(__dirname, '..', 'cache', 'logState.json'),
    commandLog: require('path').join(__dirname, '..', 'logs', 'command-log.txt'),
  },
};
