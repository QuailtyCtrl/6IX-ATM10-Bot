// modules/embedBuilder.js
// Centralized Discord embed/message construction so visual style stays consistent.

const { EmbedBuilder } = require('discord.js');

const COLORS = {
  online: 0x57f287,
  offline: 0xed4245,
  info: 0x5865f2,
  warn: 0xfee75c,
  danger: 0xed4245,
};

function onlineListEmbed(players, isServerOnline) {
  if (!isServerOnline) {
    return new EmbedBuilder()
      .setColor(COLORS.offline)
      .setTitle('Server Offline')
      .setDescription('Offline');
  }

  const count = players.length;
  const emojiCount = count > 9 ? `${count}` : `${count}\u20E3`;

  const description =
    count === 0
      ? 'No Users Online'
      : players.map((p) => p.username).join('\n');

  return new EmbedBuilder()
    .setColor(COLORS.online)
    .setTitle(`PLAYER COUNT: ${emojiCount}`)
    .setDescription(description);
}

function tpsEmbed(tps) {
  let status = 'Alright';
  let color = COLORS.online;

  if (tps < 10) {
    status = 'Critical';
    color = COLORS.danger;
  } else if (tps < 15) {
    status = 'Struggling';
    color = COLORS.warn;
  } else if (tps < 18) {
    status = 'Alright';
    color = COLORS.online;
  } else {
    status = 'Great';
    color = COLORS.online;
  }

  return new EmbedBuilder()
    .setColor(color)
    .setTitle('\u26A0 TPS Alert')
    .addFields(
      { name: 'Status', value: `**${status}**`, inline: true },
      { name: 'Current TPS', value: `**${tps.toFixed(1)}**`, inline: true }
    );
}

function playtimeEmbed(username, formattedDuration) {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`\uD83E\uDEAA ${username}`)
    .setDescription(`Playtime: **${formattedDuration}**`);
}

function serverInfoEmbed({ ip, modpack, ram, status, uptime }) {
  return new EmbedBuilder()
    .setColor(status === 'Online' ? COLORS.online : COLORS.offline)
    .setTitle('\uD83D\uDCBB Server Details \uD83D\uDCBB')
    .addFields(
      { name: 'IP', value: ip, inline: false },
      { name: 'Modpack', value: modpack, inline: false },
      { name: 'RAM', value: ram, inline: false },
      { name: 'Status', value: status, inline: false },
      { name: 'Uptime', value: uptime, inline: false }
    );
}

function joinMessage(username) {
  return `\uD83D\uDFE2 ${username} joined the server`;
}

function leaveMessage(username, formattedSession) {
  return `\uD83D\uDC4B ${username} left the server\n\u23F1 Session: ${formattedSession}`;
}

function deathMessage(text) {
  return `\uD83D\uDC80 ${text}`;
}

function advancementMessage(username, advancement) {
  return `\uD83C\uDFC6 ${username} has made the advancement:\n*${advancement}*`;
}

function chatBridgeFromMC(username, message) {
  return `\u26CF\uFE0F <${username}> ${message}`;
}

function chatBridgeToMC(username, message) {
  return `[Discord] <${username}> ${message}`;
}

function statusAlert(type) {
  if (type === 'restart') return '\uD83D\uDD04 Server Restart Detected';
  if (type === 'stop') return '\uD83D\uDED1 Server Stopped';
  if (type === 'online') return '\u2705 Server Online';
  return null;
}

function commandLogEmbed(user, command, timestamp) {
  return new EmbedBuilder()
    .setColor(COLORS.warn)
    .setDescription(
      `\uD83D\uDDA5\uFE0F [${user}] Executed:\n\n\`\`\`${command}\`\`\`\n\n\u231A Time Stamp: ${timestamp}`
    );
}

module.exports = {
  COLORS,
  onlineListEmbed,
  tpsEmbed,
  playtimeEmbed,
  serverInfoEmbed,
  joinMessage,
  leaveMessage,
  deathMessage,
  advancementMessage,
  chatBridgeFromMC,
  chatBridgeToMC,
  statusAlert,
  commandLogEmbed,
};
