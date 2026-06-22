// commands/stop.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const rcon = require('../modules/rcon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops the server. (Admin only)'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await interaction.editReply('\uD83D\uDED1 Shutting Down Server\u2026.');
    
    const msgResult = await rcon.execute('say Server is shutting down...');
    const stopResult = await rcon.execute('stop');

    if (!stopResult.success) {
      await interaction.followUp({
        content: `\u26A0 Failed to execute stop: ${stopResult.error}`,
        ephemeral: true,
      });
      return;
    }

    await interaction.followUp({
      content: '✅ Server shutdown sequence initiated.',
      ephemeral: true,
    });
  },
};