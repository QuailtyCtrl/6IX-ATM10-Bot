// commands/ban.js
const { SlashCommandBuilder } = require('discord.js');
const rcon = require('../modules/rcon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a player from the server. (Admin only)')
    .addStringOption((opt) =>
      opt.setName('user').setDescription('Minecraft username').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the ban').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const username = interaction.options.getString('user');
    const reason = interaction.options.getString('reason');

    const cmd = reason ? `ban ${username} ${reason}` : `ban ${username}`;
    const result = await rcon.execute(cmd);

    if (!result.success) {
      await interaction.editReply(`\u26A0 Failed to ban **${username}**: ${result.error}`);
      return;
    }

    await interaction.editReply(`\uD83D\uDD28 ${username} Has Been Banned.`);
  },
};
