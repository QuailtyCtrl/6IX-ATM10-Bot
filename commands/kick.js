// commands/kick.js
const { SlashCommandBuilder } = require('discord.js');
const rcon = require('../modules/rcon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a player from the server. (Admin only)')
    .addStringOption((opt) =>
      opt.setName('user').setDescription('Minecraft username').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the kick').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const username = interaction.options.getString('user');
    const reason = interaction.options.getString('reason');

    const cmd = reason ? `kick ${username} ${reason}` : `kick ${username}`;
    const result = await rcon.execute(cmd);

    if (!result.success) {
      await interaction.editReply(`\u26A0 Failed to kick **${username}**: ${result.error}`);
      return;
    }

    await interaction.editReply(`\uD83D\uDC5F ${username} Has Been Kicked.`);
  },
};
