// commands/online.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const serverMonitor = require('../modules/serverMonitor');
const { onlineListEmbed } = require('../modules/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('online')
    .setDescription('Shows the list of currently online players.'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const status = await serverMonitor.getServerStatus();
    const embed = onlineListEmbed(status.players, status.online);

    await interaction.editReply({ embeds: [embed] });
  },
};