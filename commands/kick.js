// commands/kick.js
const { SlashCommandBuilder } = require('discord.js');
const rcon = require('../modules/rcon');
const db = require('../modules/database');
const db = require('../modules/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a player from the server. (Admin only)')
    .addStringOption((opt) =>
      opt
        .setName('user')
        .setDescription('Minecraft username')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the kick').setRequired(false)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const players = await db.getAllPlayers();

    // Filter players by username (case-insensitive)
    const filtered = players
      .filter((p) => p.username.toLowerCase().includes(focusedValue.toLowerCase()))
      .slice(0, 25); // Discord limits to 25 options

    const choices = filtered.map((p) => ({
      name: p.username,
      value: p.username, // Send username to execute handler
    }));

    await interaction.respond(choices);
  },

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const players = await db.getAllPlayers();

    // Filter players by username (case-insensitive)
    const filtered = players
      .filter((p) => p.username.toLowerCase().includes(focusedValue.toLowerCase()))
      .slice(0, 25); // Discord limits to 25 options

    const choices = filtered.map((p) => ({
      name: p.username,
      value: p.username,
    }));

    await interaction.respond(choices);
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

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