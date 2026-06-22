// commands/console.js
const { SlashCommandBuilder } = require('discord.js');
const rcon = require('../modules/rcon');
const commandLogger = require('../modules/commandLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('console')
    .setDescription('Executes a raw console command on the server. (Admin only)')
    .addStringOption((opt) =>
      opt.setName('command').setDescription('The command to execute (no leading /)').setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const cmd = interaction.options.getString('command');

    // Log before executing so the record exists even if RCON fails
    await commandLogger.logCommand(client, interaction.user.username, cmd);

    const result = await rcon.execute(cmd);

    if (!result.success) {
      await interaction.editReply(`⚠ Failed to execute command: ${result.error}`);
      return;
    }

    const output = result.response?.trim() || '(no output)';
    await interaction.editReply(`\`\`\`${output.slice(0, 1900)}\`\`\``);
  },
};