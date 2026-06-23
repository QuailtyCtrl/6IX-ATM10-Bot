// commands/stop.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const rcon = require('../modules/rcon');
const commandLogger = require('../modules/commandLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops the server. (Admin only)'),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await commandLogger.logCommand(client, interaction.user.username, 'stop');

    await rcon.execute('say Server is shutting down...');
    const result = await rcon.execute('stop');

    if (!result.success) {
      await interaction.editReply(`⚠ Failed to stop: ${result.error}`);
      return;
    }

    await interaction.editReply('🛑 Server shutdown sequence initiated.');
  },
};