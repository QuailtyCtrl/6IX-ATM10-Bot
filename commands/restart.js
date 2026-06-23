// commands/restart.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const rcon = require('../modules/rcon');
const commandLogger = require('../modules/commandLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restarts the server. (Admin only)'),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await commandLogger.logCommand(client, interaction.user.username, 'restart');

    await rcon.execute('say Server is restarting...');
    const result = await rcon.execute('stop');

    if (!result.success) {
      await interaction.editReply(`⚠ Failed to restart: ${result.error}`);
      return;
    }

    await interaction.editReply('⚙️ Server restart sequence initiated.');
  },
};