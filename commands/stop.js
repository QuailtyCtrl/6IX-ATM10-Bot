// commands/stop.js
const { SlashCommandBuilder } = require('discord.js');
const rcon = require('../modules/rcon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops the server. (Admin only)'),

  async execute(interaction) {
    await interaction.deferReply();

    await interaction.editReply('\uD83D\uDED1Shutting Down Server\u2026.');
    await rcon.execute('say Server is shutting down...');
    await rcon.execute('stop');
  },
};
