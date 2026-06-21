// commands/tps.js
// Pulls TPS via RCON. NeoForge/Forge expose this through "/neoforge tps"
// Displays the Overworld TPS as the primary metric.
// 30s cooldown is enforced per the README spec, shared across all users.

const { SlashCommandBuilder } = require('discord.js');
const rcon = require('../modules/rcon');
const config = require('../modules/config');
const { tpsEmbed } = require('../modules/embedBuilder');

let lastUsed = 0;

function extractTps(rconResponse) {
  // Format: "Overworld: 20.000 TPS (0.584 ms/tick)"
  // Extract the first TPS value (Overworld)
  const match = rconResponse.match(/Overworld:\s*([\d.]+)\s+TPS/);
  if (match) return parseFloat(match[1]);
  
  // Fallback: get any TPS value if Overworld not found
  const fallback = rconResponse.match(/:\s*([\d.]+)\s+TPS/);
  if (fallback) return parseFloat(fallback[1]);
  
  return null;
}

function extractAllDimensions(rconResponse) {
  // Extract all dimensions and their TPS, excluding mods we want to hide
  const lines = rconResponse.split('\n');
  const dimensions = [];
  
  const excludeList = ['compactmachines', 'irons_spellbooks'];
  
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*([\d.]+)\s+TPS/);
    if (match) {
      const dimName = match[1].trim();
      const tps = parseFloat(match[2]);
      
      // Skip excluded dimensions
      if (excludeList.some(excluded => dimName.toLowerCase().includes(excluded))) {
        continue;
      }
      
      dimensions.push({ name: dimName, tps });
    }
  }
  
  return dimensions;
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
    const dimensions = extractAllDimensions(result.response);
    
    await interaction.editReply({ 
      embeds: [tpsEmbed(tps, dimensions)] 
    });
  },
};
