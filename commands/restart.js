// commands/restart.js
// NOTE: Vanilla RCON has no native "restart" command -- this assumes your
// host's process manager (e.g. Pterodactyl, a systemd unit, etc.) is
// configured to auto-restart the server process after a clean stop.
// If that's not the case, swap the rcon.execute('stop') call below for
// whatever your panel's restart trigger is.

const { SlashCommandBuilder } = require('discord.js');
const rcon = require('../modules/rcon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restarts the server. (Admin only)'),

  async execute(interaction) {
    await interaction.deferReply();

    await interaction.editReply('\u2699\uFE0F Restarting Server\u2026.');
    await rcon.execute('say Server is restarting...');
    await rcon.execute('stop');
  },
};
