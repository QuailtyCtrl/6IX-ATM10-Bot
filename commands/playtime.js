// commands/playtime.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../modules/database');
const { playtimeEmbed } = require('../modules/embedBuilder');
const { formatDuration, getLiveTotalPlaytime } = require('../modules/playtime');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playtime')
    .setDescription("Shows a player's total playtime.")
    .addStringOption((opt) =>
      opt.setName('user').setDescription('Minecraft username').setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const username = interaction.options.getString('user');
    const player = await db.getPlayerByUsername(username);

    if (!player) {
      await interaction.editReply(`\u26A0 No playtime data found for **${username}**.`);
      return;
    }

    const totalMs = getLiveTotalPlaytime(player);
    await interaction.editReply({ embeds: [playtimeEmbed(player.username, formatDuration(totalMs))] });
  },
};
