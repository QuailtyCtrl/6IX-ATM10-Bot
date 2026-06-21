// commands/server.js
const { SlashCommandBuilder } = require('discord.js');
const serverMonitor = require('../modules/serverMonitor');
const rcon = require('../modules/rcon');
const config = require('../modules/config');
const { serverInfoEmbed } = require('../modules/embedBuilder');
const { formatDuration } = require('../modules/playtime');

async function getRamUsage() {
  // Best-effort: some forge/neoforge builds include a "Memory Use" line
  // in their tps/debug output. Falls back to N/A if not present.
  const result = await rcon.execute('neoforge tps');
  if (!result.success) return 'N/A';

  const match = result.response.match(/Memory Use:\s*([\d.]+\s*\/\s*[\d.]+\s*\w+)/i);
  return match ? match[1] : 'N/A';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Displays server details.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const status = await serverMonitor.getServerStatus();
    const ram = status.online ? await getRamUsage() : 'Offline';

    const embed = serverInfoEmbed({
      ip: config.server.ip,
      modpack: config.server.modpack,
      ram,
      status: status.online ? 'Online' : 'Offline',
      uptime: status.online && status.uptimeMs ? formatDuration(status.uptimeMs) : 'Offline',
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
