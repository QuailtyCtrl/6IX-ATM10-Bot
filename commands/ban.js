const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const rcon = require('../modules/rcon');
const db = require('../modules/database');
const commandLogger = require('../modules/commandLogger');

const ITEMS_PER_PAGE = 25;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a player from the server. (Admin only)'),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await this.showPlayerPagination(interaction, 0, 'ban');
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
      .setPlaceholder('Select a player to ban...')
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
      content: `Select a player to ban (Page ${page + 1}):`, 
      components: [rowMenu, rowButtons] 
    });
  },

  async handleSelection(interaction, username) {
    const result = await rcon.execute(`ban ${username}`);

    if (!result.success) {
      await interaction.update({ content: `⚠ Failed to ban **${username}**: ${result.error}`, components: [] });
      return;
    }

    await commandLogger.logCommand(interaction.client, interaction.user.username, `ban ${username}`);
    await interaction.update({ content: `🔨 **${username}** has been banned.`, components: [] });
  }
};