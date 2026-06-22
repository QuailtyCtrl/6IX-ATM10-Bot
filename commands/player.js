// commands/player.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../modules/database');
const playerCache = require('../modules/playerCache');
const { formatDuration, getLiveTotalPlaytime } = require('../modules/playtime');
const { COLORS } = require('../modules/embedBuilder');

function formatDate(ms) {
  if (!ms) return 'Unknown';
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription('Displays all info about a player.')
    .addStringOption((opt) =>
      opt
        .setName('username')
        .setDescription('Select a player')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  // Called by Discord as the user types — returns matching player names from the DB
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const all = await db.getAllPlayers();
    const matches = all
      .filter((p) => p.username.toLowerCase().includes(focused))
      .slice(0, 25) // Discord max
      .map((p) => ({ name: p.username, value: p.username }));
    await interaction.respond(matches);
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const username = interaction.options.getString('username');
    const player = await db.getPlayerByUsername(username);

    if (!player) {
      await interaction.editReply(`❌ No record found for **${username}**.`);
      return;
    }

    const isOnline = !!playerCache.findByUsername(player.username);
    const livePlaytime = getLiveTotalPlaytime(player);

    const embed = new EmbedBuilder()
      .setColor(isOnline ? COLORS.online : COLORS.info)
      .setTitle(`🪪 ${player.username}`)
      .setThumbnail(`https://mc-heads.net/avatar/${player.username}/64`)
      .addFields(
        { name: 'Status',         value: isOnline ? '🟢 Online' : '🔴 Offline',               inline: true  },
        { name: 'Total Playtime', value: formatDuration(livePlaytime),                          inline: true  },
        { name: 'Sessions',       value: `${player.sessions ?? 0}`,                             inline: true  },
        { name: 'First Join',     value: formatDate(player.first_join),                         inline: true  },
        { name: 'Last Seen',      value: isOnline ? 'Right now' : formatDate(player.last_seen), inline: true  },
        { name: 'Deaths',         value: `${player.deaths ?? 0}`,                               inline: true  },
        { name: 'Advancements',   value: `${player.advancements ?? 0}`,                         inline: true  },
        { name: 'UUID',           value: `\`${player.uuid}\``,                                  inline: false },
      )
      .setFooter({ text: `Requested by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};