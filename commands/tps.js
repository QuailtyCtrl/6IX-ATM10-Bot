// commands/tps.js
// Pulls TPS via RCON. NeoForge/Forge expose this through "/forge tps" (mean
// TPS across dimensions); we parse the overall figure out of the response.
// 30s cooldown is enforced per the README spec, shared across all users.

const { SlashCommandBuilder } = require('discord.js');
const rcon = require('../modules/rcon');
const config = require('../modules/config');
const { tpsEmbed } = require('../modules/embedBuilder');

let lastUsed = 0;

function extractTps(rconResponse) {
  // Typical line: "Overall : Mean tick time: 5.123 ms. Mean TPS: 19.456"
  const match = rconResponse.match(/Mean TPS:\s*([\d.]+)/i);
  if (match) return parseFloat(match[1]);
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tps')
    .setDescription('Shows the current server TPS (30s cooldown).'),

  async execute(interaction) {
    const now = Date.now();
    const remaining = config.polling.tpsCooldownMs - (now - lastUsed);

    if (remaining > 0) {
      await interaction.reply({
        content: `\u23F3 TPS check is on cooldown. Try again in ${Math.ceil(remaining / 1000)}s.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const result = await rcon.execute('neoforge tps');
    if (!result.success) {
      await interaction.editReply('\u26A0 Could not reach the server to check TPS.');
      return;
    }

    const tps = extractTps(result.response);
    if (tps === null) {
      await interaction.editReply('\u26A0 Could not parse TPS from server response.');
      return;
    }

    lastUsed = now;
    await interaction.editReply({ embeds: [tpsEmbed(tps)] });
  },
};
