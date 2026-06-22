const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../modules/database');
const { playtimeEmbed } = require('../modules/embedBuilder');
const { formatDuration, getLiveTotalPlaytime } = require('../modules/playtime');

const ITEMS_PER_PAGE = 25;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playtime')
    .setDescription("Shows a player's total playtime."),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await this.showPlayerPagination(interaction, 0, 'playtime');
  },

  async showPlayerPagination(interaction, page, actionType) {
    const players = await db.getAllPlayers();
    const start = page * ITEMS_PER_PAGE;
    const pagePlayers = players.slice(start, start + ITEMS_PER_PAGE);

    if (pagePlayers.length === 0) {
      await interaction.editReply({ content: 'No players found in the database.' });
      return;
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`select_player_${actionType}`)
      .setPlaceholder('Select a player to check playtime...')
      .addOptions(pagePlayers.map(p => ({ label: p.username, value: p.username })));

    const rowMenu = new ActionRowBuilder().addComponents(menu);

    const rowButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`page_${page - 1}_${actionType}`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`page_${page + 1}_${actionType}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(start + ITEMS_PER_PAGE >= players.length)
    );

    await interaction.editReply({ 
      content: `Select a player (Page ${page + 1}):`, 
      components: [rowMenu, rowButtons] 
    });
  },

  async handleSelection(interaction, username) {
    const player = await db.getPlayerByUsername(username);

    if (!player) {
      await interaction.update({ content: `\u26A0 No playtime data found for **${username}**.`, components: [] });
      return;
    }

    const totalMs = getLiveTotalPlaytime(player);
    await interaction.update({ 
      content: `Playtime for **${username}**:`,
      embeds: [playtimeEmbed(player.username, formatDuration(totalMs))],
      components: [] 
    });
  }
};