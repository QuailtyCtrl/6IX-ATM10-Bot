// modules/permissions.js
// Centralized permission checks for slash commands.

const config = require('./config');

function isAdmin(interaction) {
  if (!config.discord.adminRoleId) return false;
  return interaction.member?.roles?.cache?.has(config.discord.adminRoleId) ?? false;
}

// Wraps a command handler so it auto-replies with an ephemeral denial
// if the user isn't an admin. Returns true if allowed, false if denied
// (and already replied).
async function requireAdmin(interaction) {
  if (isAdmin(interaction)) return true;

  await interaction.reply({
    content: '\u26D4 You do not have permission to use this command.',
    ephemeral: true,
  });
  return false;
}

module.exports = {
  isAdmin,
  requireAdmin,
};
